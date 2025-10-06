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

# Конфигурация
API_BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:3011')
BOT_TOKEN = os.getenv('BOT_TOKEN', '8456369002:AAFaxelo1bXHy2hzv5vUwwt8pMAUVu5SHlM')

# Установите часовой пояс Moscow (UTC+3)
TIMEZONE = pytz.timezone('Europe/Moscow')

# Глобальные переменные
bot = None
scheduler = None
notification_loop = None

def initialize_notifications():
    """Инициализация системы уведомлений"""
    global bot, scheduler, notification_loop
    
    try:
        bot = Bot(token=BOT_TOKEN)
        
        # Создаем отдельный event loop для уведомлений
        notification_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(notification_loop)
        
        # УБЕРИТЕ timezone=TIMEZONE - используем системное время сервера
        scheduler = AsyncIOScheduler(event_loop=notification_loop)
        
        # Уведомления будут срабатывать в 18:00 по времени сервера
        scheduler.add_job(
            send_daily_master_notifications,
            CronTrigger(hour=18, minute=00),  # БЕЗ timezone
            id='daily_master_notifications'
        )
        
        scheduler.add_job(
            send_daily_user_notifications,
            CronTrigger(hour=18, minute=00),  # БЕЗ timezone
            id='daily_user_notifications'
        )
        
        # Проверка уведомлений за час каждую минуту
        scheduler.add_job(
            send_hourly_notifications,
            'interval',
            minutes=5,
            id='hourly_notifications_check'
        )
        
        # Проверка новых записей для клиентов каждую минуту
        scheduler.add_job(
            check_new_appointments,
            'interval',
            minutes=3,
            id='new_appointments_check'
        )
        
        # Проверка новых записей для мастеров каждую минуту
        scheduler.add_job(
            check_new_master_appointments,
            'interval',
            minutes=5,
            id='new_master_appointments_check'
        )
        
        scheduler.start()
        logger.info("✅ Система уведомлений инициализирована")
        
    except Exception as e:
        logger.error(f"❌ Ошибка инициализации уведомлений: {e}")

async def send_notification_with_photo(chat_id: int, message: str):
    """Отправка уведомления с фотографией и кнопкой Главное меню"""
    try:
        # Создаем клавиатуру с кнопкой "Главное меню"
        keyboard = InlineKeyboardMarkup([
            [InlineKeyboardButton("🏠 Главное меню", callback_data="main_menu")]
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
            # Если фото не найдено, отправляем только текст с кнопкой
            await bot.send_message(
                chat_id=chat_id, 
                text=message,
                reply_markup=keyboard
            )
            logger.warning(f"Фото notif.jpg не найдено, отправлено текстовое уведомление")
            return False
            
    except Exception as e:
        logger.error(f"Ошибка отправки уведомления с фото: {e}")
        # В случае ошибки отправляем только текст с кнопкой
        try:
            keyboard = InlineKeyboardMarkup([
                [InlineKeyboardButton("☰ Главное меню", callback_data="main_menu")]
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

async def send_notification_without_photo(chat_id: int, message: str):
    """Отправка уведомления без фото с кнопкой Главное меню"""
    try:
        # Создаем клавиатуру с кнопкой "Главное меню"
        keyboard = InlineKeyboardMarkup([
            [InlineKeyboardButton("☰ Главное меню", callback_data="main_menu")]
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
        logger.info("🔄 Проверка новых записей для уведомления мастеров (сегодня)")
        
        # Получаем записи, созданные сегодня
        today_date = datetime.now(TIMEZONE).strftime('%Y-%m-%d')
        
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
            "🔔 Новая запись!\n\n"
            f"👤 Клиент: {appointment['клиент_имя']} ({appointment['клиент_телефон']})\n"
            f"🎯 Услуга: {appointment['услуга_название']}\n"
            f"📅 Дата: {formatted_date}\n"
            f"⏰ Время: {appointment['время']}\n"
            f"💵 Стоимость: {appointment['цена']}₽\n\n"
            f"🕐 Создано: {appointment.get('created_at', 'только что')}"
        )
        
        # Используем новую функцию с фото
        success = await send_notification_with_photo(
            chat_id=appointment['мастер_tg_id'], 
            message=message
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
        logger.info("🔄 Проверка ежедневных уведомлений пользователям (упрощенная версия)")
        
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
                await asyncio.sleep(0.5)  # Задержка между отправками
                    
            except Exception as e:
                logger.error(f"Ошибка обработки записи {appointment.get('id')}: {e}")
                continue
                
        if daily_notifications_sent > 0:
            logger.info(f"✅ Отправлено {daily_notifications_sent} ежедневных уведомлений пользователям")
        else:
            logger.info("ℹ️ Не найдено записей для daily уведомлений")
        
    except Exception as e:
        logger.error(f"Ошибка отправки ежедневных уведомлений: {e}")

async def send_user_daily_notification(appointment):
    """Отправка ежедневного уведомления пользователю"""
    try:
        # Форматируем дату в понятный формат
        appointment_date = datetime.strptime(appointment['дата'], '%Y-%m-%d')
        formatted_date = appointment_date.strftime('%d.%m.%Y')
        
        message = (
            "🔔 НАПОМИНАНИЕ: ЗАВТРА У ВАС ЗАПИСЬ!\n\n"
            f"📅 Дата: {formatted_date}\n"
            f"⏰ Время: {appointment['время']}\n"
            f"🎯 Услуга: {appointment['услуга_название']}\n"
            f"👨‍💼 Мастер: {appointment['мастер_имя']}\n"
            f"💵 Стоимость: {appointment['цена']}₽\n\n"
            "📌 Мы также напомним вам:\n"
            "• За 1 час до записи\n\n"
            "⚠️ Пожалуйста, не опаздывайте!\n"
            "📞 Контакты салона: +7 (XXX) XXX-XX-XX"
        )
        
        # Используем функцию с фото
        success = await send_notification_with_photo(
            chat_id=appointment['клиент_tg_id'], 
            message=message
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
        logger.info("🔄 Проверка уведомлений за час до записи (упрощенная версия)")
        
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
                await asyncio.sleep(0.5)  # Задержка между отправками
                    
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
        # Форматируем дату в понятный формат
        appointment_date = datetime.strptime(appointment['дата'], '%Y-%m-%d')
        formatted_date = appointment_date.strftime('%d.%m.%Y')
        
        message = (
            "⏰ ЧАС ДО ЗАПИСИ!\n\n"
            f"📅 Сегодня в {appointment['время']}\n"
            f"🎯 Услуга: {appointment['услуга_название']}\n"
            f"👨‍💼 Мастер: {appointment['мастер_имя']}\n"
            f"💵 Стоимость: {appointment['цена']}₽\n\n"
            "🚗 Рекомендуем выезжать заранее!\n"
            "📞 Контакты салона: +7 (XXX) XXX-XX-XX"
        )
        
        # Используем функцию с фото
        success = await send_notification_with_photo(
            chat_id=appointment['клиент_tg_id'], 
            message=message
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
        logger.info("🔄 Проверка ежедневных уведомлений мастерам")
        
        # Получаем завтрашнюю дату
        tomorrow = (datetime.now(TIMEZONE) + timedelta(days=1)).strftime('%Y-%m-%d')
        
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
                    
                    # Используем функцию с фото для мастеров
                    success = await send_notification_with_photo(
                        chat_id=master['tg_id'], 
                        message=message
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
                    f"⏰ {app['время']}\n"
                    f"👤 {app['клиент_имя']} ({app['клиент_телефон']})\n"
                    f"🎯 {app['услуга_название']}\n"
                    f"💵 {app['цена']}₽\n"
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
        logger.info("🔄 Проверка новых записей для уведомления клиентов (сегодня)")
        
        # Получаем записи, созданные сегодня
        today_date = datetime.now(TIMEZONE).strftime('%Y-%m-%d')
        
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
        # Форматируем дату в понятный формат
        appointment_date = datetime.strptime(appointment['дата'], '%Y-%m-%d')
        formatted_date = appointment_date.strftime('%d.%m.%Y')
        
        message = (
            "✅ Запись успешно создана!\n\n"
            f"✮ Услуга: {appointment['услуга_название']}\n"
            f"♢ Мастер: {appointment['мастер_имя']}\n"
            f"≣ Дата: {formatted_date}\n"
            f"⏰ Время: {appointment['время']}\n"
            f"💵 Стоимость: {appointment['цена']}₽\n\n"
            "📌 Мы напомним вам о записи:\n"
            "• За день до визита (в 18:00)\n"
            "• За час до записи\n\n"
            "📋 Все ваши записи можно посмотреть в личном кабинете"
        )
        
        # Используем новую функцию с фото
        success = await send_notification_with_photo(
            chat_id=appointment['клиент_tg_id'], 
            message=message
        )
        
        if success:
            # Отмечаем уведомление как отправленное
            mark_response = requests.post(f"{API_BASE_URL}/api/notification-sent", json={
                'запись_id': appointment['id'],
                'тип': 'immediate'
            })
            
            if mark_response.status_code == 200 and mark_response.json().get('message') == 'success':
                logger.info(f"✅ Отправлено немедленное уведомление клиенту {appointment['клиент_tg_id']}")
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