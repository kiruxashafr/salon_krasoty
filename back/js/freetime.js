// freetime.js
class FreeTimeManager {
    constructor() {
        this.currentScheduleId = null;
        this.isEditMode = false;
        this.specialists = [];
        this.services = [];
        this.multipleDaysTimes = []; // Массив для хранения временных слотов
        this.init();
    }

    init() {
        this.loadFreeTime();
        this.setupEventListeners();
    }

    async loadFreeTime() {
        try {
            this.showLoading();
            
            const today = new Date().toISOString().split('T')[0];
            
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

    // НОВЫЙ МЕТОД: Показать форму для нескольких дней
    showMultipleDaysForm() {
        this.isEditMode = false;
        this.currentScheduleId = null;
        this.multipleDaysTimes = [{ hours: '09', minutes: '00' }]; // Начальное время
        this.renderMultipleDaysForm();
    }

    async renderMultipleDaysForm() {
        await this.loadSpecialistsAndServices();
        
        const today = new Date().toISOString().split('T')[0];
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const nextWeekStr = nextWeek.toISOString().split('T')[0];

        const formHTML = `
            <div class="modal-overlay" id="multipleDaysModal">
                <div class="modal-content multiple-days-modal">
                    <div class="modal-header">
                        <h3 class="modal-title">Добавить свободное время на несколько дней</h3>
                        <button class="close-modal-btn" onclick="freeTimeManager.closeMultipleDaysModal()">
                            ✕
                        </button>
                    </div>
                    
                    <form class="schedule-form" id="multipleDaysForm" onsubmit="freeTimeManager.handleMultipleDaysSubmit(event)">
                        <div class="form-group">
                            <label for="multipleDaysService">Услуга *</label>
                            <select id="multipleDaysService" name="serviceId" class="form-control" required>
                                <option value="">Выберите услугу</option>
                                ${this.services.map(service => `
                                    <option value="${service.id}">
                                        ${service.название} - ${service.цена} ₽
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Мастера *</label>
                            <div class="masters-checkbox-group">
                                ${this.specialists.map(spec => `
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="specialistIds" value="${spec.id}" class="specialist-checkbox">
                                        <span class="checkmark"></span>
                                        ${spec.имя}
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Период *</label>
                            <div class="date-range-inputs">
                                <input type="date" id="startDate" name="startDate" class="form-control" 
                                       value="${today}" min="${today}" required>
                                <span>по</span>
                                <input type="date" id="endDate" name="endDate" class="form-control" 
                                       value="${nextWeekStr}" min="${today}" required>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Дни недели</label>
                            <div class="days-checkbox-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" name="weekdays" value="workdays" class="days-checkbox" checked>
                                    <span class="checkmark"></span>
                                    Будни (Пн-Пт)
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" name="weekdays" value="weekends" class="days-checkbox" checked>
                                    <span class="checkmark"></span>
                                    Выходные (Сб-Вс)
                                </label>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Время *</label>
                            <div id="timeSlotsContainer" class="time-slots-container">
                                ${this.multipleDaysTimes.map((time, index) => this.createTimeSlotInput(index, time)).join('')}
                            </div>
                            <button type="button" class="btn btn-secondary add-time-btn" onclick="freeTimeManager.addTimeSlot()">
                                ✚ Добавить время
                            </button>
                        </div>
                        
                        <div class="modal-actions">
                            <button type="button" class="btn btn-secondary" onclick="freeTimeManager.closeMultipleDaysModal()">
                                Отмена
                            </button>
                            <button type="submit" class="btn btn-primary submit-btn">
                                Добавить на несколько дней
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', formHTML);
    }

    createTimeSlotInput(index, time = { hours: '09', minutes: '00' }) {
        return `
            <div class="time-slot" data-index="${index}">
                <div class="time-inputs">
                    <select name="hours[]" class="form-control time-select" required>
                        ${this.generateTimeOptions(5, 23, time.hours, 'часы')}
                    </select>
                    <span>:</span>
                    <select name="minutes[]" class="form-control time-select" required>
                        ${this.generateTimeOptions(0, 55, time.minutes, 'минуты', 5)}
                    </select>
                </div>
                <button type="button" class="btn btn-danger remove-time-btn" 
                        onclick="freeTimeManager.removeTimeSlot(${index})" 
                        ${this.multipleDaysTimes.length <= 1 ? 'disabled' : ''}>
                    🗑️
                </button>
            </div>
        `;
    }

    addTimeSlot() {
        const newTime = { hours: '09', minutes: '00' };
        this.multipleDaysTimes.push(newTime);
        
        const container = document.getElementById('timeSlotsContainer');
        container.insertAdjacentHTML('beforeend', this.createTimeSlotInput(this.multipleDaysTimes.length - 1, newTime));
        
        // Активируем кнопки удаления, если слотов больше одного
        if (this.multipleDaysTimes.length > 1) {
            document.querySelectorAll('.remove-time-btn').forEach(btn => {
                btn.disabled = false;
            });
        }
    }

    removeTimeSlot(index) {
        if (this.multipleDaysTimes.length <= 1) return;
        
        this.multipleDaysTimes.splice(index, 1);
        this.renderTimeSlots();
    }

    renderTimeSlots() {
        const container = document.getElementById('timeSlotsContainer');
        container.innerHTML = this.multipleDaysTimes.map((time, index) => 
            this.createTimeSlotInput(index, time)
        ).join('');
    }


    async checkTimeSlotConflict(date, time, specialistId, serviceId, excludeScheduleId = null) {
    try {
        const response = await fetch(`/api/schedule-available?specialistId=${specialistId}&startDate=${date}&endDate=${date}`);
        
        if (!response.ok) {
            throw new Error('Ошибка проверки расписания');
        }
        
        const data = await response.json();
        
        if (data.message === 'success') {
            const existingSlots = data.data.filter(slot => 
                slot.дата === date && 
                slot.мастер_id === parseInt(specialistId) &&
                (excludeScheduleId ? slot.id !== excludeScheduleId : true)
            );
            
            // Проверяем конфликты по времени (интервал минимум 5 минут)
            for (const slot of existingSlots) {
                const existingTime = slot.время;
                const [existingHours, existingMinutes] = existingTime.split(':').map(Number);
                const [newHours, newMinutes] = time.split(':').map(Number);
                
                const existingTotalMinutes = existingHours * 60 + existingMinutes;
                const newTotalMinutes = newHours * 60 + newMinutes;
                
                // Проверяем разницу менее 5 минут
                if (Math.abs(existingTotalMinutes - newTotalMinutes) < 5) {
                    return {
                        conflict: true,
                        existingSlot: slot,
                        message: `Время конфликтует с существующим слотом: ${existingTime}`
                    };
                }
            }
            
            return { conflict: false };
        }
    } catch (error) {
        console.error('Ошибка проверки конфликта:', error);
        return { conflict: false, error: 'Ошибка проверки' };
    }
}

async handleMultipleDaysSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const serviceId = formData.get('serviceId');
    const specialistIds = formData.getAll('specialistIds');
    const startDate = formData.get('startDate');
    const endDate = formData.get('endDate');
    const weekdays = formData.getAll('weekdays');
    const hours = formData.getAll('hours[]');
    const minutes = formData.getAll('minutes[]');

    // Валидация
    if (!serviceId || specialistIds.length === 0 || !startDate || !endDate || 
        weekdays.length === 0 || hours.length === 0) {
        showError('Пожалуйста, заполните все обязательные поля');
        return;
    }

    try {
        this.showFormLoading('multipleDaysForm');
        
        // Создаем временные слоты
        const timeSlots = hours.map((hour, index) => `${hour}:${minutes[index]}`);
        
        // Проверяем конфликты для каждого временного слота
        const conflictingSlots = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Перебираем каждый день в диапазоне
        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
            const dayOfWeek = date.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const shouldInclude = (isWeekend && weekdays.includes('weekends')) || (!isWeekend && weekdays.includes('workdays'));
            
            if (!shouldInclude) continue;

            const dateStr = date.toISOString().split('T')[0];

            // Для каждого мастера и каждого временного слота проверяем конфликты
            for (const specialistId of specialistIds) {
                for (const time of timeSlots) {
                    const conflictCheck = await this.checkTimeSlotConflict(dateStr, time, specialistId, serviceId);
                    if (conflictCheck.conflict) {
                        conflictingSlots.push({
                            date: dateStr,
                            time: time,
                            specialistId: specialistId,
                            message: conflictCheck.message
                        });
                    }
                }
            }
        }
        
        // Если есть конфликты, показываем предупреждение
        if (conflictingSlots.length > 0) {
            const conflictMessage = `Найдено ${conflictingSlots.length} конфликтующих временных слотов:\n\n` +
                conflictingSlots.slice(0, 5).map(slot => 
                    `${slot.date} ${slot.time} (мастер ID: ${slot.specialistId})`
                ).join('\n') +
                (conflictingSlots.length > 5 ? `\n... и еще ${conflictingSlots.length - 5} конфликтов` : '') +
                `\n\nПродолжить создание остальных слотов?`;
            
            showConfirm(conflictMessage, async (confirmed) => {
                if (confirmed) {
                    await this.createMultipleDaysSchedule(serviceId, specialistIds, startDate, endDate, weekdays, timeSlots, conflictingSlots);
                } else {
                    this.hideFormLoading('multipleDaysForm');
                }
            });
        } else {
            await this.createMultipleDaysSchedule(serviceId, specialistIds, startDate, endDate, weekdays, timeSlots, []);
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showError('Не удалось сохранить: ' + error.message);
        this.hideFormLoading('multipleDaysForm');
    }
}

    closeMultipleDaysModal() {
        const modal = document.getElementById('multipleDaysModal');
        if (modal) {
            modal.remove();
        }
    }



    async createMultipleDaysSchedule(serviceId, specialistIds, startDate, endDate, weekdays, timeSlots, conflictingSlots) {
    try {
        const scheduleData = {
            serviceId: parseInt(serviceId),
            specialistIds: specialistIds.map(id => parseInt(id)),
            startDate,
            endDate,
            includeWorkdays: weekdays.includes('workdays'),
            includeWeekends: weekdays.includes('weekends'),
            timeSlots,
            excludeConflicts: conflictingSlots.map(slot => ({
                date: slot.date,
                time: slot.time,
                specialistId: slot.specialistId
            }))
        };

        const response = await fetch('/api/schedule/batch', {
            method: 'POST',
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
            const skippedCount = conflictingSlots.length;
            const successMessage = `Успешно добавлено ${data.data.created} временных слотов!` +
                (skippedCount > 0 ? ` Пропущено ${skippedCount} конфликтующих слотов.` : '');
            
            showSuccess(successMessage);
            this.closeMultipleDaysModal();
            this.loadFreeTime();
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showError('Не удалось сохранить: ' + error.message);
    } finally {
        this.hideFormLoading('multipleDaysForm');
    }
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
        await this.loadSpecialistsAndServices();
        
        const today = new Date().toISOString().split('T')[0];
        const dateValue = presetDate || scheduleData?.дата || today;
        
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
            const specResponse = await fetch('/api/specialists');
            if (specResponse.ok) {
                const specData = await specResponse.json();
                if (specData.message === 'success') {
                    this.specialists = specData.data;
                }
            }
            
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
        
        // Проверяем конфликт
        const conflictCheck = await this.checkTimeSlotConflict(
            date, 
            time, 
            specialistId, 
            serviceId,
            this.isEditMode ? this.currentScheduleId : null
        );
        
        if (conflictCheck.conflict) {
            showError(conflictCheck.message);
            this.hideFormLoading();
            return;
        }
        
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

    showFormLoading(formId = 'scheduleForm') {
        const form = document.getElementById(formId);
        if (form) {
            const submitBtn = form.querySelector('.submit-btn');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<div class="spinner" style="width: 20px; height: 20px;"></div> Сохранение...';
        }
    }

    hideFormLoading(formId = 'scheduleForm') {
        const form = document.getElementById(formId);
        if (form) {
            const submitBtn = form.querySelector('.submit-btn');
            submitBtn.disabled = false;
            submitBtn.textContent = this.isEditMode ? 'Сохранить изменения' : 'Добавить';
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
                <div class="free-time-buttons">
                    <button id="addFreeTimeBtn" class="add-free-time-btn">
                        ✚ Добавить свободное время
                    </button>
                    <button id="addMultipleDaysBtn" class="add-free-time-btn multiple-days-btn">
                        📅 Добавить на несколько дней
                    </button>
                </div>
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
    
    // Добавляем обработчик для кнопки "на несколько дней"
    document.getElementById('addMultipleDaysBtn')?.addEventListener('click', () => {
        freeTimeManager.showMultipleDaysForm();
    });
}