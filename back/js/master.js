// master.js
class MastersManager {
    constructor() {
        this.currentMasterId = null;
        this.isEditMode = false;
        this.noPhoto = false;
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
                    <img src="${photoUrl}" 
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
        const hasPhoto = masterData?.фото && masterData.фото !== 'photo/работники/default.jpg';
        
        const formHTML = `
            <div class="modal-overlay" id="masterModal">
                <div class="modal-dialog master-modal">
                    <div class="modal-header">
                        <h3 class="modal-title">${this.isEditMode ? 'Редактировать мастера' : 'Добавить мастера'}</h3>
                        <button class="modal-close-btn" onclick="mastersManager.closeForm()">✕</button>
                    </div>
                    
                    <div class="modal-body">
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
                                    <button type="button" class="btn-no-photo" onclick="mastersManager.setNoPhoto()">
                                        🚫 Без фото
                                    </button>
                                </div>
                            </div>
                            
                            ${hasPhoto ? `
                                <div class="form-group">
                                    <label>Текущее фото:</label>
                                    <img src="${masterData.фото}" class="image-preview" 
                                         onerror="this.style.display='none'">
                                    <button type="button" class="btn-remove-photo" onclick="mastersManager.removePhoto()">
                                        ❌ Удалить фото
                                    </button>
                                </div>
                            ` : ''}
                            
                            <div class="form-group">
                                <label for="masterDescription">Описание</label>
                                <textarea id="masterDescription" name="description" class="form-control" 
                                          rows="4" placeholder="Опишите специализацию мастера...">${masterData?.описание || ''}</textarea>
                            </div>
                        </form>
                    </div>
                    
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="mastersManager.closeForm()">Отмена</button>
                        <button type="submit" class="btn btn-primary" onclick="mastersManager.handleSubmit(event)">
                            ${this.isEditMode ? 'Сохранить изменения' : 'Добавить мастера'}
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', formHTML);
        
        // Показываем модальное окно
        const modal = document.getElementById('masterModal');
        modal.style.display = 'block';
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                let previewContainer = document.querySelector('.image-preview-container');
                if (!previewContainer) {
                    previewContainer = document.createElement('div');
                    previewContainer.className = 'image-preview-container';
                    
                    const form = document.getElementById('masterForm');
                    const lastGroup = form.querySelector('.form-group:last-child');
                    lastGroup.after(previewContainer);
                }
                
                previewContainer.innerHTML = `
                    <label>Предпросмотр:</label>
                    <img src="${e.target.result}" class="image-preview" style="max-width: 200px; max-height: 200px;">
                `;
            };
            reader.readAsDataURL(file);
        }
    }

async handleSubmit(event) {
    event.preventDefault();
    console.log('Начало обработки формы мастера');
    
    const form = document.getElementById('masterForm');
    const formData = new FormData(form);
    const name = formData.get('name').trim();
    const description = formData.get('description').trim();
    const photoFile = formData.get('photo');

    console.log('Данные формы:', { name, description, hasPhoto: !!photoFile, noPhoto: this.noPhoto });

    if (!name) {
        showError('Пожалуйста, введите имя мастера');
        return;
    }

    try {
        this.showFormLoading();
        
        let photoPath = null;
        
        if (this.noPhoto) {
            photoPath = null;
        } else if (photoFile && photoFile.size > 0) {
            try {
                photoPath = await this.uploadMasterPhoto(photoFile);
                console.log('Фото успешно загружено, путь:', photoPath);
            } catch (uploadError) {
                console.error('Ошибка в uploadMasterPhoto:', uploadError);
                showError('Ошибка загрузки фото: ' + uploadError.message);
                this.hideFormLoading();
                return;
            }
        } else if (this.isEditMode) {
            const currentPreview = document.querySelector('.image-preview');
            if (currentPreview && !currentPreview.src.startsWith('data:')) {
                photoPath = currentPreview.src;
                console.log('Используем существующее фото:', photoPath);
            } else {
                console.log('Нет существующего фото для редактирования');
                photoPath = null;
            }
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
            showSuccess(this.isEditMode ? 'Мастер успешно обновлен!' : 'Мастер успешно добавлен!');
            this.closeForm();
            this.loadMasters();
        }
    } catch (error) {
        showError('Не удалось сохранить: ' + error.message);
    } finally {
        this.hideFormLoading();
        this.noPhoto = false;
    }
}

    async toggleMasterVisibility(masterId, status) {
        const action = status === 1 ? 'показать' : 'скрыть';
        
        showConfirm(`Вы уверены, что хотите ${action} этого мастера?`, (confirmed) => {
            if (confirmed) {
                this.performToggleVisibility(masterId, status, action);
            }
        });
    }

    async performToggleVisibility(masterId, status, action) {
        try {
            const response = await fetch(`/api/specialist/${masterId}/visibility`, {
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
                showSuccess(`Мастер успешно ${action === 'показать' ? 'показан' : 'скрыт'}!`);
                this.loadMasters();
            }
        } catch (error) {
            console.error('Ошибка:', error);
            showError('Не удалось изменить видимость мастера: ' + error.message);
        }
    }

    async deleteMaster(masterId) {
        showConfirm('Вы уверены, что хотите удалить этого мастера? Это действие нельзя отменить!', (confirmed) => {
            if (confirmed) {
                this.performDelete(masterId);
            }
        });
    }

    async performDelete(masterId) {
        try {
            const response = await fetch(`/api/specialist/${masterId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Ошибка удаления мастера');
            }

            const data = await response.json();
            
            if (data.message === 'success') {
                showSuccess('Мастер успешно удален!');
                this.loadMasters();
            }
        } catch (error) {
            console.error('Ошибка:', error);
            showError('Не удалось удалить мастера');
        }
    }

    setNoPhoto() {
        this.noPhoto = true;
        const fileInput = document.getElementById('masterPhoto');
        if (fileInput) {
            fileInput.value = '';
        }
        showInfo('Фото не будет добавлено');
    }

    removePhoto() {
        this.noPhoto = true;
        const preview = document.querySelector('.image-preview');
        if (preview) {
            preview.style.display = 'none';
        }
        const removeBtn = document.querySelector('.btn-remove-photo');
        if (removeBtn) {
            removeBtn.style.display = 'none';
        }
        showInfo('Текущее фото будет удалено');
    }

    


    async uploadMasterPhoto(file) {


    const formData = new FormData();
    formData.append('photo', file);
    
    try {
        const response = await fetch('/api/upload-photo', {
            method: 'POST',
            body: formData
        });


        
        if (response.ok) {
            try {
                const data = await response.json();
                console.log('Успешная загрузка, получены данные:', data);
                return data.filePath;
            } catch (jsonError) {
                // Если JSON не парсится, но статус OK, создаем путь вручную
                const timestamp = Date.now();
                const extension = file.name.split('.').pop() || 'jpg';
                const fallbackPath = `photo/работники/master_${timestamp}.${extension}`;
                return fallbackPath;
            }
        } else {
            // Получаем текст ошибки для детальной информации
            let errorText = 'Неизвестная ошибка';
            try {
                errorText = await response.text();
            } catch (textError) {
            }
            
            throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
        }
    } catch (error) {

        
        // В случае любой ошибки - создаем путь вручную
        const timestamp = Date.now();
        const extension = file.name.split('.').pop() || 'jpg';
        const fallbackPath = `photo/работники/master_${timestamp}.${extension}`;
        
        return fallbackPath;
    }
}

    closeForm() {
        const modal = document.getElementById('masterModal');
        if (modal) {
            modal.remove();
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
        const submitBtn = document.querySelector('#masterModal .btn-primary');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<div class="spinner" style="width: 20px; height: 20px;"></div> Сохранение...';
        }
    }

    hideFormLoading() {
        const submitBtn = document.querySelector('#masterModal .btn-primary');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = this.isEditMode ? 'Сохранить изменения' : 'Добавить мастера';
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