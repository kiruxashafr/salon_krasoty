document.addEventListener('DOMContentLoaded', function() {
    const aboutTrigger = document.getElementById('about-trigger');
    const aboutModal = document.getElementById('about-modal');
    const aboutCloseBtn = document.querySelector('.about-close-btn');
    
// Замените обработчик клика на этот
aboutTrigger.addEventListener('click', function() {
    aboutModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    initMap();
});


    // Закрытие модального окна
    aboutCloseBtn.addEventListener('click', function() {
        aboutModal.style.display = 'none';
        document.body.style.overflow = ''; // Восстанавливаем скролл
    });
    
    // Закрытие по клику вне модального окна
    aboutModal.addEventListener('click', function(e) {
        if (e.target === aboutModal) {
            aboutModal.style.display = 'none';
            document.body.style.overflow = '';
        }
    });
    
    // Закрытие по Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && aboutModal.style.display === 'flex') {
            aboutModal.style.display = 'none';
            document.body.style.overflow = '';
        }
    });
});

// Функция инициализации карты
function initMap() {
    // Проверяем, не была ли карта уже инициализирована
    if (document.querySelector('#about-map ymaps')) {
        return;
    }
    
    // Создаем карту
    ymaps.ready(function() {
        const map = new ymaps.Map('about-map', {
            center: [52.97103104736177, 36.06383468318084],
            zoom: 13,
            controls: ['zoomControl', 'fullscreenControl']
        });

        // Обычный указатель без фото
        const marker = new ymaps.Placemark([52.97103104736177, 36.06383468318084], {
            balloonContent: 'Наш салон красоты в Орле'
        }, {
            preset: 'islands#redIcon'
        });

        map.geoObjects.add(marker);
    });
}