window.allPropertyData = [];
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
        window.allPropertyData = results.data;
        const data = results.data;
        allPropertiesData = data; 
        const grid = document.querySelector('.property-grid');
        grid.innerHTML = '';
        
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            spinner.style.display = 'none';
        }

        const uniqueAreas = new Set();
        const uniqueTypes = new Set();

        data.forEach((row, index) => {
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

            let statusText = 'FOR SALE';
            let statusClass = 'status-sale';
            if (status.includes('rent')) {
                statusText = 'FOR RENT';
                statusClass = 'status-rent';
            } else if (status.includes('sold')) {
                statusText = 'SOLD';
                statusClass = 'status-sold';
            }
            let statusBadgeHTML = `<div class="status-badge ${statusClass}">${statusText}</div>`;

            let desc = row['The Good (Pros)'] || '';
            let beds = row['Room'] || row['room'] || row['Bedrooms'] || '-';
            let baths = row['Toilet'] || row['toilet'] || row['Bathrooms'] || '-';
            
            if (beds === '-') {
                let bedMatch = desc.match(/(\d+)\s*Bedroom/i);
                if (bedMatch) beds = bedMatch[1];
            }
            if (baths === '-') {
                let bathMatch = desc.match(/(\d+)\s*Bathroom/i);
                if (bathMatch) baths = bathMatch[1];
            }
            let amenitiesHTML = `<div class="amenities-badge">🛏️ ${beds} &nbsp;|&nbsp; 🚿 ${baths}</div>`;

            // --- SMART IMAGE URL LOGIC ---
            let firstImage = row['Image Name'] ? row['Image Name'].split(',')[0].trim() : '';
            let finalImageUrl = firstImage;
            
            // If it's a short link like "photos/img.jpg", force the full URL
            if (firstImage && !firstImage.startsWith('http')) {
                finalImageUrl = 'https://jongks1234.github.io/JongExpressProperty/' + firstImage;
            }

            let cardHTML = `
            <div class="property-card clickable-card" data-status="${status}" data-type="${typeValue || 'all'}" data-area="${areaValue || 'all'}" data-project="${isProject}" onclick="openModal(${index})" style="display:flex; flex-direction:column; height:100%;">
                <div class="image-wrapper">
                    ${statusBadgeHTML}
                    ${badgeHTML}
                    ${amenitiesHTML}
                    <!-- Added onerror fallback image -->
                    <img src="${finalImageUrl}" alt="${row['Property Name']}" onerror="this.src='https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60';">
                </div>
                <div class="property-details">
                    <h3 class="price">${row['Price']}</h3>
                    <p style="font-size: 1.05rem; color: #4a5568; margin-bottom: 5px; font-weight: 500;">${row['Property Name']}</p>
                    <p style="color: #718096; font-size: 0.9rem; margin-bottom: 15px;">${row['Area'] ? row['Area'].trim() + ', Sarawak' : 'Miri, Sarawak'}</p>
                </div>
                <div style="padding: 0 20px 20px 20px; margin-top: auto;">
                    <button class="whatsapp-btn" style="width: 100%; border:none; cursor:pointer;">View Details</button>
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

        const urlParams = new URLSearchParams(window.location.search);
        const searchQuery = urlParams.get('q');
        if (searchQuery) {
            const searchBar = document.getElementById('searchBar');
            if (searchBar) searchBar.value = searchQuery;
        }

        filterProperties();

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
    
    const cards = document.querySelectorAll('.property-card');
    let matchedCount = 0;
    let visibleCount = 0;
    
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
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        } else {
            card.style.display = 'none';
        }
    });

    const visibleElem = document.getElementById('visible-count');
    const totalElem = document.getElementById('total-count');
    if (visibleElem && totalElem) {
        visibleElem.innerText = visibleCount;
        totalElem.innerText = matchedCount;
    }

    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.style.display = (matchedCount > currentLimit) ? 'block' : 'none';
    }

    const noResultsMsg = document.getElementById('no-results-message');
    if (noResultsMsg) {
        noResultsMsg.style.display = (matchedCount === 0) ? 'block' : 'none';
    }
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

    // --- SMART IMAGE URL FOR MODAL ---
    let mainImgRaw = row['Image Name'] ? row['Image Name'].trim().split(',')[0] : '';
    let mainImgUrl = mainImgRaw;
    if (mainImgRaw && !mainImgRaw.startsWith('http')) {
        mainImgUrl = 'https://jongks1234.github.io/JongExpressProperty/' + mainImgRaw;
    }
    if (!mainImgUrl) mainImgUrl = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80';
    
    document.getElementById('modal-main-img').src = mainImgUrl;
    
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
    
    // Call similar properties engine
    if (typeof renderSimilarProperties === "function") {
        renderSimilarProperties(row['Area'], row['Type'], title);
    }
}

function closeModal() { 
    document.getElementById('property-modal').style.display = 'none'; 
}

function openFullscreenImage() {
    let currentSrc = document.getElementById('modal-main-img').src;
    document.getElementById('fullscreen-img').src = currentSrc;
    document.getElementById('fullscreen-zoom').style.display = 'block';
}

function closeFullscreenImage() { 
    document.getElementById('fullscreen-zoom').style.display = 'none'; 
}

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

window.onclick = function(event) {
    let modal = document.getElementById('property-modal');
    let zoom = document.getElementById('fullscreen-zoom');
    if (event.target == modal) {
        closeModal();
    }
    if (event.target == zoom) {
        closeFullscreenImage();
    }
}

function clearAllFilters() {
    document.getElementById('searchBar').value = '';
    document.getElementById('statusFilter').value = 'all';
    document.getElementById('typeFilter').value = 'all';
    document.getElementById('areaFilter').value = 'all';
    
    currentMarket = 'all';
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => tab.classList.remove('active'));
    if(tabs.length > 0) tabs[0].classList.add('active'); 

    resetAndFilter();
}

function quickSearch(keyword) {
    const searchBar = document.getElementById('searchBar');
    if (!searchBar) return;
    searchBar.value = keyword;
    
    const newUrl = window.location.pathname + '?q=' + encodeURIComponent(keyword);
    window.history.replaceState(null, '', newUrl);
    
    resetAndFilter();
    document.querySelector('.property-grid').scrollIntoView({ behavior: 'smooth' });
}

function toggleChat() {
    const chatWindow = document.getElementById('chat-window');
    chatWindow.style.display = chatWindow.style.display === 'none' ? 'flex' : 'none';
}

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const msgText = input.value.trim();
    if (!msgText) return;

    const msgBox = document.getElementById('chat-messages');
    msgBox.innerHTML += `<div class="user-msg">${msgText}</div>`;
    input.value = '';
    msgBox.scrollTop = msgBox.scrollHeight;

    const typingId = 'typing-' + Date.now();
    msgBox.innerHTML += `<div id="${typingId}" class="bot-msg" style="font-style: italic; color: #a0aec0; background: transparent; border: 1px solid #e2e8f0;">🤖 Jong's AI is typing...</div>`;
    msgBox.scrollTop = msgBox.scrollHeight;

    const makeWebhookUrl = 'https://hook.eu1.make.com/dehy3kvt2y8tyecybk9vkpqrn330g45b';

    try {
        const response = await fetch(makeWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: msgText })
        });
        const data = await response.text(); 
        
        const typingElement = document.getElementById(typingId);
        if (typingElement) typingElement.remove();
        
        msgBox.innerHTML += `<div class="bot-msg">${data}</div>`;
        msgBox.scrollTop = msgBox.scrollHeight;
    } catch (error) {
        const typingElement = document.getElementById(typingId);
        if (typingElement) typingElement.remove();
        
        msgBox.innerHTML += `<div class="bot-msg">Sorry, the system is busy. Please WhatsApp Jong directly!</div>`;
    }
}

function renderSimilarProperties(currentArea, currentType, currentName) {
    const similarGrid = document.getElementById('similar-grid');
    const similarSection = document.getElementById('similar-properties-section');
    if (!similarGrid || !similarSection) return;
    
    similarGrid.innerHTML = ''; 
    let similarMatches = [];
    
    if (window.allPropertyData) {
        similarMatches = window.allPropertyData.filter(row => {
            if (!row['Property Name']) return false;
            if (row['Property Name'] === currentName) return false; 
            
            let rowArea = row['Area'] ? row['Area'].toLowerCase().trim() : '';
            let rowType = row['Type'] ? row['Type'].toLowerCase().trim() : '';
            
            return (rowArea === currentArea.toLowerCase() || rowType === currentType.toLowerCase());
        });
    }
    
    similarMatches = similarMatches.slice(0, 3);
    
    if (similarMatches.length === 0) {
        similarSection.style.display = 'none'; 
        return;
    }
    
    similarSection.style.display = 'block';
    
    similarMatches.forEach(row => {
        let rawImage = row['Image Name'] ? row['Image Name'].trim() : '';
        let simImgUrl = rawImage;
        if (rawImage && !rawImage.startsWith('http')) {
            simImgUrl = 'https://jongks1234.github.io/JongExpressProperty/' + rawImage;
        }

        let card = `
            <div style="min-width: 220px; max-width: 220px; background: #f7fafc; border-radius: 8px; overflow: hidden; box-shadow: 0 3px 6px rgba(0,0,0,0.1); flex-shrink: 0; border: 1px solid #e2e8f0;">
                <img src="${simImgUrl}" onerror="this.src='https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60';" style="width: 100%; height: 140px; object-fit: cover; background: #cbd5e0;">
                <div style="padding: 12px;">
                    <h4 style="font-size: 0.95rem; color: var(--primary); margin-bottom: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${row['Property Name']}</h4>
                    <p style="color: var(--secondary); font-weight: bold; font-size: 1rem; margin-bottom: 10px;">${row['Price']}</p>
                    <a href="https://wa.me/60169242000?text=Hi%20Jong,%20I'm%20interested%20in%20${encodeURIComponent(row['Property Name'])}" target="_blank" style="display: block; text-align: center; background: var(--primary); color: white; text-decoration: none; padding: 8px; border-radius: 4px; font-size: 0.85rem; font-weight: bold;">View Details</a>
                </div>
            </div>
        `;
        similarGrid.innerHTML += card;
    });
}
