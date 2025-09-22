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
        document.querySelector('.photo-modal-close').addEventListener('click', () => {
            this.hideModal();
        });

        document.getElementById('photoCancelBtn').addEventListener('click', () => {
            this.hideModal();
        });

        document.getElementById('photoGenerateBtn').addEventListener('click', () => {
            this.generatePhoto();
        });

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

        this.populateSpecialistSelect();
        document.getElementById('photoModal').style.display = 'block';
    }

    hideModal() {
        document.getElementById('photoModal').style.display = 'none';
    }

    populateSpecialistSelect() {
        const select = document.getElementById('photoSpecialist');
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
        showError('Пожалуйста, выберите диапазон дат');
        return;
    }

        try {
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
            borderColor: '#bdc3c7',
            chipBackground: '#ecf0f1',
            chipBorder: '#bdc3c7',
            chipText: '#34495e'
        };
    }

    drawBackground() {
        this.ctx.fillStyle = this.styles.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, 0);
        gradient.addColorStop(0, 'rgba(255,255,255,0.1)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawHeader(type, startDate, endDate, specialistId) {
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        
        const isSingleDay = startDate === endDate;
        
        let dateText;
        if (isSingleDay) {
            dateText = startDateObj.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long'
            });
        } else {
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

        let masterName = 'ВСЕ МАСТЕРА';
        if (specialistId !== 'all') {
            const selectedMaster = this.specialists.find(m => m.id == specialistId);
            if (selectedMaster) {
                masterName = selectedMaster.имя.toUpperCase();
            }
        }

        this.ctx.fillStyle = this.styles.primaryColor;
        this.ctx.font = 'bold 36px "Arial", sans-serif';
        this.ctx.textAlign = 'center';
        
        const headerText = type === 'appointments' ? 'РАСПИСАНИЕ ЗАПИСЕЙ' : 'СВОБОДНОЕ ВРЕМЯ';
        this.ctx.fillText(headerText.toUpperCase(), this.canvas.width / 2, 60);

        this.ctx.fillStyle = this.styles.secondaryColor;
        this.ctx.font = 'bold 24px "Arial", sans-serif';
        this.ctx.fillText(dateText.toUpperCase(), this.canvas.width / 2, 100);

        this.ctx.fillStyle = this.styles.lightText;
        this.ctx.font = '20px "Arial", sans-serif';
        this.ctx.fillText(masterName, this.canvas.width / 2, 140);

        this.ctx.strokeStyle = this.styles.borderColor;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(50, 170);
        this.ctx.lineTo(this.canvas.width - 50, 170);
        this.ctx.stroke();
    }

    drawAppointmentsWithDays(appointments, specialistId) {
        if (appointments.length === 0) {
            this.drawNoData('ЗАПИСЕЙ НА ВЫБРАННЫЙ ПЕРИОД НЕТ');
            return;
        }

        const showMaster = specialistId === 'all';

        const groupedByDate = {};
        appointments.forEach(appointment => {
            if (!groupedByDate[appointment.дата]) {
                groupedByDate[appointment.дата] = [];
            }
            groupedByDate[appointment.дата].push(appointment);
        });

        const dates = Object.keys(groupedByDate).sort();
        const startY = 200;
        let currentY = startY;
        const dateFontSize = 20;
        const timeFontSize = 14;
        const infoFontSize = 10;
        const dateSpacing = 50;
        const boxWidth = 220;
        const boxHeight = showMaster ? 65 : 50;
        const boxPadding = 4;
        const boxSpacing = 8;
        const dateWidth = 200;
        const borderRadius = 6;

        this.ctx.textAlign = 'left';

        dates.forEach(date => {
            if (currentY > this.canvas.height - 100) return;

            const dateObj = new Date(date);
            const formattedDate = dateObj.toLocaleDateString('ru-RU', {
                weekday: 'short',
                day: 'numeric',
                month: 'short'
            }).toUpperCase();

            const dateItems = groupedByDate[date].sort((a, b) => a.время.localeCompare(b.время));

            let currentX = 50 + dateWidth;
            let maxRowHeight = dateFontSize;

            const rowCount = Math.ceil((dateItems.length * (boxWidth + boxSpacing)) / (this.canvas.width - 50 - dateWidth - 50));
            const totalRowHeight = rowCount * (boxHeight + boxSpacing);
            const dateCenterY = currentY + (totalRowHeight / 2);

            this.ctx.fillStyle = this.styles.secondaryColor;
            this.ctx.font = `bold ${dateFontSize}px "Arial", sans-serif`;
            this.ctx.fillText(formattedDate, 50, dateCenterY + (dateFontSize / 3));

            dateItems.forEach(item => {
                if (currentX + boxWidth > this.canvas.width - 50) {
                    currentX = 50 + dateWidth;
                    currentY += boxHeight + boxSpacing;
                    maxRowHeight = Math.max(maxRowHeight, boxHeight);
                }

                this.ctx.fillStyle = this.styles.chipBackground;
                this.ctx.strokeStyle = this.styles.chipBorder;
                this.ctx.lineWidth = 1;

                this.ctx.beginPath();
                this.ctx.moveTo(currentX + borderRadius, currentY);
                this.ctx.lineTo(currentX + boxWidth - borderRadius, currentY);
                this.ctx.quadraticCurveTo(currentX + boxWidth, currentY, currentX + boxWidth, currentY + borderRadius);
                this.ctx.lineTo(currentX + boxWidth, currentY + boxHeight - borderRadius);
                this.ctx.quadraticCurveTo(currentX + boxWidth, currentY + boxHeight, currentX + boxWidth - borderRadius, currentY + boxHeight);
                this.ctx.lineTo(currentX + borderRadius, currentY + boxHeight);
                this.ctx.quadraticCurveTo(currentX, currentY + boxHeight, currentX, currentY + borderRadius);
                this.ctx.lineTo(currentX, currentY + borderRadius);
                this.ctx.closePath();

                this.ctx.fill();
                this.ctx.stroke();

                this.drawAppointmentRow(item, currentX, currentY, boxPadding, timeFontSize, infoFontSize, showMaster);

                currentX += boxWidth + boxSpacing;
            });

            currentY += maxRowHeight + dateSpacing;
        });
    }

    drawAppointmentRow(appointment, x, y, boxPadding, timeFontSize, infoFontSize, showMaster) {
        const time = appointment.время.split(':').slice(0, 2).join(':');
        this.ctx.fillStyle = this.styles.chipText;
        this.ctx.font = `bold ${timeFontSize}px "Arial", sans-serif`;
        this.ctx.fillText(time, x + boxPadding, y + timeFontSize + boxPadding);

        let clientName = appointment.клиент_имя;
        if (clientName.length > 20) {
            clientName = clientName.substring(0, 18) + '...';
        }
        this.ctx.fillStyle = this.styles.chipText;
        this.ctx.font = `${infoFontSize}px "Arial", sans-serif`;
        this.ctx.fillText(clientName, x + boxPadding, y + timeFontSize + infoFontSize + boxPadding * 2);

        const maxCharsPerLine = 25;
        const lineHeight = infoFontSize - 2;
        const serviceY = y + timeFontSize + infoFontSize * 2 + boxPadding * 3;

        const serviceName = appointment.услуга_название;
        this.ctx.fillStyle = this.styles.lightText;
        this.ctx.font = `${infoFontSize - 1}px "Arial", sans-serif`;

        if (serviceName.length <= maxCharsPerLine) {
            this.ctx.fillText(serviceName, x + boxPadding, serviceY);
        } else {
            const words = serviceName.split(' ');
            let currentLine = '';
            let lineCount = 0;

            for (let i = 0; i < words.length; i++) {
                const testLine = currentLine + (currentLine ? ' ' : '') + words[i];
                if (testLine.length > maxCharsPerLine && currentLine) {
                    this.ctx.fillText(currentLine, x + boxPadding, serviceY + (lineCount * lineHeight));
                    currentLine = words[i];
                    lineCount++;
                    if (lineCount >= 2) break;
                } else {
                    currentLine = testLine;
                }
            }

            if (currentLine && lineCount < 2) {
                this.ctx.fillText(currentLine, x + boxPadding, serviceY + (lineCount * lineHeight));
            }
        }

        this.ctx.fillStyle = this.styles.accentColor;
        this.ctx.font = `bold ${infoFontSize}px "Arial", sans-serif`;
        this.ctx.textAlign = 'right';
        const priceX = x + 220 - boxPadding;
        const priceY = y + timeFontSize + infoFontSize * (showMaster ? 3 : 2) + boxPadding * 4;
        this.ctx.fillText(`${appointment.цена} ₽`, priceX, priceY);

        if (showMaster) {
            let masterName = appointment.мастер_имя;
            if (masterName.length > 20) {
                masterName = masterName.substring(0, 18) + '...';
            }
            this.ctx.fillStyle = this.styles.chipText;
            this.ctx.font = `${infoFontSize - 1}px "Arial", sans-serif`;
            this.ctx.fillText(masterName, priceX, priceY + infoFontSize);
        }

        this.ctx.textAlign = 'left';
    }

    drawFreeTimeWithDays(freeTime, specialistId) {
        if (freeTime.length === 0) {
            this.drawNoData('СВОБОДНОГО ВРЕМЕНИ НА ВЫБРАННЫЙ ПЕРИОД НЕТ');
            return;
        }

        const showMaster = specialistId === 'all';

        const groupedByDate = {};
        freeTime.forEach(item => {
            if (!groupedByDate[item.дата]) {
                groupedByDate[item.дата] = [];
            }
            groupedByDate[item.дата].push({
                время: item.время.split(':').slice(0, 2).join(':'),
                мастер_имя: item.мастер_имя,
                услуга_название: item.услуга_название
            });
        });

        const dates = Object.keys(groupedByDate).sort();
        const startY = 200;
        let currentY = startY;
        const dateFontSize = 20;
        const timeFontSize = 14;
        const infoFontSize = 10;
        const dateSpacing = 50;
        const boxWidth = 120;
        const boxHeight = showMaster ? 50 : 35;
        const boxPadding = 4;
        const boxSpacing = 8;
        const dateWidth = 200;
        const borderRadius = 6;

        this.ctx.textAlign = 'left';

        dates.forEach(date => {
            if (currentY > this.canvas.height - 100) return;

            const dateObj = new Date(date);
            const formattedDate = dateObj.toLocaleDateString('ru-RU', {
                weekday: 'short',
                day: 'numeric',
                month: 'short'
            }).toUpperCase();

            const dateItems = groupedByDate[date].sort((a, b) => a.время.localeCompare(b.время));

            let currentX = 50 + dateWidth;
            let maxRowHeight = dateFontSize;

            const rowCount = Math.ceil((dateItems.length * (boxWidth + boxSpacing)) / (this.canvas.width - 50 - dateWidth - 50));
            const totalRowHeight = rowCount * (boxHeight + boxSpacing);
            const dateCenterY = currentY + (totalRowHeight / 2);

            this.ctx.fillStyle = this.styles.secondaryColor;
            this.ctx.font = `bold ${dateFontSize}px "Arial", sans-serif`;
            this.ctx.fillText(formattedDate, 50, dateCenterY + (dateFontSize / 3));

            dateItems.forEach(item => {
                if (currentX + boxWidth > this.canvas.width - 50) {
                    currentX = 50 + dateWidth;
                    currentY += boxHeight + boxSpacing;
                    maxRowHeight = Math.max(maxRowHeight, boxHeight);
                }

                this.ctx.fillStyle = this.styles.chipBackground;
                this.ctx.strokeStyle = this.styles.chipBorder;
                this.ctx.lineWidth = 1;

                this.ctx.beginPath();
                this.ctx.moveTo(currentX + borderRadius, currentY);
                this.ctx.lineTo(currentX + boxWidth - borderRadius, currentY);
                this.ctx.quadraticCurveTo(currentX + boxWidth, currentY, currentX + boxWidth, currentY + borderRadius);
                this.ctx.lineTo(currentX + boxWidth, currentY + boxHeight - borderRadius);
                this.ctx.quadraticCurveTo(currentX + boxWidth, currentY + boxHeight, currentX + boxWidth - borderRadius, currentY + boxHeight);
                this.ctx.lineTo(currentX + borderRadius, currentY + boxHeight);
                this.ctx.quadraticCurveTo(currentX, currentY + boxHeight, currentX, currentY + borderRadius);
                this.ctx.lineTo(currentX, currentY + borderRadius);
                this.ctx.closePath();

                this.ctx.fill();
                this.ctx.stroke();

                this.ctx.fillStyle = this.styles.chipText;
                this.ctx.font = `bold ${timeFontSize}px "Arial", sans-serif`;
                this.ctx.fillText(item.время, currentX + boxPadding, currentY + timeFontSize + boxPadding);

                if (showMaster) {
                    let masterName = item.мастер_имя;
                    if (masterName.length > 15) {
                        masterName = masterName.substring(0, 13) + '...';
                    }
                    this.ctx.fillStyle = this.styles.chipText;
                    this.ctx.font = `${infoFontSize}px "Arial", sans-serif`;
                    this.ctx.fillText(masterName, currentX + boxPadding, currentY + timeFontSize + infoFontSize + boxPadding * 2 - 2);

                    this.ctx.fillStyle = this.styles.lightText;
                    this.ctx.font = `${infoFontSize - 1}px "Arial", sans-serif`;
                    const serviceName = item.услуга_название;
                    const maxCharsPerLine = 18;
                    const lineHeight = infoFontSize - 2;
                    const serviceY = currentY + timeFontSize + infoFontSize + boxPadding * 3 + 3.5;

                    if (serviceName.length <= maxCharsPerLine) {
                        this.ctx.fillText(serviceName, currentX + boxPadding, serviceY);
                    } else {
                        const words = serviceName.split(' ');
                        let currentLine = '';
                        let lineCount = 0;

                        for (let i = 0; i < words.length; i++) {
                            const testLine = currentLine + (currentLine ? ' ' : '') + words[i];
                            if (testLine.length > maxCharsPerLine && currentLine) {
                                this.ctx.fillText(currentLine, currentX + boxPadding, serviceY + (lineCount * lineHeight));
                                currentLine = words[i];
                                lineCount++;
                                if (lineCount >= 2) break;
                            } else {
                                currentLine = testLine;
                            }
                        }

                        if (currentLine && lineCount < 2) {
                            this.ctx.fillText(currentLine, currentX + boxPadding, serviceY + (lineCount * lineHeight));
                        }
                    }
                }

                currentX += boxWidth + boxSpacing;
            });

            currentY += maxRowHeight + dateSpacing;
        });
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
            this.ctx.textAlign = 'right';
            this.ctx.fillText('ЦЕНА', 1050, y);
            this.ctx.textAlign = 'left';
        } else {
            this.ctx.fillText('УСЛУГА', 500, y);
            this.ctx.textAlign = 'right';
            this.ctx.fillText('ЦЕНА', 950, y);
            this.ctx.textAlign = 'left';
        }

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
        
        this.ctx.strokeStyle = this.styles.borderColor;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(50, footerY - 20);
        this.ctx.lineTo(this.canvas.width - 50, footerY - 20);
        this.ctx.stroke();

        this.ctx.fillStyle = this.styles.lightText;
        this.ctx.font = '12px "Arial", sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('© SHAFRANOV SITE', this.canvas.width / 2, footerY);
    }

    downloadImage() {
        const link = document.createElement('a');
        const startDate = document.getElementById('photoStartDate').value;
        const endDate = document.getElementById('photoEndDate').value;
        
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
    if (photoGenerator) {
        photoGenerator.showModal();
    }
}

function addPhotoButtonToUI() {
    const photoBtn = document.createElement('button');
    photoBtn.id = 'photoScheduleBtn';
    photoBtn.className = 'btn btn-primary photo-btn';
    photoBtn.innerHTML = '📷 Создать фото';
    photoBtn.onclick = openPhotoGenerator;
    
    const scheduleHeader = document.querySelector('.schedule-header');
    if (scheduleHeader) {
        scheduleHeader.appendChild(photoBtn);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPhotoGenerator);
} else {
    initPhotoGenerator();
}