# notification.py
import os
import logging
import asyncio
import requests
from datetime import datetime, timedelta
from telegram import Bot
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import pytz

# Настройка логирования
logger = logging.getLogger(__name__)

# Конфигурация
API_BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:3000')
BOT_TOKEN = os.getenv('BOT_TOKEN', '8456369002:AAFaxelo1bXHy2hzv5vUwwt8pMAUVu5SHlM')

# Установите часовой пояс Moscow (UTC+3)
TIMEZONE = pytz.timezone('Europe/Moscow')

# Глобальные переменные
bot = None
scheduler = None
last_check_time = datetime.now(TIMEZONE)  # Текущее время в MSK

def initialize_notifications():
    """Инициализация системы уведомлений"""
    global bot, scheduler
    
    try:
        bot = Bot(token=BOT_TOKEN)
        scheduler = AsyncIOScheduler(timezone=TIMEZONE)
        
        # Ежедневное уведомление в 18:00 по MSK
        scheduler.add_job(
            send_daily_notifications,
            CronTrigger(hour=18, minute=0, timezone=TIMEZONE),
            id='daily_notifications'
        )
        
        # Проверка новых записей каждые 10 секунд
        scheduler.add_job(
            check_new_appointments,
            'interval',
            minutes=1,
            id='new_appointments_check'
        )
        
        scheduler.start()
        logger.info("✅ Система уведомлений инициализирована")
        
    except Exception as e:
        logger.error(f"❌ Ошибка инициализации уведомлений: {e}")

async def send_daily_notifications():
    """Отправка ежедневных уведомлений мастерам о записях на завтра"""
    try:
        now = datetime.now(TIMEZONE)
        tomorrow = (now + timedelta(days=1)).strftime('%Y-%m-%d')
        
        response = requests.get(f"{API_BASE_URL}/api/specialists-all")
        if response.json()['message'] != 'success':
            logger.error(f"Ошибка API specialists-all: {response.json()}")
            return
            
        masters = response.json()['data']
        
        for master in masters:
            if master.get('tg_id'):
                await send_master_daily_notification(master['id'], master['tg_id'], tomorrow)
                
    except Exception as e:
        logger.error(f"Ошибка отправки ежедневных уведомлений: {e}")

async def send_master_daily_notification(master_id, tg_id, date):
    """Отправка уведомления конкретному мастеру"""
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
            
            for app in sorted(appointments, key=lambda x: x['время']):
                message += (
                    f"⏰ {app['время']}\n"
                    f"👤 {app['клиент_имя']} ({app['клиент_телефон']})\n"
                    f"🎯 {app['услуга_название']}\n"
                    f"💵 {app['цена']}₽\n"
                    f"────────────────\n"
                )
        
        await bot.send_message(chat_id=tg_id, text=message)
        logger.info(f"✅ Отправлено ежедневное уведомление мастеру {master_id}")
        
    except Exception as e:
        logger.error(f"Ошибка отправки уведомления мастеру {master_id}: {e}")

async def check_new_appointments():
    """Проверка новых записей с момента последней проверки"""
    global last_check_time
    
    try:
        # Логируем время последней проверки
        logger.info(f"Начало проверки новых записей, last_check_time: {last_check_time}")
        
        response = requests.get(f"{API_BASE_URL}/api/specialists-all")
        if response.json()['message'] != 'success':
            logger.error(f"Ошибка API specialists-all: {response.json()}")
            return
            
        masters = response.json()['data']
        masters_with_tg = [m for m in masters if m.get('tg_id')]
        
        if not masters_with_tg:
            logger.info("Нет мастеров с tg_id для проверки")
            return
            
        for master in masters_with_tg:
            await check_master_new_appointments(master['id'], master['tg_id'])
        
        # Обновляем last_check_time после успешной обработки
        new_check_time = datetime.now(TIMEZONE)
        logger.info(f"Обновление last_check_time с {last_check_time} на {new_check_time}")
        last_check_time = new_check_time
        
    except Exception as e:
        logger.error(f"Ошибка проверки новых записей: {e}")

async def check_master_new_appointments(master_id, tg_id):
    """Проверка новых записей для конкретного мастера"""
    global last_check_time
    
    try:
        # Форматируем время с учетом часового пояса
        since_time = last_check_time.strftime('%Y-%m-%d %H:%M:%S')
        logger.info(f"Проверка записей для мастера {master_id} с createdSince: {since_time}")
        
        response = requests.get(
            f"{API_BASE_URL}/api/appointments",
            params={
                'specialistId': master_id,
                'createdSince': since_time
            }
        )
        
        if response.json()['message'] != 'success':
            logger.error(f"Ошибка API appointments для мастера {master_id}: {response.json()}")
            return
            
        appointments = response.json()['data']
        logger.info(f"Найдено {len(appointments)} записей для мастера {master_id}")
        
        for app in appointments:
            # Проверяем, что запись действительно новая
            created_at = app.get('created_at')
            if created_at:
                created_at_dt = datetime.strptime(created_at, '%Y-%m-%d %H:%M:%S').replace(tzinfo=TIMEZONE)
                if created_at_dt <= last_check_time:
                    logger.info(f"Пропущена старая запись для мастера {master_id}: {created_at}")
                    continue
                
            message = (
                "🔔 Новая запись!\n\n"
                f"👤 Клиент: {app['клиент_имя']} ({app['клиент_телефон']})\n"
                f"🎯 Услуга: {app['услуга_название']}\n"
                f"≣ Дата: {app['дата']}\n"
                f"⏰ Время: {app['время']}\n"
                f"💵 Стоимость: {app['цена']}₽\n"
                f"🕐 Создано: {app['created_at']}"
            )
            
            await bot.send_message(chat_id=tg_id, text=message)
            logger.info(f"✅ Отправлено уведомление о новой записи мастеру {master_id}, created_at: {app['created_at']}")
            
            await asyncio.sleep(1)
            
    except Exception as e:
        logger.error(f"Ошибка проверки новых записей для мастера {master_id}: {e}")

async def send_immediate_notification(master_id, appointment_data):
    """Немедленная отправка уведомления о новой записи"""
    try:
        response = requests.get(f"{API_BASE_URL}/api/specialist/{master_id}")
        if response.json()['message'] != 'success':
            logger.error(f"Ошибка API specialist/{master_id}: {response.json()}")
            return
            
        master = response.json()['data']
        
        if not master.get('tg_id'):
            logger.info(f"Мастер {master_id} не имеет tg_id")
            return
            
        message = (
            "🔔 Новая запись!\n\n"
            f"👤 Клиент: {appointment_data['clientName']} ({appointment_data['clientPhone']})\n"
            f"🎯 Услуга: {appointment_data['serviceName']}\n"
            f"≣ Дата: {appointment_data['date']}\n"
            f"⏰ Время: {appointment_data['time']}\n"
            f"💵 Стоимость: {appointment_data['price']}₽"
        )
        
        await bot.send_message(chat_id=master['tg_id'], text=message)
        logger.info(f"✅ Отправлено немедленное уведомление мастеру {master_id}")
        
    except Exception as e:
        logger.error(f"Ошибка отправки немедленного уведомления: {e}")

def shutdown_notifications():
    """Остановка системы уведомлений"""
    global scheduler
    
    if scheduler:
        scheduler.shutdown()
        logger.info("✅ Система уведомлений остановлена")