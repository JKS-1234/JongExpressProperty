const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSaVVVJKkYOYo7Gs1vXMme9mBWAEtQUGkFbB7wcL_n-IGGkFzzwvq2yxQgWKuhyZKe-J4tYza3yzLtO/pub?output=csv";
let currentLimit = 6;
let currentMarket = 'all'; 
let allProperties = []; 
let lightboxGalleries = {}; 
let currentGalleryId = null;
let currentImageIndex = 0;

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
    },
    error: function() {
        const grid = document.querySelector('.property-grid');
        if (grid) grid.innerHTML = '<h3 style="text-align:center; width:100%; color:#e53e3e;">Error loading listings.</h3>';
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
        allCardsHTML = '<div class="no-results-msg" style="grid-column: 1/-1; text-align: center; padding: 40px 0; font-size:1.1rem; color:#718096;">No properties found matching your criteria.</div>';
    } else {
        const propertiesToShow = filteredData.slice(0, currentLimit);
        
        propertiesToShow.forEach((row, index) => {
            let title = row['Property Name'] || '';
            let rawDesc = row['The Good (Pros)'] ? String(row['The Good (Pros)']) : '';
            let address = row['Area'] ? `${row['Area']}, Sarawak` : 'Miri, Sarawak';
            
            // Smart Price Logic
            let priceStr = row['Price'] ? String(row['Price']).trim() : '';
            let propStatus = row['Status'] ? String(row['Status']).toLowerCase().trim() : 'sale';
            let formattedPrice = 'Price on Request';
            if (priceStr) {
                if (priceStr.toLowerCase().includes('rent') || priceStr.toLowerCase().includes('sale')) {
                    formattedPrice = priceStr;
                } else {
                    formattedPrice = propStatus === 'rent' ? `Rent ${priceStr}` : `Sale ${priceStr}`;
                }
            }
            
            let isProject = (String(row['Type']).toLowerCase().includes('project'));
            let badgeHTML = isProject ? `<div class="badge-new">🏢 PROJECT</div>` : '';
            
            // Auto-Capture Specs
            let builtUpMatch = rawDesc.match(/([\d,\.]+)\s*sq\.?\s*ft\.?/i);
            let builtUp = builtUpMatch ? `Built-up: ${builtUpMatch[1]} sq. ft.` : '';
            let furnishingMatch = rawDesc.match(/(fully furnished|partially furnished|partly furnished|unfurnished)/i);
            let furnishing = furnishingMatch ? furnishingMatch[1].replace(/(^\w|\s\w)/g, m => m.toUpperCase()) : '';
            let detailsRow = [builtUp, furnishing].filter(Boolean).join(' | ');

            let rawImages = row['Image Name'] ? String(row['Image Name']).trim() : '';
            let imagesArr = rawImages.split(',').map(url => url.trim()).filter(url => url !== '');
            let uniqueSliderId = `slider-${index}`;
            lightboxGalleries[uniqueSliderId] = imagesArr;

            let imageHTML = `<div class="image-slider-container">`;
            if (imagesArr.length > 0) {
                imageHTML += `<img src="${imagesArr[0]}" alt="${title}" loading="lazy" class="slider-img" onclick="openLightbox('${uniqueSliderId}', 0)" title="Click to view all photos">`;
            }
            imageHTML += `</div>`;

            let iconsHTML = `<div class="icon-row" style="display: flex; gap: 20px; color: #4a5568; font-size: 1rem; margin-bottom: 20px;">`;
            if (row['Bedrooms']) iconsHTML += `<span style="display:flex; align-items:center; gap:5px;">🛏️ ${row['Bedrooms']}</span>`;
            if (row['Bathrooms']) iconsHTML += `<span style="display:flex; align-items:center; gap:5px;">🛁 ${row['Bathrooms']}</span>`;
            if (row['Car Park']) iconsHTML += `<span style="display:flex; align-items:center; gap:5px;">🚗 ${row['Car Park']}</span>`;
            iconsHTML += `</div>`;

            let ytEmbed = getYouTubeEmbedUrl(row['Video Link'] || '');
            let videoHTML = ytEmbed ? `<div class="video-container"><iframe src="${ytEmbed}" allowfullscreen></iframe></div>` : '';

            allCardsHTML += `
            <div class="property-card" style="display:flex; flex-direction:column; height:100%;">
                ${badgeHTML}
                ${imageHTML}
                <div class="property-details" style="padding: 20px; display:flex; flex-direction:column; flex-grow: 1;">
                    <h3 class="price" style="font-size: 1.5rem; color: #2d3748; margin-bottom: 15px;">${formattedPrice}</h3>
                    <p style="font-size: 1.1rem; color: #4a5568; margin-bottom: 5px; font-weight: 500;">${title}</p>
                    <p style="color: #718096; font-size: 0.9rem; margin-bottom: 15px;">${address}</p>
                    ${detailsRow ? `<p style="color: #718096; font-size: 0.9rem; margin-bottom: 15px;">${detailsRow}</p>` : ''}
                    ${iconsHTML}
                    ${videoHTML}
                    <div class="action-buttons" style="display: flex; gap: 10px; margin-top: auto;">
                        <button onclick="openLightbox('${uniqueSliderId}', 0)" style="flex: 1; text-align: center; background-color: var(--primary); color: white; padding: 12px; border:none; cursor:pointer; border-radius: 5px; font-weight: bold;">📸 View Photos</button>
                        <a href="https://wa.me/60169242000?text=Hi%20Jong,%20I'm%20interested%20in%20${encodeURIComponent(title)}" target="_blank" style="flex: 1; text-align: center; background-color: #25D366; color: white; padding: 12px; border-radius: 5px; text-decoration: none; font-weight: bold;">💬 WhatsApp</a>
                    </div>
                </div>
            </div>`;
        });
    }

    grid.innerHTML = allCardsHTML;
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) loadMoreBtn.style.display = (filteredData.length > currentLimit) ? 'block' : 'none';
}

function getYouTubeEmbedUrl(url) {
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) return null;
    let regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    let match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
}

function openLightbox(galleryId, imgIndex) {
    currentGalleryId = galleryId;
    currentImageIndex = imgIndex;
    let gallery = lightboxGalleries[currentGalleryId];
    if (gallery && gallery.length > 0) {
        document.getElementById('lightbox-img').src = gallery[currentImageIndex];
        document.getElementById('lightbox').style.display = 'block';
    }
}

function closeLightbox() { document.getElementById('lightbox').style.display = 'none'; }

function changeLightboxImage(direction) {
    let gallery = lightboxGalleries[currentGalleryId];
    if (!gallery) return;
    currentImageIndex += direction;
    if (currentImageIndex >= gallery.length) currentImageIndex = 0;
    else if (currentImageIndex < 0) currentImageIndex = gallery.length - 1;
    document.getElementById('lightbox-img').src = gallery[currentImageIndex];
}

function resetAndFilter() { currentLimit = 6; filterProperties(); }
function showMoreListings() { currentLimit += 6; filterProperties(); }
