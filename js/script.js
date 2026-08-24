const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSaVVVJKkYOYo7Gs1vXMme9mBWAEtQUGkFbB7wcL_n-IGGkFzzwvq2yxQgWKuhyZKe-J4tYza3yzLtO/pub?output=csv";
let currentLimit = 6;
let currentMarket = 'all'; 
let allProperties = []; 
let lightboxGalleries = {}; 
let currentGalleryId = null;
let currentImageIndex = 0;

function parsePrice(priceStr) {
    if (!priceStr) return 0;
    return parseInt(String(priceStr).replace(/[^0-9]/g, ''), 10) || 0;
}

function setMarket(marketType, btnElement) {
    currentMarket = marketType;
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => tab.classList.remove('active'));
    btnElement.classList.add('active');
    resetAndFilter();
}

// Keep PapaParse, but use our upgraded logic!
Papa.parse(csvUrl, {
    download: true,
    header: true,
    complete: function(results) {
        allProperties = results.data.filter(row => row['Property Name']); // filter empty rows

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
    error: function(error) {
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
        allCardsHTML = '<div class="no-results-msg" style="grid-column: 1/-1; text-align: center; padding: 40px 0;">No properties found matching your criteria.</div>';
    } else {
        const propertiesToShow = filteredData.slice(0, currentLimit);
        
        propertiesToShow.forEach((row, index) => {
            let title = row['Property Name'] || '';
            let rawDesc = row['The Good (Pros)'] ? String(row['The Good (Pros)']) : '';
            let areaRaw = row['Area'] ? String(row['Area']).trim() : '';
            let address = areaRaw ? `${areaRaw}, Sarawak` : 'Miri, Sarawak';
            
            // SMART PRICE LOGIC
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
            
            let typeValue = row['Type'] ? String(row['Type']).trim() : '';
            let isProject = (typeValue.toLowerCase().includes('project') || typeValue.toLowerCase().includes('developer'));
            let badgeHTML = isProject ? `<div class="badge-new">🏢 PROJECT</div>` : '';
            
            // AUTO CAPTURE LOGIC
            let builtUpMatch = rawDesc.match(/([\d,\.]+)\s*sq\.?\s*ft\.?/i);
            let builtUp = builtUpMatch ? `Built-up: ${builtUpMatch[1]} sq. ft.` : '';
            let furnishingMatch = rawDesc.match(/(fully furnished|partially furnished|partly furnished|unfurnished)/i);
            let furnishing = furnishingMatch ? furnishingMatch[1].replace(/(^\w|\s\w)/g, m => m.toUpperCase()) : '';
            let detailsRow = [builtUp, furnishing].filter(Boolean).join(' | ');

            let rawImages = row['Image Name'] ? String(row['Image Name']).trim() : '';
            let imagesArr = rawImages.split(',').map(url => url.trim()).filter(url => url !== '');
            let uniqueSliderId = `slider-${index}`;
            lightboxGalleries[uniqueSliderId] = imagesArr;

            let sliderHTML = `<div class="image-slider-container"><div class="image-slider" id="${uniqueSliderId}">`;
            if (imagesArr.length > 0) {
                imagesArr.forEach((imgUrl, i) => {
                    sliderHTML += `<img src="${imgUrl}" alt="${title}" loading="lazy" class="slider-img" onclick="openLightbox('${uniqueSliderId}', ${i})">`;
                });
            }
            sliderHTML += `</div>`;
            if (imagesArr.length > 1) {
                sliderHTML += `<button class="slider-btn slider-btn-prev" onclick="slideImage('${uniqueSliderId}', -1)">&#10094;</button><button class="slider-btn slider-btn-next" onclick="slideImage('${uniqueSliderId}', 1)">&#10095;</button>`;
            }
            sliderHTML += `</div>`;

            let beds = row['Bedrooms'] ? String(row['Bedrooms']).trim() : '';
            let baths = row['Bathrooms'] ? String(row['Bathrooms']).trim() : '';
            let parking = row['Car Park'] ? String(row['Car Park']).trim() : '';
            let iconsHTML = '';
            if (beds || baths || parking) {
                iconsHTML = `<div class="icon-row" style="display: flex; gap: 20px; color: #4a5568; font-size: 1rem; margin-bottom: 20px;">`;
                if (beds) iconsHTML += `<span>🛏️ ${beds}</span>`;
                if (baths) iconsHTML += `<span>🛁 ${baths}</span>`;
                if (parking) iconsHTML += `<span>🚗 ${parking}</span>`;
                iconsHTML += `</div>`;
            }

            allCardsHTML += `
            <div class="property-card" style="display:flex; flex-direction:column; height:100%;">
                ${badgeHTML}
                ${sliderHTML}
                <div class="property-details" style="padding: 20px; display:flex; flex-direction:column; flex-grow: 1;">
                    <h3 class="price" style="font-size: 1.5rem; color: #2d3748; margin-bottom: 15px;">${formattedPrice}</h3>
                    <p style="font-size: 1.1rem; color: #4a5568; margin-bottom: 5px; font-weight: 500;">${title}</p>
                    <p style="color: #718096; font-size: 0.9rem; margin-bottom: 15px;">${address}</p>
                    ${detailsRow ? `<p style="color: #718096; font-size: 0.9rem; margin-bottom: 20px;">${detailsRow}</p>` : ''}
                    ${iconsHTML}
                    <div class="action-buttons" style="display: flex; gap: 10px; margin-top: auto;">
                        <button onclick="openLightbox('${uniqueSliderId}', 0)" style="flex: 1; text-align: center; background-color: var(--primary); color: white; padding: 10px; border:none; cursor:pointer; border-radius: 5px; font-weight: bold;">📸 Photos</button>
                        <a href="https://wa.me/60169242000?text=Hi%20Jong,%20I'm%20interested%20in%20${encodeURIComponent(title)}" target="_blank" style="flex: 1; text-align: center; background-color: #25D366; color: white; padding: 10px; border-radius: 5px; text-decoration: none; font-weight: bold;">💬 WhatsApp</a>
                    </div>
                </div>
            </div>`;
        });
    }

    grid.innerHTML = allCardsHTML;
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) loadMoreBtn.style.display = (filteredData.length > currentLimit) ? 'block' : 'none';
}

function openLightbox(galleryId, imgIndex) {
    currentGalleryId = galleryId;
    currentImageIndex = imgIndex;
    let gallery = lightboxGalleries[currentGalleryId];
    const imgEl = document.getElementById('lightbox-img');
    if (imgEl && gallery) imgEl.src = gallery[currentImageIndex];
    document.getElementById('lightbox').style.display = 'block';
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

function slideImage(sliderId, direction) {
    const slider = document.getElementById(sliderId);
    if (!slider) return;
    slider.scrollBy({ left: slider.clientWidth * direction, behavior: 'smooth' });
}

function resetAndFilter() {
    currentLimit = 6;
    filterProperties();
}
function showMoreListings() {
    currentLimit += 6;
    filterProperties();
}
