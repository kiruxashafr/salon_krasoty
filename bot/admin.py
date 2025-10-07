# admin.py - добавление функционала "Мои записи"
import os
import logging
import requests
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, InputMediaPhoto
from telegram.ext import ContextTypes
from datetime import datetime, timedelta

# Настройка логирования
logger = logging.getLogger(__name__)

# Конфигурация
API_BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:3011')

# Состояния пользователей для админ-панели
admin_states = {}

async def show_admin_panel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Показать админ-панель для мастеров"""
    query = update.callback_query if update.callback_query else None
    user_id = update.effective_user.id

    try:
        # Проверяем, является ли пользователь мастером
        response = requests.get(f"{API_BASE_URL}/api/specialists-all")
        if response.json()['message'] != 'success':
            raise Exception("Error fetching specialists")
            
        masters = response.json()['data']
        user_master = next((m for m in masters if m.get('tg_id') == str(user_id)), None)
        
        if not user_master:
            # Пользователь не является мастером
            message_text = "❌ У вас нет прав доступа к админ-панели"
            keyboard = [[InlineKeyboardButton("☰ Главное меню", callback_data='back_to_main')]]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            if query:
                if query.message.photo:
                    await query.edit_message_caption(caption=message_text, reply_markup=reply_markup)
                else:
                    await query.edit_message_text(text=message_text, reply_markup=reply_markup)
            else:
                await update.message.reply_text(text=message_text, reply_markup=reply_markup)
            return

        # Пользователь является мастером, показываем админ-панель
        photo_url = f"{API_BASE_URL}/photo/images/admin.jpg"
        message_text = f"♔ Админ-панель мастера\n\nМастер: {user_master['имя']}"

        keyboard = [
            [InlineKeyboardButton("⊹ Добавить свободное время", callback_data='admin_add_freetime')],
            [InlineKeyboardButton("≣ Мои записи", callback_data='admin_my_records')],
            [InlineKeyboardButton("⎋ Рассылка", callback_data='admin_broadcast')],  # Новая кнопка
            [InlineKeyboardButton("☰ Главное меню", callback_data='back_to_main')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)

        try:
            photo_response = requests.get(photo_url)
            if photo_response.status_code == 200:
                photo_data = photo_response.content
                if query:
                    media = InputMediaPhoto(media=photo_data, caption=message_text)
                    await query.edit_message_media(media=media, reply_markup=reply_markup)
                else:
                    await update.message.reply_photo(photo=photo_data, caption=message_text, reply_markup=reply_markup)
            else:
                if query:
                    await query.edit_message_text(text=message_text, reply_markup=reply_markup)
                else:
                    await update.message.reply_text(text=message_text, reply_markup=reply_markup)
        except Exception as e:
            logger.error(f"Error showing admin panel: {e}")
            if query:
                await query.edit_message_text(text=message_text, reply_markup=reply_markup)
            else:
                await update.message.reply_text(text=message_text, reply_markup=reply_markup)

    except Exception as e:
        logger.error(f"Error checking master status: {e}")
        message_text = "❌ Ошибка подключения к серверу"
        keyboard = [[InlineKeyboardButton("☰ Главное меню", callback_data='back_to_main')]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        if query:
            await query.edit_message_text(text=message_text, reply_markup=reply_markup)
        else:
            await update.message.reply_text(text=message_text, reply_markup=reply_markup)



async def handle_admin_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик callback для админ-панели"""
    query = update.callback_query
    await query.answer()
    data = query.data
    user_id = update.effective_user.id

    if data == 'admin_panel':
        await show_admin_panel(update, context)
    elif data == 'admin_add_freetime':
        await start_add_freetime(update, context)
    elif data == 'admin_my_records':
        await show_my_records_menu(update, context, user_id)
    elif data == 'admin_my_appointments':
        await show_master_appointments(update, context, user_id)
    elif data == 'admin_my_freetime':
        await show_master_freetime(update, context, user_id)
    elif data == 'admin_broadcast':
        await show_broadcast_menu(update, context, user_id)
    elif data == 'admin_broadcast_menu':
        await show_broadcast_menu(update, context, user_id)
    elif data == 'admin_create_broadcast':
        await start_broadcast_creation(update, context)
    elif data == 'admin_clients_list':
        await show_clients_list(update, context, user_id)
    elif data == 'admin_confirm_broadcast':
        await confirm_and_send_broadcast(update, context, user_id)
    # ДОБАВЬТЕ ЭТИ ОБРАБОТЧИКИ:
    elif data.startswith('admin_select_service_'):
        service_id = data.split('_')[3]
        await select_date_for_freetime(update, context, service_id)
    elif data.startswith('admin_select_date_'):
        date_str = data.split('_')[3]
        await enter_time_for_freetime(update, context, date_str)
    elif data == 'admin_back_to_services':
        await select_service_for_freetime(update, context)
    elif data == 'admin_back_to_records':
        await show_my_records_menu(update, context, user_id)
    else:
        # Если callback не распознан, показываем админ-панель
        logger.warning(f"Неизвестный callback: {data}")
        await show_admin_panel(update, context)



async def show_my_records_menu(update: Update, context: ContextTypes.DEFAULT_TYPE, user_id: int):
    """Показать меню 'Мои записи' с выбором типа"""
    query = update.callback_query
    
    keyboard = [
        [InlineKeyboardButton("⏰ Свободное время", callback_data='admin_my_freetime')],
        [InlineKeyboardButton("📋 Записи клиентов", callback_data='admin_my_appointments')],
        [InlineKeyboardButton("↲ Назад", callback_data='admin_panel')],
        [InlineKeyboardButton("☰ Главное меню", callback_data='back_to_main')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    message_text = "📊 Мои записи\n\nВыберите что хотите посмотреть:"
    
    try:
        await query.edit_message_caption(
            caption=message_text,
            reply_markup=reply_markup
        )
    except Exception as e:
        logger.error(f"Error showing records menu: {e}")
        await query.edit_message_text(
            text=message_text,
            reply_markup=reply_markup
        )

async def show_master_freetime(update: Update, context: ContextTypes.DEFAULT_TYPE, user_id: int):
    """Показать свободное время мастера"""
    query = update.callback_query

    try:
        # Получаем мастера по tg_id
        response = requests.get(f"{API_BASE_URL}/api/specialists-all")
        if response.json()['message'] != 'success':
            raise Exception("Error fetching specialists")
            
        masters = response.json()['data']
        user_master = next((m for m in masters if m.get('tg_id') == str(user_id)), None)
        
        if not user_master:
            await query.edit_message_caption(caption="❌ Мастер не найден")
            return

        # Получаем свободное время мастера (только будущее)
        today = datetime.now().strftime('%Y-%m-%d')
        freetime_response = requests.get(
            f"{API_BASE_URL}/api/freetime-available",
            params={
                'masterId': user_master['id'],
                'fromDate': today
            }
        )

        if freetime_response.json()['message'] != 'success':
            raise Exception("Error fetching free time")

        freetime_data = freetime_response.json()['data']
        
        if not freetime_data:
            message_text = "⏰ У вас нет свободного времени на будущие даты"
        else:
            # Группируем по датам
            grouped_by_date = {}
            for item in freetime_data:
                if item['дата'] not in grouped_by_date:
                    grouped_by_date[item['дата']] = []
                grouped_by_date[item['дата']].append(item)
            
            # Сортируем даты
            sorted_dates = sorted(grouped_by_date.keys())
            
            message_text = "⏰ Ваше свободное время:\n\n"
            
            for date in sorted_dates:
                formatted_date = datetime.strptime(date, '%Y-%m-%d').strftime('%d.%m.%Y')
                message_text += f"📅 {formatted_date}:\n"
                
                # Сортируем время
                grouped_by_date[date].sort(key=lambda x: x['время'])
                
                for item in grouped_by_date[date]:
                    message_text += f"   ⏰ {item['время']} - {item['услуга_название']}\n"
                
                message_text += "\n"

        keyboard = [
            [InlineKeyboardButton("↲ Назад к записям", callback_data='admin_back_to_records')],
            [InlineKeyboardButton("♔ Админ-панель", callback_data='admin_panel')],
            [InlineKeyboardButton("☰ Главное меню", callback_data='back_to_main')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)

        # Проверяем, есть ли фото в сообщении
        if query.message.photo:
            # Если сообщение с фото, редактируем caption
            await query.edit_message_caption(
                caption=message_text,
                reply_markup=reply_markup
            )
        else:
            # Если текстовое сообщение, редактируем текст
            await query.edit_message_text(
                text=message_text,
                reply_markup=reply_markup
            )

    except Exception as e:
        logger.error(f"Error showing master free time: {e}")
        # Также проверяем тип сообщения при ошибке
        if query.message.photo:
            await query.edit_message_caption(caption="❌ Ошибка загрузки свободного времени")
        else:
            await query.edit_message_text(text="❌ Ошибка загрузки свободного времени")



async def start_add_freetime(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Начать процесс добавления свободного времени"""
    query = update.callback_query
    user_id = update.effective_user.id

    # Получаем мастера по tg_id
    try:
        response = requests.get(f"{API_BASE_URL}/api/specialists-all")
        if response.json()['message'] != 'success':
            raise Exception("Error fetching specialists")
            
        masters = response.json()['data']
        user_master = next((m for m in masters if m.get('tg_id') == str(user_id)), None)
        
        if not user_master:
            await query.edit_message_text(text="❌ Мастер не найден")
            return

        # Сохраняем ID мастера в состоянии
        admin_states[user_id] = {
            'step': 'select_service',
            'master_id': user_master['id'],
            'master_name': user_master['имя']
        }

        await select_service_for_freetime(update, context)

    except Exception as e:
        logger.error(f"Error starting freetime addition: {e}")
        await query.edit_message_text(text="❌ Ошибка подключения к серверу")


# admin.py - исправленные функции

async def select_service_for_freetime(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Выбор услуги для свободного времени"""
    query = update.callback_query
    user_id = update.effective_user.id
    user_data = admin_states.get(user_id, {})

    try:
        # Получаем ВСЕ услуги (а не только для конкретного мастера)
        response = requests.get(f"{API_BASE_URL}/api/services-all")
        if response.json()['message'] != 'success':
            raise Exception("Error fetching services")
            
        services = response.json()['data']
        
        if not services:
            await query.edit_message_caption(
                caption="❌ Нет доступных услуг",
                reply_markup=InlineKeyboardMarkup([
                    [InlineKeyboardButton("↲ Назад", callback_data='admin_panel')],
                    [InlineKeyboardButton("☰ Главное меню", callback_data='back_to_main')]
                ])
            )
            return

        keyboard = []
        for service in services:
            # Показываем все услуги, независимо от доступности
            keyboard.append([
                InlineKeyboardButton(
                    f"{service['название']} - {service['цена']}₽",
                    callback_data=f'admin_select_service_{service["id"]}'
                )
            ])
        
        keyboard.append([InlineKeyboardButton("↲ Назад", callback_data='admin_panel')])
        keyboard.append([InlineKeyboardButton("☰ Главное меню", callback_data='back_to_main')])
        
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_caption(
            caption="🎯 Выберите услугу для добавления свободного времени:",
            reply_markup=reply_markup
        )

    except Exception as e:
        logger.error(f"Error selecting service: {e}")
        await query.edit_message_caption(caption="❌ Ошибка загрузки услуг")


async def select_date_for_freetime(update: Update, context: ContextTypes.DEFAULT_TYPE, service_id: str):
    """Выбор даты для свободного времени"""
    query = update.callback_query
    user_id = update.effective_user.id
    user_data = admin_states.get(user_id, {})
    
    # Сохраняем service_id в состоянии
    user_data['service_id'] = service_id
    admin_states[user_id] = user_data

    # Генерируем календарь на ближайшие 7 дней
    today = datetime.now().date()
    dates = [(today + timedelta(days=i)) for i in range(7)]
    
    keyboard = []
    row = []
    for i, date in enumerate(dates):
        formatted_date = date.strftime('%d.%m')
        row.append(InlineKeyboardButton(
            formatted_date,
            callback_data=f'admin_select_date_{date.strftime("%Y-%m-%d")}'
        ))
        
        if len(row) == 2 or i == len(dates) - 1:
            keyboard.append(row)
            row = []
    
    keyboard.append([InlineKeyboardButton("↲ Назад", callback_data='admin_back_to_services')])
    keyboard.append([InlineKeyboardButton("☰ Главное меню", callback_data='back_to_main')])
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    # Используем edit_message_caption вместо edit_message_text
    await query.edit_message_caption(
        caption="📅 Выберите дату для добавления свободного времени:",
        reply_markup=reply_markup
    )





async def enter_time_for_freetime(update: Update, context: ContextTypes.DEFAULT_TYPE, date_str: str):
    """Ввод времени для свободного времени"""
    query = update.callback_query
    user_id = update.effective_user.id
    user_data = admin_states.get(user_id, {})
    
    # Сохраняем дату в состоянии
    user_data['date'] = date_str
    user_data['step'] = 'enter_time'
    admin_states[user_id] = user_data

    formatted_date = datetime.strptime(date_str, '%Y-%m-%d').strftime('%d.%m.%Y')
    
    # Сохраняем сообщение с query для последующего редактирования
    user_data['last_message_id'] = query.message.message_id
    admin_states[user_id] = user_data
    
    # Отправляем новое сообщение с инструкцией
    instruction_message = await query.message.reply_text(
        f"⏰ Введите время для {formatted_date} в формате ЧЧ:ММ\n\n"
        "Пример: 14:30 или 09:00\n"
        "Время должно быть кратно 5 минутам (00, 05, 10, ..., 55)\n\n"
        "Для отмены нажмите /cancel",
        reply_markup=InlineKeyboardMarkup([
            [InlineKeyboardButton("↲ Назад к выбору даты", callback_data=f'admin_select_service_{user_data["service_id"]}')],
            [InlineKeyboardButton("☰ Главное меню", callback_data='back_to_main')]
        ])
    )
    
    # Сохраняем ID сообщения с инструкцией
    user_data['instruction_message_id'] = instruction_message.message_id
    admin_states[user_id] = user_data


async def handle_admin_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик текстовых сообщений для админ-панели"""
    user_id = update.message.from_user.id
    text = update.message.text.strip()

    # Проверяем команду отмены
    if text == '/cancel':
        if user_id in admin_states:
            del admin_states[user_id]
        await update.message.reply_text("Действие отменено.")
        await show_admin_panel(update, context)
        return

    if user_id in admin_states:
        state = admin_states[user_id]

        if state['step'] == 'enter_time':
            # Обработка добавления времени
            time_str = text
            if not validate_time(time_str):
                await update.message.reply_text(
                    "❌ Неверный формат времени!\n\n"
                    "Пожалуйста, введите время в формате ЧЧ:ММ\n"
                    "Пример: 14:30 или 09:00\n"
                    "Время должно быть кратно 5 минутам (00, 05, 10, ..., 55)\n\n"
                    "Для отмены нажмите /cancel"
                )
                return

            # Получаем данные из состояния
            master_id = state['master_id']
            service_id = state['service_id']
            date_str = state['date']

            try:
                # Создаем свободное время через API
                schedule_data = {
                    'дата': date_str,
                    'время': time_str,
                    'мастер_id': int(master_id),
                    'услуга_id': int(service_id),
                    'доступно': 1
                }

                response = requests.post(f"{API_BASE_URL}/api/schedule", 
                                       json=schedule_data)

                if response.status_code == 200 and response.json().get('message') == 'success':
                    await update.message.reply_text("✅ Свободное время успешно добавлено!")
                    
                    # Очищаем состояние
                    if user_id in admin_states:
                        del admin_states[user_id]
                    
                    # Возвращаем в админ-панель
                    await show_admin_panel(update, context)
                else:
                    error_msg = response.json().get('error', 'Неизвестная ошибка')
                    await update.message.reply_text(f"❌ Ошибка при добавлении свободного времени: {error_msg}")

            except Exception as e:
                logger.error(f"Error adding free time: {e}")
                await update.message.reply_text("❌ Ошибка подключения к серверу")
                
        elif state['step'] == 'broadcast_message':
            # Обработчик для сообщения рассылки
            await process_broadcast_message(update, context, user_id)


def validate_time(time_str):
    """Валидация времени в формате HH:MM"""
    import re
    pattern = r'^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$'
    if not re.match(pattern, time_str):
        return False
    
    # Проверяем, что минуты кратны 5
    minutes = int(time_str.split(':')[1])
    return minutes % 5 == 0

async def show_master_appointments(update: Update, context: ContextTypes.DEFAULT_TYPE, user_id: int):
    """Показать записи мастера"""
    query = update.callback_query

    try:
        # Получаем мастера по tg_id
        response = requests.get(f"{API_BASE_URL}/api/specialists-all")
        if response.json()['message'] != 'success':
            raise Exception("Error fetching specialists")
            
        masters = response.json()['data']
        user_master = next((m for m in masters if m.get('tg_id') == str(user_id)), None)
        
        if not user_master:
            await query.edit_message_text(text="❌ Мастер не найден")
            return

        # Получаем записи мастера (текущие и будущие)
        today = datetime.now().strftime('%Y-%m-%d')
        appointments_response = requests.get(
            f"{API_BASE_URL}/api/appointments",
            params={
                'specialistId': user_master['id'],
                'startDate': today
            }
        )

        if appointments_response.json()['message'] != 'success':
            raise Exception("Error fetching appointments")

        appointments = appointments_response.json()['data']
        
        if not appointments:
            message_text = "📋 У вас нет записей на сегодня и будущие даты"
        else:
            # Группируем по датам
            grouped_by_date = {}
            for app in appointments:
                if app['дата'] not in grouped_by_date:
                    grouped_by_date[app['дата']] = []
                grouped_by_date[app['дата']].append(app)
            
            # Сортируем даты
            sorted_dates = sorted(grouped_by_date.keys())
            
            message_text = "📋 Ваши записи:\n\n"
            
            for date in sorted_dates:
                formatted_date = datetime.strptime(date, '%Y-%m-%d').strftime('%d.%m.%Y')
                message_text += f"📅 {formatted_date}:\n"
                
                # Сортируем по времени
                grouped_by_date[date].sort(key=lambda x: x['время'])
                
                for app in grouped_by_date[date]:
                    message_text += (
                        f"   ⏰ {app['время']}\n"
                        f"   👤 {app['клиент_имя']} ({app['клиент_телефон']})\n"
                        f"   🎯 {app['услуга_название']}\n"
                        f"   💵 {app['цена']}₽\n"
                        f"   ────────────────\n"
                    )
                
                message_text += "\n"

        keyboard = [
            [InlineKeyboardButton("↲ Назад к записям", callback_data='admin_back_to_records')],
            [InlineKeyboardButton("♔ Админ-панель", callback_data='admin_panel')],
            [InlineKeyboardButton("☰ Главное меню", callback_data='back_to_main')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)

        # Проверяем, есть ли фото в сообщении
        if query.message.photo:
            # Если сообщение с фото, редактируем caption
            await query.edit_message_caption(
                caption=message_text,
                reply_markup=reply_markup
            )
        else:
            # Если текстовое сообщение, редактируем текст
            await query.edit_message_text(
                text=message_text,
                reply_markup=reply_markup
            )

    except Exception as e:
        logger.error(f"Error showing master appointments: {e}")
        error_text = "❌ Ошибка загрузки записей"
        
        # Проверяем, есть ли фото в сообщении
        if query.message.photo:
            await query.edit_message_caption(caption=error_text)
        else:
            await query.edit_message_text(text=error_text)
    """Показать записи мастера"""
    query = update.callback_query

    try:
        # Получаем мастера по tg_id
        response = requests.get(f"{API_BASE_URL}/api/specialists-all")
        if response.json()['message'] != 'success':
            raise Exception("Error fetching specialists")
            
        masters = response.json()['data']
        user_master = next((m for m in masters if m.get('tg_id') == str(user_id)), None)
        
        if not user_master:
            await query.edit_message_text(text="❌ Мастер не найден")
            return

        # Получаем записи мастера (текущие и будущие)
        today = datetime.now().strftime('%Y-%m-%d')
        appointments_response = requests.get(
            f"{API_BASE_URL}/api/appointments",
            params={
                'specialistId': user_master['id'],
                'startDate': today
            }
        )

        if appointments_response.json()['message'] != 'success':
            raise Exception("Error fetching appointments")

        appointments = appointments_response.json()['data']
        
        if not appointments:
            message_text = "📋 У вас нет записей на сегодня и будущие даты"
        else:
            # Группируем по датам
            grouped_by_date = {}
            for app in appointments:
                if app['дата'] not in grouped_by_date:
                    grouped_by_date[app['дата']] = []
                grouped_by_date[app['дата']].append(app)
            
            # Сортируем даты
            sorted_dates = sorted(grouped_by_date.keys())
            
            message_text = "📋 Ваши записи:\n\n"
            
            for date in sorted_dates:
                formatted_date = datetime.strptime(date, '%Y-%m-%d').strftime('%d.%m.%Y')
                message_text += f"📅 {formatted_date}:\n"
                
                # Сортируем по времени
                grouped_by_date[date].sort(key=lambda x: x['время'])
                
                for app in grouped_by_date[date]:
                    message_text += (
                        f"   ⏰ {app['время']}\n"
                        f"   👤 {app['клиент_имя']} ({app['клиент_телефон']})\n"
                        f"   🎯 {app['услуга_название']}\n"
                        f"   💵 {app['цена']}₽\n"
                        f"   ────────────────\n"
                    )
                
                message_text += "\n"

        keyboard = [
            [InlineKeyboardButton("↲ Назад к записям", callback_data='admin_back_to_records')],
            [InlineKeyboardButton("♔ Админ-панель", callback_data='admin_panel')],
            [InlineKeyboardButton("☰ Главное меню", callback_data='back_to_main')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)

        await query.edit_message_text(text=message_text, reply_markup=reply_markup)

    except Exception as e:
        logger.error(f"Error showing master appointments: {e}")
        await query.edit_message_text(text="❌ Ошибка загрузки записей")
    """Показать записи мастера"""
    query = update.callback_query

    try:
        # Получаем мастера по tg_id
        response = requests.get(f"{API_BASE_URL}/api/specialists-all")
        if response.json()['message'] != 'success':
            raise Exception("Error fetching specialists")
            
        masters = response.json()['data']
        user_master = next((m for m in masters if m.get('tg_id') == str(user_id)), None)
        
        if not user_master:
            await query.edit_message_text(text="❌ Мастер не найден")
            return

        # Получаем записи мастера
        today = datetime.now().strftime('%Y-%m-%d')
        appointments_response = requests.get(
            f"{API_BASE_URL}/api/appointments",
            params={
                'specialistId': user_master['id'],
                'startDate': today
            }
        )

        if appointments_response.json()['message'] != 'success':
            raise Exception("Error fetching appointments")

        appointments = appointments_response.json()['data']
        
        if not appointments:
            message_text = "📋 У вас нет записей на сегодня и будущие даты"
        else:
            message_text = "📋 Ваши записи:\n\n"
            for app in sorted(appointments, key=lambda x: (x['дата'], x['время'])):
                message_text += (
                    f"≣ {app['дата']} {app['время']}\n"
                    f"👤 {app['клиент_имя']} ({app['клиент_телефон']})\n"
                    f"🎯 {app['услуга_название']}\n"
                    f"₽ {app['цена']}₽\n"
                    f"────────────────\n"
                )

        keyboard = [
            [InlineKeyboardButton("♔ Админ-панель", callback_data='admin_panel')],
            [InlineKeyboardButton("☰ Главное меню", callback_data='back_to_main')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)

        await query.edit_message_text(text=message_text, reply_markup=reply_markup)

    except Exception as e:
        logger.error(f"Error showing master appointments: {e}")
        await query.edit_message_text(text="❌ Ошибка загрузки записей")


async def show_broadcast_menu(update: Update, context: ContextTypes.DEFAULT_TYPE, user_id: int):
    """Показать меню рассылки"""
    query = update.callback_query
    
    try:
        # Получаем статистику по клиентам
        response = requests.get(f"{API_BASE_URL}/api/broadcast-stats")
        if response.status_code != 200 or response.json().get('message') != 'success':
            raise Exception("Error fetching broadcast stats")
            
        stats = response.json().get('data', {})
        total_clients = stats.get('total_clients', 0)
        
        message_text = (
            "📢 Рассылка сообщений\n\n"
            f"👥 Всего клиентов с Telegram: {total_clients}\n\n"
            "Выберите действие:"
        )
        
        keyboard = [
            [InlineKeyboardButton("⊹ Создать рассылку", callback_data='admin_create_broadcast')],
            [InlineKeyboardButton("≣ Статистика клиентов", callback_data='admin_clients_list')],
            [InlineKeyboardButton("↲ Назад в админ-панель", callback_data='admin_panel')],
            [InlineKeyboardButton("☰ Главное меню", callback_data='back_to_main')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        # Проверяем тип сообщения (с фото или без)
        if hasattr(query.message, 'photo') and query.message.photo:
            await query.edit_message_caption(
                caption=message_text,
                reply_markup=reply_markup
            )
        else:
            await query.edit_message_text(
                text=message_text,
                reply_markup=reply_markup
            )
        
    except Exception as e:
        logger.error(f"Error showing broadcast menu: {e}")
        error_text = "❌ Ошибка загрузки статистики рассылки"
        
        keyboard = [
            [InlineKeyboardButton("↲ Назад в админ-панель", callback_data='admin_panel')],
            [InlineKeyboardButton("☰ Главное меню", callback_data='back_to_main')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        if hasattr(query.message, 'photo') and query.message.photo:
            await query.edit_message_caption(caption=error_text, reply_markup=reply_markup)
        else:
            await query.edit_message_text(text=error_text, reply_markup=reply_markup)



async def show_clients_list(update: Update, context: ContextTypes.DEFAULT_TYPE, user_id: int):
    """Показать список клиентов для рассылки"""
    query = update.callback_query
    
    try:
        response = requests.get(f"{API_BASE_URL}/api/clients-with-tg")
        if response.json()['message'] != 'success':
            raise Exception("Error fetching clients")
            
        clients = response.json()['data']
        
        if not clients:
            message_text = "❌ Нет клиентов с подключенным Telegram"
        else:
            message_text = f"👥 Список клиентов ({len(clients)}):\n\n"
            
            for i, client in enumerate(clients, 1):
                message_text += f"{i}. {client['имя']} ({client['телефон']})\n"
                
                # Обрезаем длинные сообщения
                if len(message_text) > 3500:  # Лимит Telegram
                    message_text += f"\n... и еще {len(clients) - i} клиентов"
                    break
        
        keyboard = [
            [InlineKeyboardButton("⊹ Создать рассылку", callback_data='admin_create_broadcast')],
            [InlineKeyboardButton("↲ Назад к рассылке", callback_data='admin_broadcast_menu')],
            [InlineKeyboardButton("♔ Админ-панель", callback_data='admin_panel')],
            [InlineKeyboardButton("☰ Главное меню", callback_data='back_to_main')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        # Проверяем тип сообщения
        if query.message.photo:
            await query.edit_message_caption(caption=message_text, reply_markup=reply_markup)
        else:
            await query.edit_message_text(text=message_text, reply_markup=reply_markup)
            
    except Exception as e:
        logger.error(f"Error showing clients list: {e}")
        error_text = "❌ Ошибка загрузки списка клиентов"
        if query.message.photo:
            await query.edit_message_caption(caption=error_text)
        else:
            await query.edit_message_text(text=error_text)

async def start_broadcast_creation(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Начать создание рассылки"""
    query = update.callback_query
    user_id = update.effective_user.id
    
    # Устанавливаем состояние для рассылки
    admin_states[user_id] = {
        'step': 'broadcast_message',
        'broadcast_data': {
            'sent_count': 0,
            'failed_count': 0,
            'start_time': None
        }
    }
    
    message_text = (
        "📝 Создание рассылки\n\n"
        "Введите сообщение для рассылки. Вы можете использовать:\n"
        "• Текст\n"
        "• Эмодзи\n"
        "• HTML-разметку для форматирования\n\n"
        "Пример:\n"
        "<b>Специальное предложение!</b>\n"
        "Только этой недели скидка 20% на все услуги! 🎁"
    )
    
    keyboard = [
        [InlineKeyboardButton("↲ Отмена", callback_data='admin_broadcast_menu')],
        [InlineKeyboardButton("☰ Главное меню", callback_data='back_to_main')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    # Используем правильный метод редактирования сообщения
    if query.message.photo:
        await query.edit_message_caption(
            caption=message_text,
            reply_markup=reply_markup,
            parse_mode='HTML'
        )
    else:
        await query.edit_message_text(
            text=message_text,
            reply_markup=reply_markup,
            parse_mode='HTML'
        )

async def process_broadcast_message(update: Update, context: ContextTypes.DEFAULT_TYPE, user_id: int):
    """Обработать сообщение для рассылки и показать предпросмотр"""
    user_data = admin_states.get(user_id, {})
    
    if user_data.get('step') != 'broadcast_message':
        return
    
    message_text = update.message.text
    
    if not message_text.strip():
        await update.message.reply_text("❌ Сообщение не может быть пустым!")
        return
    
    # Сохраняем сообщение
    user_data['broadcast_data']['message'] = message_text
    admin_states[user_id] = user_data
    
    # Получаем статистику клиентов
    try:
        stats_response = requests.get(f"{API_BASE_URL}/api/broadcast-stats")
        if stats_response.status_code != 200 or stats_response.json().get('message') != 'success':
            raise Exception("Error fetching stats")
        
        stats = stats_response.json().get('data', {})
        total_clients = stats.get('total_clients', 0)
        
        preview_text = (
            "📋 Предпросмотр рассылки\n\n"
            "Ваше сообщение:\n"
            "────────────────────\n"
            f"{message_text}\n"
            "────────────────────\n\n"
            f"👥 Будет отправлено: {total_clients} клиентам\n\n"
            "Подтвердить отправку?"
        )
        
        keyboard = [
            [InlineKeyboardButton("✓ Начать рассылку", callback_data='admin_confirm_broadcast')],
            [InlineKeyboardButton("✎ Изменить сообщение", callback_data='admin_create_broadcast')],
            [InlineKeyboardButton("↲ Отмена", callback_data='admin_broadcast_menu')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            text=preview_text,
            reply_markup=reply_markup,
            parse_mode='HTML'
        )
        
    except Exception as e:
        logger.error(f"Error processing broadcast message: {e}")
        await update.message.reply_text("❌ Ошибка при подготовке рассылки")


async def confirm_and_send_broadcast(update: Update, context: ContextTypes.DEFAULT_TYPE, user_id: int):
    """Подтвердить и начать рассылку"""
    query = update.callback_query
    user_data = admin_states.get(user_id, {})
    
    if not user_data or 'broadcast_data' not in user_data:
        await query.edit_message_text(text="❌ Данные рассылки не найдены")
        return
    
    broadcast_data = user_data['broadcast_data']
    message_text = broadcast_data.get('message', '')
    
    if not message_text:
        await query.edit_message_text(text="❌ Сообщение для рассылки не найдено")
        return
    
    # Начинаем рассылку
    await query.edit_message_text(text="🔄 Начинаем рассылку...")
    
    try:
        # Получаем список клиентов
        clients_response = requests.get(f"{API_BASE_URL}/api/clients-with-tg")
        if clients_response.json()['message'] != 'success':
            raise Exception("Error fetching clients")
        
        clients = clients_response.json()['data']
        total_clients = len(clients)
        
        if total_clients == 0:
            await query.edit_message_text(text="❌ Нет клиентов для рассылки")
            return
        
        # Обновляем данные рассылки
        broadcast_data['total_count'] = total_clients
        broadcast_data['start_time'] = datetime.now().strftime('%H:%M:%S')
        user_data['broadcast_data'] = broadcast_data
        admin_states[user_id] = user_data
        
        # Отправляем рассылку
        success_count = 0
        failed_count = 0
        
        for i, client in enumerate(clients, 1):
            try:
                # Импортируем бота из main
                from main import bot
                
                await bot.send_message(
                    chat_id=client['tg_id'],
                    text=message_text,
                    parse_mode='HTML'
                )
                success_count += 1
                
                # Обновляем прогресс каждые 10 сообщений или для последнего сообщения
                if i % 10 == 0 or i == total_clients:
                    progress = f"📤 Отправлено {i}/{total_clients} сообщений"
                    await query.edit_message_text(text=progress)
                
                # Задержка чтобы не превысить лимиты Telegram
                import asyncio
                await asyncio.sleep(0.1)
                
            except Exception as e:
                logger.error(f"Error sending to client {client['id']}: {e}")
                failed_count += 1
        
        # Финальный отчет
        report_text = (
            "✓ Рассылка завершена!\n\n"
            f"≣ Статистика:\n"
            f"• Всего клиентов: {total_clients}\n"
            f"• Успешно отправлено: {success_count}\n"
            f"• Не удалось отправить: {failed_count}\n"
            f"• Время начала: {broadcast_data['start_time']}\n"
            f"• Время окончания: {datetime.now().strftime('%H:%M:%S')}"
        )
        
        keyboard = [
            [InlineKeyboardButton("⊹ Новая рассылка", callback_data='admin_create_broadcast')],
            [InlineKeyboardButton("♔ Админ-панель", callback_data='admin_panel')],
            [InlineKeyboardButton("☰ Главное меню", callback_data='back_to_main')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(text=report_text, reply_markup=reply_markup)
        
        # Очищаем состояние
        if user_id in admin_states:
            del admin_states[user_id]
            
    except Exception as e:
        logger.error(f"Error during broadcast: {e}")
        await query.edit_message_text(text="❌ Ошибка во время рассылки")