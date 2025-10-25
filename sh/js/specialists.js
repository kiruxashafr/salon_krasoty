document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, checking specialists visibility...');
    checkSpecialistsVisibility();
});

let specialistsRefreshInterval;


function showLoadingIndicatorSpecialists(containerId) {
    const container = document.getElementById(containerId);
    if (container && !container.querySelector('.specialist-card')) {
        container.classList.add('loading');
        container.innerHTML = `
            <div class="loading-indicator">
                <div class="spinner"></div>
            </div>
        `;
    }
}

function hideLoadingIndicatorSpecialists(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        // Убираем класс загрузки
        container.classList.remove('loading');
        const loadingIndicator = container.querySelector('.loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.remove();
        }
    }
}


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

function startSpecialistsAutoRefresh() {
    if (specialistsRefreshInterval) {
        clearInterval(specialistsRefreshInterval);
    }
    
    specialistsRefreshInterval = setInterval(() => {
        console.log('Auto-refreshing specialists data...');
        fetchSpecialistsWithAvailability();
    }, 30000);
}

// Обновите функцию displaySpecialists
function displaySpecialists(specialists) {
    const specialistsContainer = document.getElementById('specialists-container');
    
    // Скрываем индикатор загрузки
    hideLoadingIndicatorSpecialists('specialists-container');
    
    if (!specialistsContainer) {
        console.error('Container not found during display');
        return;
    }

    if (!specialists || specialists.length === 0) {
        console.warn('No specialists with available appointments');
        specialistsContainer.innerHTML = '<p class="no-specialists" style="color: white; text-align: center; font-family: forum; padding: 2rem;">В данный момент нет доступных специалистов</p>';
        return;
    }

    specialistsContainer.innerHTML = '';

    specialists.forEach(specialist => {
        const specialistCard = document.createElement('div');
        specialistCard.className = 'specialist-card';

        const imageUrl = specialist.фото || 'photo/работники/default.jpg';
        
        specialistCard.style.backgroundImage = `url('${imageUrl}')`;
        specialistCard.style.backgroundSize = 'cover';
        specialistCard.style.backgroundPosition = 'top';
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

function showError(message) {
    const container = document.getElementById('specialists-container');
    if (container) {
        container.innerHTML = `<p style="color: white; text-align: center; font-family: forum;">${message}</p>`;
    }
}

// Обновите функцию openSpecialistModal
function openSpecialistModal(specialistId) {
    console.log(`Opening modal for specialist ID: ${specialistId}`);
    
    // Сброс переменных для специалистского модального окна
    window.specialistCurrentMonth = new Date().getMonth();
    window.specialistCurrentYear = new Date().getFullYear();
    window.specialistAvailableDates = {};
    window.specialistCurrentSpecialistId = specialistId;
    window.specialistCurrentServiceId = null;
    window.specialistSelectedDate = null;
    window.specialistCurrentStep = 'services';
    
    const modal = document.getElementById('specialist-modal');
    const modalContent = modal.querySelector('.specialist-modal-content');
    
    // Показываем индикатор загрузки в модальном окне
    modalContent.innerHTML = `
        <button class="close-modal-btn" onclick="closeSpecialistModal()">⨉</button>
        <div class="modal-step">
            <div class="loading-indicator">
                <div class="spinner"></div>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
    
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
                    showNoServicesMessage();
                } else {
                    filterServicesWithAvailableTimeSpecialist(specialistId, data.data);
                }
            }
        })
        .catch(error => {
            console.error('Error fetching specialist services:', error);
            showNoServicesMessage();
        });
}

// Обновите функцию filterServicesWithAvailableTimeSpecialist
function filterServicesWithAvailableTimeSpecialist(specialistId, services) {
    if (!services || services.length === 0) {
        showNoServicesMessage();
        return;
    }

    const modalContent = document.querySelector('.specialist-modal-content');
    
    // Показываем индикатор загрузки услуг
    modalContent.innerHTML = `
        <button class="close-modal-btn" onclick="closeSpecialistModal()">⨉</button>
        <div class="modal-step">
            <div class="loading-indicator">
                <div class="spinner"></div>
            </div>
        </div>
    `;

    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    const endDate = new Date(today.setMonth(today.getMonth() + 1)).toISOString().split('T')[0];

    const servicePromises = services.map(service => {
        return new Promise((resolve) => {
            fetch(`/api/specialist/${specialistId}/service/${service.id}/available-dates?start=${startDate}&end=${endDate}`)
                .then(response => {
                    if (!response.ok) {
                        resolve({ service, hasAvailableTime: false });
                        return;
                    }
                    return response.json();
                })
                .then(data => {
                    if (!data.availableDates || data.availableDates.length === 0) {
                        resolve({ service, hasAvailableTime: false });
                        return;
                    }

                    const datePromises = data.availableDates.map(date => {
                        return checkDateHasValidTimeSlotsSpecialist(specialistId, service.id, date);
                    });

                    Promise.all(datePromises)
                        .then(results => {
                            const hasValidSlots = results.some(hasSlots => hasSlots === true);
                            resolve({ service, hasAvailableTime: hasValidSlots });
                        })
                        .catch(() => resolve({ service, hasAvailableTime: false }));
                })
                .catch(() => resolve({ service, hasAvailableTime: false }));
        });
    });

    Promise.all(servicePromises)
        .then(results => {
            const availableServices = results
                .filter(result => result.hasAvailableTime)
                .map(result => result.service);

            console.log(`Available services with valid time slots for specialist ${specialistId}:`, availableServices);
            
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

function checkDateHasValidTimeSlotsSpecialist(specialistId, serviceId, date) {
    return new Promise((resolve) => {
        fetch(`/api/specialist/${specialistId}/service/${serviceId}/schedule/${date}`)
            .then(response => {
                if (!response.ok) {
                    resolve(false);
                    return;
                }
                return response.json();
            })
            .then(data => {
                if (!data.data || data.data.length === 0) {
                    resolve(false);
                    return;
                }

                const today = new Date().toISOString().split('T')[0];
                if (date !== today) {
                    resolve(true);
                    return;
                }

                const now = new Date();
                const currentHours = now.getHours();
                const currentMinutes = now.getMinutes();
                const currentTotalMinutes = currentHours * 60 + currentMinutes;

                const hasValidSlots = data.data.some(slot => {
                    const [hours, minutes] = slot.время.split(':').map(Number);
                    const slotTotalMinutes = hours * 60 + minutes;
                    
                    return slotTotalMinutes >= currentTotalMinutes - 120;
                });

                resolve(hasValidSlots);
            })
            .catch(() => resolve(false));
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
                        checkServiceAvailabilitySpecialist(specialist.id, data.data, startDate, endDate)
                            .then(hasAvailability => {
                                if (!hasAvailability) {
                                    resolve({ specialist, hasAvailability: false });
                                    return;
                                }
                                
                                checkSpecialistHasValidTimeSlotsSpecialist(specialist.id, startDate, endDate)
                                    .then(hasValidSlots => {
                                        resolve({ specialist, hasAvailability: hasValidSlots });
                                    })
                                    .catch(() => {
                                        resolve({ specialist, hasAvailability: false });
                                    });
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

            console.log('Available specialists with valid time slots:', availableSpecialists);
            displaySpecialists(availableSpecialists);
        })
        .catch(error => {
            console.error('Error filtering specialists:', error);
            displaySpecialists([]);
        });
}

function checkServiceAvailabilitySpecialist(specialistId, services, startDate, endDate) {
    if (!services || services.length === 0) {
        return Promise.resolve(false);
    }

    const servicePromises = services.map(service => {
        return new Promise((resolve) => {
            fetch(`/api/specialist/${specialistId}/service/${service.id}/available-dates?start=${startDate}&end=${endDate}`)
                .then(response => {
                    if (!response.ok) {
                        resolve(false);
                        return;
                    }
                    return response.json();
                })
                .then(data => {
                    if (!data.availableDates || data.availableDates.length === 0) {
                        resolve(false);
                        return;
                    }

                    const datePromises = data.availableDates.map(date => {
                        return checkDateHasValidTimeSlotsSpecialist(specialistId, service.id, date);
                    });

                    Promise.all(datePromises)
                        .then(results => {
                            const hasValidSlots = results.some(hasSlots => hasSlots === true);
                            resolve(hasValidSlots);
                        })
                        .catch(() => resolve(false));
                })
                .catch(() => resolve(false));
        });
    });

    return Promise.all(servicePromises)
        .then(results => results.some(result => result === true));
}

function fetchSpecialistsWithAvailability() {
    console.log('Fetching all specialists first...');
    
    // Не показываем индикатор загрузки при автообновлении
    const container = document.getElementById('specialists-container');
    const isInitialLoad = !container.querySelector('.specialist-card') && !container.querySelector('.no-specialists');
    
    if (isInitialLoad) {
        showLoadingIndicatorSpecialists('specialists-container');
    }
    
    fetch('/api/specialists')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.message === 'success') {
                filterSpecialistsWithAvailability(data.data);
            } else {
                console.error('Invalid response:', data);
                if (isInitialLoad) {
                    showError('Ошибка загрузки данных');
                    hideLoadingIndicatorSpecialists('specialists-container');
                }
            }
        })
        .catch(error => {
            console.error('Fetch error:', error);
            if (isInitialLoad) {
                showError('Не удалось загрузить данные специалистов');
                hideLoadingIndicatorSpecialists('specialists-container');
            }
        });
}

function showSpecialistModal(specialistId, services) {
    const modal = document.getElementById('specialist-modal');
    const modalContent = modal.querySelector('.specialist-modal-content');
    
    window.specialistCurrentSpecialistId = specialistId;
    window.specialistCurrentStep = 'services';
    
    let servicesHTML = '';
    if (services && services.length > 0) {
        services.forEach(service => {
            servicesHTML += `
                <div class="modal-service-item" data-service-id="${service.id}" onclick="selectServiceSpecialist(${service.id}, this)">
                    <div class="service-item-background" style="background-image: url('${service.фото || 'photo/услуги/default.jpg'}')"></div>
                    <div class="service-item-content">
                        <div class="service-item-info">
                            <h4>${service.название}</h4>
                            <p>${service.описание || ''}</p>
                        </div>
                        <div class="service-item-price">
                            <span>${service.цена} ₽</span>
                        </div>
                    </div>
                </div>
            `;
        });
    } else {
        servicesHTML = '<p>Нет доступных услуг для этого специалиста</p>';
    }
    
    modalContent.innerHTML = `
        <button class="close-modal-btn" onclick="closeSpecialistModal()">⨉</button>
        <div class="modal-step" id="specialist-step-services">
            <h2>Выберите услугу</h2>
            <div class="modal-services-list">
                ${servicesHTML}
            </div>
        </div>
        
        <div class="modal-step" id="specialist-step-dates" style="display: none;">
            <div class="step-header">
                <button class="back-btn" onclick="backToServicesSpecialist()">← Назад</button>
                <h2>Выберите дату</h2>
            </div>
            <div class="month-navigation">
                <button class="month-nav-btn" onclick="changeMonthSpecialist(-1)">←</button>
                <span class="current-month" id="specialist-current-month"></span>
                <button class="month-nav-btn" onclick="changeMonthSpecialist(1)">→</button>
            </div>
            <div class="date-grid" id="specialist-date-grid"></div>
            <div class="loading-dates" id="specialist-loading-dates" style="display: none; text-align: center; padding: 1rem;">
                Загрузка доступных дат...
            </div>
        </div>
        
        <div class="modal-step" id="specialist-step-times" style="display: none;">
            <div class="step-header">
                <button class="back-btn" onclick="backToDatesSpecialist()">← Назад</button>
                <h2>Выберите время</h2>
            </div>
            <div class="time-slots" id="specialist-time-slots"></div>
        </div>
    `;
    
    console.log('Showing specialist modal');
    modal.style.display = 'block';
}

function selectServiceSpecialist(serviceId, element) {
    console.log(`Selected service ID: ${serviceId}`);
    const allItems = document.querySelectorAll('.modal-service-item');
    allItems.forEach(item => item.classList.remove('selected-service'));
    
    element.classList.add('selected-service');
    
    window.specialistCurrentServiceId = serviceId;
    window.specialistCurrentMonth = new Date().getMonth();
    window.specialistCurrentYear = new Date().getFullYear();
    window.specialistAvailableDates = {};
    
    showStepSpecialist('dates');
    
    loadAvailableDatesSpecialist();
}

function showStepSpecialist(step) {
    const modal = document.getElementById('specialist-modal');
    modal.querySelectorAll('.modal-step').forEach(stepEl => {
        stepEl.style.display = 'none';
    });
    
    let stepId = `specialist-step-${step}`;
    const stepEl = document.getElementById(stepId);
    if (stepEl) {
        stepEl.style.display = 'block';
    }
    window.specialistCurrentStep = step;
}

function backToServicesSpecialist() {
    showStepSpecialist('services');
}

function backToDatesSpecialist() {
    showStepSpecialist('dates');
}

function loadAvailableDatesSpecialist() {
    const monthKey = `${window.specialistCurrentSpecialistId}-${window.specialistCurrentServiceId}-${window.specialistCurrentYear}-${window.specialistCurrentMonth + 1}`;
    const loadingElement = document.getElementById('specialist-loading-dates');
    const dateGridElement = document.getElementById('specialist-date-grid');
    
    loadingElement.style.display = 'block';
    dateGridElement.innerHTML = '';
    
    if (window.specialistAvailableDates[monthKey]) {
        generateDateGridSpecialist(window.specialistAvailableDates[monthKey]);
        loadingElement.style.display = 'none';
        return;
    }
    
    const firstDay = new Date(window.specialistCurrentYear, window.specialistCurrentMonth, 1);
    const lastDay = new Date(window.specialistCurrentYear, window.specialistCurrentMonth + 1, 0);
    
    const startDate = `${window.specialistCurrentYear}-${(window.specialistCurrentMonth + 1).toString().padStart(2, '0')}-01`;
    const endDate = `${window.specialistCurrentYear}-${(window.specialistCurrentMonth + 1).toString().padStart(2, '0')}-${lastDay.getDate().toString().padStart(2, '0')}`;
    
    console.log(`Fetching available dates for specialist ${window.specialistCurrentSpecialistId}, service ${window.specialistCurrentServiceId} from ${startDate} to ${endDate}`);
    
    fetch(`/api/specialist/${window.specialistCurrentSpecialistId}/service/${window.specialistCurrentServiceId}/available-dates?start=${startDate}&end=${endDate}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`Available dates for month ${monthKey}:`, data);
            
            window.specialistAvailableDates[monthKey] = data.availableDates || [];
            generateDateGridSpecialist(window.specialistAvailableDates[monthKey]);
        })
        .catch(error => {
            console.error('Error fetching available dates:', error);
            generateDateGridSpecialist([]);
        })
    .finally(() => {
        loadingElement.style.display = 'none';
        // Проверяем доступность следующего месяца
        checkNextMonthAvailabilitySpecialist();
    });
}

function changeMonthSpecialist(direction) {
    window.specialistCurrentMonth += direction;
    
    if (window.specialistCurrentMonth < 0) {
        window.specialistCurrentMonth = 11;
        window.specialistCurrentYear--;
    } else if (window.specialistCurrentMonth > 11) {
        window.specialistCurrentMonth = 0;
        window.specialistCurrentYear++;
    }
    
    loadAvailableDatesSpecialist();

}

function generateDateGridSpecialist(availableDates) {
    const dateGrid = document.getElementById('specialist-date-grid');
    const currentMonthElement = document.getElementById('specialist-current-month');
    const loadingElement = document.getElementById('specialist-loading-dates');
    
    loadingElement.style.display = 'none';
    
    const monthNames = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    
    currentMonthElement.textContent = `${monthNames[window.specialistCurrentMonth]} ${window.specialistCurrentYear}`;
    
    dateGrid.innerHTML = '';
    
    const firstDay = new Date(window.specialistCurrentYear, window.specialistCurrentMonth, 1);
    const lastDay = new Date(window.specialistCurrentYear, window.specialistCurrentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    dayNames.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.textContent = day;
        dateGrid.appendChild(dayHeader);
    });
    
    for (let i = 0; i < (firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1); i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'date-cell empty';
        dateGrid.appendChild(emptyCell);
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dateCell = document.createElement('div');
        dateCell.className = 'date-cell';
        
        const currentDate = new Date(window.specialistCurrentYear, window.specialistCurrentMonth, day);
        const formattedDate = `${window.specialistCurrentYear}-${(window.specialistCurrentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        
        const isToday = currentDate.toDateString() === today.toDateString();
        
        if (currentDate < today) {
            dateCell.classList.add('past-date');
            dateCell.textContent = day;
        } else if (availableDates.includes(formattedDate)) {
            if (isToday) {
                dateCell.classList.add('available-date');
                dateCell.textContent = day;
                dateCell.onclick = () => selectDateSpecialist(day);
                dateCell.title = 'Есть доступное время';
            } else {
                dateCell.classList.add('available-date');
                dateCell.textContent = day;
                dateCell.onclick = () => selectDateSpecialist(day);
                dateCell.title = 'Есть доступное время';
            }
        } else {
            dateCell.classList.add('no-availability');
            dateCell.textContent = day;
            dateCell.title = 'Нет доступного времени';
        }
        
        dateGrid.appendChild(dateCell);
    }
    
    // Добавляем легенду после календаря
    addCalendarLegendSpecialist();
}

function addCalendarLegendSpecialist() {
    const dateStep = document.getElementById('specialist-step-dates');
    
    // Удаляем существующую легенду, если есть
    const existingLegend = dateStep.querySelector('.calendar-legend');
    if (existingLegend) {
        existingLegend.remove();
    }
    
    const legend = document.createElement('div');
    legend.className = 'calendar-legend';
    legend.innerHTML = `
        <div class="legend-item">
            <div class="legend-color legend-available"></div>
            <span>Есть свободное время для записи</span>
        </div>
        <div class="legend-item">
            <div class="legend-color legend-unavailable"></div>
            <span>Нет доступного времени</span>
        </div>
        <div class="legend-item">
            <div class="legend-color legend-past"></div>
            <span>Прошедшая дата</span>
        </div>
    `;
    
    dateStep.appendChild(legend);
}

function selectDateSpecialist(day) {
    console.log(`Selected date: ${day}.${window.specialistCurrentMonth + 1}.${window.specialistCurrentYear}`);
    
    const formattedDate = `${window.specialistCurrentYear}-${(window.specialistCurrentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    window.specialistSelectedDate = formattedDate;
    
    showStepSpecialist('times');
    
    loadAvailableTimeSpecialist(formattedDate);
}

// Обновите функцию loadAvailableTimeSpecialist
function loadAvailableTimeSpecialist(date) {
    if (!window.specialistCurrentSpecialistId || !window.specialistCurrentServiceId) {
        console.error('Specialist ID or Service ID not found');
        return;
    }
    
    const timeSlotsContainer = document.getElementById('specialist-time-slots');
    timeSlotsContainer.innerHTML = `
        <div class="loading-indicator">
            <div class="spinner"></div>
        </div>
    `;
    
    console.log(`Fetching schedule for specialist ${window.specialistCurrentSpecialistId}, service ${window.specialistCurrentServiceId} on date ${date}`);
    fetch(`/api/specialist/${window.specialistCurrentSpecialistId}/service/${window.specialistCurrentServiceId}/schedule/${date}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`Schedule data for date ${date}:`, data);
            if (data.message === 'success') {
                displayTimeSlotsSpecialist(data.data);
            } else {
                timeSlotsContainer.innerHTML = '<p>Нет доступного времени на выбранную дату</p>';
            }
        })
        .catch(error => {
            console.error('Error fetching schedule:', error);
            timeSlotsContainer.innerHTML = '<p>Ошибка загрузки расписания</p>';
        });
}

function displayTimeSlotsSpecialist(timeSlots) {
    const timeSlotsContainer = document.getElementById('specialist-time-slots');
    timeSlotsContainer.innerHTML = '';
    
    if (!timeSlots || timeSlots.length === 0) {
        console.warn('No available time slots for selected date');
        timeSlotsContainer.innerHTML = '<p>Нет доступного времени на выбранную дату</p>';
        return;
    }
    
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    
    const today = new Date();
    const isToday = window.specialistSelectedDate === today.toISOString().split('T')[0];
    
    console.log('Displaying time slots:', timeSlots);
    timeSlots.forEach(slot => {
        const [hours, minutes] = slot.время.split(':').map(Number);
        
        if (isToday) {
            const slotTotalMinutes = hours * 60 + minutes;
            const currentTotalMinutes = currentHours * 60 + currentMinutes;
            
            if (slotTotalMinutes < currentTotalMinutes - 120) {
                console.log(`Skipping past time slot: ${slot.время}`);
                return;
            }
        }
        
        const timeBtn = document.createElement('button');
        timeBtn.className = 'time-slot-btn';
        timeBtn.textContent = slot.время;
        timeBtn.onclick = () => bookAppointmentSpecialist(slot.id, slot.время);
        timeSlotsContainer.appendChild(timeBtn);
    });
    
    if (timeSlotsContainer.children.length === 0) {
        timeSlotsContainer.innerHTML = '<p>Нет доступного времени на выбранную дату</p>';
    }
}

function bookAppointmentSpecialist(scheduleId, time) {
    console.log(`Booking appointment: Service ID ${window.specialistCurrentServiceId}, Schedule ID ${scheduleId}, Date ${window.specialistSelectedDate}, Time ${time}`);
    showConfirmationStepSpecialist(time, scheduleId);
}

function closeSpecialistModal() {
    console.log('Closing specialist modal');
    document.getElementById('specialist-modal').style.display = 'none';
    
    const isOnSuccessStep = window.specialistCurrentStep === 'success';
    
    // Сброс только специалистских переменных
    window.specialistCurrentSpecialistId = null;
    window.specialistCurrentServiceId = null;
    window.specialistSelectedDate = null;
    window.specialistAvailableDates = {};
    window.specialistCurrentStep = null;
    
    if (isOnSuccessStep) {
        console.log('Closing after successful booking - refreshing page');
        location.reload();
    }
}

function fetchSpecialistInfoSpecialist(specialistId) {
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

function showConfirmationStepSpecialist(time, scheduleId) {
    window.specialistSelectedTime = time;
    window.specialistScheduleId = scheduleId;
    
    Promise.all([
        fetch(`/api/service/${window.specialistCurrentServiceId}`).then(r => r.json()),
        fetchSpecialistInfoSpecialist(window.specialistCurrentSpecialistId)
    ])
    .then(([serviceData, specialistData]) => {
        if (serviceData.message === 'success') {
            window.specialistCurrentService = serviceData.data;
            window.specialistCurrentSpecialist = specialistData;
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
    stepContent.id = 'specialist-step-confirmation';
    
    const masterPhoto = window.specialistCurrentSpecialist?.фото || 'photo/работники/default.jpg';
    const formattedDate = formatDateSpecialist(window.specialistSelectedDate);
    
    stepContent.innerHTML = `
        <div class="step-header">
            <button class="back-btn" onclick="backToTimesSpecialist()">← Назад</button>
            <h2>Подтверждение записи</h2>
        </div>
        
        <div class="booking-confirmation">
            <div class="booking-summary">
                <div class="booking-summary-header">
                    <img src="${masterPhoto}" alt="${window.specialistCurrentSpecialist?.имя || 'Мастер'}" class="booking-summary-avatar" onerror="this.src='photo/работники/default.jpg'">
                    <div class="booking-summary-title">
                        <h3>${window.specialistCurrentService.название}</h3>
                        <p>${window.specialistCurrentSpecialist ? window.specialistCurrentSpecialist.имя : 'Неизвестно'}</p>
                    </div>
                </div>
                
                <div class="booking-summary-content">
                    <span class="booking-summary-datetime">${formattedDate} в ${window.specialistSelectedTime}</span>
                    <span class="booking-summary-price">${window.specialistCurrentService.цена} ₽</span>
                </div>
            </div>
            
            <div class="client-form">
                <div class="form-group">
                    <input type="text" id="specialist-client-name" placeholder="Введите ваше имя" required>
                    <div class="error-message" id="specialist-name-error">Пожалуйста, введите ваше имя</div>
                </div>
                
                <div class="form-group">
                    <div class="phone-input-container">
                        <span class="phone-prefix">+7</span>
                        <input type="tel" id="specialist-client-phone" class="phone-input" 
                               placeholder="9001234567" pattern="[0-9]{10}" 
                               maxlength="10" required>
                    </div>
                    <div class="error-message" id="specialist-phone-error">Введите 10 цифр номера телефона</div>
                </div>
                
                <button class="submit-btn" onclick="submitBookingSpecialist()">ПОДТВЕРДИТЬ ЗАПИСЬ</button>
            </div>
        </div>
    `;
    
    document.querySelector('.specialist-modal-content').appendChild(stepContent);
    showStepSpecialist('confirmation');
}

function backToTimesSpecialist() {
    showStepSpecialist('times');
    const confirmationStep = document.getElementById('specialist-step-confirmation');
    if (confirmationStep) {
        confirmationStep.remove();
    }
}

function validatePhoneSpecialist() {
    const phoneInput = document.getElementById('specialist-client-phone');
    const errorElement = document.getElementById('specialist-phone-error');
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
    const nameInput = document.getElementById('specialist-client-name');
    const errorElement = document.getElementById('specialist-name-error');
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
    
    const clientName = document.getElementById('specialist-client-name').value.trim();
    const clientPhone = '+7' + document.getElementById('specialist-client-phone').value;
    
    const submitBtn = document.querySelector('.specialist-modal-content .submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'ОБРАБОТКА...';
    
    fetch('/api/appointment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            specialistId: window.specialistCurrentSpecialistId,
            serviceId: window.specialistCurrentServiceId,
            date: window.specialistSelectedDate,
            time: window.specialistSelectedTime,
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
    stepContent.id = 'specialist-step-success';
    
    const masterPhoto = window.specialistCurrentSpecialist?.фото || 'photo/работники/default.jpg';
    const formattedDate = formatDateSpecialist(window.specialistSelectedDate);
    
    stepContent.innerHTML = `
        <div class="booking-success">
            <div class="success-header">
                <div class="success-icon">✓</div>
                <h3>Запись подтверждена!</h3>
            </div>
            
            <div class="booking-summary" style="margin: 1.5rem 0;">
                <div class="booking-summary-header">
                    <img src="${masterPhoto}" alt="${window.specialistCurrentSpecialist?.имя || 'Мастер'}" class="booking-summary-avatar" onerror="this.src='photo/работники/default.jpg'">
                    <div class="booking-summary-title">
                        <h3>${window.specialistCurrentService.название}</h3>
                        <p>${window.specialistCurrentSpecialist ? window.specialistCurrentSpecialist.имя : 'Неизвестно'}</p>
                    </div>
                </div>
                
                <div class="booking-summary-content">
                    <span class="booking-summary-datetime">${formattedDate} в ${window.specialistSelectedTime}</span>
                    <span class="booking-summary-price">${window.specialistCurrentService.цена} ₽</span>
                </div>
            </div>
            
            <div class="success-buttons">
                <a href="https://t.me/shafrbeautybot" target="_blank" class="telegram-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.287 5.906c-.778.324-2.334.994-4.666 2.01-.378.15-.577.298-.595.442-.03.243.275.339.69.47l.175.055c.408.133.958.288 1.243.294.26.006.549-.1.868-.32 2.179-1.471 3.304-2.214 3.374-2.23.05-.012.12-.026.166.016.047.041.042.12.037.141-.03.129-1.227 1.241-1.846 1.817-.193.18-.33.307-.358.336a8.154 8.154 0 0 1-.188.186c-.38.366-.664.64.015 1.088.327.216.589.393.85.571.284.194.568.387.936.629.093.06.183.125.27.187.331.236.63.448.997.414.214-.02.435-.22.547-.82.265-1.417.786-4.486.906-5.751a1.426 1.426 0 0 0-.013-.315.337.337 0 0 0-.114-.217.526.526 0 0 0-.31-.093c-.3.005-.763.166-2.984 1.09z"/>
                    </svg>
                    Управляйте записями<br>Получайте уведомления
                </a>
                <button class="close-success-btn" onclick="closeSpecialistModal()">Закрыть</button>
            </div>
        </div>
    `;
    
    document.querySelector('.specialist-modal-content').innerHTML = '';
    document.querySelector('.specialist-modal-content').appendChild(stepContent);
    
    window.specialistCurrentStep = 'success';
}

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

function checkSpecialistHasValidTimeSlotsSpecialist(specialistId, startDate, endDate) {
    return new Promise((resolve) => {
        fetch(`/api/specialist/${specialistId}/services`)
            .then(response => {
                if (!response.ok) {
                    resolve(false);
                    return;
                }
                return response.json();
            })
            .then(data => {
                if (!data.data || data.data.length === 0) {
                    resolve(false);
                    return;
                }

                const servicePromises = data.data.map(service => {
                    return checkServiceHasValidTimeSlotsSpecialist(specialistId, service.id, startDate, endDate);
                });

                Promise.all(servicePromises)
                    .then(results => {
                        const hasValidSlots = results.some(hasSlots => hasSlots === true);
                        resolve(hasValidSlots);
                    })
                    .catch(() => resolve(false));
            })
            .catch(() => resolve(false));
    });
}

function checkServiceHasValidTimeSlotsSpecialist(specialistId, serviceId, startDate, endDate) {
    return new Promise((resolve) => {
        fetch(`/api/specialist/${specialistId}/service/${serviceId}/available-dates?start=${startDate}&end=${endDate}`)
            .then(response => {
                if (!response.ok) {
                    resolve(false);
                    return;
                }
                return response.json();
            })
            .then(data => {
                if (!data.availableDates || data.availableDates.length === 0) {
                    resolve(false);
                    return;
                }

                const datePromises = data.availableDates.map(date => {
                    return checkDateHasValidTimeSlotsSpecialist(specialistId, serviceId, date);
                });

                Promise.all(datePromises)
                    .then(results => {
                        const hasValidSlots = results.some(hasSlots => hasSlots === true);
                        resolve(hasValidSlots);
                    })
                    .catch(() => resolve(false));
            })
            .catch(() => resolve(false));
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
                startSpecialistsAutoRefresh();
            } else {
                console.log('Specialists section is disabled, hiding section...');
                hideSpecialistsSection();
                if (specialistsRefreshInterval) {
                    clearInterval(specialistsRefreshInterval);
                }
            }
        } else {
            console.error('Failed to fetch settings');
            fetchSpecialistsWithAvailability();
            startSpecialistsAutoRefresh();
        }
    } catch (error) {
        console.error('Error checking specialists visibility:', error);
        fetchSpecialistsWithAvailability();
        startSpecialistsAutoRefresh();
    }
}

function checkNextMonthAvailabilitySpecialist() {
    const nextMonth = window.specialistCurrentMonth + 1;
    const nextYear = window.specialistCurrentYear;
    
    if (nextMonth > 11) {
        nextMonth = 0;
        nextYear++;
    }
    
    const monthKey = `${window.specialistCurrentSpecialistId}-${window.specialistCurrentServiceId}-${nextYear}-${nextMonth + 1}`;
    
    // Если данные уже загружены
    if (window.specialistAvailableDates[monthKey] && window.specialistAvailableDates[monthKey].length > 0) {
        markNextMonthButtonAvailableSpecialist(true);
        return;
    }
    
    // Загружаем данные для следующего месяца
    const firstDay = new Date(nextYear, nextMonth, 1);
    const lastDay = new Date(nextYear, nextMonth + 1, 0);
    
    const startDate = `${nextYear}-${(nextMonth + 1).toString().padStart(2, '0')}-01`;
    const endDate = `${nextYear}-${(nextMonth + 1).toString().padStart(2, '0')}-${lastDay.getDate().toString().padStart(2, '0')}`;
    
    fetch(`/api/specialist/${window.specialistCurrentSpecialistId}/service/${window.specialistCurrentServiceId}/available-dates?start=${startDate}&end=${endDate}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const hasAvailability = data.availableDates && data.availableDates.length > 0;
            markNextMonthButtonAvailableSpecialist(hasAvailability);
            
            // Сохраняем данные для будущего использования
            if (!window.specialistAvailableDates[monthKey]) {
                window.specialistAvailableDates[monthKey] = data.availableDates || [];
            }
        })
        .catch(error => {
            console.error('Error checking next month availability:', error);
            markNextMonthButtonAvailableSpecialist(false);
        });
}

function markNextMonthButtonAvailableSpecialist(hasAvailability) {
    const nextMonthBtn = document.querySelector('#specialist-modal .month-nav-btn:last-child');
    if (nextMonthBtn) {
        if (hasAvailability) {
            nextMonthBtn.classList.add('has-availability');
        } else {
            nextMonthBtn.classList.remove('has-availability');
        }
    }
}

function hideSpecialistsSection() {
    const specialistsSection = document.getElementById('specialists-section');
    if (specialistsSection) {
        specialistsSection.style.display = 'none';
    }
}

// Обработчики для модального окна
window.onclick = function(event) {
    const specialistModal = document.getElementById('specialist-modal');
    if (event.target === specialistModal) {
        closeSpecialistModal();
    }
}

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeSpecialistModal();
    }
});