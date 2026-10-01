import csv
import json
import os
import subprocess
import sys
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

# Generate static property pages with OG/Twitter metadata
script_path = os.path.join("script", "build.js")
if os.path.exists(script_path):
    print("Generating static property preview pages...")
    subprocess.run([sys.executable, script_path], check=True)
    print("Static property pages generated successfully.")
else:
    print("Warning: script/build.js not found; skipping page generation.")
