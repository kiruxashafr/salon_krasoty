class ScheduleManager {
    constructor() {
        this.currentView = 'specialist';
        this.currentType = 'appointments';
        this.selectedSpecialistId = null;
        this.startDate = null;
        this.endDate = null;
        this.specialists = [];
        this.autoUpdateInterval = null;
        this.currentPeriod = 'week';
        this.isLoading = false; // Добавляем флаг загрузки
        this.init();
    }

    async init() {
        try {
            await this.loadSpecialists();
            this.setupEventListeners();
            this.setDefaultDates();
            await this.loadSchedule(); // Добавляем await
        } catch (error) {
            console.error('Ошибка инициализации ScheduleManager:', error);
            this.showError('Ошибка загрузки расписания');
        }
    }

    // Добавляем метод для предотвращения множественных загрузок
    async safeLoadSchedule() {
        if (this.isLoading) {
            console.log('Загрузка уже выполняется, пропускаем...');
            return;
        }
        
        this.isLoading = true;
        try {
            await this.loadSchedule();
        } catch (error) {
            console.error('Ошибка загрузки расписания:', error);
        } finally {
            this.isLoading = false;
        }
    }

    startAutoUpdate() {
        if (this.autoUpdateInterval) {
            clearInterval(this.autoUpdateInterval);
        }
        
        this.autoUpdateInterval = setInterval(() => {
            this.safeLoadSchedule(); // Используем безопасную загрузку
        }, 30000);
    }

    async loadSpecialists() {
        try {
            console.log('Загрузка списка мастеров...');
            const response = await fetch('/api/specialists');
            if (response.ok) {
                const data = await response.json();
                if (data.message === 'success') {
                    this.specialists = data.data;
                    console.log(`Загружено мастеров: ${this.specialists.length}`);
                    this.updateUI();
                }
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('Ошибка загрузки мастеров:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Убедимся, что элементы существуют перед добавлением обработчиков
        setTimeout(() => {
            const appointmentsType = document.getElementById('appointmentsType');
            const freetimeType = document.getElementById('freetimeType');
            const specialistSelect = document.getElementById('specialistSelect');
            const todayBtn = document.getElementById('todayBtn');
            const weekBtn = document.getElementById('weekBtn');
            const startDate = document.getElementById('startDate');
            const endDate = document.getElementById('endDate');

            if (appointmentsType) {
                appointmentsType.addEventListener('click', () => {
                    this.currentType = 'appointments';
                    this.updateUI();
                    this.safeLoadSchedule();
                });
            }

            if (freetimeType) {
                freetimeType.addEventListener('click', () => {
                    this.currentType = 'freetime';
                    this.updateUI();
                    this.safeLoadSchedule();
                });
            }

            if (specialistSelect) {
                specialistSelect.addEventListener('change', (e) => {
                    this.selectedSpecialistId = e.target.value === 'all' ? null : e.target.value;
                    this.safeLoadSchedule();
                });
            }

            if (todayBtn) {
                todayBtn.addEventListener('click', () => {
                    this.setToday();
                    this.safeLoadSchedule();
                });
            }

            if (weekBtn) {
                weekBtn.addEventListener('click', () => {
                    this.setWeek();
                    this.safeLoadSchedule();
                });
            }

            if (startDate) {
                startDate.addEventListener('change', (e) => {
                    this.startDate = e.target.value;
                    this.resetActivePeriod();
                    this.safeLoadSchedule();
                });
            }

            if (endDate) {
                endDate.addEventListener('change', (e) => {
                    this.endDate = e.target.value;
                    this.resetActivePeriod();
                    this.safeLoadSchedule();
                });
            }
        }, 100);
    }

    resetActivePeriod() {
        const buttons = document.querySelectorAll('.quick-buttons .btn-date');
        if (buttons.length > 0) {
            buttons.forEach(btn => {
                btn.classList.remove('active');
            });
        }
        this.currentPeriod = null;
    }

    setDefaultDates() {
        const today = new Date();
        this.startDate = today.toISOString().split('T')[0];
        
        const endDate = new Date(today);
        endDate.setDate(today.getDate() + 6);
        this.endDate = endDate.toISOString().split('T')[0];
        
        this.updateDateInputs();
        this.setActivePeriodButton('week');
    }

    setToday() {
        const today = new Date();
        this.startDate = today.toISOString().split('T')[0];
        this.endDate = today.toISOString().split('T')[0];
        this.updateDateInputs();
        this.setActivePeriodButton('today');
        this.currentPeriod = 'today';
    }

    setWeek() {
        const today = new Date();
        this.startDate = today.toISOString().split('T')[0];
        
        const endDate = new Date(today);
        endDate.setDate(today.getDate() + 6);
        this.endDate = endDate.toISOString().split('T')[0];
        
        this.updateDateInputs();
        this.setActivePeriodButton('week');
        this.currentPeriod = 'week';
    }

    updateDateInputs() {
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        
        if (startDateInput) startDateInput.value = this.startDate;
        if (endDateInput) endDateInput.value = this.endDate;
    }

    setActivePeriodButton(period) {
        const todayBtn = document.getElementById('todayBtn');
        const weekBtn = document.getElementById('weekBtn');
        
        if (todayBtn) todayBtn.classList.remove('active');
        if (weekBtn) weekBtn.classList.remove('active');
        
        if (period === 'today' && todayBtn) {
            todayBtn.classList.add('active');
        } else if (period === 'week' && weekBtn) {
            weekBtn.classList.add('active');
        }
        
        this.currentPeriod = period;
    }

    updateUI() {
        // Обновляем активные табы
        const tabs = document.querySelectorAll('.type-tabs .schedule-tab');
        if (tabs.length > 0) {
            tabs.forEach(tab => {
                tab.classList.remove('active');
            });
            
            const activeTab = document.getElementById(`${this.currentType}Type`);
            if (activeTab) {
                activeTab.classList.add('active');
            }
        }

        // Обновляем выбор мастера
        this.populateSpecialistSelect();

        // Обновляем заголовок
        const title = document.getElementById('scheduleTitle');
        if (title) {
            if (this.currentType === 'appointments') {
                title.textContent = `Расписание записей ${this.selectedSpecialistId ? '(По мастеру)' : '(Все мастера)'}`;
            } else {
                title.textContent = `Расписание свободного времени ${this.selectedSpecialistId ? '(По мастеру)' : '(Все мастера)'}`;
            }
        }
    }

    populateSpecialistSelect() {
        const select = document.getElementById('specialistSelect');
        if (!select) return;
        
        select.innerHTML = '<option value="all">Все мастера</option>';
        
        this.specialists.forEach(specialist => {
            const option = document.createElement('option');
            option.value = specialist.id;
            option.textContent = specialist.имя;
            if (specialist.id == this.selectedSpecialistId) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        
        if (!this.selectedSpecialistId) {
            select.value = 'all';
        }
    }

    async loadSchedule() {
        const container = document.getElementById('scheduleContainer');
        if (!container) {
            console.error('Контейнер расписания не найден');
            return;
        }

        container.innerHTML = `
            <div class="loading-schedule">
                <div class="loading-spinner"></div>
                <p>Загрузка расписания...</p>
            </div>
        `;

        try {
            let data;
            if (this.currentType === 'appointments') {
                data = await this.loadAppointments();
            } else {
                data = await this.loadFreeTime();
            }
            
            this.displaySchedule(data);
        } catch (error) {
            console.error('Ошибка загрузки расписания:', error);
            this.showError('Не удалось загрузить расписание. Попробуйте еще раз.');
        }
    }

    async loadAppointments() {
        try {
            let url = '/api/appointments?';
            const params = [];
            
            if (this.selectedSpecialistId) {
                params.push(`specialistId=${this.selectedSpecialistId}`);
            }
            
            params.push(`startDate=${this.startDate}`);
            params.push(`endDate=${this.endDate}`);
            
            url += params.join('&');
            
            console.log('Загрузка записей:', url);
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            
            // Группируем записи по датам
            const groupedByDate = {};
            if (data.message === 'success' && data.data) {
                data.data.forEach(appointment => {
                    if (!groupedByDate[appointment.дата]) {
                        groupedByDate[appointment.дата] = [];
                    }
                    groupedByDate[appointment.дата].push(appointment);
                });
            }
            
            console.log(`Загружено записей: ${data.data ? data.data.length : 0}`);
            return groupedByDate;
        } catch (error) {
            console.error('Ошибка загрузки записей:', error);
            throw error;
        }
    }

    async loadFreeTime() {
        try {
            let url = '/api/schedule-available?';
            
            if (this.selectedSpecialistId) {
                url += `specialistId=${this.selectedSpecialistId}&`;
            }
            
            url += `startDate=${this.startDate}&endDate=${this.endDate}`;
            
            console.log('Загрузка свободного времени:', url);
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            console.log(`Загружено слотов свободного времени: ${data.data ? data.data.length : 0}`);
            return data.message === 'success' ? data.data : [];
        } catch (error) {
            console.error('Ошибка загрузки свободного времени:', error);
            throw error;
        }
    }

    displaySchedule(data) {
        const container = document.getElementById('scheduleContainer');
        if (!container) return;
        
        if (this.currentType === 'appointments') {
            this.displayAppointments(data, container);
        } else {
            this.displayFreeTime(data, container);
        }
    }

    displayAppointments(appointmentsByDate, container) {
        if (!appointmentsByDate || Object.keys(appointmentsByDate).length === 0) {
            container.innerHTML = `
                <div class="empty-schedule">
                    <div class="empty-schedule-icon">📅</div>
                    <h3>Записей нет</h3>
                    <p>На выбранный период записей не найдено</p>
                </div>
            `;
            return;
        }

        const dates = Object.keys(appointmentsByDate).sort();
        let html = '<div class="schedule-grid">';
        
        dates.forEach(date => {
            const dateObj = new Date(date);
            const formattedDate = dateObj.toLocaleDateString('ru-RU', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            const appointments = appointmentsByDate[date];
            
            html += `
                <div class="schedule-day">
                    <div class="day-header">
                        <h3 class="day-title">${formattedDate}</h3>
                    </div>
                    <div class="day-appointments">
                        ${this.getAppointmentsForDate(appointments)}
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }

    getAppointmentsForDate(appointments) {
        if (!appointments || appointments.length === 0) {
            return '<div class="no-appointments">Записей на этот день нет</div>';
        }
        
        appointments.sort((a, b) => a.время.localeCompare(b.время));
        
        return appointments.map(appointment => {
            const time = appointment.время.includes(':') ? 
                        appointment.время.split(':').slice(0, 2).join(':') : 
                        appointment.время;
            
            return `
                <div class="appointment-item">
                    <div class="appointment-time">${time}</div>
                    <div class="appointment-details">
                        <div class="appointment-service">${appointment.услуга_название}</div>
                        <div class="appointment-master">Мастер: ${appointment.мастер_имя}</div>
                        <div class="appointment-client">
                            <span class="client-name">Клиент: ${appointment.клиент_имя}</span>
                            &nbsp;&nbsp;
                            <span class="client-phone">${appointment.клиент_телефон}</span>
                        </div>
                    </div>
                    <div class="appointment-price">${appointment.цена} ₽</div>
                </div>
            `;
        }).join('');
    }

    displayFreeTime(freeTimeData, container) {
        if (!freeTimeData || freeTimeData.length === 0) {
            container.innerHTML = `
                <div class="empty-schedule">
                    <div class="empty-schedule-icon">⏰</div>
                    <h3>Свободного времени нет</h3>
                    <p>На выбранный период свободного времени не найдено</p>
                </div>
            `;
            return;
        }

        // Группируем по датам
        const groupedByDate = {};
        freeTimeData.forEach(item => {
            if (!groupedByDate[item.дата]) {
                groupedByDate[item.дата] = [];
            }
            groupedByDate[item.дата].push(item);
        });

        const dates = Object.keys(groupedByDate).sort();
        let html = '<div class="schedule-grid">';
        
        dates.forEach(date => {
            const dateObj = new Date(date);
            const formattedDate = dateObj.toLocaleDateString('ru-RU', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            groupedByDate[date].sort((a, b) => a.время.localeCompare(b.время));
            
            html += `
                <div class="schedule-day">
                    <div class="day-header">
                        <h3 class="day-title">${formattedDate}</h3>
                    </div>
                    <div class="day-appointments">
                        ${groupedByDate[date].map(item => `
                            <div class="free-time-item">
                                <div class="appointment-time">${item.время}</div>
                                <div class="appointment-details">
                                    <div class="free-time-service">${item.услуга_название}</div>
                                    <div class="free-time-master">Мастер: ${item.мастер_имя}</div>
                                </div>
                                <div class="appointment-price">${item.услуга_цена} ₽</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }

    showError(message) {
        const container = document.getElementById('scheduleContainer');
        if (container) {
            container.innerHTML = `
                <div class="error-schedule">
                    <div class="error-schedule-icon">⚠️</div>
                    <h3>Ошибка загрузки</h3>
                    <p>${message}</p>
                    <button onclick="scheduleManager.safeLoadSchedule()" class="btn btn-primary">
                        ⟳ Попробовать снова
                    </button>
                </div>
            `;
        }
    }

// Добавляем метод stopAutoUpdate в класс ScheduleManager
stopAutoUpdate() {
    if (this.autoUpdateInterval) {
        clearInterval(this.autoUpdateInterval);
        this.autoUpdateInterval = null;
        console.log('Автообновление остановлено');
    }
}

// Исправляем метод destroy
destroy() {
    this.stopAutoUpdate(); // Теперь этот метод существует
    // Дополнительная очистка если нужна
}
}

// Исправленная функция loadScheduleSection в shedule.js
function loadScheduleSection() {
    const contentContainer = document.getElementById('contentContainer');
    if (!contentContainer) {
        console.error('Контейнер контента не найден');
        return;
    }

    // Останавливаем предыдущий менеджер если существует
    if (window.scheduleManager) {
        window.scheduleManager.destroy();
        window.scheduleManager = null;
    }

    // Очищаем контейнер полностью
    contentContainer.innerHTML = '';

    // Добавляем HTML для расписания
    contentContainer.innerHTML = `
        <div class="schedule-management">
            <div class="schedule-header">
                <h2 id="scheduleTitle">Расписание записей (Все мастера)</h2>
            </div>
            
            <div class="schedule-tabs type-tabs">
                <button id="appointmentsType" class="schedule-tab active">Расписание записей</button>
                <button id="freetimeType" class="schedule-tab">Расписание свободного времени</button>
            </div>
            
            <div class="schedule-controls">
                <div class="date-range-selector">
                    <label>Показать расписание с:</label>
                    <input type="date" id="startDate" class="date-input">
                    <label>по:</label>
                    <input type="date" id="endDate" class="date-input">
                </div>
                
                <div class="quick-buttons">
                    <button id="todayBtn" class="btn-date">Сегодня</button>
                    <button id="weekBtn" class="btn-date active">Неделя</button>
                </div>
                
                <div id="specialistSelector" class="specialist-selector">
                    <label>Мастер:</label>
                    <select id="specialistSelect" class="specialist-dropdown">
                        <option value="all">Все мастера</option>
                    </select>
                </div>
            </div>
            
            <div class="photo-generator-container">
                <button id="generatePhotoBtn" class="btn-photo-generator">
                    📷 Создать фото расписания
                </button>
            </div>
            
            <div id="scheduleContainer">
                <div class="loading-schedule">
                    <div class="loading-spinner"></div>
                    <p>Загрузка расписания...</p>
                </div>
            </div>
        </div>
    `;

    // Инициализируем новый менеджер с небольшой задержкой для гарантии отрисовки DOM
    setTimeout(() => {
        window.scheduleManager = new ScheduleManager();
        
        // Добавляем обработчик для кнопки генерации фото
        const generatePhotoBtn = document.getElementById('generatePhotoBtn');
        if (generatePhotoBtn) {
            generatePhotoBtn.addEventListener('click', openPhotoGenerator);
        }
    }, 50);
}

// Добавляем обработчик для очистки при переходе на другие разделы
document.addEventListener('sectionChange', function() {
    if (window.scheduleManager) {
        window.scheduleManager.destroy();
        window.scheduleManager = null;
    }
});