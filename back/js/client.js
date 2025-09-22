class ClientsManager {
    constructor() {
        this.clients = [];
        this.sortField = 'totalPrice';
        this.sortDirection = 'desc';
        this.init();
    }

    init() {
        this.loadClients();
        this.setupEventListeners();
    }

    async loadClients() {
        try {
            this.showLoading();
            const response = await fetch('/api/clients-with-stats');
            
            if (!response.ok) {
                throw new Error('Ошибка загрузки клиентов');
            }
            
            const data = await response.json();
            
            if (data.message === 'success') {
                this.clients = data.data;
                this.displayClients();
            } else {
                throw new Error(data.error || 'Ошибка загрузки данных');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            this.showError('Не удалось загрузить список клиентов');
        }
    }

    displayClients() {
        const container = document.getElementById('clientsContainer');
        
        if (!this.clients || this.clients.length === 0) {
            container.innerHTML = `
                <div class="no-clients">
                    <h3>Клиентов пока нет</h3>
                    <p>Клиенты появятся после первых записей</p>
                </div>
            `;
            return;
        }

        // Сортируем клиентов
        const sortedClients = this.sortClients();
        
        const tableHTML = `
            <div class="clients-table-container">
                <table class="clients-table">
                    <thead>
                        <tr>
                            <th onclick="clientsManager.sortBy('name')" class="${this.getSortClass('name')}">
                                Клиент
                            </th>
                            <th onclick="clientsManager.sortBy('phone')" class="${this.getSortClass('phone')}">
                                Телефон
                            </th>
                            <th onclick="clientsManager.sortBy('recordsCount')" class="${this.getSortClass('recordsCount')}">
                                Записей
                            </th>
                            <th onclick="clientsManager.sortBy('totalPrice')" class="${this.getSortClass('totalPrice')}">
                                Общая стоимость
                            </th>
                            <th onclick="clientsManager.sortBy('lastDate')" class="${this.getSortClass('lastDate')}">
                                Последняя запись
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedClients.map((client, index) => this.createClientRow(client, index)).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = tableHTML;
    }

    createClientRow(client, index) {
        const rowClass = index % 2 === 0 ? 'even' : 'odd';

        
        return `
            <tr class="client-row ${rowClass}" data-client-id="${client.id}" onclick="clientsManager.showClientDetails(${client.id})">
                <td>
                    <div class="client-info">
                        <span class="client-name">${client.имя || 'Не указано'} </span>
                    </div>
                </td>
                <td>
                    <span class="client-phone">${this.formatPhone(client.телефон)}</span>
                </td>
                <td class="stats-value records-count">${client.recordsCount || 0}</td>
                <td class="stats-value total-price">${client.totalPrice || 0} ₽</td>
                <td class="stats-value last-date">${client.lastDate ? this.formatDate(client.lastDate) : 'Нет записей'}</td>
            </tr>
        `;
    }

    formatPhone(phone) {
        if (!phone) return 'Не указан';
        // Форматируем телефон в формат +7 (XXX) XXX-XX-XX
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 11 && cleaned.startsWith('7')) {
            return `+7 (${cleaned.substring(1, 4)}) ${cleaned.substring(4, 7)}-${cleaned.substring(7, 9)}-${cleaned.substring(9)}`;
        }
        if (cleaned.length === 10) {
            return `+7 (${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6, 8)}-${cleaned.substring(8)}`;
        }
        return phone;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

sortClients(clients = this.clients) {
    return [...clients].sort((a, b) => {
            let valueA, valueB;
            
            switch (this.sortField) {
                case 'name':
                    valueA = (a.имя || '').toLowerCase();
                    valueB = (b.имя || '').toLowerCase();
                    break;
                case 'phone':
                    valueA = a.телефон || '';
                    valueB = b.телефон || '';
                    break;
                case 'recordsCount':
                    valueA = a.recordsCount || 0;
                    valueB = b.recordsCount || 0;
                    break;
                case 'totalPrice':
                    valueA = a.totalPrice || 0;
                    valueB = b.totalPrice || 0;
                    break;
                case 'lastDate':
                    valueA = a.lastDate ? new Date(a.lastDate).getTime() : 0;
                    valueB = b.lastDate ? new Date(b.lastDate).getTime() : 0;
                    break;
                default:
                    return 0;
            }
            
            if (valueA < valueB) {
                return this.sortDirection === 'asc' ? -1 : 1;
            }
            if (valueA > valueB) {
                return this.sortDirection === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }

    sortBy(field) {
        if (this.sortField === field) {
            // Меняем направление сортировки
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            // Новая сортировка
            this.sortField = field;
            this.sortDirection = 'desc';
        }
        
        this.displayClients();
    }

    getSortClass(field) {
        if (this.sortField === field) {
            return this.sortDirection === 'asc' ? 'sort-asc' : 'sort-desc';
        }
        return '';
    }

// В методе showClientDetails
// В методе showClientDetails
async showClientDetails(clientId) {
    try {
        this.showModalLoading();
        
        const response = await fetch(`/api/client/${clientId}/appointments`);
        
        if (!response.ok) {
            throw new Error('Ошибка загрузки данных клиента');
        }
        
        const data = await response.json();
        
        if (data.message === 'success') {
            this.displayClientDetails(data.data);
        } else {
            throw new Error(data.error || 'Ошибка загрузки данных');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showError('Не удалось загрузить информацию о клиенте');
        this.hideModal();
    }
}

    displayClientDetails(clientData) {
        const modal = document.getElementById('clientModal');
        const modalContent = document.getElementById('clientModalContent');
        
        const appointmentsHTML = clientData.appointments && clientData.appointments.length > 0
            ? clientData.appointments.map(appointment => `
                <tr>
                    <td class="appointment-date">${this.formatDate(appointment.дата)}</td>
                    <td class="appointment-time">${appointment.время}</td>
                    <td>
                        <div class="appointment-service">${appointment.услуга_название}</div>
                        <div class="appointment-specialist">Мастер: ${appointment.мастер_имя}</div>
                    </td>
                    <td class="appointment-price">${appointment.цена} ₽</td>
                </tr>
            `).join('')
            : `<tr><td colspan="4" class="no-appointments">Нет записей</td></tr>`;

        modalContent.innerHTML = `
            <button class="close-modal" onclick="clientsManager.hideModal()">×</button>
            
            <div class="client-details-header">
                <h2 class="client-details-name">${clientData.имя || 'Не указано'}</h2>
                <p class="client-details-phone">${this.formatPhone(clientData.телефон)}</p>
            </div>
            
            <div class="client-stats">
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem;">
                    <div style="text-align: center; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: #3498db;">${clientData.recordsCount || 0}</div>
                        <div style="color: #7f8c8d;">Всего записей</div>
                    </div>
                    <div style="text-align: center; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: #27ae60;">${clientData.totalPrice || 0} ₽</div>
                        <div style="color: #7f8c8d;">Общая стоимость</div>
                    </div>
                    <div style="text-align: center; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                        <div style="font-size: 1.2rem; font-weight: bold; color: #e67e22;">${clientData.lastDate ? this.formatDate(clientData.lastDate) : 'Нет'}</div>
                        <div style="color: #7f8c8d;">Последняя запись</div>
                    </div>
                </div>
            </div>
            
            <div class="client-appointments">
                <h3>История записей</h3>
                <table class="appointments-table">
                    <thead>
                        <tr>
                            <th>Дата</th>
                            <th>Время</th>
                            <th>Услуга и мастер</th>
                            <th>Цена</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${appointmentsHTML}
                    </tbody>
                </table>
            </div>
        `;

        modal.style.display = 'block';
    }

    hideModal() {
        document.getElementById('clientModal').style.display = 'none';
    }

    showModalLoading() {
        const modal = document.getElementById('clientModal');
        const modalContent = document.getElementById('clientModalContent');
        
        modalContent.innerHTML = `
            <button class="close-modal" onclick="clientsManager.hideModal()">×</button>
            <div style="text-align: center; padding: 3rem;">
                <div class="spinner"></div>
                <p>Загрузка данных клиента...</p>
            </div>
        `;
        
        modal.style.display = 'block';
    }

    showLoading() {
        const container = document.getElementById('clientsContainer');
        container.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Загрузка клиентов...</p>
            </div>
        `;
    }

    showError(message) {
        const container = document.getElementById('clientsContainer');
        container.innerHTML = `
            <div class="error">
                <h3>Ошибка</h3>
                <p>${message}</p>
                <button onclick="clientsManager.loadClients()" class="btn btn-primary">
                    ⟳ Попробовать снова
                </button>
            </div>
        `;
    }

    setupEventListeners() {
        // Закрытие модального окна при клике вне его
        document.getElementById('clientModal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('clientModal')) {
                this.hideModal();
            }
        });

        // Закрытие модального окна по ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideModal();
            }
        });
    }


setupSearch() {
    const searchInput = document.getElementById('clientSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            this.filterClients(e.target.value);
        });
    }
}

filterClients(searchTerm) {
    if (!searchTerm.trim()) {
        this.displayClients();
        return;
    }

    const filteredClients = this.clients.filter(client => {
        const nameMatch = client.имя && client.имя.toLowerCase().includes(searchTerm.toLowerCase());
        const phoneMatch = client.телефон && client.телефон.includes(searchTerm);
        return nameMatch || phoneMatch;
    });

    this.displayFilteredClients(filteredClients);
}

displayFilteredClients(filteredClients) {
    const container = document.getElementById('clientsContainer');
    
    if (filteredClients.length === 0) {
        container.innerHTML = `
            <div class="no-clients">
                <h3>Клиенты не найдены</h3>
                <p>Попробуйте изменить поисковый запрос</p>
            </div>
        `;
        return;
    }

    const sortedClients = this.sortClients(filteredClients); // ← передаем filteredClients

    const tableHTML = `
        <div class="clients-table-container">
            <table class="clients-table">
                <thead>
                    <tr>
                        <th onclick="clientsManager.sortBy('name')" class="${this.getSortClass('name')}">
                            Клиент
                        </th>
                        <th onclick="clientsManager.sortBy('phone')" class="${this.getSortClass('phone')}">
                            Телефон
                        </th>
                        <th onclick="clientsManager.sortBy('recordsCount')" class="${this.getSortClass('recordsCount')}">
                            Записей
                        </th>
                        <th onclick="clientsManager.sortBy('totalPrice')" class="${this.getSortClass('totalPrice')}">
                            Общая стоимость
                        </th>
                        <th onclick="clientsManager.sortBy('lastDate')" class="${this.getSortClass('lastDate')}">
                            Последняя запись
                        </th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedClients.map((client, index) => this.createClientRow(client, index)).join('')}
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = tableHTML;
}

// В методе init добавьте вызов setupSearch
init() {
    this.loadClients();
    this.setupEventListeners();
    this.setupSearch(); // ← добавьте эту строку
}
}

// Инициализация менеджера клиентов
let clientsManager;

// Функция для загрузки раздела клиентов
// В функции loadClientsSection обновите HTML для добавления поиска
function loadClientsSection() {
    const contentContainer = document.getElementById('contentContainer');
    contentContainer.innerHTML = `
        <div class="clients-management">
            <div class="clients-header">
                <h2>Управление клиентами</h2>
                <div class="clients-search">
                    <div class="search-group">
                        <input type="text" id="clientSearch" placeholder="Поиск по имени или телефону..." class="search-input">
                        <span class="search-icon">🔍</span>
                    </div>
                </div>
                <div class="clients-filters">
                    <div class="filter-group">
                        <label>Сортировка по:</label>
                        <select id="sortField" class="filter-select" onchange="clientsManager.sortBy(this.value)">
                            <option value="totalPrice">Общей стоимости</option>
                            <option value="recordsCount">Количеству записей</option>
                            <option value="lastDate">Дате последней записи</option>
                            <option value="name">Имени</option>
                            <option value="phone">Телефону</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Порядок:</label>
                        <select id="sortDirection" class="filter-select" onchange="clientsManager.changeSortDirection(this.value)">
                            <option value="desc">По убыванию</option>
                            <option value="asc">По возрастанию</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div id="clientsContainer">
                <div class="loading">
                    <div class="spinner"></div>
                    <p>Загрузка клиентов...</p>
                </div>
            </div>
        </div>
        
        <!-- Модальное окно для деталей клиента -->
        <div id="clientModal" class="client-modal">
            <div id="clientModalContent" class="client-modal-content"></div>
        </div>
        
        <style>
            .spinner {
                border: 3px solid #f3f3f3;
                border-top: 3px solid #3498db;
                border-radius: 50%;
                width: 30px;
                height: 30px;
                animation: spin 1s linear infinite;
                margin: 0 auto 1rem;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .btn {
                padding: 0.5rem 1rem;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            }
            
            .btn-primary {
                background-color: #3498db;
                color: white;
            }
            
            .btn-primary:hover {
                background-color: #2980b9;
            }
            
            .client-row.even {
                background-color: #fafafa;
            }
            
            .client-row.odd {
                background-color: white;
            }
            
            /* Стили для поиска */
            .clients-search {
                margin-bottom: 1rem;
            }
            
            .search-group {
                position: relative;
                max-width: 400px;
            }
            
            .search-input {
                width: 100%;
                padding: 0.75rem 1rem 0.75rem 3rem;
                border: 2px solid #ddd;
                border-radius: 8px;
                font-size: 16px;
                transition: border-color 0.3s ease;
            }
            
            .search-input:focus {
                outline: none;
                border-color: #3498db;
                box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
            }
            
            .search-icon {
                position: absolute;
                left: 1rem;
                top: 50%;
                transform: translateY(-50%);
                color: #7f8c8d;
            }
        </style>
    `;

    // Инициализируем менеджер клиентов
    clientsManager = new ClientsManager();
    
    // Добавляем методы для работы с select
    clientsManager.changeSortDirection = function(direction) {
        this.sortDirection = direction;
        this.displayClients();
    };
}