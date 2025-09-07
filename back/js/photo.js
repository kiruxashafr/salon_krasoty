// photo.js
class PhotoScheduleGenerator {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.specialists = []; // Добавляем массив для хранения мастеров
        this.init();
    }

    async init() {
        await this.loadSpecialists(); // Load data into this.specialists
        this.createModal();
    }

    async loadSpecialists() {
        try {
            const response = await fetch('/api/specialists');
            if (response.ok) {
                const data = await response.json();
                if (data.message === 'success') {
                    this.specialists = data.data;
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки мастеров:', error);
        }
    }

    createModal() {
        const modalHTML = `
            <div id="photoModal" class="photo-modal" style="display: none;">
                <div class="photo-modal-content">
                    <div class="photo-modal-header">
                        <h3>Создать фото расписания</h3>
                        <button class="photo-modal-close">&times;</button>
                    </div>
                    <div class="photo-modal-body">
                        <div class="photo-form-group">
                            <label>Тип расписания:</label>
                            <select id="photoScheduleType" class="photo-form-control">
                                <option value="appointments">Расписание записей</option>
                                <option value="freetime">Расписание свободного времени</option>
                            </select>
                        </div>
                        
                        <div class="photo-form-group">
                            <label>Дата начала:</label>
                            <input type="date" id="photoStartDate" class="photo-form-control">
                        </div>
                        
                        <div class="photo-form-group">
                            <label>Дата окончания:</label>
                            <input type="date" id="photoEndDate" class="photo-form-control">
                        </div>
                        
                        <div class="photo-form-group">
                            <label>Мастер:</label>
                            <select id="photoSpecialist" class="photo-form-control">
                                <option value="all">Все мастера</option>
                            </select>
                        </div>
                    </div>
                    <div class="photo-modal-footer">
                        <button id="photoGenerateBtn" class="btn btn-primary">Создать фото</button>
                        <button id="photoCancelBtn" class="btn btn-secondary">Отмена</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Закрытие модального окна
        document.querySelector('.photo-modal-close').addEventListener('click', () => {
            this.hideModal();
        });

        document.getElementById('photoCancelBtn').addEventListener('click', () => {
            this.hideModal();
        });

        // Генерация фото
        document.getElementById('photoGenerateBtn').addEventListener('click', () => {
            this.generatePhoto();
        });

        // Клик вне модального окна
        document.getElementById('photoModal').addEventListener('click', (e) => {
            if (e.target.id === 'photoModal') {
                this.hideModal();
            }
        });
    }

    async showModal() {
        const today = new Date();
        const endDate = new Date(today);
        endDate.setDate(today.getDate() + 6);
        
        document.getElementById('photoStartDate').value = today.toISOString().split('T')[0];
        document.getElementById('photoEndDate').value = endDate.toISOString().split('T')[0];

        // Populate the select using pre-loaded data
        this.populateSpecialistSelect();

        document.getElementById('photoModal').style.display = 'block';
    }

    hideModal() {
        document.getElementById('photoModal').style.display = 'none';
    }

    populateSpecialistSelect() {
        const select = document.getElementById('photoSpecialist');
        // Clear existing options except the first one
        while (select.options.length > 1) {
            select.remove(1);
        }
        this.specialists.forEach(specialist => {
            const option = document.createElement('option');
            option.value = specialist.id;
            option.textContent = specialist.имя;
            select.appendChild(option);
        });
    }

    async generatePhoto() {
        const type = document.getElementById('photoScheduleType').value;
        const startDate = document.getElementById('photoStartDate').value;
        const endDate = document.getElementById('photoEndDate').value;
        const specialistId = document.getElementById('photoSpecialist').value;

        if (!startDate || !endDate) {
            alert('Пожалуйста, выберите диапазон дат');
            return;
        }

        try {
            // Показываем индикатор загрузки
            const generateBtn = document.getElementById('photoGenerateBtn');
            const originalText = generateBtn.textContent;
            generateBtn.textContent = 'Загрузка...';
            generateBtn.disabled = true;

            let data;
            if (type === 'appointments') {
                data = await this.loadAppointments(startDate, endDate, specialistId);
            } else {
                data = await this.loadFreeTime(startDate, endDate, specialistId);
            }

            // Генерируем изображение
            await this.createImage(data, type, startDate, endDate, specialistId);

            generateBtn.textContent = originalText;
            generateBtn.disabled = false;
            this.hideModal();

        } catch (error) {
            console.error('Ошибка генерации фото:', error);
            alert('Ошибка при создании фото. Попробуйте еще раз.');
            
            const generateBtn = document.getElementById('photoGenerateBtn');
            generateBtn.textContent = 'Создать фото';
            generateBtn.disabled = false;
        }
    }

    async loadAppointments(startDate, endDate, specialistId) {
        let url = `/api/appointments?startDate=${startDate}&endDate=${endDate}`;
        if (specialistId !== 'all') {
            url += `&specialistId=${specialistId}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('Ошибка загрузки записей');
        
        const data = await response.json();
        return data.message === 'success' ? data.data : [];
    }

    async loadFreeTime(startDate, endDate, specialistId) {
        let url = `/api/schedule-available?startDate=${startDate}&endDate=${endDate}`;
        if (specialistId !== 'all') {
            url += `&specialistId=${specialistId}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('Ошибка загрузки свободного времени');
        
        const data = await response.json();
        return data.message === 'success' ? data.data : [];
    }

    async createImage(data, type, startDate, endDate, specialistId) {
        this.canvas.width = 1200;
        this.canvas.height = 800;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.applyStyle();
        this.drawBackground();
        this.drawHeader(type, startDate, endDate, specialistId);

        // Рисуем данные с группировкой по дням
        if (type === 'appointments') {
            this.drawAppointmentsWithDays(data, specialistId);
        } else {
            this.drawFreeTimeWithDays(data, specialistId);
        }

        this.drawFooter();
        this.downloadImage();
    }

    applyStyle() {
        this.styles = {
            background: '#ffffff',
            primaryColor: '#2c3e50',
            secondaryColor: '#34495e',
            accentColor: '#e74c3c',
            textColor: '#2c3e50',
            lightText: '#7f8c8d',
            borderColor: '#bdc3c7'
        };
    }

    drawBackground() {
        this.ctx.fillStyle = this.styles.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Добавляем легкий градиент
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, 0);
        gradient.addColorStop(0, 'rgba(255,255,255,0.1)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawHeader(type, startDate, endDate, specialistId) {
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        
        // Определяем, выбран ли один день
        const isSingleDay = startDate === endDate;
        
        let dateText;
        if (isSingleDay) {
            // Для одного дня: только дата без года
            dateText = startDateObj.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long'
            });
        } else {
            // Для диапазона дат: период без года
            const formattedStartDate = startDateObj.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long'
            });
            
            const formattedEndDate = endDateObj.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long'
            });
            
            dateText = `С ${formattedStartDate} ПО ${formattedEndDate}`;
        }

        // Получаем имя мастера, если выбран конкретный
        let masterName = 'ВСЕ МАСТЕРА';
        if (specialistId !== 'all') {
            const selectedMaster = this.specialists.find(m => m.id == specialistId);
            if (selectedMaster) {
                masterName = selectedMaster.имя.toUpperCase();
            }
        }

        // Заголовок
        this.ctx.fillStyle = this.styles.primaryColor;
        this.ctx.font = 'bold 36px "Arial", sans-serif';
        this.ctx.textAlign = 'center';
        
        const headerText = type === 'appointments' ? 'РАСПИСАНИЕ ЗАПИСЕЙ' : 'СВОБОДНОЕ ВРЕМЯ';
        this.ctx.fillText(headerText.toUpperCase(), this.canvas.width / 2, 60);

        // Период дат
        this.ctx.fillStyle = this.styles.secondaryColor;
        this.ctx.font = 'bold 24px "Arial", sans-serif';
        this.ctx.fillText(dateText.toUpperCase(), this.canvas.width / 2, 100);

        // Мастер
        this.ctx.fillStyle = this.styles.lightText;
        this.ctx.font = '20px "Arial", sans-serif';
        this.ctx.fillText(masterName, this.canvas.width / 2, 140);

        // Разделительная линия
        this.ctx.strokeStyle = this.styles.borderColor;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(50, 170);
        this.ctx.lineTo(this.canvas.width - 50, 170);
        this.ctx.stroke();
    }

    drawAppointments(appointments) {
        if (appointments.length === 0) {
            this.drawNoData('ЗАПИСЕЙ НА ВЫБРАННЫЙ ПЕРИОД НЕТ');
            return;
        }

        // Сортируем записи по дате и времени
        appointments.sort((a, b) => {
            const dateCompare = a.дата.localeCompare(b.дата);
            return dateCompare !== 0 ? dateCompare : a.время.localeCompare(b.время);
        });

        const startY = 200;
        const rowHeight = 60;
        const maxRows = Math.min(8, appointments.length);

        // Заголовки колонок
        this.ctx.fillStyle = this.styles.secondaryColor;
        this.ctx.font = 'bold 18px "Arial", sans-serif';
        this.ctx.textAlign = 'left';
        
        this.ctx.fillText('ВРЕМЯ', 50, startY - 10);
        this.ctx.fillText('КЛИЕНТ', 150, startY - 10);
        this.ctx.fillText('УСЛУГА', 500, startY - 10);
        this.ctx.fillText('МАСТЕР', 800, startY - 10);
        this.ctx.fillText('ЦЕНА', 1050, startY - 10);

        // Данные
        appointments.slice(0, maxRows).forEach((appointment, index) => {
            const y = startY + (index * rowHeight);
            
            // Фон строки
            this.ctx.fillStyle = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
            this.ctx.fillRect(40, y - 25, this.canvas.width - 80, rowHeight - 10);

            // Время (только часы:минуты)
            const time = appointment.время.split(':').slice(0, 2).join(':');
            this.ctx.fillStyle = this.styles.primaryColor;
            this.ctx.font = 'bold 16px "Arial", sans-serif';
            this.ctx.fillText(time, 50, y);

            // Клиент
            this.ctx.fillStyle = this.styles.textColor;
            this.ctx.font = '16px "Arial", sans-serif';
            this.ctx.fillText(appointment.клиент_имя, 150, y);
            this.ctx.fillStyle = this.styles.lightText;
            this.ctx.font = '14px "Arial", sans-serif';
            this.ctx.fillText(appointment.клиент_телефон, 150, y + 20);

            // Услуга
            this.ctx.fillStyle = this.styles.textColor;
            this.ctx.font = '16px "Arial", sans-serif';
            this.ctx.fillText(appointment.услуга_название, 500, y);

            // Мастер (всегда показываем имя мастера)
            this.ctx.fillStyle = this.styles.textColor;
            this.ctx.font = '16px "Arial", sans-serif';
            this.ctx.fillText(appointment.мастер_имя, 800, y);

            // Цена
            this.ctx.fillStyle = this.styles.accentColor;
            this.ctx.font = 'bold 16px "Arial", sans-serif';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(`${appointment.цена} ₽`, this.canvas.width - 50, y);
            this.ctx.textAlign = 'left';
        });

        if (appointments.length > maxRows) {
            this.ctx.fillStyle = this.styles.lightText;
            this.ctx.font = '14px "Arial", sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                `... И ЕЩЕ ${appointments.length - maxRows} ЗАПИСЕЙ`.toUpperCase(), 
                this.canvas.width / 2, 
                startY + (maxRows * rowHeight) + 20
            );
        }
    }
    drawAppointmentsWithDays(appointments, specialistId) {
        if (appointments.length === 0) {
            this.drawNoData('ЗАПИСЕЙ НА ВЫБРАННЫЙ ПЕРИОД НЕТ');
            return;
        }

        // Определяем, нужно ли показывать колонку мастера
        const showMasterColumn = specialistId === 'all';

        // Группируем записи по датам
        const groupedByDate = {};
        appointments.forEach(appointment => {
            if (!groupedByDate[appointment.дата]) {
                groupedByDate[appointment.дата] = [];
            }
            groupedByDate[appointment.дата].push(appointment);
        });

        const dates = Object.keys(groupedByDate).sort();
        const startY = 200;
        const rowHeight = 60;
        let currentY = startY;

        // Заголовки колонок
        this.drawColumnHeaders(currentY, showMasterColumn);
        currentY += 40;

        dates.forEach(date => {
            // Рисуем заголовок дня
            const dateObj = new Date(date);
            const formattedDate = dateObj.toLocaleDateString('ru-RU', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
            }).toUpperCase();
            
            this.ctx.fillStyle = this.styles.secondaryColor;
            this.ctx.font = 'bold 20px "Arial", sans-serif';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(formattedDate, 50, currentY);
            
            currentY += 30;

            // Рисуем записи для этого дня
            const dayAppointments = groupedByDate[date];
            dayAppointments.sort((a, b) => a.время.localeCompare(b.время));
            
            dayAppointments.forEach((appointment, index) => {
                if (currentY > this.canvas.height - 100) return; // Не выходим за пределы canvas
                
                // Фон строки
                this.ctx.fillStyle = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
                this.ctx.fillRect(40, currentY - 25, this.canvas.width - 80, rowHeight - 10);

                // Данные записи
                this.drawAppointmentRow(appointment, currentY, showMasterColumn);
                currentY += rowHeight;
            });

            currentY += 20; // Отступ между днями
        });
    }



drawAppointmentRow(appointment, y, showMasterColumn = true) {
    // Время
    const time = appointment.время.split(':').slice(0, 2).join(':');
    this.ctx.fillStyle = this.styles.primaryColor;
    this.ctx.font = 'bold 16px "Arial", sans-serif';
    this.ctx.fillText(time, 50, y);

    // Клиент
    this.ctx.fillStyle = this.styles.textColor;
    this.ctx.font = '16px "Arial", sans-serif';
    this.ctx.fillText(appointment.клиент_имя, 150, y);
    this.ctx.fillStyle = this.styles.lightText;
    this.ctx.font = '14px "Arial", sans-serif';
    this.ctx.fillText(appointment.клиент_телефон, 150, y + 20);

    // Услуга
    this.ctx.fillStyle = this.styles.textColor;
    this.ctx.font = '16px "Arial", sans-serif';
    
    // Если не показываем колонку мастера, расширяем колонку услуги
    if (!showMasterColumn) {
        this.ctx.fillText(appointment.услуга_название, 500, y);
    } else {
        this.ctx.fillText(appointment.услуга_название, 500, y);
        
        // Мастер
        this.ctx.fillStyle = this.styles.textColor;
        this.ctx.font = '16px "Arial", sans-serif';
        this.ctx.fillText(appointment.мастер_имя, 800, y);
    }

    // Цена - выравниваем по правому краю колонки
    this.ctx.fillStyle = this.styles.accentColor;
    this.ctx.font = 'bold 16px "Arial", sans-serif';
    this.ctx.textAlign = 'right';
    
    // Определяем позицию для цены в зависимости от того, показываем ли мастера
    const priceX = showMasterColumn ? 1050 : 950;
    this.ctx.fillText(`${appointment.цена} ₽`, priceX, y);
    
    this.ctx.textAlign = 'left';
}

drawFreeTimeRow(item, y, showMasterColumn = true) {
    // Время
    const time = item.время.split(':').slice(0, 2).join(':');
    this.ctx.fillStyle = this.styles.primaryColor;
    this.ctx.font = 'bold 16px "Arial", sans-serif';
    this.ctx.fillText(time, 50, y);

    // Мастер (только если показываем колонку)
    if (showMasterColumn) {
        this.ctx.fillStyle = this.styles.textColor;
        this.ctx.font = '16px "Arial", sans-serif';
        this.ctx.fillText(item.мастер_имя, 150, y);
        
        // Услуга (с правильной позицией)
        this.ctx.fillStyle = this.styles.textColor;
        this.ctx.font = '16px "Arial", sans-serif';
        this.ctx.fillText(item.услуга_название, 500, y);
    } else {
        // Если мастера не показываем, услуга идет сразу после времени
        this.ctx.fillStyle = this.styles.textColor;
        this.ctx.font = '16px "Arial", sans-serif';
        this.ctx.fillText(item.услуга_название, 150, y);
    }

    // Цена - выравниваем по правому краю колонки
    this.ctx.fillStyle = this.styles.accentColor;
    this.ctx.font = 'bold 16px "Arial", sans-serif';
    this.ctx.textAlign = 'right';
    
    // Определяем позицию для цены в зависимости от того, показываем ли мастера
    const priceX = showMasterColumn ? 950 : 800;
    this.ctx.fillText(`${item.услуга_цена} ₽`, priceX, y);
    
    this.ctx.textAlign = 'left';
}

    drawFreeTimeWithDays(freeTime, specialistId) {
        if (freeTime.length === 0) {
            this.drawNoData('СВОБОДНОГО ВРЕМЕНИ НА ВЫБРАННЫЙ ПЕРИОД НЕТ');
            return;
        }

        // Определяем, нужно ли показывать колонку мастера
        const showMasterColumn = specialistId === 'all';

        // Группируем по датам
        const groupedByDate = {};
        freeTime.forEach(item => {
            if (!groupedByDate[item.дата]) {
                groupedByDate[item.дата] = [];
            }
            groupedByDate[item.дата].push(item);
        });

        const dates = Object.keys(groupedByDate).sort();
        const startY = 200;
        const rowHeight = 60;
        let currentY = startY;

        // Заголовки колонок
        this.drawFreeTimeColumnHeaders(currentY, showMasterColumn);
        currentY += 40;

        dates.forEach(date => {
            // Рисуем заголовок дня
            const dateObj = new Date(date);
            const formattedDate = dateObj.toLocaleDateString('ru-RU', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
            }).toUpperCase();
            
            this.ctx.fillStyle = this.styles.secondaryColor;
            this.ctx.font = 'bold 20px "Arial", sans-serif';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(formattedDate, 50, currentY);
            
            currentY += 30;

            // Рисуем свободное время для этого дня
            const dayFreeTime = groupedByDate[date];
            dayFreeTime.sort((a, b) => a.время.localeCompare(b.время));
            
            dayFreeTime.forEach((item, index) => {
                if (currentY > this.canvas.height - 100) return;
                
                // Фон строки
                this.ctx.fillStyle = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
                this.ctx.fillRect(40, currentY - 25, this.canvas.width - 80, rowHeight - 10);

                // Данные свободного времени
                this.drawFreeTimeRow(item, currentY, showMasterColumn);
                currentY += rowHeight;
            });

            currentY += 20; // Отступ между днями
        });
    }



     drawFreeTimeRow(item, y) {
        // Время
        const time = item.время.split(':').slice(0, 2).join(':');
        this.ctx.fillStyle = this.styles.primaryColor;
        this.ctx.font = 'bold 16px "Arial", sans-serif';
        this.ctx.fillText(time, 50, y);

        // Мастер
        this.ctx.fillStyle = this.styles.textColor;
        this.ctx.font = '16px "Arial", sans-serif';
        this.ctx.fillText(item.мастер_имя, 150, y);

        // Услуга
        this.ctx.fillStyle = this.styles.textColor;
        this.ctx.font = '16px "Arial", sans-serif';
        this.ctx.fillText(item.услуга_название, 500, y);

        // Цена
        this.ctx.fillStyle = this.styles.accentColor;
        this.ctx.font = 'bold 16px "Arial", sans-serif';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`${item.услуга_цена} ₽`, this.canvas.width - 50, y);
        this.ctx.textAlign = 'left';
    }


drawColumnHeaders(y, showMasterColumn = true) {
    this.ctx.fillStyle = this.styles.secondaryColor;
    this.ctx.font = 'bold 18px "Arial", sans-serif';
    this.ctx.textAlign = 'left';
    
    this.ctx.fillText('ВРЕМЯ', 50, y);
    this.ctx.fillText('КЛИЕНТ', 150, y);
    
    if (showMasterColumn) {
        this.ctx.fillText('УСЛУГА', 500, y);
        this.ctx.fillText('МАСТЕР', 800, y);
        // Цена выравнивается по правому краю колонки
        this.ctx.textAlign = 'right';
        this.ctx.fillText('ЦЕНА', 1050, y);
        this.ctx.textAlign = 'left';
    } else {
        this.ctx.fillText('УСЛУГА', 500, y);
        // Цена выравнивается по правому краю колонки
        this.ctx.textAlign = 'right';
        this.ctx.fillText('ЦЕНА', 950, y);
        this.ctx.textAlign = 'left';
    }

    // Линия под заголовками
    this.ctx.strokeStyle = this.styles.borderColor;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(40, y + 10);
    this.ctx.lineTo(this.canvas.width - 40, y + 10);
    this.ctx.stroke();
}

drawFreeTimeColumnHeaders(y, showMasterColumn = true) {
    this.ctx.fillStyle = this.styles.secondaryColor;
    this.ctx.font = 'bold 18px "Arial", sans-serif';
    this.ctx.textAlign = 'left';
    
    this.ctx.fillText('ВРЕМЯ', 50, y);
    
    if (showMasterColumn) {
        this.ctx.fillText('МАСТЕР', 150, y);
        this.ctx.fillText('УСЛУГА', 500, y);
        // Цена выравнивается по правому краю колонки
        this.ctx.textAlign = 'right';
        this.ctx.fillText('ЦЕНА', 950, y);
        this.ctx.textAlign = 'left';
    } else {
        this.ctx.fillText('УСЛУГА', 150, y);
        // Цена выравнивается по правому краю колонки
        this.ctx.textAlign = 'right';
        this.ctx.fillText('ЦЕНА', 800, y);
        this.ctx.textAlign = 'left';
    }

    // Линия под заголовками
    this.ctx.strokeStyle = this.styles.borderColor;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(40, y + 10);
    this.ctx.lineTo(this.canvas.width - 40, y + 10);
    this.ctx.stroke();
}

    drawNoData(message) {
        this.ctx.fillStyle = this.styles.lightText;
        this.ctx.font = '24px "Arial", sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(message.toUpperCase(), this.canvas.width / 2, 300);
    }

    drawFooter() {
        const footerY = this.canvas.height - 30;
        
        // Разделительная линия
        this.ctx.strokeStyle = this.styles.borderColor;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(50, footerY - 20);
        this.ctx.lineTo(this.canvas.width - 50, footerY - 20);
        this.ctx.stroke();

        // Текст футера (только копирайт, без даты генерации)
        this.ctx.fillStyle = this.styles.lightText;
        this.ctx.font = '12px "Arial", sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('© SHAFRANOV SITE', this.canvas.width / 2, footerY);
    }

    downloadImage() {
        // Создаем ссылку для скачивания
        const link = document.createElement('a');
        const startDate = document.getElementById('photoStartDate').value;
        const endDate = document.getElementById('photoEndDate').value;
        
        link.download = `расписание_${startDate}_по_${endDate}.png`;
        
        // Конвертируем canvas в data URL
        this.canvas.toBlob((blob) => {
            link.href = URL.createObjectURL(blob);
            
            // Программно кликаем по ссылке для скачивания
            link.click();
            
            // Очищаем URL
            setTimeout(() => URL.revokeObjectURL(link.href), 100);
        });
    }
}

// Инициализация при загрузке страницы
let photoGenerator;

function initPhotoGenerator() {
    photoGenerator = new PhotoScheduleGenerator();
}

// Функция для вызова из других частей приложения
function openPhotoGenerator() {
    if (photoGenerator) {
        photoGenerator.showModal();
    }
}

// Добавляем кнопку в интерфейс
function addPhotoButtonToUI() {
    const photoBtn = document.createElement('button');
    photoBtn.id = 'photoScheduleBtn';
    photoBtn.className = 'btn btn-primary photo-btn';
    photoBtn.innerHTML = '📷 Создать фото';
    photoBtn.onclick = openPhotoGenerator;
    
    // Добавляем кнопку в подходящее место (например, в заголовок расписания)
    const scheduleHeader = document.querySelector('.schedule-header');
    if (scheduleHeader) {
        scheduleHeader.appendChild(photoBtn);
    }
}

// Инициализируем при загрузке
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPhotoGenerator);
} else {
    initPhotoGenerator();
}