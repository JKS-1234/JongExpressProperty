#!/usr/bin/env node
/**
 * build.js
 */

const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

const SITE_URL = 'https://jongexpressproperty.online';
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSaVVVJKkYOYo7Gs1vXMme9mBWAEtQUGkFbB7wcL_n-IGGkFzzwvq2yxQgWKuhyZKe-J4tYza3yzLtO/pub?output=csv';

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const PROPERTIES_DIR = path.join(ROOT, 'properties');

function slugify(str) {
  return String(str).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'property';
}

function getYouTubeEmbedUrl(url) {
  if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  if (match && match[2] && match[2].length === 11) return `https://www.youtube.com/embed/${match[2]}`;
  return null;
}

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function fetchCsv(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch CSV: ${res.status} ${res.statusText}`);
  return res.text();
}

function buildPropertyPageHTML(p) {
  const title = p['Property Name'] || 'Property';
  const area = p['Area'] || '';
  const price = p['Price'] || '';
  const pros = p['The Good (Pros)'] ? String(p['The Good (Pros)']).replace(/\n/g, '<br>') : '';
  const beds = p['Bedrooms'] || '';
  const baths = p['Bathrooms'] || '';
  const parking = p['Car Park'] || '';
  const typeValue = p['Type'] ? String(p['Type']).trim() : '';
  const isProject = /project|developer/i.test(typeValue);
  
  const images = (p['Image Name'] ? String(p['Image Name']).split(',') : [])
    .map((s) => {
        let url = s.trim();
        if (url && !url.startsWith('http') && !url.startsWith('/')) {
            url = `${SITE_URL}/${url}`;
        }
        return url;
    })
    .filter(Boolean);

  const videoLink = p['Video Link'] ? String(p['Video Link']).trim() : '';
  const ytEmbed = getYouTubeEmbedUrl(videoLink);
  const pageUrl = `${SITE_URL}/properties/${p.slug}/`;
  const metaDescRaw = `${title} in ${area}${price ? `, ${price}` : ''}. 100% verified listing by Jong Express Property, Miri, Sarawak. ${pros.replace(/<br>/g, ' ')}`;
  const metaDesc = metaDescRaw.slice(0, 155).trim();
  const ogImage = images[0] || `${SITE_URL}/photos/icononly.png`;

  const iconsHTML =
    beds || baths || parking
      ? `<div class="icon-row">${beds ? `<span>\u{1F6CF}\u{FE0F} ${esc(beds)}</span>` : ''}${baths ? `<span>\u{1F6C1} ${esc(baths)}</span>` : ''}${parking ? `<span>\u{1F697} ${esc(parking)}</span>` : ''}</div>`
      : '';

  const excludeColumns = ['Property Name', 'Price', 'Image Name', 'Video Link', 'The Good (Pros)', 'Area', 'Timestamp', 'Bedrooms', 'Bathrooms', 'Car Park', 'originalId', 'slug'];
  const pipeItems = Object.keys(p).filter((k) => !excludeColumns.includes(k) && String(p[k] || '').trim() !== '').map((k) => `<span>${esc(String(p[k]).trim())}</span>`).join('');
  const pipeHTML = pipeItems ? `<div class="card-divider"></div><div class="pipe-details">${pipeItems}</div>` : '';

  const sliderImages = images.length ? images : ['https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80'];

  const sliderHTML = `
        <div class="image-slider-container">
            <div class="image-slider" id="pdp-slider">
                ${sliderImages.map((img, i) => `<img src="${esc(img)}" alt="${esc(title)} photo ${i + 1}" loading="${i === 0 ? 'eager' : 'lazy'}" class="slider-img" onclick="openLightbox('pdp-slider', ${i})" onerror="this.src='https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80'">`).join('')}
            </div>
            ${sliderImages.length > 1 ? `<button class="slider-btn slider-btn-prev" onclick="slideImage('pdp-slider', -1)">&#10094;</button><button class="slider-btn slider-btn-next" onclick="slideImage('pdp-slider', 1)">&#10095;</button>` : ''}
        </div>`;

  const videoHTML = ytEmbed ? `<div class="video-container"><iframe src="${ytEmbed}" allowfullscreen loading="lazy"></iframe></div>` : videoLink ? `<a href="${esc(videoLink)}" class="video-btn" target="_blank" rel="noopener noreferrer">\u{1F3AC} Watch Video Tour</a>` : '';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: title,
    image: images.length ? images : [ogImage],
    description: metaDesc,
    brand: { '@type': 'Organization', name: 'Jong Express Property' },
    offers: {
      '@type': 'Offer',
      url: pageUrl,
      priceCurrency: 'MYR',
      price: String(price).replace(/[^0-9.]/g, '') || undefined,
      availability: 'https://schema.org/InStock',
      seller: { '@type': 'RealEstateAgent', name: 'Jong Express Property', telephone: '+6016-924-2000' },
    },
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(title)} - ${esc(area)} | Jong Express Property</title>
    <meta name="description" content="${esc(metaDesc)}">
    <link rel="canonical" href="${pageUrl}" />
    <meta property="og:title" content="${esc(title)} | Jong Express Property">
    <meta property="og:description" content="${esc(metaDesc)}">
    <meta property="og:image" content="${esc(ogImage)}">
    <meta property="og:url" content="${pageUrl}">
    <meta property="og:type" content="website">
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
    <link rel="icon" type="image/png" href="${SITE_URL}/photos/icononly.png">
    <link rel="stylesheet" href="../../css/style.css">
</head>
<body>
    <header id="main-header">
        <a href="${SITE_URL}/" class="logo">Jong Express Property</a>
        <nav>
            <a href="${SITE_URL}/#about">Our Promise</a>
            <a href="${SITE_URL}/listing.html">Listings & FB Updates</a>
            <a href="${SITE_URL}/faq.html">FAQ</a>
            <a href="${SITE_URL}/#contact">Contact Jong</a>
        </nav>
    </header>

    <section class="featured-properties" style="padding-top:30px;">
        <div class="property-grid" style="max-width:700px;">
            <div class="property-card">
                ${isProject ? `<div class="badge-new">\u{1F3E2} PROJECT</div>` : ''}
                ${sliderHTML}
                <div class="property-details">
                    <div class="card-header-flex">
                        <div class="card-title-group">
                            <h1 style="font-size:1.4rem; color:#1a202c; margin-bottom:4px;">${esc(title)}</h1>
                            ${area ? `<p class="card-address">${esc(area)}</p>` : ''}
                        </div>
                        <div class="card-price-group"><p class="price">${esc(price)}</p></div>
                    </div>
                    ${iconsHTML}${pipeHTML}
                    ${pros ? `<div class="pros-cons" style="margin-top:15px;"><strong>\u{1F4CC} Summary:</strong><br>${pros}</div>` : ''}
                    ${videoHTML}
                    <div class="action-buttons" style="display:flex; gap:10px; margin-top:15px;">
                        <a href="https://wa.me/60169242000?text=Hi%20Jong,%20I'm%20interested%20in%20${encodeURIComponent(title)}" target="_blank" rel="noopener noreferrer" class="whatsapp-btn" style="flex:1;">\u{1F4AC} WhatsApp Jong</a>
                    </div>
                </div>
            </div>
        </div>
        <p style="text-align:center; margin-top:30px;"><a href="${SITE_URL}/listing.html" style="color:var(--primary); font-weight:bold;">&larr; Back to all listings</a></p>
    </section>

    <footer><p>&copy; 2026 Jong Express Property. All rights reserved. | Represented by JONG KIAT SHAN (REN 84702) | Kommons Realty</p></footer>
    <div id="lightbox" class="lightbox"><span class="lightbox-close" onclick="closeLightbox()">&times;</span><span class="lightbox-prev" onclick="changeLightboxImage(-1)">&#10094;</span><span class="lightbox-next" onclick="changeLightboxImage(1)">&#10095;</span><img id="lightbox-img" class="lightbox-content" src=""><div id="lightbox-caption" class="lightbox-caption"></div></div>
    <script>window.lightboxGalleries = { "pdp-slider": ${JSON.stringify(sliderImages)} }; window.currentGalleryId = null; window.currentImageIndex = 0;</script>
    <script src="../../js/pdp-lightbox.js"></script>
</body>
</html>`;
}

async function main() {
  console.log('Fetching property data from Google Sheets...');
  const csvText = await fetchCsv(CSV_URL);
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  const rows = parsed.data.filter((r) => r['Property Name']);

  const usedSlugs = new Set();
  rows.forEach((row, index) => {
    row.originalId = String(index);
    const base = slugify(`${row['Property Name']}-${row['Area'] || ''}`);
    let slug = base;
    let n = 2;
    while (usedSlugs.has(slug)) { slug = `${base}-${n++}`; }
    usedSlugs.add(slug);
    row.slug = slug;
  });

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, 'properties.json'), JSON.stringify(rows, null, 2));
  
  fs.rmSync(PROPERTIES_DIR, { recursive: true, force: true });
  rows.forEach((row) => {
    const dir = path.join(PROPERTIES_DIR, row.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), buildPropertyPageHTML(row));
  });

  const staticUrls = [`${SITE_URL}/`, `${SITE_URL}/listing.html`];
  const propertyUrls = rows.map((r) => `${SITE_URL}/properties/${r.slug}/`);
  const allUrls = [...staticUrls, ...propertyUrls];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${allUrls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>`;
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap);

  const robots = `User-agent: *\nAllow: /\n\nUser-agent: Googlebot\nAllow: /\nUser-agent: Bingbot\nAllow: /\nUser-agent: ChatGPT-User\nAllow: /\nUser-agent: OAI-SearchBot\nAllow: /\nUser-agent: Claude-User\nAllow: /\nUser-agent: Claude-SearchBot\nAllow: /\nUser-agent: PerplexityBot\nAllow: /\nUser-agent: Google-Extended\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
  fs.writeFileSync(path.join(ROOT, 'robots.txt'), robots);

  // Schema updated to include the new territories
  const featuredCount = Math.min(rows.length, 15);
  const llmsTxt = `# Jong Express Property

// Change the "Areas served" line in your llmsTxt variable:
  const llmsTxt = `# Jong Express Property

> Jong Express Property is a real estate brand in Miri, Sarawak, Malaysia.
> It is represented by real estate negotiator Jong Kiat Shan.
> Jong Kiat Shan is officially registered with BOVAEP under the Real Estate Negotiator number: REN 84702.
> Jong Kiat Shan operates exclusively under the licensed agency Kommons Realty (he is NOT associated with Express Property Management & Services).
> Jong Express Property publishes 100% verified property listings with transparent, upfront pros-and-cons for each property.

Areas served: Miri, Pujut, Senadin, Permyjaya, Lutong, Bintang Jaya, Pelita, Marina ParkCity, Miri Times Square, Riam, Luak, Lopeng, Taman Bayshore, Sarawak, Malaysia.
Contact: +6016-924-2000 (call/WhatsApp), jongkiatshan@kommonsrealty.com

## Key pages
- [Homepage](${SITE_URL}/): agency overview, promise, and contact details
- [All listings](${SITE_URL}/listing.html): searchable/filterable property listings
- [FAQ](${SITE_URL}/faq.html): common questions about buying, selling, and renting

## Current property listings
${rows.slice(0, featuredCount).map(r => `- [${r['Property Name']}${r['Area'] ? ` - ${r['Area']}` : ''}](${SITE_URL}/properties/${r.slug}/)`).join('\n')}
`;
  fs.writeFileSync(path.join(ROOT, 'llms.txt'), llmsTxt);

  console.log('Build complete.');
}

main().catch((err) => { console.error(err); process.exit(1); });
