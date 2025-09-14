// statistics.js - менеджер статистики
class StatisticsManager {
    constructor() {
        this.currentView = 'revenue';
        this.dateRange = 'all';
        this.startDate = '';
        this.endDate = '';
        this.selectedMaster = '';
        this.selectedService = '';
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadInitialData();
    }

    async loadInitialData() {
        await this.loadMasters();
        await this.loadServices();
        await this.loadStatistics();
    }

    async loadMasters() {
        try {
            const response = await fetch('/api/specialists-all');
            if (response.ok) {
                const data = await response.json();
                if (data.message === 'success') {
                    this.masters = data.data;
                    this.updateMastersDropdown();
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки мастеров:', error);
        }
    }

    async loadServices() {
        try {
            const response = await fetch('/api/services-all');
            if (response.ok) {
                const data = await response.json();
                if (data.message === 'success') {
                    this.services = data.data;
                    this.updateServicesDropdown();
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки услуг:', error);
        }
    }

    updateMastersDropdown() {
        const select = document.getElementById('masterSelect');
        if (select && this.masters) {
            select.innerHTML = '<option value="">Все мастера</option>' +
                this.masters.map(master => 
                    `<option value="${master.id}">${master.имя}</option>`
                ).join('');
        }
    }

    updateServicesDropdown() {
        const select = document.getElementById('serviceSelect');
        if (select && this.services) {
            select.innerHTML = '<option value="">Все услуги</option>' +
                this.services.map(service => 
                    `<option value="${service.id}">${service.название}</option>`
                ).join('');
        }
    }

async loadStatistics() {
    try {
        this.showLoading();
        
        let url = '/api/statistics?';
        const params = [];

        if (this.dateRange !== 'custom') {
            params.push(`range=${this.dateRange}`);
        } else if (this.startDate && this.endDate) {
            params.push(`range=custom`);
            params.push(`startDate=${this.startDate}`);
            params.push(`endDate=${this.endDate}`);
        }

        // Добавляем фильтры
        if (this.selectedMaster) {
            params.push(`masterId=${this.selectedMaster}`);
        }

        if (this.selectedService) {
            params.push(`serviceId=${this.selectedService}`);
        }

        if (params.length > 0) {
            url += params.join('&');
        }

        const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                if (data.message === 'success') {
                    this.displayStatistics(data.data);
                }
            } else {
                throw new Error('Ошибка загрузки статистики');
            }
 } catch (error) {
        console.error('Ошибка:', error);
        this.showError('Не удалось загрузить статистику');
    } finally {
        this.hideLoading();
    }
}

displayStatistics(data) {
    const container = document.getElementById('statisticsContent');
    if (!container) return;

    let html = this.getPeriodInfoHTML();
    
    if (this.currentView === 'revenue') {
        html += this.renderRevenueStats(data);
    } else if (this.currentView === 'masters') {
        html += this.renderMastersStats(data);
    } else if (this.currentView === 'services') {
        html += this.renderServicesStats(data);
    }

    container.innerHTML = html;
}

getPeriodInfoHTML() {
    let periodText = '';
    
    if (this.dateRange === 'today') {
        const today = new Date().toLocaleDateString('ru-RU');
        periodText = `За сегодня (${today})`;
    } else if (this.dateRange === 'week') {
        const today = new Date();
        const monday = new Date(today);
        monday.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
        periodText = `За текущую неделю (с ${monday.toLocaleDateString('ru-RU')} по ${today.toLocaleDateString('ru-RU')})`;
    } else if (this.dateRange === 'month') {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        periodText = `За текущий месяц (с ${firstDay.toLocaleDateString('ru-RU')} по ${today.toLocaleDateString('ru-RU')})`;
    } else if (this.dateRange === 'custom' && this.startDate && this.endDate) {
        const start = new Date(this.startDate).toLocaleDateString('ru-RU');
        const end = new Date(this.endDate).toLocaleDateString('ru-RU');
        periodText = `За выбранный период (с ${start} по ${end})`;
    } else {
        periodText = 'За все время';
    }
    
    return `
        <div class="stats-info">
            <p>Показывается статистика: <span class="stats-period-display">${periodText}</span></p>
        </div>
    `;
}

    renderRevenueStats(data) {
        return `
            <div class="stats-overview">
                <div class="stat-card">
                    <h3>Общая выручка</h3>
                    <div class="stat-value">${data.totalRevenue || 0} ₽</div>
                </div>
                <div class="stat-card">
                    <h3>Количество записей</h3>
                    <div class="stat-value">${data.totalAppointments || 0}</div>
                </div>
                <div class="stat-card">
                    <h3>Средняя выручка в день</h3>
                    <div class="stat-value">${data.dailyAverage || 0} ₽</div>
                </div>
            </div>

            ${data.byService ? `
            <div class="stats-details">
                <h3>По услугам</h3>
                <div class="stats-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Услуга</th>
                                <th>Количество</th>
                                <th>Выручка</th>
                                <th>Доля</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.byService.map(service => `
                                <tr>
                                    <td>${service.название}</td>
                                    <td>${service.count}</td>
                                    <td>${service.revenue} ₽</td>
                                    <td>${service.percentage}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            ` : ''}

            ${data.byMaster ? `
            <div class="stats-details">
                <h3>По мастерам</h3>
                <div class="stats-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Мастер</th>
                                <th>Количество</th>
                                <th>Выручка</th>
                                <th>Доля</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.byMaster.map(master => `
                                <tr>
                                    <td>${master.имя}</td>
                                    <td>${master.count}</td>
                                    <td>${master.revenue} ₽</td>
                                    <td>${master.percentage}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            ` : ''}
        `;
    }

    renderMastersStats(data) {
        if (!data.masters) return '<p>Нет данных по мастерам</p>';

        return `
            <div class="stats-overview">
                <div class="stat-card">
                    <h3>Всего мастеров</h3>
                    <div class="stat-value">${data.totalMasters || 0}</div>
                </div>
                <div class="stat-card">
                    <h3>Активных мастеров</h3>
                    <div class="stat-value">${data.activeMasters || 0}</div>
                </div>
            </div>

            <div class="stats-details">
                <h3>Статистика по мастерам</h3>
                <div class="stats-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Мастер</th>
                                <th>Записей</th>
                                <th>Выручка</th>
                                <th>Средняя выручка в день</th>
                                <th>Статус</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.masters.map(master => `
                                <tr>
                                    <td>${master.имя}</td>
                                    <td>${master.appointmentsCount}</td>
                                    <td>${master.revenue} ₽</td>
                                    <td>${master.dailyAverage} ₽</td>
                                    <td>${master.доступен === 1 ? 'Активен' : 'Скрыт'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderServicesStats(data) {
        if (!data.services) return '<p>Нет данных по услугам</p>';

        return `
            <div class="stats-overview">
                <div class="stat-card">
                    <h3>Всего услуг</h3>
                    <div class="stat-value">${data.totalServices || 0}</div>
                </div>
                <div class="stat-card">
                    <h3>Активных услуг</h3>
                    <div class="stat-value">${data.activeServices || 0}</div>
                </div>
            </div>

            <div class="stats-details">
                <h3>Статистика по услугам</h3>
                <div class="stats-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Услуга</th>
                                <th>Категория</th>
                                <th>Записей</th>
                                <th>Выручка</th>
                                <th>Цена</th>
                                <th>Статус</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.services.map(service => `
                                <tr>
                                    <td>${service.название}</td>
                                    <td>${service.категория}</td>
                                    <td>${service.appointmentsCount}</td>
                                    <td>${service.revenue} ₽</td>
                                    <td>${service.цена} ₽</td>
                                    <td>${service.доступен === 1 ? 'Активна' : 'Скрыта'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

setupEventListeners() {
    // Переключение вкладок статистики
    document.querySelectorAll('.stats-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            this.currentView = e.target.dataset.view;
            this.updateActiveTab();
            this.loadStatistics();
        });
    });

    // Кнопки периода
    document.querySelectorAll('.period-btn[data-range]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.period-btn[data-range]').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            this.dateRange = e.target.dataset.range;
            this.toggleCustomDateRange();
            this.loadStatistics();
        });
    });

    // Переключение типа статистики
    document.querySelectorAll('.period-btn[data-view]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.period-btn[data-view]').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            this.currentView = e.target.dataset.view;
            this.loadStatistics();
        });
    });

    // Пользовательский диапазон дат
    document.getElementById('applyCustomRange')?.addEventListener('click', () => {
        this.startDate = document.getElementById('startDate').value;
        this.endDate = document.getElementById('endDate').value;
        if (this.startDate && this.endDate) {
            this.loadStatistics();
        } else {
            alert('Пожалуйста, выберите обе даты');
        }
    });
}

toggleCustomDateRange() {
    const customRange = document.getElementById('customDateRange');
    if (this.dateRange === 'custom') {
        customRange.style.display = 'block';
    } else {
        customRange.style.display = 'none';
    }
}

    showLoading() {
        const container = document.getElementById('statisticsContent');
        if (container) {
            container.innerHTML = `
                <div class="loading" style="text-align: center; padding: 2rem;">
                    <div class="spinner"></div>
                    <p>Загрузка статистики...</p>
                </div>
            `;
        }
    }

    showError(message) {
        const container = document.getElementById('statisticsContent');
        if (container) {
            container.innerHTML = `
                <div class="error" style="text-align: center; padding: 2rem; color: #e74c3c;">
                    <h3>Ошибка</h3>
                    <p>${message}</p>
                    <button onclick="statisticsManager.loadStatistics()" class="btn btn-primary">
                        ⟳ Попробовать снова
                    </button>
                </div>
            `;
        }
    }

    hideLoading() {
        // Скрытие спиннера происходит автоматически при отображении данных
    }
}

// Глобальная переменная для менеджера статистики
let statisticsManager;

// Функция для загрузки раздела статистики
// В функции loadStatisticsSection обновите HTML для фильтров
function loadStatisticsSection() {
    const contentContainer = document.getElementById('contentContainer');
    contentContainer.innerHTML = `
        <div class="settings-management">
            <div class="settings-header">
                <h2>📊 Статистика и аналитика</h2>
                <p class="stats-subtitle">Статистика по всем мастерам и услугам</p>
            </div>
            
            <div class="statistics-controls">
                <div class="stats-filters">
                    <div class="filter-group">
                        <label>Период:</label>
                        <div class="period-buttons">
                            <button class="period-btn active" data-range="all">Все время</button>
                            <button class="period-btn" data-range="today">Сегодня</button>
                            <button class="period-btn" data-range="week">Текущая неделя</button>
                            <button class="period-btn" data-range="month">Текущий месяц</button>
                            <button class="period-btn" data-range="custom">Произвольный период</button>
                        </div>
                    </div>
                    
                    <div id="customDateRange" class="filter-group custom-range" style="display: none;">
                        <div class="date-inputs">
                            <div class="date-input-group">
                                <label>С:</label>
                                <input type="date" id="startDate" class="form-control">
                            </div>
                            <div class="date-input-group">
                                <label>По:</label>
                                <input type="date" id="endDate" class="form-control">
                            </div>
                            <button id="applyCustomRange" class="btn btn-primary">Применить</button>
                        </div>
                    </div>
                    

                </div>
            </div>
            
            <div id="statisticsContent" class="statistics-content">
                <div class="loading">
                    <div class="spinner"></div>
                    <p>Загрузка статистики...</p>
                </div>
            </div>
        </div>
    `;
    
    // Инициализация менеджера статистики
    statisticsManager = new StatisticsManager();
}

// Добавляем пункт меню в настройки
function addStatisticsMenuItem() {
    const menuContainer = document.querySelector('.settings-menu');
    if (menuContainer) {
        const menuItem = document.createElement('div');
        menuItem.className = 'menu-item';
        menuItem.innerHTML = `
            <div class="menu-icon">📊</div>
            <div class="menu-text">Статистика</div>
        `;
        menuItem.addEventListener('click', () => {
            // Убираем активный класс у всех пунктов
            document.querySelectorAll('.menu-item').forEach(item => {
                item.classList.remove('active');
            });
            // Добавляем активный класс текущему пункту
            menuItem.classList.add('active');
            
            loadStatisticsSection();
        });
        
        menuContainer.appendChild(menuItem);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    addStatisticsMenuItem();
});