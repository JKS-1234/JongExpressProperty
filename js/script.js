let currentLimit = 6;
let currentMarket = 'all'; 
let allProperties = []; 

function parsePrice(priceStr) {
    if (!priceStr) return 0;
    return parseInt(String(priceStr).replace(/[^0-9]/g, ''), 10) || 0;
}

function setMarket(marketType, btnElement) {
    currentMarket = marketType;
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => tab.classList.remove('active'));
    if(btnElement) btnElement.classList.add('active');
    filterProperties();
}

if (document.querySelector('.property-grid')) {
    fetch('data/properties.json')
        .then(response => response.json())
        .then(data => {
            allProperties = data;
            filterProperties();
        })
        .catch(error => {
            console.error("Error fetching properties:", error);
        });
}

function filterProperties() {
    const grid = document.querySelector('.property-grid');
    if (!grid) return;
    
    let filteredData = allProperties.slice(0, currentLimit);
    let allCardsHTML = '';

    filteredData.forEach((row) => {
        let title = row['Property Name'] || 'Property';
        let priceStr = row['Price'] ? String(row['Price']).trim() : '';
        let propStatus = row['Status'] ? String(row['Status']).toLowerCase().trim() : 'sale';
        
        let formattedPrice = 'Price on Request';
        if (priceStr) {
            if (priceStr.toLowerCase().includes('rent') || priceStr.toLowerCase().includes('sale')) {
                formattedPrice = priceStr;
            } else {
                formattedPrice = propStatus === 'rent' ? `Rent ${priceStr}` : `Sale ${priceStr}`;
            }
        }

        let address = row['Area'] ? `${row['Area']}, Sarawak` : 'Miri, Sarawak';
        let rawImages = row['Image Name'] ? String(row['Image Name']).trim() : '';
        let image = rawImages.split(',')[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80';

        allCardsHTML += `
        <div class="property-card" style="padding: 20px;">
            <img src="${image}" alt="${title}" style="width:100%; height:200px; object-fit:cover; margin-bottom:15px; border-radius: 4px;">
            <h3 style="color:#2d3748;">${formattedPrice}</h3>
            <p style="font-weight:bold;">${title}</p>
            <p style="color:#718096;">${address}</p>
            <a href="properties/${row.slug}/" style="display:block; text-align:center; background:#1a365d; color:white; padding:10px; text-decoration:none; margin-top:15px; border-radius:5px;">View Details</a>
        </div>`;
    });

    grid.innerHTML = allCardsHTML;
}
