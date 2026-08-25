const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSaVVVJKkYOYo7Gs1vXMme9mBWAEtQUGkFbB7wcL_n-IGGkFzzwvq2yxQgWKuhyZKe-J4tYza3yzLtO/pub?output=csv";
        
let currentLimit = 6;
let currentMarket = 'all';

// Lightbox Array Setup
let lightboxGalleries = {};
let currentGalleryId = null;
let currentImageIndex = 0;

function getYouTubeEmbedUrl(url) {
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
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
            let details = row['The Good (Pros)'] ? row['The Good (Pros)'].replace(/\n/g, '<br>') : '';
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

            // FIXED: Smart Price Logic Applied Here
            let priceStr = row['Price'] ? String(row['Price']).trim() : '';
            let formattedPrice = 'Price on Request';
            if (priceStr) {
                if (priceStr.toLowerCase().includes('rent') || priceStr.toLowerCase().includes('sale')) {
                    formattedPrice = priceStr;
                } else {
                    formattedPrice = status === 'rent' ? `Rent ${priceStr}` : `Sale ${priceStr}`;
                }
            }

            // FIXED: Lightbox Photo Arrays Built Here
            let rawImages = row['Image Name'] ? String(row['Image Name']).trim() : '';
            let imagesArr = rawImages.split(',').map(url => url.trim()).filter(url => url !== '');
            let uniqueSliderId = `slider-${index}`;
            lightboxGalleries[uniqueSliderId] = imagesArr;

            let imageHTML = `<div class="image-slider-container">`;
            if (imagesArr.length > 0) {
                imageHTML += `<img src="${imagesArr[0]}" alt="${title}" loading="lazy" class="slider-img" onclick="openLightbox('${uniqueSliderId}', 0)" title="Click to view all photos">`;
            }
            imageHTML += `</div>`;

            let videoLink = row['Video Link'] ? row['Video Link'].trim() : '';
            let videoHTML = '';
            if (videoLink) {
                let ytEmbed = getYouTubeEmbedUrl(videoLink);
                if (ytEmbed) {
                    videoHTML = `
                    <div class="video-container" style="margin-top:15px;">
                        <iframe src="${ytEmbed}" allowfullscreen></iframe>
                    </div>`;
                } else {
                    videoHTML = `<a href="${videoLink}" class="video-btn" target="_blank" style="margin-top:15px;">🎬 Watch Video Tour</a>`;
                }
            }

            // The beautifully formatted card using your original structure
            let cardHTML = `
            <div class="property-card" data-status="${status}" data-type="${typeValue || 'all'}" data-area="${areaValue || 'all'}" data-project="${isProject}" style="display:flex; flex-direction:column; height:100%;">
                ${badgeHTML}
                ${imageHTML}
                <div class="property-details" style="padding: 20px; display:flex; flex-direction:column; flex-grow: 1;">
                    <h3 class="price" style="font-size: 1.5rem; color: var(--secondary); margin-bottom: 5px;">${formattedPrice}</h3>
                    <p style="font-size: 1.1rem; color: #4a5568; margin-bottom: 5px; font-weight: 500;">${title}</p>
                    <p style="color: #718096; font-size: 0.9rem; margin-bottom: 15px;">${address}</p>
                    
                    <div class="pros-cons" style="margin-bottom: 15px;">
                        <p class="pro" style="color: #1a365d; font-size:0.95rem;"><strong>✅ Details:</strong><br>${details}</p>
                    </div>
                    ${videoHTML}
                    
                    <div class="action-buttons" style="display: flex; gap: 10px; margin-top: auto;">
                        <button onclick="openLightbox('${uniqueSliderId}', 0)" style="flex: 1; text-align: center; background-color: var(--primary); color: white; padding: 12px; border:none; cursor:pointer; border-radius: 5px; font-weight: bold;">📸 Photos</button>
                        <a href="https://wa.me/60169242000?text=Hi%20Jong,%20I'm%20interested%20in%20${encodeURIComponent(title)}" class="whatsapp-btn" target="_blank" style="flex: 1;">💬 WhatsApp</a>
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

// FIXED: Lightbox Opening and Closing Functions
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
