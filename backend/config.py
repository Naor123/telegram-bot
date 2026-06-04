import json
from settings import CONFIG_PATH

DEFAULT_CONFIG = {"monitored_groups": [], "keywords": [], "active": False}

config: dict = {}


def load_config() -> dict:
    try:
        with open(CONFIG_PATH, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return DEFAULT_CONFIG.copy()


def save_config(cfg: dict):
    with open(CONFIG_PATH, "w") as f:
        json.dump(cfg, f, indent=2)


config = load_config()
