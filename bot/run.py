#!/usr/bin/env python3
import os
from dotenv import load_dotenv
from main import main
from menu_handlers import *

if __name__ == '__main__':
    # Загружаем переменные окружения
    load_dotenv()
    
    # Проверяем наличие токена
    if not os.getenv('BOT_TOKEN'):
        print("❌ Ошибка: BOT_TOKEN не установлен")
        print("Создайте файл .env и добавьте BOT_TOKEN=your_bot_token_here")
        exit(1)
    
    # Запускаем бота
    main()