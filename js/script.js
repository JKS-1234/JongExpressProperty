let currentLimit = 6;
let currentMarket = 'all'; 
let allProperties = []; 

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
        let price = row['Price'] ? `Sale ${row['Price']}` : 'Price on Request';
        let address = row['Area'] ? `${row['Area']}, Sarawak` : 'Miri, Sarawak';
        let image = row['Image Name'] ? row['Image Name'].split(',')[0] : '';

        allCardsHTML += `
        <div class="property-card" style="padding: 20px;">
            <img src="${image}" alt="${title}" style="width:100%; height:200px; object-fit:cover; margin-bottom:15px;">
            <h3 style="color:#2d3748;">${price}</h3>
            <p style="font-weight:bold;">${title}</p>
            <p style="color:#718096;">${address}</p>
            <a href="properties/${row.slug}/" style="display:block; text-align:center; background:#1a365d; color:white; padding:10px; text-decoration:none; margin-top:10px; border-radius:5px;">View Details</a>
        </div>`;
    });

    grid.innerHTML = allCardsHTML;
}
