# main.py
import os
import logging
import requests
from datetime import datetime, timedelta
from menu_handlers import show_main_menu, handle_menu_callback
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, InputMediaPhoto
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes, MessageHandler, filters

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Конфигурация
BOT_TOKEN = os.getenv('BOT_TOKEN', '8456369002:AAFaxelo1bXHy2hzv5vUwwt8pMAUVu5SHlM')
API_BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:3000')

# Состояния пользователей
user_states = {}

# Словарь для перевода английских дней недели в русские сокращения
WEEKDAY_MAP = {
    'Mon': 'пн',
    'Tue': 'вт',
    'Wed': 'ср',
    'Thu': 'чт',
    'Fri': 'пт',
    'Sat': 'сб',
    'Sun': 'вс'
}

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик команды /start"""
    await show_main_menu(update, context)

async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик callback запросов"""
    query = update.callback_query
    await query.answer()
    
    user_id = query.from_user.id
    data = query.data
    
    # Обрабатываем callback запросы меню
    if data in ['back_to_main', 'masters_menu', 'services_menu'] or \
       data.startswith('master_detail_') or data.startswith('service_detail_') or \
       data.startswith('book_master_') or data.startswith('book_service_'):
        await handle_menu_callback(update, context)
        return
    
    if data == 'book_appointment':
        await show_booking_options(query)
    elif data == 'choose_service':
        await show_services(query)
    elif data == 'choose_specialist':
        await show_specialists(query)
    elif data.startswith('service_'):
        service_id = data.split('_')[1]
        await show_specialists_for_service(query, service_id)
    elif data.startswith('specialist_'):
        specialist_id = data.split('_')[1]
        await show_services_for_specialist(query, specialist_id)
    elif data.startswith('date_nav_'):
        parts = data.split('_')
        direction = parts[2]
        target_date_str = parts[3]
        user_data = user_states.get(user_id, {})
        await show_date_selection(query, user_data.get('specialist_id'), user_data.get('service_id'), target_date_str)
    elif data.startswith('select_date_'):
        date_str = data.split('_')[2]
        await show_time_slots(query, date_str)
    elif data.startswith('time_slot_'):
        time_data = data.split('_')[2]
        await confirm_booking(query, time_data)
    elif data == 'view_week_schedule':
        await show_week_schedule(query)
    elif data == 'back_to_main':
        await start_callback(query)
    elif data == 'no_date_available':
        await query.answer("На эту дату нет свободного времени")
    elif data == 'back_to_selection':
        await show_booking_options(query)
    elif data.startswith('select_service_'):
        parts = data.split('_')
        service_id = parts[2]
        specialist_id = parts[3]
        await show_date_selection(query, specialist_id, service_id)
    elif data.startswith('select_specialist_'):
        parts = data.split('_')
        specialist_id = parts[2]
        service_id = parts[3]
        await show_date_selection(query, specialist_id, service_id)
    elif data.startswith('all_specialists_schedule_'):
        service_id = data.split('_')[3]
        await show_all_specialists_schedule(query, service_id)
    elif data == 'no_available_options':
        await query.answer("На данный момент нет доступных вариантов")
    elif data == 'try_later':
        await query.answer("Попробуйте позже")
    elif data.startswith('week_nav_'):
        parts = data.split('_')
        direction = parts[2]
        target_date_str = parts[3]
        await show_week_schedule(query, target_date_str)
    elif data.startswith('all_schedule_nav_'):
        parts = data.split('_')
        direction = parts[3]
        target_date_str = parts[4]
        service_id = parts[5]
        await show_all_specialists_schedule(query, service_id, target_date_str)
    elif data == 'cancel_to_main':
        await start_callback(query)

async def show_booking_options(query):
    """Показать варианты записи"""
    keyboard = [
        [InlineKeyboardButton("Выбрать услугу", callback_data='choose_service')],
        [InlineKeyboardButton("Выбрать мастера", callback_data='choose_specialist')],
        [InlineKeyboardButton("Посмотреть свободное время на неделю", callback_data='view_week_schedule')],
        [InlineKeyboardButton("☰ Главное меню", callback_data='cancel_to_main')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    message_text = "Как вы хотите записаться?"
    
    photo_url = f"{API_BASE_URL}/photo/images/main.jpg"
    
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
        logger.error(f"Error in show_booking_options: {e}")
        await query.edit_message_text(text=message_text, reply_markup=reply_markup)

async def show_services(query):
    """Показать список услуг с доступным временем (в будущем)"""
    photo_url = f"{API_BASE_URL}/photo/images/main.jpg"
    try:
        response = requests.get(f"{API_BASE_URL}/api/services")
        data = response.json()
        
        if data['message'] == 'success':
            services = data['data']
            keyboard = []
            
            for service in services:
                specialists_response = requests.get(f"{API_BASE_URL}/api/service/{service['id']}/specialists")
                
                if specialists_response.json()['message'] == 'success':
                    specialists = specialists_response.json()['data']
                    
                    has_available_time = False
                    for specialist in specialists:
                        # Проверяем доступное время в будущем (без ограничения по дате)
                        dates_response = requests.get(
                            f"{API_BASE_URL}/api/specialist/{specialist['id']}/service/{service['id']}/available-dates",
                            params={'start': datetime.now().strftime('%Y-%m-%d'), 'end': '2099-12-31'}
                        )
                        
                        if (dates_response.json()['message'] == 'success' and 
                            dates_response.json()['availableDates']):
                            has_available_time = True
                            break
                    
                    if has_available_time:
                        keyboard.append([
                            InlineKeyboardButton(
                                f"{service['название']} - {service['цена']}₽",
                                callback_data=f'service_{service["id"]}'
                            )
                        ])
            
            if not keyboard:
                message_text = (
                    "❌ На данный момент нет доступных услуг со свободным временем\n\n"
                    "Пожалуйста, попробуйте позже или выберите другую опцию:"
                )
                keyboard = [
                    [InlineKeyboardButton("👨‍💼 Выбрать мастера", callback_data='choose_specialist')],
                    [InlineKeyboardButton("📋 Посмотреть свободное время", callback_data='view_week_schedule')],
                    [InlineKeyboardButton("↲ Назад", callback_data='book_appointment')],
                    [InlineKeyboardButton("☰ Главное меню", callback_data='cancel_to_main')]
                ]
                reply_markup = InlineKeyboardMarkup(keyboard)
                try:
                    photo_response = requests.get(photo_url)
                    if photo_response.status_code == 200:
                        photo_data = photo_response.content
                        media = InputMediaPhoto(media=photo_data, caption=message_text)
                        await query.edit_message_media(media=media, reply_markup=reply_markup)
                    else:
                        await query.edit_message_text(text=message_text, reply_markup=reply_markup)
                except Exception as e:
                    logger.error(f"Error in show_services (no services): {e}")
                    await query.edit_message_text(text=message_text, reply_markup=reply_markup)
                return
            
            keyboard.append([InlineKeyboardButton("↲ Назад", callback_data='book_appointment')])
            keyboard.append([InlineKeyboardButton("☰ Главное меню", callback_data='cancel_to_main')])
            reply_markup = InlineKeyboardMarkup(keyboard)
            message_text = "Выберите услугу:"
            
            try:
                photo_response = requests.get(photo_url)
                if photo_response.status_code == 200:
                    photo_data = photo_response.content
                    media = InputMediaPhoto(media=photo_data, caption=message_text)
                    await query.edit_message_media(media=media, reply_markup=reply_markup)
                else:
                    await query.edit_message_text(text=message_text, reply_markup=reply_markup)
            except Exception as e:
                logger.error(f"Error in show_services: {e}")
                await query.edit_message_text(text=message_text, reply_markup=reply_markup)
        else:
            message_text = "❌ Ошибка загрузки услуг"
            keyboard = [
                [InlineKeyboardButton("🏠 Главное меню", callback_data='cancel_to_main')]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            await query.edit_message_text(text=message_text, reply_markup=reply_markup)
            
    except Exception as e:
        logger.error(f"Error fetching services: {e}")
        message_text = "❌ Ошибка подключения к серверу"
        keyboard = [
            [InlineKeyboardButton("🏠 Главное меню", callback_data='cancel_to_main')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text=message_text, reply_markup=reply_markup)

async def show_specialists(query):
    """Показать список мастеров с доступным временем (в будущем)"""
    photo_url = f"{API_BASE_URL}/photo/images/main.jpg"
    try:
        response = requests.get(f"{API_BASE_URL}/api/specialists")
        data = response.json()
        
        if data['message'] == 'success':
            specialists = data['data']
            keyboard = []
            
            for specialist in specialists:
                services_response = requests.get(f"{API_BASE_URL}/api/specialist/{specialist['id']}/services")
                
                if services_response.json()['message'] == 'success':
                    services = services_response.json()['data']
                    
                    has_available_time = False
                    for service in services:
                        # Проверяем доступное время в будущем (без ограничения по дате)
                        dates_response = requests.get(
                            f"{API_BASE_URL}/api/specialist/{specialist['id']}/service/{service['id']}/available-dates",
                            params={'start': datetime.now().strftime('%Y-%m-%d'), 'end': '2099-12-31'}
                        )
                        
                        if (dates_response.json()['message'] == 'success' and 
                            dates_response.json()['availableDates']):
                            has_available_time = True
                            break
                    
                    if has_available_time:
                        keyboard.append([
                            InlineKeyboardButton(
                                f"{specialist['имя']}",
                                callback_data=f'specialist_{specialist["id"]}'
                            )
                        ])
            
            if not keyboard:
                message_text = (
                    "❌ На данный момент нет доступных мастеров со свободным временем\n\n"
                    "Пожалуйста, попробуйте позже или выберите другую опцию:"
                )
                keyboard = [
                    [InlineKeyboardButton("🎯 Выбрать услугу", callback_data='choose_service')],
                    [InlineKeyboardButton("📋 Посмотреть свободное время", callback_data='view_week_schedule')],
                    [InlineKeyboardButton("↲ Назад", callback_data='book_appointment')],
                    [InlineKeyboardButton("☰ Главное меню", callback_data='cancel_to_main')]
                ]
                reply_markup = InlineKeyboardMarkup(keyboard)
                try:
                    photo_response = requests.get(photo_url)
                    if photo_response.status_code == 200:
                        photo_data = photo_response.content
                        media = InputMediaPhoto(media=photo_data, caption=message_text)
                        await query.edit_message_media(media=media, reply_markup=reply_markup)
                    else:
                        await query.edit_message_text(text=message_text, reply_markup=reply_markup)
                except Exception as e:
                    logger.error(f"Error in show_specialists (no specialists): {e}")
                    await query.edit_message_text(text=message_text, reply_markup=reply_markup)
                return
            
            keyboard.append([InlineKeyboardButton("↲ Назад", callback_data='back_to_selection')])
            keyboard.append([InlineKeyboardButton("☰ Главное меню", callback_data='cancel_to_main')])
            reply_markup = InlineKeyboardMarkup(keyboard)
            message_text = "Выберите мастера:"
            
            try:
                photo_response = requests.get(photo_url)
                if photo_response.status_code == 200:
                    photo_data = photo_response.content
                    media = InputMediaPhoto(media=photo_data, caption=message_text)
                    await query.edit_message_media(media=media, reply_markup=reply_markup)
                else:
                    await query.edit_message_text(text=message_text, reply_markup=reply_markup)
            except Exception as e:
                logger.error(f"Error in show_specialists: {e}")
                await query.edit_message_text(text=message_text, reply_markup=reply_markup)
        else:
            message_text = "❌ Ошибка загрузки мастеров"
            keyboard = [
                [InlineKeyboardButton("🏠 Главное меню", callback_data='cancel_to_main')]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            await query.edit_message_text(text=message_text, reply_markup=reply_markup)
            
    except Exception as e:
        logger.error(f"Error fetching specialists: {e}")
        message_text = "❌ Ошибка подключения к серверу"
        keyboard = [
            [InlineKeyboardButton("🏠 Главное меню", callback_data='cancel_to_main')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text=message_text, reply_markup=reply_markup)

async def handle_cancel_to_main(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик кнопки 'Главное меню'"""
    query = update.callback_query
    await query.answer()
    await show_main_menu(update, context)

async def show_specialists_for_service(query, service_id):
    """Показать мастеров для выбранной услуги (проверяя доступное время в будущем)"""
    photo_url = f"{API_BASE_URL}/photo/images/main.jpg"
    try:
        response = requests.get(f"{API_BASE_URL}/api/service/{service_id}/specialists")
        data = response.json()
        
        if data['message'] == 'success':
            specialists = data['data']
            
            if not specialists:
                message_text = "❌ Нет доступных мастеров для этой услуги"
                keyboard = [
                    [InlineKeyboardButton("↲ Назад", callback_data='choose_service')],
                    [InlineKeyboardButton("☰ Главное меню", callback_data='cancel_to_main')]
                ]
                reply_markup = InlineKeyboardMarkup(keyboard)
                await query.edit_message_text(text=message_text, reply_markup=reply_markup)
                return
            
            keyboard = []
            for specialist in specialists:
                # Проверяем доступное время в будущем
                dates_response = requests.get(
                    f"{API_BASE_URL}/api/specialist/{specialist['id']}/service/{service_id}/available-dates",
                    params={'start': datetime.now().strftime('%Y-%m-%d'), 'end': '2099-12-31'}
                )
                
                if (dates_response.json()['message'] == 'success' and 
                    dates_response.json()['availableDates']):
                    keyboard.append([
                        InlineKeyboardButton(
                            f"{specialist['имя']}",
                            callback_data=f'select_specialist_{specialist["id"]}_{service_id}'
                        )
                    ])
            
            # Добавляем кнопку "Расписание для всех мастеров"
            keyboard.append([
                InlineKeyboardButton(
                    "📅 Расписание для всех мастеров",
                    callback_data=f'all_specialists_schedule_{service_id}'
                )
            ])
            
            if not keyboard:
                message_text = (
                    "❌ Нет мастеров со свободным временем для этой услуги\n\n"
                    "Попробуйте выбрать другую услугу или посмотреть позже."
                )
                keyboard = [
                    [InlineKeyboardButton("↲ Назад", callback_data='choose_service')],
                    [InlineKeyboardButton("☰ Главное меню", callback_data='cancel_to_main')]
                ]
                reply_markup = InlineKeyboardMarkup(keyboard)
                try:
                    photo_response = requests.get(photo_url)
                    if photo_response.status_code == 200:
                        photo_data = photo_response.content
                        media = InputMediaPhoto(media=photo_data, caption=message_text)
                        await query.edit_message_media(media=media, reply_markup=reply_markup)
                    else:
                        await query.edit_message_text(text=message_text, reply_markup=reply_markup)
                except Exception as e:
                    logger.error(f"Error in show_specialists_for_service (no specialists): {e}")
                    await query.edit_message_text(text=message_text, reply_markup=reply_markup)
                return
            
            keyboard.append([InlineKeyboardButton("↲ Назад", callback_data='choose_service')])
            keyboard.append([InlineKeyboardButton("☰ Главное меню", callback_data='cancel_to_main')])
            reply_markup = InlineKeyboardMarkup(keyboard)
            message_text = "Выберите мастера:"
            
            try:
                photo_response = requests.get(photo_url)
                if photo_response.status_code == 200:
                    photo_data = photo_response.content
                    media = InputMediaPhoto(media=photo_data, caption=message_text)
                    await query.edit_message_media(media=media, reply_markup=reply_markup)
                else:
                    await query.edit_message_text(text=message_text, reply_markup=reply_markup)
            except Exception as e:
                logger.error(f"Error in show_specialists_for_service: {e}")
                await query.edit_message_text(text=message_text, reply_markup=reply_markup)
        else:
            message_text = "❌ Ошибка загрузки мастеров"
            keyboard = [
                [InlineKeyboardButton("🏠 Главное меню", callback_data='cancel_to_main')]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            await query.edit_message_text(text=message_text, reply_markup=reply_markup)
            
    except Exception as e:
        logger.error(f"Error fetching specialists for service: {e}")
        message_text = "❌ Ошибка подключения к серверу"
        keyboard = [
            [InlineKeyboardButton("🏠 Главное меню", callback_data='cancel_to_main')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text=message_text, reply_markup=reply_markup)

async def show_services_for_specialist(query, specialist_id):
    """Показать услуги для выбранного мастера (проверяя доступное время в будущем)"""
    photo_url = f"{API_BASE_URL}/photo/images/main.jpg"
    try:
        response = requests.get(f"{API_BASE_URL}/api/specialist/{specialist_id}/services")
        data = response.json()
        
        if data['message'] == 'success':
            services = data['data']
            
            if not services:
                message_text = "❌ Нет доступных услуг для этого мастера"
                keyboard = [
                    [InlineKeyboardButton("↲ Назад", callback_data='choose_specialist')],
                    [InlineKeyboardButton("☰ Главное меню", callback_data='cancel_to_main')]
                ]
                reply_markup = InlineKeyboardMarkup(keyboard)
                await query.edit_message_text(text=message_text, reply_markup=reply_markup)
                return
            
            keyboard = []
            for service in services:
                # Проверяем доступное время в будущем
                dates_response = requests.get(
                    f"{API_BASE_URL}/api/specialist/{specialist_id}/service/{service['id']}/available-dates",
                    params={'start': datetime.now().strftime('%Y-%m-%d'), 'end': '2099-12-31'}
                )
                
                if (dates_response.json()['message'] == 'success' and 
                    dates_response.json()['availableDates']):
                    keyboard.append([
                        InlineKeyboardButton(
                            f"{service['название']} - {service['цена']}₽",
                            callback_data=f'select_service_{service["id"]}_{specialist_id}'
                        )
                    ])
            
            if not keyboard:
                message_text = (
                    "❌ Нет услуг со свободным временем для этого мастера\n\n"
                    "Попробуйте выбрать другого мастера или посмотреть позже."
                )
                keyboard = [
                    [InlineKeyboardButton("↲ Назад", callback_data='choose_specialist')],
                    [InlineKeyboardButton("☰ Главное меню", callback_data='cancel_to_main')]
                ]
                reply_markup = InlineKeyboardMarkup(keyboard)
                try:
                    photo_response = requests.get(photo_url)
                    if photo_response.status_code == 200:
                        photo_data = photo_response.content
                        media = InputMediaPhoto(media=photo_data, caption=message_text)
                        await query.edit_message_media(media=media, reply_markup=reply_markup)
                    else:
                        await query.edit_message_text(text=message_text, reply_markup=reply_markup)
                except Exception as e:
                    logger.error(f"Error in show_services_for_specialist (no services): {e}")
                    await query.edit_message_text(text=message_text, reply_markup=reply_markup)
                return
            
            keyboard.append([InlineKeyboardButton("↲ Назад", callback_data='choose_specialist')])
            keyboard.append([InlineKeyboardButton("☰ Главное меню", callback_data='cancel_to_main')])
            reply_markup = InlineKeyboardMarkup(keyboard)
            message_text = "Выберите услугу:"
            
            try:
                photo_response = requests.get(photo_url)
                if photo_response.status_code == 200:
                    photo_data = photo_response.content
                    media = InputMediaPhoto(media=photo_data, caption=message_text)
                    await query.edit_message_media(media=media, reply_markup=reply_markup)
                else:
                    await query.edit_message_text(text=message_text, reply_markup=reply_markup)
            except Exception as e:
                logger.error(f"Error in show_services_for_specialist: {e}")
                await query.edit_message_text(text=message_text, reply_markup=reply_markup)
        else:
            message_text = "❌ Ошибка загрузки услуг"
            keyboard = [
                [InlineKeyboardButton("🏠 Главное меню", callback_data='cancel_to_main')]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            await query.edit_message_text(text=message_text, reply_markup=reply_markup)
            
    except Exception as e:
        logger.error(f"Error fetching services for specialist: {e}")
        message_text = "❌ Ошибка подключения к серверу"
        keyboard = [
            [InlineKeyboardButton("🏠 Главное меню", callback_data='cancel_to_main')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text=message_text, reply_markup=reply_markup)

async def show_date_selection(query, specialist_id, service_id, target_date_str=None):
    """Показать выбор даты для записи"""
    user_id = query.from_user.id
    user_states[user_id] = {
        'specialist_id': specialist_id,
        'service_id': service_id
    }
    
    photo_url = f"{API_BASE_URL}/photo/images/main.jpg"
    try:
        today = datetime.now().date()
        
        if target_date_str:
            target_date = datetime.strptime(target_date_str, '%Y-%m-%d').date()
        else:
            target_date = today
        
        start_of_week = target_date - timedelta(days=target_date.weekday())
        end_of_week = start_of_week + timedelta(days=6)
        
        from_date = max(start_of_week, today)
        to_date = end_of_week
        
        from_date_str = from_date.strftime('%Y-%m-%d')
        to_date_str = to_date.strftime('%Y-%m-%d')
        
        response = requests.get(
            f"{API_BASE_URL}/api/specialist/{specialist_id}/service/{service_id}/available-dates",
            params={'start': from_date_str, 'end': to_date_str}
        )
        data = response.json()
        
        keyboard = []
        if data['message'] == 'success' and data['availableDates']:
            for date in data['availableDates']:
                date_obj = datetime.strptime(date, '%Y-%m-%d')
                formatted_date = date_obj.strftime('%d.%m (%a)')
                formatted_date = formatted_date.replace(date_obj.strftime('%a'), WEEKDAY_MAP[date_obj.strftime('%a')])
                keyboard.append([
                    InlineKeyboardButton(
                        formatted_date,
                        callback_data=f'select_date_{date}'
                    )
                ])
        else:
            keyboard.append([InlineKeyboardButton("Нет свободных дат", callback_data='no_date_available')])
        
        prev_week_start = start_of_week - timedelta(days=7)
        next_week_start = start_of_week + timedelta(days=7)
        
        nav_buttons = [
            InlineKeyboardButton("⬅️ Пред. неделя", callback_data=f'date_nav_prev_{prev_week_start.strftime("%Y-%m-%d")}'),
            InlineKeyboardButton("След. неделя ➡️", callback_data=f'date_nav_next_{next_week_start.strftime("%Y-%m-%d")}')
        ]
        keyboard.append(nav_buttons)
        
        keyboard.append([InlineKeyboardButton("↲ Назад", callback_data='back_to_selection')])
        keyboard.append([InlineKeyboardButton("☰ Главное меню", callback_data='cancel_to_main')])
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        message_text = f"Выберите дату ({start_of_week.strftime('%d.%m')} - {end_of_week.strftime('%d.%m')}):"
        
        try:
            photo_response = requests.get(photo_url)
            if photo_response.status_code == 200:
                photo_data = photo_response.content
                media = InputMediaPhoto(media=photo_data, caption=message_text)
                await query.edit_message_media(media=media, reply_markup=reply_markup)
            else:
                await query.edit_message_text(text=message_text, reply_markup=reply_markup)
        except Exception as e:
            logger.error(f"Error in show_date_selection: {e}")
            await query.edit_message_text(text=message_text, reply_markup=reply_markup)
            
    except Exception as e:
        logger.error(f"Error showing date selection: {e}")
        message_text = "❌ Ошибка подключения к серверу"
        keyboard = [
            [InlineKeyboardButton("↲ Назад", callback_data='back_to_selection')],
            [InlineKeyboardButton("☰ Главное меню", callback_data='cancel_to_main')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text=message_text, reply_markup=reply_markup)

async def show_time_slots(query, date_str):
    """Показать доступное время на выбранную дату"""
    photo_url = f"{API_BASE_URL}/photo/images/main.jpg"
    user_id = query.from_user.id
    user_data = user_states.get(user_id, {})
    specialist_id = user_data.get('specialist_id')
    service_id = user_data.get('service_id')
    
    if not specialist_id or not service_id:
        message_text = "❌ Ошибка: не выбраны мастер или услуга"
        keyboard = [
            [InlineKeyboardButton("☰ Главное меню", callback_data='cancel_to_main')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text=message_text, reply_markup=reply_markup)
        return
    
    try:
        response = requests.get(
            f"{API_BASE_URL}/api/specialist/{specialist_id}/service/{service_id}/schedule/{date_str}"
        )
        data = response.json()
        
        if data['message'] == 'success':
            time_slots = data['data']
            
            if not time_slots:
                message_text = "❌ Нет свободного времени на эту дату"
                keyboard = [
                    [InlineKeyboardButton("↲ Назад", callback_data=f'select_date_{date_str}')],
                    [InlineKeyboardButton("☰ Главное меню", callback_data='cancel_to_main')]
                ]
                reply_markup = InlineKeyboardMarkup(keyboard)
                try:
                    photo_response = requests.get(photo_url)
                    if photo_response.status_code == 200:
                        photo_data = photo_response.content
                        media = InputMediaPhoto(media=photo_data, caption=message_text)
                        await query.edit_message_media(media=media, reply_markup=reply_markup)
                    else:
                        await query.edit_message_text(text=message_text, reply_markup=reply_markup)
                except Exception as e:
                    logger.error(f"Error in show_time_slots (no slots): {e}")
                    await query.edit_message_text(text=message_text, reply_markup=reply_markup)
                return
            
            keyboard = []
            for slot in time_slots:
                keyboard.append([
                    InlineKeyboardButton(
                        f" {slot['время']}",
                        callback_data=f'time_slot_{slot["id"]}'
                    )
                ])
            
            keyboard.append([InlineKeyboardButton("↲ Назад", callback_data=f'select_date_{date_str}')])
            keyboard.append([InlineKeyboardButton("☰ Главное меню", callback_data='cancel_to_main')])
            reply_markup = InlineKeyboardMarkup(keyboard)
            message_text = f"Доступное время на {datetime.strptime(date_str, '%Y-%m-%d').strftime('%d.%m.%Y')}:"
            
            try:
                photo_response = requests.get(photo_url)
                if photo_response.status_code == 200:
                    photo_data = photo_response.content
                    media = InputMediaPhoto(media=photo_data, caption=message_text)
                    await query.edit_message_media(media=media, reply_markup=reply_markup)
                else:
                    await query.edit_message_text(text=message_text, reply_markup=reply_markup)
            except Exception as e:
                logger.error(f"Error in show_time_slots: {e}")
                await query.edit_message_text(text=message_text, reply_markup=reply_markup)
        else:
            message_text = "❌ Ошибка загрузки времени"
            keyboard = [
                [InlineKeyboardButton("↲ Назад", callback_data=f'select_date_{date_str}')],
                [InlineKeyboardButton("☰ Главное меню", callback_data='cancel_to_main')]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            await query.edit_message_text(text=message_text, reply_markup=reply_markup)
            
    except Exception as e:
        logger.error(f"Error fetching time slots: {e}")
        message_text = "❌ Ошибка подключения к серверу"
        keyboard = [
            [InlineKeyboardButton("↲ Назад", callback_data=f'select_date_{date_str}')],
            [InlineKeyboardButton("☰ Главное меню", callback_data='cancel_to_main')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text=message_text, reply_markup=reply_markup)

async def confirm_booking(query, schedule_id):
    """Подтверждение записи"""
    try:
        response = requests.get(f"{API_BASE_URL}/api/schedule/{schedule_id}")
        data = response.json()
        
        if data['message'] == 'success':
            schedule = data['data']
            
            message = (
                f"✅ Подтверждение записи:\n\n"
                f"📅 Дата: {datetime.strptime(schedule['дата'], '%Y-%m-%d').strftime('%d.%m.%Y')}\n"
                f"⏰ Время: {schedule['время']}\n"
                f"🎯 Услуга: {schedule['услуга_название']}\n"
                f"👨‍💼 Мастер: {schedule['мастер_имя']}\n"
                f"💵 Цена: {schedule['услуга_цена']}₽\n\n"
                f"Для завершения записи введите ваше имя:"
            )
            
            user_states[query.from_user.id] = {
                'schedule_id': schedule_id,
                'service_id': schedule['услуга_id'],
                'specialist_id': schedule['мастер_id'],
                'date': schedule['дата'],
                'time': schedule['время'],
                'step': 'name'
            }
            
            keyboard = [
                [InlineKeyboardButton("☰ Главное меню", callback_data='cancel_to_main')]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            photo_url = f"{API_BASE_URL}/photo/images/main.jpg"
            try:
                photo_response = requests.get(photo_url)
                if photo_response.status_code == 200:
                    photo_data = photo_response.content
                    media = InputMediaPhoto(media=photo_data, caption=message)
                    await query.edit_message_media(media=media, reply_markup=reply_markup)
                else:
                    await query.edit_message_text(text=message, reply_markup=reply_markup)
            except Exception as e:
                logger.error(f"Error in confirm_booking: {e}")
                await query.edit_message_text(text=message, reply_markup=reply_markup)
            
        else:
            message_text = "❌ Ошибка загрузки информации о записи"
            keyboard = [
                [InlineKeyboardButton("☰ Главное меню", callback_data='cancel_to_main')]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            await query.edit_message_text(text=message_text, reply_markup=reply_markup)
            
    except Exception as e:
        logger.error(f"Error confirming booking: {e}")
        message_text = "❌ Ошибка подключения к серверу"
        keyboard = [
            [InlineKeyboardButton("☰ Главное меню", callback_data='cancel_to_main')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text=message_text, reply_markup=reply_markup)

async def show_week_schedule(query, target_date_str=None):
    """Показать свободное время на неделю с навигацией"""
    photo_url = f"{API_BASE_URL}/photo/images/main.jpg"
    try:
        today = datetime.now().date()
        
        if target_date_str:
            target_date = datetime.strptime(target_date_str, '%Y-%m-%d').date()
        else:
            target_date = today
        
        start_of_week = target_date - timedelta(days=target_date.weekday())
        end_of_week = start_of_week + timedelta(days=6)
        
        from_date = max(start_of_week, today)
        to_date = end_of_week
        
        from_date_str = from_date.strftime('%Y-%m-%d')
        to_date_str = to_date.strftime('%Y-%m-%d')
        
        response = requests.get(f"{API_BASE_URL}/api/freetime-available?fromDate={from_date_str}&toDate={to_date_str}")
        data = response.json()
        
        message = f"📅 Свободное время на неделю ({start_of_week.strftime('%d.%m')} - {end_of_week.strftime('%d.%m')}):\n\n"
        keyboard = []
        
        if data['message'] == 'success':
            schedule = data['data']
            
            schedule_by_date = {}
            for item in schedule:
                date = item['дата']
                if date not in schedule_by_date:
                    schedule_by_date[date] = []
                schedule_by_date[date].append(item)
            
            for date, items in sorted(schedule_by_date.items()):
                formatted_date = datetime.strptime(date, '%Y-%m-%d').strftime('%d.%m')
                message += f"📆 {formatted_date}:\n"
                
                for item in items:
                    message += f"    {item['время']} - {item['услуга_название']} ({item['мастер_имя']})\n"
                    keyboard.append([
                        InlineKeyboardButton(
                            f"{formatted_date} {item['время']} - {item['услуга_название']}",
                            callback_data=f'time_slot_{item["id"]}'
                        )
                    ])
                
                message += "\n"
            
            if not schedule:
                message += "❌ Нет свободного времени на этой неделе\n"
        
        else:
            message += "❌ Ошибка загрузки расписания\n"
        
        prev_week_start = start_of_week - timedelta(days=7)
        next_week_start = start_of_week + timedelta(days=7)
        
        nav_buttons = [
            InlineKeyboardButton("⬅️ Пред. неделя", callback_data=f'week_nav_prev_{prev_week_start.strftime("%Y-%m-%d")}'),
            InlineKeyboardButton("След. неделя ➡️", callback_data=f'week_nav_next_{next_week_start.strftime("%Y-%m-%d")}')
        ]
        keyboard.append(nav_buttons)
        
        keyboard.append([InlineKeyboardButton("↲ Назад", callback_data='book_appointment')])
        keyboard.append([InlineKeyboardButton("☰ Главное меню", callback_data='cancel_to_main')])
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        try:
            photo_response = requests.get(photo_url)
            if photo_response.status_code == 200:
                photo_data = photo_response.content
                media = InputMediaPhoto(media=photo_data, caption=message)
                await query.edit_message_media(media=media, reply_markup=reply_markup)
            else:
                await query.edit_message_text(text=message, reply_markup=reply_markup)
        except Exception as e:
            logger.error(f"Error in show_week_schedule: {e}")
            await query.edit_message_text(text=message, reply_markup=reply_markup)
            
    except Exception as e:
        logger.error(f"Error fetching week schedule: {e}")
        message_text = "❌ Ошибка подключения к серверу"
        keyboard = [
            [InlineKeyboardButton("↲ Назад", callback_data='book_appointment')],
            [InlineKeyboardButton("☰ Главное меню", callback_data='cancel_to_main')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text=message_text, reply_markup=reply_markup)

async def show_all_specialists_schedule(query, service_id, target_date_str=None):
    """Показать расписание всех мастеров для услуги на неделю"""
    photo_url = f"{API_BASE_URL}/photo/images/main.jpg"
    try:
        today = datetime.now().date()
        
        if target_date_str:
            target_date = datetime.strptime(target_date_str, '%Y-%m-%d').date()
        else:
            target_date = today
        
        start_of_week = target_date - timedelta(days=target_date.weekday())
        end_of_week = start_of_week + timedelta(days=6)
        
        from_date = max(start_of_week, today)
        to_date = end_of_week
        
        from_date_str = from_date.strftime('%Y-%m-%d')
        to_date_str = to_date.strftime('%Y-%m-%d')
        
        response = requests.get(
            f"{API_BASE_URL}/api/service/{service_id}/freetime?fromDate={from_date_str}&toDate={to_date_str}"
        )
        data = response.json()
        
        # Получаем название услуги
        service_response = requests.get(f"{API_BASE_URL}/api/service/{service_id}")
        service_name = service_response.json()['data']['название'] if service_response.json()['message'] == 'success' else "Услуга"
        
        message = f"📅 Расписание для услуги '{service_name}' на неделю ({start_of_week.strftime('%d.%m')} - {end_of_week.strftime('%d.%m')}):\n\n"
        keyboard = []
        
        if data['message'] == 'success':
            schedule = data['data']
            
            schedule_by_date = {}
            for item in schedule:
                date = item['дата']
                if date not in schedule_by_date:
                    schedule_by_date[date] = []
                schedule_by_date[date].append(item)
            
            for date, items in sorted(schedule_by_date.items()):
                formatted_date = datetime.strptime(date, '%Y-%m-%d').strftime('%d.%m')
                message += f"📆 {formatted_date}:\n"
                
                for item in items:
                    message += f"    {item['время']} - {item['мастер_имя']}\n"
                    keyboard.append([
                        InlineKeyboardButton(
                            f"{formatted_date} {item['время']} - {item['мастер_имя']}",
                            callback_data=f'time_slot_{item["id"]}'
                        )
                    ])
                
                message += "\n"
            
            if not schedule:
                message += "❌ Нет свободного времени на этой неделе\n"
        
        else:
            message += "❌ Ошибка загрузки расписания\n"
        
        prev_week_start = start_of_week - timedelta(days=7)
        next_week_start = start_of_week + timedelta(days=7)
        
        nav_buttons = [
            InlineKeyboardButton(
                "⬅️ Пред. неделя",
                callback_data=f'all_schedule_nav_prev_{prev_week_start.strftime("%Y-%m-%d")}_{service_id}'
            ),
            InlineKeyboardButton(
                "След. неделя ➡️",
                callback_data=f'all_schedule_nav_next_{next_week_start.strftime("%Y-%m-%d")}_{service_id}'
            )
        ]
        keyboard.append(nav_buttons)
        
        keyboard.append([InlineKeyboardButton("↲ Назад", callback_data=f'service_{service_id}')])
        keyboard.append([InlineKeyboardButton("☰ Главное меню", callback_data='cancel_to_main')])
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        try:
            photo_response = requests.get(photo_url)
            if photo_response.status_code == 200:
                photo_data = photo_response.content
                media = InputMediaPhoto(media=photo_data, caption=message)
                await query.edit_message_media(media=media, reply_markup=reply_markup)
            else:
                await query.edit_message_text(text=message, reply_markup=reply_markup)
        except Exception as e:
            logger.error(f"Error in show_all_specialists_schedule: {e}")
            await query.edit_message_text(text=message, reply_markup=reply_markup)
            
    except Exception as e:
        logger.error(f"Error fetching all specialists schedule: {e}")
        message_text = "❌ Ошибка подключения к серверу"
        keyboard = [
            [InlineKeyboardButton("↲ Назад", callback_data=f'service_{service_id}')],
            [InlineKeyboardButton("☰ Главное меню", callback_data='cancel_to_main')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text=message_text, reply_markup=reply_markup)

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик текстовых сообщений"""
    user_id = update.message.from_user.id
    text = update.message.text
    
    if user_id in user_states:
        user_data = user_states[user_id]
        
        if user_data.get('step') == 'name':
            user_data['client_name'] = text
            user_data['step'] = 'phone'
            await update.message.reply_text(
                "📞 Теперь введите ваш телефон в формате +7XXXXXXXXXX:\n\n"
                "Пример: +79255355278"
            )
            
        elif user_data.get('step') == 'phone':
            if not validate_phone(text):
                await update.message.reply_text(
                    "❌ Неверный формат телефона!\n\n"
                    "Пожалуйста, введите телефон в формате +7XXXXXXXXXX\n"
                    "Пример: +79255355278"
                )
                return
            
            user_data['client_phone'] = text
            
            try:
                response = requests.post(f"{API_BASE_URL}/api/appointment", json={
                    'specialistId': user_data['specialist_id'],
                    'serviceId': user_data['service_id'],
                    'date': user_data['date'],
                    'time': user_data['time'],
                    'clientName': user_data['client_name'],
                    'clientPhone': user_data['client_phone']
                })
                
                if response.json().get('message') == 'success':
                    keyboard = [
                        [InlineKeyboardButton("☰ Главное меню", callback_data='cancel_to_main')]
                    ]
                    reply_markup = InlineKeyboardMarkup(keyboard)
                    await update.message.reply_text(
                        "✅ Запись успешно создана!\n\n"
                        "С вами свяжутся для подтверждения.",
                        reply_markup=reply_markup
                    )
                    
                    requests.patch(f"{API_BASE_URL}/api/schedule/{user_data['schedule_id']}", json={
                        'доступно': 0
                    })
                    
                else:
                    await update.message.reply_text("❌ Ошибка при создании записи")
                    
            except Exception as e:
                logger.error(f"Error creating appointment: {e}")
                await update.message.reply_text("❌ Ошибка подключения к серверу")
            
            del user_states[user_id]

def validate_phone(phone):
    """Валидация номера телефона в формате +7XXXXXXXXXX"""
    import re
    pattern = r'^\+7\d{10}$'
    return re.match(pattern, phone) is not None

async def start_callback(query):
    """Обработчик возврата к началу"""
    update = Update(0, callback_query=query)
    await show_main_menu(update, None)

def main():
    """Запуск бота"""
    application = Application.builder().token(BOT_TOKEN).build()    
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CallbackQueryHandler(handle_callback))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    
    application.run_polling()

if __name__ == '__main__':
    main()