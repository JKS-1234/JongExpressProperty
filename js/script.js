const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSaVVVJKkYOYo7Gs1vXMme9mBWAEtQUGkFbB7wcL_n-IGGkFzzwvq2yxQgWKuhyZKe-J4tYza3yzLtO/pub?output=csv";
        
let currentLimit = 6;
let currentMarket = 'all'; 
let allProperties = []; 

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
        filterProperties();
    },
    error: function(error) {
        const grid = document.querySelector('.property-grid');
        if (grid) grid.innerHTML = '<h3 style="text-align:center; width:100%; color:#e53e3e;">Failed to load properties.</h3>';
        console.error("Error fetching data:", error);
    }
});

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
    let allCardsHTML = '';
    
    if (filteredData.length === 0) {
        allCardsHTML = '<div class="no-results-msg">No properties found matching your criteria.</div>';
    } else {
        const propertiesToShow = filteredData.slice(0, currentLimit);
        
        propertiesToShow.forEach(row => {
            let title = row['Property Name'] || '';
            let price = row['Price'] || '';
            let details = row['The Good (Pros)'] ? row['The Good (Pros)'].replace(/\n/g, '<br>') : '';
            let typeValue = row['Type'] ? row['Type'].trim() : '';
            let isProject = (typeValue.toLowerCase().includes('project') || typeValue.toLowerCase().includes('developer'));
            
            let badgeHTML = isProject ? `<div class="badge-new">🏢 PROJECT</div>` : '';
            
            // --- 1. NEW MULTIPLE IMAGE SLIDER LOGIC ---
            let rawImages = row['Image Name'] ? row['Image Name'].trim() : '';
            let imagesArr = rawImages.split(',').map(url => url.trim()).filter(url => url !== '');
            
            let sliderHTML = `<div class="image-slider-container"><div class="image-slider">`;
            if (imagesArr.length > 0) {
                imagesArr.forEach(imgUrl => {
                    sliderHTML += `<img src="${imgUrl}" alt="${title}" loading="lazy" class="slider-img">`;
                });
            } else {
                sliderHTML += `<div style="height: 240px; width: 100%; background: #e2e8f0; display:flex; align-items:center; justify-content:center;">No Image</div>`;
            }
            sliderHTML += `</div>`;
            
            // Show a swipe hint if there is more than 1 image
            if (imagesArr.length > 1) {
                sliderHTML += `<div class="swipe-hint">📸 1 / ${imagesArr.length} (Swipe)</div>`;
            }
            sliderHTML += `</div>`;

            // --- 2. Video Link Logic ---
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

            // --- Assemble Card ---
            allCardsHTML += `
            <div class="property-card">
                ${badgeHTML}
                
                ${sliderHTML} <!-- Injects the new image slider here -->
                
                <div class="property-details">
                    <h3>${title}</h3>
                    <p class="price" style="font-size: 1.2rem; font-weight: bold; color: var(--secondary); margin-bottom: 15px;">${price}</p>
                    
                    <div class="pros-cons">
                        <strong>📌 Summary:</strong><br>${details}
                    </div>
                    
                    ${videoHTML}
                    
                    <a href="https://wa.me/60169242000?text=Hi%20Jong,%20I'm%20interested%20in%20${encodeURIComponent(title)}" class="whatsapp-btn" target="_blank">Chat on WhatsApp</a>
                </div>
            </div>`;
        });
    }

    if (grid) grid.innerHTML = allCardsHTML;

    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.style.display = (filteredData.length > currentLimit) ? 'block' : 'none';
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
