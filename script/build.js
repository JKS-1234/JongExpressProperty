const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const dataPath = path.join(repoRoot, 'js', 'data.js');
const outputDir = path.join(repoRoot, 'property');

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'property';
}

function cleanText(value = '') {
  return String(value)
    .replace(/\s+/g, ' ')
    .trim();
}

function getImageUrl(item) {
  const raw = item['Image Name'] || item['image'] || '';
  if (!raw) return 'https://jongexpressproperty.online/photos/icononly.png';
  const first = raw.split(',')[0].trim();
  if (!first) return 'https://jongexpressproperty.online/photos/icononly.png';
  return first;
}

function buildPropertyHtml(item, index) {
  const title = cleanText(item['Property Name'] || `Property ${index + 1}`);
  const price = cleanText(item['Price'] || 'Price on request');
  const area = cleanText(item['Area'] || 'Miri, Sarawak');
  const description = cleanText(item['The Good (Pros)'] || `${area}. ${price}. Verified property listing in Miri.`).slice(0, 160);
  const image = getImageUrl(item);
  const url = `https://jongexpressproperty.online/property/${slugify(title)}.html`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} | Jong Express Property</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:title" content="${escapeHtml(title)} | Jong Express Property" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:image:alt" content="${escapeHtml(title)}" />
  <meta property="og:url" content="${escapeHtml(url)}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Jong Express Property" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)} | Jong Express Property" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />
  <link rel="canonical" href="${escapeHtml(url)}" />
</head>
<body style="font-family:Arial,sans-serif; margin:0; background:#f3f4f6; color:#111827;">
  <main style="max-width:980px; margin:40px auto; background:#fff; border-radius:12px; padding:24px; box-shadow:0 10px 25px rgba(0,0,0,0.08);">
    <p style="margin:0 0 12px; color:#2563eb; font-weight:700; letter-spacing:0.04em; text-transform:uppercase; font-size:12px;">Jong Express Property</p>
    <h1 style="margin:0 0 10px; font-size:2rem;">${escapeHtml(title)}</h1>
    <p style="margin:0 0 16px; font-size:1.1rem; color:#475467;">${escapeHtml(price)} • ${escapeHtml(area)}</p>
    <img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" style="width:100%; max-height:520px; object-fit:cover; border-radius:12px; display:block;" />
    <p style="margin-top:18px; color:#374151; line-height:1.7;">${escapeHtml(description)}</p>
    <p style="margin-top:18px;">
      <a href="https://jongexpressproperty.online/" style="display:inline-block; background:#0f172a; color:#fff; text-decoration:none; padding:12px 18px; border-radius:8px; font-weight:700;">Back to property listings</a>
    </p>
  </main>
</body>
</html>`;
}

const dataFile = fs.readFileSync(dataPath, 'utf8');
const match = dataFile.match(/window\.PRELOADED_PROPERTY_DATA\s*=\s*(\[[\s\S]*?\]);?\s*$/);
if (!match) {
  throw new Error('Could not find PRELOADED_PROPERTY_DATA in js/data.js');
}

const properties = JSON.parse(match[1]);

fs.mkdirSync(outputDir, { recursive: true });

properties.forEach((item, index) => {
  const title = cleanText(item['Property Name'] || `Property ${index + 1}`);
  const slug = slugify(title);
  const filePath = path.join(outputDir, `${slug}.html`);
  fs.writeFileSync(filePath, buildPropertyHtml(item, index), 'utf8');
});

const indexPath = path.join(outputDir, 'index.html');
const propertyList = properties
  .map((item, index) => {
    const title = cleanText(item['Property Name'] || `Property ${index + 1}`);
    const slug = slugify(title);
    const url = `./${slug}.html`;
    const price = cleanText(item['Price'] || '');
    const area = cleanText(item['Area'] || '');
    return `  <li><a href="${url}">${escapeHtml(title)}</a> — ${escapeHtml(price)}${area ? ` • ${escapeHtml(area)}` : ''}</li>`;
  })
  .join('\n');

fs.writeFileSync(indexPath, `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Property Listings | Jong Express Property</title>
  <meta name="description" content="Verified property listings in Miri, Sarawak." />
  <meta property="og:title" content="Property Listings | Jong Express Property" />
  <meta property="og:description" content="Verified property listings in Miri, Sarawak." />
  <meta property="og:image" content="https://jongexpressproperty.online/photos/icononly.png" />
  <meta property="og:type" content="website" />
</head>
<body style="font-family:Arial,sans-serif; margin:24px; line-height:1.6;">
  <h1>Property Listings</h1>
  <ul>
${propertyList}
  </ul>
</body>
</html>`, 'utf8');

console.log(`Generated ${properties.length} property pages in ${outputDir}`);
