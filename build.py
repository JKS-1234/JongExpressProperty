import csv
import json
import os
import re
import urllib.request

# Your live Google Sheet CSV Link
csv_url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSaVVVJKkYOYo7Gs1vXMme9mBWAEtQUGkFbB7wcL_n-IGGkFzzwvq2yxQgWKuhyZKe-J4tYza3yzLtO/pub?output=csv"

print("Downloading latest property data from Google Sheets...")
response = urllib.request.urlopen(csv_url)
lines = [line.decode("utf-8") for line in response.readlines()]
reader = csv.DictReader(lines)
data = list(reader)

# Ensure the 'js' folder exists
os.makedirs("js", exist_ok=True)

# Save the data as a permanent, instant-loading Javascript variable
js_content = f"window.PRELOADED_PROPERTY_DATA = {json.dumps(data)};"

with open("js/data.js", "w", encoding="utf-8") as f:
    f.write(js_content)

print(f"Successfully synced {len(data)} properties to js/data.js!")

# --- Generate static property pages with OG/Twitter metadata ---
def escape_html(value=''):
    return str(value).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;').replace("'", '&#039;')


def slugify(value=''):
    s = str(value).lower().strip().replace('&', 'and')
    s = re.sub(r'[^a-z0-9]+', '-', s)
    s = re.sub(r'^-+|-+$', '', s)
    return s or 'property'


def clean_text(value=''):
    return re.sub(r'\s+', ' ', str(value)).strip()


def get_image_url(item):
    raw = item.get('Image Name', '') or ''
    if not raw:
        return 'https://jongexpressproperty.online/photos/icononly.png'
    first = raw.split(',')[0].strip()
    return first if first else 'https://jongexpressproperty.online/photos/icononly.png'


def build_property_html(item, index):
    title = clean_text(item.get('Property Name') or f'Property {index + 1}')
    price = clean_text(item.get('Price') or 'Price on request')
    area = clean_text(item.get('Area') or 'Miri, Sarawak')
    description = clean_text(item.get('The Good (Pros)') or f'{area}. {price}. Verified property listing in Miri.')[:160]
    image = get_image_url(item)
    page_url = f"https://jongexpressproperty.online/property/{slugify(title)}.html"

    return f"""<!DOCTYPE html>
<html lang=\"en\">
<head>
  <meta charset=\"UTF-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
  <title>{escape_html(title)} | Jong Express Property</title>
  <meta name=\"description\" content=\"{escape_html(description)}\" />
  <meta property=\"og:title\" content=\"{escape_html(title)} | Jong Express Property\" />
  <meta property=\"og:description\" content=\"{escape_html(description)}\" />
  <meta property=\"og:image\" content=\"{escape_html(image)}\" />
  <meta property=\"og:image:alt\" content=\"{escape_html(title)}\" />
  <meta property=\"og:url\" content=\"{escape_html(page_url)}\" />
  <meta property=\"og:type\" content=\"website\" />
  <meta property=\"og:site_name\" content=\"Jong Express Property\" />
  <meta name=\"twitter:card\" content=\"summary_large_image\" />
  <meta name=\"twitter:title\" content=\"{escape_html(title)} | Jong Express Property\" />
  <meta name=\"twitter:description\" content=\"{escape_html(description)}\" />
  <meta name=\"twitter:image\" content=\"{escape_html(image)}\" />
  <link rel=\"canonical\" href=\"{escape_html(page_url)}\" />
</head>
<body style=\"font-family:Arial,sans-serif; margin:0; background:#f3f4f6; color:#111827;\">
  <main style=\"max-width:980px; margin:40px auto; background:#fff; border-radius:12px; padding:24px; box-shadow:0 10px 25px rgba(0,0,0,0.08);\">
    <p style=\"margin:0 0 12px; color:#2563eb; font-weight:700; letter-spacing:0.04em; text-transform:uppercase; font-size:12px;\">Jong Express Property</p>
    <h1 style=\"margin:0 0 10px; font-size:2rem;\">{escape_html(title)}</h1>
    <p style=\"margin:0 0 16px; font-size:1.1rem; color:#475467;\">{escape_html(price)} • {escape_html(area)}</p>
    <img src=\"{escape_html(image)}\" alt=\"{escape_html(title)}\" style=\"width:100%; max-height:520px; object-fit:cover; border-radius:12px; display:block;\" />
    <p style=\"margin-top:18px; color:#374151; line-height:1.7;\">{escape_html(description)}</p>
    <p style=\"margin-top:18px;\">
      <a href=\"https://jongexpressproperty.online/\" style=\"display:inline-block; background:#0f172a; color:#fff; text-decoration:none; padding:12px 18px; border-radius:8px; font-weight:700;\">Back to property listings</a>
    </p>
  </main>
</body>
</html>"""


property_dir = "property"
os.makedirs(property_dir, exist_ok=True)

for index, item in enumerate(data):
    if not item.get('Property Name'):
        continue
    title = clean_text(item.get('Property Name') or f'Property {index + 1}')
    slug = slugify(title)
    with open(os.path.join(property_dir, f"{slug}.html"), "w", encoding="utf-8") as f:
        f.write(build_property_html(item, index))

property_list = []
for index, item in enumerate(data):
    if not item.get('Property Name'):
        continue
    title = clean_text(item.get('Property Name') or f'Property {index + 1}')
    slug = slugify(title)
    price = clean_text(item.get('Price') or '')
    area = clean_text(item.get('Area') or '')
    area_str = f" • {escape_html(area)}" if area else ''
    property_list.append(f'  <li><a href="./{slug}.html">{escape_html(title)}</a> — {escape_html(price)}{area_str}</li>')

index_html = f"""<!DOCTYPE html>
<html lang=\"en\">
<head>
  <meta charset=\"UTF-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
  <title>Property Listings | Jong Express Property</title>
  <meta name=\"description\" content=\"Verified property listings in Miri, Sarawak.\" />
  <meta property=\"og:title\" content=\"Property Listings | Jong Express Property\" />
  <meta property=\"og:description\" content=\"Verified property listings in Miri, Sarawak.\" />
  <meta property=\"og:image\" content=\"https://jongexpressproperty.online/photos/icononly.png\" />
  <meta property=\"og:type\" content=\"website\" />
</head>
<body style=\"font-family:Arial,sans-serif; margin:24px; line-height:1.6;\">
  <h1>Property Listings</h1>
  <ul>
{''.join(property_list)}
  </ul>
</body>
</html>"""

with open(os.path.join(property_dir, "index.html"), "w", encoding="utf-8") as f:
    f.write(index_html)

print(f"Generated {len(data)} property pages in {property_dir}/")
print("Static property previews are ready for social sharing.")
