// setting.js
class NotificationSettingsManager {
    constructor() {
        this.masters = [];
        this.init();
    }

    async init() {
        await this.loadMasters();
        this.setupEventListeners();
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
                    // Обновляем данные мастера в локальном массиве
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

    showNotification(message, type = 'info') {
        // Создаем уведомление
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

        // Удаляем через 3 секунды
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    setupEventListeners() {
        // Обработчик для кнопки открытия настроек
        document.getElementById('openNotificationsBtn')?.addEventListener('click', () => {
            this.openNotificationsModal();
        });

        // Обработчик для закрытия модального окна
        document.getElementById('closeNotificationsModal')?.addEventListener('click', () => {
            this.closeNotificationsModal();
        });

        // Сохранение по Enter
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
            this.loadMasters(); // Перезагружаем данные при открытии
        }
    }

    closeNotificationsModal() {
        const modal = document.getElementById('notificationsModal');
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
                

            </div>
        </div>

        <!-- Модальное окно для настроек уведомлений -->
        <div id="notificationsModal" class="modal" style="display: none;">
            <div class="modal-content">
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
    `;

    // Инициализируем менеджер уведомлений
    notificationSettings = new NotificationSettingsManager();
}



