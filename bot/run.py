#!/usr/bin/env python3
import os
from dotenv import load_dotenv
from main import main
from admin import handle_admin_message
from menu_handlers import *
from personal_cabinet import *
from notification import initialize_notifications, shutdown_notifications
import asyncio
import signal
import sys

def signal_handler(sig, frame):
    """Обработчик сигналов для graceful shutdown"""
    print("\n🛑 Получен сигнал остановки...")
    shutdown_notifications()
    sys.exit(0)

if __name__ == '__main__':
    # Загружаем переменные окружения
    load_dotenv()
    
    # Регистрируем обработчики сигналов
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Проверяем наличие токена
    if not os.getenv('BOT_TOKEN'):
        print("❌ Ошибка: BOT_TOKEN не установлен")
        print("Создайте файл .env и добавьте BOT_TOKEN=your_bot_token_here")
        exit(1)
    
    # Инициализируем систему уведомлений
    initialize_notifications()
    
    try:
        # Запускаем бота
        print("🤖 Запуск бота...")
        main()
    except KeyboardInterrupt:
        print("\n🛑 Остановка бота...")
    except Exception as e:
        print(f"❌ Критическая ошибка: {e}")
    finally:
        # Останавливаем систему уведомлений
        shutdown_notifications()