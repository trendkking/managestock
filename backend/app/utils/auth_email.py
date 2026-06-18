ADMIN_EMAIL = "admin@managestock.local"
ADMIN_LOGIN_ALIASES = {"admin", "admin@managestock.local"}


def normalize_login_identifier(raw: str) -> str:
    value = raw.strip().lower()
    if value == "admin":
        return ADMIN_EMAIL
    return value
