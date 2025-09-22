// freetime.js
class FreeTimeManager {
    constructor() {
        this.currentScheduleId = null;
        this.isEditMode = false;
        this.specialists = [];
        this.services = [];
        this.init();
    }

    init() {
        this.loadFreeTime();
        this.setupEventListeners();
    }

// freetime.js - обновите метод loadFreeTime

async loadFreeTime() {
    try {
        this.showLoading();
        
        // Получаем текущую дату для фильтрации
        const today = new Date().toISOString().split('T')[0];
        
        // Загружаем свободное время только начиная с сегодняшнего дня
        // Используем новый endpoint
        const response = await fetch(`/api/freetime-available?fromDate=${today}`);
        
        if (!response.ok) {
            throw new Error('Ошибка загрузки свободного времени');
        }
        
        const data = await response.json();
        
        if (data.message === 'success') {
            this.displayFreeTime(data.data);
        }
    } catch (error) {
        console.error('Ошибка:', error);
        this.showError('Не удалось загрузить свободное время');
    }
}

    displayFreeTime(scheduleData) {
        const container = document.getElementById('freeTimeContainer');
        
        if (!scheduleData || scheduleData.length === 0) {
            container.innerHTML = `
                <div class="no-free-time">
                    <h3>Свободного времени нет</h3>
                    <p>Добавьте свободное время, нажав кнопку "Добавить свободное время"</p>
                </div>
            `;
            return;
        }

        // Группируем по датам
        const groupedByDate = this.groupScheduleByDate(scheduleData);
        container.innerHTML = this.createScheduleCalendar(groupedByDate);
    }

    groupScheduleByDate(scheduleData) {
        const grouped = {};
        
        scheduleData.forEach(item => {
            if (!grouped[item.дата]) {
                grouped[item.дата] = [];
            }
            grouped[item.дата].push(item);
        });
        
        return grouped;
    }

    createScheduleCalendar(groupedData) {
        const dates = Object.keys(groupedData).sort();
        
        return `
            <div class="schedule-calendar">
                ${dates.map(date => this.createDateSection(date, groupedData[date])).join('')}
            </div>
        `;
    }

    createDateSection(date, scheduleItems) {
        const dateObj = new Date(date);
        const formattedDate = dateObj.toLocaleDateString('ru-RU', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        return `
            <div class="date-section" data-date="${date}">
                <div class="date-header">
                    <h3>${formattedDate}</h3>
                    <button class="add-date-time-btn" onclick="freeTimeManager.showAddFormForDate('${date}')">
                        ✚ Добавить время
                    </button>
                </div>
                <div class="schedule-items">
                    ${scheduleItems.map(item => this.createScheduleItem(item)).join('')}
                </div>
            </div>
        `;
    }

    createScheduleItem(item) {
        return `
            <div class="schedule-item" data-schedule-id="${item.id}">
                <div class="schedule-info">
                    <div class="schedule-time">${item.время}</div>
                    <div class="schedule-details">
                        <div class="schedule-master">Мастер: ${item.мастер_имя}</div>
                        <div class="schedule-service">Услуга: ${item.услуга_название}</div>
                        <div class="schedule-price">Цена: ${item.услуга_цена} ₽</div>
                    </div>
                </div>
                <div class="schedule-actions">
                    <button class="action-btn btn-edit" onclick="freeTimeManager.editSchedule(${item.id})">
                        ✏️ Изменить
                    </button>
                    <button class="action-btn btn-delete" onclick="freeTimeManager.deleteSchedule(${item.id})">
                        🗑️ Удалить
                    </button>
                </div>
            </div>
        `;
    }

    showAddForm() {
        this.isEditMode = false;
        this.currentScheduleId = null;
        this.renderScheduleForm();
    }

    showAddFormForDate(date) {
        this.isEditMode = false;
        this.currentScheduleId = null;
        this.renderScheduleForm(null, date);
    }

    async editSchedule(scheduleId) {
        try {
            this.showFormLoading();
            const response = await fetch(`/api/schedule/${scheduleId}`);
            
            if (!response.ok) {
                throw new Error('Ошибка загрузки данных расписания');
            }
            
            const data = await response.json();
            
            if (data.message === 'success') {
                this.isEditMode = true;
                this.currentScheduleId = scheduleId;
                this.renderScheduleForm(data.data);
            }
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Не удалось загрузить данные расписания');
        }
    }

    async renderScheduleForm(scheduleData = null, presetDate = null) {
        // Загружаем мастеров и услуги
        await this.loadSpecialistsAndServices();
        
        // Получаем текущую дату для минимального значения
        const today = new Date().toISOString().split('T')[0];
        const dateValue = presetDate || scheduleData?.дата || today;
        
        // Разбиваем время на часы и минуты если есть
        let hours = '09';
        let minutes = '00';
        
        if (scheduleData?.время) {
            const [h, m] = scheduleData.время.split(':');
            hours = h;
            minutes = m;
        }
        
        const formHTML = `
            <div class="modal-overlay" id="scheduleModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">${this.isEditMode ? 'Изменить свободное время' : 'Добавить свободное время'}</h3>
                        <button class="close-modal-btn" onclick="freeTimeManager.closeModal()">
                            ✕
                        </button>
                    </div>
                    
                    <form class="schedule-form" id="scheduleForm" onsubmit="freeTimeManager.handleSubmit(event)">
                        <div class="form-group">
                            <label for="scheduleDate">Дата *</label>
                            <input type="date" id="scheduleDate" name="date" class="form-control" 
                                   value="${dateValue}" min="${today}" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Время *</label>
                            <div class="time-inputs">
                                <select id="scheduleHours" name="hours" class="form-control time-select" required>
                                    ${this.generateTimeOptions(5, 23, hours, 'часы')}
                                </select>
                                <span>:</span>
                                <select id="scheduleMinutes" name="minutes" class="form-control time-select" required>
                                    ${this.generateTimeOptions(0, 55, minutes, 'минуты', 5)}
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="scheduleSpecialist">Мастер *</label>
                            <select id="scheduleSpecialist" name="specialistId" class="form-control" required>
                                <option value="">Выберите мастера</option>
                                ${this.specialists.map(spec => `
                                    <option value="${spec.id}" ${scheduleData?.мастер_id === spec.id ? 'selected' : ''}>
                                        ${spec.имя}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="scheduleService">Услуга *</label>
                            <select id="scheduleService" name="serviceId" class="form-control" required>
                                <option value="">Выберите услугу</option>
                                ${this.services.map(service => `
                                    <option value="${service.id}" ${scheduleData?.услуга_id === service.id ? 'selected' : ''}>
                                        ${service.название} - ${service.цена} ₽
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        
                        <div class="modal-actions">
                            <button type="button" class="btn btn-secondary" onclick="freeTimeManager.closeModal()">
                                Отмена
                            </button>
                            <button type="submit" class="btn btn-primary submit-btn">
                                ${this.isEditMode ? 'Сохранить изменения' : 'Добавить'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', formHTML);
    }

    generateTimeOptions(start, end, selectedValue, placeholder, step = 1) {
        let options = `<option value="">${placeholder}</option>`;
        for (let i = start; i <= end; i += step) {
            const value = i.toString().padStart(2, '0');
            const selected = value === selectedValue ? 'selected' : '';
            options += `<option value="${value}" ${selected}>${value}</option>`;
        }
        return options;
    }

    async loadSpecialistsAndServices() {
        try {
            // Загружаем мастеров
            const specResponse = await fetch('/api/specialists');
            if (specResponse.ok) {
                const specData = await specResponse.json();
                if (specData.message === 'success') {
                    this.specialists = specData.data;
                }
            }
            
            // Загружаем услуги
            const servResponse = await fetch('/api/services');
            if (servResponse.ok) {
                const servData = await servResponse.json();
                if (servData.message === 'success') {
                    this.services = servData.data;
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
        }
    }
// В методе handleSubmit
async handleSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const date = formData.get('date');
    const hours = formData.get('hours');
    const minutes = formData.get('minutes');
    const specialistId = formData.get('specialistId');
    const serviceId = formData.get('serviceId');

    if (!date || !hours || !minutes || !specialistId || !serviceId) {
        showError('Пожалуйста, заполните все обязательные поля');
        return;
    }

    const time = `${hours}:${minutes}`;

    try {
        this.showFormLoading();
        
        const scheduleData = {
            дата: date,
            время: time,
            мастер_id: parseInt(specialistId),
            услуга_id: parseInt(serviceId),
            доступно: 1
        };

        const url = this.isEditMode 
            ? `/api/schedule/${this.currentScheduleId}` 
            : '/api/schedule';
            
        const method = this.isEditMode ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(scheduleData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка сохранения');
        }

        const data = await response.json();
        
        if (data.message === 'success') {
            showSuccess(this.isEditMode ? 'Свободное время успешно обновлено!' : 'Свободное время успешно добавлено!');
            this.closeModal();
            this.loadFreeTime();
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showError('Не удалось сохранить: ' + error.message);
    } finally {
        this.hideFormLoading();
    }
}

// В методе deleteSchedule
async deleteSchedule(scheduleId) {
    showConfirm('Вы уверены, что хотите удалить это свободное время?', (confirmed) => {
        if (confirmed) {
            this.performDelete(scheduleId);
        }
    });
}

async performDelete(scheduleId) {
    try {
        const response = await fetch(`/api/schedule/${scheduleId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Ошибка удаления свободного времени');
        }

        const data = await response.json();
        
        if (data.message === 'success') {
            showSuccess('Свободное время успешно удалено!');
            this.loadFreeTime();
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showError('Не удалось удалить свободное время');
    }
}

    closeModal() {
        const modal = document.getElementById('scheduleModal');
        if (modal) {
            modal.remove();
        }
    }

    showLoading() {
        const container = document.getElementById('freeTimeContainer');
        container.innerHTML = `
            <div class="loading" style="text-align: center; padding: 2rem;">
                <div class="spinner"></div>
                <p>Загрузка свободного времени...</p>
            </div>
        `;
    }

    showFormLoading() {
        const form = document.getElementById('scheduleForm');
        if (form) {
            const submitBtn = form.querySelector('.submit-btn');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<div class="spinner" style="width: 20px; height: 20px;"></div> Сохранение...';
        }
    }

    hideFormLoading() {
        const form = document.getElementById('scheduleForm');
        if (form) {
            const submitBtn = form.querySelector('.submit-btn');
            submitBtn.disabled = false;
            submitBtn.textContent = this.isEditMode ? 'Сохранить изменения' : 'Добавить';
        }
    }

    showError(message) {
        const container = document.getElementById('freeTimeContainer');
        container.innerHTML = `
            <div class="error" style="text-align: center; padding: 2rem; color: #e74c3c;">
                <h3>Ошибка</h3>
                <p>${message}</p>
                <button onclick="freeTimeManager.loadFreeTime()" class="btn btn-primary">
                    ⟳ Попробовать снова
                </button>
            </div>
        `;
    }

    setupEventListeners() {
        document.getElementById('addFreeTimeBtn')?.addEventListener('click', () => {
            this.showAddForm();
        });
    }
}

// Инициализация менеджера свободного времени
let freeTimeManager;

// Функция для загрузки раздела свободного времени
function loadFreeTimeSection() {
    const contentContainer = document.getElementById('contentContainer');
    contentContainer.innerHTML = `
        <div class="free-time-management">
            <div class="free-time-header">
                <h2>Управление свободным временем</h2>
                <button id="addFreeTimeBtn" class="add-free-time-btn">
                    ✚ Добавить свободное время
                </button>
            </div>
            
            <div id="freeTimeContainer">
                <div class="loading">
                    <div class="spinner"></div>
                    <p>Загрузка свободного времени...</p>
                </div>
            </div>
        </div>
    `;

    // Инициализируем менеджер свободного времени
    freeTimeManager = new FreeTimeManager();
}