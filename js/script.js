window.allPropertyData = [];
const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSaVVVJKkYOYo7Gs1vXMme9mBWAEtQUGkFbB7wcL_n-IGGkFzzwvq2yxQgWKuhyZKe-J4tYza3yzLtO/pub?output=csv";
        
let currentLimit = 6;
let currentMarket = 'all'; 

function getYouTubeEmbedUrl(url) {
    if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) return null;
    let regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    let match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
}

function setMarket(marketType, btnElement) {
    currentMarket = marketType;
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => tab.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    resetAndFilter();
}

Papa.parse(csvUrl, {
    download: true,
    header: true,
    complete: function(results) {
        window.allPropertyData = results.data;
        const data = results.data;
        const grid = document.querySelector('.property-grid');
        if (grid) grid.innerHTML = '';
        
        const uniqueAreas = new Set();
        const uniqueTypes = new Set();

        data.forEach((row) => {
            if(!row['Property Name']) return; 

            let status = row['Status'] ? row['Status'].toLowerCase().trim() : 'sale';
            let rawType = row['Type'] ? row['Type'].trim() : '';
            let typeValue = rawType.toLowerCase();
            let rawArea = row['Area'] ? row['Area'].trim() : '';
            let areaValue = rawArea.toLowerCase();

            if (rawType) uniqueTypes.add(rawType);
            if (rawArea) uniqueAreas.add(rawArea);

            let isProject = (typeValue.includes('project') || typeValue.includes('developer')) ? 'true' : 'false';
            
            let badgeHTML = '';
            if (isProject === 'true') {
                badgeHTML = `<div class="badge-new">🏢 PROJECT</div>`;
            }

            // Fallback Image Logic to Prevent Broken Photos
            let rawImage = row['Image Name'] ? String(row['Image Name']).trim() : '';
            let finalImage = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80';
            if (rawImage) {
                finalImage = rawImage.includes(',') ? rawImage.split(',')[0].trim() : rawImage;
            }

            let details = row['The Good (Pros)'] ? String(row['The Good (Pros)']).replace(/\n/g, '<br>') : 'Contact for more details.';

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

            let cardHTML = `
            <div class="property-card" data-status="${status}" data-type="${typeValue || 'all'}" data-area="${areaValue || 'all'}" data-project="${isProject}">
                ${badgeHTML}
                <img src="${finalImage}" alt="${row['Property Name']}" onerror="this.src='https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80';">
                <div class="property-details">
                    <h3>${row['Property Name']}</h3>
                    <p class="price">${row['Price']}</p>
                    <div class="pros-cons">
                        <p class="pro" style="color: #1a365d;"><strong>✅ Details:</strong><br>${details}</p>
                    </div>
                    ${videoHTML}
                    <a href="https://wa.me/60169242000?text=Hi%20Jong,%20I'm%20interested%20in%20${encodeURIComponent(row['Property Name'])}" class="whatsapp-btn" target="_blank">💬 Chat on WhatsApp</a>
                </div>
            </div>
            `;
            if (grid) grid.innerHTML += cardHTML;
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

        const urlParams = new URLSearchParams(window.location.search);
        const searchQuery = urlParams.get('q');
        if (searchQuery) {
            const searchBar = document.getElementById('searchBar');
            if (searchBar) searchBar.value = searchQuery;
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
        loadMoreBtn.style.display = (matchedCount > currentLimit) ? 'block' : 'none';
    }
}

function resetAndFilter() { currentLimit = 6; filterProperties(); }
function showMoreListings() { currentLimit += 6; filterProperties(); }

// --- Quick Search Links ---
function quickSearch(keyword) {
    const searchBar = document.getElementById('searchBar');
    if (!searchBar) return;
    searchBar.value = keyword;
    const newUrl = window.location.pathname + '?q=' + encodeURIComponent(keyword);
    window.history.replaceState(null, '', newUrl);
    resetAndFilter();
}

// --- Smart Mobile Header Logic ---
let lastScrollTop = 0;
const header = document.querySelector('header');

if (header) {
    window.addEventListener('scroll', function() {
        let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        let scrollHeight = document.documentElement.scrollHeight;
        let clientHeight = document.documentElement.clientHeight;
        
        if (scrollHeight > clientHeight + 100) {
            if (scrollTop > lastScrollTop && scrollTop > 60) {
                header.classList.add('header-hidden');
            } else {
                header.classList.remove('header-hidden');
            }
        }
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop; 
    }, false);
}
