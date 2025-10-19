// header.js - исправленная версия


async function loadHomeContent() {
    try {
        // Загружаем контент главной страницы
        const homeResponse = await fetch('/api/home-content');
        if (!homeResponse.ok) {
            throw new Error('Ошибка загрузки контента главной страницы');
        }
        
        const homeData = await homeResponse.json();
        if (homeData.message === 'success') {
            updateHomeContent(homeData.data);
        }
        
        // Загружаем данные администратора из страницы "контакты"
        const contactsResponse = await fetch('/api/pages/контакты');
        if (!contactsResponse.ok) {
            throw new Error('Ошибка загрузки данных администратора');
        }
        
        const contactsData = await contactsResponse.json();
        if (contactsData.message === 'success') {
            updateAdminData(contactsData.data);
        }
        
    } catch (error) {
        console.error('Ошибка загрузки контента:', error);
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
            updatePhoneNumber(data.data);
        }
    } catch (error) {
        console.error('Ошибка загрузки ссылок:', error);
        applyDefaultLinks();
    }
}

// header.js - добавить после функции loadLinks()

async function loadContactVisibility() {
    try {
        const response = await fetch('/api/contact-visibility');
        if (!response.ok) {
            throw new Error('Ошибка загрузки видимости контактов');
        }
        
        const data = await response.json();
        if (data.message === 'success') {
            applyContactVisibility(data.data);
        }
    } catch (error) {
        console.error('Ошибка загрузки видимости контактов:', error);
        applyDefaultContactVisibility();
    }
}

// Функция применения видимости контактов
function applyContactVisibility(visibility) {
    const contactSection = document.getElementById('contacts-section');
    if (!contactSection) return;
    
    // Маппинг типов контактов на CSS классы
    const contactMap = {
        'vk_contact': 'contact-link-vk',
        'telegram_contact': 'contact-link-telegram', 
        'whatsapp_contact': 'contact-link-whatsapp',
        'email_contact': 'contact-link-mail',
        'phone_contact': 'contact-link-phone'
    };
    
    // Применяем видимость для каждого типа контакта
    Object.keys(contactMap).forEach(contactType => {
        const contactElement = contactSection.querySelector(`.${contactMap[contactType]}`);
        if (contactElement) {
            if (visibility[contactType]) {
                contactElement.style.display = 'flex'; // Показываем
            } else {
                contactElement.style.display = 'none'; // Скрываем
            }
        }
    });
    
    // Особый случай для номера телефона в тексте
    const phoneNumberElement = contactSection.querySelector('.phone-number');
    if (phoneNumberElement) {
        if (visibility['phone_contact']) {
            phoneNumberElement.style.display = 'block';
        } else {
            phoneNumberElement.style.display = 'none';
        }
    }
}



// Функция обновления номера телефона
function updatePhoneNumber(links) {
    if (links.phone_contact) {
        const phoneNumberElement = document.querySelector('.phone-number');
        if (phoneNumberElement) {
            const formattedPhone = formatPhoneNumber(links.phone_contact);
            phoneNumberElement.textContent = formattedPhone;
            phoneNumberElement.href = `tel:${links.phone_contact.replace(/\D/g, '')}`;
        }
        
        const phoneLinks = document.querySelectorAll('a[href^="tel:"]');
        phoneLinks.forEach(link => {
            if (link !== phoneNumberElement) {
                link.href = `tel:${links.phone_contact.replace(/\D/g, '')}`;
            }
        });
    }
}

// Функция форматирования номера телефона
function formatPhoneNumber(phone) {
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length === 11 && (cleaned.startsWith('7') || cleaned.startsWith('8'))) {
        return `+7 (${cleaned.substring(1, 4)}) ${cleaned.substring(4, 7)}-${cleaned.substring(7, 9)}-${cleaned.substring(9)}`;
    }
    
    return phone;
}

function updateHomeContent(content) {
    // Обновляем основные элементы
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
    
    // Обновляем данные администратора из того же контента
    updateAdminData(content);
}

// Функция обновления данных администратора
function updateAdminData(content) {
    // Обновляем имя администратора
    const adminNameElement = document.querySelector('.profile-name');
    if (adminNameElement && content.имя_администратора) {
        adminNameElement.textContent = content.имя_администратора;
    }
    
    // Обновляем фото администратора
    if (content.фото_администратора) {
        updateAdminPhoto(content.фото_администратора);
    }
}

// Функция обновления фото администратора
function updateAdminPhoto(photoUrl) {
    const adminPhoto = document.querySelector('.profile-photo');
    if (adminPhoto && photoUrl) {
        const timestamp = new Date().getTime();
        adminPhoto.src = photoUrl + '?t=' + timestamp;
        
        adminPhoto.onerror = function() {
            console.error('Ошибка загрузки фото администратора:', photoUrl);
            this.src = 'photo/работники/default.jpg';
        };
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
    
    // Phone ссылка - ДОБАВЛЯЕМ ЭТУ ЧАСТЬ
    if (links.phone_contact) {
        const phoneLink = contactSection.querySelector('a.contact-link-phone');
        if (phoneLink) {
            phoneLink.href = `tel:${links.phone_contact.replace(/\D/g, '')}`;
        }
    }
    
    // Обновляем номер телефона в тексте
    if (links.phone_contact) {
        updatePhoneNumber(links);
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
        phone_contact: '89255355278'
    };
    applyLinks(defaultLinks);
    updatePhoneNumber(defaultLinks);
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
    loadContactVisibility(); // ДОБАВИТЬ ЭТУ СТРОЧКУ
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