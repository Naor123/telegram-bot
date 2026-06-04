from bot_api import bot_reply


async def cmd_search(args: str):
    if not args:
        await bot_reply("Usage: /search <query>")
        return
    # TODO: AliExpress search logic
    await bot_reply(f"Searching for: {args}\n(not implemented yet)")


COMMAND_HANDLERS = {
    "search": cmd_search,
}
