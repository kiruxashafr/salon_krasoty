// master.js
// master.js - обновленная версия
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

    // ... остальной код класса MastersManager без изменений ...

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
            let photoPath = '';
            if (photoFile && photoFile.size > 0) {
                photoPath = await this.uploadPhoto(photoFile);
            } else if (this.isEditMode) {
                // В режиме редактирования сохраняем старое фото, если новое не выбрано
                photoPath = document.querySelector('.image-preview')?.src || 'photo/работники/default.jpg';
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

    async uploadPhoto(file) {
        const formData = new FormData();
        formData.append('photo', file);
        
        try {
            const response = await fetch('/api/upload-photo', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Ошибка загрузки фото');
            }
            
            const data = await response.json();
            return data.filePath;
        } catch (error) {
            console.error('Ошибка загрузки фото:', error);
            return 'photo/работники/default.jpg';
        }
    }

    // ... остальные методы без изменений ...
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