// header.js - исправленная версия

async function loadHomeContent() {
    try {
        const response = await fetch('/api/home-content');
        if (!response.ok) {
            throw new Error('Ошибка загрузки контента');
        }
        
        const data = await response.json();
        if (data.message === 'success') {
            updateHomeContent(data.data);
        }
    } catch (error) {
        console.error('Ошибка загрузки контента главной страницы:', error);
    }
}

function updateHomeContent(content) {
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle && content.заголовок) {
        heroTitle.textContent = content.заголовок;
    }
    
    const heroDescription = document.querySelector('.hero-description');
    if (heroDescription && content.описание) {
        heroDescription.textContent = content.описание;
    }
    
    const logo = document.querySelector('.logo');
    if (logo && content.название_салона) {
        logo.textContent = content.название_салона;
    }
    
    const contactBtn = document.querySelector('.contact-btn');
    if (contactBtn && content.кнопка_записи) {
        contactBtn.textContent = content.кнопка_записи;
    }
}

async function loadLinks() {
    try {
        const response = await fetch('/api/links');
        if (!response.ok) {
            throw new Error('Ошибка загрузки ссылок');
        }
        
        const data = await response.json();
        if (data.message === 'success') {
            applyLinks(data.data);
        }
    } catch (error) {
        console.error('Ошибка загрузки ссылок:', error);
        applyDefaultLinks();
    }
}

// Функция применения ссылок ко всем элементам страницы
function applyLinks(links) {
    // Ссылка на Telegram бота (кнопка в герое)
    const telegramBotBtn = document.querySelector('.buttonn');
    if (telegramBotBtn && links.telegram_bot) {
        telegramBotBtn.href = links.telegram_bot;
    }
    
    // Ссылки в хедере (модальное окно меню)
    updateHeaderLinks(links);
    
    // Ссылки в секции контактов
    updateContactSectionLinks(links);
    
    // Ссылки в модальном окне "О нас"
    updateAboutModalLinks(links);
}

// Обновление ссылок в хедере (модальное окно меню)
function updateHeaderLinks(links) {
    const modal = document.getElementById('modal');
    if (!modal) return;
    
    if (links.vk_contact) {
        const vkLinks = modal.querySelectorAll('a[href*="vk.com"]');
        vkLinks.forEach(link => link.href = links.vk_contact);
    }
    
    if (links.telegram_contact) {
        const tgLinks = modal.querySelectorAll('a[href*="t.me"]');
        tgLinks.forEach(link => {
            if (!link.href.includes('shafrbeautybot')) {
                link.href = links.telegram_contact;
            }
        });
    }
}

// Обновление ссылок в секции контактов
function updateContactSectionLinks(links) {
    const contactSection = document.getElementById('contacts-section');
    if (!contactSection) return;
    
    // VK ссылка
    if (links.vk_contact) {
        const vkLink = contactSection.querySelector('a.contact-link-vk');
        if (vkLink) vkLink.href = links.vk_contact;
    }
    
    // Telegram ссылка
    if (links.telegram_contact) {
        const tgLink = contactSection.querySelector('a.contact-link-telegram');
        if (tgLink) tgLink.href = links.telegram_contact;
    }
    
    // WhatsApp ссылка
    if (links.whatsapp_contact) {
        const waLink = contactSection.querySelector('a.contact-link-whatsapp');
        if (waLink) waLink.href = links.whatsapp_contact;
    }
    
    // Email ссылка
    if (links.email_contact) {
        const emailLink = contactSection.querySelector('a.contact-link-mail');
        if (emailLink) emailLink.href = `mailto:${links.email_contact}`;
    }
    
    // Phone ссылка
    if (links.phone_contact) {
        const phoneLink = contactSection.querySelector('a.contact-link-phone');
        if (phoneLink) phoneLink.href = `tel:${links.phone_contact.replace(/\D/g, '')}`;
    }
}

// Обновление ссылок в модальном окне "О нас"
function updateAboutModalLinks(links) {
    const aboutModal = document.getElementById('about-modal');
    if (!aboutModal) return;
    
    if (links.vk_contact) {
        const vkLinks = aboutModal.querySelectorAll('a[href*="vk.com"]');
        vkLinks.forEach(link => link.href = links.vk_contact);
    }
    
    if (links.telegram_contact) {
        const tgLinks = aboutModal.querySelectorAll('a[href*="t.me"]');
        tgLinks.forEach(link => {
            if (!link.href.includes('shafrbeautybot')) {
                link.href = links.telegram_contact;
            }
        });
    }
}

// Функция для ссылок по умолчанию (на случай ошибки)
function applyDefaultLinks() {
    const defaultLinks = {
        vk_contact: 'https://m.vk.com/shafranov_k',
        telegram_contact: 'https://t.me/Shafranov_k',
        whatsapp_contact: 'https://wa.me/qr/QKNVZOAIILZNM1',
        email_contact: 'mailto:kirshafranov@gmail.com',
        phone_contact: 'tel:89255355278'
    };
    applyLinks(defaultLinks);
}

async function checkContactsVisibility() {
    try {
        const response = await fetch('/api/settings');
        if (response.ok) {
            const data = await response.json();
            if (data.message === 'success') {
                const showContacts = data.data.show_contacts === '1';
                
                const contactsSection = document.getElementById('contacts-section');
                if (contactsSection) {
                    if (showContacts) {
                        contactsSection.classList.remove('hidden');
                    } else {
                        contactsSection.classList.add('hidden');
                    }
                }
                
                const contactsMenuItem = document.querySelector('.modal-content ul li:nth-child(4)');
                if (contactsMenuItem) {
                    contactsMenuItem.style.display = showContacts ? 'block' : 'none';
                }
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки настроек видимости:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('modal');
    const hamburgerInput = document.querySelector('.hamburger input');
    const closeBtn = document.querySelector('.close-btn');
    const menuItems = document.querySelectorAll('.modal-content ul li');
    const contactBtn = document.querySelector('.header .contact-btn');

    let lastScrollTop = 0;
    const header = document.querySelector('.header');

    // Загружаем контент и ссылки
    loadHomeContent();
    loadLinks();
    checkContactsVisibility();

    window.addEventListener('scroll', () => {
        let currentScroll = window.pageYOffset || document.documentElement.scrollTop;
        
        if (currentScroll > lastScrollTop) {
            header.classList.add('hidden');
        } else {
            header.classList.remove('hidden');
        }
        lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
    });

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

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        hamburgerInput.checked = false;
        menuItems.forEach(item => {
            item.classList.remove('draw');
        });
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            hamburgerInput.checked = false;
            menuItems.forEach(item => {
                item.classList.remove('draw');
            });
        }
    });

    menuItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            modal.style.display = 'none';
            hamburgerInput.checked = false;
            menuItems.forEach(item => item.classList.remove('draw'));
            scrollToSection(index);
        });
    });

    contactBtn.addEventListener('click', () => {
        scrollToServices();
    });

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