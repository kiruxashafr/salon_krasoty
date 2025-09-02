document.addEventListener('DOMContentLoaded', function() {
    // Элементы DOM
    const menuToggle = document.getElementById('menuToggle');
    const mainMenu = document.getElementById('mainMenu');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const menuLinks = document.querySelectorAll('.main-menu a');
    const contentContainer = document.getElementById('contentContainer');
    const currentSection = document.getElementById('currentSection');

    // Переменные состояния
    let isMenuOpen = false;

    // Функция переключения меню
    function toggleMenu() {
        isMenuOpen = !isMenuOpen;
        sidebar.classList.toggle('open', isMenuOpen);
        mainContent.classList.toggle('expanded', isMenuOpen);
    }

    // Функция загрузки контента раздела
    function loadSection(sectionName) {
        // Обновляем активную ссылку в меню
        menuLinks.forEach(link => {
            link.classList.remove('active');
            if (link.dataset.section === sectionName) {
                link.classList.add('active');
            }
        });

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
        fetch('http://localhost:3000/api/specialists')
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

function generateCalendar() {
    const dateGrid = document.getElementById('dateGrid');
    const currentMonthElement = document.getElementById('currentMonth');
    
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
        } else {
            dateCell.classList.add('available-date');
            dateCell.textContent = day;
            dateCell.onclick = () => selectDate(formattedDate, day);
            dateCell.title = 'Посмотреть записи';
        }
        
        dateGrid.appendChild(dateCell);
    }
}

function selectDate(date, day) {
    console.log(`Selected date: ${date}`);
    window.selectedDate = date;
    
    // Показываем список записей
    document.getElementById('appointmentsList').style.display = 'block';
    
    // Загружаем записи на выбранную дату
    loadAppointmentsForDate(date);
}

function loadAppointmentsForDate(date) {
    if (!window.currentSpecialistId) return;
    
    fetch(`http://localhost:3000/api/appointments?specialistId=${window.currentSpecialistId}&date=${date}`)
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
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Нет записей на эту дату</td></tr>';
        return;
    }

    appointments.forEach(appointment => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${appointment.время}</td>
            <td>${appointment.клиент_имя}</td>
            <td>${appointment.клиент_телефон}</td>
            <td>${appointment.услуга_название}</td>
            <td>${appointment.цена} ₽</td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="cancelAppointment(${appointment.id})">
                    Отменить
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function cancelAppointment(appointmentId) {
    if (confirm('Вы уверены, что хотите отменить эту запись?')) {
        fetch(`http://localhost:3000/api/appointments/${appointmentId}`, {
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