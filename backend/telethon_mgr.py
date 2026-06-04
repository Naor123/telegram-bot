from telethon import TelegramClient, events
from settings import API_ID, API_HASH, SESSION_PATH, BOT_ID
import config as cfg_module
from commands import COMMAND_HANDLERS
from bot_api import bot_reply

telegram_client = TelegramClient(SESSION_PATH, API_ID, API_HASH)
phone_code_hash: str = ""
forwarder_handler = None
command_handler = None


def register_forwarder():
    global forwarder_handler
    if forwarder_handler is not None:
        telegram_client.remove_event_handler(forwarder_handler)

    async def forwarder(event):
        print(f"[forwarder] incoming chat_id={event.chat_id} monitored={cfg_module.config['monitored_groups']} active={cfg_module.config['active']}")
        if not cfg_module.config["active"]:
            return
        if event.chat_id not in cfg_module.config["monitored_groups"]:
            return
        text = (event.message.text or "").lower()
        if not any(kw.lower() in text for kw in cfg_module.config["keywords"]):
            return
        print(f"[forwarder] match in chat {event.chat_id}: {repr(text[:80])}")
        try:
            await telegram_client.forward_messages(BOT_ID, event.message)
            print(f"[forwarder] forwarded to {BOT_ID}")
        except Exception as e:
            print(f"[forwarder] ERROR: {e}")

    telegram_client.add_event_handler(forwarder, events.NewMessage)
    forwarder_handler = forwarder


def register_command_handler():
    global command_handler
    if command_handler is not None:
        telegram_client.remove_event_handler(command_handler)

    async def dispatch(event):
        text = (event.message.text or "").strip()
        if not text.startswith("/"):
            return
        parts = text[1:].split(None, 1)
        cmd = parts[0].lower()
        args = parts[1] if len(parts) > 1 else ""
        fn = COMMAND_HANDLERS.get(cmd)
        if fn:
            await fn(args)
        else:
            await bot_reply(f"Unknown command: /{cmd}")

    telegram_client.add_event_handler(dispatch, events.NewMessage(outgoing=True, chats=[BOT_ID]))
    command_handler = dispatch
