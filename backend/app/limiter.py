from fastapi import Request
from slowapi import Limiter

def _get_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    return forwarded.split(",")[0].strip() if forwarded else request.client.host

limiter = Limiter(key_func=_get_ip)
