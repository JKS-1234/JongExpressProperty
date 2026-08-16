const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSaVVVJKkYOYo7Gs1vXMme9mBWAEtQUGkFbB7wcL_n-IGGkFzzwvq2yxQgWKuhyZKe-J4tYza3yzLtO/pub?output=csv";
        
let currentLimit = 6;
let currentMarket = 'all'; 
let allProperties = []; 

// --- 1. SEO SLUG HELPER ---
function slugify(text) {
    return text.toString().toLowerCase()
      .replace(/\s+/g, '-')           
      .replace(/[^\w\-]+/g, '')       
      .replace(/\-\-+/g, '-')         
      .replace(/^-+/, '')             
      .replace(/-+$/, '');            
}

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

        // --- 2. NEW SEO ROUTING LOGIC ---
        const urlParams = new URLSearchParams(window.location.search);
        const propertySlug = urlParams.get('property');

        if (propertySlug) {
            renderSingleProperty(propertySlug);
        } else {
            filterProperties();
        }
    }
});

// --- 3. SINGLE PROPERTY VIEW & DYNAMIC META TAGS ---
function renderSingleProperty(slug) {
    const property = allProperties.find(row => slugify(row['Property Name']) === slug);
    const grid = document.querySelector('.property-grid');
    
    if (!grid) return;

    if (!property) {
        grid.innerHTML = '<h3 style="text-align:center; width:100%; padding:40px;">Property not found. <a href="listing.html" style="color:var(--secondary);">Return to listings</a></h3>';
        return;
    }

    // Dynamic SEO Upgrade for Googlebot & Tab Title
    document.title = `${property['Property Name']} | Jong Express Property`;
    let metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
        metaDesc.setAttribute("content", `For Sale/Rent: ${property['Property Name']} located in ${property['Area']}. Price: ${property['Price']}. 100% verified property listing in Miri.`);
    }

    // Hide search filters and load more button for single view
    const searchWrapper = document.querySelector('.search-filter-wrapper');
    if (searchWrapper) searchWrapper.style.display = 'none';
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) loadMoreBtn.style.display = 'none';

    allProperties = [property]; 
    filterProperties(); 
}

function filterProperties() {
    const statusVal = document.getElementById('statusFilter') ? document.getElementById('statusFilter').value : 'all';
    const typeVal = document.getElementById('typeFilter') ? document.getElementById('typeFilter').value : 'all';
    const areaVal = document.getElementById('areaFilter') ? document.getElementById('areaFilter').value : 'all';
    const searchVal = document.getElementById('searchBar') ? document.getElementById('searchBar').value.toLowerCase().trim() : '';
    
    const grid = document.querySelector('.property-grid');
    if (!grid) return;
    grid.innerHTML = '';

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
        
        const rowText = Object.values(row).join(' ').toLowerCase();
        const matchSearch = (searchVal === '' || rowText.includes(searchVal));
        
        return matchStatus && matchType && matchArea && matchSearch && matchMarket;
    });

    let matchedCount = filteredData.length;
    let propertiesToShow = filteredData.slice(0, currentLimit);
    let allCardsHTML = '';

    if (matchedCount === 0) {
        allCardsHTML = '<div class="no-results-msg" style="width:100%; text-align:center; padding:40px;">No properties found matching your criteria.</div>';
    } else {
        propertiesToShow.forEach(row => {
            let title = row['Property Name'] || '';
            let details = row['The Good (Pros)'] ? row['The Good (Pros)'].replace(/\n/g, '<br>') : '';
            let rawType = row['Type'] ? row['Type'].trim().toLowerCase() : '';
            let isProject = (rawType.includes('project') || rawType.includes('developer'));
            
            let badgeHTML = isProject ? `<div class="badge-new">🏢 PROJECT</div>` : '';

            let videoLink = row['Video Link'] ? row['Video Link'].trim() : '';
            let videoHTML = '';

            if (videoLink) {
                let ytEmbed = getYouTubeEmbedUrl(videoLink);
                if (ytEmbed) {
                    videoHTML = `
                    <div class="video-container">
                        <iframe src="${ytEmbed}" allowfullscreen></iframe>
                    </div>`;
                } else {
                    videoHTML = `<a href="${videoLink}" class="video-btn" target="_blank">🎬 Watch Video Tour</a>`;
                }
            }

            // --- 4. SEO-FRIENDLY HYPERLINKED TITLES ---
            let titleSlug = slugify(title);
            let propertyUrl = `listing.html?property=${titleSlug}`;

            allCardsHTML += `
            <div class="property-card">
                ${badgeHTML}
                <img src="${row['Image Name']}" alt="${title}">
                <div class="property-details">
                    <h3><a href="${propertyUrl}" style="color: inherit; text-decoration: none;">${title}</a></h3>
                    <p class="price">${row['Price']}</p>
                    <div class="pros-cons">
                        <p class="pro" style="color: #1a365d;"><strong>✅ Details:</strong><br>${details}</p>
                    </div>
                    ${videoHTML}
                    <a href="https://wa.me/60169242000?text=Hi%20Jong,%20I'm%20interested%20in%20${encodeURIComponent(title)}" class="whatsapp-btn" target="_blank">Chat on WhatsApp</a>
                </div>
            </div>
            `;
        });
    }

    grid.innerHTML = allCardsHTML;

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
