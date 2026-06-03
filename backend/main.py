import os
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
from dotenv import load_dotenv
from telethon import TelegramClient, events
from telethon.errors import SessionPasswordNeededError
from telethon.tl.functions.messages import DeleteHistoryRequest

load_dotenv()

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_BASE = f"https://api.telegram.org/bot{TOKEN}/"

API_ID = int(os.getenv("TELEGRAM_API_ID", "0"))
API_HASH = os.getenv("TELEGRAM_API_HASH", "")
SESSION_PATH = os.path.join(os.path.dirname(__file__), "user")

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "config.json")
DEFAULT_CONFIG = {"monitored_groups": [], "keywords": [], "destination": "", "active": False}


def load_config() -> dict:
    try:
        with open(CONFIG_PATH, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return DEFAULT_CONFIG.copy()


def save_config(cfg: dict):
    with open(CONFIG_PATH, "w") as f:
        json.dump(cfg, f, indent=2)


config: dict = load_config()

telegram_client = TelegramClient(SESSION_PATH, API_ID, API_HASH)
phone_code_hash: str = ""
forwarder_handler = None


def register_forwarder():
    global forwarder_handler
    if forwarder_handler is not None:
        telegram_client.remove_event_handler(forwarder_handler)

    async def forwarder(event):
        print(f"[forwarder] incoming chat_id={event.chat_id} monitored={config['monitored_groups']} active={config['active']}")
        if not config["active"]:
            return
        if event.chat_id not in config["monitored_groups"]:
            return
        text = (event.message.text or "").lower()
        if not any(kw.lower() in text for kw in config["keywords"]):
            return
        print(f"[forwarder] match in chat {event.chat_id}: {repr(text[:80])}")
        try:
            dest = config["destination"]
            dest = int(dest) if str(dest).lstrip("-").isdigit() else dest
            await telegram_client.forward_messages(dest, event.message)
            print(f"[forwarder] forwarded to {dest}")
        except Exception as e:
            print(f"[forwarder] ERROR: {e}")

    telegram_client.add_event_handler(forwarder, events.NewMessage)
    forwarder_handler = forwarder


@asynccontextmanager
async def lifespan(app):
    await telegram_client.connect()
    if await telegram_client.is_user_authorized():
        register_forwarder()
    yield
    await telegram_client.disconnect()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

updates_offset: int = 0


class SendMessage(BaseModel):
    chat_id: str
    text: str


class PhoneRequest(BaseModel):
    phone: str


class VerifyCodeRequest(BaseModel):
    phone: str
    code: str
    password: str = ""


class MonitorConfig(BaseModel):
    monitored_groups: list[int]
    keywords: list[str]
    destination: str
    active: bool


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/bot-info")
async def bot_info():
    if not TOKEN:
        return {"error": "No token configured"}
    async with httpx.AsyncClient() as client:
        r = await client.get(TELEGRAM_BASE + "getMe")
    data = r.json()
    if not data.get("ok"):
        return {"error": data.get("description", "Telegram API error")}
    return data["result"]


@app.get("/updates")
async def get_updates():
    global updates_offset
    async with httpx.AsyncClient() as client:
        r = await client.get(
            TELEGRAM_BASE + "getUpdates",
            params={"offset": updates_offset, "limit": 10},
        )
    data = r.json()
    results = data.get("result", [])
    if results:
        updates_offset = max(u["update_id"] for u in results) + 1
    messages = [u["message"] for u in results if "message" in u]
    return {"messages": messages}


@app.post("/send")
async def send_message(body: SendMessage):
    async with httpx.AsyncClient() as client:
        r = await client.post(
            TELEGRAM_BASE + "sendMessage",
            json={"chat_id": body.chat_id, "text": body.text},
        )
    return r.json()


@app.get("/user/status")
async def user_status():
    return {"authorized": await telegram_client.is_user_authorized()}


@app.post("/user/send-code")
async def send_code(body: PhoneRequest):
    global phone_code_hash
    result = await telegram_client.send_code_request(body.phone)
    phone_code_hash = result.phone_code_hash
    return {"ok": True}


@app.post("/user/verify-code")
async def verify_code(body: VerifyCodeRequest):
    try:
        await telegram_client.sign_in(body.phone, body.code, phone_code_hash=phone_code_hash)
    except SessionPasswordNeededError:
        await telegram_client.sign_in(password=body.password)
    except Exception as e:
        return {"error": str(e)}
    register_forwarder()
    return {"ok": True}


@app.get("/user/groups")
async def get_groups():
    dialogs = await telegram_client.get_dialogs()
    groups = [
        {
            "id": d.id,
            "name": d.name,
            "type": "channel" if d.is_channel else "group",
            "members_count": getattr(d.entity, "participants_count", None),
        }
        for d in dialogs
        if d.is_group or d.is_channel
    ]
    return groups


@app.get("/config")
async def get_config():
    return config


@app.post("/config")
async def set_config(body: MonitorConfig):
    global config
    config = body.model_dump()
    save_config(config)
    register_forwarder()
    return {"ok": True}


@app.delete("/bot/history")
async def delete_bot_history():
    if not await telegram_client.is_user_authorized():
        return {"error": "Not authorized"}
    bot_id = int(TOKEN.split(":")[0])
    await telegram_client(DeleteHistoryRequest(peer=bot_id, max_id=0, just_clear=True, revoke=True))
    return {"ok": True}
