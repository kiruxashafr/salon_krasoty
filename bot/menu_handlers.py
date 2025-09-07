# menu_handlers.py - исправленная версия
import logging
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import ContextTypes

logger = logging.getLogger(__name__)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик команды /start"""
    await show_main_menu(update=update)

async def start_callback(query):
    """Обработчик возврата к началу"""
    await show_main_menu(query=query)

async def show_main_menu(query=None, update=None):
    """Показать главное меню"""
    keyboard = [
        [InlineKeyboardButton("👨‍💼 Мастера", callback_data='masters_menu')],
        [InlineKeyboardButton("🎯 Услуги", callback_data='services_menu')],
        [InlineKeyboardButton("📅 Записаться", callback_data='book_appointment')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    text = "Добро пожаловать в салон красоты!\n\nВыберите раздел:"
    
    if query:
        await query.edit_message_text(text, reply_markup=reply_markup)
    elif update and update.message:
        await update.message.reply_text(text, reply_markup=reply_markup)