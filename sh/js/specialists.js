document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, checking specialists visibility...');
    checkSpecialistsVisibility();
});

function fetchSpecialists() {
    console.log('Fetching specialists from /api/specialists');
    fetch('/api/specialists')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Fetched specialists data:', data);
            if (data.message === 'success') {
                // Сервер уже отфильтровал специалистов, просто отображаем их
                displaySpecialists(data.data);
            } else {
                console.error('Invalid response:', data);
                showError('Ошибка загрузки данных');
            }
        })
        .catch(error => {
            console.error('Fetch error:', error);
            showError('Не удалось загрузить данные специалистов');
        });
}

function displaySpecialists(specialists) {
    const specialistsContainer = document.getElementById('specialists-container');
    if (!specialistsContainer) {
        console.error('Container not found during display');
        return;
    }

    if (!specialists || specialists.length === 0) {
        console.warn('No specialists with available appointments');
        specialistsContainer.innerHTML = '<p class="no-specialists" style="color: white; text-align: center; font-family: forum;">В данный момент нет доступных специалистов</p>';
        return;
    }

    specialistsContainer.innerHTML = '';

    specialists.forEach(specialist => {
        const specialistCard = document.createElement('div');
        specialistCard.className = 'specialist-card';

        const imageUrl = specialist.фото || 'photo/работники/default.jpg';
        
        specialistCard.style.backgroundImage = `url('${imageUrl}')`;
        specialistCard.style.backgroundSize = 'cover';
        specialistCard.style.backgroundPosition = 'center';
        specialistCard.style.backgroundRepeat = 'no-repeat';
        specialistCard.style.position = 'relative';
        specialistCard.style.overflow = 'hidden';

        specialistCard.innerHTML = `
            <div class="specialist-content">
                <div class="specialist-overlay"></div>
                <div class="specialist-info">
                    <h3 class="specialist-name">${specialist.имя}</h3>
                    <p class="specialist-description">${specialist.описание || 'Профессиональный мастер'}</p>
                </div>
                <button class="specialist-btn" onclick="openSpecialistModal(${specialist.id})">ВЫБРАТЬ</button>
            </div>
        `;

        specialistCard.onclick = (e) => {
            if (!e.target.classList.contains('specialist-btn')) {
                openSpecialistModal(specialist.id);
            }
        };

        specialistsContainer.appendChild(specialistCard);

        const img = new Image();
        img.onload = () => {
            specialistCard.style.backgroundImage = `url('${imageUrl}')`;
        };
        img.onerror = () => {
            specialistCard.style.backgroundImage = `url('photo/specialists/default.jpg')`;
        };
        img.src = imageUrl;
    });
}

// Остальные функции остаются без изменений...
function showError(message) {
    const container = document.getElementById('specialists-container');
    if (container) {
        container.innerHTML = `<p style="color: white; text-align: center; font-family: forum;">${message}</p>`;
    }
}


function openSpecialistModal(specialistId) {
    console.log(`Opening modal for specialist ID: ${specialistId}`);
    
    // Сначала получаем все услуги мастера
    fetch(`/api/specialist/${specialistId}/services`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`All services for specialist ${specialistId}:`, data);
            
            if (data.message === 'success') {
                if (!data.data || data.data.length === 0) {
                    // Если у мастера нет услуг, показываем сообщение
                    showNoServicesMessage();
                } else {
                    // Фильтруем услуги: оставляем только те, у которых есть свободное время
                    filterServicesWithAvailableTime(specialistId, data.data);
                }
            }
        })
        .catch(error => {
            console.error('Error fetching specialist services:', error);
            showNoServicesMessage();
        });
}


function filterServicesWithAvailableTime(specialistId, services) {
    if (!services || services.length === 0) {
        showNoServicesMessage();
        return;
    }

    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    const endDate = new Date(today.setMonth(today.getMonth() + 1)).toISOString().split('T')[0];

    const servicePromises = services.map(service => {
        return fetch(`/api/specialist/${specialistId}/service/${service.id}/available-dates?start=${startDate}&end=${endDate}`)
            .then(response => {
                if (!response.ok) return { service, hasAvailableTime: false };
                return response.json().then(data => ({
                    service,
                    hasAvailableTime: data.availableDates && data.availableDates.length > 0
                }));
            })
            .catch(error => {
                console.error(`Error checking available time for service ${service.id}:`, error);
                return { service, hasAvailableTime: false };
            });
    });

    Promise.all(servicePromises)
        .then(results => {
            const availableServices = results
                .filter(result => result.hasAvailableTime)
                .map(result => result.service);

            console.log(`Available services with free time for specialist ${specialistId}:`, availableServices);
            
            if (availableServices.length === 0) {
                showNoServicesMessage();
            } else {
                showSpecialistModal(specialistId, availableServices);
            }
        })
        .catch(error => {
            console.error('Error filtering services:', error);
            showNoServicesMessage();
        });
}

function filterSpecialistsWithAvailability(specialists) {
    if (!specialists || specialists.length === 0) {
        displaySpecialists([]);
        return;
    }

    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    const endDate = new Date(today.setMonth(today.getMonth() + 1)).toISOString().split('T')[0];

    const specialistPromises = specialists.map(specialist => {
        return new Promise((resolve) => {
            // Проверяем, есть ли у мастера доступные услуги в расписании
            fetch(`/api/specialist/${specialist.id}/services`)
                .then(response => {
                    if (!response.ok) {
                        resolve({ specialist, hasAvailability: false });
                        return;
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.message === 'success' && data.data && data.data.length > 0) {
                        // Проверяем доступное время для каждой услуги
                        checkServiceAvailability(specialist.id, data.data, startDate, endDate)
                            .then(hasAvailability => {
                                resolve({ specialist, hasAvailability });
                            })
                            .catch(() => {
                                resolve({ specialist, hasAvailability: false });
                            });
                    } else {
                        resolve({ specialist, hasAvailability: false });
                    }
                })
                .catch(() => {
                    resolve({ specialist, hasAvailability: false });
                });
        });
    });

    Promise.all(specialistPromises)
        .then(results => {
            const availableSpecialists = results
                .filter(result => result.hasAvailability)
                .map(result => result.specialist);

            console.log('Available specialists:', availableSpecialists);
            displaySpecialists(availableSpecialists);
        })
        .catch(error => {
            console.error('Error filtering specialists:', error);
            displaySpecialists([]);
        });
}


function checkServiceAvailability(specialistId, services, startDate, endDate) {
    if (!services || services.length === 0) {
        return Promise.resolve(false);
    }

    const servicePromises = services.map(service => {
        return fetch(`/api/specialist/${specialistId}/service/${service.id}/available-dates?start=${startDate}&end=${endDate}`)
            .then(response => {
                if (!response.ok) return false;
                return response.json().then(data => 
                    data.availableDates && data.availableDates.length > 0
                );
            })
            .catch(() => false);
    });

    return Promise.all(servicePromises)
        .then(results => results.some(result => result === true));
}



function fetchSpecialistsWithAvailability() {
    console.log('Fetching all specialists first...');
    
    // Сначала получаем всех специалистов
    fetch('/api/specialists-all')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.message === 'success') {
                // Фильтруем мастеров с доступными записями
                filterSpecialistsWithAvailability(data.data);
            } else {
                console.error('Invalid response:', data);
                showError('Ошибка загрузки данных');
            }
        })
        .catch(error => {
            console.error('Fetch error:', error);
            showError('Не удалось загрузить данные специалистов');
        });
}
// Обновляем функцию получения услуг мастера из расписания
function fetchSpecialistServices(specialistId) {
    const sql = `
        SELECT DISTINCT у.* 
        FROM услуги у
        JOIN расписание р ON у.id = р.услуга_id
        WHERE р.мастер_id = ?
        AND у.доступен = 1
        AND р.доступно = 1
        AND р.дата >= date('now')
        ORDER BY у.категория, у.название
    `;
    
    db.all(sql, [specialistId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: "success",
            data: rows
        });
    });
}

function showSpecialistModal(specialistId, services) {
    const modal = document.getElementById('specialist-modal');
    const modalContent = modal.querySelector('.specialist-modal-content');
    
    window.currentSpecialistId = specialistId;
    window.currentStep = 'services'; // Начинаем с выбора услуг
    
    let servicesHTML = '';
    services.forEach(service => {
        servicesHTML += `
            <div class="modal-service-item" data-service-id="${service.id}" onclick="selectService(${service.id}, this)">
                <h4>${service.название}</h4>
                <p>${service.цена} ₽</p>
            </div>
        `;
    });
    
    modalContent.innerHTML = `
        <button class="close-modal-btn" onclick="closeSpecialistModal()">⨉</button>
        <div class="modal-step" id="step-services">
            <h2>Выберите услугу</h2>
            <div class="modal-services-list">
                ${servicesHTML}
            </div>
        </div>
        
        <div class="modal-step" id="step-dates-specialist" style="display: none;">
            <div class="step-header">
                <button class="back-btn" onclick="backToServices()">← Назад</button>
                <h2>Выберите дату</h2>
            </div>
            <div class="month-navigation">
                <button class="month-nav-btn" onclick="changeMonth(-1)">←</button>
                <span class="current-month" id="current-month"></span>
                <button class="month-nav-btn" onclick="changeMonth(1)">→</button>
            </div>
            <div class="date-grid" id="date-grid"></div>
            <div class="loading-dates" id="loading-dates" style="display: none; text-align: center; padding: 1rem;">
                Загрузка доступных дат...
            </div>
        </div>
        
        <div class="modal-step" id="step-times-specialist" style="display: none;">
            <div class="step-header">
                <button class="back-btn" onclick="backToDates()">← Назад</button>
                <h2>Выберите время</h2>
            </div>
            <div class="time-slots" id="time-slots"></div>
        </div>
    `;
    
    console.log('Showing specialist modal');
    modal.style.display = 'block';
}

function selectService(serviceId, element) {
    console.log(`Selected service ID: ${serviceId}`);
    const allItems = document.querySelectorAll('.modal-service-item');
    allItems.forEach(item => item.classList.remove('selected-service'));
    
    element.classList.add('selected-service');
    
    window.currentServiceId = serviceId;
    window.currentMonth = new Date().getMonth();
    window.currentYear = new Date().getFullYear();
    window.availableDates = {};
    
    // Переходим к выбору даты
    showStepSpecialist('dates');
    
    // Загружаем доступные даты для текущего месяца
    loadAvailableDates();
}

function showStepSpecialist(step) {
    // Скрываем все шаги только внутри модального окна специалиста
    const modal = document.getElementById('specialist-modal');
    modal.querySelectorAll('.modal-step').forEach(stepEl => {
        stepEl.style.display = 'none';
    });
    // Показываем нужный шаг с учетом новых id
    let stepId = `step-${step}`;
    if (step === 'dates' || step === 'times') {
        stepId = `step-${step}-specialist`;
    }
    const stepEl = document.getElementById(stepId);
    if (stepEl) stepEl.style.display = 'block';
    window.currentStep = step;
}

function backToServices() {
    showStepSpecialist('services');
}

function backToDates() {
    showStepSpecialist('dates');
}

function loadAvailableDates() {
    const monthKey = `${window.currentSpecialistId}-${window.currentServiceId}-${window.currentYear}-${window.currentMonth + 1}`;
    
    // Показываем индикатор загрузки
    document.getElementById('loading-dates').style.display = 'block';
    document.getElementById('date-grid').innerHTML = '';
    
    // Если данные уже загружены для этой комбинации специалист-услуга-месяц, используем их
    if (window.availableDates[monthKey]) {
        generateDateGrid(window.availableDates[monthKey]);
        document.getElementById('loading-dates').style.display = 'none';
        return;
    }
    
    // Получаем первый и последний день месяца
    const firstDay = new Date(window.currentYear, window.currentMonth, 1);
    const lastDay = new Date(window.currentYear, window.currentMonth + 1, 0);
    
    // Форматируем даты для запроса
    const startDate = `${window.currentYear}-${(window.currentMonth + 1).toString().padStart(2, '0')}-01`;
    const endDate = `${window.currentYear}-${(window.currentMonth + 1).toString().padStart(2, '0')}-${lastDay.getDate().toString().padStart(2, '0')}`;
    
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
            
            // Сохраняем доступные даты с ключом, включающим specialistId и serviceId
            window.availableDates[monthKey] = data.availableDates || [];
            
            // Генерируем календарь
            generateDateGrid(window.availableDates[monthKey]);
        })
        .catch(error => {
            console.error('Error fetching available dates:', error);
            // Если API не поддерживает запрос доступных дат, генерируем календарь без данных
            generateDateGrid([]);
        })
        .finally(() => {
            document.getElementById('loading-dates').style.display = 'none';
        });
}

function changeMonth(direction) {
    window.currentMonth += direction;
    
    // Проверяем границы года
    if (window.currentMonth < 0) {
        window.currentMonth = 11;
        window.currentYear--;
    } else if (window.currentMonth > 11) {
        window.currentMonth = 0;
        window.currentYear++;
    }
    
    // Загружаем доступные даты для нового месяца
    loadAvailableDates();
}

function generateDateGrid(availableDates) {
    const dateGrid = document.getElementById('date-grid');
    const currentMonthElement = document.getElementById('current-month');
    
    // Названия месяцев
    const monthNames = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    
    // Устанавливаем текущий месяц
    currentMonthElement.textContent = `${monthNames[window.currentMonth]} ${window.currentYear}`;
    
    // Очищаем сетку дат
    dateGrid.innerHTML = '';
    
    // Получаем первый день месяца и количество дней в месяце
    const firstDay = new Date(window.currentYear, window.currentMonth, 1);
    const lastDay = new Date(window.currentYear, window.currentMonth + 1, 0);
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
        
        const currentDate = new Date(window.currentYear, window.currentMonth, day);
        const formattedDate = `${window.currentYear}-${(window.currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        
        // Проверяем, не прошедшая ли это дата
        if (currentDate < today) {
            dateCell.classList.add('past-date');
            dateCell.textContent = day;
        } 
        // Проверяем, доступна ли эта дата
        else if (availableDates.includes(formattedDate)) {
            dateCell.classList.add('available-date');
            dateCell.textContent = day;
            dateCell.onclick = () => selectDate(day);
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

function selectDate(day) {
    console.log(`Selected date: ${day}.${window.currentMonth + 1}.${window.currentYear}`);
    
    // Форматируем дату для запроса
    const formattedDate = `${window.currentYear}-${(window.currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    window.selectedDate = formattedDate;
    
    // Переходим к выбору времени
    showStepSpecialist('times');
    
    // Загружаем доступное время
    loadAvailableTime(formattedDate);
}

function loadAvailableTime(date) {
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
                displayTimeSlots(data.data);
            } else {
                document.getElementById('time-slots').innerHTML = '<p>Нет доступного времени на выбранную дату</p>';
            }
        })
        .catch(error => {
            console.error('Error fetching schedule:', error);
            document.getElementById('time-slots').innerHTML = '<p>Ошибка загрузки расписания</p>';
        });
}

function displayTimeSlots(timeSlots) {
    const timeSlotsContainer = document.getElementById('time-slots');
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
        timeBtn.onclick = () => bookAppointment(slot.id, slot.время);
        timeSlotsContainer.appendChild(timeBtn);
    });
}

function bookAppointment(scheduleId) {
    if (!window.currentServiceId) {
        console.error('No service selected for booking');
        alert('Пожалуйста, выберите услугу');
        return;
    }
    
    console.log(`Booking appointment: Service ID ${window.currentServiceId}, Schedule ID ${scheduleId}, Date ${window.selectedDate}`);
    alert(`Запись подтверждена!\nУслуга: #${window.currentServiceId}\nДата: ${window.selectedDate}`);
    closeSpecialistModal();
}

function closeSpecialistModal() {
    console.log('Closing specialist modal');
    document.getElementById('specialist-modal').style.display = 'none';
    window.currentSpecialistId = null;
    window.currentServiceId = null;
    window.selectedDate = null;
    window.availableDates = {};
    window.currentStep = null;
}

// Функция для получения информации о мастере
function fetchSpecialistInfo(specialistId) {
    return fetch(`/api/specialist/${specialistId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.message === 'success') {
                return data.data;
            } else {
                throw new Error(data.error || 'Ошибка загрузки информации о мастере');
            }
        });
}
// Функция для показа шага подтверждения (специалисты)
function showConfirmationStepSpecialist(time, scheduleId) {
    window.selectedTime = time;
    window.scheduleId = scheduleId;
    
    // Получаем информацию об услуге и мастере одновременно
    Promise.all([
        fetch(`/api/service/${window.currentServiceId}`).then(r => r.json()),
        fetchSpecialistInfo(window.currentSpecialistId)
    ])
    .then(([serviceData, specialistData]) => {
        if (serviceData.message === 'success') {
            window.currentService = serviceData.data;
            window.currentSpecialist = specialistData;
            showConfirmationStepContentSpecialist();
        } else {
            throw new Error('Ошибка загрузки информации об услуге');
        }
    })
    .catch(error => {
        console.error('Error fetching info:', error);
        showConfirmationStepContentSpecialist();
    });
}

function showConfirmationStepContentSpecialist() {
    const stepContent = document.createElement('div');
    stepContent.className = 'modal-step';
    stepContent.id = 'step-confirmation-specialist';
    stepContent.innerHTML = `
        <div class="step-header">
            <button class="back-btn" onclick="backToTimesSpecialist()">← Назад</button>
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
                    <span class="booking-summary-value">${formatDateSpecialist(window.selectedDate)}</span>
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
                    <input type="text" id="client-name-specialist" placeholder="Введите ваше имя" required>
                    <div class="error-message" id="name-error-specialist">Пожалуйста, введите ваше имя</div>
                </div>
                
                <div class="form-group">
                    <div class="phone-input-container">
                        <span class="phone-prefix">+7</span>
                        <input type="tel" id="client-phone-specialist" class="phone-input" 
                               placeholder="9001234567" pattern="[0-9]{10}" 
                               maxlength="10" required>
                    </div>
                    <div class="error-message" id="phone-error-specialist">Введите 10 цифр номера телефона</div>
                </div>
                
                <button class="submit-btn" onclick="submitBookingSpecialist()">ПОДТВЕРДИТЬ ЗАПИСЬ</button>
            </div>
        </div>
    `;
    
    document.querySelector('.specialist-modal-content').appendChild(stepContent);
    showStepSpecialist('confirmation-specialist');
    
    const phoneInput = document.getElementById('client-phone-specialist');
    phoneInput.addEventListener('input', function(e) {
        this.value = this.value.replace(/\D/g, '');
        if (this.value.length > 10) {
            this.value = this.value.slice(0, 10);
        }
        validatePhoneSpecialist();
    });
}

function backToTimesSpecialist() {
    showStepSpecialist('times');
    const confirmationStep = document.getElementById('step-confirmation-specialist');
    if (confirmationStep) {
        confirmationStep.remove();
    }
}

function validatePhoneSpecialist() {
    const phoneInput = document.getElementById('client-phone-specialist');
    const errorElement = document.getElementById('phone-error-specialist');
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

function validateNameSpecialist() {
    const nameInput = document.getElementById('client-name-specialist');
    const errorElement = document.getElementById('name-error-specialist');
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

function submitBookingSpecialist() {
    const nameValid = validateNameSpecialist();
    const phoneValid = validatePhoneSpecialist();
    
    if (!nameValid || !phoneValid) {
        return;
    }
    
    const clientName = document.getElementById('client-name-specialist').value.trim();
    const clientPhone = '+7' + document.getElementById('client-phone-specialist').value;
    
    const submitBtn = document.querySelector('.specialist-modal-content .submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'ОБРАБОТКА...';
    
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
            showBookingSuccessSpecialist();
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

function showBookingSuccessSpecialist() {
    const stepContent = document.createElement('div');
    stepContent.className = 'modal-step';
    stepContent.id = 'step-success-specialist';
    stepContent.innerHTML = `
        <div class="booking-success">
            <div class="success-icon">✓</div>
            <h3>Запись подтверждена!</h3>
            <p>Услуга: ${window.currentService.название}</p>
            <p>Мастер: ${window.currentSpecialist ? window.currentSpecialist.имя : 'Неизвестно'}</p>
            <p>Дата: ${formatDateSpecialist(window.selectedDate)}</p>
            <p>Время: ${window.selectedTime}</p>
            <p>Цена: ${window.currentService.цена} ₽</p>
            <p>С вами свяжутся для подтверждения</p>
            <a href="https://t.me/shafrbeautybot" target="_blank" class="buttonn">
                <div class="iconn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-telegram" viewBox="0 0 16 16">
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.287 5.906c-.778.324-2.334.994-4.666 2.01-.378.15-.577.298-.595.442-.03.243.275.339.69.47l.175.055c.408.133.958.288 1.243.294.26.006.549-.1.868-.32 2.179-1.471 3.304-2.214 3.374-2.23.05-.012.12-.026.166.016.047.041.042.12.037.141-.03.129-1.227 1.241-1.846 1.817-.193.18-.33.307-.358.336a8.154 8.154 0 0 1-.188.186c-.38.366-.664.64.015 1.088.327.216.589.393.85.571.284.194.568.387.936.629.093.06.183.125.27.187.331.236.63.448.997.414.214-.02.435-.22.547-.82.265-1.417.786-4.486.906-5.751a1.426 1.426 0 0 0-.013-.315.337.337 0 0 0-.114-.217.526.526 0 0 0-.31-.093c-.3.005-.763.166-2.984 1.09z"></path>
                    </svg>
                </div>
                <p3>Telegram</p3>
            </a>
            <button class="submit-btn" onclick="closeSpecialistModal()" style="margin-top: 2rem;">ЗАКРЫТЬ</button>
        </div>
    `;
    
    document.querySelector('.specialist-modal-content').innerHTML = '';
    document.querySelector('.specialist-modal-content').appendChild(stepContent);
}


// Новая функция для показа сообщения об отсутствии услуг
function showNoServicesMessage() {
    const modal = document.getElementById('specialist-modal');
    const modalContent = modal.querySelector('.specialist-modal-content');
    
    modalContent.innerHTML = `
        <button class="close-modal-btn" onclick="closeSpecialistModal()">⨉</button>
        <div class="modal-step">
            <h2>Информация о специалисте</h2>
            <p style="text-align: center; color: #000000; font-size: 1.1rem; margin: 2rem 0;">
                На данный момент у специалиста нет свободного времени
            </p>
            <button class="submit-btn" onclick="closeSpecialistModal()" style="margin: 0 auto;">
                ПОНЯТНО
            </button>
        </div>
    `;
    
    console.log('Showing no services message');
    modal.style.display = 'block';
}

function formatDateSpecialist(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}
async function checkSpecialistsVisibility() {
    try {
        const response = await fetch('/api/settings');
        if (response.ok) {
            const data = await response.json();
            if (data.message === 'success' && data.data.show_specialists === '1') {
                console.log('Specialists section is enabled, fetching specialists...');
                fetchSpecialistsWithAvailability();
            } else {
                console.log('Specialists section is disabled, hiding section...');
                hideSpecialistsSection();
            }
        } else {
            console.error('Failed to fetch settings');
            fetchSpecialistsWithAvailability(); // Fallback: show by default
        }
    } catch (error) {
        console.error('Error checking specialists visibility:', error);
        fetchSpecialistsWithAvailability(); // Fallback: show by default
    }
}

function hideSpecialistsSection() {
    const specialistsSection = document.getElementById('specialists-section');
    if (specialistsSection) {
        specialistsSection.style.display = 'none';
    }
}

// Обновляем функцию bookAppointment
function bookAppointment(scheduleId, time) {
    console.log(`Booking appointment: Service ID ${window.currentServiceId}, Schedule ID ${scheduleId}, Date ${window.selectedDate}, Time ${time}`);
    showConfirmationStepSpecialist(time, scheduleId);
}