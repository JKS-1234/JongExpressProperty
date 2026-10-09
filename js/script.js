window.allPropertyData = [];
const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSaVVVJKkYOYo7Gs1vXMme9mBWAEtQUGkFbB7wcL_n-IGGkFzzwvq2yxQgWKuhyZKe-J4tYza3yzLtO/pub?output=csv";
        
let currentLimit = 6;
let currentMarket = 'all'; 
let allPropertiesData = []; 

// Serve listing photos from this domain instead of hotlinking raw.githubusercontent.com
function localPhoto(url) {
    const u = String(url || '').trim();
    const m = u.match(/^https:\/\/raw\.githubusercontent\.com\/JKS-1234\/JongExpressProperty\/[^/]+\/photos\/(.+)$/);
    return m ? `photos/${m[1].replace(/:/g, '-')}` : u;
}

function slugify(value = '') {
    return String(value)
        .normalize('NFKC')
        .toLowerCase()
        .trim()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'property';
}

function getPropertyPageUrl(title) {
    const safeTitle = String(title || 'property').trim() || 'property';
    return `https://jongexpressproperty.online/property/${slugify(safeTitle)}`;
}

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
        
        // Safety check added so it doesn't crash if the spinner is missing
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
            
            // 1. Dynamic Project Badge (Emoji fixed)
            let badgeHTML = '';
            if (isProject === 'true') {
                badgeHTML = `<div class="badge-new">🏢 PROJECT</div>`;
            }

            // 2. Dynamic Status Badge (Sale, Rent, Sold)
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

            // 3. Extract Bedrooms & Bathrooms (Emojis fixed)
            let desc = row['The Good (Pros)'] || '';
            let beds = row['Room'] || row['room'] || row['Bedrooms'] || '-';
            let baths = row['Toilet'] || row['toilet'] || row['Bathrooms'] || '-';
            
            // Fallback to reading the description text if columns are empty
            if (beds === '-') {
                let bedMatch = desc.match(/(\d+)\s*Bedroom/i);
                if (bedMatch) beds = bedMatch[1];
            }
            if (baths === '-') {
                let bathMatch = desc.match(/(\d+)\s*Bathroom/i);
                if (bathMatch) baths = bathMatch[1];
            }
            let amenitiesHTML = `<div class="amenities-badge">🛏️ ${beds} &nbsp;|&nbsp; 🚿 ${baths}</div>`;

            let firstImage = row['Image Name'] ? localPhoto(row['Image Name'].split(',')[0]) : '';

            // Clean card HTML integrating the new badges
            let cardHTML = `
            <div class="property-card clickable-card" data-status="${status}" data-type="${typeValue || 'all'}" data-area="${areaValue || 'all'}" data-project="${isProject}" onclick="openModal(${index})">
                <div class="image-wrapper">
                    ${statusBadgeHTML}
                    ${badgeHTML}
                    ${amenitiesHTML}
                    <img src="${firstImage}" alt="${row['Property Name']}" loading="lazy" decoding="async">
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

        // Auto-search if someone shares a link with ?q=Keyword
        const urlParams = new URLSearchParams(window.location.search);
        const searchQuery = urlParams.get('q');
        if (searchQuery) {
            const searchBar = document.getElementById('searchBar');
            if (searchBar) searchBar.value = searchQuery;
        }

        filterProperties();

        // Check if someone shared a specific property link to open the modal
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

    // Update the iProperty-style counter (e.g. "Showing 4 of 28 properties")
    const visibleElem = document.getElementById('visible-count');
    const totalElem = document.getElementById('total-count');
    if (visibleElem && totalElem) {
        visibleElem.innerText = visibleCount;
        totalElem.innerText = matchedCount;
    }

    // Toggle the "Load More" button
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.style.display = (matchedCount > currentLimit) ? 'block' : 'none';
    }

    // Toggle "No Results" message
    const noResultsMsg = document.getElementById('no-results-message');
    if (noResultsMsg) {
        noResultsMsg.style.display = (matchedCount === 0) ? 'block' : 'none';
    }
}

function resetAndFilter() { currentLimit = 6; filterProperties(); }
function showMoreListings() { currentLimit += 6; filterProperties(); }

// --- Detail Modal Functions Restored ---
function openModal(index) {
    let row = allPropertiesData[index];
    if(!row) return;

    let title = row['Property Name'];
    let address = row['Area'] ? `${row['Area'].trim()}, Sarawak` : 'Miri, Sarawak';
    let typeValue = row['Type'] ? row['Type'].trim() : 'Property';
    let priceStr = row['Price'] ? String(row['Price']).trim() : 'Price on Request';
    let rawDesc = row['The Good (Pros)'] ? String(row['The Good (Pros)']) : '';
    let mainImg = row['Image Name'] ? localPhoto(row['Image Name'].split(',')[0]) : 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80';
    
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

    // Enhanced WhatsApp message with property details
    const whatsappMessage = `Hi Jong, I'm interested in this property:\n\n📍 ${title}\n💰 ${priceStr}\n📍 ${address}\n\nPlease tell me more details and arrange a viewing!`;
    document.getElementById('modal-whatsapp').href = `https://wa.me/60169242000?text=${encodeURIComponent(whatsappMessage)}`;
    
    document.getElementById('modal-share-btn').onclick = function() {
        shareListing(title, index, priceStr, address);
    };

    // Trigger the similar properties engine
    renderSimilarProperties(row['Area'] || 'Miri', row['Type'] || 'Property', title);

    document.getElementById('property-modal').style.display = 'block';
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

// Enhanced share function that opens WhatsApp with property details
function shareListing(title, index, price, address) {
    // Primary method: Share via native Web Share API with WhatsApp fallback
    const propertyUrl = getPropertyPageUrl(title);
    const shareMessage = `Check out this property listing!\n\n📍 ${title}\n💰 ${price}\n📍 ${address}\n\n🔗 ${propertyUrl}`;
    
    if (navigator.share) {
        // Use native share (includes WhatsApp option on mobile)
        navigator.share({
            title: title,
            text: shareMessage,
            url: propertyUrl,
        }).catch((error) => {
            // If share cancelled, fall back to WhatsApp
            fallbackShareToWhatsApp(shareMessage);
        });
    } else {
        // No native share API: open WhatsApp directly
        fallbackShareToWhatsApp(shareMessage);
    }
}

// Fallback function to share directly to WhatsApp
function fallbackShareToWhatsApp(message) {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

// Click outside overlay listener
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

// Resets all search bars and dropdowns, then reloads the grid
function clearAllFilters() {
    // Reset the text and dropdowns
    document.getElementById('searchBar').value = '';
    document.getElementById('statusFilter').value = 'all';
    document.getElementById('typeFilter').value = 'all';
    document.getElementById('areaFilter').value = 'all';
    
    // Resets the top market tabs back to "All Listings"
    currentMarket = 'all';
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => tab.classList.remove('active'));
    if(tabs.length > 0) tabs[0].classList.add('active'); 

    // Run the filter function to show all properties again
    resetAndFilter();
}

// Function for one-click tag searches (e.g. clicking 'Pujut')
function quickSearch(keyword) {
    const searchBar = document.getElementById('searchBar');
    if (!searchBar) return;
    searchBar.value = keyword;
    
    // Also update the browser URL query so people can share the search link!
    const newUrl = window.location.pathname + '?q=' + encodeURIComponent(keyword);
    window.history.replaceState(null, '', newUrl);
    
    resetAndFilter();

    // Smooth scroll straight down to the results
    document.querySelector('.property-grid').scrollIntoView({ behavior: 'smooth' });
}

// --- Custom AI Chatbot Logic ---
function toggleChat() {
    const chatWindow = document.getElementById('chat-window');
    chatWindow.style.display = chatWindow.style.display === 'none' ? 'flex' : 'none';
}

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const msgText = input.value.trim();
    if (!msgText) return;

    const msgBox = document.getElementById('chat-messages');
    
    // 1. Instantly display the user's message
    msgBox.innerHTML += `<div class="user-msg">${msgText}</div>`;
    input.value = '';
    msgBox.scrollTop = msgBox.scrollHeight;

    // 2. Instantly display the "Typing..." animation
    const typingId = 'typing-' + Date.now();
    msgBox.innerHTML += `<div id="${typingId}" class="bot-msg" style="font-style: italic; color: #a0aec0; background: transparent; border: 1px solid #e2e8f0;">🤖 Jong's AI is typing...</div>`;
    msgBox.scrollTop = msgBox.scrollHeight;

    // YOUR MAKE.COM WEBHOOK URL:
    const makeWebhookUrl = 'https://hook.eu1.make.com/dehy3kvt2y8tyecybk9vkpqrn330g45b';

    try {
        const response = await fetch(makeWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: msgText })
        });
        const data = await response.text(); 
        
        // 3. Delete the "Typing..." indicator once the real answer arrives
        const typingElement = document.getElementById(typingId);
        if (typingElement) typingElement.remove();
        
        // 4. Display the final AI response
        msgBox.innerHTML += `<div class="bot-msg">${data}</div>`;
        msgBox.scrollTop = msgBox.scrollHeight;
    } catch (error) {
        // Remove typing indicator on error
        const typingElement = document.getElementById(typingId);
        if (typingElement) typingElement.remove();
        
        msgBox.innerHTML += `<div class="bot-msg">Sorry, the system is busy. Please WhatsApp Jong directly!</div>`;
    }
}

// --- "Similar Properties" Recommendation Engine ---
function renderSimilarProperties(currentArea, currentType, currentName) {
    const similarGrid = document.getElementById('similar-grid');
    const similarSection = document.getElementById('similar-properties-section');
    if (!similarGrid || !similarSection) return;
    
    similarGrid.innerHTML = ''; // Clear old recommendations
    let similarMatches = [];
    
    if (window.allPropertyData) {
        similarMatches = window.allPropertyData.filter(row => {
            if (!row['Property Name']) return false;
            // Don't recommend the exact same house they are already looking at
            if (row['Property Name'] === currentName) return false; 
            
            // Find a match based on identical Area OR identical Type
            let rowArea = row['Area'] ? row['Area'].toLowerCase().trim() : '';
            let rowType = row['Type'] ? row['Type'].toLowerCase().trim() : '';
            
            return (rowArea === currentArea.toLowerCase() || rowType === currentType.toLowerCase());
        });
    }
    
    // Grab only the top 3 matches
    similarMatches = similarMatches.slice(0, 3);
    
    if (similarMatches.length === 0) {
        similarSection.style.display = 'none'; // Hide if no matches exist
        return;
    }
    
    similarSection.style.display = 'block';
    
    similarMatches.forEach(row => {
        // Create a mini-card for the similar property
        const similarPropertyName = row['Property Name'];
        const similarWhatsappMsg = `Hi Jong, I'm interested in this property: ${similarPropertyName}`;
        let card = `
            <div class="similar-card">
                <img src="${localPhoto(String(row['Image Name'] || '').split(',')[0])}" alt="${similarPropertyName}" loading="lazy" decoding="async">
                <div class="similar-card-body">
                    <h4>${similarPropertyName}</h4>
                    <p>${row['Price']}</p>
                    <a href="https://wa.me/60169242000?text=${encodeURIComponent(similarWhatsappMsg)}" target="_blank">💬 Inquire</a>
                </div>
            </div>
        `;
        similarGrid.innerHTML += card;
    });
}

// --- Smart Mobile Header Logic ---
let lastScrollTop = 0;
const header = document.querySelector('header');

// Only run this if a header actually exists on the page
if (header) {
    window.addEventListener('scroll', function() {
        let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Calculate the total scrollable height of the document
        let scrollHeight = document.documentElement.scrollHeight;
        let clientHeight = document.documentElement.clientHeight;
        
        // ONLY trigger the hide/show logic if the page is long enough to actually scroll
        if (scrollHeight > clientHeight + 100) {
            if (scrollTop > lastScrollTop && scrollTop > 60) {
                // Scrolling down: Hide the header
                header.classList.add('header-hidden');
            } else {
                // Scrolling up (or at the very top): Show the header
                header.classList.remove('header-hidden');
            }
        }
        
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop; 
    }, false);
}
