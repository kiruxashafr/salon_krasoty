document.addEventListener('DOMContentLoaded', function() {
    fetchServicesWithAvailability();
});


function fetchServices() {
    fetch('/api/services')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.message === 'success') {
                displayServices(data.data);
            } else {
                console.error('Error fetching services:', data.error);
            }
        })
        .catch(error => {
            console.error('Error fetching services:', error);
        });
}

function fetchServicesWithAvailability() {
    console.log('Fetching all services first...');
    
    // Сначала получаем все услуги
    fetch('/api/services')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.message === 'success') {
                // Фильтруем услуги с доступными мастерами
                filterServicesWithAvailability(data.data);
            } else {
                console.error('Error fetching services:', data.error);
                showError('Ошибка загрузки услуг');
            }
        })
        .catch(error => {
            console.error('Error fetching services:', error);
            showError('Не удалось загрузить услуги');
        });
}


function filterServicesWithAvailability(services) {
    if (!services || services.length === 0) {
        displayServices([]);
        return;
    }

    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    const endDate = new Date(today.setMonth(today.getMonth() + 1)).toISOString().split('T')[0];

    const servicePromises = services.map(service => {
        return new Promise((resolve) => {
            // Проверяем, есть ли мастера для этой услуги
            fetch(`/api/service/${service.id}/specialists`)
                .then(response => {
                    if (!response.ok) {
                        resolve({ service, hasAvailability: false });
                        return;
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.message === 'success' && data.data && data.data.length > 0) {
                        // Проверяем доступное время для каждого мастера
                        checkSpecialistsAvailability(service.id, data.data, startDate, endDate)
                            .then(hasAvailability => {
                                resolve({ service, hasAvailability });
                            })
                            .catch(() => {
                                resolve({ service, hasAvailability: false });
                            });
                    } else {
                        resolve({ service, hasAvailability: false });
                    }
                })
                .catch(() => {
                    resolve({ service, hasAvailability: false });
                });
        });
    });

    Promise.all(servicePromises)
        .then(results => {
            const availableServices = results
                .filter(result => result.hasAvailability)
                .map(result => result.service);

            console.log('Available services:', availableServices);
            displayServices(availableServices);
        })
        .catch(error => {
            console.error('Error filtering services:', error);
            displayServices([]);
        });
}

function checkSpecialistsAvailability(serviceId, specialists, startDate, endDate) {
    if (!specialists || specialists.length === 0) {
        return Promise.resolve(false);
    }

    const specialistPromises = specialists.map(specialist => {
        return fetch(`/api/specialist/${specialist.id}/service/${serviceId}/available-dates?start=${startDate}&end=${endDate}`)
            .then(response => {
                if (!response.ok) return false;
                return response.json().then(data => 
                    data.availableDates && data.availableDates.length > 0
                );
            })
            .catch(() => false);
    });

    return Promise.all(specialistPromises)
        .then(results => results.some(result => result === true));
}

// Остальной код остается без изменений
function displayServices(services) {
    const servicesContainer = document.getElementById('services-container');
    
    if (!services || services.length === 0) {
        servicesContainer.innerHTML = '<p class="no-services" style="color: white; text-align: center; font-family: forum;">Нет доступных услуг на данный момент</p>';
        return;
    }
    
    servicesContainer.innerHTML = '';
    
    // Group services by category
    const servicesByCategory = services.reduce((acc, service) => {
        (acc[service.категория] = acc[service.категория] || []).push(service);
        return acc;
    }, {});
    
    // Display each category and its services
    Object.keys(servicesByCategory).forEach(category => {
        // Create category header
        const categoryHeader = document.createElement('h2');
        categoryHeader.className = 'category-title';
        categoryHeader.textContent = category;
        servicesContainer.appendChild(categoryHeader);
        
        // Create container for services in this category
        const categoryContainer = document.createElement('div');
        categoryContainer.className = 'category-services';
        
        servicesByCategory[category].forEach(service => {
            const serviceCard = document.createElement('div');
            serviceCard.className = 'service-card';
            serviceCard.style.backgroundImage = `url(${service.фото || 'photo/services/default.jpg'})`;
            
            serviceCard.innerHTML = `
                <div class="service-content">
                    <div class="service-text">
                        <h3 class="service-name">${service.название}</h3>
                        <p class="service-description">${service.описание}</p>
                    </div>
                    <div class="service-footer">
                        <p class="service-price">${service.цена} ₽</p>
                        <button class="book-btn" onclick="openServiceModal(${service.id})">ЗАПИСАТЬСЯ</button>
                    </div>
                </div>
            `;
            
            // Добавляем обработчик клика на всю карточку
            serviceCard.onclick = (e) => {
                if (!e.target.classList.contains('book-btn')) {
                    openServiceModal(service.id);
                }
            };
            
            categoryContainer.appendChild(serviceCard);
        });
        
        servicesContainer.appendChild(categoryContainer);
    });
}

function showError(message) {
    const container = document.getElementById('services-container');
    if (container) {
        container.innerHTML = `<p style="color: white; text-align: center; font-family: forum;">${message}</p>`;
    }
}

function openServiceModal(serviceId) {
    console.log(`Opening modal for service ID: ${serviceId}`);
    
    // Сначала получаем информацию об услуге
    fetch(`/api/service/${serviceId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(serviceData => {
            if (serviceData.message === 'success') {
                // Затем получаем мастеров, которые предоставляют эту услугу
                fetch(`/api/service/${serviceId}/specialists`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`HTTP error! Status: ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(specialistsData => {
                        if (specialistsData.message === 'success') {
                            // Фильтруем мастеров: оставляем только тех, у кого есть свободное время
                            filterSpecialistsWithAvailableTime(serviceId, serviceData.data, specialistsData.data);
                        } else {
                            console.error('Error fetching specialists for service:', specialistsData.error);
                            showNoSpecialistsMessage(serviceData.data);
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching specialists:', error);
                        showNoSpecialistsMessage(serviceData.data);
                    });
            } else {
                console.error('Error fetching service:', serviceData.error);
                alert('Ошибка загрузки информации об услуге');
            }
        })
        .catch(error => {
            console.error('Error fetching service:', error);
            alert('Ошибка загрузки информации об услуге');
        });
}

function filterSpecialistsWithAvailableTime(serviceId, service, specialists) {
    if (!specialists || specialists.length === 0) {
        showNoSpecialistsMessage(service);
        return;
    }

    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    const endDate = new Date(today.setMonth(today.getMonth() + 1)).toISOString().split('T')[0];

    const specialistPromises = specialists.map(specialist => {
        return fetch(`/api/specialist/${specialist.id}/service/${serviceId}/available-dates?start=${startDate}&end=${endDate}`)
            .then(response => {
                if (!response.ok) return { specialist, hasAvailableTime: false };
                return response.json().then(data => ({
                    specialist,
                    hasAvailableTime: data.availableDates && data.availableDates.length > 0
                }));
            })
            .catch(error => {
                console.error(`Error checking available time for specialist ${specialist.id}:`, error);
                return { specialist, hasAvailableTime: false };
            });
    });

    Promise.all(specialistPromises)
        .then(results => {
            const availableSpecialists = results
                .filter(result => result.hasAvailableTime)
                .map(result => result.specialist);

            console.log(`Available specialists with free time for service ${serviceId}:`, availableSpecialists);
            
            if (availableSpecialists.length === 0) {
                showNoSpecialistsMessage(service);
            } else {
                showServiceModal(serviceId, service, availableSpecialists);
            }
        })
        .catch(error => {
            console.error('Error filtering specialists:', error);
            showNoSpecialistsMessage(service);
        });
}


function showServiceModal(serviceId, service, specialists) {
    const modal = document.getElementById('service-modal');
    const modalContent = modal.querySelector('.service-modal-content');
    
    window.currentServiceId = serviceId;
    window.currentService = service;
    window.currentStep = 'specialists'; // Начинаем с выбора специалистов
    
    let specialistsHTML = '';
    if (specialists && specialists.length > 0) {
        specialists.forEach(specialist => {
            specialistsHTML += `
                <div class="modal-specialist-item" data-specialist-id="${specialist.id}" onclick="selectSpecialist(${specialist.id}, this)">
                    <div class="specialist-image" style="background-image: url('${specialist.фото || 'photo/specialists/default.jpg'}')"></div>
                    <div class="specialist-info">
                        <h4>${specialist.имя}</h4>
                        <p>${specialist.описание || 'Профессиональный мастер'}</p>
                    </div>
                </div>
            `;
        });
    } else {
        specialistsHTML = '<p>Нет доступных мастеров для этой услуги</p>';
    }
    
    modalContent.innerHTML = `
        <button class="close-modal-btn" onclick="closeServiceModal()">⨉</button>
        <div class="modal-step" id="step-specialists">
            <h1>${service.название}</h1>
            <p class="service-modal-description">${service.описание || ''}</p>
            <p class="service-modal-price">${service.цена} ₽</p>
            
            <div class="specialist-selection">
                <h2>Выберите мастера</h2>
                <div class="modal-specialists-list">
                    ${specialistsHTML}
                </div>
            </div>
        </div>
        
        <div class="modal-step" id="step-dates" style="display: none;">
            <div class="step-header">
                <button class="back-btn" onclick="backToSpecialists()">← Назад</button>
                <h2>Выберите дату</h2>
            </div>
            <div class="month-navigation">
                <button class="month-nav-btn" onclick="changeMonthService(-1)">⭠</button>
                <span class="current-month" id="current-month-service"></span>
                <button class="month-nav-btn" onclick="changeMonthService(1)">⭢</button>
            </div>
            <div class="date-grid" id="date-grid-service"></div>
            <div class="loading-dates" id="loading-dates-service" style="display: none; text-align: center; padding: 1rem;">
                Загрузка доступных дат...
            </div>
        </div>
        
        <div class="modal-step" id="step-times" style="display: none;">
            <div class="step-header">
                <button class="back-btn" onclick="backToDatesserv()">← Назад</button>
                <h2>Выберите время</h2>
            </div>
            <div class="time-slots" id="time-slots-service"></div>
        </div>
    `;
    
    console.log('Showing service modal');
    modal.style.display = 'block';
}

function selectSpecialist(specialistId, element) {
    console.log(`Selected specialist ID: ${specialistId}`);
    const allItems = document.querySelectorAll('.modal-specialist-item');
    allItems.forEach(item => item.classList.remove('selected-specialist'));
    
    element.classList.add('selected-specialist');
    
    window.currentSpecialistId = specialistId;
    window.currentMonthService = new Date().getMonth();
    window.currentYearService = new Date().getFullYear();
    window.availableDatesService = {};
    
    // Переходим к выбору даты
    showStep('dates');
    
    // Загружаем доступные даты для текущего месяца
    loadAvailableDatesService();
}

function showStep(step) {
    // Скрываем все шаги
    document.querySelectorAll('.modal-step').forEach(stepEl => {
        stepEl.style.display = 'none';
    });
    
    // Показываем нужный шаг
    document.getElementById(`step-${step}`).style.display = 'block';
    window.currentStep = step;
}

function backToSpecialists() {
    showStep('specialists');
}

function backToDatesserv() {
    showStep('dates');
}

function changeMonthService(direction) {
    window.currentMonthService += direction;
    
    // Проверяем границы года
    if (window.currentMonthService < 0) {
        window.currentMonthService = 11;
        window.currentYearService--;
    } else if (window.currentMonthService > 11) {
        window.currentMonthService = 0;
        window.currentYearService++;
    }
    
    // Загружаем доступные даты для нового месяца
    loadAvailableDatesService();
}

function loadAvailableDatesService() {
    const monthKey = `${window.currentYearService}-${window.currentMonthService + 1}`;
    
    // Показываем индикатор загрузки
    document.getElementById('loading-dates-service').style.display = 'block';
    document.getElementById('date-grid-service').innerHTML = '';
    
    // Если данные уже загружены для этого месяца, используем их
    if (window.availableDatesService[monthKey]) {
        generateDateGridService(window.availableDatesService[monthKey]);
        return;
    }
    
    // Получаем первый и последний день месяца
    const firstDay = new Date(window.currentYearService, window.currentMonthService, 1);
    const lastDay = new Date(window.currentYearService, window.currentMonthService + 1, 0);
    
    // Форматируем даты для запроса
    const startDate = `${window.currentYearService}-${(window.currentMonthService + 1).toString().padStart(2, '0')}-01`;
    const endDate = `${window.currentYearService}-${(window.currentMonthService + 1).toString().padStart(2, '0')}-${lastDay.getDate().toString().padStart(2, '0')}`;
    
    console.log(`Fetching available dates for specialist ${window.currentSpecialistId}, service ${window.currentServiceId} from ${startDate} to ${endDate}`);
    
    // Запрашиваем доступные даты у API
    fetch(`/api/specialist/${window.currentSpecialistId}/service/${window.currentServiceId}/available-dates?start=${startDate}&end=${endDate}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`Available dates for month ${monthKey}:`, data);
            
            // Сохраняем доступные даты
            window.availableDatesService[monthKey] = data.availableDates || [];
            
            // Генерируем календарь
            generateDateGridService(window.availableDatesService[monthKey]);
        })
        .catch(error => {
            console.error('Error fetching available dates:', error);
            // Если API не поддерживает запрос доступных дат, генерируем календарь без данных
            generateDateGridService([]);
        })
        .finally(() => {
            // Скрываем индикатор загрузки
            document.getElementById('loading-dates-service').style.display = 'none';
        });
}

function generateDateGridService(availableDates) {
    const dateGrid = document.getElementById('date-grid-service');
    const currentMonthElement = document.getElementById('current-month-service');
    
    // Названия месяцев
    const monthNames = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    
    // Устанавливаем текущий месяц
    currentMonthElement.textContent = `${monthNames[window.currentMonthService]} ${window.currentYearService}`;
    
    // Очищаем сетку дат
    dateGrid.innerHTML = '';
    
    // Получаем первый день месяца и количество дней в месяце
    const firstDay = new Date(window.currentYearService, window.currentMonthService, 1);
    const lastDay = new Date(window.currentYearService, window.currentMonthService + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Создаем заголовки дней недели
    const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    dayNames.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.textContent = day;
        dateGrid.appendChild(dayHeader);
    });
    
    // Добавляем пустые ячейки для дней перед первым днем месяца
    for (let i = 0; i < (firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1); i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'date-cell empty';
        dateGrid.appendChild(emptyCell);
    }
    
    // Добавляем ячейки с датами
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dateCell = document.createElement('div');
        dateCell.className = 'date-cell';
        
        const currentDate = new Date(window.currentYearService, window.currentMonthService, day);
        const formattedDate = `${window.currentYearService}-${(window.currentMonthService + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        
        // Проверяем, не прошедшая ли это дата
        if (currentDate < today) {
            dateCell.classList.add('past-date');
            dateCell.textContent = day;
        } 
        // Проверяем, доступна ли эта дата
        else if (availableDates.includes(formattedDate)) {
            dateCell.classList.add('available-date');
            dateCell.textContent = day;
            dateCell.onclick = () => selectDateService(day);
            dateCell.title = 'Есть доступное время';
        }
        // Дата в будущем, но без доступного времени
        else {
            dateCell.classList.add('no-availability');
            dateCell.textContent = day;
            dateCell.title = 'Нет доступного времени';
        }
        
        dateGrid.appendChild(dateCell);
    }
}

function selectDateService(day) {
    console.log(`Selected date: ${day}.${window.currentMonthService + 1}.${window.currentYearService}`);
    
    // Форматируем дату для запроса
    const formattedDate = `${window.currentYearService}-${(window.currentMonthService + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    window.selectedDate = formattedDate;
    
    // Переходим к выбору времени
    showStep('times');
    
    // Загружаем доступное время
    loadAvailableTimeService(formattedDate);
}

function loadAvailableTimeService(date) {
    if (!window.currentSpecialistId || !window.currentServiceId) {
        console.error('Specialist ID or Service ID not found');
        return;
    }
    
    console.log(`Fetching schedule for specialist ${window.currentSpecialistId}, service ${window.currentServiceId} on date ${date}`);
    fetch(`/api/specialist/${window.currentSpecialistId}/service/${window.currentServiceId}/schedule/${date}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`Schedule data for date ${date}:`, data);
            if (data.message === 'success') {
                displayTimeSlotsService(data.data);
            } else {
                document.getElementById('time-slots-service').innerHTML = '<p>Нет доступного времени на выбранную дату</p>';
            }
        })
        .catch(error => {
            console.error('Error fetching schedule:', error);
            document.getElementById('time-slots-service').innerHTML = '<p>Ошибка загрузки расписания</p>';
        });
}

function displayTimeSlotsService(timeSlots) {
    const timeSlotsContainer = document.getElementById('time-slots-service');
    timeSlotsContainer.innerHTML = '';
    
    if (!timeSlots || timeSlots.length === 0) {
        console.warn('No available time slots for selected date');
        timeSlotsContainer.innerHTML = '<p>Нет доступного времени на выбранную дату</p>';
        return;
    }
    
    console.log('Displaying time slots:', timeSlots);
    timeSlots.forEach(slot => {
        const timeBtn = document.createElement('button');
        timeBtn.className = 'time-slot-btn';
        timeBtn.textContent = slot.время;
        timeBtn.onclick = () => bookAppointmentService(slot.id, slot.время);
        timeSlotsContainer.appendChild(timeBtn);
    });
}

function bookAppointmentService(scheduleId) {
    console.log(`Booking appointment: Service ID ${window.currentServiceId}, Specialist ID ${window.currentSpecialistId}, Schedule ID ${scheduleId}, Date ${window.selectedDate}`);
    alert(`Запись подтверждена!\nУслуга: ${window.currentService.название}\nМастер: #${window.currentSpecialistId}\nДата: ${window.selectedDate}`);
    closeServiceModal();
}

function closeServiceModal() {
    console.log('Closing service modal');
    document.getElementById('service-modal').style.display = 'none';
    window.currentServiceId = null;
    window.currentService = null;
    window.currentSpecialistId = null;
    window.selectedDate = null;
    window.availableDatesService = {};
    window.currentStep = null;
}

// Добавляем обработчики для модального окна услуг
window.onclick = function(event) {
    const modal = document.getElementById('service-modal');
    if (event.target === modal) {
        closeServiceModal();
    }
    
    const specialistModal = document.getElementById('specialist-modal');
    if (event.target === specialistModal) {
        closeSpecialistModal();
    }
}

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeServiceModal();
        closeSpecialistModal();
    }
});

// Функция для показа шага подтверждения
function showConfirmationStepService(time, scheduleId) {
    window.selectedTime = time;
    window.scheduleId = scheduleId;
    
    // Получаем информацию о мастере
    fetch(`/api/specialist/${window.currentSpecialistId}`)
        .then(response => response.json())
        .then(data => {
            if (data.message === 'success') {
                window.currentSpecialist = data.data;
                showConfirmationStepContentService();
            }
        })
        .catch(error => {
            console.error('Error fetching specialist info:', error);
            showConfirmationStepContentService();
        });
}

function showConfirmationStepContentService() {
    const stepContent = document.createElement('div');
    stepContent.className = 'modal-step';
    stepContent.id = 'step-confirmation-service';
    stepContent.innerHTML = `
        <div class="step-header">
            <button class="back-btn" onclick="backToTimesService()">← Назад</button>
            <h2>Подтверждение записи</h2>
        </div>
        
        <div class="booking-confirmation">
            <div class="booking-summary">
                <div class="booking-summary-item">
                    <span class="booking-summary-label">Услуга:</span>
                    <span class="booking-summary-value">${window.currentService.название}</span>
                </div>
                <div class="booking-summary-item">
                    <span class="booking-summary-label">Мастер:</span>
                <span class="booking-summary-value">${window.currentSpecialist ? window.currentSpecialist.имя : 'Неизвестно'}</span>
                </div>
                <div class="booking-summary-item">
                    <span class="booking-summary-label">Дата:</span>
                    <span class="booking-summary-value">${formatDate(window.selectedDate)}</span>
                </div>
                <div class="booking-summary-item">
                    <span class="booking-summary-label">Время:</span>
                    <span class="booking-summary-value">${window.selectedTime}</span>
                </div>
                <div class="booking-summary-item">
                    <span class="booking-summary-label">Цена:</span>
                    <span class="booking-summary-value-price">${window.currentService.цена} ₽</span>
                </div>
            </div>
            
            <div class="client-form">
                <div class="form-group">

                    <input type="text" id="client-name" placeholder="Введите ваше имя" required>
                    <div class="error-message" id="name-error">Пожалуйста, введите ваше имя</div>
                </div>
                
                <div class="form-group">
                    <div class="phone-input-container">
                        <span class="phone-prefix">+7</span>
                        <input type="tel" id="client-phone" class="phone-input" 
                               placeholder="*** *** ** **" pattern="[0-9]{10}" 
                               maxlength="10" required>
                    </div>
                    <div class="error-message" id="phone-error">Введите 10 цифр номера телефона</div>
                </div>
                
                <button class="submit-btn" onclick="submitBookingService()">ПОДТВЕРДИТЬ ЗАПИСЬ</button>
            </div>
        </div>
    `;
    
    // Добавляем шаг в модальное окно
    document.querySelector('.service-modal-content').appendChild(stepContent);
    showStep('confirmation-service');
    
    // Добавляем валидацию для телефона
    const phoneInput = document.getElementById('client-phone');
    phoneInput.addEventListener('input', function(e) {
        // Оставляем только цифры
        this.value = this.value.replace(/\D/g, '');
        // Ограничиваем длину
        if (this.value.length > 10) {
            this.value = this.value.slice(0, 10);
        }
        validatePhone();
    });
}

function backToTimesService() {
    showStep('times');
    // Удаляем шаг подтверждения
    const confirmationStep = document.getElementById('step-confirmation-service');
    if (confirmationStep) {
        confirmationStep.remove();
    }
}

function validatePhone() {
    const phoneInput = document.getElementById('client-phone');
    const errorElement = document.getElementById('phone-error');
    const phone = phoneInput.value;
    
    if (phone.length === 10 && /^\d+$/.test(phone)) {
        phoneInput.classList.remove('error');
        errorElement.classList.remove('show');
        return true;
    } else {
        phoneInput.classList.add('error');
        errorElement.classList.add('show');
        return false;
    }
}

function validateName() {
    const nameInput = document.getElementById('client-name');
    const errorElement = document.getElementById('name-error');
    const name = nameInput.value.trim();
    
    if (name.length >= 2) {
        nameInput.classList.remove('error');
        errorElement.classList.remove('show');
        return true;
    } else {
        nameInput.classList.add('error');
        errorElement.classList.add('show');
        return false;
    }
}

function submitBookingService() {
    const nameValid = validateName();
    const phoneValid = validatePhone();
    
    if (!nameValid || !phoneValid) {
        return;
    }
    
    const clientName = document.getElementById('client-name').value.trim();
    const clientPhone = '+7' + document.getElementById('client-phone').value;
    
    // Блокируем кнопку
    const submitBtn = document.querySelector('.submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'ОБРАБОТКА...';
    
    // Отправляем запрос на сервер
    fetch('/api/appointment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            specialistId: window.currentSpecialistId,
            serviceId: window.currentServiceId,
            date: window.selectedDate,
            time: window.selectedTime,
            clientName: clientName,
            clientPhone: clientPhone
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Ошибка при бронировании');
        }
        return response.json();
    })
    .then(data => {
        if (data.message === 'success') {
            showBookingSuccessService();
        } else {
            throw new Error(data.error || 'Ошибка при бронировании');
        }
    })
    .catch(error => {
        console.error('Booking error:', error);
        alert('Ошибка при бронировании: ' + error.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'ПОДТВЕРДИТЬ ЗАПИСЬ';
    });
}

function showBookingSuccessService() {
    const stepContent = document.createElement('div');
    stepContent.className = 'modal-step';
    stepContent.id = 'step-success-service';
    stepContent.innerHTML = `
        <div class="booking-success">
            <div class="success-icon">✓</div>
            <h3>Запись подтверждена!</h3>
            <p>Услуга: ${window.currentService.название}</p>
            <p>Мастер: ${window.currentSpecialist ? window.currentSpecialist.имя : 'Неизвестно'}</p>
            <p>Дата: ${formatDate(window.selectedDate)}</p>
            <p>Время: ${window.selectedTime}</p>
            <p>Цена: ${window.currentService.цена} ₽</p>
            <p>С вами свяжутся для подтверждения</p>
            <button class="submit-btn" onclick="closeServiceModal()" style="margin-top: 2rem;">ЗАКРЫТЬ</button>
        </div>
    `;
    
    // Заменяем содержимое модального окна
    document.querySelector('.service-modal-content').innerHTML = '';
    document.querySelector('.service-modal-content').appendChild(stepContent);
}

function showNoSpecialistsMessage(service) {
    const modal = document.getElementById('service-modal');
    const modalContent = modal.querySelector('.service-modal-content');
    
    modalContent.innerHTML = `
        <button class="close-modal-btn" onclick="closeServiceModal()">⨉</button>
        <div class="modal-step">
            <h1>${service.название}</h1>
            <p class="service-modal-description">${service.описание || ''}</p>
            <p class="service-modal-price">${service.цена} ₽</p>
            
            <div class="specialist-selection">
                <h2>Выберите мастера</h2>
                <p style="text-align: center; color: #000000; font-size: 1.1rem; margin: 2rem 0;">
                    На данный момент нет доступных мастеров для этой услуги
                </p>
                <button class="submit-btn" onclick="closeServiceModal()" style="margin: 0 auto;">
                    ПОНЯТНО
                </button>
            </div>
        </div>
    `;
    
    console.log('Showing no specialists message');
    modal.style.display = 'block';
}


function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Обновляем функцию bookAppointmentService
function bookAppointmentService(scheduleId, time) {
    console.log(`Booking appointment: Service ID ${window.currentServiceId}, Specialist ID ${window.currentSpecialistId}, Schedule ID ${scheduleId}, Date ${window.selectedDate}, Time ${time}`);
    showConfirmationStepService(time, scheduleId);
}