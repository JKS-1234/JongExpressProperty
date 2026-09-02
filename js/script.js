const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSaVVVJKkYOYo7Gs1vXMme9mBWAEtQUGkFbB7wcL_n-IGGkFzzwvq2yxQgWKuhyZKe-J4tYza3yzLtO/pub?output=csv";
        
let currentLimit = 6;
let currentMarket = 'all'; // New variable to track the active tab

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

// Function to handle tab clicking
function setMarket(marketType, btnElement) {
    currentMarket = marketType;
    
    // Update the button colors
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

        data.forEach(row => {
            if(!row['Property Name']) return; 

            let details = row['The Good (Pros)'] ? row['The Good (Pros)'].replace(/\n/g, '<br>') : '';
            let status = row['Status'] ? row['Status'].toLowerCase().trim() : 'sale';
            
            let rawType = row['Type'] ? row['Type'].trim() : '';
            let typeValue = rawType.toLowerCase();
            
            let rawArea = row['Area'] ? row['Area'].trim() : '';
            let areaValue = rawArea.toLowerCase();

            if (rawType) uniqueTypes.add(rawType);
            if (rawArea) uniqueAreas.add(rawArea);

           // Determine if this is a Project or Sub-sale/Rent
            let isProject = (typeValue.includes('project') || typeValue.includes('developer')) ? 'true' : 'false';
            
            let badgeHTML = '';
            if (isProject === 'true') {
                badgeHTML = `<div class="badge-new">🏢 PROJECT</div>`;
            }

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
            
            // Clean title for the share function
            let safeTitle = row['Property Name'].replace(/'/g, "\\'");

            // We add data-project tag to the HTML so the filter knows what it is
            let cardHTML = `
            <div class="property-card" data-status="${status}" data-type="${typeValue || 'all'}" data-area="${areaValue || 'all'}" data-project="${isProject}">
                ${badgeHTML}
                <img src="${row['Image Name']}" alt="${row['Property Name']}">
                <div class="property-details">
                    <h3>${row['Property Name']}</h3>
                    <p class="price">${row['Price']}</p>
                    <div class="pros-cons">
                        <p class="pro" style="color: #1a365d;"><strong>✅ Details:</strong><br>${details}</p>
                    </div>
                    ${videoHTML}
                    <button class="share-btn" onclick="shareListing('${safeTitle}')">🔗 Share Listing</button>
                    <a href="https://wa.me/60169242000?text=Hi%20Jong,%20I'm%20interested%20in%20${encodeURIComponent(row['Property Name'])}" class="whatsapp-btn" target="_blank">Chat on WhatsApp</a>
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
        
        // Check if the card matches the clicked Tab
        const isProjectCard = card.getAttribute('data-project');
        const matchMarket = (currentMarket === 'all') || 
                            (currentMarket === 'project' && isProjectCard === 'true') || 
                            (currentMarket === 'subsale' && isProjectCard === 'false');
        
        const cardText = card.innerText.toLowerCase();
        const matchSearch = (searchVal === '' || cardText.includes(searchVal));
        
        if (matchStatus && matchType && matchArea && matchSearch && matchMarket) {
            matchedCount++;
            if (matchedCount <= currentLimit) {
                card.style.display = 'block';
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

// Function to handle the Share Button click
function shareListing(title) {
    if (navigator.share) {
        navigator.share({
            title: title,
            text: `Check out this property: ${title}`,
            url: window.location.href,
        }).catch((error) => console.log('Sharing failed', error));
    } else {
        // Fallback for older browsers
        navigator.clipboard.writeText(window.location.href);
        alert("Listing link copied to clipboard!");
    }
}
