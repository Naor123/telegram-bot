import os
from dotenv import load_dotenv

load_dotenv()

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_BASE = f"https://api.telegram.org/bot{TOKEN}/"
MY_CHAT_ID = os.getenv("MY_CHAT_ID", "")
BOT_ID = int(TOKEN.split(":")[0]) if TOKEN else 0

API_ID = int(os.getenv("TELEGRAM_API_ID", "0"))
API_HASH = os.getenv("TELEGRAM_API_HASH", "")
SESSION_PATH = os.path.join(os.path.dirname(__file__), "user")
CONFIG_PATH = os.path.join(os.path.dirname(__file__), "config.json")
