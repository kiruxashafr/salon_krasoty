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
    
    keyboard = [
        [
            InlineKeyboardButton("✮ Мастера", callback_data='masters_menu'),
            InlineKeyboardButton("⌘ Услуги", callback_data='services_menu')
        ],
        [InlineKeyboardButton("✎ Записаться", callback_data='book_appointment')],
        [InlineKeyboardButton("🛈 Контакты", callback_data='contacts_menu')],  # Новая кнопка
        [InlineKeyboardButton("⎋ Личный кабинет", callback_data='personal_cabinet')]
    ]
    
    # Добавляем кнопку админ-панели если пользователь мастер
    if is_master:
        keyboard.append([InlineKeyboardButton("♔ Админ-панель", callback_data='admin_panel')])
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    message_text = "☰ Главное меню"
    
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
            
            # Добавляем номер телефона если есть
            if links.get('phone_contact'):
                phone = links['phone_contact']
                # Форматируем номер для красивого отображения и делаем его копируемым
                formatted_phone = format_phone_number(phone)
                message += f"📱 Телефон:\n<code>{formatted_phone}</code>\n\n"
            
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
            
            # Кнопка назад
            keyboard = [[InlineKeyboardButton("↲ Назад", callback_data='back_to_main')]]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            # Используем фото для контактов
            photo_url = f"{API_BASE_URL}/photo/images/contakts.jpg"
            
            try:
                # Сначала пытаемся отправить новое сообщение с фото
                photo_response = requests.get(photo_url)
                if photo_response.status_code == 200:
                    photo_data = photo_response.content
                    await query.message.reply_photo(
                        photo=photo_data,
                        caption=message,
                        reply_markup=reply_markup,
                        parse_mode='HTML'  # Добавляем поддержку HTML
                    )
                    await query.delete_message()
                else:
                    # Если фото недоступно, отправляем текстовое сообщение
                    await query.message.reply_text(
                        text=message, 
                        reply_markup=reply_markup,
                        parse_mode='HTML'  # Добавляем поддержку HTML
                    )
                    await query.delete_message()
                    
            except Exception as e:
                logger.error(f"Error sending contacts with photo: {e}")
                # Если не удалось отправить с фото, пробуем просто текст
                try:
                    await query.message.reply_text(
                        text=message, 
                        reply_markup=reply_markup,
                        parse_mode='HTML'  # Добавляем поддержку HTML
                    )
                    await query.delete_message()
                except Exception as e2:
                    logger.error(f"Error sending contacts text: {e2}")
                    await query.message.reply_text(
                        text=message, 
                        reply_markup=reply_markup,
                        parse_mode='HTML'  # Добавляем поддержку HTML
                    )
                    await query.delete_message()
                    
        else:
            message = "❌ Ошибка загрузки контактов"
            keyboard = [[InlineKeyboardButton("☰ Главное меню", callback_data='back_to_main')]]
            reply_markup = InlineKeyboardMarkup(keyboard)
            await query.message.reply_text(text=message, reply_markup=reply_markup)
            await query.delete_message()
            
    except Exception as e:
        logger.error(f"Error fetching contacts: {e}")
        message = "❌ Ошибка подключения к серверу"
        keyboard = [[InlineKeyboardButton("☰ Главное меню", callback_data='back_to_main')]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.message.reply_text(text=message, reply_markup=reply_markup)
        await query.delete_message()



def format_phone_number(phone):
    """Форматирование номера телефона для красивого отображения"""
    # Убираем все нецифровые символы
    cleaned = ''.join(filter(str.isdigit, phone))
    
    if cleaned.startswith('7') and len(cleaned) == 11:
        return f"+7 ({cleaned[1:4]}) {cleaned[4:7]}-{cleaned[7:9]}-{cleaned[9:]}"
    elif cleaned.startswith('8') and len(cleaned) == 11:
        return f"+7 ({cleaned[1:4]}) {cleaned[4:7]}-{cleaned[7:9]}-{cleaned[9:]}"
    else:
        return phone
    


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
            
            # Проверяем наличие фото
            if 'фото' in master and master['фото'] and master['фото'] != 'photo/работники/default.jpg':
                try:
                    # Формируем полный URL к фото через API сервера
                    photo_url = f"{API_BASE_URL}/{master['фото']}"
                    logger.info(f"Trying to edit with photo from URL: {photo_url}")
                    
                    # Скачиваем фото
                    photo_response = requests.get(photo_url)
                    if photo_response.status_code == 200:
                        photo_data = photo_response.content
                        media = InputMediaPhoto(media=photo_data, caption=message)
                        await query.edit_message_media(media=media, reply_markup=reply_markup)
                    else:
                        logger.error(f"Failed to download photo: {photo_response.status_code}")
                        await query.edit_message_text(text=message, reply_markup=reply_markup)
                except Exception as photo_error:
                    logger.error(f"Error editing with photo: {photo_error}")
                    await query.edit_message_text(text=message, reply_markup=reply_markup)
            else:
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
            
            # Проверяем наличие фото
            if 'фото' in service and service['фото'] and service['фото'] != 'photo/услуги/default.jpg':
                try:
                    # Формируем полный URL к фото через API сервера
                    photo_url = f"{API_BASE_URL}/{service['фото']}"
                    logger.info(f"Trying to edit with service photo from URL: {photo_url}")
                    
                    # Скачиваем фото
                    photo_response = requests.get(photo_url)
                    if photo_response.status_code == 200:
                        photo_data = photo_response.content
                        media = InputMediaPhoto(media=photo_data, caption=message)
                        await query.edit_message_media(media=media, reply_markup=reply_markup)
                    else:
                        logger.error(f"Failed to download service photo: {photo_response.status_code}")
                        await query.edit_message_text(text=message, reply_markup=reply_markup)
                except Exception as photo_error:
                    logger.error(f"Error editing with service photo: {photo_error}")
                    await query.edit_message_text(text=message, reply_markup=reply_markup)
            else:
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
        await query.edit_message_text(text=message_text, reply_markup=reply_markup)

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