import logging
import requests
import re
from telegram import Update
from telegram.ext import ContextTypes
from config import API_BASE_URL, user_states

logger = logging.getLogger(__name__)

async def handle_message(update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик текстовых сообщений"""
    user_id = update.message.from_user.id
    text = update.message.text
    
    if user_id in user_states:
        user_data = user_states[user_id]
        
        if user_data.get('step') == 'name':
            user_data['client_name'] = text
            user_data['step'] = 'phone'
            await update.message.reply_text(
                "📞 Теперь введите ваш телефон в формате +7XXXXXXXXXX:\n\n"
                "Пример: +79255355278"
            )
            
        elif user_data.get('step') == 'phone':
            if not validate_phone(text):
                await update.message.reply_text(
                    "❌ Неверный формат телефона!\n\n"
                    "Пожалуйста, введите телефон в формате +7XXXXXXXXXX\n"
                    "Пример: +79255355278"
                )
                return
            
            user_data['client_phone'] = text
            
            try:
                response = requests.post(f"{API_BASE_URL}/api/appointment", json={
                    'specialistId': user_data['specialist_id'],
                    'serviceId': user_data['service_id'],
                    'date': user_data['date'],
                    'time': user_data['time'],
                    'clientName': user_data['client_name'],
                    'clientPhone': user_data['client_phone']
                })
                
                if response.json().get('message') == 'success':
                    await update.message.reply_text(
                        "✅ Запись успешно создана!\n\n"
                        "С вами свяжутся для подтверждения."
                    )
                    
                    requests.patch(f"{API_BASE_URL}/api/schedule/{user_data['schedule_id']}", json={
                        'доступно': 0
                    })
                    
                else:
                    await update.message.reply_text("❌ Ошибка при создании записи")
                    
            except Exception as e:
                logger.error(f"Error creating appointment: {e}")
                await update.message.reply_text("❌ Ошибка подключения к серверу")
            
            del user_states[user_id]

def validate_phone(phone):
    """Валидация номера телефона в формате +7XXXXXXXXXX"""
    pattern = r'^\+7\d{10}$'
    return re.match(pattern, phone) is not None