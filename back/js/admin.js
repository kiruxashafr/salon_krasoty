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
    let currentActiveSection = 'journal'; // По умолчанию активен журнал

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
    function loadSection(sectionName) {
        if (window.innerWidth < 768) {
            showLoading();
        }
        
        // Обновляем активный пункт меню
        updateActiveMenu(sectionName);
        currentActiveSection = sectionName;

        // Обновляем заголовок
        const sectionTitle = Array.from(menuLinks).find(link => 
            link.dataset.section === sectionName
        ).textContent;
        currentSection.textContent = sectionTitle;

        // Загружаем контент в зависимости от раздела
        switch(sectionName) {
            case 'journal':
                loadJournalContent();
                break;
            case 'schedule':
                contentContainer.innerHTML = '<p>Раздел "Расписание" в разработке</p>';
                break;
            case 'specialists':
                contentContainer.innerHTML = '<p>Раздел "Мастера" в разработке</p>';
                break;
            case 'services':
                contentContainer.innerHTML = '<p>Раздел "Услуги" в разработке</p>';
                break;
            case 'clients':
                contentContainer.innerHTML = '<p>Раздел "Клиенты" в разработке</p>';
                break;
            case 'settings':
                contentContainer.innerHTML = '<p>Раздел "Настройки" в разработке</p>';
                break;
            default:
                contentContainer.innerHTML = '<p>Раздел не найден</p>';
        }
    }

    // Обработчики событий для меню
    menuLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.dataset.section;
            if (section) {
                loadSection(section);
                // Всегда закрываем меню на мобильных после выбора раздела
                if (window.innerWidth < 768 && isMenuOpen) {
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
                <div class="specialists-selection">
                    <h2>Выберите мастера</h2>
                    <div class="specialists-list" id="specialistsList">
                        <!-- Мастера будут загружены динамически -->
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
                    <table id="appointmentsTable">
                        <thead>
                            <tr>
                                <th>Время</th>
                                <th>Клиент</th>
                                <th>Телефон</th>
                                <th>Услуга</th>
                                <th>Цена</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- Данные будут загружены динамически -->
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        // Загружаем список мастеров
        loadSpecialistsForJournal();
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
        
        // Показываем выбранного мастера
        document.querySelectorAll('.specialist-card-admin').forEach(card => {
            card.classList.remove('selected');
        });
        document.querySelector(`[data-specialist-id="${specialistId}"]`).classList.add('selected');
        
        // Показываем календарь
        document.getElementById('calendarSection').style.display = 'block';
        
        // Инициализируем календарь
        initCalendar();
    }

    // Обработчики событий
    menuToggle.addEventListener('click', toggleMenu);

    menuLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.dataset.section;
            if (section) {
                loadSection(section);
                if (window.innerWidth < 768) {
                    toggleMenu(); // Закрываем меню на мобильных устройствах
                }
            }
        });
    });

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
async function loadAppointmentDays(year, month) {
    if (!window.currentSpecialistId) return {};
    
    const startDate = `${year}-${(month + 1).toString().padStart(2, '0')}-01`;
    const endDate = `${year}-${(month + 1).toString().padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`;
    
    try {
        const response = await fetch(`/api/appointments?specialistId=${window.currentSpecialistId}&startDate=${startDate}&endDate=${endDate}`);
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
        } 
        // Проверяем, есть ли записи на эту дату
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
    
    // Добавляем кнопку для добавления записи (если её ещё нет)
    if (!document.querySelector('.add-appointment-btn')) {
        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn-primary add-appointment-btn';
        addBtn.textContent = '✚ Добавить запись';
        addBtn.onclick = showAddAppointmentForm;
        appointmentsList.querySelector('h3').after(addBtn);
    }
}

function loadAppointmentsForDate(date) {
    if (!window.currentSpecialistId) return;
    
    // Обновляем заголовок (на случай перезагрузки)
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
    
    fetch(`/api/appointments?specialistId=${window.currentSpecialistId}&date=${date}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Ошибка загрузки записей');
            }
            return response.json();
        })
        .then(data => {
            if (data.message === 'success') {
                displayAppointments(data.data);
            }
        })
        .catch(error => {
            console.error('Ошибка:', error);
            showError('Не удалось загрузить записи');
        });
}

function displayAppointments(appointments) {
    const tbody = document.querySelector('#appointmentsTable tbody');
    tbody.innerHTML = '';

    if (appointments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #666;">Нет записей на эту дату</td></tr>';
        return;
    }

    const isMobile = window.innerWidth < 768;

    appointments.forEach(appointment => {
        const row = document.createElement('tr');
        
        if (isMobile) {
            // Мобильная версия - улучшенное отображение
            row.innerHTML = `
                <td data-label="Время">${appointment.время}</td>
                <td data-label="Клиент">${appointment.клиент_имя}</td>
                <td data-label="Телефон">${appointment.клиент_телефон}</td>
                <td data-label="Услуга">${appointment.услуга_название}</td>
                <td data-label="Цена">${appointment.цена} ₽</td>
                <td data-label="Действия">
                    <button class="btn btn-sm btn-danger" onclick="cancelAppointment(${appointment.id})">
                        ╳ Отменить
                    </button>
                </td>
            `;
        } else {
            // Десктопная версия
            row.innerHTML = `
                <td><strong>${appointment.время}</strong></td>
                <td>${appointment.клиент_имя}</td>
                <td>${appointment.клиент_телефон}</td>
                <td>${appointment.услуга_название}</td>
                <td><strong>${appointment.цена} ₽</strong></td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="cancelAppointment(${appointment.id})">
                        Отменить
                    </button>
                </td>
            `;
        }
        
        tbody.appendChild(row);
    });
}


function cancelAppointment(appointmentId) {
    if (confirm('Вы уверены, что хотите отменить эту запись?')) {
        fetch(`/api/appointments/${appointmentId}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Ошибка отмены записи');
            }
            return response.json();
        })
        .then(data => {
            if (data.message === 'success') {
                alert('Запись успешно отменена');
                // Перезагружаем записи для текущей даты
                loadAppointmentsForDate(window.selectedDate);
            }
        })
        .catch(error => {
            console.error('Ошибка:', error);
            alert('Не удалось отменить запись');
        });
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
        alert('Пожалуйста, введите корректное время');
        return;
    }
    
    // Форматируем время в формат HH:MM
    const time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    // Валидация телефона
    if (phoneDigits.length !== 10 || !/^\d+$/.test(phoneDigits)) {
        alert('Пожалуйста, введите корректный номер телефона (10 цифр)');
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
            alert('Запись успешно добавлена!');
            // Закрываем форму
            cancelAddAppointment();
            // Перезагружаем записи
            loadAppointmentsForDate(window.selectedDate);
            // Обновляем календарь
            generateCalendar();
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Не удалось добавить запись: ' + error.message);
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

// Обновленная функция selectDate
function selectDate(date, day) {
    console.log(`Selected date: ${date}`);
    window.selectedDate = date;
    
    // Показываем список записей
    const appointmentsList = document.getElementById('appointmentsList');
    appointmentsList.style.display = 'block';
    
    // Очищаем предыдущую форму
    const existingForm = document.querySelector('.add-appointment-form');
    if (existingForm) existingForm.remove();
    isAddFormOpen = false;
    
    // Загружаем записи на выбранную дату
    loadAppointmentsForDate(date);
    
    // Добавляем кнопку для добавления записи (если её ещё нет)
    if (!document.querySelector('.add-appointment-btn')) {
        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn-primary add-appointment-btn';
        addBtn.textContent = '✚ Добавить запись';
        addBtn.onclick = showAddAppointmentForm;
        appointmentsList.querySelector('h3').after(addBtn);
    }
}