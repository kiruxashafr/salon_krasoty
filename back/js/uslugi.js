// uslugi.js
class ServicesManager {
    constructor() {
        this.currentServiceId = null;
        this.isEditMode = false;
        this.init();
    }

    init() {
        this.loadServices();
        this.setupEventListeners();
    }

    async loadServices() {
        try {
            this.showLoading();
            const response = await fetch('/api/services-all');
            
            if (!response.ok) {
                throw new Error('Ошибка загрузки услуг');
            }
            
            const data = await response.json();
            
            if (data.message === 'success') {
                // Фильтруем услуги с доступен != 0
                const activeServices = data.data.filter(service => service.доступен !== 0);
                this.displayServices(activeServices);
            }
        } catch (error) {
            console.error('Ошибка:', error);
            this.showError('Не удалось загрузить список услуг');
        }
    }

    displayServices(services) {
        const container = document.getElementById('servicesContainer');
        
        if (!services || services.length === 0) {
            container.innerHTML = `
                <div class="no-services">
                    <h3>Услуг пока нет</h3>
                    <p>Добавьте первую услугу, нажав кнопку "Добавить услугу"</p>
                </div>
            `;
            return;
        }

        container.innerHTML = services.map(service => this.createServiceCard(service)).join('');
    }

    createServiceCard(service) {
        let photoUrl = service.фото || 'photo/услуги/default.jpg';
        if (photoUrl.startsWith('data:')) {
            photoUrl = 'photo/услуги/default.jpg';
        }
        
        const isHidden = service.доступен === 2;
        const statusText = isHidden ? 'Скрыта' : 'Активна';
        const statusClass = isHidden ? 'hidden' : '';

        return `
            <div class="service-card ${statusClass}" data-service-id="${service.id}">
                <div class="service-header">
                    <img src="${photoUrl}" 
                         alt="${service.название}" 
                         class="service-image"
                         onerror="this.src='photo/услуги/default.jpg'">
                    <div class="service-info">
                        <h3 class="service-name">
                            ${service.название}
                            <span class="service-status">${statusText}</span>
                        </h3>
                        <p class="service-category">Категория: ${service.категория || 'Не указана'}</p>
                        <p class="service-price">Цена: ${service.цена || 0} ₽</p>
                        <p class="service-description">${service.описание || 'Описание отсутствует'}</p>
                    </div>
                </div>
                
                <div class="service-actions">
                    <button class="action-btn btn-edit" onclick="servicesManager.editService(${service.id})">
                        ✏️ Редактировать
                    </button>
                    
                    ${isHidden ? `
                        <button class="action-btn btn-restore" onclick="servicesManager.toggleServiceVisibility(${service.id}, 1)">
                            👁️ Показать
                        </button>
                    ` : `
                        <button class="action-btn btn-hide" onclick="servicesManager.toggleServiceVisibility(${service.id}, 2)">
                            👁️ Скрыть
                        </button>
                    `}
                    
                    <button class="action-btn btn-delete" onclick="servicesManager.deleteService(${service.id})">
                        🗑️ Удалить
                    </button>
                </div>
            </div>
        `;
    }

    showAddForm() {
        this.isEditMode = false;
        this.currentServiceId = null;
        this.renderServiceForm();
    }

    async editService(serviceId) {
        try {
            this.showFormLoading();
            const response = await fetch(`/api/service/${serviceId}`);
            
            if (!response.ok) {
                throw new Error('Ошибка загрузки данных услуги');
            }
            
            const data = await response.json();
            
            if (data.message === 'success') {
                this.isEditMode = true;
                this.currentServiceId = serviceId;
                this.renderServiceForm(data.data);
            }
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Не удалось загрузить данные услуги');
        }
    }

    renderServiceForm(serviceData = null) {
        const formHTML = `
            <div class="service-form-container">
                <div class="form-header">
                    <h3 class="form-title">${this.isEditMode ? 'Редактировать услугу' : 'Добавить услугу'}</h3>
                    <button class="close-form-btn" onclick="servicesManager.closeForm()">
                        ✕ Закрыть
                    </button>
                </div>
                
                <form class="service-form" id="serviceForm" onsubmit="servicesManager.handleSubmit(event)" enctype="multipart/form-data">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="serviceCategory">Категория *</label>
                            <input type="text" id="serviceCategory" name="category" class="form-control" 
                                   value="${serviceData?.категория || ''}" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="serviceName">Название услуги *</label>
                            <input type="text" id="serviceName" name="name" class="form-control" 
                                   value="${serviceData?.название || ''}" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="servicePrice">Цена (руб) *</label>
                            <input type="number" id="servicePrice" name="price" class="form-control" 
                                   value="${serviceData?.цена || ''}" min="0" step="0.01" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="servicePhoto">Фото услуги</label>
                            <input type="file" id="servicePhoto" name="photo" class="form-control" 
                                   accept="image/*" onchange="servicesManager.handleFileSelect(event)">
                            <small>Поддерживаемые форматы: JPG, PNG, GIF</small>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="serviceDescription">Описание</label>
                        <textarea id="serviceDescription" name="description" class="form-control" 
                                  rows="4" placeholder="Опишите услугу...">${serviceData?.описание || ''}</textarea>
                    </div>
                    
                    ${serviceData?.фото ? `
                        <div class="form-group">
                            <label>Текущее фото:</label>
                            <img src="${serviceData.фото}" class="image-preview" 
                                 onerror="this.style.display='none'">
                        </div>
                    ` : ''}
                    
                    <button type="submit" class="submit-btn">
                        ${this.isEditMode ? 'Сохранить изменения' : 'Добавить услугу'}
                    </button>
                </form>
            </div>
        `;

        document.getElementById('servicesContainer').insertAdjacentHTML('beforeend', formHTML);
        
        // Прокрутка к форме
        document.querySelector('.service-form-container').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const previewContainer = document.querySelector('.image-preview-container') || 
                    document.createElement('div');
                previewContainer.className = 'image-preview-container';
                
                previewContainer.innerHTML = `
                    <label>Предпросмотр:</label>
                    <img src="${e.target.result}" class="image-preview" style="max-width: 200px; max-height: 200px;">
                `;
                
                const form = document.getElementById('serviceForm');
                form.querySelector('.form-group:last-child').after(previewContainer);
            };
            reader.readAsDataURL(file);
        }
    }

async handleSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const category = formData.get('category').trim();
    const name = formData.get('name').trim();
    const price = parseFloat(formData.get('price'));
    const description = formData.get('description').trim();
    const photoFile = formData.get('photo');

    if (!category || !name || isNaN(price)) {
        alert('Пожалуйста, заполните все обязательные поля');
        return;
    }

    try {
        this.showFormLoading();
        
        let photoPath = '';
        if (photoFile && photoFile.size > 0) {
            photoPath = await this.uploadPhoto(photoFile);
        } else if (this.isEditMode) {
            const currentPreview = document.querySelector('.image-preview');
            if (currentPreview && !currentPreview.src.startsWith('data:')) {
                photoPath = currentPreview.src;
            } else {
                photoPath = 'photo/услуги/default.jpg';
            }
        } else {
            photoPath = 'photo/услуги/default.jpg';
        }

        // Получаем текущий статус услуги (только в режиме редактирования)
        let доступен = 1; // по умолчанию активна
        if (this.isEditMode) {
            // Находим карточку услуги и проверяем ее текущий статус
            const serviceCard = document.querySelector(`.service-card[data-service-id="${this.currentServiceId}"]`);
            if (serviceCard) {
                доступен = serviceCard.classList.contains('hidden') ? 2 : 1;
            }
        }

        const serviceData = {
            категория: category,
            название: name,
            цена: price,
            описание: description,
            фото: photoPath,
            доступен: доступен // добавляем поле доступен
        };

        const url = this.isEditMode 
            ? `/api/service/${this.currentServiceId}` 
            : '/api/services-new';
            
        const method = this.isEditMode ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(serviceData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка сохранения');
        }

        const data = await response.json();
        
        if (data.message === 'success') {
            alert(this.isEditMode ? 'Услуга успешно обновлена!' : 'Услуга успешно добавлена!');
            this.closeForm();
            this.loadServices();
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Не удалось сохранить: ' + error.message);
    } finally {
        this.hideFormLoading();
    }
}

    async uploadPhoto(file) {
        const formData = new FormData();
        formData.append('photo', file);
        
        try {
            const response = await fetch('/api/upload-service-photo', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Ошибка загрузки фото');
            }
            
            const data = await response.json();
            return data.filePath;
        } catch (error) {
            console.error('Ошибка загрузки фото:', error);
            alert('Ошибка загрузки фото: ' + error.message);
            return 'photo/услуги/default.jpg';
        }
    }

async toggleServiceVisibility(serviceId, status) {
    const action = status === 1 ? 'показать' : 'скрыть';
    
    if (confirm(`Вы уверены, что хотите ${action} эту услугу?`)) {
        try {
            const response = await fetch(`/api/service/${serviceId}/visibility`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ доступен: status })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Ошибка изменения видимости');
            }

            const data = await response.json();
            
            if (data.message === 'success') {
                alert(`Услуга успешно ${action === 'показать' ? 'показана' : 'скрыта'}!`);
                this.loadServices();
            }
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Не удалось изменить видимость услуги: ' + error.message);
        }
    }
}

    async deleteService(serviceId) {
        if (confirm('Вы уверены, что хотите удалить эту услугу? Это действие нельзя отменить!')) {
            try {
                const response = await fetch(`/api/service/${serviceId}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    throw new Error('Ошибка удаления услуги');
                }

                const data = await response.json();
                
                if (data.message === 'success') {
                    alert('Услуга успешно удалена!');
                    this.loadServices();
                }
            } catch (error) {
                console.error('Ошибка:', error);
                alert('Не удалось удалить услугу');
            }
        }
    }

    closeForm() {
        const formContainer = document.querySelector('.service-form-container');
        if (formContainer) {
            formContainer.remove();
        }
    }

    showLoading() {
        const container = document.getElementById('servicesContainer');
        container.innerHTML = `
            <div class="loading" style="text-align: center; padding: 2rem;">
                <div class="spinner"></div>
                <p>Загрузка услуг...</p>
            </div>
        `;
    }

    showFormLoading() {
        const form = document.getElementById('serviceForm');
        if (form) {
            const submitBtn = form.querySelector('.submit-btn');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<div class="spinner" style="width: 20px; height: 20px;"></div> Сохранение...';
            
            const formContainer = document.querySelector('.service-form-container');
            formContainer.style.position = 'relative';
            
            const overlay = document.createElement('div');
            overlay.className = 'loading-overlay';
            overlay.innerHTML = '<div class="spinner"></div>';
            formContainer.appendChild(overlay);
        }
    }

    hideFormLoading() {
        const form = document.getElementById('serviceForm');
        if (form) {
            const submitBtn = form.querySelector('.submit-btn');
            submitBtn.disabled = false;
            submitBtn.textContent = this.isEditMode ? 'Сохранить изменения' : 'Добавить услугу';
            
            const overlay = document.querySelector('.loading-overlay');
            if (overlay) overlay.remove();
        }
    }

    showError(message) {
        const container = document.getElementById('servicesContainer');
        container.innerHTML = `
            <div class="error" style="text-align: center; padding: 2rem; color: #e74c3c;">
                <h3>Ошибка</h3>
                <p>${message}</p>
                <button onclick="servicesManager.loadServices()" class="btn btn-primary">
                    ⟳ Попробовать снова
                </button>
            </div>
        `;
    }

    setupEventListeners() {
        document.getElementById('addServiceBtn')?.addEventListener('click', () => {
            this.showAddForm();
        });
    }
}

// Инициализация менеджера услуг
let servicesManager;

// Функция для загрузки раздела услуг
function loadServicesSection() {
    const contentContainer = document.getElementById('contentContainer');
    contentContainer.innerHTML = `
        <div class="services-management">
            <div class="services-header">
                <h2>Управление услугами</h2>
                <button id="addServiceBtn" class="add-service-btn">
                    ✚ Добавить услугу
                </button>
            </div>
            
            <div id="servicesContainer">
                <div class="loading">
                    <div class="spinner"></div>
                    <p>Загрузка услуг...</p>
                </div>
            </div>
        </div>
    `;

    // Инициализируем менеджер услуг
    servicesManager = new ServicesManager();
}