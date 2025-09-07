# mast_uslugi.py - исправленная версия с фильтрацией по доступному времени
import os
import logging
import requests
from datetime import datetime, timedelta
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes
from menu_handlers import show_main_menu
from config import BOT_TOKEN, API_BASE_URL

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик команды /start - главное меню"""
    await show_main_menu(update=update)

async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик callback запросов"""
    query = update.callback_query
    await query.answer()
    
    data = query.data
    
    if data == 'masters_menu':
        await show_masters_menu(query)
    elif data == 'services_menu':
        await show_services_menu(query)
    elif data == 'back_to_main':
        await show_main_menu(query)
    elif data.startswith('master_detail_'):
        master_id = data.split('_')[2]
        await show_master_details(query, master_id)
    elif data.startswith('service_detail_'):
        service_id = data.split('_')[2]
        await show_service_details(query, service_id)
    elif data == 'book_from_master':
        await book_appointment_from_details(query)
    elif data == 'book_from_service':
        await book_appointment_from_details(query)

async def show_masters_menu(query):
    """Показать меню мастеров с доступным временем"""
    try:
        response = requests.get(f"{API_BASE_URL}/api/specialists")
        data = response.json()
        
        if data['message'] == 'success':
            masters = data['data']
            keyboard = []
            
            for master in masters:
                services_response = requests.get(f"{API_BASE_URL}/api/specialist/{master['id']}/services")
                
                if services_response.json()['message'] == 'success':
                    services = services_response.json()['data']
                    has_available_time = False
                    
                    for service in services:
                        today = datetime.now()
                        start_date = today.strftime('%Y-%m-%d')
                        end_date = (today + timedelta(days=7)).strftime('%Y-%m-%d')
                        
                        dates_response = requests.get(
                            f"{API_BASE_URL}/api/specialist/{master['id']}/service/{service['id']}/available-dates",
                            params={'start': start_date, 'end': end_date}
                        )
                        
                        if (dates_response.json()['message'] == 'success' and 
                            dates_response.json()['availableDates']):
                            has_available_time = True
                            break
                    
                    if has_available_time:
                        keyboard.append([
                            InlineKeyboardButton(
                                f"👨‍💼 {master['имя']}",
                                callback_data=f'master_detail_{master["id"]}'
                            )
                        ])
            
            if not keyboard:
                await query.edit_message_text(
                    "❌ На данный момент нет доступных мастеров со свободным временем\n\n"
                    "Попробуйте позже или выберите другую опцию:",
                    reply_markup=InlineKeyboardMarkup([
                        [InlineKeyboardButton("🎯 Услуги", callback_data='services_menu')],
                        [InlineKeyboardButton("📅 Записаться", callback_data='book_appointment')],
                        [InlineKeyboardButton("☰ Главное меню", callback_data='back_to_main')]
                    ])
                )
                return
            
            keyboard.append([InlineKeyboardButton("↲ Назад", callback_data='back_to_main')])
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await query.edit_message_text(
                "👨‍💼 Наши мастера\n\n"
                "Нажмите на мастера чтобы узнать больше:",
                reply_markup=reply_markup
            )
        else:
            await query.edit_message_text("❌ Ошибка загрузки мастеров")
            
    except Exception as e:
        logger.error(f"Error fetching masters: {e}")
        await query.edit_message_text("❌ Ошибка подключения к серверу")

async def show_services_menu(query):
    """Показать меню услуг с доступным временем"""
    try:
        response = requests.get(f"{API_BASE_URL}/api/services")
        data = response.json()
        
        if data.get('message') == 'success':
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
                                f"🎯 {service['название']} - {service['цена']}₽",
                                callback_data=f'service_detail_{service["id"]}'
                            )
                        ])
            
            if not keyboard:
                await query.edit_message_text(
                    "❌ На данный момент нет доступных услуг со свободным временем\n\n"
                    "Попробуйте позже или выберите другую опцию:",
                    reply_markup=InlineKeyboardMarkup([
                        [InlineKeyboardButton("👨‍💼 Мастера", callback_data='masters_menu')],
                        [InlineKeyboardButton("📅 Записаться", callback_data='book_appointment')],
                        [InlineKeyboardButton("☰ Главное меню", callback_data='back_to_main')]
                    ])
                )
                return
            
            keyboard.append([InlineKeyboardButton("↲ Назад", callback_data='back_to_main')])
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await query.edit_message_text(
                "🎯 Наши услуги\n\n"
                "Нажмите на услугу чтобы узнать больше:",
                reply_markup=reply_markup
            )
        else:
            await query.edit_message_text("❌ Ошибка загрузки услуг")
            
    except Exception as e:
        logger.error(f"Error fetching services: {e}")
        await query.edit_message_text("❌ Ошибка подключения к серверу")

async def show_master_details(query, master_id):
    """Показать детальную информацию о мастере"""
    try:
        response = requests.get(f"{API_BASE_URL}/api/specialist/{master_id}")
        data = response.json()
        
        if data['message'] == 'success':
            master = data['data']
            
            message = f"👨‍💼 {master['имя']}\n\n"
            
            if master.get('описание'):
                message += f"{master['описание']}\n\n"
            
            message += "Нажмите записаться чтобы выбрать время:"
            
            keyboard = [
                [InlineKeyboardButton("📅 Записаться", callback_data='book_appointment')],
                [InlineKeyboardButton("↲ Назад к мастерам", callback_data='masters_menu')],
                [InlineKeyboardButton("☰ Главное меню", callback_data='back_to_main')]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            if master.get('фото'):
                try:
                    await query.message.reply_photo(
                        photo=master['фото'],
                        caption=message,
                        reply_markup=reply_markup
                    )
                    await query.delete_message()
                    return
                except Exception as e:
                    logger.error(f"Error sending photo: {e}")
            
            await query.edit_message_text(
                message,
                reply_markup=reply_markup
            )
            
        else:
            await query.edit_message_text("❌ Ошибка загрузки информации о мастере")
            
    except Exception as e:
        logger.error(f"Error fetching master details: {e}")
        await query.edit_message_text("❌ Ошибка подключения к серверу")

async def show_service_details(query, service_id):
    """Показать детальную информацию об услуге"""
    try:
        response = requests.get(f"{API_BASE_URL}/api/service/{service_id}")
        data = response.json()
        
        if response.status_code == 200 and data.get('message') == 'success':
            service = data['data']
            
            message = f"🎯 {service['название']}\n\n"
            
            if service.get('категория'):
                message += f"Категория: {service['категория']}\n"
            
            message += f"Цена: {service['цена']}₽\n\n"
            
            if service.get('описание'):
                message += f"{service['описание']}\n\n"
            
            message += "Нажмите записаться чтобы выбрать время:"
            
            keyboard = [
                [InlineKeyboardButton("📅 Записаться", callback_data='book_appointment')],
                [InlineKeyboardButton("↲ Назад к услугам", callback_data='services_menu')],
                [InlineKeyboardButton("☰ Главное меню", callback_data='back_to_main')]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await query.edit_message_text(
                message,
                reply_markup=reply_markup
            )
            
        else:
            await query.edit_message_text("❌ Ошибка загрузки информации об услуге")
            
    except Exception as e:
        logger.error(f"Error fetching service details: {e}")
        await query.edit_message_text("❌ Ошибка подключения к серверу")

async def book_appointment_from_details(query):
    """Переход к записи из детального просмотра"""
    keyboard = [
        [InlineKeyboardButton("📅 Записаться", callback_data='book_appointment')],
        [InlineKeyboardButton("↲ Назад", callback_data='back_to_main')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(
        "Переходим к записи...\n\n"
        "Выберите действие:",
        reply_markup=reply_markup
    )

def main():
    """Запуск бота"""
    application = Application.builder().token(BOT_TOKEN).build()    
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CallbackQueryHandler(handle_callback))
    
    application.run_polling()

if __name__ == '__main__':
    main()