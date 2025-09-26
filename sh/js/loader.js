// loader.js
document.addEventListener('DOMContentLoaded', function() {
    const loaderWrapper = document.querySelector('.loader-wrapper');
    const body = document.body;
    
    // Показываем загрузчик сразу
    loaderWrapper.style.display = 'block';
    body.style.overflow = 'hidden';
    
    // Ждем полной загрузки страницы
    window.addEventListener('load', function() {
        // Небольшая задержка для плавности (можно убрать)
        setTimeout(function() {
            loaderWrapper.style.opacity = '0';
            loaderWrapper.style.visibility = 'hidden';
            body.style.overflow = '';
            
            // Удаляем загрузчик из DOM после анимации
            setTimeout(function() {
                loaderWrapper.style.display = 'none';
            }, 500);
        }, 300);
    });
    
    // Фолбэк: если страница не загрузилась за 5 секунд, все равно скрываем загрузчик
    setTimeout(function() {
        if (loaderWrapper.style.display !== 'none') {
            loaderWrapper.style.opacity = '0';
            loaderWrapper.style.visibility = 'hidden';
            body.style.overflow = '';
            setTimeout(function() {
                loaderWrapper.style.display = 'none';
            }, 500);
        }
    }, 5000);
});