let currentActiveSection = 'journal'; // По умолчанию активен журнал
let currentView = 'journal'; // 'journal' или 'history'
let lastViewedTimestamp = Date.now();
let isModalOpen = false;
let currentModalType = null; // 'add' или 'edit'




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
// Функция загрузки контента журнала - ОБНОВЛЕННАЯ (без лишней кнопки)
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
                <div class="selection-header" id="selectionHeader" style="display: none;">
                    <div class="selected-master-compact" id="selectedMasterCompact">
                        <!-- Выбранный мастер будет здесь -->
                    </div>
                    <div class="selected-date-compact" id="selectedDateCompact" style="display: none;">
                        <!-- Выбранная дата будет здесь -->
                    </div>
                </div>
                
                <div class="specialists-selection" id="specialistsSelection">
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
                    <div class="calendar-header">
                        <div class="month-navigation">
                            <button class="month-nav-btn" onclick="changeMonth(-1)">←</button>
                            <span class="current-month" id="currentMonth"></span>
                            <button class="month-nav-btn" onclick="changeMonth(1)">→</button>
                        </div>
                        <!-- УБРАНА КНОПКА ИЗМЕНЕНИЯ ДАТЫ - она есть в компактном заголовке -->
                    </div>
                    <div class="date-grid" id="dateGrid"></div>
                </div>
                
                <div class="appointments-list" id="appointmentsList" style="display: none;">
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

// Функция выбора всех мастеров - ИСПРАВЛЕННАЯ ВЕРСИЯ
function selectAllMasters() {
    // СОХРАНЯЕМ ТЕКУЩУЮ ДАТУ
    const currentDate = window.selectedDate;
    
    window.currentSpecialistId = null;
    window.currentSpecialistName = 'Все мастера';
    
    // Показываем активное состояние кнопки
    document.getElementById('allMastersBtn').classList.add('active');
    
    // Снимаем выделение с отдельных мастеров
    document.querySelectorAll('.specialist-card-admin').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Обновляем компактный заголовок
    updateSelectionHeader('Все мастера', currentDate);
    
    // Скрываем список мастеров
    document.getElementById('specialistsSelection').style.display = 'none';
    document.getElementById('selectionHeader').style.display = 'flex';
    
    // ВОССТАНАВЛИВАЕМ ДАТУ
    if (currentDate) {
        window.selectedDate = currentDate;
        console.log('Дата восстановлена при выборе всех мастеров:', currentDate);
        
        // Если дата была выбрана ранее, сразу показываем записи
        document.getElementById('calendarSection').style.display = 'none';
        document.getElementById('appointmentsList').style.display = 'block';
        loadAppointmentsForDate(currentDate);
        
        // Прокручиваем к записям
        setTimeout(() => {
            document.getElementById('appointmentsList').scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }, 300);
    } else {
        // Если даты нет, показываем календарь для выбора даты
        document.getElementById('calendarSection').style.display = 'block';
        document.getElementById('appointmentsList').style.display = 'none';
        
        // Инициализируем календарь (будет показано информационное сообщение)
        initCalendar();
    }
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
// Обновленная функция отображения мастеров для выбора
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


function selectSpecialistForJournal(specialistId, specialistName) {
    // СОХРАНЯЕМ ТЕКУЩУЮ ДАТУ ПЕРЕД ВЫБОРОМ НОВОГО МАСТЕРА
    const currentDate = window.selectedDate;
    
    window.currentSpecialistId = specialistId;
    window.currentSpecialistName = specialistName;
    
    // Снимаем выделение с кнопки "Все мастера"
    document.getElementById('allMastersBtn').classList.remove('active');
    
    // Показываем выбранного мастера
    document.querySelectorAll('.specialist-card-admin').forEach(card => {
        card.classList.remove('selected');
    });
    document.querySelector(`[data-specialist-id="${specialistId}"]`).classList.add('selected');
    
    // Обновляем компактный заголовок
    updateSelectionHeader(specialistName, currentDate);
    
    // Скрываем список мастеров и показываем календарь
    document.getElementById('specialistsSelection').style.display = 'none';
    document.getElementById('selectionHeader').style.display = 'flex';
    
    // ВОССТАНАВЛИВАЕМ ДАТУ В ГЛОБАЛЬНОЙ ПЕРЕМЕННОЙ
    if (currentDate) {
        window.selectedDate = currentDate;
        console.log('Дата восстановлена при выборе мастера:', currentDate);
        
        // Если дата была выбрана ранее, сразу показываем записи
        document.getElementById('calendarSection').style.display = 'none';
        document.getElementById('appointmentsList').style.display = 'block';
        loadAppointmentsForDate(currentDate);
        
        // Прокручиваем к записям
        setTimeout(() => {
            document.getElementById('appointmentsList').scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }, 300);
    } else {
        // Если даты нет, показываем календарь для выбора даты
        document.getElementById('calendarSection').style.display = 'block';
        document.getElementById('appointmentsList').style.display = 'none';
        
        // Инициализируем календарь (теперь будет показывать дни только для выбранного мастера)
        initCalendar();
    }
}

    // Загружаем начальный раздел
    loadSection('journal');
});



// Функция обновления заголовка выбора - УЛУЧШЕННАЯ ВЕРСИЯ (без ссылки на changeDateBtn)
function updateSelectionHeader(masterName, date) {
    const selectionHeader = document.getElementById('selectionHeader');
    const masterCompact = document.getElementById('selectedMasterCompact');
    const dateCompact = document.getElementById('selectedDateCompact');
    
    // Обновляем мастера
    masterCompact.innerHTML = `
        <div class="selected-item">
            <span class="selected-label">Мастер:</span>
            <span class="selected-value">${masterName}</span>
            <button class="change-selection-btn" onclick="changeMaster()">
                ✏️ Изменить
            </button>
        </div>
    `;
    
    // Обновляем дату если есть
    if (date) {
        const dateObj = new Date(date);
        const formattedDate = dateObj.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        
        dateCompact.innerHTML = `
            <div class="selected-item">
                <span class="selected-label">Дата:</span>
                <span class="selected-value">${formattedDate}</span>
                <button class="change-selection-btn" onclick="showCalendar()">
                    ✏️ Изменить
                </button>
            </div>
        `;
        dateCompact.style.display = 'block';
        
        // ОБНОВЛЯЕМ ГЛОБАЛЬНУЮ ПЕРЕМЕННУЮ
        window.selectedDate = date;
    } else {
        dateCompact.style.display = 'none';
    }
}

// Функция смены мастера - ИСПРАВЛЕННАЯ ВЕРСИЯ
function changeMaster() {
    // СОХРАНЯЕМ ВЫБРАННУЮ ДАТУ ПЕРЕД СМЕНОЙ МАСТЕРА
    const currentDate = window.selectedDate;
    
    // Показываем список мастеров снова
    document.getElementById('specialistsSelection').style.display = 'block';
    document.getElementById('selectionHeader').style.display = 'none';
    document.getElementById('calendarSection').style.display = 'none';
    document.getElementById('appointmentsList').style.display = 'none';
    
    // Восстанавливаем дату после смены мастера
    setTimeout(() => {
        if (currentDate) {
            window.selectedDate = currentDate;
            console.log('Дата восстановлена после смены мастера:', currentDate);
        }
    }, 100);
    
    // Прокручиваем к выбору мастеров
    setTimeout(() => {
        document.getElementById('specialistsSelection').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }, 100);
}

// Функция показа календаря - ИСПРАВЛЕННАЯ ВЕРСИЯ
function showCalendar() {
    // Показываем календарь
    document.getElementById('calendarSection').style.display = 'block';
    // Скрываем список записей
    document.getElementById('appointmentsList').style.display = 'none';
    
    // Сбрасываем выбранную дату в глобальной переменной
    window.selectedDate = null;
    
    // Обновляем заголовок (убираем дату)
    updateSelectionHeader(window.currentSpecialistName, null);
    
    // Прокручиваем к календарю
    setTimeout(() => {
        document.getElementById('calendarSection').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }, 100);
}


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
// Функция для загрузки дней с записями - ИСПРАВЛЕННАЯ ВЕРСИЯ
async function loadAppointmentDays(year, month) {
    // Если выбран конкретный мастер, фильтруем по specialistId
    // Если выбран "Все мастера", НЕ загружаем дни с записями (возвращаем пустой объект)
    const specialistFilter = window.currentSpecialistId ? 
        `&specialistId=${window.currentSpecialistId}` : '';
    
    // Если выбран "Все мастера", не показываем подсветку дней
    if (!window.currentSpecialistId) {
        return {};
    }
    
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
    
    // Загружаем дни с записями ТОЛЬКО для выбранного мастера
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
            
            // Проверяем, есть ли записи на эту дату у ВЫБРАННОГО мастера
            if (appointmentsByDate[formattedDate]) {
                dateCell.classList.add('has-appointments');
                dateCell.title = `${appointmentsByDate[formattedDate]} записей у выбранного мастера`;
            } else {
                dateCell.title = 'Нет записей у выбранного мастера';
            }
        } 
        // Проверяем, есть ли записи на эту дату у ВЫБРАННОГО мастера (будущие дни)
        else if (appointmentsByDate[formattedDate]) {
            dateCell.classList.add('has-appointments');
            dateCell.textContent = day;
            dateCell.onclick = () => selectDate(formattedDate, day);
            dateCell.title = `${appointmentsByDate[formattedDate]} записей у выбранного мастера`;
        }
        // Дата в будущем без записей у выбранного мастера
        else {
            dateCell.classList.add('available-date');
            dateCell.textContent = day;
            dateCell.onclick = () => selectDate(formattedDate, day);
            dateCell.title = 'Нет записей у выбранного мастера';
        }
        
        dateGrid.appendChild(dateCell);
    }
    
    // Добавляем информационное сообщение если выбран "Все мастера"
    if (!window.currentSpecialistId) {
        const infoMessage = document.createElement('div');
        infoMessage.className = 'calendar-info-message';
        infoMessage.style.gridColumn = '1 / -1';
        infoMessage.style.textAlign = 'center';
        infoMessage.style.padding = '1rem';
        infoMessage.style.color = '#666';
        infoMessage.innerHTML = '📅 Выберите конкретного мастера для просмотра дней с записями';
        dateGrid.appendChild(infoMessage);
    }
    
    // ДОБАВЛЯЕМ ЛЕГЕНДУ КАЛЕНДАРЯ
    addCalendarLegend(dateGrid);
}

// Функция для добавления легенды календаря
function addCalendarLegend(dateGrid) {
    const legendContainer = document.createElement('div');
    legendContainer.className = 'calendar-legend';
    legendContainer.style.gridColumn = '1 / -1';
    legendContainer.style.display = 'flex';
    legendContainer.style.flexWrap = 'wrap';
    legendContainer.style.justifyContent = 'center';
    legendContainer.style.gap = '1rem';
    legendContainer.style.marginTop = '1.5rem';
    legendContainer.style.padding = '1rem';
    legendContainer.style.background = '#f8f9fa';
    legendContainer.style.borderRadius = '8px';
    legendContainer.style.border = '1px solid #e9ecef';
    
    legendContainer.innerHTML = `
        <div class="legend-item">
            <div class="legend-color past-date has-appointments"></div>
            <span class="legend-text">Есть записи на эту дату</span>
        </div>
        <div class="legend-item">
            <div class="legend-color available-date"></div>
            <span class="legend-text">Доступно для добавления записей</span>
        </div>
        <div class="legend-item">
            <div class="legend-color past-date"></div>
            <span class="legend-text">Прошедшая дата</span>
        </div>
    `;
    
    dateGrid.appendChild(legendContainer);
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
    
    // Создаем HTML с кнопкой ДОБАВЛЕНИЯ ЗАПИСИ ВВЕРХУ
    let appointmentsHTML = `
        <div class="appointments-container">
            <div class="appointments-header">
                <h3 class="appointments-title">Записи на ${displayDate}${masterInfo}</h3>
                <button class="btn btn-primary add-appointment-btn" onclick="showAddAppointmentForm()">
                    ✚ Добавить запись
                </button>
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
    
    // УДАЛЯЕМ старый код добавления кнопки внизу, так как теперь она вверху
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




// Обновите функцию loadServicesForForm
async function loadServicesForForm() {
    try {
        const response = await fetch('/api/services');
        if (!response.ok) throw new Error('Ошибка загрузки услуг');
        
        const data = await response.json();
        if (data.message === 'success') {
            const select = document.querySelector('#addAppointmentForm select[name="serviceId"]');
            if (select) {
                data.data.forEach(service => {
                    const option = document.createElement('option');
                    option.value = service.id;
                    option.textContent = `${service.название} - ${service.цена} ₽`;
                    select.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Ошибка:', error);
    }
}



// Глобальные переменные для управления формой
let isAddFormOpen = false;

// Обновленная функция showAddAppointmentForm
function showAddAppointmentForm() {
    // Проверяем, выбран ли конкретный мастер
    if (!window.currentSpecialistId) {
        showConfirm('Вы выбрали "Все мастера". Пожалуйста, выберите конкретного мастера для добавления записи.', (confirmed) => {
            if (confirmed) {
                const specialistsSection = document.querySelector('.specialists-selection');
                if (specialistsSection) {
                    specialistsSection.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                    });
                }
            }
        });
        return;
    }

    if (isModalOpen) return;
    
    currentModalType = 'add';
    isModalOpen = true;
    
    const formHTML = `
        <div class="modal-overlay" id="addAppointmentModal">
            <div class="modal-dialog appointment-modal">
                <div class="modal-header">
                    <h3 class="modal-title">Добавить новую запись</h3>
                    <button class="modal-close-btn" onclick="closeAppointmentModal()">✕</button>
                </div>
                <div class="modal-body">
                    <div class="selected-master-info" style="background: #e8f5e8; padding: 10px; border-radius: 5px; margin-bottom: 1rem;">
                        <strong>Мастер:</strong> ${window.currentSpecialistName}
                    </div>
                    
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
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeAppointmentModal()">Отмена</button>
                    <button type="button" class="btn btn-primary" onclick="submitAddAppointmentForm()">Добавить запись</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', formHTML);
    loadServicesForForm();
    
    // Добавляем валидацию
    setupFormValidation('addAppointmentForm');
}
// Функция отмены добавления записи
function cancelAddAppointment() {
    const formContainer = document.getElementById('addAppointmentFormContainer');
    if (formContainer) {
        formContainer.remove();
    }
    isAddFormOpen = false;
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


// Функция выбора даты - ОБНОВЛЕННАЯ ВЕРСИЯ (без добавления кнопки внизу)
function selectDate(date, day) {
    console.log(`Selected date: ${date}`);
    window.selectedDate = date;
    
    // Закрываем открытые модальные окна
    if (isModalOpen) {
        closeAppointmentModal();
    }
    
    // Обновляем заголовок выбора
    updateSelectionHeader(window.currentSpecialistName, date);
    
    // Скрываем календарь и показываем записи
    document.getElementById('calendarSection').style.display = 'none';
    document.getElementById('appointmentsList').style.display = 'block';
    
    // Загружаем записи для выбранной даты
    loadAppointmentsForDate(date);
    
    // УДАЛЯЕМ код добавления кнопки внизу, так как теперь она добавляется автоматически в displayAppointments
    
    // Прокручиваем к списку записей
    setTimeout(() => {
        document.getElementById('appointmentsList').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }, 300);
}




// Обновленная функция showEditAppointmentForm
function showEditAppointmentForm(appointment) {
    if (isModalOpen) return;
    
    currentModalType = 'edit';
    isModalOpen = true;
    window.originalAppointmentData = appointment;
    
    // ВАЖНО: Сохраняем исходную дату сразу при открытии формы
    window.preservedDate = appointment.дата;
    console.log('Дата сохранена при открытии формы редактирования:', window.preservedDate);
    
    const formattedPhone = appointment.клиент_телефон?.replace('+7', '') || 
                          appointment.клиент_телеfono?.replace('+7', '') || '';
    
    const [hours, minutes] = appointment.время.split(':');
    
    const formHTML = `
        <div class="modal-overlay" id="editAppointmentModal">
            <div class="modal-dialog appointment-modal large-modal">
                <div class="modal-header">
                    <h3 class="modal-title">Редактировать запись</h3>
                    <button class="modal-close-btn" onclick="closeAppointmentModal()">✕</button>
                </div>
                <div class="modal-body">
                    <form id="editAppointmentForm" data-appointment-id="${appointment.id}">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Дата:</label>
                                <input type="date" class="form-control" name="date" value="${appointment.дата}" 
                                    id="editDateField" required>
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

                        <div class="current-info-section">
                            <div class="current-info-group">
                                <label>Текущий мастер:</label>
                                <div class="current-info-display">
                                    <strong>${appointment.мастер_имя}</strong>
                                    <input type="hidden" id="originalMasterId" value="${appointment.мастер_id}">
                                </div>
                            </div>
                            <button type="button" class="btn btn-outline-primary btn-sm" onclick="toggleMasterSelection()" id="toggleMasterBtn">
                                🔄 Сменить мастера
                            </button>
                            
                            <div class="form-group service-selection" id="masterSelection" style="display: none;">
                                <label>Выберите нового мастера:</label>
                                <div class="masters-selection-compact" id="mastersSelectionCompact">
                                    <div class="loading">Загрузка списка мастеров...</div>
                                </div>
                                <small style="color: #666;">Выберите мастера из списка выше</small>
                            </div>
                            
                            <div class="current-info-group">
                                <label>Текущая услуга:</label>
                                <div class="current-info-display">
                                    <strong>${appointment.услуга_название}</strong> - ${appointment.цена} ₽
                                    <input type="hidden" id="originalServiceId" value="${appointment.услуга_id}">
                                </div>
                            </div>
                            <button type="button" class="btn btn-outline-primary btn-sm" onclick="toggleServiceSelection()" id="toggleServiceBtn">
                                ✏️ Изменить услугу
                            </button>
                        </div>
                        
                        <div class="form-group service-selection" id="serviceSelection" style="display: none;">
                            <label>Выберите новую услугу:</label>
                            <select class="form-control" name="serviceId" id="serviceSelect">
                                <option value="">Выберите услугу</option>
                            </select>
                            <small style="color: #666;">Оставьте "Выберите услугу" чтобы не менять услугу</small>
                        </div>
                        
                        <div class="form-group">
                            <label>Имя клиента:</label>
                            <input type="text" class="form-control" name="clientName" value="${appointment.клиент_имя}" required>
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
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-danger" onclick="deleteAppointment(${appointment.id})">
                        Удалить запись
                    </button>
                    <div style="display: flex; gap: 0.5rem;">
                        <button type="button" class="btn btn-secondary" onclick="closeAppointmentModal()">Отмена</button>
                        <button type="button" class="btn btn-primary" onclick="submitEditAppointmentForm()">Сохранить изменения</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', formHTML);
    
    // Загружаем услуги и мастеров
    loadServicesForEditForm(appointment.услуга_id);
    loadMastersForCompactSelection(appointment.мастер_id);
    
    // Добавляем валидацию
    setupFormValidation('editAppointmentForm');
}

function closeAppointmentModal() {
    const modal = document.getElementById(currentModalType === 'add' ? 'addAppointmentModal' : 'editAppointmentModal');
    if (modal) {
        modal.remove();
    }
    isModalOpen = false;
    currentModalType = null;
    window.originalAppointmentData = null;
    
    // ВАЖНО: Очищаем все глобальные переменные связанные с выбором мастера
    if (window.selectedNewMasterId) {
        delete window.selectedNewMasterId;
    }
    if (window.preservedDate) {
        delete window.preservedDate;
    }
}


// Функции отправки форм
function submitAddAppointmentForm() {
    const form = document.getElementById('addAppointmentForm');
    if (form) {
        handleAddAppointment({ preventDefault: () => {} });
    }
}

function submitEditAppointmentForm() {
    const form = document.getElementById('editAppointmentForm');
    if (form) {
        handleEditAppointment({ preventDefault: () => {}, target: form });
    }
}

// Улучшенная функция настройки валидации формы
function setupFormValidation(formId) {
    const form = document.getElementById(formId);
    if (!form) return;

    const phoneInput = form.querySelector('input[name="clientPhone"]');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            this.value = this.value.replace(/\D/g, '');
            if (this.value.length > 10) {
                this.value = this.value.slice(0, 10);
            }
        });
    }

    const hoursInput = form.querySelector('input[name="hours"]');
    const minutesInput = form.querySelector('input[name="minutes"]');
    
    if (hoursInput) {
        hoursInput.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '');
            if (this.value > 23) this.value = 23;
            if (this.value < 0) this.value = 0;
        });
        
        hoursInput.addEventListener('blur', function() {
            if (this.value === '') this.value = 0;
            if (this.value < 10 && this.value.length === 1) {
                this.value = '0' + this.value;
            }
        });
    }
    
    if (minutesInput) {
        minutesInput.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '');
            if (this.value > 59) this.value = 59;
            if (this.value < 0) this.value = 0;
        });
        
        minutesInput.addEventListener('blur', function() {
            if (this.value === '') this.value = 0;
            if (this.value < 10 && this.value.length === 1) {
                this.value = '0' + this.value;
            }
        });
    }
}

// Функция для отладки - проверяет все поля формы
function debugFormData(formId) {
    const form = document.getElementById(formId);
    const formData = new FormData(form);
    
    console.log('=== ДЕБАГ ФОРМЫ ===');
    for (let [key, value] of formData.entries()) {
        console.log(`${key}: ${value} (тип: ${typeof value})`);
    }
    
    const hours = parseInt(formData.get('hours'));
    const minutes = parseInt(formData.get('minutes'));
    console.log(`Часы: ${hours}, Минуты: ${minutes}`);
    console.log('Валидные часы:', !isNaN(hours) && hours >= 0 && hours <= 23);
    console.log('Валидные минуты:', !isNaN(minutes) && minutes >= 0 && minutes <= 59);
    console.log('=== КОНЕЦ ДЕБАГА ===');
}

// Функция для переключения отображения выбора услуги
function toggleServiceSelection() {
    const serviceSelection = document.getElementById('serviceSelection');
    const toggleBtn = document.getElementById('toggleServiceBtn');
    
    if (serviceSelection.style.display === 'none') {
        serviceSelection.style.display = 'block';
        toggleBtn.textContent = '✖ Отменить изменение услуги';
        toggleBtn.classList.remove('btn-outline-primary');
        toggleBtn.classList.add('btn-outline-secondary');
        
        // Скрываем выбор мастера если он открыт
        const masterSelection = document.getElementById('masterSelection');
        if (masterSelection.style.display !== 'none') {
            toggleMasterSelection();
        }
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
    
    const form = document.getElementById('editAppointmentForm');
    const formData = new FormData(form);
    const appointmentId = e.target.dataset.appointmentId;
    const phoneDigits = formData.get('clientPhone');
    const hours = parseInt(formData.get('hours'));
    const minutes = parseInt(formData.get('minutes'));
    
    // ВАЖНОЕ ИСПРАВЛЕНИЕ: Всегда используем сохраненную дату при смене мастера
    let newDate;
    if (window.selectedNewMasterId && window.preservedDate) {
        // Если меняем мастера, используем сохраненную дату
        newDate = window.preservedDate;
        console.log('Используем сохраненную дату при смене мастера:', newDate);
    } else {
        // Иначе используем дату из формы
        newDate = formData.get('date');
    }
    
    // Получаем выбранную услугу из формы
    const selectedServiceId = formData.get('serviceId');
    // Получаем оригинальную услугу из скрытого поля
    const originalServiceId = document.getElementById('originalServiceId')?.value;
    
    // Получаем выбранного мастера из компактной формы
    const selectedMasterId = window.selectedNewMasterId;
    // Получаем оригинального мастера из скрытого поля
    const originalMasterId = document.getElementById('originalMasterId')?.value;
    
    // Определяем, менялась ли услуга
    const serviceChanged = selectedServiceId && selectedServiceId !== '' && selectedServiceId !== originalServiceId;
    
    // Определяем, менялся ли мастер
    const masterChanged = selectedMasterId && selectedMasterId !== originalMasterId;
    
    // Валидация
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        showError('Пожалуйста, введите корректное время');
        return;
    }
    
    if (phoneDigits.length !== 10 || !/^\d+$/.test(phoneDigits)) {
        showError('Пожалуйста, введите корректный номер телефона (10 цифр)');
        return;
    }
    
    const newTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    // Получаем текущие данные записи для сравнения
    const originalDate = window.originalAppointmentData.дата;
    const originalTime = window.originalAppointmentData.время;
    
    // Проверяем, изменились ли дата или время
    const dateChanged = originalDate !== newDate;
    const timeChanged = originalTime !== newTime;
    
    // Если мастер изменился, проверяем доступность времени у нового мастера
    if (masterChanged && (dateChanged || timeChanged)) {
        try {
            const availabilityCheck = await checkTimeAvailability(
                selectedMasterId, 
                newDate,
                newTime, 
                appointmentId
            );
            
            if (availabilityCheck && !availabilityCheck.available) {
                showError(`Время ${newTime} уже занято у выбранного мастера. Выберите другое время.`);
                return;
            }
            
        } catch (error) {
            console.error('Ошибка проверки доступности:', error);
            showInfo('Не удалось проверить доступность времени. Пожалуйста, убедитесь, что время свободно.');
        }
    }
    
    const appointmentData = {
        date: newDate,
        time: newTime,
        clientName: formData.get('clientName'),
        clientPhone: '+7' + phoneDigits
    };
    
    // Добавляем serviceId только если услуга была изменена
    if (serviceChanged) {
        appointmentData.serviceId = selectedServiceId;
    }
    
    // Если мастер изменился, отправляем отдельный запрос на смену мастера
    if (masterChanged) {
        try {
            const response = await fetch(`/api/appointment/${appointmentId}/change-master`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ newMasterId: selectedMasterId })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Ошибка смены мастера');
            }
            
            const changeMasterData = await response.json();
            console.log('Мастер успешно изменен:', changeMasterData);
            
        } catch (error) {
            console.error('Ошибка смены мастера:', error);
            showError('Не удалось сменить мастера: ' + error.message);
            return;
        }
    }
    
    // Отправляем основные изменения записи
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
            showSuccess('Запись успешно обновлена!' + (masterChanged ? ' Мастер изменен.' : ''));
            
            // Очищаем сохраненную дату
            if (window.preservedDate) {
                delete window.preservedDate;
            }
            if (window.selectedNewMasterId) {
                delete window.selectedNewMasterId;
            }
            
            // ЗАКРЫВАЕМ МОДАЛЬНОЕ ОКНО ПРИ УСПЕШНОМ ОБНОВЛЕНИИ
            closeAppointmentModal();
            
            // Обновляем данные
            loadAppointmentsForDate(window.selectedDate);
            generateCalendar();
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showError('Не удалось обновить запись: ' + error.message);
    }
}






// Функция для переключения отображения выбора мастера - ОБНОВЛЕННАЯ
function toggleMasterSelection() {
    const masterSelection = document.getElementById('masterSelection');
    const toggleBtn = document.getElementById('toggleMasterBtn');
    
    if (masterSelection.style.display === 'none') {
        masterSelection.style.display = 'block';
        toggleBtn.textContent = '✖ Отменить смену мастера';
        toggleBtn.classList.remove('btn-outline-primary');
        toggleBtn.classList.add('btn-outline-secondary');
        
        // СОХРАНЯЕМ ТЕКУЩУЮ ДАТУ ПЕРЕД ОТКРЫТИЕМ ВЫБОРА МАСТЕРА
        const dateField = document.getElementById('editDateField');
        if (dateField && dateField.value) {
            window.preservedDate = dateField.value;
            console.log('Дата сохранена при открытии выбора мастера:', window.preservedDate);
            
            // ОБНОВЛЯЕМ ЗНАЧЕНИЕ ПОЛЯ чтобы убедиться в его сохранности
            dateField.value = window.preservedDate;
        }
        
        // Скрываем выбор услуги если он открыт
        const serviceSelection = document.getElementById('serviceSelection');
        if (serviceSelection.style.display !== 'none') {
            toggleServiceSelection();
        }
    } else {
        masterSelection.style.display = 'none';
        toggleBtn.textContent = '🔄 Сменить мастера';
        toggleBtn.classList.remove('btn-outline-secondary');
        toggleBtn.classList.add('btn-outline-primary');
        
        // Сбрасываем выбор мастера при закрытии
        document.querySelectorAll('.master-option-compact').forEach(option => {
            option.classList.remove('selected');
        });
        
        // ВОССТАНАВЛИВАЕМ ДАТУ ПРИ ОТМЕНЕ СМЕНЫ МАСТЕРА
        if (window.preservedDate) {
            const dateField = document.getElementById('editDateField');
            if (dateField) {
                dateField.value = window.preservedDate;
                console.log('Дата восстановлена при отмене смены мастера:', window.preservedDate);
            }
        }
        
        // Очищаем выбор мастера при отмене
        if (window.selectedNewMasterId) {
            delete window.selectedNewMasterId;
        }
    }
}

// Функция для загрузки мастеров в компактную форму
async function loadMastersForCompactSelection(currentMasterId) {
    try {
        const response = await fetch('/api/specialists');
        if (!response.ok) throw new Error('Ошибка загрузки мастеров');
        
        const data = await response.json();
        if (data.message === 'success') {
            displayMastersForCompactSelection(data.data, currentMasterId);
        }
    } catch (error) {
        console.error('Ошибка:', error);
        document.getElementById('mastersSelectionCompact').innerHTML = 
            '<div class="error">Не удалось загрузить список мастеров</div>';
    }
}

// Функция для отображения мастеров в компактной форме
function displayMastersForCompactSelection(masters, currentMasterId) {
    const mastersContainer = document.getElementById('mastersSelectionCompact');
    
    if (!masters || masters.length === 0) {
        mastersContainer.innerHTML = '<div class="error">Нет доступных мастеров</div>';
        return;
    }

    let mastersHTML = '';
    
    masters.forEach(master => {
        const isCurrentMaster = parseInt(master.id) === parseInt(currentMasterId);
        const imageUrl = master.фото || 'photo/работники/default.jpg';
        
        mastersHTML += `
            <div class="master-option-compact ${isCurrentMaster ? 'current' : ''}" 
                 data-master-id="${master.id}" 
                 onclick="${isCurrentMaster ? '' : `selectMasterOption(${master.id})`}">
                <div class="master-option-image" style="background-image: url('${imageUrl}')"></div>
                <div class="master-option-info">
                    <h5>
                        ${master.имя} 
                        ${isCurrentMaster ? '<span class="current-badge-compact">(текущий)</span>' : ''}
                    </h5>
                    <p>${master.описание || 'Профессиональный мастер'}</p>
                </div>
            </div>
        `;
    });
    
    mastersContainer.innerHTML = mastersHTML;
}


function selectMasterOption(masterId) {
    // Снимаем выделение со всех опций
    document.querySelectorAll('.master-option-compact').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Выделяем выбранную опцию
    const selectedOption = document.querySelector(`[data-master-id="${masterId}"]`);
    if (selectedOption) {
        selectedOption.classList.add('selected');
    }
    
    // Сохраняем выбранного мастера в глобальной переменной
    window.selectedNewMasterId = masterId;
    
    // ВАЖНО: Сохраняем текущую дату из формы редактирования
    const dateField = document.getElementById('editDateField');
    if (dateField && dateField.value) {
        window.preservedDate = dateField.value;
        console.log('Дата сохранена при выборе мастера:', window.preservedDate);
        
        // Блокируем поле даты
        dateField.readOnly = true;
        dateField.title = "Дата заблокирована при смене мастера";
        dateField.style.backgroundColor = '#f8f9fa';
        dateField.style.cursor = 'not-allowed';
        
        // ОБНОВЛЯЕМ ЗНАЧЕНИЕ ПОЛЯ ДАТЫ, чтобы оно точно сохранилось
        dateField.value = window.preservedDate;
    }
}


// Исправленная функция handleAddAppointment
async function handleAddAppointment(e) {
    e.preventDefault();
    
    const form = document.getElementById('addAppointmentForm');
    const formData = new FormData(form);
    const phoneDigits = formData.get('clientPhone');
    const hours = parseInt(formData.get('hours'));
    const minutes = parseInt(formData.get('minutes'));
    const date = formData.get('date');

    // УЛУЧШЕННАЯ ВАЛИДАЦИЯ ВРЕМЕНИ
    if (isNaN(hours) || isNaN(minutes)) {
        showError('Пожалуйста, введите корректное время (числа)');
        return;
    }
    
    if (hours < 0 || hours > 23) {
        showError('Часы должны быть от 0 до 23');
        return;
    }
    
    if (minutes < 0 || minutes > 59) {
        showError('Минуты должны быть от 0 до 59');
        return;
    }

    // Форматируем время в формат HH:MM
    const time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    // Валидация телефона
    if (!phoneDigits || phoneDigits.length !== 10 || !/^\d+$/.test(phoneDigits)) {
        showError('Пожалуйста, введите корректный номер телефона (10 цифр)');
        return;
    }
    
    // Проверка выбора услуги
    const serviceId = formData.get('serviceId');
    if (!serviceId) {
        showError('Пожалуйста, выберите услугу');
        return;
    }
    
    console.log('Данные для отправки:', {
        specialistId: window.currentSpecialistId,
        serviceId: serviceId,
        date: date,
        time: time,
        clientName: formData.get('clientName'),
        clientPhone: '+7' + phoneDigits
    });

    // Проверка доступности времени (опционально, можно закомментировать для тестирования)
    try {
        const availabilityCheck = await checkTimeAvailability(
            window.currentSpecialistId, 
            date,
            time,
            null
        );
        
        if (availabilityCheck && !availabilityCheck.available) {
            showError(`Время ${time} уже занято. Выберите другое время.`);
            return;
        }
    } catch (error) {
        console.error('Ошибка проверки доступности:', error);
        // Продолжаем без блокировки, но с предупреждением
        showInfo('Не удалось проверить доступность времени. Пожалуйста, убедитесь, что время свободно.');
    }
    
    const appointmentData = {
        specialistId: window.currentSpecialistId,
        serviceId: serviceId,
        date: date,
        time: time,
        clientName: formData.get('clientName'),
        clientPhone: '+7' + phoneDigits
    };
    
    try {
        console.log('Отправка данных на сервер:', appointmentData);
        
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
            closeAppointmentModal();
            loadAppointmentsForDate(window.selectedDate);
            generateCalendar();
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showError('Не удалось добавить запись: ' + error.message);
    }
}
// Улучшенная функция для проверки доступности времени
async function checkTimeAvailability(specialistId, date, time, excludeAppointmentId = null) {
    try {
        const params = new URLSearchParams({
            specialistId: specialistId,
            date: date,
            time: time
        });
        
        if (excludeAppointmentId) {
            params.append('excludeAppointmentId', excludeAppointmentId);
        }
        
        console.log('Проверка доступности времени:', { specialistId, date, time, excludeAppointmentId });
        
        const response = await fetch(`/api/check-time-availability?${params}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Результат проверки:', data);
        return data;
    } catch (error) {
        console.error('Ошибка проверки доступности времени:', error);
        // В случае ошибки считаем время доступным, чтобы не блокировать пользователя
        return { available: true, conflictingAppointments: 0 };
    }
}
// Добавьте эту функцию для показа загрузки при проверке
async function checkTimeAvailabilityWithLoading(specialistId, date, time, excludeAppointmentId = null) {
    // Показываем индикатор загрузки
    const submitBtn = document.querySelector('#editAppointmentForm button[type="submit"]') || 
                     document.querySelector('#addAppointmentForm button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Проверка времени...';
    submitBtn.disabled = true;
    
    try {
        const result = await checkTimeAvailability(specialistId, date, time, excludeAppointmentId);
        return result;
    } finally {
        // Восстанавливаем кнопку
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
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



function hideAdminModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Закрытие модальных окон по клику вне их области
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        hideAdminModal(e.target.id);
    }
});

// Закрытие по ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(modal => {
            if (modal.style.display === 'block') {
                hideAdminModal(modal.id);
            }
        });
    }
});

// Функции-обертки для удобства
function showSuccess(message) {
    showAdminModal('success', message);
}

function showError(message) {
    showAdminModal('error', message);
}

function showInfo(message) {
    showAdminModal('info', message);
}

function showConfirm(message, callback) {
    showAdminModal('confirm', message, callback);
}


// Обновленная функция showAdminModal с уникальными классами
function showAdminModal(type, message, callback = null) {
    const modal = document.getElementById(type + 'Modal');
    const messageElement = document.getElementById(type + 'Message');
    
    if (modal && messageElement) {
        messageElement.textContent = message;
        modal.style.display = 'block';
        
        // Устанавливаем SVG иконки для разных типов модальных окон
        const iconContainer = modal.querySelector('.admin-modal-icon');
        if (iconContainer) {
            let svgIcon = '';
            
            switch(type) {
                case 'success':
                    svgIcon = `
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    `;
                    break;
                case 'error':
                    svgIcon = `
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    `;
                    break;
                case 'info':
                    svgIcon = `
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    `;
                    break;
                case 'confirm':
                    svgIcon = `
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    `;
                    break;
            }
            
            iconContainer.innerHTML = svgIcon;
        }
        
        if (type === 'confirm' && callback) {
            const confirmYes = document.getElementById('confirmYes').cloneNode(true);
            document.getElementById('confirmYes').replaceWith(confirmYes);
            
            const confirmNo = document.querySelector('#confirmModal .admin-modal-btn-secondary');
            if (confirmNo) {
                const newConfirmNo = confirmNo.cloneNode(true);
                confirmNo.replaceWith(newConfirmNo);
                
                newConfirmNo.onclick = () => {
                    hideAdminModal('confirmModal');
                    callback(false);
                };
            }
            
            confirmYes.onclick = () => {
                hideAdminModal('confirmModal');
                callback(true);
            };
        }
    }
}

function hideAdminModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Закрытие модальных окон по клику вне их области
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('admin-modal-overlay')) {
        hideAdminModal(e.target.id);
    }
});

// Закрытие по ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.admin-modal-overlay');
        modals.forEach(modal => {
            if (modal.style.display === 'block') {
                hideAdminModal(modal.id);
            }
        });
    }
});

// Функции-обертки для удобства
function showSuccess(message) {
    showAdminModal('success', message);
}

function showError(message) {
    showAdminModal('error', message);
}

function showInfo(message) {
    showAdminModal('info', message);
}

function showConfirm(message, callback) {
    showAdminModal('confirm', message, callback);
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

// Инициализация модальных окон при загрузке
document.addEventListener('DOMContentLoaded', function() {
    // Скрываем все модальные окна при загрузке
    const modals = document.querySelectorAll('.admin-modal-overlay');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
});




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


// Обновленная функция генерации элементов истории для мобильных
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
        
        const masterId = appointment.мастер_id || appointment.masterId;
        
        // Определяем, мобильное ли устройство
        const isMobile = window.innerWidth <= 768;
        
        return `
            <div class="history-item ${isNew ? 'new-item' : ''}" data-appointment-id="${appointment.id}">
                <div class="history-item-header">
                    <div class="history-date">
                        <strong>${appointment.дата} ${appointment.время}</strong>
                        ${isNew ? '<span class="new-badge">NEW</span>' : ''}
                    </div>
                    <div class="history-created">
                        Создано: ${createdDate.toLocaleString('ru-RU')}
                    </div>
                </div>
                
                <div class="history-item-content">
                    <div class="history-detail">
                        <span class="detail-label">Мастер:</span>
                        <span class="detail-value">${appointment.мастер_имя}</span>
                    </div>
                    <div class="history-detail">
                        <span class="detail-label">Услуга:</span>
                        <span class="detail-value">${appointment.услуга_название}</span>
                    </div>
                    <div class="history-detail">
                        <span class="detail-label">Цена:</span>
                        <span class="detail-value">${appointment.цена} ₽</span>
                    </div>
                    <div class="history-detail">
                        <span class="detail-label">Клиент:</span>
                        <span class="detail-value">${appointment.клиент_имя}</span>
                    </div>
                    <div class="history-detail">
                        <span class="detail-label">Телефон:</span>
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