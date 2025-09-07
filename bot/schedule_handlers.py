# schedule_handlers.py - исправленная версия с фильтрацией по услуге и исправленной навигацией
import logging
import requests
from datetime import datetime, timedelta
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import ContextTypes
from config import API_BASE_URL, user_states
from menu_handlers import show_main_menu

logger = logging.getLogger(__name__)

async def show_week_schedule(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Показать свободное время на неделю с навигацией"""
    query = update.callback_query
    await query.answer()
    
    try:
        today = datetime.now().date()
        
        data = query.data
        target_date_str = None
        
        if data.startswith('week_nav_'):
            parts = data.split('_')
            target_date_str = parts[3]
        
        if target_date_str:
            target_date = datetime.strptime(target_date_str, '%Y-%m-%d').date()
        else:
            target_date = today
        
        start_of_week = target_date - timedelta(days=target_date.weekday())
        end_of_week = start_of_week + timedelta(days=6)
        
        from_date = max(start_of_week, today)
        to_date = end_of_week
        
        from_date_str = from_date.strftime('%Y-%m-%d')
        to_date_str = to_date.strftime('%Y-%m-%d')
        
        response = requests.get(f"{API_BASE_URL}/api/freetime-available?fromDate={from_date_str}&toDate={to_date_str}")
        data = response.json()
        
        message = f"📅 Свободное время на неделю ({start_of_week.strftime('%d.%m')} - {end_of_week.strftime('%d.%m')}):\n\n"
        keyboard = []
        
        if data.get('message') == 'success':
            schedule = data.get('data', [])
            
            if schedule:
                schedule_by_date = {}
                for item in schedule:
                    date = item['дата']
                    if date not in schedule_by_date:
                        schedule_by_date[date] = []
                    schedule_by_date[date].append(item)
                
                for date, items in sorted(schedule_by_date.items()):
                    formatted_date = datetime.strptime(date, '%Y-%m-%d').strftime('%d.%m')
                    message += f"📆 {formatted_date}:\n"
                    
                    for item in items:
                        message += f"   ⏰ {item['время']} - {item['услуга_название']} ({item['мастер_имя']})\n"
                        keyboard.append([
                            InlineKeyboardButton(
                                f"{formatted_date} {item['время']} - {item['услуга_название']}",
                                callback_data=f'time_slot_{item["id"]}'
                            )
                        ])
                    
                    message += "\n"
            else:
                message += "❌ Нет свободного времени на этой неделе\n"
        else:
            message += "❌ Ошибка загрузки расписания\n"
        
        prev_week_start = start_of_week - timedelta(days=7)
        next_week_start = start_of_week + timedelta(days=7)
        
        nav_buttons = [
            InlineKeyboardButton("⬅️ Пред. неделя", callback_data=f'week_nav_prev_{prev_week_start.strftime("%Y-%m-%d")}'),
            InlineKeyboardButton("След. неделя ➡️", callback_data=f'week_nav_next_{next_week_start.strftime("%Y-%m-%d")}')
        ]
        keyboard.append(nav_buttons)
        
        keyboard.append([InlineKeyboardButton("↲ Назад", callback_data='book_appointment')])
        keyboard.append([InlineKeyboardButton("☰ Главное меню", callback_data='cancel_to_main')])
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(message, reply_markup=reply_markup)
        
    except Exception as e:
        logger.error(f"Error fetching week schedule: {e}")
        await query.edit_message_text("❌ Ошибка подключения к серверу")

async def show_all_specialists_schedule(query, service_id, target_date_str=None):
    """Показать расписание всех мастеров для услуги с фильтрацией по услуге"""
    try:
        user_id = query.from_user.id
        user_states[user_id] = {'service_id': service_id}
        
        today = datetime.now().date()
        
        if target_date_str:
            target_date = datetime.strptime(target_date_str, '%Y-%m-%d').date()
        else:
            target_date = today
        
        start_of_week = target_date - timedelta(days=target_date.weekday())
        end_of_week = start_of_week + timedelta(days=6)
        
        from_date = max(start_of_week, today)
        to_date = end_of_week
        
        from_date_str = from_date.strftime('%Y-%m-%d')
        to_date_str = to_date.strftime('%Y-%m-%d')
        
        response = requests.get(
            f"{API_BASE_URL}/api/freetime-available",
            params={'fromDate': from_date_str, 'toDate': to_date_str}
        )
        data = response.json()
        
        service_response = requests.get(f"{API_BASE_URL}/api/service/{service_id}")
        service_name = service_response.json()['data']['название'] if service_response.json()['message'] == 'success' else "Услуга"
        
        message = f"📅 Расписание для услуги '{service_name}' ({start_of_week.strftime('%d.%m')} - {end_of_week.strftime('%d.%m')}):\n\n"
        keyboard = []
        
        if data['message'] == 'success':
            schedule = [item for item in data['data'] if str(item['услуга_id']) == str(service_id)]
            
            schedule_by_date = {}
            for item in schedule:
                date = item['дата']
                if date not in schedule_by_date:
                    schedule_by_date[date] = []
                schedule_by_date[date].append(item)
            
            for date, items in sorted(schedule_by_date.items()):
                formatted_date = datetime.strptime(date, '%Y-%m-%d').strftime('%d.%m')
                message += f"📆 {formatted_date}:\n"
                
                for item in items:
                    message += f"   ⏰ {item['время']} - {item['мастер_имя']}\n"
                    keyboard.append([
                        InlineKeyboardButton(
                            f"{formatted_date} {item['время']} - {item['мастер_имя']}",
                            callback_data=f'time_slot_{item["id"]}'
                        )
                    ])
                
                message += "\n"
            
            if not schedule:
                message += "❌ Нет свободного времени на этой неделе\n"
        
        else:
            message += "❌ Ошибка загрузки расписания\n"
        
        prev_week_start = start_of_week - timedelta(days=7)
        next_week_start = start_of_week + timedelta(days=7)
        
        nav_buttons = [
            InlineKeyboardButton("⬅️ Пред. неделя", callback_data=f'all_schedule_nav_prev_{prev_week_start.strftime("%Y-%m-%d")}_{service_id}'),
            InlineKeyboardButton("След. неделя ➡️", callback_data=f'all_schedule_nav_next_{next_week_start.strftime("%Y-%m-%d")}_{service_id}')
        ]
        keyboard.append(nav_buttons)
        
        keyboard.append([InlineKeyboardButton("↲ Назад", callback_data=f'choose_service')])
        keyboard.append([InlineKeyboardButton("☰ Главное меню", callback_data='cancel_to_main')])
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(message, reply_markup=reply_markup)
        
    except Exception as e:
        logger.error(f"Error fetching all specialists schedule: {e}")
        await query.edit_message_text("❌ Ошибка подключения к серверу")