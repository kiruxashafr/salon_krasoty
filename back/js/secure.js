// secure.js - Система аутентификации

// Конфигурация (будет заменена при сборке)
const AUTH_CONFIG = {
    PASSWORD_HASH: '$2b$10$v.R6.IrecuSEsfVKI157QeCGa9aGvHz8WjTGdl5z4tUhg.PDhe8Oe', // Хеш пароля по умолчанию
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 часа
    MAX_ATTEMPTS: 5,
    LOCKOUT_TIME: 15 * 60 * 1000 // 15 минут
};

// Глобальные переменные для состояния аутентификации
let authState = {
    isAuthenticated: false,
    loginAttempts: 0,
    lockedUntil: 0
};

// Функция инициализации аутентификации
function initAuth() {
    // Проверяем сессию при загрузке
    checkSession();
    
    // Защищаем все AJAX-запросы
    protectAjaxRequests();
}

// Функция проверки сессии
function checkSession() {
    const session = localStorage.getItem('admin_session');
    const sessionTime = localStorage.getItem('admin_session_time');
    
    if (session && sessionTime) {
        const currentTime = new Date().getTime();
        const sessionAge = currentTime - parseInt(sessionTime);
        
        if (sessionAge < AUTH_CONFIG.SESSION_TIMEOUT) {
            authState.isAuthenticated = true;
            hideLoginForm();
            return true;
        } else {
            // Сессия истекла
            clearSession();
        }
    }
    
    showLoginForm();
    return false;
}

// Функция показа формы логина
function showLoginForm() {
    // Создаем форму если её нет
    if (!document.getElementById('loginOverlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'loginOverlay';
        overlay.className = 'login-overlay';
        overlay.innerHTML = `
            <div class="login-container">
                <div class="login-header">
                    <h2>Вход в панель администратора</h2>
                    <p>Введите пароль для доступа</p>
                </div>
                <form id="loginForm" class="login-form">
                    <div class="form-group">
                        <label for="password">Пароль:</label>
                        <input type="password" id="password" name="password" required 
                               autocomplete="current-password">
                        <div class="error-message" id="loginError"></div>
                    </div>
                    <button type="submit" class="btn-login">Войти</button>
                </form>
                <div class="login-footer">
                    <p id="attemptsInfo"></p>
                    <p id="lockoutInfo"></p>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Добавляем обработчик формы
        document.getElementById('loginForm').addEventListener('submit', handleLogin);
        
        // Обновляем информацию о попытках
        updateLoginInfo();
    }
    
    // Блокируем основной контент
    document.querySelector('.main-content').style.opacity = '0.3';
    document.querySelector('.main-content').style.pointerEvents = 'none';
}

// Функция скрытия формы логина
function hideLoginForm() {
    const overlay = document.getElementById('loginOverlay');
    if (overlay) {
        overlay.remove();
    }
    
    // Разблокируем основной контент
    document.querySelector('.main-content').style.opacity = '1';
    document.querySelector('.main-content').style.pointerEvents = 'auto';
}

// Обработчик входа
async function handleLogin(e) {
    e.preventDefault();
    
    const passwordInput = document.getElementById('password');
    const errorElement = document.getElementById('loginError');
    const password = passwordInput.value;
    
    // Проверяем блокировку
    const currentTime = new Date().getTime();
    if (authState.lockedUntil > currentTime) {
        const minutesLeft = Math.ceil((authState.lockedUntil - currentTime) / 60000);
        errorElement.textContent = `Система заблокирована. Попробуйте через ${minutesLeft} минут.`;
        return;
    }
    
    // Проверяем пароль
    const isValid = await verifyPassword(password);
    
    if (isValid) {
        // Успешный вход
        authState.isAuthenticated = true;
        authState.loginAttempts = 0;
        authState.lockedUntil = 0;
        
        // Сохраняем сессию
        localStorage.setItem('admin_session', 'authenticated');
        localStorage.setItem('admin_session_time', currentTime.toString());
        
        hideLoginForm();
        updateLoginInfo();
    } else {
        // Неверный пароль
        authState.loginAttempts++;
        
        if (authState.loginAttempts >= AUTH_CONFIG.MAX_ATTEMPTS) {
            // Блокируем систему
            authState.lockedUntil = currentTime + AUTH_CONFIG.LOCKOUT_TIME;
            errorElement.textContent = `Превышено количество попыток. Система заблокирована на 15 минут.`;
        } else {
            errorElement.textContent = `Неверный пароль. Осталось попыток: ${AUTH_CONFIG.MAX_ATTEMPTS - authState.loginAttempts}`;
        }
        
        updateLoginInfo();
        passwordInput.value = '';
    }
}

// Функция проверки пароля (будет заменена при сборке)
async function verifyPassword(password) {
    // В продакшене этот код будет заменен на реальную проверку
    try {
        // Используем bcrypt для сравнения паролей
        const response = await fetch('/api/verify-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password })
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.success;
        }
        return false;
    } catch (error) {
        console.error('Ошибка проверки пароля:', error);
        return false;
    }
}

// Функция обновления информации о входе
function updateLoginInfo() {
    const attemptsInfo = document.getElementById('attemptsInfo');
    const lockoutInfo = document.getElementById('lockoutInfo');
    
    if (attemptsInfo) {
        if (authState.loginAttempts > 0) {
            attemptsInfo.textContent = `Неудачных попыток: ${authState.loginAttempts}`;
        } else {
            attemptsInfo.textContent = '';
        }
    }
    
    if (lockoutInfo) {
        const currentTime = new Date().getTime();
        if (authState.lockedUntil > currentTime) {
            const minutesLeft = Math.ceil((authState.lockedUntil - currentTime) / 60000);
            lockoutInfo.textContent = `Блокировка до: ${new Date(authState.lockedUntil).toLocaleTimeString()}`;
        } else {
            lockoutInfo.textContent = '';
        }
    }
}

// Функция очистки сессии
function clearSession() {
    localStorage.removeItem('admin_session');
    localStorage.removeItem('admin_session_time');
    authState.isAuthenticated = false;
}

// Функция выхода
function logout() {
    clearSession();
    showLoginForm();
}

// Защита AJAX-запросов
function protectAjaxRequests() {
    const originalFetch = window.fetch;
    
    window.fetch = function(...args) {
        // Проверяем аутентификацию для запросов к API
        if (args[0] && args[0].includes('/api/') && !args[0].includes('/api/verify-password')) {
            if (!authState.isAuthenticated) {
                return Promise.reject(new Error('Требуется аутентификация'));
            }
        }
        
        return originalFetch.apply(this, args);
    };
}

// Добавляем кнопку выхода в меню
function addLogoutButton() {
    const logoutLink = document.querySelector('.main-menu a.logout');
    if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    initAuth();
    addLogoutButton();
});

// Экспортируем функции для использования в других модулях
window.auth = {
    isAuthenticated: () => authState.isAuthenticated,
    logout: logout,
    checkSession: checkSession
};