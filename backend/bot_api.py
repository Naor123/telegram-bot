import httpx
from settings import TELEGRAM_BASE, MY_CHAT_ID


async def bot_reply(text: str):
    async with httpx.AsyncClient() as client:
        await client.post(TELEGRAM_BASE + "sendMessage", json={"chat_id": MY_CHAT_ID, "text": text})
