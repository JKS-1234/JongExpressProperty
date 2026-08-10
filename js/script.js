const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSaVVVJKkYOYo7Gs1vXMme9mBWAEtQUGkFbB7wcL_n-IGGkFzzwvq2yxQgWKuhyZKe-J4tYza3yzLtO/pub?output=csv";
        
let currentLimit = 6;
let currentMarket = 'all'; 
let allProperties = []; // New variable to store the fetched data

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

// Helper function to turn price strings (e.g., "RM 500,000") into numbers for sorting
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
        // Store the valid rows in our global array
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
    // Added Error Handling here
    error: function(error) {
        const grid = document.querySelector('.property-grid');
        grid.innerHTML = '<h3 style="text-align:center; width: 100%; color:#e53e3e;">Failed to load properties. Please try again later.</h3>';
        console.error("Error fetching data:", error);
    }
});

function filterProperties() {
    const statusVal = document.getElementById('statusFilter') ? document.getElementById('statusFilter').value : 'all';
    const typeVal = document.getElementById('typeFilter') ? document.getElementById('typeFilter').value : 'all';
    const areaVal = document.getElementById('areaFilter') ? document.getElementById('areaFilter').value : 'all';
    const searchVal = document.getElementById('searchBar') ? document.getElementById('searchBar').value.toLowerCase().trim() : '';
    const sortVal = document.getElementById('sortPriceFilter') ? document.getElementById('sortPriceFilter').value : 'default';
    
    // 1. Filter the data array
    let filteredData = allProperties.filter(row => {
        let status = row['Status'] ? row['Status'].toLowerCase().trim() : 'sale';
        let typeValue = row['Type'] ? row['Type'].trim().toLowerCase() : '';
        let areaValue = row['Area'] ? row['Area'].trim().toLowerCase() : '';
        
        let isProject = (typeValue.includes('project') || typeValue.includes('developer'));
        
        const matchStatus = (statusVal === 'all' || status === statusVal);
        const matchType = (typeVal === 'all' || typeValue === typeVal);
        const matchArea = (areaVal === 'all' || areaValue === areaVal);
        
        const matchMarket = (currentMarket === 'all') || 
                            (currentMarket === 'project' && isProject) || 
                            (currentMarket === 'subsale' && !isProject);
        
        // Combine row values to allow search across multiple columns
        const rowText = Object.values(row).join(' ').toLowerCase();
        const matchSearch = (searchVal === '' || rowText.includes(searchVal));
        
        return matchStatus && matchType && matchArea && matchSearch && matchMarket;
    });

    // 2. Sort the data array if needed
    if (sortVal === 'lowToHigh') {
        filteredData.sort((a, b) => parsePrice(a['Price']) - parsePrice(b['Price']));
    } else if (sortVal === 'highToLow') {
        filteredData.sort((a, b) => parsePrice(b['Price']) - parsePrice(a['Price']));
    }

    // 3. Render the HTML (Optimized DOM Manipulation)
    const grid = document.querySelector('.property-grid');
    let allCardsHTML = '';
    
    if (filteredData.length === 0) {
        // Added No Results State here
        allCardsHTML = '<div class="no-results-msg" style="width:100%; text-align:center; padding:40px 20px; color:var(--primary); font-size:1.2rem;">No properties found matching your criteria. Try adjusting your filters!</div>';
    } else {
        // Only loop up to the current limit
        const propertiesToShow = filteredData.slice(0, currentLimit);
        
        propertiesToShow.forEach(row => {
            let details = row['The Good (Pros)'] ? row['The Good (Pros)'].replace(/\n/g, '<br>') : '';
            let typeValue = row['Type'] ? row['Type'].trim().toLowerCase() : '';
            let isProject = (typeValue.includes('project') || typeValue.includes('developer'));
            
            let badgeHTML = isProject ? `<div class="badge-new">🏢 PROJECT</div>` : '';
            
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

            // Added loading="lazy" to the image tag
            allCardsHTML += `
            <div class="property-card">
                ${badgeHTML}
                <img src="${row['Image Name']}" alt="${row['Property Name']}" loading="lazy">
                <div class="property-details">
                    <h3>${row['Property Name']}</h3>
                    <p class="price">${row['Price']}</p>
                    <div class="pros-cons">
                        <p class="pro" style="color: #1a365d;"><strong>✅ Details:</strong><br>${details}</p>
                    </div>
                    ${videoHTML}
                    <a href="https://wa.me/60169242000?text=Hi%20Jong,%20I'm%20interested%20in%20${encodeURIComponent(row['Property Name'])}" class="whatsapp-btn" target="_blank">Chat on WhatsApp</a>
                </div>
            </div>`;
        });
    }

    grid.innerHTML = allCardsHTML;

    // Show/Hide Load More Button
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
