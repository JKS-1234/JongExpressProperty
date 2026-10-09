"""Build script for jongexpressproperty.online.

Pulls the listing sheet (or reuses js/data.js with --offline) and generates:
  * js/data.js                    data for the JS-rendered homepage
  * property/*.html + index.html  one static, indexable page per listing
  * area/*.html                   Miri neighbourhood landing pages
  * type/*.html                   property-type landing pages
  * sitemap.xml                   every public URL, with stable lastmod values
  * static listing index + footer links injected into index.html
  * redirect stubs for legacy pages (listings/, PageListing/, semi-detached.html)
"""
import csv
import hashlib
import json
import os
import re
import sys
import unicodedata
import urllib.parse
import urllib.request
from datetime import datetime, timezone

os.chdir(os.path.dirname(os.path.abspath(__file__)))

SITE = "https://jongexpressproperty.online"
CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSaVVVJKkYOYo7Gs1vXMme9mBWAEtQUGkFbB7wcL_n-IGGkFzzwvq2yxQgWKuhyZKe-J4tYza3yzLtO/pub?output=csv"
BRAND = "Jong Express Property"
PHONE_INTL = "60169242000"
GA_ID = "G-YNY4XZBS1T"
LOGO = f"{SITE}/photos/icononly.png"
TODAY = datetime.now(timezone.utc).strftime("%Y-%m-%d")
OFFLINE = "--offline" in sys.argv

# ---------------------------------------------------------------- site content

AREAS = [
    {"slug": "pujut", "name": "Pujut", "re": r"pujut",
     "intro": "Pujut is one of Miri's largest and most established residential townships, numbered by phase from Pujut 1 to Pujut 9 and spreading east of the city centre. It offers a wide mix of terrace, semi-detached, bungalow and detached homes, plus shoplots around the Pujut and Boulevard commercial centres, with schools, eateries and Boulevard Shopping Mall close by. Buyers and tenants choose Pujut for space, convenience and value."},
    {"slug": "senadin", "name": "Senadin", "re": r"senadin",
     "intro": "Senadin lies on the northern side of Miri toward Lutong and blends family neighbourhoods such as Riverview, Curtin Water and Paradise Park with light-industrial and warehouse space. Curtin University Malaysia, the Senadin commercial centre and several supermarkets are nearby, which makes it popular with staff, students, small businesses and families looking for good-value terrace and semi-detached houses."},
    {"slug": "permyjaya", "name": "Permyjaya", "re": r"perm\s?y",
     "intro": "Permyjaya is a fast-growing suburb anchored by Permy Mall and KPJ Miri Specialist Hospital, and it includes the Desa Pujut, Desa Bahagia, Desa Murni and Southlake neighbourhoods. Properties here range from single-storey detached houses on generous land to bungalows and inter shoplots with ample parking, all within a short drive of Boulevard and the city."},
    {"slug": "lutong", "name": "Lutong", "re": r"lutong",
     "intro": "Lutong, north of Miri city, has long been home to oil and gas staff working at the nearby Shell and Petronas offices. It is quieter and more spacious than the town centre, with detached and semi-detached houses, inter shoplots near local supermarkets and malls, and neighbourhoods such as Taman Bayshore. Expect roughly 20 minutes to Miri town."},
    {"slug": "riam", "name": "Riam", "re": r"\briam\b",
     "intro": "Riam is a convenient residential belt close to Miri Airport, Emart Riam shopping mall and Miri General Hospital, covering Taman Tunku, Prosperity Garden, Serene Heights and nearby neighbourhoods. Terrace and semi-detached houses, condos and commercial lots here suit families, airline and hospital staff, and investors who want easy access to the town centre."},
    {"slug": "luak", "name": "Luak", "re": r"luak",
     "intro": "Luak sits on Miri's coastal side, close to the airport, and is known for newer developer-launched housing such as tropical-style single and double storey semi-detached homes. It appeals to buyers who want a modern house at an accessible price while staying within easy reach of schools, shopping and entertainment."},
    {"slug": "lopeng", "name": "Lopeng", "re": r"lopeng",
     "intro": "Lopeng is a well-placed residential and commercial pocket a few minutes from Miri General Hospital, Taman Awam and Miri Times Square. Corner and intermediate terrace houses and three-storey shoplots are common here, making it a practical choice for families, clinics, offices and small businesses."},
    {"slug": "piasau", "name": "Piasau", "re": r"piasau",
     "intro": "Piasau is Miri's main industrial hub and also includes residential neighbourhoods such as Taman Piasau Jaya. Warehouses, semi-detached factories and shoplots are available for sale and for rent, alongside detached and semi-detached houses a short drive from Krokop, Lutong and Boulevard."},
    {"slug": "taman-bayshore", "name": "Taman Bayshore", "re": r"bayshore",
     "intro": "Taman Bayshore is a gated and guarded residential enclave on the Lutong side of Miri, a couple of minutes from the Shell and Petronas offices. Spacious semi-detached homes and Bayshore Villa phases make it a favourite with oil and gas professionals and families who value security and large built-up areas."},
    {"slug": "krokop", "name": "Krokop", "re": r"krokop",
     "intro": "Krokop is an established neighbourhood between Pujut and Piasau, known for its local food spots, Pei Min Middle School and quick access to Boulevard Shopping Mall. Double-storey semi-detached houses, including the Jee Foh area, are the typical offering and are popular with families and tenants."},
    {"slug": "marina", "name": "Marina", "re": r"marina",
     "intro": "Marina, including Marina Phase 2 and Marina ParkCity, is Miri's waterfront city-centre district beside Miri Times Square, hotels and offices. Inter and corner shoplots here suit F&B, office and retail use, and the central location makes them easy to let."},
]
AREA_BY_SLUG = {a["slug"]: a for a in AREAS}

KIND_LABEL = {"house": "House", "project": "New development", "shoplot": "Shoplot", "commercial": "Commercial property",
              "warehouse": "Warehouse", "land": "Land", "condo": "Condo"}

TYPES = [
    {"slug": "houses-for-sale-miri", "name": "Houses for Sale", "h1": "Houses for Sale in Miri",
     "title": "Houses for Sale in Miri, Sarawak | Jong Express Property",
     "desc": "Browse houses and new housing projects for sale in Miri, Sarawak: terrace, semi-detached, bungalow and detached homes in Pujut, Senadin, Lutong and more.",
     "intro": "Looking for a house for sale in Miri? Here are the current terrace, semi-detached, bungalow and detached homes we are marketing, from affordable single-storey terraces to large double-storey bungalows and brand-new developer projects. Every listing shows its price, area and honest pros so you can shortlist before you view.",
     "filter": lambda l: l["status"] == "sale" and l["kind"] in ("house", "project")},
    {"slug": "houses-for-rent-miri", "name": "Houses for Rent", "h1": "Houses for Rent in Miri",
     "title": "Houses for Rent in Miri, Sarawak | Jong Express Property",
     "desc": "Rent a house in Miri, Sarawak. Furnished and unfurnished terrace, semi-detached and corner houses near the airport, hospital and town, with monthly rent shown upfront.",
     "intro": "Searching for a house to rent in Miri? These are the homes currently available for tenancy, with the monthly rental shown upfront. We handle viewings, tenancy agreements and tenant screening so landlords and tenants both get a smooth, transparent process.",
     "filter": lambda l: l["status"] == "rent" and l["kind"] == "house"},
    {"slug": "shoplots-miri", "name": "Shoplots", "h1": "Shoplots and Commercial Property in Miri",
     "title": "Shoplots for Sale & Rent in Miri | Jong Express Property",
     "desc": "Shoplots for sale and rent in Miri, Sarawak: inter and corner shoplots in Pujut, Marina, Senadin, Lutong and Riam for F&B, office and retail use.",
     "intro": "From two-storey inter shoplots to three-storey corner units and commercial buildings, these Miri shoplots suit F&B outlets, offices, clinics and retail. Browse units for sale or for rent and check built-up area, parking and surrounding businesses before you enquire.",
     "filter": lambda l: l["kind"] in ("shoplot", "commercial")},
    {"slug": "land-for-sale-miri", "name": "Land", "h1": "Land for Sale in Miri",
     "title": "Land for Sale in Miri, Sarawak | Jong Express Property",
     "desc": "Industrial, agricultural and detached land for sale in Miri, Sarawak, including Senadin, Eastwood and Tukau, with size and price shown upfront.",
     "intro": "Whether you are planning a factory, a farm or a future development, these Miri land listings show land size in points and the asking price upfront. Zoning and land title details can be confirmed with us before you commit.",
     "filter": lambda l: l["kind"] == "land"},
    {"slug": "warehouses-miri", "name": "Warehouses", "h1": "Warehouses and Factories in Miri",
     "title": "Warehouses & Factories for Sale or Rent in Miri | Jong Express Property",
     "desc": "Semi-detached warehouses and factories for sale or rent in Miri, Sarawak, in Piasau Industrial, Senadin and Jalan Merbau.",
     "intro": "Miri's industrial belt around Piasau, Senadin and Jalan Merbau offers semi-detached warehouses, detached warehouses and light-industrial factories. These listings suit logistics, workshop and storage needs, with rental or purchase prices shown for each unit.",
     "filter": lambda l: l["kind"] == "warehouse"},
    {"slug": "condos-miri", "name": "Condos", "h1": "Condos and Apartments in Miri",
     "title": "Condos & Apartments in Miri, Sarawak | Jong Express Property",
     "desc": "Condo and apartment units in Miri, Sarawak, including Brighton Condo and Serene Heights in Riam, for sale or rent.",
     "intro": "Condominium living in Miri is a good fit for singles, couples and small families who want low-maintenance space. See the condo units we are currently marketing in Miri, with floor level, view and price details.",
     "filter": lambda l: l["kind"] == "condo"},
    {"slug": "property-for-rent-miri", "name": "Property for Rent", "h1": "Property for Rent in Miri",
     "title": "Property for Rent in Miri, Sarawak | Houses, Shoplots, Warehouses",
     "desc": "All rental properties in Miri, Sarawak: houses, shoplots and warehouses with monthly rent shown upfront. Viewings arranged by Jong Express Property.",
     "intro": "Every listing below is available for rent in Miri, from family houses and condos to shoplots and industrial warehouses. Monthly rent is shown on each card, and we arrange viewings and tenancy paperwork end to end.",
     "filter": lambda l: l["status"] == "rent"},
]

# ---------------------------------------------------------------- text helpers


def escape_html(value=''):
    return str(value).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;').replace("'", '&#039;')


def slugify(value=''):
    s = unicodedata.normalize('NFKC', str(value)).lower().strip().replace('&', 'and')
    s = re.sub(r'[^a-z0-9]+', '-', s)
    s = re.sub(r'^-+|-+$', '', s)
    return s or 'property'


def clean_text(value=''):
    return re.sub(r'\s+', ' ', str(value)).strip()


def strip_symbols(s):
    return ''.join(c for c in s if unicodedata.category(c) not in ('So', 'Sk', 'Cf', 'Mn') and c != '\u203c')


def fix_text(value=''):
    """Normalise fancy unicode and repair the sheet's 'RM' autocorrect damage (PeRM yjaya -> Permyjaya)."""
    s = unicodedata.normalize('NFKC', str(value)).replace('\u3164', ' ')
    return re.sub(r'(?<=[A-Za-z])RM (?=[a-z])', 'rm', s)


def display_title(raw):
    return clean_text(strip_symbols(fix_text(raw)))


def js_json(obj):
    return json.dumps(obj, ensure_ascii=False, indent=2).replace('</', '<\\/')


def format_description_html(raw=''):
    text = fix_text(raw).replace('\r', '')
    lines = [l.strip() for l in text.split('\n')]
    lines = [l for l in lines if l]
    if len(lines) <= 1:
        lines = [p.strip() for p in re.split(r'\s+[•\-–]\s+|\s*•\s*', text) if p.strip()]
    parts, bullets = [], []

    def flush():
        if bullets:
            parts.append('<ul class="desc-list">' + ''.join(f'<li>{b}</li>' for b in bullets) + '</ul>')
            bullets.clear()

    for line in lines:
        m = re.match(r'^[•\-–*·]\s*(.+)$', line)
        if m:
            bullets.append(escape_html(clean_text(m.group(1))))
        elif len(lines) > 1 and re.match(r'^[^\w\s]', line) and line.rstrip().endswith(':'):
            flush()
            parts.append(f'<h3>{escape_html(clean_text(line))}</h3>')
        elif len(lines) > 1 and not bullets and len(line) > 60:
            parts.append(f'<p>{escape_html(clean_text(line))}</p>')
        else:
            bullets.append(escape_html(clean_text(line)))
    flush()
    return ''.join(parts)


def first_match(pattern, text, group=1):
    m = re.search(pattern, text, re.I)
    return m.group(group).strip() if m else None


def extract_facts(text):
    t = clean_text(strip_symbols(fix_text(text)))
    facts = {}
    beds = first_match(r'(\d+)\s*\+?\s*bed\s?rooms?', t)
    baths = first_match(r'(\d+)\s*bath\s?rooms?', t)
    land = first_match(r'land\s*size\s*(?:from)?\s*:?\s*([\d.,]+)\s*(?:points?|pts)', t)
    built = first_match(r'built[\s-]*up\s*(?:area)?\s*(?:from)?\s*:?\s*([\d.,]+)\s*\+?\s*sq', t)
    if beds:
        facts['Bedrooms'] = beds
    if baths:
        facts['Bathrooms'] = baths
    if land:
        facts['Land size'] = f"{land.rstrip('.,')} points"
    if built:
        facts['Built-up area'] = f"{built.rstrip('.,')} sq ft"
    furn = first_match(r'(fully furnished|partially furnished|partly furnished|unfurnished)', t)
    if furn:
        facts['Furnishing'] = furn.title()
    return facts


def parse_price(raw):
    m = re.search(r'RM\s*([\d,]+(?:\.\d+)?)', str(raw or ''), re.I)
    if not m:
        return None, 'Price on request'
    num = float(m.group(1).replace(',', ''))
    text = f"RM {num:,.0f}" if num == int(num) else f"RM {num:,.2f}"
    return num, text


# ---------------------------------------------------------------- data model


def classify(title, typ):
    t, ty = title.lower(), (typ or '').lower()
    if 'condo' in t or 'apartment' in t:
        return 'condo'
    if 'warehouse' in t or 'factory' in t:
        return 'warehouse'
    if ty == 'land' or re.search(r'\bland\s+at\b', t):
        return 'land'
    if ty == 'project':
        return 'project'
    if 'shoplot' in t or 'commercial building' in t:
        return 'shoplot'
    if 'shop' in ty or 'commercial' in ty:
        return 'commercial'
    return 'house'


def match_areas(title, area_raw):
    for hay in (title, area_raw):
        found = [a["slug"] for a in AREAS if re.search(a["re"], hay, re.I)]
        if found:
            return found
    return []


def resolve_images(raw):
    out = []
    for part in str(raw or '').split(','):
        url = part.strip()
        if not url:
            continue
        name = urllib.parse.unquote(url.rsplit('/', 1)[-1])
        local = next((c for c in (name, name.replace(':', '-')) if os.path.isfile(os.path.join('photos', c))), None)
        if local:
            res = '/photos/' + urllib.parse.quote(local)
        elif url.startswith('http'):
            print(f"  warning: photo not found locally, keeping external URL: {url}")
            res = url
        else:
            continue
        if res not in out:
            out.append(res)
    return out


def build_listings(rows):
    listings, used = [], set()
    for item in rows:
        raw_name = item.get('Property Name') or ''
        if not clean_text(raw_name):
            continue
        slug = slugify(raw_name)
        base, n = slug, 2
        while slug in used:
            slug, n = f"{base}-{n}", n + 1
        used.add(slug)
        title = display_title(raw_name)
        typ = clean_text(item.get('Type') or '')
        status = 'rent' if 'rent' in (item.get('Status') or '').lower() else 'sale'
        kind = classify(title, typ)
        area_raw = clean_text(fix_text(item.get('Area') or ''))
        area_slugs = match_areas(title, area_raw)
        area_label = AREA_BY_SLUG[area_slugs[0]]["name"] if area_slugs else (area_raw.split('/')[0].strip() or 'Miri')
        price_num, price_text = parse_price(item.get('Price'))
        if status == 'rent' and price_num:
            price_text += '/month'
        raw_desc = item.get('The Good (Pros)') or ''
        listings.append({
            "slug": slug, "title": title, "status": status, "kind": kind,
            "area_slugs": area_slugs, "area_label": area_label,
            "price_num": price_num, "price_text": price_text, "raw_desc": raw_desc,
            "facts": extract_facts(raw_desc), "images": resolve_images(item.get('Image Name')),
            "video": clean_text(item.get('Video Link') or ''), "url": f"/property/{slug}",
        })
    return listings


def sale_word(l):
    return 'rent' if l["status"] == 'rent' else 'sale'


def meta_description(l):
    limit = 155
    base = f"{KIND_LABEL[l['kind']]} for {sale_word(l)} in {l['area_label']}, Miri, Sarawak at {l['price_text']}."
    f = l["facts"]
    bits = []
    if 'Bedrooms' in f:
        bits.append(f"{f['Bedrooms']} bedrooms")
    if 'Bathrooms' in f:
        bits.append(f"{f['Bathrooms']} bathrooms")
    if 'Land size' in f:
        bits.append(f"land {f['Land size']}")
    if 'Built-up area' in f:
        bits.append(f"built-up {f['Built-up area']}")
    chosen = []
    for bit in bits:
        if len(f"{base} {', '.join(chosen + [bit])}.") <= limit:
            chosen.append(bit)
    desc = f"{base} {', '.join(chosen)}." if chosen else base
    tail = " WhatsApp us to view."
    if len(desc + tail) <= limit:
        desc += tail
    if len(desc) > limit + 5:
        desc = desc[:limit + 5].rsplit(' ', 1)[0].rstrip(',;:-') + '.'
    return desc


# ---------------------------------------------------------------- html chrome

NAV_LINKS = [("/", "Home"), ("/property/", "All Listings"), ("/type/houses-for-sale-miri", "Houses"),
             ("/type/shoplots-miri", "Shoplots"), ("/type/property-for-rent-miri", "For Rent"), ("/faq", "FAQ")]


def gtag_snippet():
    return f"""<script async src="https://www.googletagmanager.com/gtag/js?id={GA_ID}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){{dataLayer.push(arguments);}}
    gtag('js', new Date());
    gtag('config', '{GA_ID}');
  </script>"""


def site_header():
    links = ''.join(f'<a href="{h}">{escape_html(n)}</a>' for h, n in NAV_LINKS)
    return f'<header><a href="/" class="logo">{BRAND}</a><nav style="display:flex;flex-wrap:wrap;align-items:center">{links}</nav></header>'


def footer_links_html(indexable_areas, indexable_types):
    areas = ''.join(f'<li><a href="/area/{a["slug"]}">Property in {escape_html(a["name"])}</a></li>' for a in indexable_areas)
    types = ''.join(f'<li><a href="/type/{t["slug"]}">{escape_html(t["name"])} in Miri</a></li>' for t in indexable_types)
    return (f'<div class="footer-cols"><div><h4>Miri Areas</h4><ul>{areas}</ul></div>'
            f'<div><h4>Property Types</h4><ul>{types}</ul></div>'
            f'<div><h4>{BRAND}</h4><ul><li><a href="/property/">All Miri listings</a></li><li><a href="/faq">FAQ</a></li>'
            f'<li><a href="https://wa.me/{PHONE_INTL}" rel="noopener">WhatsApp +60 16-924 2000</a></li></ul></div></div>')


def site_footer(ctx):
    return (f'<footer class="site-footer">{ctx["footer_links"]}'
            f'<p>&copy; {BRAND}. Represented by Jong (REN 84702), Kommons Realty, Miri, Sarawak.</p></footer>\n'
            f'  <a class="float-wa" href="https://wa.me/{PHONE_INTL}?text=Hi%20Jong,%20I%20am%20interested%20in%20your%20listings" target="_blank" rel="noopener noreferrer">💬 WhatsApp Us</a>')


def page_shell(ctx, *, title, desc, path, og_image, body, jsonld=(), robots=None):
    url = SITE + path
    ld = ''.join(f'\n  <script type="application/ld+json">\n{js_json(o)}\n  </script>' for o in jsonld)
    robots_tag = f'\n  <meta name="robots" content="{robots}" />' if robots else ''
    return f"""<!DOCTYPE html>
<html lang="en-MY">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{escape_html(title)}</title>
  <meta name="description" content="{escape_html(desc)}" />{robots_tag}
  <link rel="canonical" href="{escape_html(url)}" />
  <link rel="alternate" hreflang="en-MY" href="{escape_html(url)}" />
  <link rel="icon" type="image/png" href="/photos/icononly.png" />
  <meta property="og:title" content="{escape_html(title)}" />
  <meta property="og:description" content="{escape_html(desc)}" />
  <meta property="og:image" content="{escape_html(og_image)}" />
  <meta property="og:url" content="{escape_html(url)}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="{BRAND}" />
  <meta property="og:locale" content="en_MY" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{escape_html(title)}" />
  <meta name="twitter:description" content="{escape_html(desc)}" />
  <meta name="twitter:image" content="{escape_html(og_image)}" />
  <link rel="stylesheet" href="/css/style.css" />
  <link rel="stylesheet" href="/css/seo.css" />
  {gtag_snippet()}{ld}
</head>
<body>
  {site_header()}
{body}
  {site_footer(ctx)}
</body>
</html>
"""


def breadcrumb_html(trail):
    parts = [escape_html(n) if i == len(trail) - 1 else f'<a href="{h}">{escape_html(n)}</a>' for i, (n, h) in enumerate(trail)]
    return '<nav class="breadcrumb" aria-label="Breadcrumb">' + '<span class="sep">›</span>'.join(parts) + '</nav>'


def breadcrumb_ld(trail):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": SITE + h} for i, (n, h) in enumerate(trail)]}


def clean_ld(o):
    if isinstance(o, dict):
        return {k: clean_ld(v) for k, v in o.items() if v is not None}
    if isinstance(o, list):
        return [clean_ld(v) for v in o]
    return o


def abs_url(path):
    return path if path.startswith('http') else SITE + path


def card_html(l):
    img = l["images"][0] if l["images"] else '/photos/icononly.png'
    badge = 'For Rent' if l["status"] == 'rent' else 'For Sale'
    return (f'<article class="card"><a href="{l["url"]}"><img src="{escape_html(img)}" alt="{escape_html(l["title"])} - {badge.lower()} in {escape_html(l["area_label"])}, Miri" loading="lazy" decoding="async" />'
            f'<div class="card-body"><div class="card-price">{escape_html(l["price_text"])}</div>'
            f'<div class="card-title">{escape_html(l["title"])}</div>'
            f'<div class="card-area">{badge} · {escape_html(l["area_label"])}, Miri</div></div></a></article>')


# ---------------------------------------------------------------- page builders


def related_listings(l, listings, limit=6):
    def score(o):
        s = 0
        if set(o["area_slugs"]) & set(l["area_slugs"]):
            s += 4
        if o["kind"] == l["kind"]:
            s += 3
        if o["status"] == l["status"]:
            s += 2
        return -s, o["slug"]
    return sorted([o for o in listings if o["slug"] != l["slug"]], key=score)[:limit]


def build_property_page(ctx, l, listings):
    title = l["title"]
    full_title = f"{title}{'' if 'miri' in title.lower() else ', Miri'} for {sale_word(l).title()} | {BRAND}"
    desc = meta_description(l)
    images = l["images"] or ['/photos/icononly.png']
    badge = 'For Rent' if l["status"] == 'rent' else 'For Sale'
    kind = KIND_LABEL[l["kind"]]
    page_url = f"{SITE}{l['url']}"

    wa_msg = f"Hi Jong, I'm interested in this property:\n\n{title}\n{l['price_text']}\n{l['area_label']}, Miri\n{page_url}\n\nPlease tell me more details!"
    wa_link = f"https://wa.me/{PHONE_INTL}?text={urllib.parse.quote(wa_msg)}"

    gallery = ''.join(
        f'<img src="{escape_html(src)}" alt="{escape_html(title)} - {kind.lower()} for {sale_word(l)} in {escape_html(l["area_label"])}, Miri (photo {i + 1} of {len(images)})" '
        f'loading="{"eager" if i == 0 else "lazy"}" decoding="async" />' for i, src in enumerate(images))

    facts = {"Price": l["price_text"], "Status": badge, "Property type": kind, "Location": f"{l['area_label']}, Miri, Sarawak"}
    facts.update(l["facts"])
    facts_html = ''.join(f'<div><strong>{escape_html(k)}</strong>{escape_html(v)}</div>' for k, v in facts.items())

    f = l["facts"]
    bits = []
    if 'Bedrooms' in f:
        bits.append(f"{f['Bedrooms']} bedrooms")
    if 'Bathrooms' in f:
        bits.append(f"{f['Bathrooms']} bathrooms")
    if 'Land size' in f:
        bits.append(f"a land size of {f['Land size']}")
    if 'Built-up area' in f:
        bits.append(f"a built-up area of {f['Built-up area']}")
    fact_sentence = ''
    if bits:
        fact_sentence = " It offers " + (', '.join(bits[:-1]) + ' and ' if len(bits) > 1 else '') + bits[-1] + '.'
    intro = (f"This {kind.lower()} is available for {sale_word(l)} in {l['area_label']}, Miri, Sarawak, listed at {l['price_text']}."
             f"{fact_sentence} Contact Jong (REN 84702, Kommons Realty) to arrange a viewing.")

    desc_html = '' if clean_text(l["raw_desc"]) in ('', '-') else format_description_html(l["raw_desc"])
    video_html = f'<p><a href="{escape_html(l["video"])}" target="_blank" rel="noopener">▶ Watch the video tour</a></p>' if l["video"] else ''

    trail = [("Home", "/")]
    type_slugs = ctx["type_for_kind"].get((l["kind"], l["status"]), [])
    type_page = next((t for t in ctx["types"] if t["slug"] in type_slugs), None)
    trail.append((type_page["name"] + " in Miri", f"/type/{type_page['slug']}") if type_page else ("All Listings", "/property/"))
    trail.append((title, l["url"]))

    related = related_listings(l, listings)
    related_html = f'<h2>Related listings in Miri</h2><div class="card-grid">{"".join(card_html(r) for r in related)}</div>' if related else ''
    area_links = ''.join(f'<a href="/area/{s}">More property in {escape_html(AREA_BY_SLUG[s]["name"])}</a>' for s in l["area_slugs"] if s in ctx["area_ok"])

    body = f"""  <main class="seo-main">
    {breadcrumb_html(trail)}
    <p><span class="badge{' rent' if l['status'] == 'rent' else ''}">{badge}</span> {escape_html(kind)} · {escape_html(l['area_label'])}, Miri</p>
    <h1>{escape_html(title)}</h1>
    <p class="price-line">{escape_html(l['price_text'])}</p>
    <div class="{'gallery single' if len(images) == 1 else 'gallery'}">{gallery}</div>
    <p>{escape_html(intro)}</p>
    <div class="facts">{facts_html}</div>
    <h2>Property details</h2>
    <div class="description">{desc_html}</div>
    {video_html}
    <div class="cta-row">
      <a class="wa-btn" href="{wa_link}" target="_blank" rel="noopener">💬 Chat on WhatsApp (+60 16-924 2000)</a>
      <a class="back-btn" href="/property/">Browse all Miri listings</a>
    </div>
    <div class="chip-row">{area_links}</div>
    {related_html}
  </main>"""

    offer = None
    if l["price_num"]:
        offer = {"@type": "Offer", "url": page_url, "price": f"{l['price_num']:.2f}", "priceCurrency": "MYR",
                 "availability": "https://schema.org/InStock",
                 "seller": {"@type": "RealEstateAgent", "name": BRAND, "url": SITE + "/", "telephone": "+" + PHONE_INTL}}
        if l["status"] == 'rent':
            offer["priceSpecification"] = {"@type": "UnitPriceSpecification", "price": f"{l['price_num']:.2f}", "priceCurrency": "MYR", "unitCode": "MON", "unitText": "month"}
    address = {"@type": "PostalAddress", "streetAddress": l["area_label"], "addressLocality": "Miri", "addressRegion": "Sarawak", "addressCountry": "MY"}
    img_abs = [abs_url(i) for i in images]
    listing_ld = {"@context": "https://schema.org", "@type": "RealEstateListing", "name": title, "url": page_url,
                  "description": desc, "image": img_abs, "inLanguage": "en-MY",
                  "contentLocation": {"@type": "Place", "name": f"{l['area_label']}, Miri", "address": address},
                  "offers": offer}
    product_ld = {"@context": "https://schema.org", "@type": "Product", "name": title, "description": desc, "image": img_abs,
                  "sku": l["slug"], "category": f"{kind} for {sale_word(l)}", "url": page_url,
                  "brand": {"@type": "Brand", "name": BRAND}, "offers": offer}
    ld = [clean_ld(listing_ld), clean_ld(product_ld), clean_ld(breadcrumb_ld(trail))]
    return page_shell(ctx, title=full_title, desc=desc, path=l["url"], og_image=abs_url(images[0]), body=body, jsonld=ld)


def price_range_sentence(group):
    sales = [l["price_num"] for l in group if l["status"] == 'sale' and l["price_num"]]
    rents = [l["price_num"] for l in group if l["status"] == 'rent' and l["price_num"]]
    bits = []
    if sales:
        lo, hi = min(sales), max(sales)
        bits.append(f"asking prices for sale run from RM {lo:,.0f}" + (f" to RM {hi:,.0f}" if hi != lo else ''))
    if rents:
        lo, hi = min(rents), max(rents)
        bits.append(f"monthly rents run from RM {lo:,.0f}" + (f" to RM {hi:,.0f}" if hi != lo else ''))
    if not bits:
        return ''
    text = ' and '.join(bits)
    return text[0].upper() + text[1:] + '.'


def collection_ld(name, desc, path, group, trail):
    return [clean_ld({"@context": "https://schema.org", "@type": "CollectionPage", "name": name, "description": desc, "url": SITE + path,
                      "inLanguage": "en-MY", "about": {"@type": "Place", "name": "Miri, Sarawak, Malaysia"}}),
            {"@context": "https://schema.org", "@type": "ItemList", "numberOfItems": len(group),
             "itemListElement": [{"@type": "ListItem", "position": i + 1, "url": SITE + l["url"], "name": l["title"]} for i, l in enumerate(group)]},
            breadcrumb_ld(trail)]


def other_links_chips(ctx, exclude_area=None, exclude_type=None):
    a = ''.join(f'<a href="/area/{x["slug"]}">{escape_html(x["name"])}</a>' for x in ctx["areas"] if x["slug"] != exclude_area)
    t = ''.join(f'<a href="/type/{x["slug"]}">{escape_html(x["name"])}</a>' for x in ctx["types"] if x["slug"] != exclude_type)
    return a, t


def build_area_page(ctx, area, group):
    name = area["name"]
    path = f"/area/{area['slug']}"
    title = f"Property for Sale & Rent in {name}, Miri | {BRAND}"
    kinds = {}
    for l in group:
        k = KIND_LABEL[l['kind']].lower()
        kinds[k] = kinds.get(k, 0) + 1
    mix = ', '.join(f"{n} {k}{'s' if n > 1 else ''}" for k, n in sorted(kinds.items(), key=lambda x: -x[1]))
    desc = f"{len(group)} verified properties for sale and rent in {name}, Miri, Sarawak: {mix}. Prices, photos and WhatsApp enquiries."
    if len(desc) > 160:
        desc = f"{len(group)} verified houses, shoplots and more for sale and rent in {name}, Miri, Sarawak. Prices, photos and WhatsApp enquiries."
    trail = [("Home", "/"), ("All Listings", "/property/"), (name, path)]
    if group:
        summary = f"We currently list {len(group)} propert{'y' if len(group) == 1 else 'ies'} in {name} ({mix}). {price_range_sentence(group)}"
    else:
        summary = f"We have no live listings in {name} right now. Message us on WhatsApp and we will notify you when something comes up."
    a_chips, t_chips = other_links_chips(ctx, exclude_area=area["slug"])
    cards = f'<div class="card-grid">{"".join(card_html(l) for l in group)}</div>' if group else ''
    wa = urllib.parse.quote(f"Hi Jong, I am looking for property in {name}, Miri")
    body = f"""  <main class="seo-main">
    {breadcrumb_html(trail)}
    <h1>Property for Sale and Rent in {escape_html(name)}, Miri</h1>
    <h2>About {escape_html(name)}</h2>
    <p>{escape_html(area['intro'])}</p>
    <p>{escape_html(summary)}</p>
    <h2>Current listings in {escape_html(name)}</h2>
    {cards}
    <div class="cta-row"><a class="wa-btn" href="https://wa.me/{PHONE_INTL}?text={wa}" target="_blank" rel="noopener">💬 Ask about {escape_html(name)} on WhatsApp</a></div>
    <h2>Browse other Miri areas</h2>
    <div class="chip-row">{a_chips}</div>
    <h2>Browse by property type</h2>
    <div class="chip-row">{t_chips}</div>
  </main>"""
    og = abs_url(group[0]["images"][0]) if group and group[0]["images"] else LOGO
    return page_shell(ctx, title=title, desc=desc, path=path, og_image=og, body=body,
                      jsonld=collection_ld(title, desc, path, group, trail), robots=None if group else 'noindex, follow')


def build_type_page(ctx, t, group):
    path = f"/type/{t['slug']}"
    trail = [("Home", "/"), (t["name"] + " in Miri", path)]
    if group:
        summary = f"{len(group)} current listing{'s' if len(group) != 1 else ''}. {price_range_sentence(group)}"
    else:
        summary = "No live listings in this category right now. Message us on WhatsApp and we will notify you when something comes up."
    area_counts = {}
    for l in group:
        if l["area_slugs"]:
            area_counts[l["area_slugs"][0]] = area_counts.get(l["area_slugs"][0], 0) + 1
    area_chips = ''.join(f'<a href="/area/{s}">{escape_html(AREA_BY_SLUG[s]["name"])} ({n})</a>'
                         for s, n in sorted(area_counts.items(), key=lambda x: -x[1]) if s in ctx["area_ok"])
    _, t_chips = other_links_chips(ctx, exclude_type=t["slug"])
    cards = f'<div class="card-grid">{"".join(card_html(l) for l in group)}</div>' if group else ''
    where = f'<h2>Where these properties are</h2><div class="chip-row">{area_chips}</div>' if area_chips else ''
    wa = urllib.parse.quote(f"Hi Jong, I am looking for {t['name'].lower()} in Miri")
    body = f"""  <main class="seo-main">
    {breadcrumb_html(trail)}
    <h1>{escape_html(t['h1'])}</h1>
    <p>{escape_html(t['intro'])}</p>
    <p>{escape_html(summary)}</p>
    <h2>{escape_html(t['name'])} available now</h2>
    {cards}
    {where}
    <div class="cta-row"><a class="wa-btn" href="https://wa.me/{PHONE_INTL}?text={wa}" target="_blank" rel="noopener">💬 Enquire on WhatsApp</a></div>
    <h2>Other property types in Miri</h2>
    <div class="chip-row">{t_chips}</div>
  </main>"""
    og = abs_url(group[0]["images"][0]) if group and group[0]["images"] else LOGO
    return page_shell(ctx, title=t["title"], desc=t["desc"], path=path, og_image=og, body=body,
                      jsonld=collection_ld(t["h1"], t["desc"], path, group, trail), robots=None if group else 'noindex, follow')


def build_property_index(ctx, listings):
    path = "/property/"
    title = f"All Miri Properties for Sale & Rent ({len(listings)} Listings) | {BRAND}"
    desc = f"Browse all {len(listings)} verified property listings in Miri, Sarawak: houses, shoplots, warehouses, land and condos for sale and rent in Pujut, Senadin, Lutong, Riam and more."
    trail = [("Home", "/"), ("All Listings", path)]
    order = list(KIND_LABEL)
    sections = []
    for status, heading in (('sale', 'Properties for Sale in Miri'), ('rent', 'Properties for Rent in Miri')):
        grp = sorted([l for l in listings if l["status"] == status], key=lambda l: (order.index(l["kind"]), l["title"]))
        if grp:
            sections.append(f'<h2>{heading} ({len(grp)})</h2><div class="card-grid">{"".join(card_html(l) for l in grp)}</div>')
    a_chips, t_chips = other_links_chips(ctx)
    body = f"""  <main class="seo-main">
    {breadcrumb_html(trail)}
    <h1>Miri Properties for Sale and Rent</h1>
    <p>Every listing below is currently marketed by Jong (REN 84702, Kommons Realty). Browse houses, shoplots, warehouses, land and condos across Miri, or jump to a neighbourhood or property type.</p>
    <h2>Browse by area</h2><div class="chip-row">{a_chips}</div>
    <h2>Browse by type</h2><div class="chip-row">{t_chips}</div>
    {''.join(sections)}
  </main>"""
    return page_shell(ctx, title=title, desc=desc, path=path, og_image=LOGO, body=body, jsonld=collection_ld(title, desc, path, listings, trail))


def static_home_block(ctx, listings):
    a_chips, t_chips = other_links_chips(ctx)
    items = ''.join(
        f'<li><a href="{l["url"]}">{escape_html(l["title"])}</a> — {escape_html(l["price_text"])} ({"for rent" if l["status"] == "rent" else "for sale"}, {escape_html(l["area_label"])})</li>'
        for l in sorted(listings, key=lambda l: l["title"]))
    return f"""<section class="home-static-index" id="miri-property-index">
        <h2>Miri Property for Sale and Rent: Browse by Area and Type</h2>
        <p>Looking for a house for sale in Miri, a house to rent, or a shoplot? Browse our verified listings by property type or neighbourhood, or open any individual listing below.</p>
        <h3>Property types</h3><div class="chip-row">{t_chips}</div>
        <h3>Miri areas</h3><div class="chip-row">{a_chips}</div>
        <h3>All current listings ({len(listings)})</h3>
        <ul class="link-columns">{items}</ul>
    </section>"""


def redirect_stub(target):
    full = SITE + target
    return (f'<!DOCTYPE html>\n<html lang="en-MY"><head><meta charset="UTF-8"><title>Page moved | {BRAND}</title>'
            f'<meta name="robots" content="noindex, follow"><link rel="canonical" href="{full}">'
            f'<meta http-equiv="refresh" content="0; url={target}"></head>'
            f'<body><p>This page has moved to <a href="{target}">{full}</a>.</p></body></html>\n')


# ---------------------------------------------------------------- io helpers


def read_file(path):
    try:
        with open(path, 'r', encoding='utf-8', newline='') as fh:
            return fh.read()
    except FileNotFoundError:
        return None


def write_file(path, content):
    d = os.path.dirname(path)
    if d:
        os.makedirs(d, exist_ok=True)
    if read_file(path) != content:
        with open(path, 'w', encoding='utf-8', newline='') as fh:
            fh.write(content)


def inject(html, name, content):
    pat = re.compile(rf'(<!--{name}-START-->).*?(<!--{name}-END-->)', re.S)
    if not pat.search(html):
        print(f"  warning: marker {name} missing in index.html")
        return html
    return pat.sub(lambda m: m.group(1) + content + m.group(2), html)


def load_rows():
    if OFFLINE:
        print("Offline mode: reading js/data.js")
        s = read_file("js/data.js")
        return json.loads(s.split('=', 1)[1].strip().rstrip(';'))
    print("Downloading latest property data from Google Sheets...")
    response = urllib.request.urlopen(CSV_URL)
    lines = [line.decode("utf-8") for line in response.readlines()]
    rows = list(csv.DictReader(lines))
    os.makedirs("js", exist_ok=True)
    write_file("js/data.js", f"window.PRELOADED_PROPERTY_DATA = {json.dumps(rows)};")
    print(f"Successfully synced {len(rows)} properties to js/data.js!")
    return rows


def previous_lastmods():
    text = read_file("sitemap.xml") or ''
    return {loc: (mod, sha) for loc, mod, sha in
            re.findall(r'<loc>([^<]+)</loc>\s*<lastmod>([^<]+)</lastmod>\s*<!-- sha:([0-9a-f]+) -->', text)}


# ---------------------------------------------------------------- main


def main():
    listings = build_listings(load_rows())
    prev = previous_lastmods()

    area_groups = {a["slug"]: [l for l in listings if a["slug"] in l["area_slugs"]] for a in AREAS}
    type_groups = {t["slug"]: [l for l in listings if t["filter"](l)] for t in TYPES}
    for g in list(area_groups.values()) + list(type_groups.values()):
        g.sort(key=lambda l: (l["status"] != 'sale', l["title"]))
    areas_ok = [a for a in AREAS if area_groups[a["slug"]]]
    types_ok = [t for t in TYPES if type_groups[t["slug"]]]

    type_for_kind = {}
    for l in listings:
        type_for_kind[(l["kind"], l["status"])] = [t["slug"] for t in TYPES if t["slug"] != "property-for-rent-miri" and t["filter"](l)]

    ctx = {"areas": areas_ok, "types": types_ok, "area_ok": {a["slug"] for a in areas_ok},
           "footer_links": footer_links_html(areas_ok, types_ok), "type_for_kind": type_for_kind}

    sitemap = []

    expected = {"index.html"}
    for l in listings:
        content = build_property_page(ctx, l, listings)
        write_file(f"property/{l['slug']}.html", content)
        expected.add(f"{l['slug']}.html")
        sitemap.append((l["url"], content))
    index_content = build_property_index(ctx, listings)
    write_file("property/index.html", index_content)
    for f in os.listdir("property"):
        if f.endswith('.html') and f not in expected:
            os.remove(os.path.join("property", f))
            print(f"  removed stale property/{f}")

    for d, items, groups, builder in (("area", AREAS, area_groups, build_area_page), ("type", TYPES, type_groups, build_type_page)):
        os.makedirs(d, exist_ok=True)
        keep = set()
        for it in items:
            grp = groups[it["slug"]]
            content = builder(ctx, it, grp)
            write_file(f"{d}/{it['slug']}.html", content)
            keep.add(f"{it['slug']}.html")
            if grp:
                sitemap.append((f"/{d}/{it['slug']}", content))
        for f in os.listdir(d):
            if f.endswith('.html') and f not in keep:
                os.remove(os.path.join(d, f))

    home = read_file("index.html")
    home = inject(home, "STATIC-LISTINGS", "\n    " + static_home_block(ctx, listings) + "\n    ")
    home = inject(home, "FOOTER-LINKS", ctx["footer_links"])
    write_file("index.html", home)

    # legacy duplicates: redirect stubs where a replacement exists, otherwise remove
    by_slug = {l["slug"]: l for l in listings}
    if os.path.isdir("listings"):
        for f in os.listdir("listings"):
            if not f.endswith('.html'):
                continue
            p = os.path.join("listings", f)
            slug = slugify(f[:-5])
            if slug in by_slug:
                write_file(p, redirect_stub(by_slug[slug]["url"]))
            else:
                os.remove(p)
    houses_target = "/type/houses-for-sale-miri" if any(t["slug"] == "houses-for-sale-miri" for t in types_ok) else "/property/"
    legacy_pages = {"PageListing/lopeng.html": "/area/lopeng", "PageListing/permy.html": "/area/permyjaya",
                    "PageListing/pujut.html": "/area/pujut", "PageListing/riam.html": "/area/riam",
                    "PageListing/senadin.html": "/area/senadin", "PageListing/semi-detached.html": houses_target,
                    "semi-detached.html": houses_target}
    for p, target in legacy_pages.items():
        if os.path.exists(p):
            write_file(p, redirect_stub(target))

    entries = [("/", home), ("/property/", index_content)] + sitemap
    if os.path.exists("faq.html"):
        entries.append(("/faq", read_file("faq.html")))
    out = []
    for path, content in entries:
        loc = SITE + path
        sha = hashlib.sha1(content.encode('utf-8')).hexdigest()[:10]
        mod = prev[loc][0] if loc in prev and prev[loc][1] == sha else datetime.now(timezone.utc).strftime("%Y-%m-%d")
        out.append(f"  <url>\n    <loc>{loc}</loc>\n    <lastmod>{mod}</lastmod> <!-- sha:{sha} -->\n  </url>")
    write_file("sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "\n".join(out) + "\n</urlset>\n")

    robots = read_file("robots.txt") or "User-agent: *\nAllow: /\n"
    if f"Sitemap: {SITE}/sitemap.xml" not in robots:
        write_file("robots.txt", robots.rstrip('\n') + f"\n\nSitemap: {SITE}/sitemap.xml\n")

    print(f"Generated {len(listings)} property pages, {len(areas_ok)} area pages, {len(types_ok)} type pages; sitemap has {len(out)} URLs.")


if __name__ == "__main__":
    main()
