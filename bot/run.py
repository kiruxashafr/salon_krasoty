#!/usr/bin/env python3
import os
from dotenv import load_dotenv
from main import main
from admin import handle_admin_message
from menu_handlers import *
from personal_cabinet import *
from notification import initialize_notifications, shutdown_notifications  # Добавляем импорт
import asyncio

if __name__ == '__main__':
    # Загружаем переменные окружения
    load_dotenv()
    
    # Проверяем наличие токена
    if not os.getenv('BOT_TOKEN'):
        print("❌ Ошибка: BOT_TOKEN не установлен")
        print("Создайте файл .env и добавьте BOT_TOKEN=your_bot_token_here")
        exit(1)
    
    # Инициализируем систему уведомлений
    initialize_notifications()
    
    try:
        # Запускаем бота
        main()
    except KeyboardInterrupt:
        print("\n🛑 Остановка бота...")
    finally:
        # Останавливаем систему уведомлений
        shutdown_notifications()