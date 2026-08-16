const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSaVVVJKkYOYo7Gs1vXMme9mBWAEtQUGkFbB7wcL_n-IGGkFzzwvq2yxQgWKuhyZKe-J4tYza3yzLtO/pub?output=csv";
        
let currentLimit = 6;
let currentMarket = 'all'; 
let allProperties = []; 

let lightboxGalleries = {}; 
let currentGalleryId = null;
let currentImageIndex = 0;

// --- NEW SEO HELPER FUNCTION ---
function slugify(text) {
    return text.toString().toLowerCase()
      .replace(/\s+/g, '-')           
      .replace(/[^\w\-]+/g, '')       
      .replace(/\-\-+/g, '-')         
      .replace(/^-+/, '')             
      .replace(/-+$/, '');            
}

function getYouTubeEmbedUrl(url) {
    if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) { return null; }
    let regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    let match = url.match(regExp);
    if (match && match[2].length === 11) { return `https://www.youtube.com/embed/${match[2]}`; }
    return null;
}

function parsePrice(priceStr) {
    if (!priceStr) return 0;
    return parseInt(priceStr.replace(/[^0-9]/g, ''), 10) || 0;
}

function setMarket(marketType, btnElement) {
    currentMarket = marketType;
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => tab.classList.remove('active'));
    btnElement.classList.add('active');
    resetAndFilter();
}

// Safety check: Only load CSV if we are on the listing page
if (document.querySelector('.property-grid')) {
    Papa.parse(csvUrl, {
        download: true,
        header: true,
        complete: function(results) {
            allProperties = results.data.filter(row => row['Property Name']);
            const uniqueAreas = new Set();
            const uniqueTypes = new Set();

            allProperties.forEach(row => {
                let rawType = row['Type'] ? row['Type'].trim() : '';
                let rawArea = row['Area'] ? row['Area'].trim() : '';
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

            // --- NEW SEO ROUTING LOGIC ---
            const urlParams = new URLSearchParams(window.location.search);
            const propertySlug = urlParams.get('property');

            if (propertySlug) {
                // If a unique property URL is accessed, show only that property
                renderSingleProperty(propertySlug);
            } else {
                // Otherwise, show the normal grid
                filterProperties();
            }
        },
        error: function(error) {
            const grid = document.querySelector('.property-grid');
            if (grid) grid.innerHTML = '<h3 style="text-align:center; width:100%; color:#e53e3e;">Failed to load properties.</h3>';
            console.error("Error fetching data:", error);
        }
    });
}

// --- NEW SINGLE PROPERTY RENDERER ---
function renderSingleProperty(slug) {
    // Find the specific property
    const property = allProperties.find(row => slugify(row['Property Name']) === slug);
    const grid = document.querySelector('.property-grid');
    
    if (!property) {
        grid.innerHTML = '<h3 style="text-align:center; width: 100%;">Property not found. <a href="listing.html" style="color: var(--primary);">Return to listings</a></h3>';
        return;
    }

    // --- DYNAMIC SEO UPGRADE ---
    // Update the browser tab title and meta description
    document.title = `${property['Property Name']} | Jong Express Property`;
    let metaDesc = document.querySelector('meta[name="description"]');
    if(metaDesc) {
        metaDesc.setAttribute("content", `For Sale/Rent: ${property['Property Name']} located in ${property['Area']}. Price: ${property['Price']}. 100% verified listing.`);
    }

    // Hide the search filters and load more button for the single view
    const searchWrapper = document.querySelector('.search-filter-wrapper');
    if(searchWrapper) searchWrapper.style.display = 'none';
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if(loadMoreBtn) loadMoreBtn.style.display = 'none';

    // Temporarily replace allProperties with just this one to reuse the card generator
    allProperties = [property]; 
    currentLimit = 1; // Only need to render one
    filterProperties(); 
}

function filterProperties() {
    const statusVal = document.getElementById('statusFilter') ? document.getElementById('statusFilter').value : 'all';
    const typeVal = document.getElementById('typeFilter') ? document.getElementById('typeFilter').value : 'all';
    const areaVal = document.getElementById('areaFilter') ? document.getElementById('areaFilter').value : 'all';
    const searchVal = document.getElementById('searchBar') ? document.getElementById('searchBar').value.toLowerCase().trim() : '';
    const sortVal = document.getElementById('sortPriceFilter') ? document.getElementById('sortPriceFilter').value : 'default';

    let filteredData = allProperties.filter(row => {
        let status = row['Status'] ? row['Status'].toLowerCase().trim() : 'sale';
        let typeValue = row['Type'] ? row['Type'].trim().toLowerCase() : '';
        let areaValue = row['Area'] ? row['Area'].trim().toLowerCase() : '';
        let isProject = (typeValue.includes('project') || typeValue.includes('developer'));
        
        const matchStatus = (statusVal === 'all' || status === statusVal);
        const matchType = (typeVal === 'all' || typeValue === typeVal);
        const matchArea = (areaVal === 'all' || areaValue === areaVal);
        const matchMarket = (currentMarket === 'all') || (currentMarket === 'project' && isProject) || (currentMarket === 'subsale' && !isProject);
        const rowText = Object.values(row).join(' ').toLowerCase();
        const matchSearch = (searchVal === '' || rowText.includes(searchVal));
        
        return matchStatus && matchType && matchArea && matchSearch && matchMarket;
    });

    if (sortVal === 'lowToHigh') filteredData.sort((a, b) => parsePrice(a['Price']) - parsePrice(b['Price']));
    else if (sortVal === 'highToLow') filteredData.sort((a, b) => parsePrice(b['Price']) - parsePrice(a['Price']));

    const grid = document.querySelector('.property-grid');
    if (!grid) return;
    
    let allCardsHTML = '';
    lightboxGalleries = {};

    if (filteredData.length === 0) {
        allCardsHTML = '<div class="no-results-msg">No properties found matching your criteria.</div>';
    } else {
        const propertiesToShow = filteredData.slice(0, currentLimit);
        
        propertiesToShow.forEach((row, index) => {
            let title = row['Property Name'] || '';
            let address = row['Area'] || '';
            let price = row['Price'] || '';
            let details = row['The Good (Pros)'] ? row['The Good (Pros)'].replace(/\n/g, '<br>') : '';
            let typeValue = row['Type'] ? row['Type'].trim() : '';
            let isProject = (typeValue.toLowerCase().includes('project') || typeValue.toLowerCase().includes('developer'));
            
            let badgeHTML = isProject ? `<div class="badge-new">🏢 PROJECT</div>` : '';
            
            let rawImages = row['Image Name'] ? row['Image Name'].trim() : '';
            let imagesArr = rawImages.split(',').map(url => url.trim()).filter(url => url !== '');
            let uniqueSliderId = `slider-${index}`;
            
            lightboxGalleries[uniqueSliderId] = imagesArr;

            let sliderHTML = `<div class="image-slider-container">`;
            sliderHTML += `<div class="image-slider" id="${uniqueSliderId}" onscroll="updateDots('${uniqueSliderId}', ${imagesArr.length})">`;
            
            if (imagesArr.length > 0) {
                imagesArr.forEach((imgUrl, i) => {
                    sliderHTML += `<img src="${imgUrl}" alt="${title}" loading="lazy" class="slider-img" onclick="openLightbox('${uniqueSliderId}', ${i})">`;
                });
            } else {
                sliderHTML += `<div class="slider-img" style="display:flex; align-items:center; justify-content:center; background: #e2e8f0;">No Image</div>`;
            }
            sliderHTML += `</div>`;
            
            if (imagesArr.length > 1) {
                sliderHTML += `<button class="slider-btn slider-btn-prev" onclick="slideImage('${uniqueSliderId}', -1)">&#10094;</button>`;
                sliderHTML += `<button class="slider-btn slider-btn-next" onclick="slideImage('${uniqueSliderId}', 1)">&#10095;</button>`;
                
                sliderHTML += `<div class="slider-dots" id="dots-${uniqueSliderId}">`;
                imagesArr.forEach((_, i) => {
                    let activeClass = i === 0 ? 'active' : '';
                    sliderHTML += `<div class="dot ${activeClass}"></div>`;
                });
                sliderHTML += `</div>`;
            }
            sliderHTML += `</div>`;

            let beds = row['Bedrooms'] ? row['Bedrooms'].trim() : '';
            let baths = row['Bathrooms'] ? row['Bathrooms'].trim() : '';
            let parking = row['Car Park'] ? row['Car Park'].trim() : '';
            let iconsHTML = '';
            if (beds || baths || parking) {
                iconsHTML = `<div class="icon-row">`;
                if (beds) iconsHTML += `<span>🛏️ ${beds}</span>`;
                if (baths) iconsHTML += `<span>🛁 ${baths}</span>`;
                if (parking) iconsHTML += `<span>🚗 ${parking}</span>`;
                iconsHTML += `</div>`;
            }

            const excludeColumns = ['Property Name', 'Price', 'Image Name', 'Video Link', 'The Good (Pros)', 'Area', 'Timestamp', 'Bedrooms', 'Bathrooms', 'Car Park'];
            let pipeDetailsArr = [];
            Object.keys(row).forEach(col => {
                let val = row[col] ? row[col].trim() : '';
                if (!excludeColumns.includes(col) && val !== '') pipeDetailsArr.push(val);
            });

            let pipeHTML = '';
            if (pipeDetailsArr.length > 0) {
                let spans = pipeDetailsArr.map(item => `<span>${item}</span>`).join('');
                pipeHTML = `<div class="pipe-details">${spans}</div>`;
            }

            let videoLink = row['Video Link'] ? row['Video Link'].trim() : '';
            let videoHTML = '';
            if (videoLink) {
                let ytEmbed = getYouTubeEmbedUrl(videoLink);
                if (ytEmbed) {
                    videoHTML = `<div style="margin-bottom: 15px;"><iframe width="100%" height="200" src="${ytEmbed}" frameborder="0" allowfullscreen></iframe></div>`;
                } else {
                    videoHTML = `<a href="${videoLink}" class="video-btn" target="_blank">🎬 Watch Video Tour</a>`;
                }
            }

            // --- NEW SEO LINK IMPLEMENTATION ---
            let titleSlug = slugify(title);
            let propertyUrl = `listing.html?property=${titleSlug}`;

            allCardsHTML += `
            <div class="property-card">
                ${badgeHTML}
                ${sliderHTML}
                <div class="property-details">
                    <div class="card-header-flex">
                        <div class="card-title-group">
                            <h3><a href="${propertyUrl}" style="color: inherit; text-decoration: none;">${title}</a></h3>
                            ${address ? `<p class="card-address">${address}</p>` : ''}
                        </div>
                        <div class="card-price-group">
                            <p class="price">${price}</p>
                        </div>
                    </div>
                    ${iconsHTML}
                    <div class="card-divider"></div>
                    ${pipeHTML}
                    <div class="pros-cons">
                        <strong>📌 Summary:</strong><br>${details}
                    </div>
                    ${videoHTML}
                    <a href="https://wa.me/60169242000?text=Hi%20Jong,%20I'm%20interested%20in%20${encodeURIComponent(title)}" class="whatsapp-btn" target="_blank">Chat on WhatsApp</a>
                </div>
            </div>`;
        });
    }

    grid.innerHTML = allCardsHTML;

    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        // Hide load more button if we are looking at a single property page
        const urlParams = new URLSearchParams(window.location.search);
        const isSingleProperty = urlParams.get('property');
        
        if (isSingleProperty) {
            loadMoreBtn.style.display = 'none';
        } else {
            loadMoreBtn.style.display = (filteredData.length > currentLimit) ? 'block' : 'none';
        }
    }
}

function openLightbox(galleryId, imgIndex) {
    currentGalleryId = galleryId;
    currentImageIndex = imgIndex;
    updateLightboxView();
    
    const lightbox = document.getElementById('lightbox');
    if (lightbox) lightbox.style.display = 'block';
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (lightbox) lightbox.style.display = 'none';
}

function changeLightboxImage(direction) {
    let gallery = lightboxGalleries[currentGalleryId];
    if (!gallery) return;

    currentImageIndex += direction;
    
    if (currentImageIndex >= gallery.length) {
        currentImageIndex = 0;
    } else if (currentImageIndex < 0) {
        currentImageIndex = gallery.length - 1;
    }
    
    updateLightboxView();
}

function updateLightboxView() {
    let gallery = lightboxGalleries[currentGalleryId];
    const imgEl = document.getElementById('lightbox-img');
    const captionEl = document.getElementById('lightbox-caption');
    
    if (imgEl && gallery) {
        imgEl.src = gallery[currentImageIndex];
    }
    if (captionEl && gallery) {
        captionEl.innerText = `📸 Image ${currentImageIndex + 1} of ${gallery.length}`;
    }
}

function slideImage(sliderId, direction) {
    const slider = document.getElementById(sliderId);
    if (!slider) return;
    const scrollAmount = slider.clientWidth;
    slider.scrollBy({ left: scrollAmount * direction, behavior: 'smooth' });
}

function updateDots(sliderId, totalImages) {
    const slider = document.getElementById(sliderId);
    const dotsContainer = document.getElementById(`dots-${sliderId}`);
    if (!slider || !dotsContainer) return;
    
    const scrollPosition = slider.scrollLeft;
    const imageWidth = slider.clientWidth;
    const currentIndex = Math.round(scrollPosition / imageWidth);
    
    const dots = dotsContainer.children;
    for (let i = 0; i < dots.length; i++) {
        if (i === currentIndex) {
            dots[i].classList.add('active');
        } else {
            dots[i].classList.remove('active');
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
