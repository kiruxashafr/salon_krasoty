import os
import logging
import requests
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes
from telegram import InputMediaPhoto

# Настройка логирования
logger = logging.getLogger(__name__)

# Конфигурация
API_BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:3000')

async def show_main_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Показать главное меню с мастерами и услугами"""
    keyboard = [
        [InlineKeyboardButton("👨‍💼 Мастера", callback_data='masters_menu')],
        [InlineKeyboardButton("🎯 Услуги", callback_data='services_menu')],
        [InlineKeyboardButton("📅 Записаться", callback_data='book_appointment')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    message_text = (
        "🏠 Главное меню\n\n"
        "Выберите раздел:"
    )
    
    if hasattr(update, 'callback_query') and update.callback_query:
        query = update.callback_query
        try:
            # Отправляем новое текстовое сообщение
            await query.message.reply_text(
                text=message_text,
                reply_markup=reply_markup
            )
            # Удаляем предыдущее сообщение (с фото или текстом)
            await query.delete_message()
        except Exception as e:
            logger.error(f"Error in show_main_menu: {e}")
            # В случае ошибки пробуем снова отправить сообщение
            await query.message.reply_text(
                text=message_text,
                reply_markup=reply_markup
            )
    else:
        await update.message.reply_text(
            text=message_text,
            reply_markup=reply_markup
        )

async def show_master_detail(update: Update, context: ContextTypes.DEFAULT_TYPE, master_id: str):
    """Показать детальную информацию о мастере"""
    try:
        response = requests.get(f"{API_BASE_URL}/api/specialist/{master_id}")
        data = response.json()
        
        if data['message'] == 'success':
            master = data['data']
            
            # Формируем сообщение
            message = (
                f"👨‍💼 {master['имя']}\n\n"
                f"{master.get('описание', 'Опытный специалист.')}\n\n"
            )
            
            # Добавляем специализацию если есть
            if 'специализация' in master and master['специализация']:
                message += f"🎯 Специализация: {master['специализация']}\n\n"
            
            # Добавляем опыт если есть
            if 'опыт' in master and master['опыт']:
                message += f"📅 Опыт работы: {master['опыт']}\n\n"
            
            keyboard = [
                [InlineKeyboardButton("📅 Записаться к мастеру", callback_data=f'book_master_{master_id}')],
                [InlineKeyboardButton("↲ Назад к мастерам", callback_data='masters_menu')],
                [InlineKeyboardButton("🏠 Главное меню", callback_data='back_to_main')]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            # Отправляем фото если есть
            if 'фото' in master and master['фото'] and master['фото'] != 'photo/работники/default.jpg':
                try:
                    # Формируем полный URL к фото через API сервера
                    photo_url = f"{API_BASE_URL}/{master['фото']}"
                    logger.info(f"Trying to send photo from URL: {photo_url}")
                    
                    # Скачиваем фото
                    photo_response = requests.get(photo_url)
                    if photo_response.status_code == 200:
                        photo_data = photo_response.content
                        
                        # Отправляем новое сообщение с фото
                        await update.callback_query.message.reply_photo(
                            photo=photo_data,
                            caption=message,
                            reply_markup=reply_markup
                        )
                        # Удаляем предыдущее сообщение
                        await update.callback_query.delete_message()
                    else:
                        logger.error(f"Failed to download photo: {photo_response.status_code}")
                        # Если не удалось скачать фото, отправляем текст
                        await update.callback_query.message.reply_text(
                            message,
                            reply_markup=reply_markup
                        )
                        await update.callback_query.delete_message()
                except Exception as photo_error:
                    logger.error(f"Error sending photo: {photo_error}")
                    # Если не удалось отправить фото, отправляем текст
                    await update.callback_query.message.reply_text(
                        message,
                        reply_markup=reply_markup
                    )
                    await update.callback_query.delete_message()
            else:
                # Если фото нет, отправляем новое текстовое сообщение
                await update.callback_query.message.reply_text(
                    message,
                    reply_markup=reply_markup
                )
                await update.callback_query.delete_message()
                
        else:
            await update.callback_query.message.reply_text(
                "❌ Ошибка загрузки информации о мастере",
                reply_markup=InlineKeyboardMarkup([
                    [InlineKeyboardButton("↲ Назад", callback_data='masters_menu')],
                    [InlineKeyboardButton("🏠 Главное меню", callback_data='back_to_main')]
                ])
            )
            await update.callback_query.delete_message()
            
    except Exception as e:
        logger.error(f"Error fetching master detail: {e}")
        await update.callback_query.message.reply_text(
            "❌ Ошибка подключения к серверу",
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("↲ Назад", callback_data='masters_menu')],
                [InlineKeyboardButton("🏠 Главное меню", callback_data='back_to_main')]
            ])
        )
        await update.callback_query.delete_message()

async def show_masters_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Показать меню мастеров"""
    try:
        response = requests.get(f"{API_BASE_URL}/api/specialists")
        data = response.json()
        
        if data['message'] == 'success':
            masters = data['data']
            keyboard = []
            
            for master in masters:
                keyboard.append([
                    InlineKeyboardButton(
                        f"👨‍💼 {master['имя']}",
                        callback_data=f'master_detail_{master["id"]}'
                    )
                ])
            
            keyboard.append([InlineKeyboardButton("↲ Назад", callback_data='back_to_main')])
            reply_markup = InlineKeyboardMarkup(keyboard)
            message_text = (
                "👨‍💼 Наши мастера\n\n"
                "Нажмите на мастера чтобы узнать больше:"
            )
            
            query = update.callback_query
            try:
                # Отправляем новое текстовое сообщение
                await query.message.reply_text(
                    text=message_text,
                    reply_markup=reply_markup
                )
                # Удаляем предыдущее сообщение
                await query.delete_message()
            except Exception as e:
                logger.error(f"Error in show_masters_menu: {e}")
                # В случае ошибки пробуем снова отправить сообщение
                await query.message.reply_text(
                    text=message_text,
                    reply_markup=reply_markup
                )
        else:
            error_message = "❌ Ошибка загрузки мастеров"
            query = update.callback_query
            try:
                await query.message.reply_text(
                    text=error_message,
                    reply_markup=InlineKeyboardMarkup([
                        [InlineKeyboardButton("🏠 Главное меню", callback_data='back_to_main')]
                    ])
                )
                await query.delete_message()
            except Exception as e:
                logger.error(f"Error handling error message in show_masters_menu: {e}")
                await query.message.reply_text(
                    text=error_message,
                    reply_markup=InlineKeyboardMarkup([
                        [InlineKeyboardButton("🏠 Главное меню", callback_data='back_to_main')]
                    ])
                )
                
    except Exception as e:
        logger.error(f"Error fetching masters: {e}")
        error_message = "❌ Ошибка подключения к серверу"
        query = update.callback_query
        try:
            await query.message.reply_text(
                text=error_message,
                reply_markup=InlineKeyboardMarkup([
                    [InlineKeyboardButton("🏠 Главное меню", callback_data='back_to_main')]
                ])
            )
            await query.delete_message()
        except Exception as e:
            logger.error(f"Error handling server error in show_masters_menu: {e}")
            await query.message.reply_text(
                text=error_message,
                reply_markup=InlineKeyboardMarkup([
                    [InlineKeyboardButton("🏠 Главное меню", callback_data='back_to_main')]
                ])
            )

async def show_services_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Показать меню услуг"""
    try:
        response = requests.get(f"{API_BASE_URL}/api/services")
        data = response.json()
        
        if data['message'] == 'success':
            services = data['data']
            keyboard = []
            
            for service in services:
                keyboard.append([
                    InlineKeyboardButton(
                        f"🎯 {service['название']} - {service['цена']}₽",
                        callback_data=f'service_detail_{service["id"]}'
                    )
                ])
            
            keyboard.append([InlineKeyboardButton("↲ Назад", callback_data='back_to_main')])
            reply_markup = InlineKeyboardMarkup(keyboard)
            message_text = (
                "🎯 Наши услуги\n\n"
                "Нажмите на услугу чтобы узнать больше:"
            )
            
            query = update.callback_query
            try:
                # Отправляем новое текстовое сообщение
                await query.message.reply_text(
                    text=message_text,
                    reply_markup=reply_markup
                )
                # Удаляем предыдущее сообщение
                await query.delete_message()
            except Exception as e:
                logger.error(f"Error in show_services_menu: {e}")
                # В случае ошибки пробуем снова отправить сообщение
                await query.message.reply_text(
                    text=message_text,
                    reply_markup=reply_markup
                )
        else:
            error_message = "❌ Ошибка загрузки услуг"
            query = update.callback_query
            try:
                await query.message.reply_text(
                    text=error_message,
                    reply_markup=InlineKeyboardMarkup([
                        [InlineKeyboardButton("🏠 Главное меню", callback_data='back_to_main')]
                    ])
                )
                await query.delete_message()
            except Exception as e:
                logger.error(f"Error handling error message in show_services_menu: {e}")
                await query.message.reply_text(
                    text=error_message,
                    reply_markup=InlineKeyboardMarkup([
                        [InlineKeyboardButton("🏠 Главное меню", callback_data='back_to_main')]
                    ])
                )
                
    except Exception as e:
        logger.error(f"Error fetching services: {e}")
        error_message = "❌ Ошибка подключения к серверу"
        query = update.callback_query
        try:
            await query.message.reply_text(
                text=error_message,
                reply_markup=InlineKeyboardMarkup([
                    [InlineKeyboardButton("🏠 Главное меню", callback_data='back_to_main')]
                ])
            )
            await query.delete_message()
        except Exception as e:
            logger.error(f"Error handling server error in show_services_menu: {e}")
            await query.message.reply_text(
                text=error_message,
                reply_markup=InlineKeyboardMarkup([
                    [InlineKeyboardButton("🏠 Главное меню", callback_data='back_to_main')]
                ])
            )

async def show_service_detail(update: Update, context: ContextTypes.DEFAULT_TYPE, service_id: str):
    """Показать детальную информацию об услуге"""
    try:
        response = requests.get(f"{API_BASE_URL}/api/service/{service_id}")
        data = response.json()
        
        if data['message'] == 'success':
            service = data['data']
            
            # Формируем сообщение
            message = (
                f"🎯 {service['название']}\n\n"
                f"💵 Цена: {service['цена']}₽\n\n"
                f"{service.get('описание', 'Качественное выполнение услуги.')}\n\n"
            )
            
            # Добавляем длительность если есть
            if 'длительность' in service and service['длительность']:
                message += f"⏱ Длительность: {service['длительность']} минут\n\n"
            
            keyboard = [
                [InlineKeyboardButton("📅 Записаться на услугу", callback_data=f'book_service_{service_id}')],
                [InlineKeyboardButton("↲ Назад к услугам", callback_data='services_menu')],
                [InlineKeyboardButton("🏠 Главное меню", callback_data='back_to_main')]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            # Отправляем фото если есть
            if 'фото' in service and service['фото'] and service['фото'] != 'photo/услуги/default.jpg':
                try:
                    # Формируем полный URL к фото через API сервера
                    photo_url = f"{API_BASE_URL}/{service['фото']}"
                    logger.info(f"Trying to send service photo from URL: {photo_url}")
                    
                    # Скачиваем фото
                    photo_response = requests.get(photo_url)
                    if photo_response.status_code == 200:
                        photo_data = photo_response.content
                        
                        # Отправляем новое сообщение с фото
                        await update.callback_query.message.reply_photo(
                            photo=photo_data,
                            caption=message,
                            reply_markup=reply_markup
                        )
                        # Удаляем предыдущее сообщение
                        await update.callback_query.delete_message()
                    else:
                        logger.error(f"Failed to download service photo: {photo_response.status_code}")
                        await update.callback_query.message.reply_text(
                            message,
                            reply_markup=reply_markup
                        )
                        await update.callback_query.delete_message()
                except Exception as photo_error:
                    logger.error(f"Error sending service photo: {photo_error}")
                    # Если не удалось отправить фото, отправляем текст
                    await update.callback_query.message.reply_text(
                        message,
                        reply_markup=reply_markup
                    )
                    await update.callback_query.delete_message()
            else:
                # Если фото нет, отправляем новое текстовое сообщение
                await update.callback_query.message.reply_text(
                    message,
                    reply_markup=reply_markup
                )
                await update.callback_query.delete_message()
                
        else:
            await update.callback_query.message.reply_text(
                "❌ Ошибка загрузки информации об услуге",
                reply_markup=InlineKeyboardMarkup([
                    [InlineKeyboardButton("↲ Назад", callback_data='services_menu')],
                    [InlineKeyboardButton("🏠 Главное меню", callback_data='back_to_main')]
                ])
            )
            await update.callback_query.delete_message()
            
    except Exception as e:
        logger.error(f"Error fetching service detail: {e}")
        await update.callback_query.message.reply_text(
            "❌ Ошибка подключения к серверу",
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("↲ Назад", callback_data='services_menu')],
                [InlineKeyboardButton("🏠 Главное меню", callback_data='back_to_main')]
            ])
        )
        await update.callback_query.delete_message()

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
    elif data.startswith('master_detail_'):
        master_id = data.split('_')[2]
        await show_master_detail(update, context, master_id)
    elif data.startswith('service_detail_'):
        service_id = data.split('_')[2]
        await show_service_detail(update, context, service_id)
    elif data.startswith('book_master_'):
        master_id = data.split('_')[2]
        # Перенаправляем в запись с выбранным мастером
        await show_booking_options_with_master(query, master_id)
    elif data.startswith('book_service_'):
        service_id = data.split('_')[2]
        # Перенаправляем в запись с выбранной услугой
        await show_booking_options_with_service(query, service_id)
    elif data == 'cancel_to_main':
        await show_main_menu(update, context)

async def show_booking_options_with_master(query, master_id):
    """Показать варианты записи для выбранного мастера"""
    from main import show_services_for_specialist
    try:
        await show_services_for_specialist(query, master_id)
        await query.delete_message()
    except Exception as e:
        logger.error(f"Error in show_booking_options_with_master: {e}")
        await query.message.reply_text(
            "❌ Ошибка при загрузке услуг мастера",
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("↲ Назад", callback_data='masters_menu')],
                [InlineKeyboardButton("☰ Главное меню", callback_data='cancel_to_main')]
            ])
        )
        await query.delete_message()

async def show_booking_options_with_service(query, service_id):
    """Показать варианты записи для выбранной услуги"""
    from main import show_specialists_for_service
    try:
        await show_specialists_for_service(query, service_id)
        await query.delete_message()
    except Exception as e:
        logger.error(f"Error in show_booking_options_with_service: {e}")
        await query.message.reply_text(
            "❌ Ошибка при загрузке мастеров для услуги",
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("↲ Назад", callback_data='services_menu')],
                [InlineKeyboardButton("☰ Главное меню", callback_data='cancel_to_main')]
            ])
        )
        await query.delete_message()