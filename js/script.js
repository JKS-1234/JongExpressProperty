const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSaVVVJKkYOYo7Gs1vXMme9mBWAEtQUGkFbB7wcL_n-IGGkFzzwvq2yxQgWKuhyZKe-J4tYza3yzLtO/pub?output=csv";
        
let currentLimit = 6;
let currentMarket = 'all'; 
let allProperties = [];

function setMarket(marketType, btnElement) {
    currentMarket = marketType;
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => tab.classList.remove('active'));
    btnElement.classList.add('active');
    resetAndFilter();
}

// Only fetch CSV if we are on the listing page
if(document.querySelector('.property-grid')) {
    Papa.parse(csvUrl, {
        download: true,
        header: true,
        complete: function(results) {
            allProperties = results.data;
            const uniqueAreas = new Set();
            const uniqueTypes = new Set();

            allProperties.forEach(row => {
                if(!row['Property Name']) return;
                let rawType = row['Type'] ? row['Type'].trim() : '';
                let rawArea = row['Area'] ? row['Area'].trim() : '';
                if (rawType) uniqueTypes.add(rawType);
                if (rawArea) uniqueAreas.add(rawArea);
            });

            const typeFilter = document.getElementById('typeFilter');
            if (typeFilter) {
                Array.from(uniqueTypes).sort().forEach(typeName => {
                    typeFilter.innerHTML += `<option value="${typeName.toLowerCase()}">${typeName}</option>`;
                });
            }

            const areaFilter = document.getElementById('areaFilter');
            if (areaFilter) {
                Array.from(uniqueAreas).sort().forEach(areaName => {
                    areaFilter.innerHTML += `<option value="${areaName.toLowerCase()}">${areaName}</option>`;
                });
            }

            filterProperties();
        }
    });
}

function filterProperties() {
    const statusVal = document.getElementById('statusFilter') ? document.getElementById('statusFilter').value : 'all';
    const typeVal = document.getElementById('typeFilter') ? document.getElementById('typeFilter').value : 'all';
    const areaVal = document.getElementById('areaFilter') ? document.getElementById('areaFilter').value : 'all';
    const searchVal = document.getElementById('searchBar') ? document.getElementById('searchBar').value.toLowerCase().trim() : '';
    
    let filteredData = allProperties.filter(row => {
        if(!row['Property Name']) return false;
        
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

    const grid = document.querySelector('.property-grid');
    let allCardsHTML = '';

    if (filteredData.length === 0) {
        allCardsHTML = '<h3 style="grid-column: 1/-1; text-align:center;">No properties found.</h3>';
    } else {
        const propertiesToShow = filteredData.slice(0, currentLimit);
        
        propertiesToShow.forEach((row) => {
            let title = row['Property Name'] || '';
            let details = row['The Good (Pros)'] ? row['The Good (Pros)'].replace(/\n/g, '<br>') : '';
            let typeValue = row['Type'] ? row['Type'].trim() : '';
            let isProject = (typeValue.toLowerCase().includes('project') || typeValue.toLowerCase().includes('developer'));
            let badgeHTML = isProject ? `<div class="badge-new">🏢 PROJECT</div>` : '';
            
            // Image handling with Fallback
            let imgSource = row['Image Name'] ? row['Image Name'].trim() : '';
            
            // FIX: Added onclick action for Preview Mode
            allCardsHTML += `
            <div class="property-card">
                ${badgeHTML}
                <img src="${imgSource}" alt="${title}" onclick="openPreview('${imgSource}')">
                <div class="property-details">
                    <h3>${title}</h3>
                    <p class="price">${row['Price']}</p>
                    <div class="pros-cons">
                        <p class="pro"><strong>✅ Details:</strong><br>${details}</p>
                    </div>
                    <a href="https://wa.me/60169242000?text=Hi%20Jong,%20I'm%20interested%20in%20${encodeURIComponent(title)}" class="whatsapp-btn" target="_blank">Chat on WhatsApp</a>
                </div>
            </div>`;
        });
    }

    // FIX: Using innerHTML once removes the double-loading bug completely
    grid.innerHTML = allCardsHTML;

    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.style.display = (filteredData.length > currentLimit) ? 'block' : 'none';
    }
}

// FIX: Functions to handle the Image Preview Popup
function openPreview(imgUrl) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    if (lightbox && lightboxImg) {
        lightboxImg.src = imgUrl;
        lightbox.style.display = 'block';
    }
}

function closePreview() {
    const lightbox = document.getElementById('lightbox');
    if (lightbox) lightbox.style.display = 'none';
}

function resetAndFilter() {
    currentLimit = 6;
    filterProperties();
}
function showMoreListings() {
    currentLimit += 6;
    filterProperties();
}
