const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSaVVVJKkYOYo7Gs1vXMme9mBWAEtQUGkFbB7wcL_n-IGGkFzzwvq2yxQgWKuhyZKe-J4tYza3yzLtO/pub?output=csv";
        
let currentLimit = 6;
let currentMarket = 'all';

// Lightbox Data
let lightboxGalleries = {};
let currentGalleryId = null;
let currentImageIndex = 0;

function getYouTubeEmbedUrl(url) {
    if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) return null;
    let regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    let match = url.match(regExp);
    if (match && match[2].length === 11) return `https://www.youtube.com/embed/${match[2]}`;
    return null;
}

function setMarket(marketType, btnElement) {
    currentMarket = marketType;
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => tab.classList.remove('active'));
    btnElement.classList.add('active');
    resetAndFilter();
}

Papa.parse(csvUrl, {
    download: true,
    header: true,
    complete: function(results) {
        allProperties = results.data.filter(row => row['Property Name']);

        const uniqueAreas = new Set();
        const uniqueTypes = new Set();

        allProperties.forEach(row => {
            let rawType = row['Type'] ? String(row['Type']).trim() : '';
            let rawArea = row['Area'] ? String(row['Area']).trim() : '';
            if (rawType) uniqueTypes.add(rawType);
            if (rawArea) uniqueAreas.add(rawArea);
        });

        const typeFilter = document.getElementById('typeFilter');
        if (typeFilter) {
            typeFilter.innerHTML = '<option value="all">All Types</option>';
            Array.from(uniqueTypes).sort().forEach(typeName => {
                typeFilter.innerHTML += `<option value="${typeName.toLowerCase()}">${typeName}</option>`;
            });
        }

        const areaFilter = document.getElementById('areaFilter');
        if (areaFilter) {
            areaFilter.innerHTML = '<option value="all">All Areas</option>';
            Array.from(uniqueAreas).sort().forEach(areaName => {
                areaFilter.innerHTML += `<option value="${areaName.toLowerCase()}">${areaName}</option>`;
            });
        }

        filterProperties();
    }
});

function filterProperties() {
    const statusVal = document.getElementById('statusFilter') ? document.getElementById('statusFilter').value : 'all';
    const typeVal = document.getElementById('typeFilter') ? document.getElementById('typeFilter').value : 'all';
    const areaVal = document.getElementById('areaFilter') ? document.getElementById('areaFilter').value : 'all';
    const searchVal = document.getElementById('searchBar') ? document.getElementById('searchBar').value.toLowerCase().trim() : '';
    
    let filteredData = allProperties.filter(row => {
        let status = row['Status'] ? String(row['Status']).toLowerCase().trim() : 'sale';
        let typeValue = row['Type'] ? String(row['Type']).trim().toLowerCase() : '';
        let areaValue = row['Area'] ? String(row['Area']).trim().toLowerCase() : '';
        let isProject = (typeValue.includes('project') || typeValue.includes('developer'));
        
        const matchStatus = (statusVal === 'all' || status === statusVal);
        const matchType = (typeVal === 'all' || typeValue === typeVal);
        const matchArea = (areaVal === 'all' || areaValue === areaVal);
        const matchMarket = (currentMarket === 'all') || (currentMarket === 'project' && isProject) || (currentMarket === 'subsale' && !isProject);
        const rowText = Object.values(row).join(' ').toLowerCase();
        const matchSearch = (searchVal === '' || rowText.includes(searchVal));
        
        return matchStatus && matchType && matchArea && matchSearch && matchMarket;
    });

    const grid = document.querySelector('.property-grid');
    if (!grid) return;
    
    let allCardsHTML = '';
    lightboxGalleries = {};

    if (filteredData.length === 0) {
        allCardsHTML = '<div class="no-results-msg" style="grid-column: 1/-1; text-align: center; padding: 40px 0;">No properties found matching your criteria.</div>';
    } else {
        const propertiesToShow = filteredData.slice(0, currentLimit);
        
        propertiesToShow.forEach((row, index) => {
            let title = row['Property Name'] || '';
            let rawDesc = row['The Good (Pros)'] ? String(row['The Good (Pros)']) : '';
            let status = row['Status'] ? row['Status'].toLowerCase().trim() : 'sale';
            let address = row['Area'] ? `${row['Area'].trim()}, Sarawak` : 'Miri, Sarawak';
            
            let isProject = (String(row['Type']).toLowerCase().includes('project'));
            let badgeHTML = isProject ? `<div class="badge-new">🏢 PROJECT</div>` : '';

            // SMART PRICE LOGIC
            let priceStr = row['Price'] ? String(row['Price']).trim() : '';
            let formattedPrice = 'Price on Request';
            if (priceStr) {
                if (priceStr.toLowerCase().includes('rent') || priceStr.toLowerCase().includes('sale')) {
                    formattedPrice = priceStr;
                } else {
                    formattedPrice = status === 'rent' ? `Rent ${priceStr}` : `Sale ${priceStr}`;
                }
            }

            // AUTO-CAPTURE LOGIC (Built-up & Furnishing)
            let builtUpMatch = rawDesc.match(/([\d,\.]+)\s*sq\.?\s*ft\.?/i);
            let builtUp = builtUpMatch ? `Built-up: ${builtUpMatch[1]} sq. ft.` : '';
            let furnishingMatch = rawDesc.match(/(fully furnished|partially furnished|partly furnished|unfurnished)/i);
            let furnishing = furnishingMatch ? furnishingMatch[1].replace(/(^\w|\s\w)/g, m => m.toUpperCase()) : '';
            let detailsRow = [builtUp, furnishing].filter(Boolean).join(' | ');

            // LIGHTBOX IMAGE SETUP
            let rawImages = row['Image Name'] ? String(row['Image Name']).trim() : '';
            let imagesArr = rawImages.split(',').map(url => url.trim()).filter(url => url !== '');
            let uniqueSliderId = `slider-${index}`;
            lightboxGalleries[uniqueSliderId] = imagesArr;
            let firstImage = imagesArr.length > 0 ? imagesArr[0] : 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80';

            // ICONS LOGIC
            let beds = row['Bedrooms'] ? String(row['Bedrooms']).trim() : '';
            let baths = row['Bathrooms'] ? String(row['Bathrooms']).trim() : '';
            let parking = row['Car Park'] ? String(row['Car Park']).trim() : '';
            let iconsHTML = '';
            if (beds || baths || parking) {
                iconsHTML = `<div class="icon-row" style="display: flex; gap: 15px; color: #718096; font-size: 0.95rem; margin-top: 15px;">`;
                if (beds) iconsHTML += `<span style="display:flex; align-items:center; gap:5px;">🛏️ ${beds}</span>`;
                if (baths) iconsHTML += `<span style="display:flex; align-items:center; gap:5px;">🛁 ${baths}</span>`;
                if (parking) iconsHTML += `<span style="display:flex; align-items:center; gap:5px;">🚗 ${parking}</span>`;
                iconsHTML += `</div>`;
            }

            // CARD HTML (Matched to your Screenshot)
            let cardHTML = `
            <div class="property-card" style="display:flex; flex-direction:column; height:100%; border: 1px solid #e2e8f0; border-radius: 4px; box-shadow: none; background: #fff;">
                ${badgeHTML}
                <div style="position:relative; cursor:pointer;" onclick="openLightbox('${uniqueSliderId}', 0)" title="Click to view full photos">
                    <img src="${firstImage}" alt="${title}" style="height: 220px; width: 100%; object-fit: cover; border-bottom: 1px solid #e2e8f0; border-radius: 4px 4px 0 0;">
                    <div style="position:absolute; bottom:10px; right:10px; background:rgba(0,0,0,0.7); color:white; padding:4px 10px; border-radius:4px; font-size:0.85rem; font-weight: bold;">📸 ${imagesArr.length} Photos</div>
                </div>
                <div class="property-details" style="padding: 20px; display:flex; flex-direction:column; flex-grow: 1;">
                    <h3 class="price" style="font-size: 1.4rem; color: #1a365d; margin-bottom: 10px;">${formattedPrice}</h3>
                    <p style="font-size: 1.05rem; color: #4a5568; margin-bottom: 5px; font-weight: 500; line-height: 1.3;">${title}</p>
                    <p style="color: #718096; font-size: 0.9rem; margin-bottom: 15px;">${address}</p>
                    
                    ${detailsRow ? `<p style="color: #718096; font-size: 0.9rem; margin-bottom: 15px;">${detailsRow}</p>` : ''}
                    
                    ${iconsHTML}

                    <div class="action-buttons" style="display: flex; gap: 10px; margin-top: auto; padding-top: 20px;">
                        <a href="https://wa.me/60169242000?text=Hi%20Jong,%20I'm%20interested%20in%20${encodeURIComponent(title)}" class="whatsapp-btn" target="_blank" style="flex: 1; margin:0;">💬 WhatsApp</a>
                    </div>
                </div>
            </div>
            `;
            allCardsHTML += cardHTML;
        });
    }

    grid.innerHTML = allCardsHTML;
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) loadMoreBtn.style.display = (filteredData.length > currentLimit) ? 'block' : 'none';
}

function resetAndFilter() {
    currentLimit = 6;
    filterProperties();
}

function showMoreListings() {
    currentLimit += 6;
    filterProperties();
}

// LIGHTBOX FUNCTIONS
function openLightbox(galleryId, imgIndex) {
    currentGalleryId = galleryId;
    currentImageIndex = imgIndex;
    let gallery = lightboxGalleries[currentGalleryId];
    if (gallery && gallery.length > 0) {
        document.getElementById('lightbox-img').src = gallery[currentImageIndex];
        document.getElementById('lightbox').style.display = 'block';
    }
}

function closeLightbox() {
    document.getElementById('lightbox').style.display = 'none';
}

function changeLightboxImage(direction) {
    let gallery = lightboxGalleries[currentGalleryId];
    if (!gallery) return;
    currentImageIndex += direction;
    if (currentImageIndex >= gallery.length) currentImageIndex = 0;
    else if (currentImageIndex < 0) currentImageIndex = gallery.length - 1;
    document.getElementById('lightbox-img').src = gallery[currentImageIndex];
}
