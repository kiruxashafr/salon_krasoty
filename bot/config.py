import os
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

# Конфигурация
BOT_TOKEN = os.getenv('BOT_TOKEN', '8456369002:AAFaxelo1bXHy2hzv5vUwwt8pMAUVu5SHlM')
API_BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:3000')

# Словарь для перевода английских дней недели в русские сокращения
WEEKDAY_MAP = {
    'Mon': 'пн',
    'Tue': 'вт',
    'Wed': 'ср',
    'Thu': 'чт',
    'Fri': 'пт',
    'Sat': 'сб',
    'Sun': 'вс'
}

# Состояния пользователей
user_states = {}