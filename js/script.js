const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSaVVVJKkYOYo7Gs1vXMme9mBWAEtQUGkFbB7wcL_n-IGGkFzzwvq2yxQgWKuhyZKe-J4tYza3yzLtO/pub?output=csv";
        
let currentLimit = 6;
let currentMarket = 'all'; 

// Variables for the Pop-up Lightbox
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
        const data = results.data;
        const grid = document.querySelector('.property-grid');
        grid.innerHTML = ''; 

        const uniqueAreas = new Set();
        const uniqueTypes = new Set();

        data.forEach((row, index) => {
            if(!row['Property Name']) return; 

            let title = row['Property Name'];
            let rawDesc = row['The Good (Pros)'] ? String(row['The Good (Pros)']) : '';
            let status = row['Status'] ? row['Status'].toLowerCase().trim() : 'sale';
            
            let rawType = row['Type'] ? row['Type'].trim() : '';
            let typeValue = rawType.toLowerCase();
            
            let rawArea = row['Area'] ? row['Area'].trim() : '';
            let areaValue = rawArea.toLowerCase();
            let address = rawArea ? `${rawArea}, Sarawak` : 'Miri, Sarawak';

            if (rawType) uniqueTypes.add(rawType);
            if (rawArea) uniqueAreas.add(rawArea);

            let isProject = (typeValue.includes('project') || typeValue.includes('developer')) ? 'true' : 'false';
            
            let badgeHTML = '';
            if (isProject === 'true') {
                badgeHTML = `<div class="badge-new">🏢 PROJECT</div>`;
            }

            // AUTO-CAPTURE: Price Formatting
            let priceStr = row['Price'] ? String(row['Price']).trim() : 'Price on Request';
            if (priceStr && !priceStr.toLowerCase().includes('rent') && !priceStr.toLowerCase().includes('sale')) {
                priceStr = status === 'rent' ? `Rent ${priceStr}` : `Sale ${priceStr}`;
            }

            // AUTO-CAPTURE: Built-up & Furnishing from description
            let builtUpMatch = rawDesc.match(/([\d,\.]+)\s*sq\.?\s*ft\.?/i);
            let builtUp = builtUpMatch ? `Built-up: ${builtUpMatch[1]} sq. ft.` : '';
            let furnishingMatch = rawDesc.match(/(fully furnished|partially furnished|partly furnished|unfurnished)/i);
            let furnishing = furnishingMatch ? furnishingMatch[1].replace(/(^\w|\s\w)/g, m => m.toUpperCase()) : '';
            let detailsRow = [builtUp, furnishing].filter(Boolean).join(' | ');

            // AUTO-CAPTURE: Beds, Baths, and Parking (Falls back to regex if columns are empty)
            let beds = row['Bedrooms'] ? String(row['Bedrooms']).trim() : '';
            let baths = row['Bathrooms'] ? String(row['Bathrooms']).trim() : '';
            let parking = row['Car Park'] ? String(row['Car Park']).trim() : '';
            
            if (!beds) { let bMatch = rawDesc.match(/(\d+)\s*(beds|bedroom|bedrooms)/i); if(bMatch) beds = bMatch[1]; }
            if (!baths) { let bMatch = rawDesc.match(/(\d+)\s*(baths|bathroom|bathrooms)/i); if(bMatch) baths = bMatch[1]; }

            let iconsHTML = '';
            if (beds || baths || parking) {
                iconsHTML = `<div class="icon-row">`;
                if (beds) iconsHTML += `<span style="display:flex; align-items:center; gap:5px;">🛏️ ${beds}</span>`;
                if (baths) iconsHTML += `<span style="display:flex; align-items:center; gap:5px;">🛁 ${baths}</span>`;
                if (parking) iconsHTML += `<span style="display:flex; align-items:center; gap:5px;">🚗 ${parking}</span>`;
                iconsHTML += `</div>`;
            }

            // LIGHTBOX ARRAY: Prepares the images to open in big view
            let rawImages = row['Image Name'] ? String(row['Image Name']).trim() : '';
            let imagesArr = rawImages.split(',').map(url => url.trim()).filter(url => url !== '');
            let uniqueSliderId = `slider-${index}`;
            lightboxGalleries[uniqueSliderId] = imagesArr;
            let firstImage = imagesArr.length > 0 ? imagesArr[0] : 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80';

            // CARD HTML FORMATTED LIKE YOUR SCREENSHOT
            let cardHTML = `
            <div class="property-card" data-status="${status}" data-type="${typeValue || 'all'}" data-area="${areaValue || 'all'}" data-project="${isProject}" style="display:flex; flex-direction:column; height:100%; border: 1px solid #e2e8f0; box-shadow: none; background: #fff;">
                ${badgeHTML}
                <div style="position:relative;" onclick="openLightbox('${uniqueSliderId}', 0)" title="Click to view full photos">
                    <img src="${firstImage}" alt="${title}" style="height: 220px; width: 100%; object-fit: cover;">
                </div>
                <div class="property-details" style="padding: 20px; display:flex; flex-direction:column; flex-grow: 1;">
                    <h3 class="price">${priceStr}</h3>
                    <p class="card-title" onclick="openLightbox('${uniqueSliderId}', 0)" title="Click to view details">${title}</p>
                    <p style="color: #718096; font-size: 0.9rem; margin-bottom: 15px;">${address}</p>
                    
                    ${detailsRow ? `<p style="color: #718096; font-size: 0.9rem; margin-bottom: 15px;">${detailsRow}</p>` : ''}
                    
                    ${iconsHTML}

                    <div class="action-buttons" style="display: flex; gap: 10px; margin-top: auto;">
                        <a href="https://wa.me/60169242000?text=Hi%20Jong,%20I'm%20interested%20in%20${encodeURIComponent(title)}" class="whatsapp-btn" target="_blank" style="flex: 1; margin:0;">💬 WhatsApp</a>
                    </div>
                </div>
            </div>
            `;
            grid.innerHTML += cardHTML;
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
    
    const cards = document.querySelectorAll('.property-card');
    let matchedCount = 0;
    
    cards.forEach(card => {
        const matchStatus = (statusVal === 'all' || card.getAttribute('data-status') === statusVal);
        const matchType = (typeVal === 'all' || card.getAttribute('data-type') === typeVal);
        const matchArea = (areaVal === 'all' || card.getAttribute('data-area') === areaVal);
        
        const isProjectCard = card.getAttribute('data-project');
        const matchMarket = (currentMarket === 'all') || 
                            (currentMarket === 'project' && isProjectCard === 'true') || 
                            (currentMarket === 'subsale' && isProjectCard === 'false');
        
        const cardText = card.innerText.toLowerCase();
        const matchSearch = (searchVal === '' || cardText.includes(searchVal));
        
        if (matchStatus && matchType && matchArea && matchSearch && matchMarket) {
            matchedCount++;
            if (matchedCount <= currentLimit) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        } else {
            card.style.display = 'none';
        }
    });

    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        if (matchedCount > currentLimit) {
            loadMoreBtn.style.display = 'block';
        } else {
            loadMoreBtn.style.display = 'none';
        }
    }
}

function resetAndFilter() {
    currentLimit = 6;
    filterProperties();
}

function showMoreListings() {
    currentLimit += 6;
    filterProperties();
}

// LIGHTBOX LOGIC FOR BIGGER PICTURES
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
