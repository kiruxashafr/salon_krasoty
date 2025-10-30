import os
import logging
import asyncio
import requests
from datetime import datetime, timedelta
from telegram import Bot, InputMediaPhoto, InlineKeyboardButton, InlineKeyboardMarkup
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import pytz

# Настройка логирования
logger = logging.getLogger(__name__)

# Загружаем переменные окружения
from dotenv import load_dotenv
load_dotenv('.env')

# Конфигурация
API_BASE_URL = os.getenv('API_BASE_URL')
BOT_TOKEN = os.getenv('BOT_TOKEN')

# Проверяем наличие переменных
if not API_BASE_URL:
    logger.error("❌ API_BASE_URL не установлен в .env файле")
if not BOT_TOKEN:
    logger.error("❌ BOT_TOKEN не установлен в .env файле")

# Установите часовой пояс Moscow (UTC+3)
TIMEZONE = pytz.timezone('Europe/Moscow')

# Функции для работы с московским временем
def get_moscow_time():
    """Всегда возвращает московское время"""
    return datetime.now(TIMEZONE)

def get_moscow_date():
    """Возвращает дату в московском времени"""
    return get_moscow_time().date()

def get_moscow_datetime():
    """Возвращает datetime в московском времени"""
    return get_moscow_time()

# Глобальные переменные
bot = None
scheduler = None
notification_loop = None

def initialize_notifications():
    """Инициализация системы уведомлений"""
    global bot, scheduler, notification_loop
    
    try:
        bot_token = os.getenv('BOT_TOKEN')
        print(f"DEBUG: Initializing notifications with BOT_TOKEN = {bot_token}")
        if not bot_token:
            raise ValueError("BOT_TOKEN is not set or empty")
        bot = Bot(token=bot_token.strip())
        
        # Создаем отдельный event loop для уведомлений
        notification_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(notification_loop)
        
        # ИСПРАВЛЕНО: Указываем московский часовой пояс для планировщика
        scheduler = AsyncIOScheduler(event_loop=notification_loop, timezone=TIMEZONE)
        
        # ИСПРАВЛЕНО: Уведомления будут срабатывать в 18:00 по МОСКОВСКОМУ времени
        scheduler.add_job(
            send_daily_master_notifications,
            CronTrigger(hour=16, minute=38, timezone=TIMEZONE),  # ДОБАВЛЕНО timezone
            id='daily_master_notifications'
        )
        
        scheduler.add_job(
            send_daily_user_notifications,
            CronTrigger(hour=16, minute=39, timezone=TIMEZONE),  # ДОБАВЛЕНО timezone
            id='daily_user_notifications'
        )
        
        # Проверка уведомлений за час каждую минуту
        scheduler.add_job(
            send_hourly_notifications,
            'interval',
            minutes=1,
            id='hourly_notifications_check'
        )
        
        # Проверка новых записей для клиентов каждую минуту
        scheduler.add_job(
            check_new_appointments,
            'interval',
            minutes=1,
            id='new_appointments_check'
        )
        
        # Проверка новых записей для мастеров каждую минуту
        scheduler.add_job(
            check_new_master_appointments,
            'interval',
            minutes=1,
            id='new_master_appointments_check'
        )
        
        scheduler.start()
        current_time = get_moscow_time()
        logger.info(f"✅ Система уведомлений инициализирована. Московское время: {current_time}")
        
    except Exception as e:
        logger.error(f"❌ Ошибка инициализации уведомлений: {e}")

async def send_notification_with_photo(chat_id: int, message: str, is_client: bool = True):
    """Отправка уведомления с фотографией и кнопками"""
    try:
        # Создаем клавиатуру с кнопками
        if is_client:
            # Для клиентов: показываем кнопку "Личный кабинет"
            keyboard = InlineKeyboardMarkup([
                [InlineKeyboardButton("⎋ Личный кабинет", callback_data="personal_cabinet")],
                [InlineKeyboardButton("☰ Главное меню", callback_data="back_to_main")]
            ])
        else:
            # Для мастеров: НЕ показываем кнопку "Личный кабинет"
            keyboard = InlineKeyboardMarkup([
                [InlineKeyboardButton("☰ Главное меню", callback_data="back_to_main")]
            ])
        
        # URL для получения фотографии
        photo_url = f"{API_BASE_URL}/photo/images/notif.jpg"
        
        # Загружаем фотографию
        photo_response = requests.get(photo_url)
        if photo_response.status_code == 200:
            photo_data = photo_response.content
            await bot.send_photo(
                chat_id=chat_id, 
                photo=photo_data, 
                caption=message,
                reply_markup=keyboard
            )
            return True
        else:
            # Если фото не найдено, отправляем только текст с кнопками
            await bot.send_message(
                chat_id=chat_id, 
                text=message,
                reply_markup=keyboard
            )
            logger.warning(f"Фото notif.jpg не найдено, отправлено текстовое уведомление")
            return False
            
    except Exception as e:
        logger.error(f"Ошибка отправки уведомления с фото: {e}")
        # В случае ошибки отправляем только текст с кнопками
        try:
            if is_client:
                keyboard = InlineKeyboardMarkup([
                    [InlineKeyboardButton("⎋ Личный кабинет", callback_data="personal_cabinet")],
                    [InlineKeyboardButton("☰ Главное меню", callback_data="back_to_main")]
                ])
            else:
                keyboard = InlineKeyboardMarkup([
                    [InlineKeyboardButton("☰ Главное меню", callback_data="back_to_main")]
                ])
                
            await bot.send_message(
                chat_id=chat_id, 
                text=message,
                reply_markup=keyboard
            )
            return True
        except Exception as text_error:
            logger.error(f"Ошибка отправки текстового уведомления: {text_error}")
            return False
        

async def send_notification_without_photo(chat_id: int, message: str, is_client: bool = True):
    """Отправка уведомления без фото с кнопками"""
    try:
        # Создаем клавиатуру с кнопками
        if is_client:
            keyboard = InlineKeyboardMarkup([
                [InlineKeyboardButton("⎋ Личный кабинет", callback_data="personal_cabinet")],
                [InlineKeyboardButton("☰ Главное меню", callback_data="back_to_main")]
            ])
        else:
            keyboard = InlineKeyboardMarkup([
                [InlineKeyboardButton("☰ Главное меню", callback_data="back_to_main")]
            ])
        
        await bot.send_message(
            chat_id=chat_id, 
            text=message,
            reply_markup=keyboard
        )
        return True
            
    except Exception as e:
        logger.error(f"Ошибка отправки текстового уведомления: {e}")
        return False 


async def check_new_master_appointments():
    """Проверка новых записей для уведомления мастеров (только созданные сегодня)"""
    try:
        current_time = get_moscow_time()
        logger.info(f"🔄 Проверка новых записей для уведомления мастеров. Московское время: {current_time}")
        
        # ИСПРАВЛЕНО: Получаем записи, созданные сегодня по московскому времени
        today_date = get_moscow_date().strftime('%Y-%m-%d')
        
        response = requests.get(
            f"{API_BASE_URL}/api/appointments",
            params={'startDate': today_date, 'endDate': today_date}
        )
        
        if response.status_code != 200 or response.json().get('message') != 'success':
            logger.error(f"Ошибка API appointments: {response.status_code} - {response.text}")
            return
            
        appointments = response.json().get('data', [])
        
        # Фильтруем только записи, созданные сегодня (по дате создания)
        today_appointments = []
        for appointment in appointments:
            created_at = appointment.get('created_at', '')
            if created_at.startswith(today_date):
                today_appointments.append(appointment)
        
        new_master_notifications_sent = 0
        
        for appointment in today_appointments:
            try:
                # Проверяем, отправлено ли уже masternew уведомление
                check_notification_response = requests.get(
                    f"{API_BASE_URL}/api/check-notification",
                    params={
                        'запись_id': appointment['id'],
                        'тип': 'masternew'
                    }
                )
                
                # Если уведомление еще не отправлено
                should_send = True
                if (check_notification_response.status_code == 200 and 
                    check_notification_response.json().get('message') == 'success' and 
                    check_notification_response.json().get('sent', False)):
                    should_send = False
                    logger.info(f"Уведомление masternew для записи {appointment['id']} уже отправлено")
                
                if should_send and appointment.get('мастер_tg_id'):
                    await send_master_new_appointment_notification(appointment)
                    new_master_notifications_sent += 1
                    await asyncio.sleep(0.5)
                    
            except Exception as e:
                logger.error(f"Ошибка обработки новой записи для мастера {appointment.get('id')}: {e}")
                continue
                
        logger.info(f"✅ Отправлено {new_master_notifications_sent} уведомлений мастерам о новых записях (сегодня)")
        
    except Exception as e:
        logger.error(f"Ошибка проверки новых записей для мастеров: {e}")

async def send_master_new_appointment_notification(appointment):
    """Отправка уведомления о новой записи мастеру"""
    try:
        # Форматируем дату в понятный формат
        appointment_date = datetime.strptime(appointment['дата'], '%Y-%m-%d')
        formatted_date = appointment_date.strftime('%d.%m.%Y')
        
        message = (
            "⊹ Новая запись!\n\n"
            f"♢ Клиент: {appointment['клиент_имя']} ({appointment['клиент_телефон']})\n"
            f"♢ Услуга: {appointment['услуга_название']}\n"
            f"♢ Дата: {formatted_date}\n"
            f"♢ Время: {appointment['время']}\n"
            f"♢ Стоимость: {appointment['цена']}₽\n\n"
            f"♢ Создано: {appointment.get('created_at', 'только что')}"
        )
        
        # Используем новую функцию с фото
        # Используем новую функцию с фото, is_client=False для мастеров
        success = await send_notification_with_photo(
            chat_id=appointment['мастер_tg_id'], 
            message=message,
            is_client=False  # МАСТЕР - не показываем личный кабинет
        )
        
        if success:
            # Отмечаем уведомление как отправленное
            mark_response = requests.post(f"{API_BASE_URL}/api/notification-sent", json={
                'запись_id': appointment['id'],
                'тип': 'masternew'
            })
            
            if mark_response.status_code == 200 and mark_response.json().get('message') == 'success':
                logger.info(f"✅ Отправлено уведомление о новой записи мастеру {appointment['мастер_tg_id']}")
            else:
                logger.error(f"❌ Ошибка отметки уведомления как отправленного: {mark_response.text}")
        
    except Exception as e:
        logger.error(f"Ошибка отправки уведомления о новой записи мастеру: {e}")

async def send_daily_user_notifications():
    """Упрощенная версия отправки ежедневных уведомлений пользователям"""
    try:
        current_time = get_moscow_time()
        logger.info(f"🔄 Проверка ежедневных уведомлений пользователям. Московское время: {current_time}")
        
        # Используем новый упрощенный endpoint
        response = requests.get(f"{API_BASE_URL}/api/appointments-for-daily-simple")
        
        if response.status_code != 200:
            logger.error(f"Ошибка API: {response.status_code} - {response.text}")
            return
            
        result = response.json()
        if result.get('message') != 'success':
            logger.error(f"Ошибка в ответе API: {result}")
            return
            
        appointments = result.get('data', [])
        
        daily_notifications_sent = 0
        
        for appointment in appointments:
            try:
                await send_user_daily_notification(appointment)
                daily_notifications_sent += 1
                await asyncio.sleep(0.5)
                    
            except Exception as e:
                logger.error(f"Ошибка обработки записи {appointment.get('id')}: {e}")
                continue
                
        if daily_notifications_sent > 0:
            logger.info(f"✅ Отправлено {daily_notifications_sent} ежедневных уведомлений пользователям")
        else:
            logger.info("ℹ️ Не найдено записей для daily уведомлений")
        
    except Exception as e:
        logger.error(f"Ошибка отправки ежедневных уведомлений: {e}")


def get_salon_phone():
    """Получить номер телефона салона из базы данных"""
    try:
        response = requests.get(f"{API_BASE_URL}/api/links")
        if response.status_code == 200:
            data = response.json()
            if data.get('message') == 'success':
                phone = data.get('data', {}).get('phone_contact')
                if phone:
                    # Форматируем номер для красивого отображения
                    return format_phone_number(phone)
        return "+7 (XXX) XXX-XX-XX"  # Запасной вариант
    except Exception as e:
        logger.error(f"Ошибка получения телефона салона: {e}")
        return "+7 (XXX) XXX-XX-XX"

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

    


async def send_user_daily_notification(appointment):
    """Отправка ежедневного уведомления пользователю"""
    try:
        salon_phone = get_salon_phone()
        
        # Форматируем дату в понятный формат
        appointment_date = datetime.strptime(appointment['дата'], '%Y-%m-%d')
        formatted_date = appointment_date.strftime('%d.%m.%Y')
        
        message = (
            "✮  НАПОМИНАНИЕ: ЗАВТРА У ВАС ЗАПИСЬ!\n\n"
            f"♢ Дата: {formatted_date}\n"
            f"♢ Время: {appointment['время']}\n"
            f"♢ Услуга: {appointment['услуга_название']}\n"
            f"♢ Мастер: {appointment['мастер_имя']}\n"
            f"♢ Стоимость: {appointment['цена']}₽\n\n"
            " Мы также напомним вам:\n"
            "• За 1 час до записи\n\n"
            "≣ Пожалуйста, не опаздывайте!\n"
            f"≣ Контакты салона: {salon_phone}"
        )
                
        # Используем функцию с фото, is_client=True для клиентов
        success = await send_notification_with_photo(
            chat_id=appointment['клиент_tg_id'], 
            message=message,
            is_client=True
        )
        
        if success:
            # Отмечаем уведомление как отправленное
            mark_response = requests.post(f"{API_BASE_URL}/api/notification-sent", json={
                'запись_id': appointment['id'],
                'тип': 'daily'
            })
            
            if mark_response.status_code == 200 and mark_response.json().get('message') == 'success':
                logger.info(f"✅ Отправлено daily уведомление клиенту {appointment['клиент_tg_id']} для записи {appointment['id']}")
            else:
                logger.error(f"❌ Ошибка отметки daily уведомления: {mark_response.text}")
        else:
            logger.error(f"❌ Не удалось отправить daily уведомление клиенту {appointment['клиент_tg_id']}")
        
    except Exception as e:
        logger.error(f"Ошибка отправки daily уведомления: {e}")




async def send_hourly_notifications():
    """Упрощенная версия отправки уведомлений за час до записи"""
    try:
        current_time = get_moscow_time()
        logger.info(f"🔄 Проверка уведомлений за час до записи. Московское время: {current_time}")
        
        # Используем новый упрощенный endpoint
        response = requests.get(f"{API_BASE_URL}/api/appointments-for-hourly-simple")
        
        if response.status_code != 200:
            logger.error(f"Ошибка API: {response.status_code} - {response.text}")
            return
            
        result = response.json()
        if result.get('message') != 'success':
            logger.error(f"Ошибка в ответе API: {result}")
            return
            
        appointments = result.get('data', [])
        
        hourly_notifications_sent = 0
        
        for appointment in appointments:
            try:
                await send_user_hourly_notification(appointment)
                hourly_notifications_sent += 1
                await asyncio.sleep(0.5)
                    
            except Exception as e:
                logger.error(f"Ошибка обработки записи {appointment.get('id')}: {e}")
                continue
                
        if hourly_notifications_sent > 0:
            logger.info(f"✅ Отправлено {hourly_notifications_sent} уведомлений за час до записи")
        else:
            logger.info("ℹ️ Не найдено записей для hourly уведомлений")
        
    except Exception as e:
        logger.error(f"Ошибка отправки уведомлений за час до записи: {e}")

async def send_user_hourly_notification(appointment):
    """Отправка уведомления пользователю за час до записи"""
    try:
        salon_phone = get_salon_phone()
        
        # Форматируем дату в понятный формат
        appointment_date = datetime.strptime(appointment['дата'], '%Y-%m-%d')
        formatted_date = appointment_date.strftime('%d.%m.%Y')
        
        message = (
            "⊹ ЧАС ДО ЗАПИСИ!\n\n"
            f"♢ Сегодня в {appointment['время']}\n"
            f"♢ Услуга: {appointment['услуга_название']}\n"
            f"♢ Мастер: {appointment['мастер_имя']}\n"
            f"♢ Стоимость: {appointment['цена']}₽\n\n"
            "♢ Рекомендуем выезжать заранее!\n"
            f"♢ Контакты салона: {salon_phone}"
        )
        
        # Используем функцию с фото, is_client=True для клиентов
        success = await send_notification_with_photo(
            chat_id=appointment['клиент_tg_id'], 
            message=message,
            is_client=True
        )
        
        if success:
            # Отмечаем уведомление как отправленное
            mark_response = requests.post(f"{API_BASE_URL}/api/notification-sent", json={
                'запись_id': appointment['id'],
                'тип': 'hourly'
            })
            
            if mark_response.status_code == 200 and mark_response.json().get('message') == 'success':
                logger.info(f"✅ Отправлено hourly уведомление клиенту {appointment['клиент_tg_id']} для записи {appointment['id']}")
            else:
                logger.error(f"❌ Ошибка отметки hourly уведомления: {mark_response.text}")
        else:
            logger.error(f"❌ Не удалось отправить hourly уведомление клиенту {appointment['клиент_tg_id']}")
        
    except Exception as e:
        logger.error(f"Ошибка отправки hourly уведомления: {e}")




async def send_daily_master_notifications():
    """Упрощенная версия отправки ежедневных уведомлений мастерам"""
    try:
        current_time = get_moscow_time()
        logger.info(f"🔄 Проверка ежедневных уведомлений мастерам. Московское время: {current_time}")
        
        # ИСПРАВЛЕНО: Получаем завтрашнюю дату по московскому времени
        tomorrow = (get_moscow_date() + timedelta(days=1)).strftime('%Y-%m-%d')
        
        # Получаем всех мастеров
        response = requests.get(f"{API_BASE_URL}/api/specialists-all")
        if response.json().get('message') != 'success':
            logger.error(f"Ошибка API specialists-all: {response.json()}")
            return
            
        masters = response.json().get('data', [])
        
        master_notifications_sent = 0
        
        for master in masters:
            if master.get('tg_id'):
                try:
                    # Получаем записи мастера на завтра
                    appointments_response = requests.get(
                        f"{API_BASE_URL}/api/appointments",
                        params={
                            'specialistId': master['id'],
                            'startDate': tomorrow,
                            'endDate': tomorrow
                        }
                    )
                    
                    if appointments_response.json().get('message') != 'success':
                        logger.error(f"Ошибка получения записей для мастера {master['id']}")
                        continue
                    
                    appointments = appointments_response.json().get('data', [])
                    
                    # ЕСЛИ НЕТ ЗАПИСЕЙ - ПРОПУСТИТЬ ЭТОГО МАСТЕРА
                    if not appointments:
                        logger.info(f"ℹ️ У мастера {master['id']} нет записей на завтра, уведомление не отправляется")
                        continue
                    
                    # Есть записи - формируем сообщение
                    message = f"≣ Ваши записи на завтра ({tomorrow}):\n\n"
                    
                    # Сортируем записи по времени
                    appointments.sort(key=lambda x: x['время'])
                    
                    for app in appointments:
                        message += (
                            f"⏰ {app['время']}\n"
                            f"👤 {app['клиент_имя']} ({app['клиент_телефон']})\n"
                            f"🎯 {app['услуга_название']}\n"
                            f"💵 {app['цена']}₽\n"
                            f"────────────────\n"
                        )
                    
                    # Используем функцию с фото для мастеров, is_client=False
                    success = await send_notification_with_photo(
                        chat_id=master['tg_id'], 
                        message=message,
                        is_client=False
                    )
                    
                    if success:
                        master_notifications_sent += 1
                        logger.info(f"✅ Отправлено ежедневное уведомление мастеру {master['id']}")
                    
                    await asyncio.sleep(0.5)
                    
                except Exception as e:
                    logger.error(f"Ошибка отправки уведомления мастеру {master.get('id')}: {e}")
                    continue
                
        if master_notifications_sent > 0:
            logger.info(f"✅ Отправлено {master_notifications_sent} ежедневных уведомлений мастерам")
        else:
            logger.info("ℹ️ Не найдено мастеров с записями для daily уведомлений")
        
    except Exception as e:
        logger.error(f"Ошибка отправки ежедневных уведомлений мастерам: {e}")

async def send_master_daily_notification(master_id, tg_id, date):
    """Отправка уведомления конкретному мастеру о записях на указанную дату"""
    try:
        response = requests.get(
            f"{API_BASE_URL}/api/appointments",
            params={
                'specialistId': master_id,
                'startDate': date,
                'endDate': date
            }
        )
        
        if response.json()['message'] != 'success':
            logger.error(f"Ошибка API appointments для мастера {master_id}: {response.json()}")
            return
            
        appointments = response.json()['data']
        
        if not appointments:
            message = f"≣ На {datetime.strptime(date, '%Y-%m-%d').strftime('%d.%m.%Y')} у вас нет записей"
        else:
            message = f"≣ Ваши записи на {datetime.strptime(date, '%Y-%m-%d').strftime('%d.%m.%Y')}:\n\n"
            
            # Сортируем по времени
            appointments.sort(key=lambda x: x['время'])
            
            for app in appointments:
                message += (
                    f"≣ {app['время']}\n"
                    f"≣ {app['клиент_имя']} ({app['клиент_телефон']})\n"
                    f"≣ {app['услуга_название']}\n"
                    f"≣ {app['цена']}₽\n"
                    f"────────────────\n"
                )
        
        # Используем новую функцию с фото для мастеров
        success = await send_notification_with_photo(chat_id=tg_id, message=message)
        
        if success:
            logger.info(f"✅ Отправлено ежедневное уведомление мастеру {master_id}")
        
    except Exception as e:
        logger.error(f"Ошибка отправки уведомления мастеру {master_id}: {e}")

async def check_new_appointments():
    """Проверка новых записей для уведомления клиентов (только созданные сегодня)"""
    try:
        current_time = get_moscow_time()
        logger.info(f"🔄 Проверка новых записей для уведомления клиентов. Московское время: {current_time}")
        
        # ИСПРАВЛЕНО: Получаем записи, созданные сегодня по московскому времени
        today_date = get_moscow_date().strftime('%Y-%m-%d')
        
        response = requests.get(
            f"{API_BASE_URL}/api/appointments",
            params={'startDate': today_date, 'endDate': today_date}
        )
        
        if response.status_code != 200 or response.json().get('message') != 'success':
            logger.error(f"Ошибка API appointments: {response.status_code} - {response.text}")
            return
            
        appointments = response.json().get('data', [])
        
        # Фильтруем только записи, созданные сегодня (по дате создания)
        today_appointments = []
        for appointment in appointments:
            created_at = appointment.get('created_at', '')
            if created_at.startswith(today_date):
                today_appointments.append(appointment)
        
        new_client_notifications_sent = 0
        
        for appointment in today_appointments:
            try:
                # Проверяем, отправлено ли уже immediate уведомление клиенту
                check_notification_response = requests.get(
                    f"{API_BASE_URL}/api/check-notification",
                    params={
                        'запись_id': appointment['id'],
                        'тип': 'immediate'
                    }
                )
                
                # Если уведомление еще не отправлено
                should_send = True
                if (check_notification_response.status_code == 200 and 
                    check_notification_response.json().get('message') == 'success' and 
                    check_notification_response.json().get('sent', False)):
                    should_send = False
                    logger.info(f"Уведомление immediate для записи {appointment['id']} уже отправлено")
                
                if should_send and appointment.get('клиент_tg_id'):
                    await send_immediate_client_notification(appointment)
                    new_client_notifications_sent += 1
                    await asyncio.sleep(0.5)
                    
            except Exception as e:
                logger.error(f"Ошибка обработки новой записи для клиента {appointment.get('id')}: {e}")
                continue
                
        logger.info(f"✅ Отправлено {new_client_notifications_sent} уведомлений клиентам о новых записях (сегодня)")
        
    except Exception as e:
        logger.error(f"Ошибка проверки новых записей для клиентов: {e}")

async def send_immediate_client_notification(appointment):
    """Немедленная отправка уведомления клиенту о successful записи"""
    try:
        salon_phone = get_salon_phone()
        
        # Форматируем дату в понятный формат
        appointment_date = datetime.strptime(appointment['дата'], '%Y-%m-%d')
        formatted_date = appointment_date.strftime('%d.%m.%Y')
        
        message = (
            "⊹ Запись успешно создана!\n\n"
            f"✮ Услуга: {appointment['услуга_название']}\n"
            f"♢ Мастер: {appointment['мастер_имя']}\n"
            f"≣ Дата: {formatted_date}\n"
            f"≣ Время: {appointment['время']}\n"
            f"≣ Стоимость: {appointment['цена']}₽\n\n"
            "≣ Мы напомним вам о записи:\n"
            "• За день до визита (в 18:00)\n"
            "• За час до записи\n\n"
            f"≣ Контакты салона: {salon_phone}\n\n"
            "≣ Все ваши записи можно посмотреть в личном кабинете"
        )
        
        # Используем функцию с фото, is_client=True для клиентов
        success = await send_notification_with_photo(
            chat_id=appointment['клиент_tg_id'], 
            message=message,
            is_client=True
        )
            
        if success:
            # Отмечаем уведомление как отправленное
            mark_response = requests.post(f"{API_BASE_URL}/api/notification-sent", json={
                'запись_id': appointment['id'],
                'тип': 'immediate'
            })
            
            if mark_response.status_code == 200 and mark_response.json().get('message') == 'success':
                logger.info(f"✅ Отправлено немедленное уведомление клиенту {appointment['клиент_tg_id']} с кнопкой личного кабинета")
            else:
                logger.error(f"❌ Ошибка отметки immediate уведомления: {mark_response.text}")
        
    except Exception as e:
        logger.error(f"Ошибка отправки немедленного уведомления клиенту: {e}")

def shutdown_notifications():
    """Остановка системы уведомлений"""
    global scheduler, notification_loop
    
    if scheduler:
        try:
            scheduler.shutdown()
            logger.info("✅ Система уведомлений остановлена")
        except Exception as e:
            logger.error(f"❌ Ошибка остановки планировщика: {e}")
    
    if notification_loop:
        try:
            notification_loop.stop()
            notification_loop.close()
            logger.info("✅ Event loop уведомлений остановлен")
        except Exception as e:
            logger.error(f"❌ Ошибка остановки event loop: {e}")