# menu_handlers.py
import os
import logging
import requests
from personal_cabinet import show_personal_cabinet, handle_personal_callback
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes
from telegram import InputMediaPhoto

from dotenv import load_dotenv
# Загружаем переменные окружения
load_dotenv('.env')

# Настройка логирования
logger = logging.getLogger(__name__)

# Конфигурация
API_BASE_URL = os.getenv('API_BASE_URL')

# Проверка наличия переменной
if not API_BASE_URL:
    logger.error("❌ API_BASE_URL не установлен в .env файле")

async def show_main_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Показать главное меню с мастерами и услугами"""
    user_id = update.effective_user.id
    
    # Проверяем, является ли пользователь мастером
    is_master = False
    try:
        response = requests.get(f"{API_BASE_URL}/api/specialists-all")
        if response.json()['message'] == 'success':
            masters = response.json()['data']
            is_master = any(m.get('tg_id') == str(user_id) for m in masters)
    except:
        pass
    
    # Получаем название салона и ссылку на сайт из базы данных
    salon_name = None
    site_link = None
    try:
        # Получаем название салона из таблицы страниц
        pages_response = requests.get(f"{API_BASE_URL}/api/pages/главная")
        if pages_response.json()['message'] == 'success':
            pages_data = pages_response.json()['data']
            salon_name = pages_data.get('название_салона')
        
        # Получаем ссылку на сайт
        links_response = requests.get(f"{API_BASE_URL}/api/links")
        if links_response.json()['message'] == 'success':
            links = links_response.json()['data']
            site_link = links.get('site_link')
    except Exception as e:
        logger.error(f"Error fetching salon data: {e}")
    
    keyboard = [
        [
            InlineKeyboardButton("✮ Мастера", callback_data='masters_menu'),
            InlineKeyboardButton("⌘ Услуги", callback_data='services_menu')
        ],
        [InlineKeyboardButton("✎ Записаться", callback_data='book_appointment')],
        [
            InlineKeyboardButton("🛈 Контакты", callback_data='contacts_menu'),
            InlineKeyboardButton("⎋ Личный кабинет", callback_data='personal_cabinet') 
        ]
    ]
    
    # Добавляем кнопку админ-панели если пользователь мастер
    if is_master:
        keyboard.append([InlineKeyboardButton("♔ Админ-панель", callback_data='admin_panel')])
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    # Формируем текст сообщения с приветствием и ссылкой на сайт
    if salon_name:
        message_text = f"○ Добро пожаловать в {salon_name}!"
    else:
        message_text = "○ Добро пожаловать!"

    if site_link:
        message_text += f"\n\n○ Наш сайт: {site_link}"
    
    photo_url = f"{API_BASE_URL}/photo/images/main.jpg"
    
    if hasattr(update, 'callback_query') and update.callback_query:
        query = update.callback_query
        try:
            photo_response = requests.get(photo_url)
            if photo_response.status_code == 200:
                photo_data = photo_response.content
                media = InputMediaPhoto(media=photo_data, caption=message_text)
                await query.edit_message_media(media=media, reply_markup=reply_markup)
            else:
                await query.edit_message_text(text=message_text, reply_markup=reply_markup)
        except Exception as e:
            logger.error(f"Error editing main menu: {e}")
            await query.edit_message_text(text=message_text, reply_markup=reply_markup)
    else:
        try:
            photo_response = requests.get(photo_url)
            if photo_response.status_code == 200:
                photo_data = photo_response.content
                await update.message.reply_photo(
                    photo=photo_data,
                    caption=message_text,
                    reply_markup=reply_markup
                )
            else:
                await update.message.reply_text(
                    text=message_text,
                    reply_markup=reply_markup
                )
        except Exception as e:
            logger.error(f"Error in show_main_menu (no query): {e}")
            await update.message.reply_text(
                text=message_text,
                reply_markup=reply_markup
            )

async def show_contacts_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Показать меню контактов"""
    query = update.callback_query
    await query.answer()
    
    try:
        # Получаем ссылки из базы данных
        response = requests.get(f"{API_BASE_URL}/api/links")
        data = response.json()
        
        if data['message'] == 'success':
            links = data['data']
            
            # Формируем красивое сообщение с контактами
            message = "🛈 Контакты\n\n"
            
            # Добавляем номер телефона если есть и доступен
            if links.get('phone_contact'):
                phone = links['phone_contact']
                # Форматируем номер для красивого отображения
                formatted_phone = format_phone_number(phone)
                message += f"📱 Телефон:  {formatted_phone} \n\n"
            
            message += "💬 Свяжитесь с нами:\n\n"
            
            # Telegram
            if links.get('telegram_contact'):
                telegram_url = links['telegram_contact'].strip()
                if telegram_url.startswith('@'):
                    telegram_url = f"https://t.me/{telegram_url[1:]}"
                elif not telegram_url.startswith(('https://', 'http://')):
                    telegram_url = f"https://t.me/{telegram_url}"
                message += f"📢 Telegram: {telegram_url}\n"
            
            # WhatsApp
            if links.get('whatsapp_contact'):
                whatsapp_url = links['whatsapp_contact'].strip()
                message += f"💚 WhatsApp: {whatsapp_url}\n"
            
            # VK
            if links.get('vk_contact'):
                vk_url = links['vk_contact'].strip()
                message += f"👥 ВКонтакте: {vk_url}\n"
            
            # Email
            if links.get('email_contact'):
                email = links['email_contact'].strip()
                message += f"📧 Email: {email}\n"
            
            # Если нет доступных контактов
            if message == "🛈 Контакты\n\n💬 Свяжитесь с нами:\n\n":
                message += "📭 Контакты временно недоступны\n\n"
            
            # Кнопка назад
            keyboard = [[InlineKeyboardButton("↲ Назад", callback_data='back_to_main')]]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            # Используем фото для контактов
            photo_url = f"{API_BASE_URL}/photo/images/contakts.jpg"
            
            try:
                # Скачиваем фото
                photo_response = requests.get(photo_url)
                if photo_response.status_code == 200:
                    photo_data = photo_response.content
                    
                    # Проверяем, есть ли фото в текущем сообщении
                    if query.message.photo:
                        # Если сообщение с фото, редактируем его
                        media = InputMediaPhoto(media=photo_data, caption=message)
                        await query.edit_message_media(media=media, reply_markup=reply_markup)
                    else:
                        # Если текстовое сообщение, редактируем текст и добавляем фото
                        await query.message.reply_photo(
                            photo=photo_data,
                            caption=message,
                            reply_markup=reply_markup,
                            parse_mode='Markdown'  # Изменено с HTML на Markdown
                        )
                        await query.delete_message()
                else:
                    # Если фото недоступно, редактируем текстовое сообщение
                    if query.message.photo:
                        # Если было фото, переходим на текст
                        await query.edit_message_text(
                            text=message, 
                            reply_markup=reply_markup,
                            parse_mode='Markdown'  # Изменено с HTML на Markdown
                        )
                    else:
                        # Если уже текст, просто редактируем
                        await query.edit_message_text(
                            text=message, 
                            reply_markup=reply_markup,
                            parse_mode='Markdown'  # Изменено с HTML на Markdown
                        )
                        
            except Exception as e:
                logger.error(f"Error editing contacts: {e}")
                # Если не удалось отредактировать с фото, пробуем просто текст
                try:
                    await query.edit_message_text(
                        text=message, 
                        reply_markup=reply_markup,
                        parse_mode='Markdown'  # Изменено с HTML на Markdown
                    )
                except Exception as e2:
                    logger.error(f"Error editing contacts text: {e2}")
                    # Последняя попытка - отправляем новое сообщение
                    await query.message.reply_text(
                        text=message, 
                        reply_markup=reply_markup,
                        parse_mode='Markdown'  # Изменено с HTML на Markdown
                    )
                    
        else:
            message = "❌ Ошибка загрузки контактов"
            keyboard = [[InlineKeyboardButton("☰ Главное меню", callback_data='back_to_main')]]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            if query.message.photo:
                await query.edit_message_caption(caption=message, reply_markup=reply_markup)
            else:
                await query.edit_message_text(text=message, reply_markup=reply_markup)
            
    except Exception as e:
        logger.error(f"Error fetching contacts: {e}")
        message = "❌ Ошибка подключения к серверу"
        keyboard = [[InlineKeyboardButton("☰ Главное меню", callback_data='back_to_main')]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        if query.message.photo:
            await query.edit_message_caption(caption=message, reply_markup=reply_markup)
        else:
            await query.edit_message_text(text=message, reply_markup=reply_markup)



def format_phone_number(phone):
    """Форматирование номера телефона для отображения в формате +79711990304"""
    # Убираем все нецифровые символы
    cleaned = ''.join(filter(str.isdigit, phone))
    
    # Если номер начинается с 7 или 8 и имеет 11 цифр (российский номер)
    if cleaned.startswith(('7', '8')) and len(cleaned) == 11:
        return f"+{cleaned}" if cleaned.startswith('7') else f"+7{cleaned[1:]}"
    # Если номер уже в международном формате (начинается с +7)
    elif cleaned.startswith('7') and len(cleaned) == 11:
        return f"+{cleaned}"
    # Если номер короткий (возможно, без кода страны)
    elif len(cleaned) == 10:
        return f"+7{cleaned}"
    # Для других случаев возвращаем как есть
    else:
        return f"+{cleaned}" if cleaned and not cleaned.startswith('+') else cleaned


async def show_master_detail(update: Update, context: ContextTypes.DEFAULT_TYPE, master_id: str):
    """Показать детальную информацию о мастере"""
    query = update.callback_query
    try:
        response = requests.get(f"{API_BASE_URL}/api/specialist/{master_id}")
        data = response.json()
        
        if data['message'] == 'success':
            master = data['data']
            
            # Формируем сообщение
            message = (
                f"♢ {master['имя']}\n\n"
                f"{master.get('описание', 'Опытный специалист.')}\n\n"
            )
            
            # Добавляем специализацию если есть
            if 'специализация' in master and master['специализация']:
                message += f"✮ Специализация: {master['специализация']}\n\n"
            
            # Добавляем опыт если есть
            if 'опыт' in master and master['опыт']:
                message += f"≣ Опыт работы: {master['опыт']}\n\n"
            
            keyboard = [
                [InlineKeyboardButton("≣ Записаться к мастеру", callback_data=f'book_master_{master_id}')],
                [InlineKeyboardButton("↲ Назад к мастерам", callback_data='masters_menu')],
                [InlineKeyboardButton("☰ Главное меню", callback_data='back_to_main')]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            # Проверяем наличие фото - если фото null, пустое или равно default.jpg, используем фото по умолчанию
            master_photo = master.get('фото')
            has_valid_photo = master_photo and master_photo != 'null' and master_photo.strip() != '' and master_photo != 'photo/работники/default.jpg'
            
            if has_valid_photo:
                try:
                    # Формируем полный URL к фото через API сервера
                    photo_url = f"{API_BASE_URL}/{master_photo}"
                    logger.info(f"Trying to edit with photo from URL: {photo_url}")
                    
                    # Скачиваем фото
                    photo_response = requests.get(photo_url)
                    if photo_response.status_code == 200:
                        photo_data = photo_response.content
                        # Проверяем, есть ли уже фото в сообщении
                        if query.message.photo:
                            media = InputMediaPhoto(media=photo_data, caption=message)
                            await query.edit_message_media(media=media, reply_markup=reply_markup)
                        else:
                            # Если сообщение без фото, отправляем новое сообщение с фото
                            await query.message.reply_photo(
                                photo=photo_data,
                                caption=message,
                                reply_markup=reply_markup
                            )
                            await query.delete_message()
                    else:
                        logger.error(f"Failed to download photo: {photo_response.status_code}")
                        # Если фото не загрузилось, используем текстовое сообщение
                        await query.edit_message_text(text=message, reply_markup=reply_markup)
                except Exception as photo_error:
                    logger.error(f"Error editing with photo: {photo_error}")
                    # В случае ошибки с фото, переходим на текстовое сообщение
                    await query.edit_message_text(text=message, reply_markup=reply_markup)
            else:
                # Используем фото по умолчанию для мастеров
                try:
                    default_photo_url = f"{API_BASE_URL}/photo/работники/default.jpg"
                    logger.info(f"Using default master photo: {default_photo_url}")
                    
                    photo_response = requests.get(default_photo_url)
                    if photo_response.status_code == 200:
                        photo_data = photo_response.content
                        if query.message.photo:
                            media = InputMediaPhoto(media=photo_data, caption=message)
                            await query.edit_message_media(media=media, reply_markup=reply_markup)
                        else:
                            await query.message.reply_photo(
                                photo=photo_data,
                                caption=message,
                                reply_markup=reply_markup
                            )
                            await query.delete_message()
                    else:
                        logger.error(f"Failed to download default photo: {photo_response.status_code}")
                        await query.edit_message_text(text=message, reply_markup=reply_markup)
                except Exception as default_photo_error:
                    logger.error(f"Error with default photo: {default_photo_error}")
                    await query.edit_message_text(text=message, reply_markup=reply_markup)
                
        else:
            message = "❌ Ошибка загрузки информации о мастере"
            keyboard = [
                [InlineKeyboardButton("↲ Назад", callback_data='masters_menu')],
                [InlineKeyboardButton("☰ Главное меню", callback_data='back_to_main')]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            await query.edit_message_text(text=message, reply_markup=reply_markup)
            
    except Exception as e:
        logger.error(f"Error fetching master detail: {e}")
        message = "❌ Ошибка подключения к серверу"
        keyboard = [
            [InlineKeyboardButton("↲ Назад", callback_data='masters_menu')],
            [InlineKeyboardButton("☰ Главное меню", callback_data='back_to_main')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text=message, reply_markup=reply_markup)



async def show_masters_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Показать меню мастеров"""
    query = update.callback_query
    photo_url = f"{API_BASE_URL}/photo/images/master.jpg"
    try:
        response = requests.get(f"{API_BASE_URL}/api/specialists")
        data = response.json()
        
        if data['message'] == 'success':
            masters = data['data']
            keyboard = []
            
            for master in masters:
                keyboard.append([
                    InlineKeyboardButton(
                        f"♢ {master['имя']}",
                        callback_data=f'master_detail_{master["id"]}'
                    )
                ])
            
            keyboard.append([InlineKeyboardButton("↲ Назад", callback_data='back_to_main')])
            reply_markup = InlineKeyboardMarkup(keyboard)
            message_text = (
                "♢ Наши мастера\n\n"
                "Нажмите на мастера чтобы узнать больше:"
            )
            
            try:
                # Скачиваем фото
                photo_response = requests.get(photo_url)
                if photo_response.status_code == 200:
                    photo_data = photo_response.content
                    media = InputMediaPhoto(media=photo_data, caption=message_text)
                    await query.edit_message_media(media=media, reply_markup=reply_markup)
                else:
                    await query.edit_message_text(text=message_text, reply_markup=reply_markup)
            except Exception as e:
                logger.error(f"Error in show_masters_menu: {e}")
                await query.edit_message_text(text=message_text, reply_markup=reply_markup)
        else:
            message_text = "❌ Ошибка загрузки мастеров"
            keyboard = [[InlineKeyboardButton("☰ Главное меню", callback_data='back_to_main')]]
            reply_markup = InlineKeyboardMarkup(keyboard)
            await query.edit_message_text(text=message_text, reply_markup=reply_markup)
                
    except Exception as e:
        logger.error(f"Error fetching masters: {e}")
        message_text = "❌ Ошибка подключения к серверу"
        keyboard = [[InlineKeyboardButton("☰ Главное меню", callback_data='back_to_main')]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text=message_text, reply_markup=reply_markup)

async def show_services_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Показать меню услуг"""
    query = update.callback_query
    photo_url = f"{API_BASE_URL}/photo/images/services.jpg"
    try:
        response = requests.get(f"{API_BASE_URL}/api/services")
        data = response.json()
        
        if data['message'] == 'success':
            services = data['data']
            keyboard = []
            
            for service in services:
                keyboard.append([
                    InlineKeyboardButton(
                        f"✮ {service['название']} - {service['цена']}₽",
                        callback_data=f'service_detail_{service["id"]}'
                    )
                ])
            
            keyboard.append([InlineKeyboardButton("↲ Назад", callback_data='back_to_main')])
            reply_markup = InlineKeyboardMarkup(keyboard)
            message_text = (
                "✮ Наши услуги\n\n"
                "Нажмите на услугу чтобы узнать больше:"
            )
            
            try:
                # Скачиваем фото
                photo_response = requests.get(photo_url)
                if photo_response.status_code == 200:
                    photo_data = photo_response.content
                    media = InputMediaPhoto(media=photo_data, caption=message_text)
                    await query.edit_message_media(media=media, reply_markup=reply_markup)
                else:
                    await query.edit_message_text(text=message_text, reply_markup=reply_markup)
            except Exception as e:
                logger.error(f"Error in show_services_menu: {e}")
                await query.edit_message_text(text=message_text, reply_markup=reply_markup)
        else:
            message_text = "❌ Ошибка загрузки услуг"
            keyboard = [[InlineKeyboardButton("☰ Главное меню", callback_data='back_to_main')]]
            reply_markup = InlineKeyboardMarkup(keyboard)
            await query.edit_message_text(text=message_text, reply_markup=reply_markup)
                
    except Exception as e:
        logger.error(f"Error fetching services: {e}")
        message_text = "❌ Ошибка подключения к серверу"
        keyboard = [[InlineKeyboardButton("☰ Главное меню", callback_data='back_to_main')]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text=message_text, reply_markup=reply_markup)

async def show_service_detail(update: Update, context: ContextTypes.DEFAULT_TYPE, service_id: str):
    """Показать детальную информацию об услуге"""
    query = update.callback_query
    try:
        response = requests.get(f"{API_BASE_URL}/api/service/{service_id}")
        data = response.json()
        
        if data['message'] == 'success':
            service = data['data']
            
            # Формируем сообщение
            message = (
                f"✮ {service['название']}\n\n"
                f"₽ Цена: {service['цена']}₽\n\n"
                f"{service.get('описание', 'Качественное выполнение услуги.')}\n\n"
            )
            
            # Добавляем длительность если есть
            if 'длительность' in service and service['длительность']:
                message += f"○ Длительность: {service['длительность']} минут\n\n"
            
            keyboard = [
                [InlineKeyboardButton("≣ Записаться на услугу", callback_data=f'book_service_{service_id}')],
                [InlineKeyboardButton("↲ Назад к услугам", callback_data='services_menu')],
                [InlineKeyboardButton("☰ Главное меню", callback_data='back_to_main')]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            # Проверяем наличие фото - если фото null, пустое или равно default.jpg, используем фото по умолчанию
            service_photo = service.get('фото')
            has_valid_photo = service_photo and service_photo != 'null' and service_photo.strip() != '' and service_photo != 'photo/услуги/default.jpg'
            
            if has_valid_photo:
                try:
                    # Формируем полный URL к фото через API сервера
                    photo_url = f"{API_BASE_URL}/{service_photo}"
                    logger.info(f"Trying to edit with service photo from URL: {photo_url}")
                    
                    # Скачиваем фото
                    photo_response = requests.get(photo_url)
                    if photo_response.status_code == 200:
                        photo_data = photo_response.content
                        if query.message.photo:
                            media = InputMediaPhoto(media=photo_data, caption=message)
                            await query.edit_message_media(media=media, reply_markup=reply_markup)
                        else:
                            await query.message.reply_photo(
                                photo=photo_data,
                                caption=message,
                                reply_markup=reply_markup
                            )
                            await query.delete_message()
                    else:
                        logger.error(f"Failed to download service photo: {photo_response.status_code}")
                        await query.edit_message_text(text=message, reply_markup=reply_markup)
                except Exception as photo_error:
                    logger.error(f"Error editing with service photo: {photo_error}")
                    await query.edit_message_text(text=message, reply_markup=reply_markup)
            else:
                # Используем фото по умолчанию для услуг
                try:
                    default_photo_url = f"{API_BASE_URL}/photo/услуги/default.jpg"
                    logger.info(f"Using default service photo: {default_photo_url}")
                    
                    photo_response = requests.get(default_photo_url)
                    if photo_response.status_code == 200:
                        photo_data = photo_response.content
                        if query.message.photo:
                            media = InputMediaPhoto(media=photo_data, caption=message)
                            await query.edit_message_media(media=media, reply_markup=reply_markup)
                        else:
                            await query.message.reply_photo(
                                photo=photo_data,
                                caption=message,
                                reply_markup=reply_markup
                            )
                            await query.delete_message()
                    else:
                        logger.error(f"Failed to download default service photo: {photo_response.status_code}")
                        await query.edit_message_text(text=message, reply_markup=reply_markup)
                except Exception as default_photo_error:
                    logger.error(f"Error with default service photo: {default_photo_error}")
                    await query.edit_message_text(text=message, reply_markup=reply_markup)
                
        else:
            message = "❌ Ошибка загрузки информации об услуге"
            keyboard = [
                [InlineKeyboardButton("↲ Назад", callback_data='services_menu')],
                [InlineKeyboardButton("☰ Главное меню", callback_data='back_to_main')]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            await query.edit_message_text(text=message, reply_markup=reply_markup)
            
    except Exception as e:
        logger.error(f"Error fetching service detail: {e}")
        message = "❌ Ошибка подключения к серверу"
        keyboard = [
            [InlineKeyboardButton("↲ Назад", callback_data='services_menu')],
            [InlineKeyboardButton("☰ Главное меню", callback_data='back_to_main')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text=message, reply_markup=reply_markup)




async def handle_menu_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик callback запросов меню"""
    query = update.callback_query
    await query.answer()
    
    data = query.data
    
    if data == 'back_to_main':
        await show_main_menu(update, context)
    elif data == 'masters_menu':
        await show_masters_menu(update, context)
    elif data == 'services_menu':
        await show_services_menu(update, context)
    elif data == 'contacts_menu':  # Новая обработка
        await show_contacts_menu(update, context)
    elif data.startswith('master_detail_'):
        master_id = data.split('_')[2]
        await show_master_detail(update, context, master_id)
    elif data.startswith('service_detail_'):
        service_id = data.split('_')[2]
        await show_service_detail(update, context, service_id)
    elif data.startswith('book_master_'):
        master_id = data.split('_')[2]
        await show_booking_options_with_master(query, master_id)
    elif data.startswith('book_service_'):
        service_id = data.split('_')[2]
        await show_booking_options_with_service(query, service_id)
    elif data == 'cancel_to_main':
        await show_main_menu(update, context)
    elif data == 'personal_cabinet':
        await show_personal_cabinet(update, context)


# menu_handlers.py - добавить эту функцию
async def logout_from_cabinet(update: Update, context: ContextTypes.DEFAULT_TYPE, user_id: int):
    """Выйти из личного кабинета - сбросить tg_id и вернуться в главное меню"""
    query = update.callback_query
    
    try:
        # Получаем данные клиента для поиска ID
        response = requests.get(f"{API_BASE_URL}/api/client/by-tg/{user_id}")
        data = response.json()

        if data['message'] == 'success' and data['data']:
            client_data = data['data']
            client_id = client_data['id']
            
            # Сбрасываем tg_id в NULL
            update_response = requests.patch(f"{API_BASE_URL}/api/client/{client_id}", json={'tg_id': None})
            
            if update_response.json()['message'] == 'success':
                message_text = "✅ Вы вышли из личного кабинета. Для доступа потребуется повторная регистрация."
                
                # Показываем главное меню
                await show_main_menu(update, context)
                
                # Отправляем сообщение о выходе (если есть сообщение для редактирования)
                if hasattr(query, 'message') and query.message:
                    await query.message.reply_text(message_text)
            else:
                message_text = "❌ Ошибка при выходе из личного кабинета"
                if hasattr(query, 'edit_message_caption'):
                    await query.edit_message_caption(caption=message_text)
                else:
                    await query.message.reply_text(message_text)
        else:
            message_text = "❌ Вы не были зарегистрированы в личном кабинете"
            if hasattr(query, 'edit_message_caption'):
                await query.edit_message_caption(caption=message_text)
            else:
                await query.message.reply_text(message_text)
            
    except Exception as e:
        logger.error(f"Error during logout: {e}")
        message_text = "❌ Ошибка подключения к серверу"
        if hasattr(query, 'edit_message_caption'):
            await query.edit_message_caption(caption=message_text)
        else:
            await query.message.reply_text(message_text)
async def show_booking_options_with_master(query, master_id):
    """Показать варианты записи для выбранного мастера"""
    from main import show_services_for_specialist
    try:
        await show_services_for_specialist(query, master_id)
    except Exception as e:
        logger.error(f"Error in show_booking_options_with_master: {e}")
        message_text = "❌ Ошибка при загрузке услуг для мастера"
        keyboard = [
            [InlineKeyboardButton("↲ Назад", callback_data='masters_menu')],
            [InlineKeyboardButton("☰ Главное меню", callback_data='cancel_to_main')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        try:
            if query.message.photo:
                await query.edit_message_caption(caption=message_text, reply_markup=reply_markup)
            else:
                await query.edit_message_text(text=message_text, reply_markup=reply_markup)
        except Exception as edit_error:
            logger.error(f"Error editing error message: {edit_error}")
            await query.message.reply_text(text=message_text, reply_markup=reply_markup)



            
async def show_booking_options_with_service(query, service_id):
    """Показать варианты записи для выбранной услуги"""
    from main import show_specialists_for_service
    try:
        await show_specialists_for_service(query, service_id)
    except Exception as e:
        logger.error(f"Error in show_booking_options_with_service: {e}")
        message_text = "❌ Ошибка при загрузке мастеров для услуги"
        keyboard = [
            [InlineKeyboardButton("↲ Назад", callback_data='services_menu')],
            [InlineKeyboardButton("☰ Главное меню", callback_data='cancel_to_main')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text=message_text, reply_markup=reply_markup)