"""Sanity checks for the generated site. Run from the repo root: python tests/validate_site.py

  * every sitemap URL maps to a generated file (and every zh file is in the sitemap)
  * sitemap xhtml:link alternates point at sitemap URLs and are reciprocal
  * every page's hreflang tags are reciprocal and match canonical/<html lang>
  * every JSON-LD block is valid JSON
  * /zh/ pages never carry the Google Translate widget
"""
import json
import os
import re
import sys
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://jongexpressproperty.online"
errors = []


def err(msg):
    errors.append(msg)


def file_for(url):
    path = urllib.parse.urlsplit(url).path
    if path.endswith("/"):
        return os.path.join(ROOT, path.strip("/"), "index.html")
    return os.path.join(ROOT, path.strip("/") + ".html")


def read(p):
    with open(p, encoding="utf-8") as fh:
        return fh.read()


def is_zh(url):
    return urllib.parse.urlsplit(url).path.startswith("/zh/")


sitemap = read(os.path.join(ROOT, "sitemap.xml"))
locs, sm_alts = [], {}
for b in re.findall(r"<url>(.*?)</url>", sitemap, re.S):
    loc = re.search(r"<loc>([^<]+)</loc>", b).group(1)
    locs.append(loc)
    sm_alts[loc] = {h: u for h, u in re.findall(r'hreflang="([^"]+)" href="([^"]+)"', b)}
if len(set(locs)) != len(locs):
    err("duplicate sitemap URLs")

pages = {}
for loc in locs:
    fp = file_for(loc)
    if os.path.isfile(fp):
        pages[loc] = read(fp)
    else:
        err(f"sitemap URL has no file: {loc} -> {fp}")

for loc, alts in sm_alts.items():
    if not alts:
        continue
    if loc not in alts.values():
        err(f"sitemap entry {loc} missing self alternate")
    for u in alts.values():
        if u not in sm_alts:
            err(f"sitemap alternate not in sitemap: {u} (from {loc})")
        elif sm_alts[u] != alts:
            err(f"sitemap alternates not reciprocal between {loc} and {u}")

page_alts = {}
for loc, html in pages.items():
    canon = re.search(r'<link rel="canonical" href="([^"]+)"', html)
    if not canon or canon.group(1) != loc:
        err(f"canonical mismatch on {loc}: {canon.group(1) if canon else None}")
    lang = re.search(r'<html lang="([^"]+)"', html)
    if is_zh(loc):
        if not lang or lang.group(1) != "zh-Hans":
            err(f"{loc}: <html lang> should be zh-Hans")
        if "google_translate_element" in html or "translate.google.com" in html:
            err(f"{loc}: Google Translate widget present on zh page")
    alts = {h: u for h, u in re.findall(r'<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"', html)}
    page_alts[loc] = alts
    if is_zh(loc) and set(alts) != {"en-MY", "zh-Hans", "x-default"}:
        err(f"{loc}: zh page needs en-MY, zh-Hans, x-default hreflang, has {sorted(alts)}")
    if alts != sm_alts.get(loc, {}) and len(alts) > 1:
        err(f"{loc}: page hreflang differs from sitemap alternates")
    for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>', html, re.S):
        try:
            json.loads(m.group(1))
        except json.JSONDecodeError as exc:
            err(f"{loc}: invalid JSON-LD ({exc})")

for loc, alts in page_alts.items():
    if len(alts) < 2:
        continue
    if loc not in alts.values():
        err(f"{loc}: hreflang set lacks self reference")
    for lang, u in alts.items():
        if u not in page_alts:
            err(f"{loc}: hreflang {lang} target not a sitemap page: {u}")
        elif page_alts[u] != alts:
            err(f"{loc}: hreflang not reciprocal with {u}")
    if alts.get("x-default") != alts.get("en-MY"):
        err(f"{loc}: x-default should equal en-MY")
    if "lang-switch" not in pages[loc]:
        err(f"{loc}: has a twin but no language switcher")

for r, _d, names in os.walk(os.path.join(ROOT, "zh")):
    for n in names:
        if n.endswith(".html"):
            rel = os.path.relpath(os.path.join(r, n), ROOT).replace("\\", "/")
            url = SITE + "/" + rel[:-5]
            url = url[:-len("index")] if url.endswith("/index") else url
            if url not in pages:
                err(f"zh file not in sitemap: {rel}")

print(f"checked {len(pages)} sitemap pages ({sum(1 for l in pages if is_zh(l))} zh)")
if errors:
    print(f"{len(errors)} problem(s):")
    for e in errors[:50]:
        print("  -", e)
    sys.exit(1)
print("OK")
