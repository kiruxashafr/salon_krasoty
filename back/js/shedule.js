class ScheduleManager {
    constructor() {
        this.currentView = 'specialist'; // теперь только 'specialist'
        this.currentType = 'appointments'; // 'appointments' или 'freetime'
        this.selectedSpecialistId = null; // null будет означать "Все мастера"
        this.startDate = null;
        this.endDate = null;
        this.specialists = [];
        this.init();
    }

    async init() {
        await this.loadSpecialists();
        this.setupEventListeners();
        this.setDefaultDates();
        this.loadSchedule();
    }

    async loadSpecialists() {
        try {
            const response = await fetch('/api/specialists');
            if (response.ok) {
                const data = await response.json();
                if (data.message === 'success') {
                    this.specialists = data.data;
                    this.updateUI();
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки мастеров:', error);
        }
    }

    setupEventListeners() {
        // Убрали переключение между общим и мастером
        
        // Переключение между записями и свободным временем
        document.getElementById('appointmentsType').addEventListener('click', () => {
            this.currentType = 'appointments';
            this.updateUI();
            this.loadSchedule();
        });

        document.getElementById('freetimeType').addEventListener('click', () => {
            this.currentType = 'freetime';
            this.updateUI();
            this.loadSchedule();
        });

        // Выбор мастера
        document.getElementById('specialistSelect').addEventListener('change', (e) => {
            this.selectedSpecialistId = e.target.value === 'all' ? null : e.target.value;
            this.loadSchedule();
        });

        // Быстрые кнопки дат
        document.getElementById('todayBtn').addEventListener('click', () => {
            this.setToday();
            this.loadSchedule();
        });

        document.getElementById('weekBtn').addEventListener('click', () => {
            this.setWeek();
            this.loadSchedule();
        });

        // Выбор диапазона дат
        document.getElementById('startDate').addEventListener('change', (e) => {
            this.startDate = e.target.value;
            this.loadSchedule();
        });

        document.getElementById('endDate').addEventListener('change', (e) => {
            this.endDate = e.target.value;
            this.loadSchedule();
        });
    }


    setDefaultDates() {
        const today = new Date();
        this.startDate = today.toISOString().split('T')[0];
        
        const endDate = new Date(today);
        endDate.setDate(today.getDate() + 6); // +6 дней = неделя
        this.endDate = endDate.toISOString().split('T')[0];
        
        this.updateDateInputs();
    }

    setToday() {
        const today = new Date();
        this.startDate = today.toISOString().split('T')[0];
        this.endDate = today.toISOString().split('T')[0];
        this.updateDateInputs();
    }

    setWeek() {
        const today = new Date();
        this.startDate = today.toISOString().split('T')[0];
        
        const endDate = new Date(today);
        endDate.setDate(today.getDate() + 6);
        this.endDate = endDate.toISOString().split('T')[0];
        
        this.updateDateInputs();
    }

    updateDateInputs() {
        document.getElementById('startDate').value = this.startDate;
        document.getElementById('endDate').value = this.endDate;
    }

    updateUI() {
        // Обновляем активные табы для выбора типа
        document.querySelectorAll('.type-tabs .schedule-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        document.getElementById(`${this.currentType}Type`).classList.add('active');

        // Всегда показываем выбор мастера
        const specialistSelector = document.getElementById('specialistSelector');
        specialistSelector.style.display = 'flex';
        this.populateSpecialistSelect();

        // Обновляем заголовок
        const title = document.getElementById('scheduleTitle');
        if (this.currentType === 'appointments') {
            title.textContent = `Расписание записей ${this.selectedSpecialistId ? '(По мастеру)' : '(Все мастера)'}`;
        } else {
            title.textContent = `Расписание свободного времени ${this.selectedSpecialistId ? '(По мастеру)' : '(Все мастера)'}`;
        }
    }

    populateSpecialistSelect() {
        const select = document.getElementById('specialistSelect');
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
        
        // Если не выбран конкретный мастер, выбираем "Все мастера"
        if (!this.selectedSpecialistId) {
            select.value = 'all';
        }
    }

    async loadSchedule() {
        const container = document.getElementById('scheduleContainer');
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
            container.innerHTML = `
                <div class="empty-schedule">
                    <div class="empty-schedule-icon">⚠️</div>
                    <h3>Ошибка загрузки</h3>
                    <p>Не удалось загрузить расписание. Попробуйте еще раз.</p>
                    <button onclick="scheduleManager.loadSchedule()" class="btn btn-primary">
                        ⟳ Попробовать снова
                    </button>
                </div>
            `;
        }
    }

    async loadAppointments() {
        try {
            let url = '/api/appointments?';
            const params = [];
            
            if (this.currentView === 'specialist' && this.selectedSpecialistId) {
                params.push(`specialistId=${this.selectedSpecialistId}`);
            }
            
            // Добавляем параметры даты
            params.push(`startDate=${this.startDate}`);
            params.push(`endDate=${this.endDate}`);
            
            url += params.join('&');
            
            const response = await fetch(url);
            if (!response.ok) throw new Error('Ошибка загрузки записей');
            
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
            
            return groupedByDate;
        } catch (error) {
            console.error('Ошибка загрузки записей:', error);
            return {};
        }
    }

    async loadFreeTime() {
        let url = '/api/schedule-available?';
        
        if (this.currentView === 'specialist' && this.selectedSpecialistId) {
            url += `specialistId=${this.selectedSpecialistId}&`;
        }
        
        url += `startDate=${this.startDate}&endDate=${this.endDate}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Ошибка загрузки свободного времени');
        
        const data = await response.json();
        return data.message === 'success' ? data.data : [];
    }

    displaySchedule(data) {
        const container = document.getElementById('scheduleContainer');
        
        if (this.currentType === 'appointments') {
            this.displayAppointments(data, container);
        } else {
            this.displayFreeTime(data, container);
        }
    }

    displayAppointments(appointmentsByDate, container) {
        const dates = Object.keys(appointmentsByDate).sort();
        
        if (dates.length === 0) {
            container.innerHTML = `
                <div class="empty-schedule">
                    <div class="empty-schedule-icon">📅</div>
                    <h3>Записей нет</h3>
                    <p>На выбранный период записей не найдено</p>
                </div>
            `;
            return;
        }

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
        return '<p>Записей на этот день нет</p>';
    }
    
    // Сортируем по времени
    appointments.sort((a, b) => a.время.localeCompare(b.время));
    
    return appointments.map(appointment => {
        // Форматируем время (убираем секунды если есть)
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
            
            // Сортируем по времени
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
}

function loadScheduleSection() {
    const contentContainer = document.getElementById('contentContainer');
    contentContainer.innerHTML = `
        <div class="schedule-management">
            <div class="schedule-header">
                <h2 id="scheduleTitle">Расписание записей (Все мастера)</h2>
            </div>
            
            <!-- Убрали вкладки выбора вида -->

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
            
            <!-- Кнопка для создания фото -->
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

    // Инициализируем менеджер расписания
    window.scheduleManager = new ScheduleManager();
    
    // Добавляем обработчик для кнопки генерации фото
    document.getElementById('generatePhotoBtn').addEventListener('click', openPhotoGenerator);
}