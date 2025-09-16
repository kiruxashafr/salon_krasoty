document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('modal');
    const hamburgerInput = document.querySelector('.hamburger input');
    const closeBtn = document.querySelector('.close-btn');
    const menuItems = document.querySelectorAll('.modal-content ul li');
    const contactBtn = document.querySelector('.header .contact-btn');

    let lastScrollTop = 0;
    const header = document.querySelector('.header');

    window.addEventListener('scroll', () => {
        let currentScroll = window.pageYOffset || document.documentElement.scrollTop;
        
        if (currentScroll > lastScrollTop) {
            // Scrolling down
            header.classList.add('hidden');
        } else {
            // Scrolling up
            header.classList.remove('hidden');
        }
        lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
    });

    // Toggle modal and animate lines when hamburger is clicked
    hamburgerInput.addEventListener('change', () => {
        if (hamburgerInput.checked) {
            modal.style.display = 'flex';
            menuItems.forEach((item, index) => {
                setTimeout(() => {
                    item.classList.add('draw');
                }, index * 100);
            });
        } else {
            modal.style.display = 'none';
            menuItems.forEach(item => {
                item.classList.remove('draw');
            });
        }
    });

    // Close modal and reset hamburger and lines when close button is clicked
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        hamburgerInput.checked = false;
        menuItems.forEach(item => {
            item.classList.remove('draw');
        });
    });

    // Close modal and reset hamburger and lines if clicking outside the modal content
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            hamburgerInput.checked = false;
            menuItems.forEach(item => {
                item.classList.remove('draw');
            });
        }
    });

    // Добавляем обработчики для навигации по меню
    menuItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            // Закрываем модальное окно
            modal.style.display = 'none';
            hamburgerInput.checked = false;
            menuItems.forEach(item => item.classList.remove('draw'));
            
            // Прокручиваем к соответствующему разделу
            scrollToSection(index);
        });
    });

    // Обработчик для кнопки "ЗАПИСАТЬСЯ" - прокрутка к услугам
    contactBtn.addEventListener('click', () => {
        scrollToServices();
    });

    // Функция для прокрутки к соответствующему разделу
    function scrollToSection(index) {
        const sectionIds = ['main-section', 'services-section', 'specialists-section', 'contacts-section'];
        
        if (sectionIds[index]) {
            const targetSection = document.getElementById(sectionIds[index]);
            if (targetSection) {
                targetSection.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    }

    // Функция для прокрутки к разделу услуг
    function scrollToServices() {
        const servicesSection = document.getElementById('services-section');
        if (servicesSection) {
            servicesSection.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        }
    }
});