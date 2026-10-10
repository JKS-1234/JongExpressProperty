"""Static Simplified Chinese (zh-Hans) generation for jongexpressproperty.online.

Takes the finished English HTML pages and produces /zh/ twins by translating text
nodes, selected attributes (alt/title/placeholder/meta content) and JSON-LD strings.

Translation sources, in priority order:
  1. i18n/zh-overrides.json  hand-written translations (always win)
  2. i18n/zh-cache.json      earlier DeepL output keyed by a hash of the source text
  3. DeepL API               only for text missing from both (needs DEEPL_API_KEY)

Text matched by i18n/glossary.json (place names, brand, phone, REN, 'RM' prices ...)
is sent to DeepL inside <x> tags that DeepL is told to leave alone, and the build
verifies it came back unchanged.

A page whose text cannot be fully translated is never generated; the build keeps any
earlier translated copy and otherwise leaves the page out of /zh/ (and the sitemap).
"""
import hashlib
import html as htmllib
import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser

SITE = "https://jongexpressproperty.online"
SITE_HOST = urllib.parse.urlsplit(SITE).netloc
I18N_DIR = "i18n"
CACHE_FILE = f"{I18N_DIR}/zh-cache.json"
OVERRIDES_FILE = f"{I18N_DIR}/zh-overrides.json"
GLOSSARY_FILE = f"{I18N_DIR}/glossary.json"
USAGE_FILE = f"{I18N_DIR}/usage.json"

EN_LANG, ZH_LANG = "en-MY", "zh-Hans"
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}
TEXT_META_NAMES = {"description", "keywords", "twitter:title", "twitter:description"}
TEXT_META_PROPS = {"og:title", "og:description", "og:image:alt"}
TEXT_ATTRS = {"alt", "title", "placeholder", "aria-label"}
LD_TEXT_KEYS = {"name", "description", "text", "headline", "category", "unitText", "alternateName"}
LD_URL_KEYS = {"url", "item"}

BUILTIN_PATTERNS = [
    r"RM\s?\d[\d,]*(?:\.\d+)?(?:/month|\s?per month)?",
    r"\+?60[\s-]?1\d[\s-]?\d{3,4}[\s-]?\d{4}",
    r"\b01\d[\s-]?\d{3,4}[\s-]?\d{4}\b",
    r"REN\s?\d+",
    r"[\w.+-]+@[\w-]+\.[\w.-]+",
    r"jongexpressproperty\.online(?:/[\w\-./]*[\w/])?",
]


def norm(text):
    return re.sub(r"\s+", " ", text).strip()


def key_of(text):
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:16]


def zh_path(path):
    return "/zh/" if path == "/" else "/zh" + path


def zh_file(path):
    if path == "/":
        return "zh/index.html"
    if path.endswith("/"):
        return f"zh{path}index.html"
    return f"zh{path}.html"


def _read_json(path, default):
    try:
        with open(path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        return data if isinstance(data, type(default)) else default
    except (FileNotFoundError, json.JSONDecodeError) as exc:
        if isinstance(exc, json.JSONDecodeError):
            print(f"  warning: {path} is not valid JSON ({exc}); ignoring it")
        return default


# ---------------------------------------------------------------- protection


class Protector:
    def __init__(self, glossary):
        terms = sorted({t for t in glossary.get("do_not_translate", []) if t}, key=len, reverse=True)
        parts = list(BUILTIN_PATTERNS)
        parts += [rf"(?<![A-Za-z0-9]){re.escape(t)}(?![A-Za-z0-9])" for t in terms]
        parts += list(glossary.get("patterns", []))
        self.rx = re.compile("|".join(f"(?:{p})" for p in parts), re.I)

    def spans(self, text):
        return [m.group(0) for m in self.rx.finditer(text)]

    def needs_translation(self, text):
        return bool(re.search(r"[A-Za-z]", self.rx.sub(" ", text)))

    def to_xml(self, text):
        out, pos = [], 0
        for m in self.rx.finditer(text):
            out.append(_xml(text[pos:m.start()]))
            out.append(f"<x>{_xml(m.group(0))}</x>")
            pos = m.end()
        out.append(_xml(text[pos:]))
        return "".join(out)


def _xml(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


# ---------------------------------------------------------------- DeepL client


class DeepLError(Exception):
    def __init__(self, msg, fatal=False):
        super().__init__(msg)
        self.fatal = fatal


class DeepL:
    def __init__(self):
        self.key = os.environ.get("DEEPL_API_KEY", "").strip()
        plan = os.environ.get("DEEPL_API_PLAN", "").strip().lower()
        if not plan:
            plan = "free" if self.key.endswith(":fx") else "pro"
        default = "https://api-free.deepl.com/v2/translate" if plan == "free" else "https://api.deepl.com/v2/translate"
        self.url = os.environ.get("DEEPL_API_URL", "").strip() or default
        self.target = os.environ.get("DEEPL_TARGET_LANG", "ZH-HANS").strip() or "ZH-HANS"

    @property
    def enabled(self):
        return bool(self.key)

    def translate(self, xml_texts):
        body = json.dumps({"text": xml_texts, "source_lang": "EN", "target_lang": self.target,
                           "tag_handling": "xml", "ignore_tags": ["x"]}).encode("utf-8")
        req = urllib.request.Request(self.url, data=body, method="POST", headers={
            "Authorization": f"DeepL-Auth-Key {self.key}", "Content-Type": "application/json"})
        last = None
        for attempt in range(4):
            try:
                with urllib.request.urlopen(req, timeout=60) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                out = [t["text"] for t in data["translations"]]
                if len(out) != len(xml_texts):
                    raise DeepLError("DeepL returned an unexpected number of translations", fatal=True)
                return out
            except urllib.error.HTTPError as exc:
                if exc.code in (403, 456, 400, 401):
                    raise DeepLError(f"DeepL HTTP {exc.code} (bad key, quota exhausted or bad request)", fatal=True)
                last = f"HTTP {exc.code}"
            except (urllib.error.URLError, TimeoutError, OSError, ValueError, KeyError) as exc:
                last = str(exc)
            time.sleep(2 ** attempt)
        raise DeepLError(f"DeepL request failed: {last}")


# ---------------------------------------------------------------- translator


class Translator:
    def __init__(self):
        self.overrides = {norm(k): v for k, v in _read_json(OVERRIDES_FILE, {}).items()
                          if not k.startswith("_") and isinstance(v, str) and v.strip()}
        self.cache = _read_json(CACHE_FILE, {})
        self.protector = Protector(_read_json(GLOSSARY_FILE, {}))
        self.client = DeepL()
        self.api_calls = 0
        self.used = int(_read_json(USAGE_FILE, {}).get("chars_sent", 0) or 0)
        self.sent_now = 0
        try:
            self.budget = int(os.environ.get("DEEPL_CHAR_BUDGET", "").strip() or 900000)
        except ValueError:
            self.budget = 900000

    def lookup(self, text):
        t = norm(text)
        if t in self.overrides:
            return self.overrides[t]
        entry = self.cache.get(key_of(t))
        return entry["zh"] if entry and entry.get("src") == t else None

    def fill(self, texts):
        """Translate every text not already covered by overrides/cache. Failures are non-fatal."""
        missing = sorted({norm(t) for t in texts if self.protector.needs_translation(t) and self.lookup(t) is None})
        try:
            self._fill(missing)
        finally:
            self.report()

    def report(self):
        left = max(self.budget - self.used, 0)
        msg = (f"  i18n: DeepL characters used in total: {self.used:,} / budget {self.budget:,} "
               f"(remaining {left:,}); sent this build: {self.sent_now:,}")
        print(msg if left > self.budget * 0.1 else "  WARNING" + msg[1:])

    def _save_usage(self):
        os.makedirs(I18N_DIR, exist_ok=True)
        with open(USAGE_FILE, "w", encoding="utf-8", newline="\n") as fh:
            json.dump({"chars_sent": self.used}, fh, indent=1)
            fh.write("\n")

    def _fill(self, missing):
        if not missing:
            return
        if not self.client.enabled:
            print(f"  i18n: DEEPL_API_KEY not set; {len(missing)} text(s) untranslated (pages needing them will be skipped)")
            return
        print(f"  i18n: translating {len(missing)} new text(s) via DeepL ({self.client.url})")
        batch, size = [], 0
        chunks = []
        for t in missing:
            if batch and (len(batch) >= 40 or size + len(t) > 60000):
                chunks.append(batch)
                batch, size = [], 0
            batch.append(t)
            size += len(t)
        if batch:
            chunks.append(batch)
        changed = False
        try:
            for chunk in chunks:
                xml = [self.protector.to_xml(t) for t in chunk]
                room = self.budget - self.used
                fit, total = 0, 0
                for x in xml:
                    if total + len(x) > room:
                        break
                    total += len(x)
                    fit += 1
                truncated = fit < len(chunk)
                if truncated:
                    print(f"  WARNING i18n: character budget {self.budget:,} reached; "
                          f"{len(missing)} text(s) pending are NOT translated and their pages will be skipped")
                    chunk, xml = chunk[:fit], xml[:fit]
                    if not chunk:
                        break
                result = self.client.translate(xml)
                self.api_calls += 1
                self.used += sum(len(x) for x in xml)
                self.sent_now += sum(len(x) for x in xml)
                self._save_usage()
                for src, raw in zip(chunk, result):
                    zh = htmllib.unescape(re.sub(r"</?x>", "", raw)).strip()
                    if not zh or any(s not in zh for s in self.protector.spans(src)):
                        print(f"  warning: DeepL altered protected text, discarding: {src[:60]!r}")
                        continue
                    self.cache[key_of(src)] = {"src": src, "zh": zh}
                    changed = True
                if truncated:
                    break
        except DeepLError as exc:
            print(f"  warning: {exc}; continuing with what is cached")
        finally:
            if changed:
                os.makedirs(I18N_DIR, exist_ok=True)
                with open(CACHE_FILE, "w", encoding="utf-8", newline="\n") as fh:
                    json.dump(dict(sorted(self.cache.items())), fh, ensure_ascii=False, indent=1)
                    fh.write("\n")


# ---------------------------------------------------------------- html rewriting


class Untranslated(Exception):
    pass


def _esc_text(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _esc_attr(s):
    return s.replace("&", "&amp;").replace('"', "&quot;")


def map_link(href, zh_paths):
    """Point an internal link at its /zh/ twin when one exists; make relative URLs root-absolute."""
    if not href or href.startswith(("#", "mailto:", "tel:", "javascript:", "data:")):
        return href
    u = urllib.parse.urlsplit(href)
    absolute = bool(u.scheme or u.netloc)
    if absolute and u.netloc.lower() not in (SITE_HOST, "www." + SITE_HOST):
        return href
    path = u.path or "/"
    if not absolute and not path.startswith("/"):
        path = "/" + path
    if path in zh_paths:
        path = zh_path(path)
    elif not absolute:
        pass
    else:
        return href
    tail = ("?" + u.query if u.query else "") + ("#" + u.fragment if u.fragment else "")
    return (SITE if absolute else "") + path + tail


class Rewriter(HTMLParser):
    def __init__(self, tx, zh_paths, protector):
        super().__init__(convert_charrefs=True)
        self.tx, self.zh_paths, self.protector = tx, zh_paths, protector
        self.out = []
        self.skip = None      # [tag, depth] while inside translate="no"/notranslate
        self.drop = None      # [tag, depth] while dropping the Google Translate widget
        self.script = None    # (tag, open_text, is_ld, buffer) while inside script/style

    def text(self, s):
        if not self.protector.needs_translation(s):
            return s
        return self.tx(norm(s))

    # -- attributes
    def attrs(self, tag, attrs):
        d = dict(attrs)
        new = []
        meta_name = (d.get("name") or "").lower()
        meta_prop = (d.get("property") or "").lower()
        for k, v in attrs:
            kl = k.lower()
            if v is None:
                new.append((k, v))
                continue
            if tag == "html" and kl == "lang":
                v = ZH_LANG
            elif tag == "meta" and kl == "content":
                if meta_name in TEXT_META_NAMES or meta_prop in TEXT_META_PROPS:
                    v = self.text(v)
                elif meta_prop == "og:url":
                    v = map_link(v, self.zh_paths)
                elif meta_prop == "og:locale":
                    v = "zh_CN"
            elif kl in TEXT_ATTRS and self.skip is None:
                v = self.text(v)
            elif kl == "href":
                v = map_link(v, self.zh_paths) if tag in ("a", "link") else (v if urllib.parse.urlsplit(v).scheme or v.startswith(("/", "#", "mailto:", "tel:")) else "/" + v)
            elif kl == "src" and not (urllib.parse.urlsplit(v).scheme or v.startswith(("/", "data:"))):
                v = "/" + v
            new.append((k, v))
        return new

    def emit_start(self, tag, attrs, raw, selfclose):
        if self.drop:
            if tag == self.drop[0] and not selfclose:
                self.drop[1] += 1
            return
        d = dict(attrs)
        classes = (d.get("class") or "").split()
        if d.get("id") == "google_translate_element":
            self.drop = [tag, 1]
            return
        if tag == "script" and "translate.google.com" in (d.get("src") or ""):
            self.drop = [tag, 1]
            return
        if self.skip:
            if tag == self.skip[0] and tag not in VOID:
                self.skip[1] += 1
        elif ("notranslate" in classes or (d.get("translate") or "").lower() == "no") and tag not in VOID and not selfclose:
            self.skip = [tag, 1]
        new = self.attrs(tag, attrs)
        if new == attrs:
            open_text = raw
        else:
            open_text = "<" + tag + "".join(f' {k}' if v is None else f' {k}="{_esc_attr(v)}"' for k, v in new) + (" /" if selfclose else "") + ">"
        if tag in ("script", "style") and not selfclose:
            is_ld = tag == "script" and (d.get("type") or "").lower() == "application/ld+json"
            self.script = (tag, open_text, is_ld, [])
        else:
            self.out.append(open_text)

    def handle_starttag(self, tag, attrs):
        self.emit_start(tag, attrs, self.get_starttag_text(), False)

    def handle_startendtag(self, tag, attrs):
        self.emit_start(tag, attrs, self.get_starttag_text(), True)

    def handle_endtag(self, tag):
        if self.script and tag == self.script[0]:
            stag, open_text, is_ld, buf = self.script
            self.script = None
            content = "".join(buf)
            if "googleTranslateElementInit" in content:
                return
            if is_ld:
                content = self.ld(content)
            self.out.append(f"{open_text}{content}</{tag}>")
            return
        if self.drop:
            if tag == self.drop[0]:
                self.drop[1] -= 1
                if self.drop[1] <= 0:
                    self.drop = None
            return
        if self.skip and tag == self.skip[0]:
            self.skip[1] -= 1
            if self.skip[1] <= 0:
                self.skip = None
        self.out.append(f"</{tag}>")

    def handle_data(self, data):
        if self.script:
            self.script[3].append(data)
        elif self.drop:
            return
        elif self.skip:
            self.out.append(_esc_text(data))
        else:
            m = re.match(r"(\s*)(.*?)(\s*)$", data, re.S)
            self.out.append(m.group(1) + _esc_text(self.text(m.group(2))) + m.group(3))

    def handle_comment(self, data):
        if not self.drop:
            self.out.append(f"<!--{data}-->")

    def handle_decl(self, decl):
        self.out.append(f"<!{decl}>")

    # -- JSON-LD
    def ld(self, content):
        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            return content
        data = self.ld_node(data, None)
        return "\n" + json.dumps(data, ensure_ascii=False, indent=2).replace("</", "<\\/") + "\n  "

    def ld_node(self, node, key):
        if isinstance(node, dict):
            return {k: self.ld_node(v, k) for k, v in node.items()}
        if isinstance(node, list):
            return [self.ld_node(v, key) for v in node]
        if isinstance(node, str):
            if key in LD_TEXT_KEYS:
                return self.text(node)
            if key in LD_URL_KEYS:
                return map_link(node, self.zh_paths)
            if key == "inLanguage" and node == EN_LANG:
                return ZH_LANG
        return node


def segments(html, protector):
    found = []
    r = Rewriter(lambda s: (found.append(s), s)[1], set(), protector)
    r.feed(html)
    r.close()
    return found


def render_zh(html, translator, zh_paths):
    def tx(s):
        t = translator.lookup(s)
        if t is None:
            raise Untranslated(s)
        return t
    r = Rewriter(tx, zh_paths, translator.protector)
    r.feed(html)
    r.close()
    return "".join(r.out)


def build_zh(en_pages, translator):
    """en_pages: {english path: html}. Returns ({english path: zh html}, {paths kept from an earlier build}).

    Pages with untranslated text are skipped; if an earlier translated file exists it is kept.
    """
    needed = {p: segments(h, translator.protector) for p, h in en_pages.items()}
    translator.fill([s for segs in needed.values() for s in segs])
    ok = {p for p, segs in needed.items()
          if all(not translator.protector.needs_translation(s) or translator.lookup(s) is not None for s in segs)}
    stale = {p for p in en_pages if p not in ok and os.path.isfile(zh_file(p))}
    zh_paths = ok | stale
    skipped = [p for p in en_pages if p not in zh_paths]
    if stale:
        print(f"  i18n: kept {len(stale)} earlier zh page(s) that could not be re-translated")
    if skipped:
        print(f"  i18n: skipped {len(skipped)} page(s) with untranslated text (not published under /zh/)")
    return {p: render_zh(en_pages[p], translator, zh_paths) for p in ok}, stale, zh_paths


# ---------------------------------------------------------------- hreflang + switcher


def hreflang_block(path, has_zh):
    en = SITE + path
    lines = [f'<link rel="alternate" hreflang="{EN_LANG}" href="{en}" />']
    if has_zh:
        lines += [f'<link rel="alternate" hreflang="{ZH_LANG}" href="{SITE + zh_path(path)}" />',
                  f'<link rel="alternate" hreflang="x-default" href="{en}" />']
    return "\n  ".join(lines)


def switcher_block(path, lang, has_zh, zh_home=False):
    """EN | 中文 pills. Pages without a translation link to the /zh/ homepage, or hide the switcher if that is absent."""
    if lang == "zh":
        en_href, zh_href = path, zh_path(path)
    elif has_zh:
        en_href, zh_href = path, zh_path(path)
    elif zh_home:
        en_href, zh_href = path, "/zh/"
    else:
        return ""
    en = f'<a href="{en_href}" hreflang="{EN_LANG}" lang="{EN_LANG}">EN</a>'
    zh = f'<a href="{zh_href}" hreflang="{ZH_LANG}" lang="{ZH_LANG}">中文</a>'
    cur = '<span class="lang-current" aria-current="true">{}</span>'
    en, zh = (cur.format("EN"), zh) if lang == "en" else (en, cur.format("中文"))
    return f'<span class="lang-switch" role="group" aria-label="Language / 语言">{en}{zh}</span>'


def _fill(html, name, content):
    pat = re.compile(rf"(<!--{name}-START-->).*?(<!--{name}-END-->)", re.S)
    if not pat.search(html):
        return html
    return pat.sub(lambda m: m.group(1) + content + m.group(2), html)


def apply_alternates(html, path, lang, has_zh, zh_home=False):
    """Fill the HREFLANG / LANG-SWITCH marker blocks of an English or Chinese page."""
    html = _fill(html, "HREFLANG", hreflang_block(path, has_zh))
    return _fill(html, "LANG-SWITCH", switcher_block(path, lang, has_zh, zh_home))
