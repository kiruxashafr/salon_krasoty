// about.js
document.addEventListener('DOMContentLoaded', function() {
    const aboutTrigger = document.getElementById('about-trigger');
    const aboutModal = document.getElementById('about-modal');
    const aboutCloseBtn = document.querySelector('.about-close-btn');
    
    // Элементы для контента
    const aboutTitle = document.getElementById('about-title');
    const aboutDescription = document.getElementById('about-description');
    const aboutAdditional = document.getElementById('about-additional');

    // Загружаем контент при открытии модального окна
    aboutTrigger.addEventListener('click', function() {
        aboutModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        initMap();
        loadAboutContent();
    });

    // about.js - добавить в функцию loadAboutContent()
    function loadAboutContent() {
        // Загружаем контент и ссылки параллельно
        Promise.all([
            fetch('/api/pages/about').then(response => response.json()),
            fetch('/api/links').then(response => response.json())
        ])
        .then(([contentData, linksData]) => {
            if (contentData.message === 'success') {
                updateModalContent(contentData.data);
            }
            
            if (linksData.message === 'success') {
                updateModalLinks(linksData.data);
            }
        })
        .catch(error => {
            console.error('Ошибка загрузки контента:', error);
        });
    }

    // Функция обновления ссылок в модальном окне
    function updateModalLinks(links) {
        const modal = document.getElementById('about-modal');
        
        if (links.vk_contact) {
            const vkLinks = modal.querySelectorAll('a[href*="vk.com"]');
            vkLinks.forEach(link => link.href = links.vk_contact);
        }
        
        if (links.telegram_contact) {
            const tgLinks = modal.querySelectorAll('a[href*="t.me"]');
            tgLinks.forEach(link => {
                if (!link.href.includes('shafrbeautybot')) {
                    link.href = links.telegram_contact;
                }
            });
        }
    }

    // about.js - обновленная функция loadAboutContent()
    function loadAboutContent() {
        // Загружаем контент, ссылки и координаты параллельно
        Promise.all([
            fetch('/api/pages/about').then(response => response.json()),
            fetch('/api/links').then(response => response.json())
        ])
        .then(([contentData, linksData]) => {
            if (contentData.message === 'success') {
                updateModalContent(contentData.data);
            }
            
            if (linksData.message === 'success') {
                updateModalLinks(linksData.data);
                // Координаты теперь загружаются в initMap()
            }
        })
        .catch(error => {
            console.error('Ошибка загрузки контента:', error);
        });
    }

    // Функция обновления контента в модальном окне
    function updateModalContent(content) {
        if (aboutTitle && content.заголовок) {
            aboutTitle.textContent = content.заголовок;
        }
        
        if (aboutDescription && content.описание) {
            aboutDescription.textContent = content.описание;
        }
        
        if (aboutAdditional && content.дополнительный_текст) {
            aboutAdditional.textContent = content.дополнительный_текст;
        }
    }

    // Закрытие модального окна
    aboutCloseBtn.addEventListener('click', closeModal);
    
    // Закрытие по клику вне модального окна
    aboutModal.addEventListener('click', function(e) {
        if (e.target === aboutModal) {
            closeModal();
        }
    });
    
    // Закрытие по Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && aboutModal.style.display === 'flex') {
            closeModal();
        }
    });

    function closeModal() {
        aboutModal.style.display = 'none';
        document.body.style.overflow = '';
    }
});

// about.js - обновленная функция initMap() без текста balloon
function initMap() {
    if (typeof ymaps === 'undefined') {
        console.error('Yandex Maps API не загружена');
        return;
    }

    // Загружаем координаты из БД
    fetch('/api/links')
        .then(response => response.json())
        .then(data => {
            if (data.message === 'success') {
                const links = data.data;
                
                // Получаем координаты из БД или используем значения по умолчанию
                const latitude = parseFloat(links.map_latitude) || 52.97103104736177;
                const longitude = parseFloat(links.map_longitude) || 36.06383468318084;
                
                initializeYandexMap(latitude, longitude);
            } else {
                // Если ошибка, используем значения по умолчанию
                initializeYandexMap(52.97103104736177, 36.06383468318084);
            }
        })
        .catch(error => {
            console.error('Ошибка загрузки координат:', error);
            // Используем значения по умолчанию при ошибке
            initializeYandexMap(52.97103104736177, 36.06383468318084);
        });

    function initializeYandexMap(lat, lng) {
        ymaps.ready(function() {
            // Очищаем контейнер карты перед созданием новой
            const mapContainer = document.getElementById('about-map');
            if (mapContainer) {
                mapContainer.innerHTML = '';
            }

            try {
                const map = new ymaps.Map('about-map', {
                    center: [lat, lng],
                    zoom: 16,
                    controls: ['zoomControl', 'fullscreenControl']
                });

                // Создаем маркер без текста balloon
                const marker = new ymaps.Placemark([lat, lng], {}, {
                    preset: 'islands#redDotIcon'
                });

                map.geoObjects.add(marker);
                
                console.log('Карта инициализирована с координатами:', lat, lng);
            } catch (error) {
                console.error('Ошибка инициализации карты:', error);
            }
        });
    }
}