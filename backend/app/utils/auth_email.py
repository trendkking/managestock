ADMIN_EMAIL = "admin@bullslong.local"
ADMIN_LOGIN_ALIASES = {"admin", "admin@bullslong.local"}


def normalize_login_identifier(raw: str) -> str:
    value = raw.strip().lower()
    if value == "admin":
        return ADMIN_EMAIL
    return value
