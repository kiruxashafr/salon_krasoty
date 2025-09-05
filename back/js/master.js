// master.js
class MastersManager {
    constructor() {
        this.currentMasterId = null;
        this.isEditMode = false;
        this.init();
    }

    init() {
        this.loadMasters();
        this.setupEventListeners();
    }

    async loadMasters() {
        try {
            this.showLoading();
            const response = await fetch('/api/specialists-all');
            
            if (!response.ok) {
                throw new Error('Ошибка загрузки мастеров');
            }
            
            const data = await response.json();
            
            if (data.message === 'success') {
                // Фильтруем мастеров с доступен != 0
                const activeMasters = data.data.filter(master => master.доступен !== 0);
                this.displayMasters(activeMasters);
            }
        } catch (error) {
            console.error('Ошибка:', error);
            this.showError('Не удалось загрузить список мастеров');
        }
    }

    displayMasters(masters) {
        const container = document.getElementById('mastersContainer');
        
        if (!masters || masters.length === 0) {
            container.innerHTML = `
                <div class="no-masters">
                    <h3>Мастеров пока нет</h3>
                    <p>Добавьте первого мастера, нажав кнопку "Добавить мастера"</p>
                </div>
            `;
            return;
        }

        container.innerHTML = masters.map(master => this.createMasterCard(master)).join('');
    }

    createMasterCard(master) {
            let photoUrl = master.фото || 'photo/работники/default.jpg';
    if (photoUrl.startsWith('data:')) {
        photoUrl = 'photo/работники/default.jpg';
    }
        const isHidden = master.доступен === 2;
        const statusText = isHidden ? 'Скрыт' : 'Активен';
        const statusClass = isHidden ? 'hidden' : '';

        return `
            <div class="master-card ${statusClass}" data-master-id="${master.id}">
                <div class="master-header">
                    <img src="${master.фото || 'photo/работники/default.jpg'}" 
                         alt="${master.имя}" 
                         class="master-image"
                         onerror="this.src='photo/работники/default.jpg'">
                    <div class="master-info">
                        <h3 class="master-name">
                            ${master.имя}
                            <span class="master-status">${statusText}</span>
                        </h3>
                        <p class="master-description">${master.описание || 'Описание отсутствует'}</p>
                    </div>
                </div>
                
                <div class="master-actions">
                    <button class="action-btn btn-edit" onclick="mastersManager.editMaster(${master.id})">
                        ✏️ Редактировать
                    </button>
                    
                    ${isHidden ? `
                        <button class="action-btn btn-restore" onclick="mastersManager.toggleMasterVisibility(${master.id}, 1)">
                            👁️ Показать
                        </button>
                    ` : `
                        <button class="action-btn btn-hide" onclick="mastersManager.toggleMasterVisibility(${master.id}, 2)">
                            👁️ Скрыть
                        </button>
                    `}
                    
                    <button class="action-btn btn-delete" onclick="mastersManager.deleteMaster(${master.id})">
                        🗑️ Удалить
                    </button>
                </div>
            </div>
        `;
    }

    showAddForm() {
        this.isEditMode = false;
        this.currentMasterId = null;
        this.renderMasterForm();
    }

    async editMaster(masterId) {
        try {
            this.showFormLoading();
            const response = await fetch(`/api/specialist/${masterId}`);
            
            if (!response.ok) {
                throw new Error('Ошибка загрузки данных мастера');
            }
            
            const data = await response.json();
            
            if (data.message === 'success') {
                this.isEditMode = true;
                this.currentMasterId = masterId;
                this.renderMasterForm(data.data);
            }
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Не удалось загрузить данные мастера');
        }
    }

renderMasterForm(masterData = null) {
        const formHTML = `
            <div class="master-form-container">
                <div class="form-header">
                    <h3 class="form-title">${this.isEditMode ? 'Редактировать мастера' : 'Добавить мастера'}</h3>
                    <button class="close-form-btn" onclick="mastersManager.closeForm()">
                        ✕ Закрыть
                    </button>
                </div>
                
                <form class="master-form" id="masterForm" onsubmit="mastersManager.handleSubmit(event)" enctype="multipart/form-data">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="masterName">Имя мастера *</label>
                            <input type="text" id="masterName" name="name" class="form-control" 
                                   value="${masterData?.имя || ''}" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="masterPhoto">Фото мастера</label>
                            <input type="file" id="masterPhoto" name="photo" class="form-control" 
                                   accept="image/*" onchange="mastersManager.handleFileSelect(event)">
                            <small>Поддерживаемые форматы: JPG, PNG, GIF</small>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="masterDescription">Описание</label>
                        <textarea id="masterDescription" name="description" class="form-control" 
                                  rows="4" placeholder="Опишите специализацию мастера...">${masterData?.описание || ''}</textarea>
                    </div>
                    
                    ${masterData?.фото ? `
                        <div class="form-group">
                            <label>Текущее фото:</label>
                            <img src="${masterData.фото}" class="image-preview" 
                                 onerror="this.style.display='none'">
                        </div>
                    ` : ''}
                    
                    <button type="submit" class="submit-btn">
                        ${this.isEditMode ? 'Сохранить изменения' : 'Добавить мастера'}
                    </button>
                </form>
            </div>
        `;

        document.getElementById('mastersContainer').insertAdjacentHTML('beforeend', formHTML);
        
        // Прокрутка к форме
        document.querySelector('.master-form-container').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            // Показываем превью изображения
            const reader = new FileReader();
            reader.onload = function(e) {
                const previewContainer = document.querySelector('.image-preview-container') || 
                    document.createElement('div');
                previewContainer.className = 'image-preview-container';
                
                previewContainer.innerHTML = `
                    <label>Предпросмотр:</label>
                    <img src="${e.target.result}" class="image-preview" style="max-width: 200px; max-height: 200px;">
                `;
                
                const form = document.getElementById('masterForm');
                form.querySelector('.form-group:last-child').after(previewContainer);
            };
            reader.readAsDataURL(file);
        }
    }

async handleSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const name = formData.get('name').trim();
    const description = formData.get('description').trim();
    const photoFile = formData.get('photo');

    if (!name) {
        alert('Пожалуйста, введите имя мастера');
        return;
    }

    try {
        this.showFormLoading();
        
        // Если выбран файл, загружаем его
// master.js - исправленная часть handleSubmit
let photoPath = '';
if (photoFile && photoFile.size > 0) {
    photoPath = await this.uploadPhoto(photoFile);
} else if (this.isEditMode) {
    // В режиме редактирования сохраняем старое фото, если новое не выбрано
    const currentPreview = document.querySelector('.image-preview');
    if (currentPreview && !currentPreview.src.startsWith('data:')) {
        photoPath = currentPreview.src;
    } else {
        photoPath = 'photo/работники/default.jpg';
    }
} else {
    photoPath = 'photo/работники/default.jpg';
}

            const masterData = {
                имя: name,
                описание: description,
                фото: photoPath
            };

            const url = this.isEditMode 
                ? `/api/specialist/${this.currentMasterId}` 
                : '/api/specialists';
                
            const method = this.isEditMode ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(masterData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Ошибка сохранения');
            }

            const data = await response.json();
            
            if (data.message === 'success') {
                alert(this.isEditMode ? 'Мастер успешно обновлен!' : 'Мастер успешно добавлен!');
                this.closeForm();
                this.loadMasters();
            }
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Не удалось сохранить: ' + error.message);
        } finally {
            this.hideFormLoading();
        }
    }

// master.js - исправленная функция uploadPhoto
async uploadPhoto(file) {
    const formData = new FormData();
    formData.append('photo', file);
    
    try {
        const response = await fetch('/api/upload-photo', {
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
        return 'photo/работники/default.jpg';
    }
}
    async toggleMasterVisibility(masterId, status) {
        const action = status === 1 ? 'показать' : 'скрыть';
        
        if (confirm(`Вы уверены, что хотите ${action} этого мастера?`)) {
            try {
                const response = await fetch(`/api/specialist/${masterId}/visibility`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ доступен: status })
                });

                if (!response.ok) {
                    throw new Error('Ошибка изменения видимости');
                }

                const data = await response.json();
                
                if (data.message === 'success') {
                    alert(`Мастер успешно ${action === 'показать' ? 'показан' : 'скрыт'}!`);
                    this.loadMasters(); // Перезагружаем список
                }
            } catch (error) {
                console.error('Ошибка:', error);
                alert('Не удалось изменить видимость мастера');
            }
        }
    }

    async deleteMaster(masterId) {
        if (confirm('Вы уверены, что хотите удалить этого мастера? Это действие нельзя отменить!')) {
            try {
                const response = await fetch(`/api/specialist/${masterId}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    throw new Error('Ошибка удаления мастера');
                }

                const data = await response.json();
                
                if (data.message === 'success') {
                    alert('Мастер успешно удален!');
                    this.loadMasters(); // Перезагружаем список
                }
            } catch (error) {
                console.error('Ошибка:', error);
                alert('Не удалось удалить мастера');
            }
        }
    }

    closeForm() {
        const formContainer = document.querySelector('.master-form-container');
        if (formContainer) {
            formContainer.remove();
        }
    }

    showLoading() {
        const container = document.getElementById('mastersContainer');
        container.innerHTML = `
            <div class="loading" style="text-align: center; padding: 2rem;">
                <div class="spinner"></div>
                <p>Загрузка мастеров...</p>
            </div>
        `;
    }

    showFormLoading() {
        const form = document.getElementById('masterForm');
        if (form) {
            const submitBtn = form.querySelector('.submit-btn');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<div class="spinner" style="width: 20px; height: 20px;"></div> Сохранение...';
            
            // Добавляем overlay поверх формы
            const formContainer = document.querySelector('.master-form-container');
            formContainer.style.position = 'relative';
            
            const overlay = document.createElement('div');
            overlay.className = 'loading-overlay';
            overlay.innerHTML = '<div class="spinner"></div>';
            formContainer.appendChild(overlay);
        }
    }

    hideFormLoading() {
        const form = document.getElementById('masterForm');
        if (form) {
            const submitBtn = form.querySelector('.submit-btn');
            submitBtn.disabled = false;
            submitBtn.textContent = this.isEditMode ? 'Сохранить изменения' : 'Добавить мастера';
            
            // Убираем overlay
            const overlay = document.querySelector('.loading-overlay');
            if (overlay) overlay.remove();
        }
    }

    showError(message) {
        const container = document.getElementById('mastersContainer');
        container.innerHTML = `
            <div class="error" style="text-align: center; padding: 2rem; color: #e74c3c;">
                <h3>Ошибка</h3>
                <p>${message}</p>
                <button onclick="mastersManager.loadMasters()" class="btn btn-primary">
                    ⟳ Попробовать снова
                </button>
            </div>
        `;
    }

    setupEventListeners() {
        // Обработчик для кнопки добавления
        document.getElementById('addMasterBtn')?.addEventListener('click', () => {
            this.showAddForm();
        });
    }
}

// Инициализация менеджера мастеров
let mastersManager;

// Функция для загрузки раздела мастеров
function loadMastersSection() {
    const contentContainer = document.getElementById('contentContainer');
    contentContainer.innerHTML = `
        <div class="masters-management">
            <div class="masters-header">
                <h2>Управление мастерами</h2>
                <button id="addMasterBtn" class="add-master-btn">
                    ✚ Добавить мастера
                </button>
            </div>
            
            <div id="mastersContainer">
                <div class="loading">
                    <div class="spinner"></div>
                    <p>Загрузка мастеров...</p>
                </div>
            </div>
        </div>
    `;

    // Инициализируем менеджер мастеров
    mastersManager = new MastersManager();
}