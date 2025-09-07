import logging
import requests
from datetime import datetime, timedelta
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import ContextTypes
from config import API_BASE_URL, user_states, WEEKDAY_MAP
from menu_handlers import start_callback
from menu_handlers import show_main_menu
from schedule_handlers import show_week_schedule
from schedule_handlers import show_all_specialists_schedule  # Добавьте эту строку

logger = logging.getLogger(__name__)

async def show_booking_options(query):
    """Показать варианты записи"""
    keyboard = [
        [InlineKeyboardButton("Выбрать услугу", callback_data='choose_service')],
        [InlineKeyboardButton("Выбрать мастера", callback_data='choose_specialist')],
        [InlineKeyboardButton("Посмотреть свободное время на неделю", callback_data='view_week_schedule')],
        [InlineKeyboardButton("☰ Главное меню", callback_data='cancel_to_main')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(
        "Как вы хотите записаться?",
        reply_markup=reply_markup
    )

async def show_services(query):
    """Показать список услуг с доступным временем"""
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
                        today = datetime.now()
                        start_date = today.strftime('%Y-%m-%d')
                        end_date = (today + timedelta(days=7)).strftime('%Y-%m-%d')
                        
                        dates_response = requests.get(
                            f"{API_BASE_URL}/api/specialist/{specialist['id']}/service/{service['id']}/available-dates",
                            params={'start': start_date, 'end': end_date}
                        )
                        
                        if (dates_response.json()['message'] == 'success' and 
                            dates_response.json()['availableDates']):
                            has_available_time = True
                            break
                    
                    if has_available_time:
                        keyboard.append([
                            InlineKeyboardButton(
                                f"{service['название']} - {service['цена']}₽",
                                callback_data=f'select_service_{service["id"]}'
                            )
                        ])
            
            if not keyboard:
                await query.edit_message_text(
                    "❌ На данный момент нет доступных услуг со свободным временем\n\n"
                    "Попробуйте позже или выберите другую опцию:",
                    reply_markup=InlineKeyboardMarkup([
                        [InlineKeyboardButton("👨‍💼 Выбрать мастера", callback_data='choose_specialist')],
                        [InlineKeyboardButton("📋 Посмотреть свободное время", callback_data='view_week_schedule')],
                        [InlineKeyboardButton("↲ Назад", callback_data='book_appointment')],
                        [InlineKeyboardButton("☰ Главное меню", callback_data='cancel_to_main')]
                    ])
                )
                return
            
            keyboard.append([InlineKeyboardButton("↲ Назад", callback_data='book_appointment')])
            keyboard.append([InlineKeyboardButton("☰ Главное меню", callback_data='cancel_to_main')])
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await query.edit_message_text(
                "Выберите услугу:",
                reply_markup=reply_markup
            )
        else:
            await query.edit_message_text("❌ Ошибка загрузки услуг")
            
    except Exception as e:
        logger.error(f"Error fetching services: {e}")
        await query.edit_message_text("❌ Ошибка подключения к серверу")

async def show_specialists(query):
    """Показать список мастеров с доступным временем"""
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
                        today = datetime.now()
                        start_date = today.strftime('%Y-%m-%d')
                        end_date = (today + timedelta(days=7)).strftime('%Y-%m-%d')
                        
                        dates_response = requests.get(
                            f"{API_BASE_URL}/api/specialist/{specialist['id']}/service/{service['id']}/available-dates",
                            params={'start': start_date, 'end': end_date}
                        )
                        
                        if (dates_response.json()['message'] == 'success' and 
                            dates_response.json()['availableDates']):
                            has_available_time = True
                            break
                    
                    if has_available_time:
                        keyboard.append([
                            InlineKeyboardButton(
                                f"{specialist['имя']}",
                                callback_data=f'select_specialist_{specialist["id"]}'
                            )
                        ])
            
            if not keyboard:
                await query.edit_message_text(
                    "❌ На данный момент нет доступных мастеров со свободным временем\n\n"
                    "Попробуйте позже или выберите другую опцию:",
                    reply_markup=InlineKeyboardMarkup([
                        [InlineKeyboardButton("🎯 Выбрать услугу", callback_data='choose_service')],
                        [InlineKeyboardButton("📋 Посмотреть свободное время", callback_data='view_week_schedule')],
                        [InlineKeyboardButton("↲ Назад", callback_data='book_appointment')],
                        [InlineKeyboardButton("☰ Главное меню", callback_data='cancel_to_main')]
                    ])
                )
                return
            
            keyboard.append([InlineKeyboardButton("↲ Назад", callback_data='choose_specialist')])
            keyboard.append([InlineKeyboardButton("☰ Главное меню", callback_data='cancel_to_main')])
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await query.edit_message_text(
                "Выберите мастера:",
                reply_markup=reply_markup
            )
        else:
            await query.edit_message_text("❌ Ошибка загрузки мастеров")
            
    except Exception as e:
        logger.error(f"Error fetching specialists: {e}")
        await query.edit_message_text("❌ Ошибка подключения к серверу")

async def show_specialists_for_service(query, service_id):
    """Показать мастеров для выбранной услуги и расписание для всех мастеров"""
    user_id = query.from_user.id
    try:
        response = requests.get(f"{API_BASE_URL}/api/service/{service_id}/specialists")
        data = response.json()
        
        if data['message'] == 'success':
            specialists = data['data']
            
            if not specialists:
                await query.edit_message_text("❌ Нет доступных мастеров для этой услуги")
                return
            
            keyboard = []
            for specialist in specialists:
                today = datetime.now()
                start_date = today.strftime('%Y-%m-%d')
                end_date = (today + timedelta(days=7)).strftime('%Y-%m-%d')
                
                dates_response = requests.get(
                    f"{API_BASE_URL}/api/specialist/{specialist['id']}/service/{service_id}/available-dates",
                    params={'start': start_date, 'end': end_date}
                )
                
                if (dates_response.json()['message'] == 'success' and 
                    dates_response.json()['availableDates']):
                    keyboard.append([
                        InlineKeyboardButton(
                            f"{specialist['имя']}",
                            callback_data=f'select_specialist_{specialist["id"]}_{service_id}'
                        )
                    ])
            
            keyboard.append([
                InlineKeyboardButton(
                    "📅 Расписание для всех мастеров",
                    callback_data=f'all_specialists_schedule_{service_id}'
                )
            ])
            
            if not keyboard:
                await query.edit_message_text(
                    "❌ Нет мастеров со свободным временем для этой услуги\n\n"
                    "Попробуйте выбрать другую услугу или посмотреть позже."
                )
                return
            
            keyboard.append([InlineKeyboardButton("↲ Назад", callback_data='choose_service')])
            keyboard.append([InlineKeyboardButton("☰ Главное меню", callback_data='cancel_to_main')])
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            service_response = requests.get(f"{API_BASE_URL}/api/service/{service_id}")
            service_name = service_response.json()['data']['название'] if service_response.json()['message'] == 'success' else "Услуга"
            
            await query.edit_message_text(
                f"🎯 Услуга: {service_name}\n\n"
                "Выберите мастера или посмотрите расписание для всех мастеров:",
                reply_markup=reply_markup
            )
        else:
            await query.edit_message_text("❌ Ошибка загрузки мастеров")
            
    except Exception as e:
        logger.error(f"Error fetching specialists for service: {e}")
        await query.edit_message_text("❌ Ошибка подключения к серверу")
    
    user_states[user_id] = {'service_id': service_id}

async def show_services_for_specialist(query, specialist_id):
    """Показать услуги для выбранного мастера"""
    user_id = query.from_user.id
    try:
        response = requests.get(f"{API_BASE_URL}/api/specialist/{specialist_id}/services")
        data = response.json()
        
        if data['message'] == 'success':
            services = data['data']
            keyboard = []
            
            for service in services:
                today = datetime.now()
                start_date = today.strftime('%Y-%m-%d')
                end_date = (today + timedelta(days=7)).strftime('%Y-%m-%d')
                
                dates_response = requests.get(
                    f"{API_BASE_URL}/api/specialist/{specialist_id}/service/{service['id']}/available-dates",
                    params={'start': start_date, 'end': end_date}
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
                await query.edit_message_text(
                    "❌ Нет услуг со свободным временем для этого мастера\n\n"
                    "Попробуйте выбрать другого мастера или посмотреть позже."
                )
                return
            
            keyboard.append([InlineKeyboardButton("↲ Назад", callback_data='choose_specialist')])
            keyboard.append([InlineKeyboardButton("☰ Главное меню", callback_data='cancel_to_main')])
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await query.edit_message_text(
                "Выберите услугу для мастера:",
                reply_markup=reply_markup
            )
        else:
            await query.edit_message_text("❌ Ошибка загрузки услуг")
            
    except Exception as e:
        logger.error(f"Error fetching services for specialist: {e}")
        await query.edit_message_text("❌ Ошибка подключения к серверу")
    
    user_states[user_id] = {'specialist_id': specialist_id}

async def show_date_selection(query, specialist_id, service_id, current_date_str=None):
    """Показать выбор даты для выбранной услуги и мастера"""
    user_id = query.from_user.id
    try:
        user_states[user_id] = {
            'specialist_id': specialist_id,
            'service_id': service_id
        }
        
        if current_date_str:
            current_date = datetime.strptime(current_date_str, '%Y-%m-%d')
        else:
            current_date = datetime.now()
        
        start_of_week = current_date - timedelta(days=current_date.weekday())
        end_of_week = start_of_week + timedelta(days=6)
        
        start_date = start_of_week.strftime('%Y-%m-%d')
        end_date = end_of_week.strftime('%Y-%m-%d')
        
        response = requests.get(
            f"{API_BASE_URL}/api/specialist/{specialist_id}/service/{service_id}/available-dates",
            params={'start': start_date, 'end': end_date}
        )
        
        service_response = requests.get(f"{API_BASE_URL}/api/service/{service_id}")
        specialist_response = requests.get(f"{API_BASE_URL}/api/specialist/{specialist_id}")
        
        service_name = service_response.json()['data']['название'] if service_response.json()['message'] == 'success' else "Услуга"
        specialist_name = specialist_response.json()['data']['имя'] if specialist_response.json()['message'] == 'success' else "Мастер"
        
        keyboard = []
        current_date_obj = start_of_week
        
        if response.json()['message'] == 'success':
            available_dates = response.json()['availableDates'] or []
            
            for i in range(7):
                date_str = current_date_obj.strftime('%Y-%m-%d')
                date_display = current_date_obj.strftime('%d.%m')
                day_name = WEEKDAY_MAP[current_date_obj.strftime('%a')]
                
                if date_str in available_dates:
                    keyboard.append([
                        InlineKeyboardButton(
                            f"📅 {date_display} ({day_name})",
                            callback_data=f'select_date_{date_str}_{specialist_id}_{service_id}'
                        )
                    ])
                else:
                    keyboard.append([
                        InlineKeyboardButton(
                            f"❌ {date_display} ({day_name})",
                            callback_data='no_date_available'
                        )
                    ])
                
                current_date_obj += timedelta(days=1)
        else:
            for i in range(7):
                date_str = current_date_obj.strftime('%Y-%m-%d')
                date_display = current_date_obj.strftime('%d.%m')
                day_name = WEEKDAY_MAP[current_date_obj.strftime('%a')]
                
                keyboard.append([
                    InlineKeyboardButton(
                        f"❌ {date_display} ({day_name})",
                        callback_data='no_date_available'
                    )
                ])
                current_date_obj += timedelta(days=1)
        
        prev_week_start = start_of_week - timedelta(days=7)
        next_week_start = start_of_week + timedelta(days=7)
        
        nav_buttons = [
            InlineKeyboardButton("⬅️ Пред. неделя", callback_data=f'date_nav_prev_{prev_week_start.strftime("%Y-%m-%d")}_{specialist_id}_{service_id}'),
            InlineKeyboardButton("След. неделя ➡️", callback_data=f'date_nav_next_{next_week_start.strftime("%Y-%m-%d")}_{specialist_id}_{service_id}')
        ]
        keyboard.append(nav_buttons)
        
        keyboard.append([InlineKeyboardButton("↲ Назад", callback_data='back_to_selection')])
        keyboard.append([InlineKeyboardButton("☰ Главное меню", callback_data='cancel_to_main')])
        
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(
            f"🎯 Услуга: {service_name}\n"
            f"👨‍💼 Мастер: {specialist_name}\n\n"
            f"Неделя: {start_of_week.strftime('%d.%m')} - {end_of_week.strftime('%d.%m')}\n"
            "Выберите дату записи:",
            reply_markup=reply_markup
        )
        
    except Exception as e:
        logger.error(f"Error showing date selection: {e}")
        await query.edit_message_text("❌ Ошибка подключения к серверу")

async def show_time_slots(query, date_str, specialist_id, service_id):
    """Показать доступное время на выбранную дату"""
    user_id = query.from_user.id
    try:
        response = requests.get(
            f"{API_BASE_URL}/api/specialist/{specialist_id}/service/{service_id}/schedule/{date_str}"
        )
        data = response.json()
        
        if data['message'] == 'success':
            time_slots = data['data']
            
            if not time_slots:
                await query.edit_message_text("❌ Нет свободного времени на эту дату")
                return
            
            keyboard = []
            for slot in time_slots:
                keyboard.append([
                    InlineKeyboardButton(
                        f"⏰ {slot['время']}",
                        callback_data=f'time_slot_{slot["id"]}'
                    )
                ])
            
            keyboard.append([InlineKeyboardButton("↲ Назад", callback_data=f'back_to_dates_{specialist_id}_{service_id}')])
            keyboard.append([InlineKeyboardButton("☰ Главное меню", callback_data='cancel_to_main')])
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await query.edit_message_text(
                f"Доступное время на {datetime.strptime(date_str, '%Y-%m-%d').strftime('%d.%m.%Y')}:",
                reply_markup=reply_markup
            )
            
            user_states[user_id] = {
                'specialist_id': specialist_id,
                'service_id': service_id,
                'date': date_str
            }
        else:
            await query.edit_message_text("❌ Ошибка загрузки времени")
            
    except Exception as e:
        logger.error(f"Error fetching time slots: {e}")
        await query.edit_message_text("❌ Ошибка подключения к серверу")

async def confirm_booking(query, schedule_id):
    """Подтверждение записи"""
    user_id = query.from_user.id
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
            
            user_states[user_id] = {
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
            
            await query.edit_message_text(message, reply_markup=reply_markup)
            
        else:
            await query.edit_message_text("❌ Ошибка загрузки информации о записи")
            
    except Exception as e:
        logger.error(f"Error confirming booking: {e}")
        await query.edit_message_text("❌ Ошибка подключения к серверу")

async def handle_callback(update, context):
    """Обработчик callback запросов"""
    query = update.callback_query
    await query.answer()
    
    data = query.data
    
    if data == 'book_appointment':
        await show_booking_options(query)
    elif data == 'choose_service':
        await show_services(query)
    elif data == 'choose_specialist':
        await show_specialists(query)
    elif data == 'view_week_schedule':
        await show_week_schedule(update, context)
    elif data.startswith('select_service_'):
        parts = data.split('_')
        if len(parts) == 3:  # select_service_{service_id}
            service_id = parts[2]
            await show_specialists_for_service(query, service_id)
        elif len(parts) == 4:  # select_service_{service_id}_{specialist_id}
            service_id = parts[2]
            specialist_id = parts[3]
            await show_date_selection(query, specialist_id, service_id)
    elif data.startswith('select_specialist_'):
        parts = data.split('_')
        if len(parts) == 3:  # select_specialist_{specialist_id}
            specialist_id = parts[2]
            await show_services_for_specialist(query, specialist_id)
        elif len(parts) == 4:  # select_specialist_{specialist_id}_{service_id}
            specialist_id = parts[2]
            service_id = parts[3]
            await show_date_selection(query, specialist_id, service_id)
    elif data.startswith('date_nav_'):
        parts = data.split('_')
        direction = parts[2]
        target_date_str = parts[3]
        specialist_id = parts[4]
        service_id = parts[5]
        await show_date_selection(query, specialist_id, service_id, target_date_str)
    elif data.startswith('select_date_'):
        parts = data.split('_')
        date_str = parts[2]
        specialist_id = parts[3]
        service_id = parts[4]
        await show_time_slots(query, date_str, specialist_id, service_id)
    elif data.startswith('time_slot_'):
        time_data = data.split('_')[2]
        await confirm_booking(query, time_data)
    elif data.startswith('back_to_dates_'):
        parts = data.split('_')
        specialist_id = parts[3]
        service_id = parts[4]
        await show_date_selection(query, specialist_id, service_id)
    elif data.startswith('all_specialists_schedule_'):
        service_id = data.split('_')[3]
        await show_all_specialists_schedule(query, service_id)
    elif data == 'back_to_selection':
        await show_booking_options(query)
    elif data == 'no_date_available':
        await query.answer("На эту дату нет свободного времени")
    elif data == 'no_available_options':
        await query.answer("На данный момент нет доступных вариантов")
    elif data == 'try_later':
        await query.answer("Попробуйте позже")
    elif data == 'cancel_to_main':
        await show_main_menu(query)
    else:
        await query.answer()