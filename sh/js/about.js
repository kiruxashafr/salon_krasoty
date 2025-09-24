// about.js
document.addEventListener('DOMContentLoaded', function() {
    const aboutSection = document.getElementById('about-section');
    const aboutModal = document.getElementById('about-modal');
    const aboutCloseBtn = document.querySelector('.about-close-btn');
    
    // Открытие модального окна
    aboutSection.addEventListener('click', function() {
        aboutModal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Блокируем скролл страницы
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
            center: [53.9025, 36.0611], // Координаты Орла
            zoom: 13,
            controls: ['zoomControl', 'fullscreenControl']
        });
        
        // Добавляем маркер
        const marker = new ymaps.Placemark([53.9025, 36.0611], {
            balloonContent: 'Наш салон красоты в Орле'
        }, {
            preset: 'islands#icon',
            iconColor: '#1b1c1d'
        });
        
        map.geoObjects.add(marker);
    });
}