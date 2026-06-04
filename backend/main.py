from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
from telethon.errors import SessionPasswordNeededError

from settings import TOKEN, TELEGRAM_BASE, MY_CHAT_ID, BOT_ID
import config as cfg_module
from config import save_config
import telethon_mgr
from telethon_mgr import telegram_client, register_forwarder, register_command_handler


@asynccontextmanager
async def lifespan(app):
    await telegram_client.connect()
    if await telegram_client.is_user_authorized():
        register_forwarder()
        register_command_handler()
    yield
    await telegram_client.disconnect()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class SendMessage(BaseModel):
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


@app.post("/send")
async def send_message(body: SendMessage):
    async with httpx.AsyncClient() as client:
        r = await client.post(
            TELEGRAM_BASE + "sendMessage",
            json={"chat_id": MY_CHAT_ID, "text": body.text},
        )
    return r.json()


@app.get("/user/status")
async def user_status():
    return {"authorized": await telegram_client.is_user_authorized()}


@app.post("/user/send-code")
async def send_code(body: PhoneRequest):
    result = await telegram_client.send_code_request(body.phone)
    telethon_mgr.phone_code_hash = result.phone_code_hash
    return {"ok": True}


@app.post("/user/verify-code")
async def verify_code(body: VerifyCodeRequest):
    try:
        await telegram_client.sign_in(body.phone, body.code, phone_code_hash=telethon_mgr.phone_code_hash)
    except SessionPasswordNeededError:
        await telegram_client.sign_in(password=body.password)
    except Exception as e:
        return {"error": str(e)}
    register_forwarder()
    register_command_handler()
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
    return cfg_module.config


@app.post("/config")
async def set_config(body: MonitorConfig):
    cfg_module.config = body.model_dump()
    save_config(cfg_module.config)
    register_forwarder()
    return {"ok": True}


@app.delete("/bot/history")
async def delete_bot_history():
    if not await telegram_client.is_user_authorized():
        return {"error": "Not authorized"}
    messages = await telegram_client.get_messages(BOT_ID, limit=None)
    ids = [m.id for m in messages]
    for i in range(0, len(ids), 100):
        await telegram_client.delete_messages(BOT_ID, ids[i:i + 100], revoke=True)
    return {"ok": True, "deleted": len(ids)}
