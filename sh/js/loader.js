// loader.js
document.addEventListener('DOMContentLoaded', function() {
    const loaderWrapper = document.querySelector('.loader-wrapper');
    const body = document.body;
    
    // Показываем загрузчик сразу
    loaderWrapper.style.display = 'block';
    body.style.overflow = 'hidden';
    
    // Ждем загрузки всех стилей и шрифтов
    Promise.all([
        // Ждем загрузки всех CSS файлов
        ...Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(link => {
            if (link.sheet) return Promise.resolve();
            return new Promise(resolve => {
                link.addEventListener('load', resolve);
                link.addEventListener('error', resolve); // Продолжаем даже если есть ошибки
            });
        }),
        // Ждем загрузки шрифтов
        document.fonts ? document.fonts.ready : Promise.resolve(),
        // Небольшая задержка для гарантированной загрузки стилей
        new Promise(resolve => setTimeout(resolve, 300))
    ]).then(() => {
        // Теперь стили загружены, можно загружать данные
        loadPageData().finally(() => {
            // Скрываем загрузчик после загрузки данных
            setTimeout(() => {
                loaderWrapper.style.opacity = '0';
                loaderWrapper.style.visibility = 'hidden';
                body.style.overflow = '';
                
                setTimeout(() => {
                    loaderWrapper.style.display = 'none';
                }, 500);
            }, 300);
        });
    });
    
    // Фолбэк: если страница не загрузилась за 8 секунд
    setTimeout(() => {
        if (loaderWrapper.style.display !== 'none') {
            loaderWrapper.style.opacity = '0';
            loaderWrapper.style.visibility = 'hidden';
            body.style.overflow = '';
            setTimeout(() => {
                loaderWrapper.style.display = 'none';
            }, 500);
        }
    }, 8000);
});

// Функция для загрузки данных
function loadPageData() {
    return new Promise((resolve) => {
        // Здесь будут все ваши вызовы API
        // Например: loadServices(), loadSpecialists(), etc.
        
        // Для начала просто резолвим промис
        // Позже вы можете добавить сюда реальные вызовы API
        setTimeout(resolve, 1000);
    });
}