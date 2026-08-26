const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSaVVVJKkYOYo7Gs1vXMme9mBWAEtQUGkFbB7wcL_n-IGGkFzzwvq2yxQgWKuhyZKe-J4tYza3yzLtO/pub?output=csv";
        
let currentLimit = 6;
let currentMarket = 'all'; 

// Variables for the Pop-up Gallery
let lightboxGalleries = {};
let currentGalleryId = null;
let currentImageIndex = 0;

function getYouTubeEmbedUrl(url) {
    if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) {
        return null;
    }
    let regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    let match = url.match(regExp);
    if (match && match[2].length === 11) {
        return `https://www.youtube.com/embed/${match[2]}`;
    }
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
            let badgeHTML = isProject === 'true' ? `<div class="badge-new">🏢 PROJECT</div>` : '';

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

            // AUTO-CAPTURE LOGIC (Rooms & Baths)
            let beds = row['Bedrooms'] ? String(row['Bedrooms']).trim() : '';
            let baths = row['Bathrooms'] ? String(row['Bathrooms']).trim() : '';
            // If empty, automatically search description for numbers!
            if (!beds) { let bMatch = rawDesc.match(/(\d+)\s*(beds|bedroom|bedrooms)/i); if(bMatch) beds = bMatch[1]; }
            if (!baths) { let bMatch = rawDesc.match(/(\d+)\s*(baths|bathroom|bathrooms)/i); if(bMatch) baths = bMatch[1]; }

            let iconsHTML = '';
            if (beds || baths) {
                iconsHTML = `<div class="icon-row">`;
                if (beds) iconsHTML += `<span style="display:flex; align-items:center; gap:5px;">🛏️ ${beds}</span>`;
                if (baths) iconsHTML += `<span style="display:flex; align-items:center; gap:5px;">🛁 ${baths}</span>`;
                iconsHTML += `</div>`;
            }

            // PREPARE LIGHTBOX IMAGES
            let rawImages = row['Image Name'] ? String(row['Image Name']).trim() : '';
            let imagesArr = rawImages.split(',').map(url => url.trim()).filter(url => url !== '');
            let uniqueSliderId = `slider-${index}`;
            lightboxGalleries[uniqueSliderId] = imagesArr;
            let firstImage = imagesArr.length > 0 ? imagesArr[0] : 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80';

            // VIDEO LINK (If any)
            let videoLink = row['Video Link'] ? row['Video Link'].trim() : '';
            let videoHTML = '';
            if (videoLink) {
                let ytEmbed = getYouTubeEmbedUrl(videoLink);
                if (ytEmbed) {
                    videoHTML = `<div class="video-container" style="margin-bottom: 15px;"><iframe src="${ytEmbed}" allowfullscreen></iframe></div>`;
                } else {
                    videoHTML = `<a href="${videoLink}" class="video-btn" target="_blank" style="margin-bottom: 15px;">🎬 Watch Video Tour</a>`;
                }
            }

            // PERFECTED LAYOUT (Clickable Area + Full Width WhatsApp)
            let cardHTML = `
            <div class="property-card" data-status="${status}" data-type="${typeValue || 'all'}" data-area="${areaValue || 'all'}" data-project="${isProject}" style="display:flex; flex-direction:column; height:100%; border: 1px solid #e2e8f0; background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                ${badgeHTML}
                
                <!-- EVERYTHING HERE IS CLICKABLE TO ZOOM -->
                <div class="clickable-area" style="cursor:pointer;" onclick="openLightbox('${uniqueSliderId}', 0)" title="Click to view full photos and zoom">
                    <img src="${firstImage}" alt="${title}" style="height: 220px; width: 100%; object-fit: cover; border-bottom: 1px solid #e2e8f0; border-radius: 4px 4px 0 0;">
                    
                    <div style="padding: 20px;">
                        <h3 class="price" style="font-size: 1.5rem; color: #1a365d; margin-bottom: 15px;">${formattedPrice}</h3>
                        <p style="font-size: 1.05rem; color: #4a5568; margin-bottom: 5px; font-weight: 500; line-height: 1.4;">${title}</p>
                        <p style="color: #718096; font-size: 0.9rem; margin-bottom: 15px;">${address}</p>
                        
                        ${detailsRow ? `<p style="color: #718096; font-size: 0.9rem; margin-bottom: 15px;">${detailsRow}</p>` : ''}
                        
                        ${iconsHTML}
                    </div>
                </div>

                <div class="property-details" style="padding: 0 20px 20px 20px; display:flex; flex-direction:column; flex-grow: 1;">
                    ${videoHTML}
                    
                    <div class="action-buttons" style="display: flex; margin-top: auto;">
                        <a href="https://wa.me/60169242000?text=Hi%20Jong,%20I'm%20interested%20in%20${encodeURIComponent(title)}" class="whatsapp-btn" target="_blank" style="width: 100%; background-color: #25D366; border-radius: 4px; padding: 12px; font-size: 1.05rem;">💬 WhatsApp</a>
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

// LIGHTBOX FUNCTIONS TO ZOOM PHOTOS
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
