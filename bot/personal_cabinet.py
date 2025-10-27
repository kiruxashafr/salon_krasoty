# personal_cabinet.py
import os
import logging
import requests
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, InputMediaPhoto
from telegram.ext import ContextTypes
from datetime import datetime
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
# Состояния пользователей для личного кабинета
personal_states = {}

async def show_personal_cabinet(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Показать личный кабинет или начать регистрацию"""
    query = update.callback_query if update.callback_query else None
    user_id = update.effective_user.id  # Telegram user ID

    try:
        # Проверяем, зарегистрирован ли пользователь по tg_id
        response = requests.get(f"{API_BASE_URL}/api/client/by-tg/{user_id}")
        data = response.json()

        if data['message'] == 'success' and data['data']:
            # Пользователь зарегистрирован, показываем меню личного кабинета
            await show_cabinet_menu(update, context, user_id)
        else:
            # Не зарегистрирован, начинаем процесс регистрации
            personal_states[user_id] = {'step': 'enter_phone'}
            message_text = (
                "🔑 Добро пожаловать в личный кабинет!\n\n"
                "Для регистрации введите ваш номер телефона в формате +7XXXXXXXXXX\n"
                "Пример: +79255355278"
            )
            keyboard = [
                [InlineKeyboardButton("↲ Отмена", callback_data='back_to_main')]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)

            if query:
                await query.edit_message_caption(caption=message_text, reply_markup=reply_markup)
            else:
                await update.message.reply_text(text=message_text, reply_markup=reply_markup)

    except Exception as e:
        logger.error(f"Error checking user registration: {e}")
        message_text = "❌ Ошибка подключения к серверу"
        keyboard = [
            [InlineKeyboardButton("↲ Назад", callback_data='back_to_main')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        if query:
            try:
                await query.edit_message_caption(caption=message_text, reply_markup=reply_markup)
            except Exception as caption_error:
                logger.error(f"Error editing message caption: {caption_error}")
                await query.edit_message_text(text=message_text, reply_markup=reply_markup)
        else:
            await update.message.reply_text(text=message_text, reply_markup=reply_markup)

async def show_cabinet_menu(update: Update, context: ContextTypes.DEFAULT_TYPE, user_id: int):
    """Показать меню личного кабинета"""
    query = update.callback_query if update.callback_query else None
    photo_url = f"{API_BASE_URL}/photo/images/lk.jpg"

    try:
        # Получаем данные клиента
        response = requests.get(f"{API_BASE_URL}/api/client/by-tg/{user_id}")
        data = response.json()

        if data['message'] == 'success' and data['data']:
            client_data = data['data']
            client_name = client_data.get('имя', 'Неизвестно')
            client_phone = client_data.get('телефон', 'Не указан')
            
            message_text = (
                "🔑 Личный кабинет\n\n"
                f"👤 {client_name} "
                f" {client_phone}"
            )
        else:
            message_text = "🔑 Личный кабинет"

    except Exception as e:
        logger.error(f"Error fetching client data: {e}")
        message_text = "🔑 Личный кабинет"

    # Обновленная клавиатура с 4 кнопками
    keyboard = [
        [InlineKeyboardButton("○ Актуальные записи", callback_data='cabinet_current')],
        [InlineKeyboardButton("≣ История записей", callback_data='cabinet_history')],
        [InlineKeyboardButton("⎋ Выйти из личного кабинета", callback_data='cabinet_logout')],
        [InlineKeyboardButton("☰ Главное меню", callback_data='back_to_main')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    try:
        photo_response = requests.get(photo_url)
        if photo_response.status_code == 200:
            photo_data = photo_response.content
            media = InputMediaPhoto(media=photo_data, caption=message_text)
            if query:
                await query.edit_message_media(media=media, reply_markup=reply_markup)
            else:
                await update.message.reply_photo(photo=photo_data, caption=message_text, reply_markup=reply_markup)
        else:
            if query:
                await query.edit_message_caption(caption=message_text, reply_markup=reply_markup)
            else:
                await update.message.reply_text(text=message_text, reply_markup=reply_markup)
    except Exception as e:
        logger.error(f"Error showing cabinet menu: {e}")
        if query:
            await query.edit_message_caption(caption=message_text, reply_markup=reply_markup)
        else:
            await update.message.reply_text(text=message_text, reply_markup=reply_markup)

async def handle_personal_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик callback для личного кабинета"""
    query = update.callback_query
    await query.answer()
    data = query.data
    user_id = update.effective_user.id
    
    print(f"DEBUG: Personal cabinet callback: {data} from user: {user_id}")  # Отладочная информация

    if data == 'cabinet_history':
        await show_history(update, context, user_id)
    elif data == 'cabinet_current':
        await show_current_appointments(update, context, user_id)
    elif data == 'cabinet_logout':
        print(f"DEBUG: Logout requested for user: {user_id}")  # Отладочная информация
        await logout_from_cabinet(update, context, user_id)
    elif data == 'personal_cabinet':
        await show_personal_cabinet(update, context)



async def logout_from_cabinet(update: Update, context: ContextTypes.DEFAULT_TYPE, user_id: int):
    """Выйти из личного кабинета - установить уникальный tg_id и вернуться в главное меню"""
    query = update.callback_query
    
    try:
        # Получаем данные клиента для поиска ID
        response = requests.get(f"{API_BASE_URL}/api/client/by-tg/{user_id}")
        logger.info(f"DEBUG: Client by tg response status: {response.status_code}")
        logger.info(f"DEBUG: Client by tg response text: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get('message') == 'success' and data.get('data'):
                client_data = data['data']
                client_id = client_data['id']
                
                # Создаем уникальное значение для tg_id, которое не будет конфликтовать
                # Используем отрицательное значение с префиксом "deleted_"
                unique_tg_id = f"deleted_{user_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
                
                update_response = requests.patch(
                    f"{API_BASE_URL}/api/client/{client_id}", 
                    json={'tg_id': unique_tg_id}
                )
                logger.info(f"DEBUG: Update client response status: {update_response.status_code}")
                logger.info(f"DEBUG: Update client response text: {update_response.text}")
                
                if update_response.status_code == 200:
                    update_data = update_response.json()
                    if update_data.get('message') == 'success':
                        # Удаляем состояние пользователя если есть
                        if user_id in personal_states:
                            del personal_states[user_id]
                        
                        message_text = "✅ Вы вышли из личного кабинета. Для доступа потребуется повторная регистрация."
                        
                        # Сначала показываем сообщение о выходе
                        await query.edit_message_caption(caption=message_text)
                        
                        # Затем отправляем новое сообщение с главным меню
                        from menu_handlers import show_main_menu
                        await show_main_menu(update, context)
                        
                        return
                    else:
                        message_text = "❌ Ошибка при обновлении данных"
                else:
                    message_text = "❌ Ошибка сервера при обновлении"
            else:
                message_text = "❌ Клиент не найден"
        else:
            message_text = "❌ Ошибка подключения к серверу"
            
        # Если дошли сюда, значит произошла ошибка
        await query.edit_message_caption(caption=message_text)
            
    except Exception as e:
        logger.error(f"Error during logout: {e}", exc_info=True)
        message_text = "❌ Ошибка подключения к серверу"
        
        try:
            await query.edit_message_caption(caption=message_text)
        except Exception as edit_error:
            logger.error(f"Error editing message: {edit_error}")
            await query.message.reply_text(message_text)





async def handle_personal_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик текстовых сообщений для регистрации в личном кабинете"""
    user_id = update.message.from_user.id
    text = update.message.text

    if user_id in personal_states:
        state = personal_states[user_id]

        if state['step'] == 'enter_phone':
            if not validate_phone(text):
                await update.message.reply_text(
                    "❌ Неверный формат телефона!\n\n"
                    "Пожалуйста, введите телефон в формате +7XXXXXXXXXX\n"
                    "Пример: +79255355278"
                )
                return

            state['phone'] = text
            # Проверяем, существует ли клиент с таким телефоном
            try:
                response = requests.get(f"{API_BASE_URL}/api/client/by-phone/{text}")
                data = response.json()

                if data['message'] == 'success' and data['data']:
                    # Клиент существует, обновляем tg_id
                    client_id = data['data']['id']
                    update_response = requests.patch(f"{API_BASE_URL}/api/client/{client_id}", json={'tg_id': str(user_id)})
                    if update_response.json()['message'] == 'success':
                        await update.message.reply_text("✅ Регистрация успешна! Теперь вы можете использовать личный кабинет.")
                        del personal_states[user_id]
                        await show_cabinet_menu(update, context, user_id)
                    else:
                        await update.message.reply_text("❌ Ошибка обновления данных.")
                else:
                    # Клиент не существует, просим имя
                    state['step'] = 'enter_name'
                    await update.message.reply_text("📝 Введите ваше имя:")

            except Exception as e:
                logger.error(f"Error during phone check: {e}")
                await update.message.reply_text("❌ Ошибка подключения к серверу")

        elif state['step'] == 'enter_name':
            if not text.strip():
                await update.message.reply_text("❌ Имя не может быть пустым!")
                return

            try:
                # Добавляем нового клиента
                response = requests.post(f"{API_BASE_URL}/api/client", json={
                    'имя': text.strip(),
                    'телефон': state['phone'],
                    'tg_id': str(user_id)
                })
                if response.json()['message'] == 'success':
                    await update.message.reply_text("✓ Регистрация успешна! Теперь вы можете использовать личный кабинет.")
                    del personal_states[user_id]
                    await show_cabinet_menu(update, context, user_id)
                else:
                    await update.message.reply_text("❌ Ошибка создания аккаунта.")

            except Exception as e:
                logger.error(f"Error creating client: {e}")
                await update.message.reply_text("❌ Ошибка подключения к серверу")

def validate_phone(phone):
    """Валидация номера телефона в формате +7XXXXXXXXXX"""
    import re
    pattern = r'^\+7\d{10}$'
    return re.match(pattern, phone) is not None

async def show_history(update: Update, context: ContextTypes.DEFAULT_TYPE, user_id: int):
    """Показать историю записей (прошлые)"""
    await show_appointments(update, context, user_id, is_history=True)

async def show_current_appointments(update: Update, context: ContextTypes.DEFAULT_TYPE, user_id: int):
    """Показать актуальные записи (будущие)"""
    await show_appointments(update, context, user_id, is_history=False)

async def show_appointments(update: Update, context: ContextTypes.DEFAULT_TYPE, user_id: int, is_history: bool):
    """Общий метод для показа записей"""
    query = update.callback_query
    photo_url = f"{API_BASE_URL}/photo/images/lk.jpg"

    try:
        # Сначала находим client_id по tg_id
        client_response = requests.get(f"{API_BASE_URL}/api/client/by-tg/{user_id}")
        client_data = client_response.json()
        if client_data['message'] != 'success' or not client_data['data']:
            raise Exception("Client not found")

        client_id = client_data['data']['id']

        # Получаем все записи клиента (аналогично client.js)
        response = requests.get(f"{API_BASE_URL}/api/client/{client_id}/appointments")
        data = response.json()

        if data['message'] == 'success':
            appointments = data['data']['appointments']
            now = datetime.now().date()

            # Фильтруем записи
            filtered_appointments = [
                app for app in appointments
                if (datetime.strptime(app['дата'], '%Y-%m-%d').date() < now) == is_history
            ]

            if not filtered_appointments:
                message_text = "❌ Нет записей в этом разделе."
            else:
                message_text = f"{'≣ История записей' if is_history else '≣ Актуальные записи'}\n\n"
                for app in sorted(filtered_appointments, key=lambda x: x['дата'], reverse=not is_history):
                    message_text += (
                        f"≣ {app['дата']} {app['время']}\n"
                        f"✮ {app['услуга_название']}\n"
                        f"♢ {app['мастер_имя']}\n"
                        f"₽ {app['цена']}₽\n\n"
                    )

            keyboard = [
                [InlineKeyboardButton("↲ Назад в кабинет", callback_data='personal_cabinet')],
                [InlineKeyboardButton("☰ Главное меню", callback_data='back_to_main')]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)

            try:
                photo_response = requests.get(photo_url)
                if photo_response.status_code == 200:
                    photo_data = photo_response.content
                    media = InputMediaPhoto(media=photo_data, caption=message_text)
                    await query.edit_message_media(media=media, reply_markup=reply_markup)
                else:
                    await query.edit_message_caption(caption=message_text, reply_markup=reply_markup)
            except Exception as e:
                logger.error(f"Error showing appointments: {e}")
                await query.edit_message_caption(caption=message_text, reply_markup=reply_markup)
        else:
            raise Exception("Error fetching appointments")

    except Exception as e:
        logger.error(f"Error fetching appointments: {e}")
        message_text = "❌ Ошибка загрузки записей"
        keyboard = [
            [InlineKeyboardButton("↲ Назад в кабинет", callback_data='personal_cabinet')],
            [InlineKeyboardButton("☰ Главное меню", callback_data='back_to_main')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_caption(caption=message_text, reply_markup=reply_markup)