let currentActiveSection = 'journal'; // По умолчанию активен журнал
let currentView = 'journal'; // 'journal' или 'history'
let lastViewedTimestamp = Date.now();


document.addEventListener('DOMContentLoaded', function() {
    // Элементы DOM
    const menuToggle = document.getElementById('menuToggle');
    const mainMenu = document.getElementById('mainMenu');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const menuLinks = document.querySelectorAll('.main-menu a');
    const contentContainer = document.getElementById('contentContainer');
    const currentSection = document.getElementById('currentSection');
    const closeMenuBtn = document.getElementById('closeMenu');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    // Переменные состояния
    let isMenuOpen = false;
    

    // Функция переключения меню
    function toggleMenu() {
        isMenuOpen = !isMenuOpen;
        sidebar.classList.toggle('open', isMenuOpen);
        menuToggle.classList.toggle('active', isMenuOpen);
        
        // Блокировка прокрутки тела при открытом меню на мобильных
        if (window.innerWidth < 1024) {
            document.body.classList.toggle('menu-open', isMenuOpen);
            sidebarOverlay.style.display = isMenuOpen ? 'block' : 'none';
        }
    }

    // Добавляем обработчики для закрытия меню
    closeMenuBtn.addEventListener('click', function() {
        if (isMenuOpen) {
            toggleMenu();
        }
    });

    sidebarOverlay.addEventListener('click', function() {
        if (isMenuOpen) {
            toggleMenu();
        }
    });

    // Инициализация меню при загрузке
    if (window.innerWidth >= 1024) {
        sidebar.classList.add('open');
        isMenuOpen = true;
    } else {
        sidebar.classList.remove('open');
        isMenuOpen = false;
        sidebarOverlay.style.display = 'none';
    }

    // Функция обновления активного пункта меню
    function updateActiveMenu(sectionName) {
        menuLinks.forEach(link => {
            link.classList.remove('active');
            if (link.dataset.section === sectionName) {
                link.classList.add('active');
            }
        });
    }

// Функция загрузки контента раздела
// Обновим функцию loadSection в admin.js
function loadSection(sectionName) {
    if (window.innerWidth < 768) {
        showLoading();
    }
    
    // Останавливаем все автообновления при смене раздела
    if (autoUpdateInterval) {
        clearInterval(autoUpdateInterval);
        autoUpdateInterval = null;
    }
    
    if (historyUpdateInterval) {
        stopHistoryAutoUpdate();
    }
    
    // Обновляем активный пункт меню
    updateActiveMenu(sectionName);
    currentActiveSection = sectionName;

    // Закрываем меню на мобильных устройствах
    if (window.innerWidth < 1024 && isMenuOpen) {
        toggleMenu();
    }
    
    // Обновляем заголовок
    const sectionTitle = Array.from(menuLinks).find(link => 
        link.dataset.section === sectionName
    ).textContent;
    currentSection.textContent = sectionTitle;

    // Загружаем контент в зависимости от раздела
    switch(sectionName) {
        case 'journal':
            loadJournalContent();
            setTimeout(() => startAutoUpdate(), 1000);
            break;
        case 'history':
            loadAppointmentsHistory();
            break;
        case 'schedule':
            loadScheduleSection();
            setTimeout(() => startAutoUpdate(), 1000);
            break;
        case 'freetime':
            loadFreeTimeSection();
            setTimeout(() => startAutoUpdate(), 1000);
            break;
        case 'specialists':
            loadMastersSection();
            break;
        case 'services':
            loadServicesSection();
            break;
        case 'clients':
            loadClientsSection();
            break;
        case 'settings':
            loadSettingsSection();
            break;
        case 'statistics':
            loadStatisticsSection();
            break;
        default:
            contentContainer.innerHTML = '<p>Раздел не найден</p>';
    }
}

// В обработчиках кликов по меню добавим закрытие - ОБНОВЛЕННЫЙ КОД
menuLinks.forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const section = this.dataset.section;
        if (section) {
            loadSection(section);
            // Всегда закрываем меню после выбора раздела на мобильных
            if (window.innerWidth < 1024 && isMenuOpen) {
                toggleMenu();
            }
        }
    });
});

  let resizeTimeout;
let lastWindowWidth = window.innerWidth;

window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function() {
        const currentWidth = window.innerWidth;
        const wasMobile = lastWindowWidth < 1024;
        const isMobile = currentWidth < 1024;
        
        // Обновляем меню только при переходе между мобильным и десктопным режимом
        if ((wasMobile && !isMobile) || (!wasMobile && isMobile)) {
            if (isMobile) {
                // Переход в мобильный режим
                sidebar.classList.remove('open');
                menuToggle.classList.remove('active');
                isMenuOpen = false;
                sidebarOverlay.style.display = 'none';
                document.body.classList.remove('menu-open');
            } else {
                // Переход в десктопный режим
                sidebar.classList.add('open');
                menuToggle.classList.remove('active');
                isMenuOpen = true;
                sidebarOverlay.style.display = 'none';
                document.body.classList.remove('menu-open');
            }
            
            // Перерисовываем только если это необходимо (активен журнал)
            if (currentActiveSection === 'journal' && window.selectedDate) {
                loadAppointmentsForDate(window.selectedDate);
            }
        }
        
        lastWindowWidth = currentWidth;
        
    }, 250); // Задержка 250ms для предотвращения частых перерисовок
});

    // Обработчик кнопки меню
    menuToggle.addEventListener('click', toggleMenu);


// Остальной код (функции для календаря, загрузки данных и т.д.) остается без изменений
// [Здесь должен быть весь остальной код из вашего файла admin.js]

    // Функция загрузки контента журнала
function loadJournalContent() {
    contentContainer.innerHTML = `
        <div class="journal-content">
            <div class="view-toggle-container">
                <button class="view-toggle-btn active" data-view="journal">
                    📅 Текущие записи
                </button>
                <button class="view-toggle-btn" data-view="history">
                    📋 История записей
                </button>
            </div>
            
            <div id="journalView" class="view-content">
                <div class="specialists-selection">
                    <h2>Выберите мастера</h2>

                    <div class="specialists-list" id="specialistsList">
                        <!-- Мастера будут загружены динамически -->
                        
                    </div>
                                        <div class="specialists-actions">
                        <button class="all-masters-btn" id="allMastersBtn">
                             Все мастера
                        </button>
                    </div>
                </div>
                
                <div class="calendar-section" id="calendarSection" style="display: none;">
                    <div class="month-navigation">
                        <button class="month-nav-btn" onclick="changeMonth(-1)">←</button>
                        <span class="current-month" id="currentMonth"></span>
                        <button class="month-nav-btn" onclick="changeMonth(1)">→</button>
                    </div>
                    <div class="date-grid" id="dateGrid"></div>
                </div>
                
                <div class="appointments-list" id="appointmentsList" style="display: none;">
                    <h3>Записи на выбранную дату</h3>
                    <div id="appointmentsContainer">
                        <!-- Записи будут загружены динамически -->
                    </div>
                </div>
            </div>
            
            <div id="historyView" class="view-content" style="display: none;">
                <!-- Контент истории будет загружен здесь -->
            </div>
        </div>
    `;

    // Добавляем обработчики для кнопок переключения
    setupViewToggleButtons();
    
    // Загружаем список мастеров
    loadSpecialistsForJournal();
    
    // Добавляем обработчик для кнопки "Все мастера"
    document.getElementById('allMastersBtn').addEventListener('click', selectAllMasters);
    
    // Показываем журнал по умолчанию
    showJournalView();
}


// Функция выбора всех мастеров
function selectAllMasters() {
    window.currentSpecialistId = null; // null означает "все мастера"
    window.currentSpecialistName = 'Все мастера';
    
    // Показываем активное состояние кнопки
    document.getElementById('allMastersBtn').classList.add('active');
    
    // Снимаем выделение с отдельных мастеров
    document.querySelectorAll('.specialist-card-admin').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Показываем календарь
    const calendarSection = document.getElementById('calendarSection');
    calendarSection.style.display = 'block';
    
    // Инициализируем календарь
    initCalendar();
    
    // Прокручиваем к календарю после небольшой задержки
    setTimeout(() => {
        calendarSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }, 100);
}

    // Функция загрузки мастеров для журнала
    function loadSpecialistsForJournal() {
        fetch('/api/specialists')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Ошибка загрузки мастеров');
                }
                return response.json();
            })
            .then(data => {
                if (data.message === 'success') {
                    displaySpecialistsForSelection(data.data);
                }
            })
            .catch(error => {
                console.error('Ошибка:', error);
                showError('Не удалось загрузить список мастеров');
            });
    }

    // Функция отображения мастеров для выбора
    function displaySpecialistsForSelection(specialists) {
        const specialistsList = document.getElementById('specialistsList');
        
        if (!specialists || specialists.length === 0) {
            specialistsList.innerHTML = '<p>Нет доступных мастеров</p>';
            return;
        }

        specialistsList.innerHTML = '';
        
        specialists.forEach(specialist => {
            const specialistCard = document.createElement('div');
            specialistCard.className = 'specialist-card-admin';
            specialistCard.dataset.specialistId = specialist.id;
            
            // Используем фото из базы данных или дефолтное
            const imageUrl = specialist.фото || 'photo/работники/default.jpg';
            
            specialistCard.innerHTML = `
                <div class="specialist-image" style="background-image: url('${imageUrl}')"></div>
                <div class="specialist-info">
                    <h4>${specialist.имя}</h4>
                    <p>${specialist.описание || 'Профессиональный мастер'}</p>
                </div>
            `;
            
            specialistCard.addEventListener('click', () => {
                selectSpecialistForJournal(specialist.id, specialist.имя);
            });
            
            specialistsList.appendChild(specialistCard);
        });
    }

// Функция выбора мастера
function selectSpecialistForJournal(specialistId, specialistName) {
    window.currentSpecialistId = specialistId;
    window.currentSpecialistName = specialistName;
    
    // Снимаем выделение с кнопки "Все мастера"
    document.getElementById('allMastersBtn').classList.remove('active');
    
    // Показываем выбранного мастера
    document.querySelectorAll('.specialist-card-admin').forEach(card => {
        card.classList.remove('selected');
    });
    document.querySelector(`[data-specialist-id="${specialistId}"]`).classList.add('selected');
    
    // Показываем календарь
    const calendarSection = document.getElementById('calendarSection');
    calendarSection.style.display = 'block';
    
    // Инициализируем календарь
    initCalendar();
    
    // Прокручиваем к календарю после небольшой задержки
    setTimeout(() => {
        calendarSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }, 100);
}



    // Загружаем начальный раздел
    loadSection('journal');
});

// Глобальные функции для календаря
function initCalendar() {
    window.currentMonth = new Date().getMonth();
    window.currentYear = new Date().getFullYear();
    generateCalendar();
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
    
    generateCalendar();
}
let appointmentsByDate = {};
// Функция для загрузки дней с записями
// Функция для загрузки дней с записями
async function loadAppointmentDays(year, month) {
    // Если выбран "Все мастера", не фильтруем по specialistId
    const specialistFilter = window.currentSpecialistId ? 
        `&specialistId=${window.currentSpecialistId}` : '';
    
    const startDate = `${year}-${(month + 1).toString().padStart(2, '0')}-01`;
    const endDate = `${year}-${(month + 1).toString().padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`;
    
    try {
        const response = await fetch(`/api/appointments?startDate=${startDate}&endDate=${endDate}${specialistFilter}`);
        if (!response.ok) throw new Error('Ошибка загрузки дней с записями');
        
        const data = await response.json();
        if (data.message === 'success') {
            return data.data.reduce((acc, appointment) => {
                const date = appointment.дата;
                if (!acc[date]) acc[date] = 0;
                acc[date]++;
                return acc;
            }, {});
        }
        return {};
    } catch (error) {
        console.error('Ошибка:', error);
        return {};
    }
}
async function generateCalendar() {
    const dateGrid = document.getElementById('dateGrid');
    const currentMonthElement = document.getElementById('currentMonth');
    
    // Названия месяцев
    const monthNames = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    
    // Устанавливаем текущий месяц
    currentMonthElement.textContent = `${monthNames[window.currentMonth]} ${window.currentYear}`;
    
    // Загружаем дни с записями
    appointmentsByDate = await loadAppointmentDays(window.currentYear, window.currentMonth);
    
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
            
            // Делаем прошедшие дни кликабельными, но с другим стилем
            dateCell.onclick = () => selectDate(formattedDate, day);
            
            // Проверяем, есть ли записи на эту дату
            if (appointmentsByDate[formattedDate]) {
                dateCell.classList.add('has-appointments');
                dateCell.title = `${appointmentsByDate[formattedDate]} записей`;
            } else {
                dateCell.title = 'Нет записей';
            }
        } 
        // Проверяем, есть ли записи на эту дату (будущие дни)
        else if (appointmentsByDate[formattedDate]) {
            dateCell.classList.add('has-appointments');
            dateCell.textContent = day;
            dateCell.onclick = () => selectDate(formattedDate, day);
            dateCell.title = `${appointmentsByDate[formattedDate]} записей`;
        }
        // Дата в будущем без записей
        else {
            dateCell.classList.add('available-date');
            dateCell.textContent = day;
            dateCell.onclick = () => selectDate(formattedDate, day);
            dateCell.title = 'Нет записей';
        }
        
        dateGrid.appendChild(dateCell);
    }
}




function loadAppointmentsForDate(date) {
    // Если выбран "Все мастера", не фильтруем по specialistId
    const specialistFilter = window.currentSpecialistId ? 
        `&specialistId=${window.currentSpecialistId}` : '';
    
    // Обновляем заголовок
    const dateObj = new Date(date);
    const formattedDate = dateObj.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    
    const masterInfo = window.currentSpecialistName ? ` - ${window.currentSpecialistName}` : '';
    
    const appointmentsHeader = document.querySelector('#appointmentsList h3');
    if (appointmentsHeader) {
        appointmentsHeader.textContent = `Записи на ${formattedDate}${masterInfo}`;
    }
    
    // Запрос с учетом фильтра по мастеру (или без него)
    fetch(`/api/appointments?startDate=${date}&endDate=${date}${specialistFilter}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Ошибка загрузки записей');
            }
            return response.json();
        })
        .then(data => {
            if (data.message === 'success') {
                displayAppointments(data.data, formattedDate);
                
                // Дополнительная прокрутка после загрузки записей
                setTimeout(() => {
                    const appointmentsList = document.getElementById('appointmentsList');
                    if (appointmentsList) {
                        appointmentsList.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'start' 
                        });
                    }
                }, 100);
            }
        })
        .catch(error => {
            console.error('Ошибка:', error);
            showError('Не удалось загрузить записи');
        });
}

function displayAppointments(appointments, selectedDate = null) {
    const appointmentsContainer = document.getElementById('appointmentsContainer');
    if (!appointmentsContainer) return;
    
    // Сортируем записи по времени
    const sortedAppointments = [...appointments].sort((a, b) => {
        return a.время.localeCompare(b.время);
    });
    
    const displayDate = selectedDate || new Date().toLocaleDateString('ru-RU');
    const masterInfo = window.currentSpecialistName ? ` - ${window.currentSpecialistName}` : '';
    
    let appointmentsHTML = `
        <div class="appointments-container">
            <div class="appointments-header">
                <h3 class="appointments-title">Записи на ${displayDate}${masterInfo}</h3>
            </div>
    `;

    if (sortedAppointments.length === 0) {
        appointmentsHTML += `
            <div class="empty-appointments">
                <div>Нет записей на эту дату</div>
                <small>Нажмите "Добавить запись" чтобы создать первую запись</small>
            </div>
        `;
    } else {
        appointmentsHTML += '<div class="appointments-grid">';
        
        sortedAppointments.forEach((appointment, index) => {
            const formattedPhone = appointment.клиент_телефон?.replace('+7', '') || 
                                 appointment.клиент_телеfono?.replace('+7', '') || '';
            
            const time = appointment.время.includes(':') ? 
                        appointment.время.split(':').slice(0, 2).join(':') : 
                        appointment.время;
            
            // Добавляем информацию о мастере, если просматриваем всех мастеров
            const masterInfo = !window.currentSpecialistId ? 
                `<div class="master-info">Мастер: ${appointment.мастер_имя}</div>` : '';
            
            appointmentsHTML += `
                <div class="appointment-card" data-appointment-id="${appointment.id}">
                    <div class="appointment-content">
                        <div class="appointment-time">${time}</div>
                        <div class="appointment-details">
                            <div class="client-info">
                                <div class="client-name">${appointment.клиент_имя}</div>
                                <div class="client-phone">${formattedPhone}</div>
                            </div>
                            <div class="service-info">
                                <div class="service-name">${appointment.услуга_название}</div>
                                <div class="service-price">${appointment.цена}₽</div>
                            </div>
                            ${masterInfo}
                        </div>
                    </div>
                    <div class="appointment-actions">
                        <button class="edit-btn" onclick="showEditAppointmentForm(${JSON.stringify(appointment).replace(/"/g, '&quot;')})">
                            ✏️ Изменить
                        </button>
                        <button class="cancel-btn" onclick="cancelAppointment(${appointment.id}, event)">
                            ✕ Отменить
                        </button>
                    </div>
                </div>
            `;
        });
        
        appointmentsHTML += '</div>';
    }
    
    appointmentsHTML += '</div>';
    
    appointmentsContainer.innerHTML = appointmentsHTML;
    
    // Добавляем кнопку "Добавить запись" если её нет
    if (!document.querySelector('.add-appointment-btn')) {
        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn-primary add-appointment-btn';
        addBtn.textContent = '✚ Добавить запись';
        addBtn.onclick = showAddAppointmentForm;
        addBtn.style.marginTop = '1rem';
        
        const container = document.querySelector('.appointments-container');
        if (container) {
            container.appendChild(addBtn);
        }
    }
}


// Обновленная функция отмены записи - АСИНХРОННАЯ ВЕРСИЯ
async function cancelAppointment(appointmentId, event) {
    if (event) event.stopPropagation();
    
    try {
        // Используем асинхронный confirm
        const confirmed = await confirm('Вы уверены, что хотите отменить эту запись?');
        
        if (!confirmed) {
            return; // Пользователь отменил действие
        }
        
        // Добавляем анимацию удаления
        const card = document.querySelector(`[data-appointment-id="${appointmentId}"]`);
        if (card) {
            card.style.opacity = '0.5';
            card.style.transform = 'scale(0.98)';
        }
        
        // Отправляем запрос на удаление
        const response = await fetch(`/api/appointment/${appointmentId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Ошибка отмены записи');
        
        const data = await response.json();
        
        if (data.message === 'success') {
            // Анимация удаления
            if (card) {
                card.style.transition = 'all 0.3s ease';
                card.style.opacity = '0';
                card.style.transform = 'translateX(100px)';
                
                setTimeout(() => {
                    // Перезагружаем записи
                    loadAppointmentsForDate(window.selectedDate);
                    // Обновляем календарь
                    if (typeof generateCalendar === 'function') {
                        generateCalendar();
                    }
                }, 300);
            }
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showError('Не удалось отменить запись: ' + error.message);
        // Восстанавливаем карточку при ошибке
        const card = document.querySelector(`[data-appointment-id="${appointmentId}"]`);
        if (card) {
            card.style.opacity = '1';
            card.style.transform = 'scale(1)';
        }
    }
}



// Глобальные функции для использования в других файлах
function showLoading() {
    document.getElementById('contentContainer').innerHTML = 
        '<div class="loading">Загрузка...</div>';
}

function showError(message) {
    document.getElementById('contentContainer').innerHTML = 
        `<div class="error">Ошибка: ${message}</div>`;
}




// Функция для загрузки услуг в форму
async function loadServicesForForm() {
    try {
        const response = await fetch('/api/services');
        if (!response.ok) throw new Error('Ошибка загрузки услуг');
        
        const data = await response.json();
        if (data.message === 'success') {
            const select = document.querySelector('select[name="serviceId"]');
            data.data.forEach(service => {
                const option = document.createElement('option');
                option.value = service.id;
                option.textContent = `${service.название} - ${service.цена} ₽`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Ошибка:', error);
    }
}



// Глобальные переменные для управления формой
let isAddFormOpen = false;

// Обновленная функция showAddAppointmentForm
function showAddAppointmentForm() {
    if (isAddFormOpen) return;
    isAddFormOpen = true;
    
    const formHTML = `
        <div class="add-appointment-form" id="addAppointmentFormContainer">
            <h3>Добавить новую запись</h3>
            <button class="btn btn-danger btn-sm" onclick="cancelAddAppointment()" style="margin-bottom: 1rem;">
                ✖ Отменить
            </button>
            <form id="addAppointmentForm">
                <div class="form-row">
                    <div class="form-group">
                        <label>Дата:</label>
                        <input type="date" class="form-control" name="date" value="${window.selectedDate}" readonly>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Время (часы:минуты):</label>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <input type="number" class="form-control" name="hours" min="0" max="23" 
                                   placeholder="Час" style="width: 80px;" required>
                            <span>:</span>
                            <input type="number" class="form-control" name="minutes" min="0" max="59" 
                                   placeholder="Минуты" style="width: 80px;" required>
                        </div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Имя клиента:</label>
                    <input type="text" class="form-control" name="clientName" required>
                </div>
                
                <div class="form-group">
                    <label>Телефон клиента:</label>
                    <div class="phone-input-container">
                        <span class="phone-prefix">+7</span>
                        <input type="tel" class="form-control phone-input" name="clientPhone" 
                               placeholder="9255355278" pattern="[0-9]{10}" 
                               maxlength="10" required>
                    </div>
                    <div class="error-message">Введите 10 цифр номера телефона</div>
                </div>
                
                <div class="form-group">
                    <label>Услуга:</label>
                    <select class="form-control" name="serviceId" required>
                        <option value="">Выберите услугу</option>
                        <!-- Услуги будут загружены динамически -->
                    </select>
                </div>
                
                <button type="submit" class="btn btn-primary">Добавить запись</button>
            </form>
        </div>
    `;
    
    document.getElementById('appointmentsList').insertAdjacentHTML('beforeend', formHTML);
    loadServicesForForm();
        // Прокручиваем к форме
    setTimeout(() => {
        const formContainer = document.getElementById('addAppointmentFormContainer');
        if (formContainer) {
            formContainer.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }
    }, 100);
    
    // Добавляем валидацию телефона
    const phoneInput = document.querySelector('input[name="clientPhone"]');
    phoneInput.addEventListener('input', function(e) {
        this.value = this.value.replace(/\D/g, '');
        if (this.value.length > 10) {
            this.value = this.value.slice(0, 10);
        }
    });
    
    // Валидация часов и минут
    const hoursInput = document.querySelector('input[name="hours"]');
    const minutesInput = document.querySelector('input[name="minutes"]');
    
    hoursInput.addEventListener('change', function() {
        if (this.value < 0) this.value = 0;
        if (this.value > 23) this.value = 23;
    });
    
    minutesInput.addEventListener('change', function() {
        if (this.value < 0) this.value = 0;
        if (this.value > 59) this.value = 59;
    });
    
    // Обработчик отправки формы
    document.getElementById('addAppointmentForm').addEventListener('submit', handleAddAppointment);
}

// Функция отмены добавления записи
function cancelAddAppointment() {
    const formContainer = document.getElementById('addAppointmentFormContainer');
    if (formContainer) {
        formContainer.remove();
    }
    isAddFormOpen = false;
}

// Обновленный обработчик добавления записи
async function handleAddAppointment(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const phoneDigits = formData.get('clientPhone');
    const hours = parseInt(formData.get('hours'));
    const minutes = parseInt(formData.get('minutes'));
    
    // Валидация времени
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        showError('Пожалуйста, введите корректное время');
        return;
    }
    
    // Форматируем время в формат HH:MM
    const time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    // Валидация телефона
    if (phoneDigits.length !== 10 || !/^\d+$/.test(phoneDigits)) {
        showError('Пожалуйста, введите корректный номер телефона (10 цифр)');
        return;
    }
    
    const appointmentData = {
        specialistId: window.currentSpecialistId,
        serviceId: formData.get('serviceId'),
        date: window.selectedDate,
        time: time,
        clientName: formData.get('clientName'),
        clientPhone: '+7' + phoneDigits
    };
    
  try {
        const response = await fetch('/api/admin/appointment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(appointmentData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка добавления записи');
        }
        
        const data = await response.json();
        if (data.message === 'success') {
            showSuccess('Запись успешно добавлена!');
            // Закрываем форму
            cancelAddAppointment();
            // Перезагружаем записи
            loadAppointmentsForDate(window.selectedDate);
            // Обновляем календарь
            generateCalendar();
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showError('Не удалось добавить запись: ' + error.message);
    }
}
// Обработчик изменения ориентации устройства
window.addEventListener('orientationchange', function() {
    setTimeout(function() {
        if (window.selectedDate && window.currentSpecialistId) {
            loadAppointmentsForDate(window.selectedDate);
        }
    }, 300);
});

// Сохраняем состояние при загрузке
window.addEventListener('load', function() {
    lastWindowWidth = window.innerWidth;
});

function selectDate(date, day) {
    console.log(`Selected date: ${date}`);
    window.selectedDate = date;
    
    // Обновляем заголовок с выбранной датой
    const dateObj = new Date(date);
    const formattedDate = dateObj.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    
    const appointmentsHeader = document.querySelector('#appointmentsList h3');
    if (appointmentsHeader) {
        appointmentsHeader.textContent = `Записи на ${formattedDate}`;
    }
    
    // Показываем список записей
    const appointmentsList = document.getElementById('appointmentsList');
    appointmentsList.style.display = 'block';
    
    // Очищаем предыдущую форму
    const existingForm = document.querySelector('.add-appointment-form');
    if (existingForm) existingForm.remove();
    isAddFormOpen = false;
    
    // Загружаем записи на выбранную дату
    loadAppointmentsForDate(date);
    
    // Добавляем кнопку для добавления записи только для текущих и будущих дат
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDateObj = new Date(date);
    
    if (selectedDateObj >= today && !document.querySelector('.add-appointment-btn')) {
        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn-primary add-appointment-btn';
        addBtn.textContent = '✚ Добавить запись';
        addBtn.onclick = showAddAppointmentForm;
        appointmentsList.querySelector('h3').after(addBtn);
    } else {
        // Удаляем кнопку, если она есть для прошедших дат
        const existingBtn = document.querySelector('.add-appointment-btn');
        if (existingBtn) existingBtn.remove();
    }
    
    // Прокручиваем к списку записей после загрузки данных
    setTimeout(() => {
        appointmentsList.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }, 300);
}



function showEditAppointmentForm(appointment) {
    if (isAddFormOpen) return;
    isAddFormOpen = true;
    
    // Сохраняем оригинальные данные записи
    window.originalAppointmentData = appointment;
    
    const formattedPhone = appointment.клиент_телефон?.replace('+7', '') || 
                          appointment.клиент_телеfono?.replace('+7', '') || '';
    
    const [hours, minutes] = appointment.время.split(':');
    
    const formHTML = `
        <div class="edit-appointment-form" id="editAppointmentFormContainer">
            <h3>Редактировать запись</h3>
            <button class="btn btn-danger btn-sm" onclick="cancelEditAppointment()" style="margin-bottom: 1rem;">
                ✖ Отменить
            </button>
            <form id="editAppointmentForm" data-appointment-id="${appointment.id}">
                <div class="form-row">
                    <div class="form-group">
                        <label>Дата:</label>
                        <input type="date" class="form-control" name="date" value="${appointment.дата}" required>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Время (часы:минуты):</label>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <input type="number" class="form-control" name="hours" min="0" max="23" 
                                   placeholder="Час" style="width: 80px;" value="${hours}" required>
                            <span>:</span>
                            <input type="number" class="form-control" name="minutes" min="0" max="59" 
                                   placeholder="Минуты" style="width: 80px;" value="${minutes}" required>
                        </div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Имя клиента:</label>
                    <input type="text" class="form-control" name="clientName" value="${appointment.клиент_имя}" required>
                </div>
                
                <div class="form-group">
                    <label>Текущая услуга:</label>
                    <div class="current-service-display" style="padding: 10px; background: #f0f8ff; border-radius: 5px; margin-bottom: 10px;">
                        <strong>${appointment.услуга_название}</strong> - ${appointment.цена} ₽
                        <input type="hidden" id="originalServiceId" value="${appointment.услуга_id}">
                    </div>
                    <button type="button" class="btn btn-outline-primary btn-sm" onclick="toggleServiceSelection()" id="toggleServiceBtn">
                        ✏️ Изменить услугу
                    </button>
                </div>
                
                <div class="form-group service-selection" id="serviceSelection" style="display: none;">
                    <label>Выберите новую услугу:</label>
                    <select class="form-control" name="serviceId" id="serviceSelect">
                        <option value="">Выберите услугу</option>
                        <!-- Услуги будут загружены динамически -->
                    </select>
                    <small style="color: #666;">Оставьте "Выберите услугу" чтобы не менять услугу</small>
                </div>
                
                <div class="form-group">
                    <label>Телефон клиента:</label>
                    <div class="phone-input-container">
                        <span class="phone-prefix">+7</span>
                        <input type="tel" class="form-control phone-input" name="clientPhone" 
                               placeholder="9255355278" pattern="[0-9]{10}" 
                               maxlength="10" value="${formattedPhone}" required>
                    </div>
                    <div class="error-message">Введите 10 цифр номера телефона</div>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">Сохранить изменения</button>
                    <button type="button" class="btn btn-danger" onclick="deleteAppointment(${appointment.id})">
                        Удалить запись
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.getElementById('appointmentsList').insertAdjacentHTML('beforeend', formHTML);
    
    // Загружаем услуги для выбора
    loadServicesForEditForm(appointment.услуга_id);
    
    // Прокручиваем к форме
    setTimeout(() => {
        const formContainer = document.getElementById('editAppointmentFormContainer');
        if (formContainer) {
            formContainer.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }
    }, 100);
    
    // Добавляем валидацию
    const phoneInput = document.querySelector('#editAppointmentForm input[name="clientPhone"]');
    phoneInput.addEventListener('input', function(e) {
        this.value = this.value.replace(/\D/g, '');
        if (this.value.length > 10) {
            this.value = this.value.slice(0, 10);
        }
    });
    
    // Валидация часов и минут
    const hoursInput = document.querySelector('#editAppointmentForm input[name="hours"]');
    const minutesInput = document.querySelector('#editAppointmentForm input[name="minutes"]');
    
    hoursInput.addEventListener('change', function() {
        if (this.value < 0) this.value = 0;
        if (this.value > 23) this.value = 23;
    });
    
    minutesInput.addEventListener('change', function() {
        if (this.value < 0) this.value = 0;
        if (this.value > 59) this.value = 59;
    });
    
    // Обработчик отправки формы
    document.getElementById('editAppointmentForm').addEventListener('submit', handleEditAppointment);
}

// Функция для переключения отображения выбора услуги
// Обновленная функция для переключения отображения выбора услуги
function toggleServiceSelection() {
    const serviceSelection = document.getElementById('serviceSelection');
    const toggleBtn = document.getElementById('toggleServiceBtn');
    
    if (serviceSelection.style.display === 'none') {
        serviceSelection.style.display = 'block';
        toggleBtn.textContent = '✖ Отменить изменение услуги';
        toggleBtn.classList.remove('btn-outline-primary');
        toggleBtn.classList.add('btn-outline-secondary');
    } else {
        serviceSelection.style.display = 'none';
        toggleBtn.textContent = '✏️ Изменить услугу';
        toggleBtn.classList.remove('btn-outline-secondary');
        toggleBtn.classList.add('btn-outline-primary');
        
        // Сбрасываем выбор услуги при закрытии
        const select = document.getElementById('serviceSelect');
        if (select) {
            select.selectedIndex = 0;
        }
    }
}

// Исправленная функция для загрузки услуг в форму редактирования
async function loadServicesForEditForm(selectedServiceId) {
    try {
        const response = await fetch('/api/services');
        if (!response.ok) throw new Error('Ошибка загрузки услуг');
        
        const data = await response.json();
        if (data.message === 'success') {
            const select = document.querySelector('#editAppointmentForm select[name="serviceId"]');
            select.innerHTML = '<option value="">Выберите услугу</option>';
            
            data.data.forEach(service => {
                const option = document.createElement('option');
                option.value = service.id;
                option.textContent = `${service.название} - ${service.цена} ₽`;
                
                // Выбираем услугу, если она соответствует исходной
                if (parseInt(service.id) === parseInt(selectedServiceId)) {
                    option.selected = true;
                }
                
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

async function handleEditAppointment(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const appointmentId = e.target.dataset.appointmentId;
    const phoneDigits = formData.get('clientPhone');
    const hours = parseInt(formData.get('hours'));
    const minutes = parseInt(formData.get('minutes'));
    
    // Получаем выбранную услугу из формы
    const selectedServiceId = formData.get('serviceId');
    // Получаем оригинальную услугу из скрытого поля
    const originalServiceId = document.getElementById('originalServiceId')?.value;
    
    // Определяем, менялась ли услуга
    const serviceChanged = selectedServiceId && selectedServiceId !== '' && selectedServiceId !== originalServiceId;
    
    // Валидация
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        alert('Пожалуйста, введите корректное время');
        return;
    }
    
    if (phoneDigits.length !== 10 || !/^\d+$/.test(phoneDigits)) {
        alert('Пожалуйста, введите корректный номер телефона (10 цифр)');
        return;
    }
    
    const appointmentData = {
        date: formData.get('date'),
        time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
        clientName: formData.get('clientName'),
        clientPhone: '+7' + phoneDigits
    };
    
    // Добавляем serviceId только если услуга была изменена
    if (serviceChanged) {
        appointmentData.serviceId = selectedServiceId;
    }
    
    try {
        const response = await fetch(`/api/appointment/${appointmentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(appointmentData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка обновления записи');
        }
        
        const data = await response.json();
        if (data.message === 'success') {
            alert('Запись успешно обновлена!');
            cancelEditAppointment();
            loadAppointmentsForDate(window.selectedDate);
            generateCalendar();
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Не удалось обновить запись: ' + error.message);
    }
}

// Функция отмены редактирования
function cancelEditAppointment() {
    const formContainer = document.getElementById('editAppointmentFormContainer');
    if (formContainer) {
        formContainer.remove();
    }
    isAddFormOpen = false;
    // Очищаем глобальные переменные
    window.originalAppointmentData = null;
    window.currentServiceId = null;
}


// Обновленная функция удаления записи
// Обновленная функция удаления записи
async function deleteAppointment(appointmentId) {
    try {
        const confirmed = await confirm('Вы уверены, что хотите удалить эту запись? Это действие нельзя отменить.');
        
        if (!confirmed) {
            return; // Пользователь отменил действие
        }
        
        const response = await fetch(`/api/appointment/${appointmentId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Ошибка удаления записи');
        }
        
        const data = await response.json();
        
        if (data.message === 'success') {
            showSuccess('Запись успешно удалена!');
            cancelEditAppointment();
            loadAppointmentsForDate(window.selectedDate);
            generateCalendar();
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showError('Не удалось удалить запись: ' + error.message);
    }
}



// Добавить в admin.js после глобальных переменных
let autoUpdateInterval = null;
let lastUpdateTime = null;

// Функция запуска автообновления
function startAutoUpdate() {
    // Останавливаем предыдущий интервал, если был
    if (autoUpdateInterval) {
        clearInterval(autoUpdateInterval);
    }
    
    // Обновляем каждые 30 секунд
    autoUpdateInterval = setInterval(() => {
        autoUpdateData();
    }, 30000); // 30 секунд
    
}

// Функция автообновления данных
function autoUpdateData() {
    const now = new Date().toISOString();
    
    // Если мы в разделе журнала и есть выбранная дата
    if (currentActiveSection === 'journal' && window.selectedDate && window.currentSpecialistId) {
        updateAppointmentsSilently();
    }
    
    // Если мы в разделе расписания
    if (currentActiveSection === 'schedule' && window.scheduleManager) {
        window.scheduleManager.loadSchedule();
    }
    
    lastUpdateTime = now;
}

// Тихие обновления без показа загрузки
function updateAppointmentsSilently() {
    if (!window.selectedDate || !window.currentSpecialistId) return;
    
    fetch(`/api/appointments?specialistId=${window.currentSpecialistId}&startDate=${window.selectedDate}&endDate=${window.selectedDate}`)
        .then(response => {
            if (!response.ok) return;
            return response.json();
        })
        .then(data => {
            if (data && data.message === 'success') {
                // Обновляем только если данные изменились
                updateAppointmentsIfChanged(data.data);
            }
        })
        .catch(error => {
            console.log('Автообновление: ошибка загрузки данных', error);
        });
}

// Обновляем интерфейс только если данные изменились
function updateAppointmentsIfChanged(newAppointments) {
    const currentAppointments = getCurrentAppointmentsData();
    
    // Простая проверка на изменения - сравнение количества записей и хэша данных
    if (JSON.stringify(currentAppointments) !== JSON.stringify(newAppointments)) {
        displayAppointments(newAppointments);
        
        // Также обновляем календарь если он видим
        if (typeof generateCalendar === 'function') {
            generateCalendar();
        }
    }
}

// Получаем текущие данные записей из DOM
function getCurrentAppointmentsData() {
    const appointments = [];
    const cards = document.querySelectorAll('.appointment-card');
    
    cards.forEach(card => {
        const id = card.dataset.appointmentId;
        const time = card.querySelector('.appointment-time')?.textContent;
        const clientName = card.querySelector('.client-name')?.textContent;
        const clientPhone = card.querySelector('.client-phone')?.textContent;
        const serviceName = card.querySelector('.service-name')?.textContent;
        const price = card.querySelector('.service-price')?.textContent;
        
        if (id) {
            appointments.push({
                id,
                время: time,
                клиент_имя: clientName?.replace('Клиент: ', ''),
                клиент_телефон: clientPhone,
                услуга_название: serviceName,
                цена: price?.replace('₽', '')
            });
        }
    });
    
    return appointments;
}


document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // Страница не видна - останавливаем автообновление
        if (autoUpdateInterval) {
            clearInterval(autoUpdateInterval);
            autoUpdateInterval = null;
        }
        if (window.scheduleManager && window.scheduleManager.autoUpdateInterval) {
            window.scheduleManager.stopAutoUpdate();
        }
    } else {
        // Страница снова активна - перезапускаем автообновление
        if (currentActiveSection === 'journal' || currentActiveSection === 'schedule') {
            setTimeout(() => startAutoUpdate(), 1000);
        }
    }
});



function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Закрытие модальных окон по клику вне их области
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        hideModal(e.target.id);
    }
});

// Закрытие по ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(modal => {
            if (modal.style.display === 'block') {
                hideModal(modal.id);
            }
        });
    }
});

// Функции-обертки для удобства
function showSuccess(message) {
    showModal('success', message);
}

function showError(message) {
    showModal('error', message);
}

function showInfo(message) {
    showModal('info', message);
}

function showConfirm(message, callback) {
    showModal('confirm', message, callback);
}


// admin.js - исправленная функция showModal
function showModal(type, message, callback = null) {
    const modal = document.getElementById(type + 'Modal');
    const messageElement = document.getElementById(type + 'Message');
    
    if (modal && messageElement) {
        messageElement.textContent = message;
        modal.style.display = 'block';
        
        if (type === 'confirm' && callback) {
            // Клонируем кнопку Да
            const confirmYes = document.getElementById('confirmYes').cloneNode(true);
            document.getElementById('confirmYes').replaceWith(confirmYes);
            
            // Ищем кнопку Нет по классу (исправление)
            const confirmNo = document.querySelector('#confirmModal .modal-btn-secondary');
            if (confirmNo) {
                const newConfirmNo = confirmNo.cloneNode(true);
                confirmNo.replaceWith(newConfirmNo);
                
                newConfirmNo.onclick = () => {
                    hideModal('confirmModal');
                    callback(false);
                };
            }
            
            confirmYes.onclick = () => {
                hideModal('confirmModal');
                callback(true);
            };
        }
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Закрытие модальных окон по клику вне их области
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        hideModal(e.target.id);
    }
});

// Закрытие по ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(modal => {
            if (modal.style.display === 'block') {
                hideModal(modal.id);
            }
        });
    }
});

// Функции-обертки для удобства
function showSuccess(message) {
    showModal('success', message);
}

function showError(message) {
    showModal('error', message);
}

function showInfo(message) {
    showModal('info', message);
}

function showConfirm(message, callback) {
    showModal('confirm', message, callback);
}

// Заменяем стандартные alert и confirm
window.alert = function(message) {
    showInfo(message);
};

window.confirm = function(message) {
    return new Promise((resolve) => {
        showConfirm(message, (result) => {
            resolve(result);
        });
    });
};





// Функция отображения истории записей
function displayAppointmentsHistory(appointments) {
    const historyHTML = `
        <div class="history-content">
            <div class="history-header">
                <h3>📋 История записей</h3>
                <div class="history-info">
                    <span>Новые записи помечены </span>
                    <span class="new-badge">NEW</span>
                </div>
            </div>
            
            <div class="history-list" id="historyList">
                ${generateHistoryItems(appointments)}
            </div>
        </div>
    `;
    
    document.getElementById('contentContainer').innerHTML = historyHTML;
    
    // Запускаем автообновление для истории
    startHistoryAutoUpdate();
}


// Генерация элементов истории - ИСПРАВЛЕННАЯ ВЕРСИЯ
function generateHistoryItems(appointments) {
    if (!appointments || appointments.length === 0) {
        return '<div class="empty-history">Записей пока нет</div>';
    }
    
    // Сортируем по дате создания (новые сверху)
    const sortedAppointments = [...appointments].sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
    );
    
    // Берем только последние 20 записей для отображения
    const recentAppointments = sortedAppointments.slice(0, 20);
    
    return recentAppointments.map(appointment => {
        const createdDate = new Date(appointment.created_at);
        const isNew = createdDate > new Date(lastViewedTimestamp);
        
        // ИСПРАВЛЕНО: используем мастер_id из данных
        const masterId = appointment.мастер_id || appointment.masterId;
        
        return `
            <div class="history-item ${isNew ? 'new-item' : ''}" data-appointment-id="${appointment.id}">
                <div class="history-item-header">
                    <div class="history-date">
                        <strong>📅 ${appointment.дата} 🕒 ${appointment.время}</strong>
                        ${isNew ? '<span class="new-badge">NEW</span>' : ''}
                    </div>
                    <div class="history-created">
                        Создано: ${createdDate.toLocaleString('ru-RU')}
                    </div>
                </div>
                
                <div class="history-item-content">
                    <div class="history-detail">
                        <span class="detail-label">👤 Мастер:</span>
                        <span class="detail-value">${appointment.мастер_имя}</span>
                    </div>
                    <div class="history-detail">
                        <span class="detail-label">💅 Услуга:</span>
                        <span class="detail-value">${appointment.услуга_название}</span>
                    </div>
                    <div class="history-detail">
                        <span class="detail-label">💰 Цена:</span>
                        <span class="detail-value">${appointment.цена} ₽</span>
                    </div>
                    <div class="history-detail">
                        <span class="detail-label">👨‍💼 Клиент:</span>
                        <span class="detail-value">${appointment.клиент_имя}</span>
                    </div>
                    <div class="history-detail">
                        <span class="detail-label">📞 Телефон:</span>
                        <span class="detail-value">${appointment.клиент_телефон}</span>
                    </div>
                </div>
                

            </div>
        `;
    }).join('');
}

function viewAppointmentInJournal(date, masterId) {
    console.log('Переход к записи:', { date, masterId });
    
    // Переключаемся на раздел журнала
    if (typeof loadSection === 'function') {
        loadSection('journal');
        
        // Ждем загрузки журнала и выбираем мастера и дату
        setTimeout(() => {
            // Если masterId передан, выбираем конкретного мастера
            if (masterId) {
                const masterCard = document.querySelector(`[data-specialist-id="${masterId}"]`);
                if (masterCard) {
                    masterCard.click();
                    
                    // После выбора мастера выбираем дату
                    setTimeout(() => {
                        selectDateWithMaster(date, masterId);
                    }, 500);
                } else {
                    // Если мастера нет в списке, все равно пытаемся выбрать дату
                    console.log('Мастер не найден в списке, пытаемся выбрать дату...');
                    selectDateWithMaster(date, masterId);
                }
            } else {
                // Если masterId не передан, просто выбираем дату (пользователь выберет мастера вручную)
                console.log('MasterId не передан, выбираем только дату');
                selectDateWithMaster(date, null);
            }
        }, 500);
    }
}

function selectDateWithMaster(date, masterId) {
    if (typeof selectDate === 'function') {
        // Убедимся, что календарь загружен
        if (typeof generateCalendar === 'function') {
            generateCalendar().then(() => {
                // Небольшая задержка для полной загрузки календаря
                setTimeout(() => {
                    selectDate(date);
                    console.log('Дата выбрана:', date, 'Мастер:', masterId || 'не указан');
                    
                    // Если мастер указан, показываем подсказку
                    if (masterId) {
                        setTimeout(() => {
                            showInfo(`Выбрана запись на ${date}. Пожалуйста, выберите мастера "${window.currentSpecialistName || ''}" в списке выше.`);
                        }, 1000);
                    }
                }, 500);
            });
        } else {
            selectDate(date);
        }
    }
}

// Автообновление истории
let historyUpdateInterval = null;

function startHistoryAutoUpdate() {
    if (historyUpdateInterval) {
        clearInterval(historyUpdateInterval);
    }
    
    historyUpdateInterval = setInterval(() => {
        updateHistorySilently();
    }, 30000); // 30 секунд
}

function updateHistorySilently() {
    fetch('/api/appointments?createdSince=' + new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .then(response => {
            if (!response.ok) return;
            return response.json();
        })
        .then(data => {
            if (data && data.message === 'success') {
                // Просто обновляем отображение без уведомлений
                displayAppointmentsHistoryInJournal(data.data);
            }
        })
        .catch(error => {
            console.log('Автообновление истории: ошибка', error);
        });
}

// Останавливаем автообновление при смене раздела
function stopHistoryAutoUpdate() {
    if (historyUpdateInterval) {
        clearInterval(historyUpdateInterval);
        historyUpdateInterval = null;
    }
}


// Функция для настройки кнопок переключения
function setupViewToggleButtons() {
    const journalBtn = document.querySelector('[data-view="journal"]');
    const historyBtn = document.querySelector('[data-view="history"]');
    
    journalBtn.addEventListener('click', () => switchView('journal'));
    historyBtn.addEventListener('click', () => switchView('history'));
}

// Функция переключения между видами
function switchView(view) {
    if (currentView === view) return;
    
    currentView = view;
    
    // Сбрасываем offset при переключении
    resetHistoryOffset();
    
    // Обновляем активные кнопки
    document.querySelectorAll('.view-toggle-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-view="${view}"]`).classList.add('active');
    
    // Показываем/скрываем соответствующие контейнеры
    document.getElementById('journalView').style.display = view === 'journal' ? 'block' : 'none';
    document.getElementById('historyView').style.display = view === 'history' ? 'block' : 'none';
    
    // Загружаем контент для выбранного вида
    if (view === 'journal') {
        showJournalView();
    } else {
        showHistoryView();
    }
}


// Функция показа журнала
function showJournalView() {
    // Если уже загружены мастера и выбран мастер, показываем календарь
    if (window.currentSpecialistId) {
        const calendarSection = document.getElementById('calendarSection');
        if (calendarSection) {
            calendarSection.style.display = 'block';
            if (typeof generateCalendar === 'function') {
                generateCalendar();
            }
        }
        
        // Если выбрана дата, показываем записи
        if (window.selectedDate) {
            const appointmentsList = document.getElementById('appointmentsList');
            if (appointmentsList) {
                appointmentsList.style.display = 'block';
                loadAppointmentsForDate(window.selectedDate);
            }
        }
    }
}

// Функция показа истории
function showHistoryView() {
    const historyView = document.getElementById('historyView');
    
    // Показываем загрузку
    historyView.innerHTML = `
        <div class="loading-history">
            <div class="spinner"></div>
            <p>Загрузка истории записей...</p>
        </div>
    `;
    
    // Загружаем историю записей
    loadAppointmentsHistory();
}

// Функция загрузки истории записей - ИСПРАВЛЕННАЯ ВЕРСИЯ
function loadAppointmentsHistory() {
    const historyView = document.getElementById('historyView');
    
    // Сбрасываем offset при загрузке
    resetHistoryOffset();
    
    // Загружаем последнее время просмотра из localStorage
    const savedTimestamp = localStorage.getItem('lastViewedTimestamp');
    if (savedTimestamp) {
        lastViewedTimestamp = parseInt(savedTimestamp);
    }
    
    fetch('/api/appointments?createdSince=' + new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .then(response => {
            if (!response.ok) throw new Error('Ошибка загрузки истории');
            return response.json();
        })
        .then(data => {
            if (data.message === 'success') {
                displayAppointmentsHistoryInJournal(data.data);
            }
        })
        .catch(error => {
            console.error('Ошибка:', error);
            historyView.innerHTML = `
                <div class="error-message">
                    <p>❌ Не удалось загрузить историю записей</p>
                    <button onclick="loadAppointmentsHistory()" class="btn btn-primary">Повторить попытку</button>
                </div>
            `;
        });
}
function displayAppointmentsHistoryInJournal(appointments) {
    const historyView = document.getElementById('historyView');
    
    const historyHTML = `
        <div class="history-content">
            <div class="history-header">
                <h3>📋 История записей за последние 7 дней</h3>
                <div class="history-info">
                    <span>Новые записи помечены </span>
                    <span class="new-badge">NEW</span>
                    <button class="btn btn-outline btn-sm" onclick="markAllAsViewed()" style="margin-left: 10px;">
                        📍 Отметить все как просмотренные
                    </button>
                </div>
            </div>
            
            <div class="history-list" id="historyList">
                ${generateHistoryItems(appointments)}
            </div>
            
            <div class="history-actions">
                <button class="btn btn-outline" onclick="loadMoreHistory()">
                    📥 Загрузить еще
                </button>
                <button class="btn btn-primary" onclick="refreshHistory()">
                    🔄 Обновить
                </button>
            </div>
        </div>
    `;
    
    historyView.innerHTML = historyHTML;
}


function markAllAsViewed() {
    lastViewedTimestamp = Date.now();
    // Сохраняем в localStorage
    localStorage.setItem('lastViewedTimestamp', lastViewedTimestamp);
    
    // Обновляем отображение
    const historyItems = document.querySelectorAll('.history-item');
    historyItems.forEach(item => {
        item.classList.remove('new-item');
        const badge = item.querySelector('.new-badge');
        if (badge) badge.remove();
    });
    
    showSuccess('Все записи отмечены как просмотренные');
}

function refreshHistory() {
    const historyView = document.getElementById('historyView');
    historyView.innerHTML = `
        <div class="loading-history">
            <div class="spinner"></div>
            <p>Загрузка истории записей...</p>
        </div>
    `;
    
    loadAppointmentsHistory();
}

// Исправленная функция загрузки дополнительной истории
let historyOffset = 0;
const HISTORY_LIMIT = 20;

function loadMoreHistory() {
    console.log('Загрузка дополнительной истории...');
    
    // Показываем индикатор загрузки
    const loadMoreBtn = document.querySelector('.history-actions .btn-outline');
    const originalText = loadMoreBtn.textContent;
    loadMoreBtn.textContent = '⏳ Загрузка...';
    loadMoreBtn.disabled = true;
    
    // Увеличиваем offset для следующей порции данных
    historyOffset += HISTORY_LIMIT;
    
    // Рассчитываем дату для загрузки более старых записей
    const olderDate = new Date();
    olderDate.setDate(olderDate.getDate() - 7 - (historyOffset / 2)); // Загружаем более старые записи
    
    fetch(`/api/appointments?createdSince=${olderDate.toISOString()}`)
        .then(response => {
            if (!response.ok) throw new Error('Ошибка загрузки истории');
            return response.json();
        })
        .then(data => {
            if (data.message === 'success' && data.data.length > 0) {
                appendHistoryItems(data.data);
                showSuccess(`Загружено ${data.data.length} записей`);
            } else {
                showInfo('Больше записей для загрузки нет');
                // Скрываем кнопку, если записей больше нет
                loadMoreBtn.style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Ошибка загрузки истории:', error);
            showError('Не удалось загрузить дополнительные записи');
            // Восстанавливаем offset при ошибке
            historyOffset -= HISTORY_LIMIT;
        })
        .finally(() => {
            // Восстанавливаем кнопку
            loadMoreBtn.textContent = originalText;
            loadMoreBtn.disabled = false;
        });
}

// Функция для добавления новых элементов истории
function appendHistoryItems(newAppointments) {
    const historyList = document.getElementById('historyList');
    
    if (!historyList) {
        console.error('Элемент historyList не найден');
        return;
    }
    
    // Убираем сообщение "Записей пока нет", если оно есть
    const emptyMessage = historyList.querySelector('.empty-history');
    if (emptyMessage) {
        emptyMessage.remove();
    }
    
    // Генерируем HTML для новых записей
    const newItemsHTML = generateHistoryItems(newAppointments);
    
    // Добавляем новые записи в конец списка
    historyList.insertAdjacentHTML('beforeend', newItemsHTML);
    
    // Прокручиваем к новым записям
    setTimeout(() => {
        const newItems = historyList.querySelectorAll('.history-item');
        if (newItems.length > 0) {
            const lastItem = newItems[newItems.length - 1];
            lastItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, 100);
}


function resetHistoryOffset() {
    historyOffset = 0;
}


// Добавим стили для загрузки истории в admin.css
const historyStyles = `
/* Стили для загрузки истории */
.loading-history {
    text-align: center;
    padding: 3rem;
    color: #6c757d;
}

.loading-history .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.error-message {
    text-align: center;
    padding: 2rem;
    color: #e74c3c;
}

.history-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid #e9ecef;
}

@media (max-width: 768px) {
    .history-actions {
        flex-direction: column;
        align-items: center;
    }
    
    .history-actions .btn {
        min-width: 200px;
    }
}
`;

// Добавляем стили в документ
const styleSheet = document.createElement('style');
styleSheet.textContent = historyStyles;
document.head.appendChild(styleSheet);



// Обновим функцию autoUpdateData для учета текущего вида
function autoUpdateData() {
    const now = new Date().toISOString();
    
    // Если мы в разделе журнала и просматриваем журнал
    if (currentActiveSection === 'journal' && currentView === 'journal' && 
        window.selectedDate && window.currentSpecialistId) {
        updateAppointmentsSilently();
    }
    
    // Если мы в разделе журнала и просматриваем историю
    if (currentActiveSection === 'journal' && currentView === 'history') {
        updateHistorySilently();
    }
    
    // Если мы в разделе расписания
    if (currentActiveSection === 'schedule' && window.scheduleManager) {
        window.scheduleManager.loadSchedule();
    }
    
    lastUpdateTime = now;
}

// Инициализация модальных окон при загрузке
document.addEventListener('DOMContentLoaded', function() {
    // Скрываем все модальные окна при загрузке
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
});