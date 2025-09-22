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


// В методе updateSetting
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

// В методе saveTgId
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

// В методе uploadDefaultPhoto
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

// В методе handleDefaultPhotoUpload
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

async loadDefaultPhotos() {
    // Загружаем текущие фото по умолчанию
    try {
        const masterResponse = await fetch('/photo/работники/default.jpg');
        const masterPreview = document.getElementById('defaultMasterPreview');
        if (masterPreview && masterResponse.ok) {
            masterPreview.style.display = 'block';
        }
        
        const serviceResponse = await fetch('/photo/услуги/default.jpg');
        const servicePreview = document.getElementById('defaultServicePreview');
        if (servicePreview && serviceResponse.ok) {
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






// Инициализация менеджера уведомлений
let notificationSettings;

// Функция для загрузки раздела настроек
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
                    <h3>🖼️ Фото по умолчанию</h3>
                    <p>Установите фото по умолчанию для мастеров и услуг</p>
                    <button id="openPhotoSettingsBtn" class="setting-btn">
                        ⚙️ Управление фото
                    </button>
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
                                    📸 Выбрать фото мастера
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
                                    📸 Выбрать фото услуги
                                </label>
                                <small>Рекомендуемый размер: 400x300px</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <style>
            .photo-settings .modaal-content {
                max-width: 800px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            }
            
            .photo-settings-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 2rem;
                padding: 1rem 0;
            }
            
            .photo-setting-item {
                text-align: center;
            }
            
            .photo-setting-item h4 {
                margin: 0 0 1rem 0;
                color: #2c3e50;
            }
            
            .photo-upload-area {
                border: 2px dashed #ddd;
                border-radius: 8px;
                padding: 1.5rem;
                transition: border-color 0.3s ease;
            }
            
            .photo-upload-area:hover {
                border-color: #3498db;
            }
            
            .default-photo-preview {
                margin-bottom: 1rem;
                border-radius: 8px;
                object-fit: cover;
            }
            
            .photo-input {
                display: none;
            }
            
            .photo-upload-btn {
                display: inline-block;
                background: #3498db;
                color: white;
                padding: 0.75rem 1.5rem;
                border-radius: 6px;
                cursor: pointer;
                transition: background 0.3s ease;
                margin-bottom: 0.5rem;
            }
            
            .photo-upload-btn:hover {
                background: #2980b9;
            }
            
            .photo-settings small {
                display: block;
                color: #7f8c8d;
                font-size: 0.8rem;
            }
            
            @media (max-width: 768px) {
                .photo-settings-grid {
                    grid-template-columns: 1fr;
                }
                
                .photo-settings .modaal-content {
                    margin: 1rem;
                    width: calc(100% - 2rem);
                }
            }
        </style>
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

    // Инициализируем менеджер уведомлений
    notificationSettings = new NotificationSettingsManager();
}