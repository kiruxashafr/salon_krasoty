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

    // Функция загрузки контента из БД
    function loadAboutContent() {
        fetch('/api/pages/about')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Ошибка сети');
                }
                return response.json();
            })
            .then(data => {
                if (data.message === 'success') {
                    updateModalContent(data.data);
                } else {
                    throw new Error('Неверный формат данных');
                }
            })
            .catch(error => {
                console.error('Ошибка загрузки контента:', error);
                // Контент по умолчанию

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

// Функция инициализации карты
function initMap() {
    if (typeof ymaps === 'undefined') {
        console.error('Yandex Maps API не загружена');
        return;
    }

    ymaps.ready(function() {
        // Очищаем контейнер карты перед созданием новой
        const mapContainer = document.getElementById('about-map');
        if (mapContainer) {
            mapContainer.innerHTML = '';
        }

        try {
            const map = new ymaps.Map('about-map', {
                center: [52.97103104736177, 36.06383468318084],
                zoom: 16,
                controls: ['zoomControl', 'fullscreenControl']
            });

            const marker = new ymaps.Placemark([52.97103104736177, 36.06383468318084], {
                balloonContent: 'Наш салон красоты в Орле<br>ул. Примерная, 123'
            }, {
                preset: 'islands#redDotIcon'
            });

            map.geoObjects.add(marker);
        } catch (error) {
            console.error('Ошибка инициализации карты:', error);
        }
    });
}