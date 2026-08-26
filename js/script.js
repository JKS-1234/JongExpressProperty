const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSaVVVJKkYOYo7Gs1vXMme9mBWAEtQUGkFbB7wcL_n-IGGkFzzwvq2yxQgWKuhyZKe-J4tYza3yzLtO/pub?output=csv";
        
let currentLimit = 6;
let currentMarket = 'all'; 
let allPropertiesData = []; 

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
        allPropertiesData = results.data.filter(row => row['Property Name']);

        const uniqueAreas = new Set();
        const uniqueTypes = new Set();

        allPropertiesData.forEach(row => {
            let rawType = row['Type'] ? String(row['Type']).trim() : '';
            let rawArea = row['Area'] ? String(row['Area']).trim() : '';
            if (rawType) uniqueTypes.add(rawType);
            if (rawArea) uniqueAreas.add(rawArea);
        });

        const typeFilter = document.getElementById('typeFilter');
        if (typeFilter) {
            typeFilter.innerHTML = '<option value="all">All Types</option>';
            Array.from(uniqueTypes).sort().forEach(typeName => typeFilter.innerHTML += `<option value="${typeName.toLowerCase()}">${typeName}</option>`);
        }
        const areaFilter = document.getElementById('areaFilter');
        if (areaFilter) {
            areaFilter.innerHTML = '<option value="all">All Areas</option>';
            Array.from(uniqueAreas).sort().forEach(areaName => areaFilter.innerHTML += `<option value="${areaName.toLowerCase()}">${areaName}</option>`);
        }

        filterProperties();
    }
});

function filterProperties() {
    const statusVal = document.getElementById('statusFilter') ? document.getElementById('statusFilter').value : 'all';
    const typeVal = document.getElementById('typeFilter') ? document.getElementById('typeFilter').value : 'all';
    const areaVal = document.getElementById('areaFilter') ? document.getElementById('areaFilter').value : 'all';
    const searchVal = document.getElementById('searchBar') ? document.getElementById('searchBar').value.toLowerCase().trim() : '';
    
    let filteredData = allPropertiesData.filter(row => {
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

    if (filteredData.length === 0) {
        allCardsHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px 0;">No properties found.</div>';
    } else {
        const propertiesToShow = filteredData.slice(0, currentLimit);
        
        propertiesToShow.forEach((row) => {
            let globalIndex = allPropertiesData.indexOf(row); 
            let title = row['Property Name'] || '';
            let rawDesc = row['The Good (Pros)'] ? String(row['The Good (Pros)']) : '';
            let status = row['Status'] ? row['Status'].toLowerCase().trim() : 'sale';
            let address = row['Area'] ? `${row['Area'].trim()}, Sarawak` : 'Miri, Sarawak';
            let isProject = (String(row['Type']).toLowerCase().includes('project'));
            let badgeHTML = isProject ? `<div class="badge-new">🏢 PROJECT</div>` : '';

            // PRICE
            let priceStr = row['Price'] ? String(row['Price']).trim() : '';
            let formattedPrice = 'Price on Request';
            if (priceStr) {
                if (priceStr.toLowerCase().includes('rent') || priceStr.toLowerCase().includes('sale')) {
                    formattedPrice = priceStr;
                } else {
                    formattedPrice = status === 'rent' ? `Rent ${priceStr}` : `Sale ${priceStr}`;
                }
            }

            let furnishingMatch = rawDesc.match(/(fully furnished|partially furnished|partly furnished|unfurnished)/i);
            let furnishing = furnishingMatch ? furnishingMatch[1].replace(/(^\w|\s\w)/g, m => m.toUpperCase()) : '';

            let beds = row['Bedrooms'] ? String(row['Bedrooms']).trim() : '';
            let baths = row['Bathrooms'] ? String(row['Bathrooms']).trim() : '';
            if (!beds) { let bMatch = rawDesc.match(/(\d+)\s*(beds|bedroom|bedrooms)/i); if(bMatch) beds = bMatch[1]; }
            if (!baths) { let bMatch = rawDesc.match(/(\d+)\s*(baths|bathroom|bathrooms)/i); if(bMatch) baths = bMatch[1]; }

            let iconsHTML = '';
            if (beds || baths) {
                iconsHTML = `<div class="icon-row">`;
                if (beds) iconsHTML += `<span style="display:flex; align-items:center; gap:5px;">🛏️ ${beds}</span>`;
                if (baths) iconsHTML += `<span style="display:flex; align-items:center; gap:5px;">🛁 ${baths}</span>`;
                iconsHTML += `</div>`;
            }

            let rawImages = row['Image Name'] ? String(row['Image Name']).trim() : '';
            let imagesArr = rawImages.split(',').map(url => url.trim()).filter(url => url !== '');
            let firstImage = imagesArr.length > 0 ? imagesArr[0] : 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80';

            // Clickable Card Design
            let cardHTML = `
            <div class="property-card clickable-card" style="display:flex; flex-direction:column; height:100%;">
                ${badgeHTML}
                <div onclick="openModal(${globalIndex})" style="cursor:pointer;" title="Click to view full details">
                    <img src="${firstImage}" alt="${title}">
                    <div style="padding: 20px;">
                        <h3 style="font-size: 1.5rem; color: #1a365d; margin-bottom: 10px;">${formattedPrice}</h3>
                        <p style="font-size: 1.05rem; color: #4a5568; margin-bottom: 5px; font-weight: 500;">${title}</p>
                        <p style="color: #718096; font-size: 0.9rem; margin-bottom: 15px;">${address}</p>
                        ${furnishing ? `<p style="color: #718096; font-size: 0.9rem; margin-bottom: 10px;">${furnishing}</p>` : ''}
                        ${iconsHTML}
                    </div>
                </div>
                <div style="padding: 0 20px 20px 20px; margin-top: auto;">
                    <a href="https://wa.me/60169242000?text=Hi%20Jong,%20I'm%20interested%20in%20${encodeURIComponent(title)}" class="whatsapp-btn" target="_blank" style="width: 100%;">💬 WhatsApp</a>
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

function resetAndFilter() { currentLimit = 6; filterProperties(); }
function showMoreListings() { currentLimit += 6; filterProperties(); }

// --- BEAUTIFUL MODAL DETAIL WINDOW ---
function openModal(index) {
    let row = allPropertiesData[index];
    if(!row) return;

    let title = row['Property Name'];
    let status = row['Status'] ? row['Status'].toLowerCase().trim() : 'sale';
    let address = row['Area'] ? `${row['Area'].trim()}, Sarawak` : 'Miri, Sarawak';
    let typeValue = row['Type'] ? row['Type'].trim() : 'Property';

    let priceStr = row['Price'] ? String(row['Price']).trim() : 'Price on Request';
    if (priceStr && !priceStr.toLowerCase().includes('rent') && !priceStr.toLowerCase().includes('sale')) {
        priceStr = status === 'rent' ? `Rent ${priceStr}` : `Sale ${priceStr}`;
    }

    let rawDesc = row['The Good (Pros)'] ? String(row['The Good (Pros)']) : '';
    
    // Auto-Capture Size (Reads "sqft" OR East Malaysian "points")
    let builtUpMatch = rawDesc.match(/([\d,\.]+)\s*(sq\.?ft\.?|points?)/i);
    let propertySize = builtUpMatch ? `${builtUpMatch[1]} ${builtUpMatch[2]}` : '-';
    
    // Beds & Baths Auto-Capture
    let beds = row['Bedrooms'] ? String(row['Bedrooms']).trim() : '-';
    let baths = row['Bathrooms'] ? String(row['Bathrooms']).trim() : '-';
    if (beds === '-') { let bMatch = rawDesc.match(/(\d+)\s*(beds|bedroom|bedrooms)/i); if(bMatch) beds = bMatch[1]; }
    if (baths === '-') { let bMatch = rawDesc.match(/(\d+)\s*(baths|bathroom|bathrooms)/i); if(bMatch) baths = bMatch[1]; }

    // Update Header
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-address').innerText = address;
    document.getElementById('modal-price').innerText = priceStr;
    document.getElementById('modal-beds').innerText = beds;
    document.getElementById('modal-baths').innerText = baths;
    document.getElementById('modal-sqft').innerText = propertySize;
    document.getElementById('modal-type').innerText = typeValue;

    // Build Beautiful Detail Checkmarks
    let furnishingMatch = rawDesc.match(/(fully furnished|partially furnished|partly furnished|unfurnished)/i);
    let furnishing = furnishingMatch ? furnishingMatch[1].replace(/(^\w|\s\w)/g, m => m.toUpperCase()) : 'Unspecified';
    let detailsCheckmarksHTML = `<div class="detail-item-check">${typeValue}</div><div class="detail-item-check">${furnishing}</div>`;
    document.getElementById('modal-details-checkmarks').innerHTML = detailsCheckmarksHTML;

    // Subtitle
    document.getElementById('modal-subtitle').innerText = title;

    // Format Description into a Beautiful List
    let descLines = rawDesc.split('\n');
    let listHTML = '';
    descLines.forEach(line => {
        let cleanLine = line.trim();
        if (cleanLine.startsWith('-')) {
            cleanLine = cleanLine.substring(1).trim(); 
        }
        if (cleanLine.length > 2) {
            listHTML += `<li>${cleanLine}</li>`;
        }
    });
    document.getElementById('modal-description-list').innerHTML = listHTML;

    // Images 
    let rawImages = row['Image Name'] ? String(row['Image Name']).trim() : '';
    let imagesArr = rawImages.split(',').map(url => url.trim()).filter(url => url !== '');
    currentGalleryId = `modal-gallery`;
    lightboxGalleries[currentGalleryId] = imagesArr;
    currentImageIndex = 0;
    
    if (imagesArr.length > 0) {
        document.getElementById('modal-main-img').src = imagesArr[0];
    } else {
        document.getElementById('modal-main-img').src = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80';
    }

    // Video & WhatsApp Links are KEPT!
    let videoLink = row['Video Link'] ? row['Video Link'].trim() : '';
    let videoHTML = '';
    if (videoLink) {
        let ytEmbed = getYouTubeEmbedUrl(videoLink);
        if (ytEmbed) {
            videoHTML = `<div class="video-container"><iframe src="${ytEmbed}" allowfullscreen></iframe></div>`;
        } else {
            videoHTML = `<a href="${videoLink}" class="video-btn" target="_blank">🎬 Watch Video Tour</a>`;
        }
    }
    document.getElementById('modal-video').innerHTML = videoHTML;
    document.getElementById('modal-whatsapp').href = `https://wa.me/60169242000?text=Hi%20Jong,%20I'm%20interested%20in%20${encodeURIComponent(title)}`;
    
    document.getElementById('property-modal').style.display = 'block';
}

function closeModal() { document.getElementById('property-modal').style.display = 'none'; }

function changeModalImage(direction) {
    let gallery = lightboxGalleries[currentGalleryId];
    if (!gallery || gallery.length === 0) return;
    currentImageIndex += direction;
    if (currentImageIndex >= gallery.length) currentImageIndex = 0;
    else if (currentImageIndex < 0) currentImageIndex = gallery.length - 1;
    document.getElementById('modal-main-img').src = gallery[currentImageIndex];
}

function openFullscreenImage() {
    let gallery = lightboxGalleries[currentGalleryId];
    if (gallery && gallery.length > 0) {
        document.getElementById('fullscreen-img').src = gallery[currentImageIndex];
        document.getElementById('fullscreen-zoom').style.display = 'block';
    }
}
function closeFullscreenImage() { document.getElementById('fullscreen-zoom').style.display = 'none'; }
