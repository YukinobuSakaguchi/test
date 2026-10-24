#!/usr/bin/env python3
"""参考YouTubeチャンネルの公開情報を収集・集計する（動画ファイル本体はダウンロードしない）。

取得するもの
  - チャンネル概要（名前・登録者数・説明文）
  - 動画 / ショート一覧（タイトル・再生数・尺・おおよその投稿日）
  - サンプル動画の詳細（説明文・投稿日・チャプター・タグ・高評価数・コメント数・
    「最も再生された部分」データ）
  - サンプル動画の日本語字幕（手動字幕があれば優先、なければ自動字幕）
  - サムネイル画像、（任意）シークバー用ストーリーボード画像、（任意）上位コメント本文

出力（--out で指定したフォルダ）
  channel.json        チャンネル概要
  listing.json        一覧の生データ
  videos_list.csv     一覧（Excelで開けるよう UTF-8 BOM 付き）
  sample_details.csv  サンプル動画の詳細
  details/<id>.json   サンプル動画ごとの詳細（字幕テキスト・ヒートマップ含む）
  media/<id>/         サムネイル・ストーリーボード画像
  summary.md          集計結果（分析の材料。解釈は channel-analysis-method.md に従って行う）

使い方（JavaScript 実行環境 Deno または Node.js が必要）
  pip install "yt-dlp[default]"
  python collect_channel.py @handle --out ./analysis/handle
  python collect_channel.py @handle --out ./analysis/handle --storyboard-videos 3 --comments 30
  python collect_channel.py --summarize-only --out ./analysis/handle   # 集計だけやり直す
"""

import argparse
import csv
import json
import re
import statistics
import sys
import time
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlparse

TABS = ("videos", "shorts")
JST = timezone(timedelta(hours=9))
CREDIT_KEYWORDS = (
    "VOICEVOX", "COEIROINK", "CoeFont", "ElevenLabs", "A.I.VOICE", "VOICEPEAK", "CeVIO", "ゆっくり",
    "BGM", "効果音", "SE", "素材", "イラスト", "作画", "絵", "声", "CV", "cv", "ナレーション",
    "脚本", "シナリオ", "原作", "漫画", "マンガ", "アニメ", "制作", "編集", "使用", "提供", "協力",
    "Live2D", "AviUtl", "YMM", "Premiere", "After Effects", "CLIP STUDIO", "Procreate", "AI",
)


# ---------------------------------------------------------------- 共通ユーティリティ

def normalize_channel_url(raw):
    """@handle / handle / チャンネルURL（?si= 付きでも可）を https://www.youtube.com/@handle 形式にする。"""
    s = raw.strip()
    if s.startswith("http"):
        p = urlparse(s)
        parts = [x for x in p.path.split("/") if x]
        if parts and parts[-1] in TABS + ("streams", "featured", "playlists", "community"):
            parts = parts[:-1]
        return "https://www.youtube.com/" + "/".join(parts)
    return "https://www.youtube.com/" + (s if s.startswith("@") else "@" + s)


def fmt_sec(sec):
    if sec is None:
        return "-"
    sec = int(round(sec))
    return f"{sec // 60}:{sec % 60:02d}"


def fmt_int(n):
    return "-" if n is None else f"{int(n):,}"


def ts_to_date(ts):
    if ts is None:
        return None
    return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d")


def write_csv(path, rows, fields):
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow(r)


# ---------------------------------------------------------------- 字幕の変換

def json3_to_lines(path):
    """YouTube の json3 字幕を [(開始秒, テキスト)] に変換する。"""
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    lines = []
    for ev in data.get("events", []):
        segs = ev.get("segs")
        if not segs:
            continue
        text = "".join(s.get("utf8", "") for s in segs).replace("\n", " ").strip()
        if text:
            lines.append((ev.get("tStartMs", 0) / 1000.0, text))
    return lines


def vtt_to_lines(path):
    """WebVTT 字幕を [(開始秒, テキスト)] に変換する。自動字幕の重複行（ロールアップ）を除く。"""
    lines, prev = [], None
    blocks = Path(path).read_text(encoding="utf-8").split("\n\n")
    for b in blocks:
        m = re.search(r"(\d+):(\d{2}):(\d{2})[.,](\d{3}) -->", b)
        if not m:
            continue
        start = int(m[1]) * 3600 + int(m[2]) * 60 + int(m[3]) + int(m[4]) / 1000
        body = b[m.end():].split("\n")[1:]
        for raw in body:
            t = re.sub(r"<[^>]+>", "", raw).strip()
            if t and t != prev:
                lines.append((start, t))
                prev = t
    return lines


# ---------------------------------------------------------------- 収集（ネットワークあり）

class MessageLog:
    """yt-dlp の警告・エラーを画面に出さずに記録し、errors.json に残すためのロガー。"""

    def __init__(self):
        self.msgs = []

    def debug(self, msg):
        pass

    def info(self, msg):
        pass

    def warning(self, msg):
        self.msgs.append(msg)

    def error(self, msg):
        self.msgs.append(msg)


def make_ydl(extra=None, player_client=None):
    import yt_dlp  # 収集時だけ必要（--summarize-only では不要）

    # YouTube の解析に JavaScript 実行環境が必要。deno / node / bun のうち、入っているものを使う
    opts = {"quiet": True, "no_warnings": True, "skip_download": True, "ignoreerrors": False,
            "js_runtimes": {"deno": {}, "node": {}, "bun": {}}}
    if player_client:
        opts.setdefault("extractor_args", {})["youtube"] = {"player_client": player_client.split(",")}
    if extra:
        for k, v in extra.items():
            if k == "extractor_args":
                for ie, args in v.items():
                    opts.setdefault("extractor_args", {}).setdefault(ie, {}).update(args)
            else:
                opts[k] = v
    return yt_dlp.YoutubeDL(opts)


def list_channel(base_url, max_items, player_client, errors):
    """動画タブとショートタブの一覧（フラット取得）。"""
    meta, entries = {}, []
    ydl = make_ydl({
        "extract_flat": "in_playlist",
        "playlistend": max_items,
        "extractor_args": {"youtubetab": {"approximate_date": [""]}},
        "logger": MessageLog(),
    }, player_client)
    for tab in TABS:
        try:
            info = ydl.extract_info(f"{base_url}/{tab}", download=False)
        except Exception as e:  # タブが存在しない場合もここに来る
            errors.append(f"一覧取得失敗 [{tab}]: {e}")
            continue
        if not meta:
            meta = {k: info.get(k) for k in (
                "channel", "channel_id", "uploader_id", "channel_url",
                "channel_follower_count", "description", "tags")}
        for e in list(info.get("entries") or []):
            if not e or not e.get("id"):
                continue
            entries.append({
                "tab": tab,
                "id": e["id"],
                "title": e.get("title"),
                "duration": e.get("duration"),
                "view_count": e.get("view_count"),
                "approx_upload_date": ts_to_date(e.get("timestamp")),
                "url": e.get("url") or f"https://www.youtube.com/watch?v={e['id']}",
            })
    # 公式RSS（最新15本の正確な投稿日時）。投稿曜日・時刻の傾向を見るために使う
    if meta.get("channel_id"):
        try:
            with ydl.urlopen(f"https://www.youtube.com/feeds/videos.xml?channel_id={meta['channel_id']}") as r:
                meta["rss_recent"] = parse_rss(r.read())
        except Exception as e:
            errors.append(f"RSS取得失敗: {e}")
    return meta, entries


def parse_rss(xml_bytes):
    import xml.etree.ElementTree as ET

    ns = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015"}
    root = ET.fromstring(xml_bytes)
    return [{"id": en.findtext("yt:videoId", namespaces=ns),
             "title": en.findtext("a:title", namespaces=ns),
             "published": en.findtext("a:published", namespaces=ns)}
            for en in root.findall("a:entry", ns)]


def pick_sample(entries, n_top, n_latest, n_low):
    """タブごとに 再生数上位 / 最新 / 下位（対照用） を選ぶ。一覧はチャンネル側の新しい順で並んでいる前提。"""
    picked = {}
    for tab in TABS:
        rows = [e for e in entries if e["tab"] == tab]
        with_views = [e for e in rows if e.get("view_count") is not None]
        by_views = sorted(with_views, key=lambda e: e["view_count"], reverse=True)
        groups = (("top", by_views[:n_top]), ("latest", rows[:n_latest]),
                  ("low", by_views[::-1][:n_low] if len(by_views) > n_top + n_low else []))
        for reason, group in groups:
            for e in group:
                picked.setdefault(e["id"], {"entry": e, "reasons": []})["reasons"].append(reason)
    return picked


def download_bytes(ydl, url, dest):
    try:
        with ydl.urlopen(url) as r:
            data = r.read()
        Path(dest).write_bytes(data)
        return True
    except Exception:
        return False


def fetch_detail(entry, out, opts, errors):
    """サンプル動画1本の詳細・字幕・サムネイル等を取得し、details/<id>.json を書く。"""
    vid = entry["id"]
    tmp = out / "tmp_subs"
    media = out / "media" / vid
    media.mkdir(parents=True, exist_ok=True)
    log = MessageLog()
    extra = {
        "writesubtitles": True,
        "writeautomaticsub": True,
        "subtitleslangs": ["ja", "ja-orig"],
        "subtitlesformat": "json3/vtt/best",
        "outtmpl": {"default": str(tmp / "%(id)s.%(ext)s")},
        # 字幕などの一部が失敗しても、取れたメタデータは残す
        "ignoreerrors": True,
        "ignore_no_formats_error": True,
        "no_warnings": False,
        "logger": log,
    }
    if opts.comments:
        extra["getcomments"] = True
        extra["extractor_args"] = {"youtube": {
            "max_comments": [str(opts.comments), str(opts.comments), "0", "0"],
            "comment_sort": ["top"]}}
    ydl = make_ydl(extra, opts.player_client)
    url = entry["url"] if entry["url"].startswith("http") else f"https://www.youtube.com/watch?v={vid}"
    try:
        info = ydl.extract_info(url, download=True)  # skip_download により動画本体は保存しない
    except Exception as e:
        log.msgs.append(str(e))
        info = None
    for m in dict.fromkeys(log.msgs):  # 重複を除いて記録
        errors.append(f"[{vid}] {m[:300]}")
    if not info:
        errors.append(f"詳細取得失敗 [{vid}]")
        return None

    # 字幕: 手動字幕(ja) > 自動字幕(ja-orig) > 自動字幕(ja)
    transcript, sub_kind = [], None
    req = info.get("requested_subtitles") or {}
    order = [("ja", "manual" if "ja" in (info.get("subtitles") or {}) else "auto"), ("ja-orig", "auto")]
    for lang, kind in sorted(order, key=lambda x: x[1] != "manual"):
        fp = (req.get(lang) or {}).get("filepath")
        if fp and Path(fp).exists():
            transcript = json3_to_lines(fp) if fp.endswith(".json3") else vtt_to_lines(fp)
            sub_kind = f"{kind}:{lang}"
            break
    if not transcript:
        errors.append(f"字幕なし/取得不可 [{vid}]")

    # サムネイル（大きい順に試す）
    thumb = None
    for name in ("maxresdefault.jpg", "sddefault.jpg", "hqdefault.jpg"):
        if download_bytes(ydl, f"https://i.ytimg.com/vi/{vid}/{name}", media / "thumbnail.jpg"):
            thumb = str((media / "thumbnail.jpg").relative_to(out))
            break

    # ストーリーボード（シークバーのプレビュー画像。指定本数のみ）
    storyboard = []
    if opts._storyboard_left > 0:
        sbs = [f for f in info.get("formats") or [] if str(f.get("format_id", "")).startswith("sb")]
        if sbs:
            sb = max(sbs, key=lambda f: f.get("width") or 0)
            frags = sb.get("fragments", [])
            k = min(len(frags), opts.storyboard_max_fragments)
            # 動画全体を見渡せるよう、上限枚数に収まるよう等間隔で間引く
            idx = sorted({round(i * (len(frags) - 1) / (k - 1)) for i in range(k)}) if k > 1 else list(range(k))
            for j in idx:
                frag = frags[j]
                dest = media / f"storyboard_{j:02d}.jpg"
                if download_bytes(ydl, frag["url"], dest):
                    storyboard.append(str(dest.relative_to(out)))
            storyboard_meta = {k: sb.get(k) for k in ("width", "height", "rows", "columns", "fps")}
        else:
            storyboard_meta = None
        opts._storyboard_left -= 1
    else:
        storyboard_meta = None

    detail = {
        "id": vid,
        "tab": entry["tab"],
        "reasons": entry.get("reasons", []),
        "title": info.get("title"),
        "webpage_url": info.get("webpage_url"),
        "upload_date": info.get("upload_date"),
        "duration": info.get("duration"),
        "view_count": info.get("view_count"),
        "like_count": info.get("like_count"),
        "comment_count": info.get("comment_count"),
        "width": info.get("width"),
        "height": info.get("height"),
        "description": info.get("description"),
        "tags": info.get("tags"),
        "categories": info.get("categories"),
        "chapters": info.get("chapters"),
        "heatmap": info.get("heatmap"),
        "subtitle_kind": sub_kind,
        "transcript": [[round(t, 2), s] for t, s in transcript],
        "thumbnail": thumb,
        "storyboard": storyboard,
        "storyboard_meta": storyboard_meta,
        # コメントは本文と高評価数のみ保存（投稿者名は保存しない）
        "top_comments": [
            {"text": c.get("text"), "like_count": c.get("like_count")}
            for c in (info.get("comments") or []) if c.get("parent") == "root"
        ][: opts.comments or 0],
    }
    (out / "details").mkdir(exist_ok=True)
    (out / "details" / f"{vid}.json").write_text(json.dumps(detail, ensure_ascii=False, indent=1), encoding="utf-8")
    return detail


def collect(opts):
    out = Path(opts.out)
    out.mkdir(parents=True, exist_ok=True)
    base = normalize_channel_url(opts.channel)
    errors = []
    print(f"[1/3] 一覧取得: {base}", file=sys.stderr)
    meta, entries = list_channel(base, opts.max_list, opts.player_client, errors)
    if not entries:
        print("一覧を取得できませんでした:\n  " + "\n  ".join(errors), file=sys.stderr)
        sys.exit(2)
    fetched_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    meta.update({"source_url": base, "fetched_at": fetched_at})
    (out / "channel.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    (out / "listing.json").write_text(json.dumps(entries, ensure_ascii=False, indent=1), encoding="utf-8")

    picked = pick_sample(entries, opts.top, opts.latest, opts.low)
    print(f"[2/3] サンプル詳細取得: {len(picked)} 本", file=sys.stderr)
    opts._storyboard_left = opts.storyboard_videos
    # ストーリーボードは再生数上位から順に割り当てる
    ordered = sorted(picked.values(), key=lambda p: ("top" not in p["reasons"], -(p["entry"].get("view_count") or 0)))
    for i, p in enumerate(ordered, 1):
        e = dict(p["entry"], reasons=p["reasons"])
        print(f"  ({i}/{len(ordered)}) {e['id']} {e.get('title')}", file=sys.stderr)
        fetch_detail(e, out, opts, errors)
        time.sleep(opts.sleep)
    (out / "errors.json").write_text(json.dumps(errors, ensure_ascii=False, indent=1), encoding="utf-8")
    print("[3/3] 集計", file=sys.stderr)
    summarize(out)


# ---------------------------------------------------------------- 集計（ネットワーク不要）

def stats_line(values):
    v = [x for x in values if x is not None]
    if not v:
        return "データなし"
    return (f"n={len(v)} / 中央値 {fmt_int(statistics.median(v))} / 平均 {fmt_int(statistics.mean(v))} / "
            f"最小 {fmt_int(min(v))} / 最大 {fmt_int(max(v))}")


def duration_buckets(durs):
    edges = [(60, "〜1分"), (180, "1〜3分"), (300, "3〜5分"), (480, "5〜8分"), (720, "8〜12分"), (1200, "12〜20分")]
    c = Counter()
    for d in durs:
        label = next((lab for lim, lab in edges if d < lim), "20分以上")
        c[label] += 1
    order = [lab for _, lab in edges] + ["20分以上"]
    return " / ".join(f"{lab}: {c[lab]}" for lab in order if c[lab])


def title_features(titles):
    n = len(titles) or 1
    feats = {
        "【】": sum("【" in t for t in titles),
        "「」『』": sum(bool(re.search("[「『]", t)) for t in titles),
        "！/!": sum(bool(re.search("[！!]", t)) for t in titles),
        "？/?": sum(bool(re.search("[？?]", t)) for t in titles),
        "…/...": sum(("…" in t) or ("..." in t) for t in titles),
        "数字": sum(bool(re.search(r"\d", t)) for t in titles),
        "#ハッシュタグ": sum("#" in t or "＃" in t for t in titles),
        "絵文字": sum(bool(re.search("[\U0001F300-\U0001FAFF☀-➿]", t)) for t in titles),
    }
    rate = " / ".join(f"{k} {v}本({v * 100 // n}%)" for k, v in feats.items())
    brackets = Counter(b for t in titles for b in re.findall(r"【([^】]+)】", t))
    words = Counter(w for t in titles for w in re.findall(r"[゠-ヿー]{2,}|[一-鿿々]{2,}|[A-Za-z0-9]{2,}", t))
    return rate, brackets, words


def cadence(entries, fetched_date):
    dates = sorted({e["approx_upload_date"] for e in entries if e.get("approx_upload_date")})
    if len(dates) < 2:
        return "投稿日データ不足"
    ds = [datetime.strptime(d, "%Y-%m-%d") for d in dates]
    gaps = [(b - a).days for a, b in zip(ds, ds[1:])]
    ref = datetime.strptime(fetched_date, "%Y-%m-%d")
    last30 = sum((ref - d).days <= 30 for d in ds)
    last90 = sum((ref - d).days <= 90 for d in ds)
    months = Counter(d.strftime("%Y-%m") for d in ds)
    month_line = ", ".join(f"{m}: {c}" for m, c in sorted(months.items())[-12:])
    return (f"最古 {dates[0]} / 最新 {dates[-1]} / 投稿間隔の中央値 {statistics.median(gaps)}日 / "
            f"直近30日 {last30}本・90日 {last90}本\n- 月別本数（直近12か月, 概算）: {month_line}")


def monthly_views(entries):
    by_month = {}
    for e in entries:
        if e.get("approx_upload_date") and e.get("view_count") is not None:
            by_month.setdefault(e["approx_upload_date"][:7], []).append(e["view_count"])
    return [(m, len(v), statistics.median(v), max(v)) for m, v in sorted(by_month.items())]


def heatmap_peaks(heatmap, k=3):
    if not heatmap:
        return []
    # 冒頭5%は自然に高くなりやすいので除外して山を探す
    total = heatmap[-1].get("end_time") or 0
    body = [h for h in heatmap if h.get("start_time", 0) >= total * 0.05] or heatmap
    return sorted(body, key=lambda h: h.get("value", 0), reverse=True)[:k]


def line_at(transcript, t):
    cand = [s for st, s in transcript if st <= t + 1.0]
    return cand[-1] if cand else ""


def summarize(out):
    out = Path(out)
    meta = json.loads((out / "channel.json").read_text(encoding="utf-8"))
    entries = json.loads((out / "listing.json").read_text(encoding="utf-8"))
    details = [json.loads(p.read_text(encoding="utf-8")) for p in sorted((out / "details").glob("*.json"))] \
        if (out / "details").exists() else []
    errors = json.loads((out / "errors.json").read_text(encoding="utf-8")) if (out / "errors.json").exists() else []
    fetched_date = meta.get("fetched_at", "")[:10] or datetime.now(timezone.utc).strftime("%Y-%m-%d")

    write_csv(out / "videos_list.csv", entries,
              ["tab", "id", "title", "duration", "view_count", "approx_upload_date", "url"])
    write_csv(out / "sample_details.csv",
              [dict(d, reasons="+".join(d.get("reasons", [])),
                    transcript_chars=sum(len(s) for _, s in d.get("transcript", [])),
                    heatmap_peaks=" ".join(f"{fmt_sec(h['start_time'])}-{fmt_sec(h['end_time'])}"
                                           for h in heatmap_peaks(d.get("heatmap"))))
               for d in details],
              ["tab", "id", "reasons", "title", "upload_date", "duration", "view_count", "like_count",
               "comment_count", "width", "height", "subtitle_kind", "transcript_chars", "heatmap_peaks", "webpage_url"])

    L = []
    L.append(f"# 参考チャンネル収集データ: {meta.get('channel') or meta.get('source_url')}\n")
    L.append("> このファイルは collect_channel.py が自動生成した**観察データ**です。解釈（なぜ伸びているか等）は含みません。")
    L.append(f"> 取得日時: {meta.get('fetched_at')} / 取得元: {meta.get('source_url')}")
    L.append("> 再生数・登録者数は取得時点の値。一覧の投稿日はYouTube表示（「3週間前」等）からの**概算**。字幕は自動字幕の場合、誤認識を含む。\n")

    L.append("## 1. チャンネル概要")
    L.append(f"- チャンネル名: {meta.get('channel')} / ハンドル: {meta.get('uploader_id')} / ID: {meta.get('channel_id')}")
    L.append(f"- 登録者数: {fmt_int(meta.get('channel_follower_count'))}")
    if meta.get("tags"):
        L.append(f"- チャンネルキーワード: {', '.join(meta['tags'][:20])}")
    L.append("- 説明文:\n")
    L.append("```\n" + (meta.get("description") or "（なし）").strip() + "\n```\n")

    L.append("## 2. フォーマット構成")
    for tab in TABS:
        rows = [e for e in entries if e["tab"] == tab]
        durs = [e["duration"] for e in rows if e.get("duration")]
        L.append(f"- {tab}: {len(rows)} 本（取得上限内）" + (f" / 尺分布: {duration_buckets(durs)}" if durs else ""))
        if durs:
            L.append(f"  - 尺（秒）: {stats_line(durs)}")
    L.append("")

    L.append("## 3. 再生数の分布")
    for tab in TABS:
        rows = [e for e in entries if e["tab"] == tab and e.get("view_count") is not None]
        if not rows:
            continue
        views = [e["view_count"] for e in rows]
        med = statistics.median(views)
        L.append(f"### {tab}\n- {stats_line(views)}")
        L.append("\n| 順位 | 再生数 | 中央値比 | 尺 | 投稿日(概算) | タイトル |\n|---|---|---|---|---|---|")
        for i, e in enumerate(sorted(rows, key=lambda e: e["view_count"], reverse=True)[:15], 1):
            ratio = f"{e['view_count'] / med:.1f}x" if med else "-"
            L.append(f"| {i} | {fmt_int(e['view_count'])} | {ratio} | {fmt_sec(e.get('duration'))} | "
                     f"{e.get('approx_upload_date') or '-'} | {e.get('title')} |")
        L.append("")

    L.append("## 4. 投稿ペースと伸びの推移（動画タブ, 概算）")
    L.append("> 一覧の投稿日は「3週間前」「1年前」等の表示から逆算した概算。数か月以上前は月単位でずれる。\n")
    vids = [e for e in entries if e["tab"] == "videos"]
    L.append("- " + cadence(vids, fetched_date))
    rss = meta.get("rss_recent") or []
    if rss:
        L.append("\n最新の投稿（公式RSS・正確な日時, JST）:\n\n| 投稿日時(JST) | 曜日 | タイトル |\n|---|---|---|")
        for r in rss:
            try:
                jst = datetime.fromisoformat(r["published"]).astimezone(JST)
                L.append(f"| {jst:%Y-%m-%d %H:%M} | {'月火水木金土日'[jst.weekday()]} | {r.get('title')} |")
            except (TypeError, ValueError):
                continue
    mv = monthly_views(vids)
    if mv:
        L.append("\n| 投稿月 | 本数 | 再生数中央値 | 最大 |\n|---|---|---|---|")
        for m, n, med, mx in mv[-18:]:
            L.append(f"| {m} | {n} | {fmt_int(med)} | {fmt_int(mx)} |")
    L.append("")

    L.append("## 5. タイトルの傾向")
    for tab in TABS:
        titles = [e["title"] for e in entries if e["tab"] == tab and e.get("title")]
        if not titles:
            continue
        rate, brackets, words = title_features(titles)
        L.append(f"### {tab}（{len(titles)}本）")
        L.append(f"- 平均文字数: {statistics.mean(len(t) for t in titles):.1f} / 記号・要素の使用率: {rate}")
        if brackets:
            L.append("- 【】内の頻出語: " + ", ".join(f"{b}({c})" for b, c in brackets.most_common(15)))
        L.append("- 頻出語（カタカナ・漢字・英数の連続を機械的に抽出。粗い参考値）: "
                 + ", ".join(f"{w}({c})" for w, c in words.most_common(30)))
        L.append("")

    L.append("## 6. サンプル動画の詳細")
    L.append("選定理由: top=再生数上位 / latest=最新 / low=再生数下位（対照用）\n")
    for d in sorted(details, key=lambda d: -(d.get("view_count") or 0)):
        tr = [(t, s) for t, s in d.get("transcript", [])]
        dur = d.get("duration") or 0
        chars = sum(len(re.sub(r"\s", "", s)) for _, s in tr)
        cpm = f"{chars / (dur / 60):.0f}字/分" if tr and dur else "-"
        orient = "縦" if (d.get("height") or 0) > (d.get("width") or 0) else "横"
        L.append(f"### {d.get('title')}")
        L.append(f"- ID: {d['id']} / {d['tab']} / 理由: {'+'.join(d.get('reasons', []))} / 投稿日: {d.get('upload_date')} / "
                 f"尺: {fmt_sec(dur)} / {orient}長")
        L.append(f"- 再生 {fmt_int(d.get('view_count'))} / 高評価 {fmt_int(d.get('like_count'))} / "
                 f"コメント {fmt_int(d.get('comment_count'))} / 字幕: {d.get('subtitle_kind') or 'なし'} / 発話密度: {cpm}")
        if d.get("chapters"):
            L.append("- チャプター: " + " / ".join(f"{fmt_sec(c.get('start_time'))} {c.get('title')}" for c in d["chapters"]))
        peaks = heatmap_peaks(d.get("heatmap"))
        if peaks:
            L.append("- よく再生された箇所（ヒートマップ上位）: " + " / ".join(
                f"{fmt_sec(h['start_time'])}-{fmt_sec(h['end_time'])}「{line_at(tr, h['start_time'])[:30]}」" for h in peaks))
        hook_end = 60 if dur and dur <= 70 else 30
        hook = [f"[{fmt_sec(t)}] {s}" for t, s in tr if t < hook_end]
        if hook:
            L.append(f"- 冒頭{hook_end}秒の字幕:\n\n```\n" + "\n".join(hook[:40]) + "\n```")
        if d.get("thumbnail"):
            L.append(f"- サムネイル: {d['thumbnail']}")
        if d.get("storyboard"):
            L.append(f"- ストーリーボード画像: {len(d['storyboard'])} 枚（{d['storyboard'][0]} ほか）")
        if d.get("top_comments"):
            L.append("- 上位コメント（抜粋）: " + " / ".join(
                (c.get("text") or "").replace("\n", " ")[:60] for c in d["top_comments"][:8]))
        L.append("")

    L.append("## 7. 説明文の共通要素（サンプル動画）")
    descs = [d.get("description") or "" for d in details]
    credit = Counter()
    for desc in descs:
        for line in {ln.strip() for ln in desc.splitlines()}:
            if line and len(line) <= 120 and any(k in line for k in CREDIT_KEYWORDS):
                credit[line] += 1
    domains = Counter(urlparse(u).netloc for desc in descs for u in re.findall(r"https?://[^\s)）]+", desc))
    tags = Counter(t for desc in descs for t in re.findall(r"[#＃][^\s#＃]+", desc))
    L.append(f"- 対象: {len(descs)} 本")
    if credit:
        L.append("- クレジット・制作関連の行（出現本数）:")
        L.extend(f"  - ({c}) {line}" for line, c in credit.most_common(30))
    if domains:
        L.append("- リンク先ドメイン: " + ", ".join(f"{d}({c})" for d, c in domains.most_common(15)))
    if tags:
        L.append("- ハッシュタグ: " + ", ".join(f"{t}({c})" for t, c in tags.most_common(20)))
    L.append("")

    L.append("## 8. 取得できなかった項目")
    if errors:
        L.extend(f"- {e}" for e in errors)
    else:
        L.append("- なし")
    (out / "summary.md").write_text("\n".join(L) + "\n", encoding="utf-8")
    print(f"summary: {out / 'summary.md'}", file=sys.stderr)


# ---------------------------------------------------------------- エントリポイント

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("channel", nargs="?", help="@handle またはチャンネルURL")
    ap.add_argument("--out", required=True, help="出力フォルダ")
    ap.add_argument("--max-list", type=int, default=300, help="タブごとの一覧取得上限（既定300）")
    ap.add_argument("--top", type=int, default=8, help="タブごとの再生数上位サンプル数")
    ap.add_argument("--latest", type=int, default=5, help="タブごとの最新サンプル数")
    ap.add_argument("--low", type=int, default=3, help="タブごとの再生数下位サンプル数（対照用）")
    ap.add_argument("--storyboard-videos", type=int, default=0, help="ストーリーボード画像を取る本数（上位から）")
    ap.add_argument("--storyboard-max-fragments", type=int, default=12, help="1本あたりのストーリーボード画像の上限枚数")
    ap.add_argument("--comments", type=int, default=0, help="1本あたりの上位コメント取得数（0=取らない）")
    ap.add_argument("--sleep", type=float, default=1.5, help="動画ごとの待機秒数")
    ap.add_argument("--player-client", default=None, help="yt-dlp の player_client（取得失敗時の切替用, 例: tv,web_safari）")
    ap.add_argument("--summarize-only", action="store_true", help="収集済みデータから summary.md 等だけを作り直す")
    opts = ap.parse_args()
    if opts.summarize_only:
        summarize(opts.out)
    elif not opts.channel:
        ap.error("channel を指定してください")
    else:
        collect(opts)


if __name__ == "__main__":
    main()
