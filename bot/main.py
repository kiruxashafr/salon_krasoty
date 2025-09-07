# main.py - исправленная версия
import os
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, MessageHandler, filters
from config import BOT_TOKEN
from menu_handlers import start, start_callback
from booking_handlers import handle_callback as booking_callback
from schedule_handlers import show_week_schedule, show_all_specialists_schedule
from message_handlers import handle_message
from mast_uslugi import show_masters_menu, show_services_menu, show_master_details, show_service_details

def main():
    """Запуск бота"""
    application = Application.builder().token(BOT_TOKEN).build()
    
    # Регистрация обработчиков
    application.add_handler(CommandHandler("start", start))
    
    # Обработчики для записи - УПРОЩЕННЫЙ ПАТТЕРН
    application.add_handler(CallbackQueryHandler(booking_callback))
    
    # Обработчики для расписания
    application.add_handler(CallbackQueryHandler(show_week_schedule, pattern='^(week_nav_|view_week_schedule)'))
    
    # Обработчик для навигации по неделям в расписании всех мастеров
    application.add_handler(CallbackQueryHandler(show_all_specialists_schedule, pattern='^all_schedule_nav_(prev|next)_[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]+$'))
    
    # Отдельные обработчики для мастеров и услуг
    application.add_handler(CallbackQueryHandler(show_masters_menu, pattern='^masters_menu$'))
    application.add_handler(CallbackQueryHandler(show_services_menu, pattern='^services_menu$'))
    application.add_handler(CallbackQueryHandler(show_master_details, pattern='^master_detail_'))
    application.add_handler(CallbackQueryHandler(show_service_details, pattern='^service_detail_'))
    application.add_handler(CallbackQueryHandler(start_callback, pattern='^back_to_main$'))
    
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    
    application.run_polling()

if __name__ == '__main__':
    main()