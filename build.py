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
    
    # Create WhatsApp message with property details
    whatsapp_message = f"Hi Jong, I'm interested in this property:\n\n📍 {title}\n💰 {price}\n📍 {area}\n\nPlease tell me more details!"
    whatsapp_link = f"https://wa.me/60169242000?text={urllib.parse.quote(whatsapp_message)}"

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
  <style>
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    body {{ font-family: Arial, sans-serif; background: #f3f4f6; color: #111827; line-height: 1.6; }}
    main {{ max-width: 980px; margin: 40px auto; background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); }}
    h1 {{ margin: 0 0 10px; font-size: 2rem; color: #111827; }}
    .property-header {{ margin: 0 0 16px; font-size: 1.1rem; color: #475467; }}
    .brand {{ margin: 0 0 12px; color: #2563eb; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; font-size: 12px; }}
    img {{ width: 100%; max-height: 520px; object-fit: cover; border-radius: 8px; display: block; margin: 20px 0; }}
    .description {{ margin: 18px 0; color: #374151; line-height: 1.7; }}
    .button-container {{ margin: 30px 0 0 0; display: flex; flex-direction: column; gap: 12px; }}
    .btn {{ display: inline-block; padding: 14px 24px; border-radius: 8px; font-weight: 700; text-decoration: none; text-align: center; cursor: pointer; border: none; font-size: 1.05rem; transition: background 0.3s; }}
    .whatsapp-btn {{ background: #25D366; color: #fff; }}
    .whatsapp-btn:hover {{ background: #128C7E; }}
    .share-btn {{ background: #3182ce; color: #fff; }}
    .share-btn:hover {{ background: #2b6cb0; }}
    .back-btn {{ background: #0f172a; color: #fff; }}
    .back-btn:hover {{ background: #1a2540; }}
    header {{ background: #1a365d; color: white; padding: 20px; text-align: center; }}
    header a {{ color: #d69e2e; text-decoration: none; font-weight: bold; font-size: 1.5rem; }}
    footer {{ background: #1a365d; color: white; text-align: center; padding: 20px; margin-top: 30px; }}
    .property-details {{ background: #f7fafc; padding: 15px; border-radius: 8px; margin: 15px 0; }}
    @media (max-width: 768px) {{
      main {{ margin: 20px 10px; padding: 15px; }}
      h1 {{ font-size: 1.5rem; }}
      .btn {{ padding: 12px 18px; font-size: 0.95rem; }}
      .button-container {{ flex-direction: column; }}
    }}
  </style>
</head>
<body>
  <header>
    <a href=\"https://jongexpressproperty.online/\">Jong Express Property</a>
  </header>
  
  <main>
    <p class=\"brand\">Jong Express Property</p>
    <h1>{escape_html(title)}</h1>
    <p class=\"property-header\">💰 {escape_html(price)} • 📍 {escape_html(area)}</p>
    
    <img src=\"{escape_html(image)}\" alt=\"{escape_html(title)}\" />
    
    <p class=\"description\">{escape_html(description)}</p>
    
    <div class=\"property-details\">
      <p><strong>Property Name:</strong> {escape_html(title)}</p>
      <p><strong>Price:</strong> {escape_html(price)}</p>
      <p><strong>Location:</strong> {escape_html(area)}</p>
    </div>
    
    <div class=\"button-container\">
      <a href=\"{whatsapp_link}\" target=\"_blank\" class=\"btn whatsapp-btn\">💬 Chat on WhatsApp</a>
      <a href=\"https://jongexpressproperty.online/\" class=\"btn back-btn\">🏠 Back to All Listings</a>
    </div>
  </main>
  
  <footer>
    <p>&copy; 2026 Jong Express Property. All rights reserved. | Represented by Jong Kiat Shan (Kommons Realty)</p>
  </footer>
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
print("Static property previews are ready for social sharing with WhatsApp buttons!")
