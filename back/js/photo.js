class PhotoScheduleGenerator {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.specialists = [];
        this.init();
    }

    async init() {
        await this.loadSpecialists();
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
                        <h3>Создать изображение расписания</h3>
                        <button class="photo-modal-close">&times;</button>
                    </div>
                    <div class="photo-modal-body">
                        <div class="photo-form-group">
                            <label>Тип расписания:</label>
                            <select id="photoScheduleType" class="photo-form-control">
                                <option value="appointments">Записи</option>
                                <option value="freetime">Свободное время</option>
                            </select>
                        </div>
                        <div class="photo-form-group">
                            <label>Период:</label>
                            <select id="photoPeriodType" class="photo-form-control">
                                <option value="day">Один день</option>
                                <option value="week">Неделя</option>
                            </select>
                        </div>
                        <div class="photo-form-group" id="photoSingleDateGroup">
                            <label>Дата:</label>
                            <input type="date" id="photoSingleDate" class="photo-form-control">
                        </div>
                        <div class="photo-form-group" id="photoDateRangeGroup" style="display: none;">
                            <label>Дата начала:</label>
                            <input type="date" id="photoStartDate" class="photo-form-control">
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
                        <button id="photoGenerateBtn" class="btn btn-primary">Создать изображение</button>
                        <button id="photoCancelBtn" class="btn btn-secondary">Отмена</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.querySelector('.photo-modal-close').addEventListener('click', () => this.hideModal());
        document.getElementById('photoCancelBtn').addEventListener('click', () => this.hideModal());
        document.getElementById('photoGenerateBtn').addEventListener('click', () => this.generatePhoto());
        document.getElementById('photoModal').addEventListener('click', (e) => {
            if (e.target.id === 'photoModal') this.hideModal();
        });

        document.getElementById('photoPeriodType').addEventListener('change', (e) => {
            const singleDateGroup = document.getElementById('photoSingleDateGroup');
            const dateRangeGroup = document.getElementById('photoDateRangeGroup');
            singleDateGroup.style.display = e.target.value === 'day' ? 'block' : 'none';
            dateRangeGroup.style.display = e.target.value === 'week' ? 'block' : 'none';
        });

        document.getElementById('photoEndDate').addEventListener('change', () => this.validateWeekRange());
    }

    validateWeekRange() {
        const startDateInput = document.getElementById('photoStartDate');
        const endDateInput = document.getElementById('photoEndDate');
        const startDate = new Date(startDateInput.value);
        const endDate = new Date(endDateInput.value);
        const diffDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

        if (diffDays < 2 || diffDays > 7) {
            alert('Диапазон дат для недели должен быть от 2 до 7 дней.');
            endDateInput.value = '';
        }
    }

    async showModal() {
        const today = new Date();
        const endDate = new Date(today);
        endDate.setDate(today.getDate() + 6);

        document.getElementById('photoSingleDate').value = today.toISOString().split('T')[0];
        document.getElementById('photoStartDate').value = today.toISOString().split('T')[0];
        document.getElementById('photoEndDate').value = endDate.toISOString().split('T')[0];

        this.populateSpecialistSelect();
        document.getElementById('photoModal').style.display = 'block';
    }

    hideModal() {
        document.getElementById('photoModal').style.display = 'none';
    }

    populateSpecialistSelect() {
        const select = document.getElementById('photoSpecialist');
        while (select.options.length > 1) select.remove(1);
        this.specialists.forEach(specialist => {
            const option = document.createElement('option');
            option.value = specialist.id;
            option.textContent = specialist.имя;
            select.appendChild(option);
        });
    }

    async generatePhoto() {
        const type = document.getElementById('photoScheduleType').value;
        const periodType = document.getElementById('photoPeriodType').value;
        let startDate, endDate;

        if (periodType === 'day') {
            startDate = document.getElementById('photoSingleDate').value;
            endDate = startDate;
            if (!startDate) {
                alert('Пожалуйста, выберите дату.');
                return;
            }
        } else {
            startDate = document.getElementById('photoStartDate').value;
            endDate = document.getElementById('photoEndDate').value;
            if (!startDate || !endDate) {
                alert('Пожалуйста, выберите диапазон дат.');
                return;
            }
            const diffDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;
            if (diffDays < 2 || diffDays > 7) {
                alert('Диапазон дат для недели должен быть от 2 до 7 дней.');
                return;
            }
        }

        const specialistId = document.getElementById('photoSpecialist').value;

        try {
            const generateBtn = document.getElementById('photoGenerateBtn');
            generateBtn.textContent = 'Создание...';
            generateBtn.disabled = true;

            let data = type === 'appointments'
                ? await this.loadAppointments(startDate, endDate, specialistId)
                : await this.loadFreeTime(startDate, endDate, specialistId);

            await this.createImage(data, type, startDate, endDate, specialistId, periodType);

            generateBtn.textContent = 'Создать изображение';
            generateBtn.disabled = false;
            this.hideModal();
        } catch (error) {
            console.error('Ошибка генерации изображения:', error);
            alert('Ошибка при создании изображения. Попробуйте еще раз.');
            document.getElementById('photoGenerateBtn').textContent = 'Создать изображение';
            document.getElementById('photoGenerateBtn').disabled = false;
        }
    }

    async loadAppointments(startDate, endDate, specialistId) {
        let url = `/api/appointments?startDate=${startDate}&endDate=${endDate}`;
        if (specialistId !== 'all') url += `&specialistId=${specialistId}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('Ошибка загрузки записей');
        const data = await response.json();
        return data.message === 'success' ? data.data : [];
    }

    async loadFreeTime(startDate, endDate, specialistId) {
        let url = `/api/schedule-available?startDate=${startDate}&endDate=${endDate}`;
        if (specialistId !== 'all') url += `&specialistId=${specialistId}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('Ошибка загрузки свободного времени');
        const data = await response.json();
        return data.message === 'success' ? data.data : [];
    }

    async createImage(data, type, startDate, endDate, specialistId, periodType) {
        this.canvas.width = 800;
        this.canvas.height = periodType === 'day' ? 600 : 1000;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.applyStyle();
        this.drawBackground();
        this.drawHeader(type, startDate, endDate, specialistId, periodType);

        if (type === 'appointments') {
            this.drawAppointments(data, specialistId, periodType);
        } else {
            this.drawFreeTime(data, specialistId, periodType);
        }

        this.drawFooter();
        this.downloadImage();
    }

    applyStyle() {
        this.styles = {
            background: '#f5f5f5',
            primaryColor: '#1a3c5e',
            secondaryColor: '#3b6a9c',
            accentColor: '#e63946',
            textColor: '#333333',
            lightText: '#666666',
            borderColor: '#d1d5db',
            cardBackground: '#ffffff',
            cardBorder: '#e5e7eb'
        };
    }

    drawBackground() {
        this.ctx.fillStyle = this.styles.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawHeader(type, startDate, endDate, specialistId, periodType) {
        const isSingleDay = periodType === 'day';
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);

        const dateText = isSingleDay
            ? startDateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
            : `С ${startDateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} ПО ${endDateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}`;

        let masterName = 'ВСЕ МАСТЕРА';
        if (specialistId !== 'all') {
            const selectedMaster = this.specialists.find(m => m.id == specialistId);
            if (selectedMaster) masterName = selectedMaster.имя.toUpperCase();
        }

        this.ctx.fillStyle = this.styles.primaryColor;
        this.ctx.font = 'bold 24px Arial, sans-serif';
        this.ctx.textAlign = 'center';
        const headerText = type === 'appointments' ? 'РАСПИСАНИЕ ЗАПИСЕЙ' : 'СВОБОДНОЕ ВРЕМЯ';
        this.ctx.fillText(headerText, this.canvas.width / 2, 40);

        this.ctx.fillStyle = this.styles.secondaryColor;
        this.ctx.font = '18px Arial, sans-serif';
        this.ctx.fillText(dateText.toUpperCase(), this.canvas.width / 2, 70);

        this.ctx.fillStyle = this.styles.lightText;
        this.ctx.font = '16px Arial, sans-serif';
        this.ctx.fillText(masterName, this.canvas.width / 2, 95);

        this.ctx.strokeStyle = this.styles.borderColor;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(20, 110);
        this.ctx.lineTo(this.canvas.width - 20, 110);
        this.ctx.stroke();
    }

    drawAppointments(data, specialistId, periodType) {
        if (!data.length) {
            this.drawNoData('ЗАПИСЕЙ НА ВЫБРАННЫЙ ПЕРИОД НЕТ');
            return;
        }

        const showMaster = specialistId === 'all';
        const groupedByDate = {};
        data.forEach(appointment => {
            groupedByDate[appointment.дата] = groupedByDate[appointment.дата] || [];
            groupedByDate[appointment.дата].push({
                время: appointment.время.split(':').slice(0, 2).join(':'),
                клиент_имя: appointment.клиент_имя,
                услуга_название: appointment.услуга_название,
                мастер_имя: appointment.мастер_имя,
                цена: appointment.цена
            });
        });

        const dates = Object.keys(groupedByDate).sort();
        let currentY = 130;
        const cardWidth = 360;
        const cardHeight = showMaster ? 80 : 60;
        const cardMargin = 10;
        const columns = 2;
        const cardXPositions = [30, 410];

        this.ctx.textAlign = 'left';

        dates.forEach(date => {
            if (currentY > this.canvas.height - 50) return;

            const dateObj = new Date(date);
            const formattedDate = dateObj.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase();
            const dateItems = groupedByDate[date].sort((a, b) => a.время.localeCompare(b.время));

            if (periodType !== 'day') {
                this.ctx.fillStyle = this.styles.secondaryColor;
                this.ctx.font = 'bold 16px Arial, sans-serif';
                this.ctx.fillText(formattedDate, 30, currentY);
                currentY += 25;
            }

            dateItems.forEach((appointment, index) => {
                const col = index % columns;
                const row = Math.floor(index / columns);
                const x = cardXPositions[col];
                const y = currentY + row * (cardHeight + cardMargin);

                if (y + cardHeight > this.canvas.height - 50) return;

                // Draw card
                this.ctx.fillStyle = this.styles.cardBackground;
                this.ctx.strokeStyle = this.styles.cardBorder;
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.roundRect(x, y, cardWidth, cardHeight, 8);
                this.ctx.fill();
                this.ctx.stroke();

                // Draw content
                this.ctx.fillStyle = this.styles.textColor;
                this.ctx.font = 'bold 14px Arial, sans-serif';
                this.ctx.fillText(appointment.время, x + 10, y + 20);

                this.ctx.font = '12px Arial, sans-serif';
                this.ctx.fillText(this.truncate(appointment.клиент_имя, 20), x + 10, y + 35);

                this.ctx.fillText(this.truncate(appointment.услуга_название, 20), x + 10, y + 50);

                if (showMaster) {
                    this.ctx.fillText(this.truncate(appointment.мастер_имя, 20), x + 10, y + 65);
                }

                this.ctx.fillStyle = this.styles.accentColor;
                this.ctx.textAlign = 'right';
                this.ctx.fillText(`${appointment.цена} ₽`, x + cardWidth - 10, y + (showMaster ? 65 : 50));
                this.ctx.textAlign = 'left';
            });

            currentY += Math.ceil(dateItems.length / columns) * (cardHeight + cardMargin) + (periodType === 'day' ? 10 : 20);
        });
    }

    drawFreeTime(data, specialistId, periodType) {
        if (!data.length) {
            this.drawNoData('СВОБОДНОГО ВРЕМЕНИ НА ВЫБРАННЫЙ ПЕРИОД НЕТ');
            return;
        }

        const showMaster = specialistId === 'all';
        const groupedByDate = {};
        data.forEach(item => {
            groupedByDate[item.дата] = groupedByDate[item.дата] || [];
            groupedByDate[item.дата].push({
                время: item.время.split(':').slice(0, 2).join(':'),
                мастер_имя: item.мастер_имя,
                услуга_название: item.услуга_название,
                услуга_цена: item.услуга_цена
            });
        });

        const dates = Object.keys(groupedByDate).sort();
        let currentY = 130;
        const cardWidth = 360;
        const cardHeight = showMaster ? 80 : 60;
        const cardMargin = 10;
        const columns = 2;
        const cardXPositions = [30, 410];

        this.ctx.textAlign = 'left';

        dates.forEach(date => {
            if (currentY > this.canvas.height - 50) return;

            const dateObj = new Date(date);
            const formattedDate = dateObj.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase();
            const dateItems = groupedByDate[date].sort((a, b) => a.время.localeCompare(b.время));

            if (periodType !== 'day') {
                this.ctx.fillStyle = this.styles.secondaryColor;
                this.ctx.font = 'bold 16px Arial, sans-serif';
                this.ctx.fillText(formattedDate, 30, currentY);
                currentY += 25;
            }

            dateItems.forEach((item, index) => {
                const col = index % columns;
                const row = Math.floor(index / columns);
                const x = cardXPositions[col];
                const y = currentY + row * (cardHeight + cardMargin);

                if (y + cardHeight > this.canvas.height - 50) return;

                // Draw card
                this.ctx.fillStyle = this.styles.cardBackground;
                this.ctx.strokeStyle = this.styles.cardBorder;
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.roundRect(x, y, cardWidth, cardHeight, 8);
                this.ctx.fill();
                this.ctx.stroke();

                // Draw content
                this.ctx.fillStyle = this.styles.textColor;
                this.ctx.font = 'bold 14px Arial, sans-serif';
                this.ctx.fillText(item.время, x + 10, y + 20);

                this.ctx.font = '12px Arial, sans-serif';
                this.ctx.fillText(this.truncate(item.услуга_название, 20), x + 10, y + 35);

                if (showMaster) {
                    this.ctx.fillText(this.truncate(item.мастер_имя, 20), x + 10, y + 50);
                }

                this.ctx.fillStyle = this.styles.accentColor;
                this.ctx.textAlign = 'right';
                this.ctx.fillText(`${item.услуга_цена} ₽`, x + cardWidth - 10, y + (showMaster ? 65 : 50));
                this.ctx.textAlign = 'left';
            });

            currentY += Math.ceil(dateItems.length / columns) * (cardHeight + cardMargin) + (periodType === 'day' ? 10 : 20);
        });
    }

    truncate(text, maxLength) {
        return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
    }

    drawNoData(message) {
        this.ctx.fillStyle = this.styles.lightText;
        this.ctx.font = '18px Arial, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(message, this.canvas.width / 2, this.canvas.height / 2);
    }

    drawFooter() {
        this.ctx.fillStyle = this.styles.lightText;
        this.ctx.font = '12px Arial, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('© SHAFRANOV SITE', this.canvas.width / 2, this.canvas.height - 20);
    }

    downloadImage() {
        const startDate = document.getElementById('photoPeriodType').value === 'day'
            ? document.getElementById('photoSingleDate').value
            : document.getElementById('photoStartDate').value;
        const endDate = document.getElementById('photoPeriodType').value === 'day'
            ? startDate
            : document.getElementById('photoEndDate').value;

        const link = document.createElement('a');
        link.download = `расписание_${startDate}_по_${endDate}.png`;
        this.canvas.toBlob((blob) => {
            link.href = URL.createObjectURL(blob);
            link.click();
            setTimeout(() => URL.revokeObjectURL(link.href), 100);
        });
    }
}

let photoGenerator;

function initPhotoGenerator() {
    photoGenerator = new PhotoScheduleGenerator();
}

function openPhotoGenerator() {
    if (photoGenerator) photoGenerator.showModal();
}

function addPhotoButtonToUI() {
    const photoBtn = document.createElement('button');
    photoBtn.id = 'photoScheduleBtn';
    photoBtn.className = 'btn btn-primary photo-btn';
    photoBtn.innerHTML = '📷 Создать изображение';
    photoBtn.onclick = openPhotoGenerator;

    const scheduleHeader = document.querySelector('.schedule-header');
    if (scheduleHeader) scheduleHeader.appendChild(photoBtn);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPhotoGenerator);
} else {
    initPhotoGenerator();
}