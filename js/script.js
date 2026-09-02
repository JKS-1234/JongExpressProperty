const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSaVVVJKkYOYo7Gs1vXMme9mBWAEtQUGkFbB7wcL_n-IGGkFzzwvq2yxQgWKuhyZKe-J4tYza3yzLtO/pub?output=csv";
        
let currentLimit = 6;
let currentMarket = 'all'; 
let allPropertiesData = []; 

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
        allPropertiesData = results.data.filter(row => row['Property Name']);
        
        const uniqueAreas = new Set();
        const uniqueTypes = new Set();

        allPropertiesData.forEach(row => {
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
        filterProperties();

        // Open specific property if URL parameter is present
        const urlParams = new URLSearchParams(window.location.search);
        const sharedPropertyId = urlParams.get('p');
        if (sharedPropertyId !== null && allPropertiesData[sharedPropertyId]) {
            openModal(sharedPropertyId);
        }
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
        const matchMarket = (currentMarket === 'all') || (currentMarket === 'project' && isProject) || (currentMarket === 'subsale' && !isProject);
        const rowText = Object.values(row).join(' ').toLowerCase();
        
        return (statusVal === 'all' || status === statusVal) && 
               (typeVal === 'all' || typeValue === typeVal) && 
               (areaVal === 'all' || areaValue === areaVal) && 
               (searchVal === '' || rowText.includes(searchVal)) && matchMarket;
    });

    const grid = document.querySelector('.property-grid');
    if (!grid) return;
    
    let allCardsHTML = '';
    if (filteredData.length === 0) {
        allCardsHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px 0;">No properties found.</div>';
    } else {
        filteredData.slice(0, currentLimit).forEach((row) => {
            let globalIndex = allPropertiesData.indexOf(row); 
            let title = row['Property Name'] || '';
            let address = row['Area'] ? `${row['Area'].trim()}, Sarawak` : 'Miri, Sarawak';
            let badgeHTML = String(row['Type']).toLowerCase().includes('project') ? `<div class="badge-new">🏢 PROJECT</div>` : '';
            let priceStr = row['Price'] ? String(row['Price']).trim() : 'Price on Request';
            
            let firstImage = row['Image Name'] ? row['Image Name'].trim().split(',')[0] : 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80';

            allCardsHTML += `
            <div class="property-card clickable-card" style="display:flex; flex-direction:column; height:100%;" onclick="openModal(${globalIndex})">
                ${badgeHTML}
                <img src="${firstImage}" alt="${title}">
                <div style="padding: 20px;">
                    <h3 class="price">${priceStr}</h3>
                    <p style="font-size: 1.05rem; color: #4a5568; margin-bottom: 5px; font-weight: 500;">${title}</p>
                    <p style="color: #718096; font-size: 0.9rem; margin-bottom: 15px;">${address}</p>
                </div>
                <div style="padding: 0 20px 20px 20px; margin-top: auto;">
                    <button class="whatsapp-btn" style="width: 100%; border:none; cursor:pointer;">View Details</button>
                </div>
            </div>`;
        });
    }
    grid.innerHTML = allCardsHTML;
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) loadMoreBtn.style.display = (filteredData.length > currentLimit) ? 'block' : 'none';
}

function resetAndFilter() { currentLimit = 6; filterProperties(); }
function showMoreListings() { currentLimit += 6; filterProperties(); }

function openModal(index) {
    let row = allPropertiesData[index];
    if(!row) return;

    let title = row['Property Name'];
    let address = row['Area'] ? `${row['Area'].trim()}, Sarawak` : 'Miri, Sarawak';
    let typeValue = row['Type'] ? row['Type'].trim() : 'Property';
    let priceStr = row['Price'] ? String(row['Price']).trim() : 'Price on Request';
    let rawDesc = row['The Good (Pros)'] ? String(row['The Good (Pros)']) : '';
    
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-address').innerText = address;
    document.getElementById('modal-price').innerText = priceStr;
    
    let furnishingMatch = rawDesc.match(/(fully furnished|partially furnished|partly furnished|unfurnished)/i);
    let furnishing = furnishingMatch ? furnishingMatch[1].replace(/(^\w|\s\w)/g, m => m.toUpperCase()) : 'Unspecified';
    document.getElementById('modal-details-checkmarks').innerHTML = `<div class="detail-item-check">${typeValue}</div><div class="detail-item-check">${furnishing}</div>`;
    
    let listHTML = '';
    rawDesc.split('\n').forEach(line => {
        let cleanLine = line.trim();
        if (cleanLine.startsWith('-')) cleanLine = cleanLine.substring(1).trim(); 
        if (cleanLine.length > 2) listHTML += `<li>${cleanLine}</li>`;
    });
    document.getElementById('modal-description-list').innerHTML = listHTML;

    let mainImg = row['Image Name'] ? row['Image Name'].trim().split(',')[0] : 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80';
    document.getElementById('modal-main-img').src = mainImg;
    
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
    
    document.getElementById('modal-share-btn').onclick = function() {
        shareListing(title, index);
    };

    document.getElementById('property-modal').style.display = 'block';
}

function closeModal() { document.getElementById('property-modal').style.display = 'none'; }

function openFullscreenImage() {
    let currentSrc = document.getElementById('modal-main-img').src;
    document.getElementById('fullscreen-img').src = currentSrc;
    document.getElementById('fullscreen-zoom').style.display = 'block';
}
function closeFullscreenImage() { document.getElementById('fullscreen-zoom').style.display = 'none'; }

function shareListing(title, index) {
    const propertyUrl = window.location.origin + window.location.pathname + '?p=' + index;
    
    if (navigator.share) {
        navigator.share({
            title: title,
            text: `Check out this property listing: ${title}`,
            url: propertyUrl,
        }).catch((error) => console.log('Sharing failed', error));
    } else {
        navigator.clipboard.writeText(propertyUrl);
        alert("Listing link copied to clipboard!\n" + propertyUrl);
    }
}
