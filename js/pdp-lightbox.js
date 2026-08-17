// Minimal image-gallery lightbox for individual static property pages.
// window.lightboxGalleries and window.currentGalleryId are set inline
// in each generated properties/<slug>/index.html page.

function openLightbox(galleryId, imgIndex) {
    currentGalleryId = galleryId;
    currentImageIndex = imgIndex;
    updateLightboxView();
    const lightbox = document.getElementById('lightbox');
    if (lightbox) lightbox.style.display = 'block';
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (lightbox) lightbox.style.display = 'none';
}

function changeLightboxImage(direction) {
    let gallery = window.lightboxGalleries[currentGalleryId];
    if (!gallery) return;

    currentImageIndex += direction;
    if (currentImageIndex >= gallery.length) currentImageIndex = 0;
    else if (currentImageIndex < 0) currentImageIndex = gallery.length - 1;

    updateLightboxView();
}

function updateLightboxView() {
    let gallery = window.lightboxGalleries[currentGalleryId];
    const imgEl = document.getElementById('lightbox-img');
    const captionEl = document.getElementById('lightbox-caption');

    if (imgEl && gallery) imgEl.src = gallery[currentImageIndex];
    if (captionEl && gallery) captionEl.innerText = `📸 Image ${currentImageIndex + 1} of ${gallery.length}`;
}

function slideImage(sliderId, direction) {
    const slider = document.getElementById(sliderId);
    if (!slider) return;
    const scrollAmount = slider.clientWidth;
    slider.scrollBy({ left: scrollAmount * direction, behavior: 'smooth' });
}
