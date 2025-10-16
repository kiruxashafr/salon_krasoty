document.addEventListener('DOMContentLoaded', function() {
    checkServicesVisibility();
});

let servicesRefreshInterval;

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

function startServicesAutoRefresh() {
    if (servicesRefreshInterval) {
        clearInterval(servicesRefreshInterval);
    }
    
    servicesRefreshInterval = setInterval(() => {
        console.log('Auto-refreshing services data...');
        fetchServicesWithAvailability();
    }, 30000);
}

function fetchServicesWithAvailability() {
    console.log('Fetching all services first...');
    
    fetch('/api/services')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.message === 'success') {
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
            
            const servicesWithValidSpecialistsPromises = availableServices.map(service => {
                return checkServiceHasValidSpecialists(service.id, startDate, endDate)
                    .then(hasValidSpecialists => ({ service, hasValidSpecialists }));
            });

            return Promise.all(servicesWithValidSpecialistsPromises);
        })
        .then(servicesWithValidSpecialists => {
            const validServices = servicesWithValidSpecialists
                .filter(result => result.hasValidSpecialists)
                .map(result => result.service);

            console.log('Services with valid specialists:', validServices);
            displayServices(validServices);
        })
        .catch(error => {
            console.error('Error filtering services:', error);
            displayServices([]);
        });
}

function checkServiceHasValidSpecialists(serviceId, startDate, endDate) {
    return new Promise((resolve) => {
        fetch(`/api/service/${serviceId}/specialists`)
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

                const specialistPromises = data.data.map(specialist => {
                    return checkSpecialistHasValidTimeSlotsService(serviceId, specialist.id, startDate, endDate);
                });

                Promise.all(specialistPromises)
                    .then(results => {
                        const hasValidSpecialists = results.some(hasSlots => hasSlots === true);
                        resolve(hasValidSpecialists);
                    })
                    .catch(() => resolve(false));
            })
            .catch(() => resolve(false));
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

function displayServices(services) {
    const servicesContainer = document.getElementById('services-container');
    
    if (!services || services.length === 0) {
        servicesContainer.innerHTML = '<p class="no-services" style="color: white; text-align: center; font-family: forum;">Нет доступных услуг на данный момент</p>';
        return;
    }
    
    servicesContainer.innerHTML = '';
    
    const servicesByCategory = services.reduce((acc, service) => {
        (acc[service.категория] = acc[service.категория] || []).push(service);
        return acc;
    }, {});
    
    Object.keys(servicesByCategory).forEach(category => {
        const categoryHeader = document.createElement('h2');
        categoryHeader.className = 'category-title';
        categoryHeader.textContent = category;
        servicesContainer.appendChild(categoryHeader);
        
        const categoryContainer = document.createElement('div');
        categoryContainer.className = 'category-services';
        
        servicesByCategory[category].forEach(service => {
            const serviceCard = document.createElement('div');
            serviceCard.className = 'service-card';
            serviceCard.style.backgroundImage = `url(${service.фото || 'photo/услуги/default.jpg'})`;            
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
    
    // Сброс переменных для сервисного модального окна
    window.serviceCurrentMonth = new Date().getMonth();
    window.serviceCurrentYear = new Date().getFullYear();
    window.serviceAvailableDates = {};
    window.serviceCurrentSpecialistId = null;
    window.serviceCurrentServiceId = serviceId;
    window.serviceSelectedDate = null;
    window.serviceCurrentStep = 'specialists';
    
    fetch(`/api/service/${serviceId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(serviceData => {
            if (serviceData.message === 'success') {
                fetch(`/api/service/${serviceId}/specialists`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`HTTP error! Status: ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(specialistsData => {
                        if (specialistsData.message === 'success') {
                            filterSpecialistsWithAvailableTimeService(serviceId, serviceData.data, specialistsData.data);
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

function filterSpecialistsWithAvailableTimeService(serviceId, service, specialists) {
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
                return;
            }

            const specialistsWithValidTimePromises = availableSpecialists.map(specialist => {
                return checkSpecialistHasValidTimeSlotsService(serviceId, specialist.id, startDate, endDate)
                    .then(hasValidSlots => ({ specialist, hasValidSlots }));
            });

            return Promise.all(specialistsWithValidTimePromises);
        })
        .then(specialistsWithValidSlots => {
            if (!specialistsWithValidSlots) return;
            
            const validSpecialists = specialistsWithValidSlots
                .filter(result => result.hasValidSlots)
                .map(result => result.specialist);

            console.log(`Specialists with valid time slots for service ${serviceId}:`, validSpecialists);
            
            if (validSpecialists.length === 0) {
                showNoSpecialistsMessage(service);
            } else {
                showServiceModal(serviceId, service, validSpecialists);
            }
        })
        .catch(error => {
            console.error('Error filtering specialists:', error);
            showNoSpecialistsMessage(service);
        });
}

function checkSpecialistHasValidTimeSlotsService(serviceId, specialistId, startDate, endDate) {
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
                    return checkDateHasValidTimeSlotsService(specialistId, serviceId, date);
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

function checkDateHasValidTimeSlotsService(specialistId, serviceId, date) {
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

function showServiceModal(serviceId, service, specialists) {
    const modal = document.getElementById('service-modal');
    const modalContent = modal.querySelector('.service-modal-content');
    
    window.serviceCurrentServiceId = serviceId;
    window.serviceCurrentStep = 'specialists';
    
    let specialistsHTML = '';
    if (specialists && specialists.length > 0) {
        specialists.forEach(specialist => {
            specialistsHTML += `
                <div class="modal-specialist-item" data-specialist-id="${specialist.id}" onclick="selectSpecialistService(${specialist.id}, this)">
                    <div class="specialist-image" style="background-image: url('${specialist.фото || 'photo/работники/default.jpg'}')"></div>
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
        <div class="modal-step" id="service-step-specialists">
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
        
        <div class="modal-step" id="service-step-dates" style="display: none;">
            <div class="step-header">
                <button class="back-btn" onclick="backToSpecialistsService()">← Назад</button>
                <h2>Выберите дату</h2>
            </div>
            <div class="month-navigation">
                <button class="month-nav-btn" onclick="changeMonthService(-1)">←</button>
                <span class="current-month" id="service-current-month"></span>
                <button class="month-nav-btn" onclick="changeMonthService(1)">→</button>
            </div>
            <div class="date-grid" id="service-date-grid"></div>
            <div class="loading-dates" id="service-loading-dates" style="display: none; text-align: center; padding: 1rem;">
                Загрузка доступных дат...
            </div>
        </div>
        
        <div class="modal-step" id="service-step-times" style="display: none;">
            <div class="step-header">
                <button class="back-btn" onclick="backToDatesService()">← Назад</button>
                <h2>Выберите время</h2>
            </div>
            <div class="time-slots" id="service-time-slots"></div>
        </div>
    `;
    
    console.log('Showing service modal');
    modal.style.display = 'block';
}

function selectSpecialistService(specialistId, element) {
    console.log(`Selected specialist ID: ${specialistId}`);
    const allItems = document.querySelectorAll('.modal-specialist-item');
    allItems.forEach(item => item.classList.remove('selected-specialist'));
    
    element.classList.add('selected-specialist');
    
    window.serviceCurrentSpecialistId = specialistId;
    window.serviceCurrentMonth = new Date().getMonth();
    window.serviceCurrentYear = new Date().getFullYear();
    window.serviceAvailableDates = {};
    
    showStepService('dates');
    loadAvailableDatesService();
}

function showStepService(step) {
    document.querySelectorAll('#service-modal .modal-step').forEach(stepEl => {
        stepEl.style.display = 'none';
    });
    
    document.getElementById(`service-step-${step}`).style.display = 'block';
    window.serviceCurrentStep = step;
}

function backToSpecialistsService() {
    showStepService('specialists');
}

function backToDatesService() {
    showStepService('dates');
}

function changeMonthService(direction) {
    window.serviceCurrentMonth += direction;
    
    if (window.serviceCurrentMonth < 0) {
        window.serviceCurrentMonth = 11;
        window.serviceCurrentYear--;
    } else if (window.serviceCurrentMonth > 11) {
        window.serviceCurrentMonth = 0;
        window.serviceCurrentYear++;
    }
    
    loadAvailableDatesService();
    

}

function loadAvailableDatesService() {
    const monthKey = `${window.serviceCurrentYear}-${window.serviceCurrentMonth + 1}`;
    
    const loadingElement = document.getElementById('service-loading-dates');
    const dateGridElement = document.getElementById('service-date-grid');
    
    loadingElement.style.display = 'block';
    dateGridElement.innerHTML = '';
    
    if (window.serviceAvailableDates[monthKey]) {
        generateDateGridService(window.serviceAvailableDates[monthKey]);
        loadingElement.style.display = 'none';
        
        // Проверяем доступность следующего месяца
        checkNextMonthAvailabilityService();
        return;
    }
    
    const firstDay = new Date(window.serviceCurrentYear, window.serviceCurrentMonth, 1);
    const lastDay = new Date(window.serviceCurrentYear, window.serviceCurrentMonth + 1, 0);
    
    const startDate = `${window.serviceCurrentYear}-${(window.serviceCurrentMonth + 1).toString().padStart(2, '0')}-01`;
    const endDate = `${window.serviceCurrentYear}-${(window.serviceCurrentMonth + 1).toString().padStart(2, '0')}-${lastDay.getDate().toString().padStart(2, '0')}`;
    
    console.log(`Fetching available dates for specialist ${window.serviceCurrentSpecialistId}, service ${window.serviceCurrentServiceId} from ${startDate} to ${endDate}`);
    
    fetch(`/api/specialist/${window.serviceCurrentSpecialistId}/service/${window.serviceCurrentServiceId}/available-dates?start=${startDate}&end=${endDate}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`Available dates for month ${monthKey}:`, data);
            
            window.serviceAvailableDates[monthKey] = data.availableDates || [];
            generateDateGridService(window.serviceAvailableDates[monthKey]);
        })
        .catch(error => {
            console.error('Error fetching available dates:', error);
            generateDateGridService([]);
        })
    .finally(() => {
        loadingElement.style.display = 'none';
        // Проверяем доступность следующего месяца
        checkNextMonthAvailabilityService();
    });
}

function generateDateGridService(availableDates) {
    const dateGrid = document.getElementById('service-date-grid');
    const currentMonthElement = document.getElementById('service-current-month');
    const loadingElement = document.getElementById('service-loading-dates');
    
    loadingElement.style.display = 'none';
    
    const monthNames = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    
    currentMonthElement.textContent = `${monthNames[window.serviceCurrentMonth]} ${window.serviceCurrentYear}`;
    dateGrid.innerHTML = '';
    
    const firstDay = new Date(window.serviceCurrentYear, window.serviceCurrentMonth, 1);
    const lastDay = new Date(window.serviceCurrentYear, window.serviceCurrentMonth + 1, 0);
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
        
        const currentDate = new Date(window.serviceCurrentYear, window.serviceCurrentMonth, day);
        const formattedDate = `${window.serviceCurrentYear}-${(window.serviceCurrentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        
        const isToday = currentDate.toDateString() === today.toDateString();
        
        if (currentDate < today) {
            dateCell.classList.add('past-date');
            dateCell.textContent = day;
        } else if (availableDates.includes(formattedDate)) {
            if (isToday) {
                dateCell.classList.add('available-date');
                dateCell.textContent = day;
                dateCell.onclick = () => selectDateService(day);
                dateCell.title = 'Есть доступное время';
            } else {
                dateCell.classList.add('available-date');
                dateCell.textContent = day;
                dateCell.onclick = () => selectDateService(day);
                dateCell.title = 'Есть доступное время';
            }
        } else {
            dateCell.classList.add('no-availability');
            dateCell.textContent = day;
            dateCell.title = 'Нет доступного времени';
        }
        
        dateGrid.appendChild(dateCell);
    }
}

function selectDateService(day) {
    console.log(`Selected date: ${day}.${window.serviceCurrentMonth + 1}.${window.serviceCurrentYear}`);
    
    const formattedDate = `${window.serviceCurrentYear}-${(window.serviceCurrentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    window.serviceSelectedDate = formattedDate;
    
    showStepService('times');
    loadAvailableTimeService(formattedDate);
}

function loadAvailableTimeService(date) {
    if (!window.serviceCurrentSpecialistId || !window.serviceCurrentServiceId) {
        console.error('Specialist ID or Service ID not found');
        return;
    }
    
    console.log(`Fetching schedule for specialist ${window.serviceCurrentSpecialistId}, service ${window.serviceCurrentServiceId} on date ${date}`);
    fetch(`/api/specialist/${window.serviceCurrentSpecialistId}/service/${window.serviceCurrentServiceId}/schedule/${date}`)
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
                document.getElementById('service-time-slots').innerHTML = '<p>Нет доступного времени на выбранную дату</p>';
            }
        })
        .catch(error => {
            console.error('Error fetching schedule:', error);
            document.getElementById('service-time-slots').innerHTML = '<p>Ошибка загрузки расписания</p>';
        });
}

function displayTimeSlotsService(timeSlots) {
    const timeSlotsContainer = document.getElementById('service-time-slots');
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
    const isToday = window.serviceSelectedDate === today.toISOString().split('T')[0];
    
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
        timeBtn.onclick = () => bookAppointmentService(slot.id, slot.время);
        timeSlotsContainer.appendChild(timeBtn);
    });
    
    if (timeSlotsContainer.children.length === 0) {
        timeSlotsContainer.innerHTML = '<p>Нет доступного времени на выбранную дату</p>';
    }
}

function bookAppointmentService(scheduleId, time) {
    console.log(`Booking appointment: Service ID ${window.serviceCurrentServiceId}, Specialist ID ${window.serviceCurrentSpecialistId}, Schedule ID ${scheduleId}, Date ${window.serviceSelectedDate}, Time ${time}`);
    showConfirmationStepService(time, scheduleId);
}

function closeServiceModal() {
    console.log('Closing service modal');
    document.getElementById('service-modal').style.display = 'none';
    
    const isOnSuccessStep = window.serviceCurrentStep === 'success-service';
    
    // Сброс только сервисных переменных
    window.serviceCurrentServiceId = null;
    window.serviceCurrentService = null;
    window.serviceCurrentSpecialistId = null;
    window.serviceSelectedDate = null;
    window.serviceAvailableDates = {};
    window.serviceCurrentStep = null;
    
    if (isOnSuccessStep) {
        console.log('Closing after successful booking - refreshing page');
        location.reload();
    }
}

function fetchSpecialistInfoService(specialistId) {
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

function showConfirmationStepService(time, scheduleId) {
    window.serviceSelectedTime = time;
    window.serviceScheduleId = scheduleId;
    
    Promise.all([
        fetchSpecialistInfoService(window.serviceCurrentSpecialistId)
    ])
    .then(([specialistData]) => {
        window.serviceCurrentSpecialist = specialistData;
        showConfirmationStepContentService();
    })
    .catch(error => {
        console.error('Error fetching info:', error);
        showConfirmationStepContentService();
    });
}

function showConfirmationStepContentService() {
    const stepContent = document.createElement('div');
    stepContent.className = 'modal-step';
    stepContent.id = 'service-step-confirmation';
    
    const masterPhoto = window.serviceCurrentSpecialist?.фото || 'photo/работники/default.jpg';
    const formattedDate = formatDateService(window.serviceSelectedDate);
    
    stepContent.innerHTML = `
        <div class="step-header">
            <button class="back-btn" onclick="backToTimesService()">← Назад</button>
            <h2>Подтверждение записи</h2>
        </div>
        
        <div class="booking-confirmation">
            <div class="booking-summary">
                <div class="booking-summary-header">
                    <img src="${masterPhoto}" alt="${window.serviceCurrentSpecialist?.имя || 'Мастер'}" class="booking-summary-avatar" onerror="this.src='photo/работники/default.jpg'">
                    <div class="booking-summary-title">
                        <h3>${window.serviceCurrentService.название}</h3>
                        <p>${window.serviceCurrentSpecialist ? window.serviceCurrentSpecialist.имя : 'Неизвестно'}</p>
                    </div>
                </div>
                
                <div class="booking-summary-content">
                    <span class="booking-summary-datetime">${formattedDate} в ${window.serviceSelectedTime}</span>
                    <span class="booking-summary-price">${window.serviceCurrentService.цена} ₽</span>
                </div>
            </div>
            
            <div class="client-form">
                <div class="form-group">
                    <input type="text" id="service-client-name" placeholder="Введите ваше имя" required>
                    <div class="error-message" id="service-name-error">Пожалуйста, введите ваше имя</div>
                </div>
                
                <div class="form-group">
                    <div class="phone-input-container">
                        <span class="phone-prefix">+7</span>
                        <input type="tel" id="service-client-phone" class="phone-input" 
                               placeholder="9001234567" pattern="[0-9]{10}" 
                               maxlength="10" required>
                    </div>
                    <div class="error-message" id="service-phone-error">Введите 10 цифр номера телефона</div>
                </div>
                
                <button class="submit-btn" onclick="submitBookingService()">ПОДТВЕРДИТЬ ЗАПИСЬ</button>
            </div>
        </div>
    `;
    
    document.querySelector('.service-modal-content').appendChild(stepContent);
    showStepService('confirmation');
}

function backToTimesService() {
    showStepService('times');
    const confirmationStep = document.getElementById('service-step-confirmation');
    if (confirmationStep) {
        confirmationStep.remove();
    }
}

function validatePhoneService() {
    const phoneInput = document.getElementById('service-client-phone');
    const errorElement = document.getElementById('service-phone-error');
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

function validateNameService() {
    const nameInput = document.getElementById('service-client-name');
    const errorElement = document.getElementById('service-name-error');
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
    const nameValid = validateNameService();
    const phoneValid = validatePhoneService();
    
    if (!nameValid || !phoneValid) {
        return;
    }
    
    const clientName = document.getElementById('service-client-name').value.trim();
    const clientPhone = '+7' + document.getElementById('service-client-phone').value;
    
    const submitBtn = document.querySelector('.service-modal-content .submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'ОБРАБОТКА...';
    
    fetch('/api/appointment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            specialistId: window.serviceCurrentSpecialistId,
            serviceId: window.serviceCurrentServiceId,
            date: window.serviceSelectedDate,
            time: window.serviceSelectedTime,
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
    stepContent.id = 'service-step-success';
    
    const masterPhoto = window.serviceCurrentSpecialist?.фото || 'photo/работники/default.jpg';
    const formattedDate = formatDateService(window.serviceSelectedDate);
    
    stepContent.innerHTML = `
        <div class="booking-success">
            <div class="success-header">
                <div class="success-icon">✓</div>
                <h3>Запись подтверждена!</h3>
            </div>
            
            <div class="booking-summary" style="margin: 1.5rem 0;">
                <div class="booking-summary-header">
                    <img src="${masterPhoto}" alt="${window.serviceCurrentSpecialist?.имя || 'Мастер'}" class="booking-summary-avatar" onerror="this.src='photo/работники/default.jpg'">
                    <div class="booking-summary-title">
                        <h3>${window.serviceCurrentService.название}</h3>
                        <p>${window.serviceCurrentSpecialist ? window.serviceCurrentSpecialist.имя : 'Неизвестно'}</p>
                    </div>
                </div>
                
                <div class="booking-summary-content">
                    <span class="booking-summary-datetime">${formattedDate} в ${window.serviceSelectedTime}</span>
                    <span class="booking-summary-price">${window.serviceCurrentService.цена} ₽</span>
                </div>
            </div>
            
            <div class="success-buttons">
                <a href="https://t.me/shafrbeautybot" target="_blank" class="telegram-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.287 5.906c-.778.324-2.334.994-4.666 2.01-.378.15-.577.298-.595.442-.03.243.275.339.69.47l.175.055c.408.133.958.288 1.243.294.26.006.549-.1.868-.32 2.179-1.471 3.304-2.214 3.374-2.23.05-.012.12-.026.166.016.047.041.042.12.037.141-.03.129-1.227 1.241-1.846 1.817-.193.18-.33.307-.358.336a8.154 8.154 0 0 1-.188.186c-.38.366-.664.64.015 1.088.327.216.589.393.85.571.284.194.568.387.936.629.093.06.183.125.27.187.331.236.63.448.997.414.214-.02.435-.22.547-.82.265-1.417.786-4.486.906-5.751a1.426 1.426 0 0 0-.013-.315.337.337 0 0 0-.114-.217.526.526 0 0 0-.31-.093c-.3.005-.763.166-2.984 1.09z"/>
                    </svg>
                    Управляйте записями<br>Получайте уведомления
                </a>
                <button class="close-success-btn" onclick="closeServiceModal()">Закрыть</button>
            </div>
        </div>
    `;
    
    document.querySelector('.service-modal-content').innerHTML = '';
    document.querySelector('.service-modal-content').appendChild(stepContent);
    
    window.serviceCurrentStep = 'success';
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

function formatDateService(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}



async function checkServicesVisibility() {
    try {
        const response = await fetch('/api/settings');
        if (response.ok) {
            const data = await response.json();
            if (data.message === 'success' && data.data.show_services === '1') {
                console.log('Services section is enabled, fetching services with availability...');
                fetchServicesWithAvailability();
                startServicesAutoRefresh();
            } else {
                console.log('Services section is disabled, hiding section...');
                hideServicesSection();
                if (servicesRefreshInterval) {
                    clearInterval(servicesRefreshInterval);
                }
            }
        } else {
            console.error('Failed to fetch settings');
            fetchServicesWithAvailability();
            startServicesAutoRefresh();
        }
    } catch (error) {
        console.error('Error checking services visibility:', error);
        fetchServicesWithAvailability();
        startServicesAutoRefresh();
    }
}


function checkNextMonthAvailabilityService() {
    const nextMonth = window.serviceCurrentMonth + 1;
    const nextYear = window.serviceCurrentYear;
    
    if (nextMonth > 11) {
        nextMonth = 0;
        nextYear++;
    }
    
    const monthKey = `${nextYear}-${nextMonth + 1}`;
    
    // Если данные уже загружены
    if (window.serviceAvailableDates[monthKey] && window.serviceAvailableDates[monthKey].length > 0) {
        markNextMonthButtonAvailableService(true);
        return;
    }
    
    // Загружаем данные для следующего месяца
    const firstDay = new Date(nextYear, nextMonth, 1);
    const lastDay = new Date(nextYear, nextMonth + 1, 0);
    
    const startDate = `${nextYear}-${(nextMonth + 1).toString().padStart(2, '0')}-01`;
    const endDate = `${nextYear}-${(nextMonth + 1).toString().padStart(2, '0')}-${lastDay.getDate().toString().padStart(2, '0')}`;
    
    fetch(`/api/specialist/${window.serviceCurrentSpecialistId}/service/${window.serviceCurrentServiceId}/available-dates?start=${startDate}&end=${endDate}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const hasAvailability = data.availableDates && data.availableDates.length > 0;
            markNextMonthButtonAvailableService(hasAvailability);
            
            // Сохраняем данные для будущего использования
            if (!window.serviceAvailableDates[monthKey]) {
                window.serviceAvailableDates[monthKey] = data.availableDates || [];
            }
        })
        .catch(error => {
            console.error('Error checking next month availability:', error);
            markNextMonthButtonAvailableService(false);
        });
}

function markNextMonthButtonAvailableService(hasAvailability) {
    const nextMonthBtn = document.querySelector('#service-modal .month-nav-btn:last-child');
    if (nextMonthBtn) {
        if (hasAvailability) {
            nextMonthBtn.classList.add('has-availability');
        } else {
            nextMonthBtn.classList.remove('has-availability');
        }
    }
}

function hideServicesSection() {
    const servicesSection = document.getElementById('services-section');
    if (servicesSection) {
        servicesSection.style.display = 'none';
    }
}

// Обработчики для модального окна
window.onclick = function(event) {
    const modal = document.getElementById('service-modal');
    if (event.target === modal) {
        closeServiceModal();
    }
}

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeServiceModal();
    }
});