// setting.js
class NotificationSettingsManager {
    constructor() {
        this.masters = [];
        this.settings = {};
        this.init();
    }

    async init() {
        await this.loadSettings();
        await this.loadMasters();
        this.setupEventListeners();
    }

    async loadSettings() {
        try {
            const response = await fetch('/api/settings');
            if (response.ok) {
                const data = await response.json();
                if (data.message === 'success') {
                    this.settings = data.data;
                    this.displaySettings();
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки настроек:', error);
        }
    }

    async loadMasters() {
        try {
            const response = await fetch('/api/specialists-all');
            if (response.ok) {
                const data = await response.json();
                if (data.message === 'success') {
                    this.masters = data.data;
                    this.displayMasters();
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки мастеров:', error);
        }
    }

    displaySettings() {
        const container = document.getElementById('contentVisibilitySettings');
        if (!container) return;

        container.innerHTML = `
            <div class="visibility-controls">
                <div class="visibility-item">
                    <label>
                        <input type="checkbox" id="showSpecialistsToggle" 
                               ${this.settings.show_specialists === '1' ? 'checked' : ''}>
                        Показывать специалистов
                    </label>
                    <div class="description">Отображает блок с мастерами на главной странице</div>
                </div>
                
                <div class="visibility-item">
                    <label>
                        <input type="checkbox" id="showServicesToggle" 
                               ${this.settings.show_services === '1' ? 'checked' : ''}>
                        Показывать услуги
                    </label>
                    <div class="description">Отображает блок с услугами и ценами</div>
                </div>
                
                <div class="visibility-item">
                    <label>
                        <input type="checkbox" id="showContactsToggle" 
                               ${this.settings.show_contacts === '1' ? 'checked' : ''}>
                        Показывать контакты
                    </label>
                    <div class="description">Отображает контактную информацию и карту</div>
                </div>
            </div>
        `;

        // Добавляем обработчики событий
        const checkboxes = container.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                let key = e.target.id.replace('Toggle', '');
                key = this.camelToSnake(key);  // Convert to snake_case for DB
                this.updateSetting(key, e.target.checked ? '1' : '0');
                
                // Визуальный эффект изменения
                const item = e.target.closest('.visibility-item');
                item.classList.add('changed');
                setTimeout(() => item.classList.remove('changed'), 1000);
            });
        });
    }

    // Add this helper method to the NotificationSettingsManager class
    camelToSnake(camelCase) {
        return camelCase.replace(/([A-Z])/g, '_$1').toLowerCase();
    }

    displayMasters() {
        const container = document.getElementById('mastersNotificationsList');
        if (!container) return;

        container.innerHTML = this.masters.map(master => `
            <div class="master-notification-item" data-master-id="${master.id}">
                <div class="master-info">
                    <img src="${master.фото || 'photo/работники/default.jpg'}" 
                         alt="${master.имя}" 
                         class="master-avatar"
                         onerror="this.src='photo/работники/default.jpg'">
                    <span class="master-name">${master.имя}</span>
                </div>
                <div class="tg-id-input">
                    <input type="text" 
                           class="tg-id-field" 
                           placeholder="Telegram ID"
                           value="${master.tg_id || ''}"
                           data-master-id="${master.id}">
                    <button class="save-tg-id-btn" onclick="notificationSettings.saveTgId(${master.id})">
                        💾 Сохранить
                    </button>
                </div>
            </div>
        `).join('');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            border-radius: 4px;
            z-index: 10000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;

        document.body.appendChild(notification);
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    async updateSetting(key, value) {
        try {
            const response = await fetch(`/api/settings/${key}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ значение: value })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.message === 'success') {
                    this.settings[key] = value;
                    this.showNotification('Настройка сохранена!', 'success');
                }
            } else {
                throw new Error('Ошибка сохранения');
            }
        } catch (error) {
            console.error('Ошибка сохранения настройки:', error);
            this.showNotification('Ошибка сохранения настройки', 'error');
        }
    }

    async saveTgId(masterId) {
        const input = document.querySelector(`.tg-id-field[data-master-id="${masterId}"]`);
        const tgId = input.value.trim();

        try {
            const response = await fetch(`/api/specialist/${masterId}/tg-id`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ tg_id: tgId })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.message === 'success') {
                    this.showNotification('Telegram ID успешно сохранен!', 'success');
                    const master = this.masters.find(m => m.id === masterId);
                    if (master) {
                        master.tg_id = tgId;
                    }
                }
            } else {
                throw new Error('Ошибка сохранения');
            }
        } catch (error) {
            console.error('Ошибка сохранения Telegram ID:', error);
            this.showNotification('Ошибка сохранения Telegram ID', 'error');
        }
    }

    // setting.js - добавьте этот метод в класс NotificationSettingsManager
async uploadAdminPhoto(file) {
    const formData = new FormData();
    formData.append('photo', file);
    
    try {
        const response = await fetch('/api/upload-default-admin-photo', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.message === 'success') {
                // Обновляем превью с временной меткой чтобы избежать кэширования
                const preview = document.getElementById('adminPhotoPreview');
                if (preview) {
                    const timestamp = new Date().getTime();
                    preview.src = `photo/администратор/admin_default.jpg?t=${timestamp}`;
                }
                
                this.showNotification('✅ Фото администратора успешно обновлено!', 'success');
                return true;
            }
        }
        throw new Error('Ошибка загрузки фото');
    } catch (error) {
        console.error('Ошибка загрузки фото администратора:', error);
        this.showNotification('Ошибка загрузки фото', 'error');
        return false;
    }
}

handleAdminPhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        this.showNotification('Пожалуйста, выберите изображение', 'error');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        this.showNotification('Размер файла не должен превышать 5MB', 'error');
        return;
    }
    
    // Сразу показываем превью
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('adminPhotoPreview');
        if (preview) {
            preview.src = e.target.result;
            preview.style.display = 'block';
        }
    };
    reader.readAsDataURL(file);
    
    // Загружаем фото
    this.uploadAdminPhoto(file);
}

    async uploadDefaultPhoto(type, file) {
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('type', type);
        
        try {
            const response = await fetch('/api/upload-default-photo', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.message === 'success') {
                    this.showNotification('Фото по умолчанию успешно обновлено!', 'success');
                    return true;
                }
            }
            throw new Error('Ошибка загрузки фото');
        } catch (error) {
            console.error('Ошибка загрузки фото:', error);
            this.showNotification('Ошибка загрузки фото', 'error');
            return false;
        }
    }

    handleDefaultPhotoUpload(type, event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            this.showNotification('Пожалуйста, выберите изображение', 'error');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            this.showNotification('Размер файла не должен превышать 5MB', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewId = `default${type}Preview`;
            const preview = document.getElementById(previewId);
            if (preview) {
                preview.src = e.target.result;
                preview.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
        
        this.uploadDefaultPhoto(type, file);
    }

    openPhotoSettingsModal() {
        const modal = document.getElementById('photoSettingsModal');
        if (modal) {
            modal.style.display = 'block';
            
            // Загружаем текущие фото по умолчанию
            this.loadDefaultPhotos();
        }
    }

    closePhotoSettingsModal() {
        const modal = document.getElementById('photoSettingsModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

// setting.js - исправленный метод loadDefaultPhotos
async loadDefaultPhotos() {
    try {
        // Загружаем фото администратора с временной меткой
        const adminPreview = document.getElementById('adminPhotoPreview');
        if (adminPreview) {
            const timestamp = new Date().getTime();
            adminPreview.src = `photo/администратор/admin_default.jpg?t=${timestamp}`;
            adminPreview.style.display = 'block';
            
            // Проверяем доступность фото
            const img = new Image();
            img.onload = function() {
                // Фото доступно
                adminPreview.style.display = 'block';
            };
            img.onerror = function() {
                // Фото недоступно, скрываем превью
                adminPreview.style.display = 'none';
            };
            img.src = adminPreview.src;
        }
        
        // Загружаем другие фото по умолчанию
        const masterPreview = document.getElementById('defaultMasterPreview');
        if (masterPreview) {
            masterPreview.src = 'photo/работники/default.jpg';
            masterPreview.style.display = 'block';
        }
        
        const servicePreview = document.getElementById('defaultServicePreview');
        if (servicePreview) {
            servicePreview.src = 'photo/услуги/default.jpg';
            servicePreview.style.display = 'block';
        }
        
    } catch (error) {
        console.log('Фото по умолчанию еще не установлены');
    }
}

setupEventListeners() {
    document.getElementById('openNotificationsBtn')?.addEventListener('click', () => {
        this.openNotificationsModal();
    });

    document.getElementById('closeNotificationsModal')?.addEventListener('click', () => {
        this.closeNotificationsModal();
    });

    document.getElementById('openContentSettingsBtn')?.addEventListener('click', () => {
        this.openContentSettingsModal();
    });

    document.getElementById('closeContentSettingsModal')?.addEventListener('click', () => {
        this.closeContentSettingsModal();
    });
    
    document.getElementById('openPhotoSettingsBtn')?.addEventListener('click', () => {
        this.openPhotoSettingsModal();
    });

    document.getElementById('closePhotoSettingsModal')?.addEventListener('click', () => {
        this.closePhotoSettingsModal();
    });

    // Исправленный обработчик для загрузки фото администратора
    document.getElementById('adminPhotoUpload')?.addEventListener('change', (e) => {
        this.handleAdminPhotoUpload(e);
    });

    document.getElementById('masterDefaultPhoto')?.addEventListener('change', (e) => {
        this.handleDefaultPhotoUpload('Master', e);
    });

    document.getElementById('serviceDefaultPhoto')?.addEventListener('change', (e) => {
        this.handleDefaultPhotoUpload('Service', e);
    });

    document.addEventListener('keypress', (e) => {
        if (e.target.classList.contains('tg-id-field') && e.key === 'Enter') {
            const masterId = e.target.getAttribute('data-master-id');
            this.saveTgId(parseInt(masterId));
        }
    });
}

    openNotificationsModal() {
        const modal = document.getElementById('notificationsModal');
        if (modal) {
            modal.style.display = 'block';
            this.loadMasters();
        }
    }

    closeNotificationsModal() {
        const modal = document.getElementById('notificationsModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    openContentSettingsModal() {
        const modal = document.getElementById('contentSettingsModal');
        if (modal) {
            modal.style.display = 'block';
            this.loadSettings();
        }
    }

    closeContentSettingsModal() {
        const modal = document.getElementById('contentSettingsModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
}


class ContentManager {
    constructor() {
        this.pages = ['главная', 'about', 'контакты'];
        this.currentPage = 'главная';
        this.content = {};
        this.links = {};
        this.linksVisibility = {}; // Добавьте это свойство
    }

    async init() {
        await this.loadSettings();
        await this.loadPageContent();
        await this.loadLinks();
        this.setupEventListeners();
    }

    async loadSettings() {
        try {
            const response = await fetch('/api/settings');
            if (response.ok) {
                const data = await response.json();
                if (data.message === 'success') {
                    this.settings = data.data;
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки настроек:', error);
        }
    }

    async loadPageContent() {
        try {
            const response = await fetch(`/api/page-content-full/${this.currentPage}`);
            if (response.ok) {
                const data = await response.json();
                if (data.message === 'success') {
                    this.content = data.data;
                    this.displayContent();
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки контента:', error);
        }
    }

// setting.js - обновленный метод loadLinks в ContentManager
// setting.js - обновленный метод loadLinks в ContentManager
async loadLinks() {
    try {
        // Загружаем ссылки
        const linksResponse = await fetch('/api/links');
        if (linksResponse.ok) {
            const linksData = await linksResponse.json();
            if (linksData.message === 'success') {
                this.links = linksData.data;
            }
        }

        // Загружаем видимость контактов (включая telegram_bot)
        const visibilityResponse = await fetch('/api/contact-visibility');
        if (visibilityResponse.ok) {
            const visibilityData = await visibilityResponse.json();
            if (visibilityData.message === 'success') {
                this.linksVisibility = visibilityData.data;
                console.log('Загружена видимость контактов:', this.linksVisibility);
            }
        }

        this.displayContent();
    } catch (error) {
        console.error('Ошибка загрузки ссылок или видимости:', error);
    }
}

    displayContent() {
        const container = document.getElementById('contentTextSettings');
        if (!container) return;

        container.innerHTML = this.generateContentForm();
    }

    // Обновляем метод getPageElements для добавления страницы контактов
    getPageElements(page) {
        const elementsMap = {
            'главная': [
                { key: 'название_салона', label: 'Название салона', type: 'text' },
                { key: 'заголовок', label: 'Заголовок', type: 'text' },
                { key: 'описание', label: 'Описание', type: 'textarea' },
                { key: 'кнопка_записи', label: 'Текст кнопки записи', type: 'text' },
                { key: 'дополнительный_текст', label: 'Дополнительный текст', type: 'textarea' }
            ],
            'about': [
                { key: 'заголовок', label: 'Заголовок', type: 'text' },
                { key: 'описание', label: 'Описание', type: 'textarea' },
                { key: 'дополнительный_текст', label: 'Дополнительный текст', type: 'textarea' }
            ],
            'контакты': [
                { key: 'имя_администратора', label: 'Имя администратора', type: 'text' }
            ]
        };
        
        return elementsMap[page] || [];
    }

// setting.js - обновленный метод generateContentForm
generateContentForm() {
    const elements = this.getPageElements(this.currentPage);
    const currentElements = Array.isArray(this.content) ? this.content.filter(item => 
        elements.some(e => e.key === item.элемент)
    ) : [];

    return `
        <div class="page-selector">
            <label for="pageSelector">Выберите страницу для редактирования:</label>
            <select id="pageSelector" class="page-select">
                <option value="главная" ${this.currentPage === 'главная' ? 'selected' : ''}>Главная страница</option>
                <option value="about" ${this.currentPage === 'about' ? 'selected' : ''}>Страница "О нас"</option>
                <option value="контакты" ${this.currentPage === 'контакты' ? 'selected' : ''}>Контакты</option>
            </select>
        </div>
        
        <div class="content-management">
            <div class="content-elements">
                <h4>Элементы страницы "${this.getPageDisplayName(this.currentPage)}":</h4>
                <div id="elementsList" class="elements-list">
                    ${currentElements.map((item, index) => `
                        <div class="element-item" data-element="${item.элемент}">
                            <div class="element-content">
                                <label>${this.getElementLabel(item.элемент)}:</label>
                                ${this.getElementInput(item.элемент, item.текст)}
                                <button class="save-element-btn" data-element="${item.элемент}">
                                    💾 Сохранить
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            ${this.currentPage === 'контакты' ? this.generateLinksForm() : ''}
        </div>
    `;
}

// Обновим getElementLabel
getElementLabel(elementKey) {
    const labels = {
        'заголовок': 'Заголовок',
        'описание': 'Описание',
        'название_салона': 'Название салона',
        'кнопка_записи': 'Текст кнопки записи',
        'дополнительный_текст': 'Дополнительный текст',
        'имя_администратора': 'Имя администратора', // Добавляем это
        'фото_администратора': 'Фото администратора'
    };
    return labels[elementKey] || elementKey;
}

    getElementInput(elementKey, value) {
        const isLongText = ['описание', 'дополнительный_текст'].includes(elementKey);
        
        // Безопасное экранирование значения
        const safeValue = this.escapeHtml(value || '');
        
        if (isLongText) {
            return `<textarea class="content-input" data-element="${elementKey}" rows="4">${safeValue}</textarea>`;
        } else {
            return `<input type="text" class="content-input" data-element="${elementKey}" value="${safeValue}">`;
        }
    }

    // Метод для экранирования HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

setupEventListeners() {
    // Делегирование событий для кнопок сохранения
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('save-element-btn')) {
            const elementKey = e.target.getAttribute('data-element');
            if (elementKey) {
                const input = document.querySelector(`.content-input[data-element="${elementKey}"]`);
                if (input) {
                    this.saveContent(elementKey, input.value);
                }
            }
        }
    });

    // Сохранение по Enter
    document.addEventListener('keypress', (e) => {
        if (e.target.classList.contains('content-input') && e.key === 'Enter') {
            const elementKey = e.target.getAttribute('data-element');
            if (elementKey) {
                this.saveContent(elementKey, e.target.value);
            }
        }
    });
        // Валидация ввода телефона в реальном времени
    document.addEventListener('input', (e) => {
        if (e.target.classList.contains('content-input') && 
            e.target.getAttribute('data-element') === 'phone_contact') {
            
            let value = e.target.value;
            
            // Убираем все нецифровые символы
            value = value.replace(/\D/g, '');
            
            // Если начинается с 7, меняем на 8
            if (value.startsWith('7') && value.length === 11) {
                value = '8' + value.substring(1);
            }
            
            // Ограничиваем длину 11 символами
            if (value.length > 11) {
                value = value.substring(0, 11);
            }
            
            // Обновляем значение в поле
            if (value !== e.target.value) {
                e.target.value = value;
            }
            
            // Визуальная индикация валидности
            if (value.length === 11 && value.startsWith('89')) {
                e.target.style.borderColor = '#4CAF50';
            } else {
                e.target.style.borderColor = '#ff4444';
            }
        }
    });


        // Обработчик для изменения страницы
        document.addEventListener('change', (e) => {
            if (e.target.id === 'pageSelector') {
                this.changePage(e.target.value);
            }
        });
    }
// Добавьте этот метод в класс ContentManager
validatePhoneInput(input) {
    let value = input.value;
    
    // Убираем все нецифровые символы
    value = value.replace(/\D/g, '');
    
    // Если начинается с 7, меняем на 8
    if (value.startsWith('7') && value.length === 11) {
        value = '8' + value.substring(1);
    }
    
    // Ограничиваем длину 11 символами
    if (value.length > 11) {
        value = value.substring(0, 11);
    }
    
    // Обновляем значение в поле
    if (value !== input.value) {
        input.value = value;
    }
    
    // Визуальная индикация валидности
    if (value.length === 11 && value.startsWith('8')) {
        input.style.borderColor = '#4CAF50';
    } else {
        input.style.borderColor = '#ff4444';
    }
}
    async changePage(page) {
        this.currentPage = page;
        await this.loadPageContent();
        this.displayContent();
    }
// setting.js - обновленный метод generateLinksForm
generateLinksForm() {
    const linksConfig = [
        { key: 'telegram_bot', label: 'Telegram бот', placeholder: 'https://t.me/your_bot' },
        { key: 'vk_contact', label: 'VK контакт', placeholder: 'https://vk.com/your_page' },
        { key: 'telegram_contact', label: 'Telegram контакт', placeholder: 'https://t.me/username' },
        { key: 'whatsapp_contact', label: 'WhatsApp', placeholder: 'https://wa.me/number' },
        { key: 'email_contact', label: 'Email', placeholder: 'email@example.com' },
        { key: 'phone_contact', label: 'Телефон', placeholder: '89255355278 (только цифры)' }
    ];

    return `
        <div class="links-management">
            <h4>Контактные ссылки:</h4>
            ${linksConfig.map(link => `
                <div class="link-item-with-visibility">
                    <div class="link-content">
                        <label>${link.label}:</label>
                        <input type="${link.key === 'phone_contact' ? 'tel' : 'url'}" 
                               id="link_input_${link.key}" 
                               value="${this.links[link.key] || ''}"
                               placeholder="${link.placeholder}"
                               class="link-input ${link.key === 'phone_contact' ? 'phone-input' : ''}"
                               ${link.key === 'phone_contact' ? 'oninput="contentManager.validatePhoneInput(this)"' : ''}>
                        <button onclick="contentManager.saveLink('${link.key}')" 
                                class="save-link-btn">
                            💾 Сохранить
                        </button>
                    </div>
                    <div class="visibility-control">
                        <label class="visibility-toggle">
                            <input type="checkbox" 
                                   id="visibility_${link.key}" 
                                   ${this.linksVisibility[link.key] ? 'checked' : ''}
                                   onchange="contentManager.toggleLinkVisibility('${link.key}', this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                        <span class="visibility-label">Видимость</span>
                    </div>
                    ${link.key === 'phone_contact' ? '<div class="phone-hint">Формат: 89255355278 (11 цифр, начинается с 8)</div>' : ''}
                </div>
            `).join('')}
        </div>
    `;
}


// setting.js - добавьте в класс ContentManager
async toggleLinkVisibility(linkType, isVisible) {
    try {
        const response = await fetch(`/api/contact-visibility/${linkType}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ доступен: isVisible })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.message === 'success') {
                this.linksVisibility[linkType] = isVisible;
                this.showNotification(`Видимость ${this.getLinkLabel(linkType)} ${isVisible ? 'включена' : 'выключена'}!`, 'success');
            }
        } else {
            throw new Error('Ошибка сохранения видимости');
        }
    } catch (error) {
        console.error('Ошибка сохранения видимости:', error);
        this.showNotification('Ошибка сохранения видимости', 'error');
    }
}

// Вспомогательный метод для получения названия ссылки
getLinkLabel(linkType) {
    const labels = {
        'vk_contact': 'VK',
        'telegram_contact': 'Telegram',
        'whatsapp_contact': 'WhatsApp',
        'email_contact': 'Email',
        'phone_contact': 'Телефона',
        'telegram_bot': 'Telegram бота'
    };
    return labels[linkType] || linkType;
}

    // Обновляем getPageDisplayName для новой страницы
    getPageDisplayName(page) {
        const names = {
            'главная': 'Главная страница',
            'about': 'Страница "О нас"',
            'контакты': 'Контакты'
        };
        return names[page] || page;
    }


async uploadAdminPhoto(file) {
    const formData = new FormData();
    formData.append('photo', file);
    
    try {
        const response = await fetch('/api/upload-default-admin-photo', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.message === 'success') {
                // Обновляем превью с временной меткой чтобы избежать кэширования
                const preview = document.getElementById('adminPhotoPreview');
                if (preview) {
                    const timestamp = new Date().getTime();
                    preview.src = `photo/администратор/admin_default.jpg?t=${timestamp}`;
                }
                
                this.showNotification('✅ Фото администратора успешно обновлено!', 'success');
                return true;
            }
        }
        throw new Error('Ошибка загрузки фото');
    } catch (error) {
        console.error('Ошибка загрузки фото администратора:', error);
        this.showNotification('Ошибка загрузки фото', 'error');
        return false;
    }
}

// Метод подтверждения загрузки
showPhotoConfirmation(type) {
    const preview = document.getElementById('adminPhotoPreview');
    if (preview) {
        // Добавляем временную метку чтобы избежать кэширования
        const timestamp = new Date().getTime();
        preview.src = `photo/администратор/admin_default.jpg?t=${timestamp}`;
        preview.style.display = 'block';
        
        // Добавляем визуальное подтверждение
        preview.classList.add('photo-confirmed');
        setTimeout(() => preview.classList.remove('photo-confirmed'), 2000);
    }
    
    // Показываем сообщение о успешной загрузке
    this.showNotification('✅ Фото администратора установлено по умолчанию!', 'success');
}



// Показывает подтверждение выбора файла
showFileSelectionConfirmation(file) {
    const fileName = file.name;
    const fileSize = (file.size / 1024 / 1024).toFixed(2);
    
    this.showNotification(`📁 Выбран файл: ${fileName} (${fileSize}MB)`, 'info');
}

// Показывает кнопку подтверждения (опционально)
showConfirmationButton() {
    const uploadArea = document.querySelector('.photo-upload-area');
    if (!uploadArea) return;
    
    // Удаляем существующую кнопку если есть
    const existingBtn = uploadArea.querySelector('.confirm-upload-btn');
    if (existingBtn) existingBtn.remove();
    
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'confirm-upload-btn';
    confirmBtn.innerHTML = '✅ Подтвердить загрузку';
    confirmBtn.onclick = () => {
        const fileInput = document.getElementById('adminPhotoUpload');
        if (fileInput.files[0]) {
            this.uploadAdminPhoto(fileInput.files[0]);
        }
    };
    
    uploadArea.appendChild(confirmBtn);
}




// setting.js - исправленный метод saveContent
// setting.js - исправленный метод saveContent
// setting.js - обновленный метод saveContent с валидацией телефона
async saveContent(elementKey, value) {
    // Проверяем, является ли элемент телефоном
    if (elementKey === 'phone_contact') {
        // Убираем все пробелы, дефисы и скобки
        const cleanPhone = value.replace(/[\s\-\(\)]/g, '');
        
        // Проверяем формат: 11 цифр, начинается с 89
        const phoneRegex = /^89\d{9}$/;
        
        if (!phoneRegex.test(cleanPhone)) {
            this.showNotification('❌ Неверный формат телефона! Должен быть: 89255355279 (11 цифр, начинается с 89)', 'error');
            return false;
        }
    }

    // Остальной код метода остается без изменений
    const input = document.querySelector(`.content-input[data-element="${elementKey}"]`);
    
    if (!input) {
        console.error('Элемент не найден:', elementKey);
        this.showNotification('Элемент не найден', 'error');
        return;
    }

    const trimmedValue = value.trim();

    try {
        const response = await fetch(`/api/pages/${this.currentPage}/${elementKey}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ текст: trimmedValue })
        });

        if (response.ok) {
            this.showNotification('Текст успешно сохранен!', 'success');
            
            // Обновляем контент на странице если она открыта
            if (this.currentPage === 'главная') {
                this.updateLiveContent();
            }
            return true;
        } else {
            throw new Error('Ошибка сохранения');
        }
    } catch (error) {
        console.error('Ошибка сохранения текста:', error);
        this.showNotification('Ошибка сохранения текста', 'error');
        return false;
    }
}

// setting.js - исправленный метод saveLink
async saveLink(linkKey) {
    const input = document.getElementById(`link_input_${linkKey}`);
    let value = input.value.trim();

    // Специальная валидация для телефона
    if (linkKey === 'phone_contact') {
        // Убираем все нецифровые символы
        const cleanPhone = value.replace(/\D/g, '');
        
        // Проверяем формат: 11 цифр, начинается с 8
        const phoneRegex = /^8\d{10}$/;
        
        if (!phoneRegex.test(cleanPhone)) {
            this.showNotification('❌ Неверный формат телефона! Должен быть: 89255355278 (11 цифр, начинается с 8)', 'error');
            
            // Подсвечиваем поле красным
            input.style.borderColor = '#ff4444';
            input.focus();
            return false;
        }
        
        // Обновляем значение очищенным номером
        value = cleanPhone;
        input.value = value;
    }

    try {
        const response = await fetch(`/api/links/${linkKey}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: value })
        });

        if (response.ok) {
            this.showNotification('Ссылка успешно сохранена!', 'success');
            this.links[linkKey] = value;
            
            // Визуальное подтверждение для телефона
            if (linkKey === 'phone_contact') {
                input.style.borderColor = '#4CAF50';
            }
            return true;
        } else {
            throw new Error('Ошибка сохранения');
        }
    } catch (error) {
        console.error('Ошибка сохранения ссылки:', error);
        this.showNotification('Ошибка сохранения ссылки', 'error');
        return false;
    }
}

    updateLiveContent() {
        if (typeof updateHomeContent === 'function') {
            updateHomeContent();
        }
        if (typeof loadLinks === 'function') {
            loadLinks();
        }
    }

    showNotification(message, type) {
        if (typeof notificationSettings !== 'undefined' && notificationSettings.showNotification) {
            notificationSettings.showNotification(message, type);
        } else {
            alert(message);
        }
    }

    openTextSettingsModal() {
        const modal = document.getElementById('textSettingsModal');
        if (modal) {
            modal.style.display = 'block';
            this.init().then(() => {
                this.displayContent();
            });
        }
    }

    closeTextSettingsModal() {
        const modal = document.getElementById('textSettingsModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
}


class MapSettingsManager {
    constructor() {
        this.map = null;
        this.marker = null;
        this.currentCoordinates = null;
        this.searchControl = null;
        this.init();
    }

    async init() {
        await this.loadCurrentCoordinates();
        this.setupEventListeners();
    }

    async loadCurrentCoordinates() {
        try {
            const response = await fetch('/api/map-coordinates');
            if (response.ok) {
                const data = await response.json();
                if (data.message === 'success') {
                    this.currentCoordinates = data.data;
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки координат:', error);
            // Устанавливаем координаты по умолчанию
            this.currentCoordinates = {
                latitude: 52.97103104736177,
                longitude: 36.06383468318084
            };
        }
    }

    setupEventListeners() {
        document.getElementById('openMapSettingsBtn')?.addEventListener('click', () => {
            this.openMapSettingsModal();
        });

        document.getElementById('closeMapSettingsModal')?.addEventListener('click', () => {
            this.closeMapSettingsModal();
        });
    }

openMapSettingsModal() {
    const modal = document.getElementById('mapSettingsModal');
    if (modal) {
        modal.style.display = 'block';
        // Инициализируем карту после отображения модального окна
        setTimeout(() => {
            this.initMap();
        }, 100);
        
        // Обработчик клика вне поля поиска для скрытия подсказок
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.address-search')) {
                this.hideSuggestions();
            }
        });
    }
}

    closeMapSettingsModal() {
        const modal = document.getElementById('mapSettingsModal');
        if (modal) {
            modal.style.display = 'none';
            // Уничтожаем карту при закрытии
            if (this.map) {
                this.map.destroy();
                this.map = null;
                this.marker = null;
            }
        }
    }
    setupSearch() {
    const addressInput = document.getElementById('addressSearch');
    const suggestionsContainer = document.getElementById('searchSuggestions');
    
    if (!addressInput) return;
    
    // Обработчик ввода в поле поиска
    addressInput.addEventListener('input', this.debounce((e) => {
        this.handleAddressSearch(e.target.value);
    }, 300));
    
    // Обработчик нажатия Enter
    addressInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            this.performSearch(addressInput.value);
        }
    });
}

// Метод для поиска с задержкой (debounce)
debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Обработчик поиска адреса
async handleAddressSearch(query) {
    if (!query || query.length < 3) {
        this.hideSuggestions();
        return;
    }
    
    try {
        const response = await this.searchAddress(query);
        this.displaySuggestions(response);
    } catch (error) {
        console.error('Ошибка поиска адреса:', error);
    }
}

// Поиск адреса через Яндекс Геокодер
async searchAddress(query) {
    return new Promise((resolve, reject) => {
        if (!window.ymaps) {
            reject(new Error('Yandex Maps API не загружена'));
            return;
        }
        
        ymaps.geocode(query, { results: 5 })
            .then((res) => {
                const suggestions = res.geoObjects.toArray().map(geoObject => ({
                    address: geoObject.getAddressLine(),
                    coords: geoObject.geometry.getCoordinates(),
                    name: geoObject.properties.get('name')
                }));
                resolve(suggestions);
            })
            .catch(reject);
    });
}

// Отображение подсказок
displaySuggestions(suggestions) {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    if (!suggestionsContainer) return;
    
    if (suggestions.length === 0) {
        this.hideSuggestions();
        return;
    }
    
    suggestionsContainer.innerHTML = suggestions.map(suggestion => `
        <div class="suggestion-item" data-coords="${suggestion.coords}">
            <strong>${suggestion.name || ''}</strong><br>
            <small>${suggestion.address}</small>
        </div>
    `).join('');
    
    suggestionsContainer.style.display = 'block';
    
    // Добавляем обработчики клика на подсказки
    suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
            const coords = item.getAttribute('data-coords').split(',').map(Number);
            this.selectSuggestion(coords, item.textContent);
        });
    });
}

// Скрытие подсказок
hideSuggestions() {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    if (suggestionsContainer) {
        suggestionsContainer.style.display = 'none';
    }
}

// Обработка выбора подсказки
selectSuggestion(coords, address) {
    const addressInput = document.getElementById('addressSearch');
    if (addressInput) {
        addressInput.value = address;
    }
    
    this.hideSuggestions();
    
    // Обновляем карту
    if (this.map && this.marker) {
        this.map.setCenter(coords, 15);
        this.marker.geometry.setCoordinates(coords);
        this.updateCoordinates(coords);
    }
}

// Выполнение поиска
performSearch(query) {
    if (!this.searchControl) return;
    
    this.searchControl.search(query).then(() => {
        const results = this.searchControl.getResultsArray();
        if (results.length > 0) {
            const firstResult = results[0];
            const coords = firstResult.geometry.getCoordinates();
            
            this.map.setCenter(coords, 15);
            this.marker.geometry.setCoordinates(coords);
            this.updateCoordinates(coords);
        }
    });
}

    initMap() {
        if (!this.currentCoordinates) return;

        // Инициализация карты
        this.map = new ymaps.Map('mapContainer', {
            center: [this.currentCoordinates.latitude, this.currentCoordinates.longitude],
            zoom: 15,
            controls: ['zoomControl', 'fullscreenControl']
        });

        // Добавляем поиск
        this.searchControl = new ymaps.control.SearchControl({
            options: {
                provider: 'yandex#search',
                noPlacemark: true
            }
        });
        
        this.map.controls.add(this.searchControl);

        // Создаем маркер
        this.marker = new ymaps.Placemark(
            [this.currentCoordinates.latitude, this.currentCoordinates.longitude],
            {
                hintContent: 'Ваше заведение',
                balloonContent: 'Местоположение вашего заведения'
            },
            {
                preset: 'islands#redDotIcon',
                draggable: true
            }
        );

        this.map.geoObjects.add(this.marker);

        // Обработчик перемещения маркера
        this.marker.events.add('dragend', (e) => {
            const coords = this.marker.geometry.getCoordinates();
            this.updateCoordinates(coords);
        });

        // Обработчик клика по карте
        this.map.events.add('click', (e) => {
            const coords = e.get('coords');
            this.marker.geometry.setCoordinates(coords);
            this.updateCoordinates(coords);
        });

        // Обработчик результатов поиска
        this.searchControl.events.add('resultselect', (e) => {
            const results = this.searchControl.getResultsArray();
            const selected = results[e.get('index')];
            const coords = selected.geometry.getCoordinates();
            
            this.marker.geometry.setCoordinates(coords);
            this.map.setCenter(coords, 15);
            this.updateCoordinates(coords);
        });

        // Обновляем отображение координат
        this.updateCoordinatesDisplay();
        this.setupSearch();

    }

    updateCoordinates(coords) {
        this.currentCoordinates = {
            latitude: coords[0],
            longitude: coords[1]
        };
        this.updateCoordinatesDisplay();
    }

    updateCoordinatesDisplay() {
        const latElement = document.getElementById('currentLatitude');
        const lngElement = document.getElementById('currentLongitude');
        
        if (latElement && lngElement && this.currentCoordinates) {
            latElement.textContent = this.currentCoordinates.latitude.toFixed(6);
            lngElement.textContent = this.currentCoordinates.longitude.toFixed(6);
        }
    }

    async saveCoordinates() {
        if (!this.currentCoordinates) {
            this.showNotification('Сначала выберите местоположение на карте', 'error');
            return;
        }

        try {
            const response = await fetch('/api/map-coordinates', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    latitude: this.currentCoordinates.latitude,
                    longitude: this.currentCoordinates.longitude
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.message === 'success') {
                    this.showNotification('Координаты успешно сохранены!', 'success');
                    this.closeMapSettingsModal();
                }
            } else {
                throw new Error('Ошибка сохранения');
            }
        } catch (error) {
            console.error('Ошибка сохранения координат:', error);
            this.showNotification('Ошибка сохранения координат', 'error');
        }
    }

    showNotification(message, type) {
        if (typeof notificationSettings !== 'undefined' && notificationSettings.showNotification) {
            notificationSettings.showNotification(message, type);
        } else {
            alert(message);
        }
    }
}

// Инициализация менеджеров
let notificationSettings;
let contentManager;

function loadSettingsSection() {
    const contentContainer = document.getElementById('contentContainer');
    contentContainer.innerHTML = `
        <div class="settings-management">
            <div class="settings-header">
                <h2>Настройки оператора</h2>
            </div>
            
            <div class="settings-cards">
                <div class="setting-card">
                    <h3>🔔 Уведомления для мастеров</h3>
                    <p>Настройте Telegram уведомления для каждого мастера</p>
                    <button id="openNotificationsBtn" class="setting-btn">
                        ⚙️ Настроить уведомления
                    </button>
                </div>
                
                <div class="setting-card">
                    <h3>📱 Управление содержимым</h3>
                    <p>Управляйте видимостью блоков на сайте</p>
                    <button id="openContentSettingsBtn" class="setting-btn">
                        ⚙️ Управление контентом
                    </button>
                </div>

                <div class="setting-card">
                    <h3>✏️ Тексты и ссылки</h3>
                    <p>Редактируйте тексты на сайте и контактные ссылки</p>
                    <button id="openTextSettingsBtn" class="setting-btn">
                        ⚙️ Редактировать контент
                    </button>
                </div>
                
                <div class="setting-card">
                    <h3>🗺️ Ваше заведение на карте</h3>
                    <p>Установите местоположение вашего заведения на карте</p>
                    <button id="openMapSettingsBtn" class="setting-btn">
                        ⚙️ Настроить карту
                    </button>
                </div>

                <div class="setting-card">
                    <h3>🖼️ Фото по умолчанию</h3>
                    <p>Установите фото по умолчанию для мастеров и услуг</p>
                    <button id="openPhotoSettingsBtn" class="setting-btn">
                        ⚙️ Управление фото
                    </button>
                </div>
            </div>
        </div>



                <div id="mapSettingsModal" class="modal" style="display: none;">
            <div class="modaal-content map-settings">
                <div class="modal-header">
                    <h3>🗺️ Настройка местоположения на карте</h3>
                    <button id="closeMapSettingsModal" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="map-instructions">
                        <h4>Как установить местоположение:</h4>
                        <ol>
                            <li>Введите адрес в поле поиска или</li>
                            <li>Кликните на карте в нужном месте или</li>
                            <li>Перетащите маркер в нужное место</li>
                        </ol>
                    </div>
                    
                    <div class="coordinates-display">
                        <p><strong>Текущие координаты:</strong></p>
                        <p>Широта: <span id="currentLatitude">--</span></p>
                        <p>Долгота: <span id="currentLongitude">--</span></p>
                    </div>
                    <div class="address-search">
                        <input type="text" 
                            id="addressSearch" 
                            class="address-input" 
                            placeholder="Введите адрес для поиска..."
                            autocomplete="off">
                        <div id="searchSuggestions" class="search-suggestions" style="display: none;"></div>
                    </div>
                    
                    <div id="mapContainer" class="map-container"></div>
                    
                    <button onclick="mapSettingsManager.saveCoordinates()" class="confirm-location-btn">
                        ✅ Подтвердить местоположение
                    </button>
                </div>
            </div>
        </div>
        <!-- Модальное окно для редактирования текстов и ссылок -->
        <div id="textSettingsModal" class="modal" style="display: none;">
            <div class="modaal-content text-settings-content">
                <div class="modal-header">
                    <h3>✏️ Редактирование текстов и ссылок</h3>
                    <button id="closeTextSettingsModal" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="contentTextSettings">
                        <div class="loading">Загрузка контента...</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Модальное окно для настроек уведомлений -->
        <div id="notificationsModal" class="modal" style="display: none;">
            <div class="modaal-content">
                <div class="modal-header">
                    <h3>🔔 Настройка Telegram уведомлений</h3>
                    <button id="closeNotificationsModal" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="notifications-help">
                        <h4>Как получить Telegram ID мастера:</h4>
                        <ol>
                            <li>Попросите мастера написать боту: @your_bot_username</li>
                            <li>Используйте команду /id в боте чтобы получить ID</li>
                            <li>Введите полученный ID в поле ниже</li>
                        </ol>
                    </div>
                    
                    <div class="masters-notifications-list" id="mastersNotificationsList">
                        <div class="loading">Загрузка мастеров...</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div id="photoSettingsModal" class="modal" style="display: none;">
            <div class="modaal-content photo-settings">
                <div class="modal-header">
                    <h3>🖼️ Управление фото по умолчанию</h3>
                    <button id="closePhotoSettingsModal" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="photo-settings-grid">
                        <div class="photo-setting-item">
                            <h4>Фото мастера по умолчанию</h4>
                            <div class="photo-upload-area">
                                <img id="defaultMasterPreview" class="default-photo-preview" 
                                    style="display: none; max-width: 200px; max-height: 200px;">
                                <input type="file" id="masterDefaultPhoto" 
                                    accept="image/*" class="photo-input">
                                <label for="masterDefaultPhoto" class="photo-upload-btn">
                                    📸 Выбрать фото
                                </label>
                                <small>Рекомендуемый размер: 400x400px</small>
                            </div>
                        </div>
                        <div class="photo-setting-item">
                            <h4>Фото в контактах</h4>
                            <div class="photo-upload-area">
                                <img id="adminPhotoPreview" class="default-photo-preview" 
                                    style="display: none; max-width: 200px; max-height: 200px;">
                                <input type="file" id="adminPhotoUpload" 
                                    accept="image/*" class="photo-input">
                                <label for="adminPhotoUpload" class="photo-upload-btn">
                                    📸 Выбрать фото
                                </label>
                                <small>Рекомендуемый размер: 400x400px</small>
                            </div>
                        </div>
                        <div class="photo-setting-item">
                            <h4>Фото услуги по умолчанию</h4>
                            <div class="photo-upload-area">
                                <img id="defaultServicePreview" class="default-photo-preview" 
                                    style="display: none; max-width: 200px; max-height: 200px;">
                                <input type="file" id="serviceDefaultPhoto" 
                                    accept="image/*" class="photo-input">
                                <label for="serviceDefaultPhoto" class="photo-upload-btn">
                                    📸 Выбрать фото
                                </label>
                                <small>Рекомендуемый размер: 400x300px</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Модальное окно для управления контентом -->
        <div id="contentSettingsModal" class="modal" style="display: none;">
            <div class="modaal-content">
                <div class="modal-header">
                    <h3>📱 Управление содержимым сайта</h3>
                    <button id="closeContentSettingsModal" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="contentVisibilitySettings">
                        <div class="loading">Загрузка настроек...</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Инициализация менеджеров
    notificationSettings = new NotificationSettingsManager();
    contentManager = new ContentManager();
    mapSettingsManager = new MapSettingsManager();

    // Обработчики событий - добавляем после инициализации
    document.getElementById('openTextSettingsBtn')?.addEventListener('click', () => {
        contentManager.openTextSettingsModal();
    });

    document.getElementById('closeTextSettingsModal')?.addEventListener('click', () => {
        contentManager.closeTextSettingsModal();
    });
}
let mapSettingsManager;