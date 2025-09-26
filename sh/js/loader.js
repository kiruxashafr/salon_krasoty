// loader.js
document.addEventListener('DOMContentLoaded', function() {
    // Ждем полной загрузки всех ресурсов
    window.addEventListener('load', function() {
        // Добавляем небольшую задержку для плавности (0.5 секунды)
        setTimeout(function() {
            const loaderWrapper = document.querySelector('.loader-wrapper');
            const body = document.body;
            
            if (loaderWrapper) {
                // Плавное исчезновение лоадера
                loaderWrapper.style.opacity = '0';
                loaderWrapper.style.transition = 'opacity 0.5s ease';
                
                // После завершения анимации скрываем лоадер и показываем контент
                setTimeout(function() {
                    loaderWrapper.style.display = 'none';
                    body.classList.remove('loading'); // Убираем класс loading с body
                    body.style.overflow = 'auto'; // Включаем прокрутку
                }, 500);
            }
        }, 500); // Минимальная задержка для плавности
    });
});

// Функция для принудительного скрытия лоадера (на случай ошибок)
function hideLoader() {
    const loaderWrapper = document.querySelector('.loader-wrapper');
    const body = document.body;
    
    if (loaderWrapper) {
        loaderWrapper.style.display = 'none';
        body.classList.remove('loading');
        body.style.overflow = 'auto';
    }
}

// На всякий случай скрываем лоадер через 5 секунд (таймаут)
setTimeout(hideLoader, 5000);