from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from app.config import settings
from app.database import get_db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer()

def verificar_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def hashear_password(password: str) -> str:
    return pwd_context.hash(password)

def crear_token_jwt(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db)
):
    try:
        payload = jwt.decode(credentials.credentials, settings.secret_key, algorithms=[settings.algorithm])
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token inválido")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")

    result = await db.execute(
        text("SELECT id, nombre, documento, rol, tienda_id, activo FROM usuarios WHERE id = :id"),
        {"id": user_id}
    )
    user = result.mappings().first()
    if not user or not user["activo"]:
        raise HTTPException(status_code=401, detail="Usuario no encontrado o inactivo")

    return user

def require_role(roles: list[str]):
    async def checker(user=Depends(get_current_user)):
        if user["rol"] not in roles:
            raise HTTPException(status_code=403, detail=f"Rol requerido: {roles}")
        return user
    return checker
