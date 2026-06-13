from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
import hashlib
from app.database import get_db
from app.middleware.security import crear_token_jwt, get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])

class LoginSchema(BaseModel):
    documento: str
    password: str
    tienda_codigo: str

@router.post("/login")
async def login(payload: LoginSchema, db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("""
        SELECT u.id, u.nombre, u.rol, u.tienda_id, u.activo,
               v.empresa_seguridad, v.numero_carnet, v.turno, v.activo AS v_activo,
               t.codigo AS tienda_codigo, t.nombre AS tienda_nombre,
               (u.password_hash = crypt(:pwd, u.password_hash)) AS pwd_ok
        FROM usuarios u
        JOIN vigilantes v ON v.usuario_id = u.id
        JOIN tiendas t ON t.id = u.tienda_id
        WHERE u.documento = :doc AND u.rol = 'vigilante'
    """), {"doc": payload.documento.strip(), "pwd": payload.password})
    vig = result.mappings().first()

    if not vig:
        raise HTTPException(status_code=401, detail={"codigo":"CREDENCIALES_INVALIDAS","mensaje":"Documento no encontrado."})
    if not vig["activo"] or not vig["v_activo"]:
        raise HTTPException(status_code=403, detail={"codigo":"CUENTA_INACTIVA","mensaje":"Cuenta desactivada."})
    if not vig["pwd_ok"]:
        raise HTTPException(status_code=401, detail={"codigo":"CREDENCIALES_INVALIDAS","mensaje":"Contraseña incorrecta."})
    if vig["tienda_codigo"].upper() != payload.tienda_codigo.upper():
        raise HTTPException(status_code=403, detail={"codigo":"TIENDA_NO_AUTORIZADA",
            "mensaje":"Este vigilante pertenece a otra tienda.","tienda":vig["tienda_nombre"]})

    token = crear_token_jwt({
        "sub": str(vig["id"]), "rol": "vigilante",
        "tienda_id": str(vig["tienda_id"]), "nombre": vig["nombre"],
        "carnet": vig["numero_carnet"], "empresa": vig["empresa_seguridad"]
    })
    token_hash = hashlib.sha256(token.encode()).hexdigest()

    await db.execute(text("SELECT cerrar_sesion_anterior(:vid)"), {"vid": str(vig["id"])})

    result2 = await db.execute(text("""
        INSERT INTO sesiones_turno(vigilante_id, tienda_id, token_hash)
        VALUES(:vid, :tid, :th) RETURNING id, inicio_turno
    """), {"vid": str(vig["id"]), "tid": str(vig["tienda_id"]), "th": token_hash})
    sesion = result2.mappings().first()
    await db.commit()

    return {
        "token": token,
        "sesion_id": str(sesion["id"]),
        "vigilante": {
            "id": str(vig["id"]),
            "nombre": vig["nombre"],
            "documento": payload.documento,
            "carnet": vig["numero_carnet"],
            "empresa": vig["empresa_seguridad"],
            "turno": vig["turno"]
        },
        "tienda": {"codigo": vig["tienda_codigo"], "nombre": vig["tienda_nombre"]},
        "inicio_turno": sesion["inicio_turno"].isoformat()
    }

@router.post("/logout")
async def logout(db: AsyncSession = Depends(get_db), usuario=Depends(get_current_user)):
    await db.execute(text("SELECT cerrar_sesion_anterior(:vid)"), {"vid": str(usuario["id"])})
    await db.commit()
    return {"ok": True, "mensaje": "Turno cerrado."}

@router.get("/tiendas")
async def tiendas_publicas(db: AsyncSession = Depends(get_db)):
    r = await db.execute(text(
        "SELECT codigo, nombre, ciudad FROM tiendas WHERE activa = TRUE ORDER BY codigo"
    ))
    return [dict(row) for row in r.mappings().all()]

class AdminLoginSchema(BaseModel):
    documento: str
    password: str

@router.post("/admin-login")
async def admin_login(payload: AdminLoginSchema, db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("""
        SELECT u.id, u.nombre, u.rol, u.tienda_id, u.activo,
               t.codigo AS tienda_codigo, t.nombre AS tienda_nombre,
               (u.password_hash = crypt(:pwd, u.password_hash)) AS pwd_ok
        FROM usuarios u
        JOIN tiendas t ON t.id = u.tienda_id
        WHERE u.documento = :doc AND u.rol != 'vigilante'
    """), {"doc": payload.documento.strip(), "pwd": payload.password})
    user = result.mappings().first()

    if not user:
        raise HTTPException(status_code=401, detail={"codigo": "CREDENCIALES_INVALIDAS", "mensaje": "Credenciales incorrectas."})
    if not user["activo"]:
        raise HTTPException(status_code=403, detail={"codigo": "CUENTA_INACTIVA", "mensaje": "Cuenta desactivada."})
    if not user["pwd_ok"]:
        raise HTTPException(status_code=401, detail={"codigo": "CREDENCIALES_INVALIDAS", "mensaje": "Contraseña incorrecta."})

    token = crear_token_jwt({
        "sub": str(user["id"]), "rol": user["rol"],
        "tienda_id": str(user["tienda_id"]), "nombre": user["nombre"]
    })
    return {
        "token": token,
        "usuario": {
            "id": str(user["id"]), "nombre": user["nombre"],
            "rol": user["rol"], "documento": payload.documento
        },
        "tienda": {"codigo": user["tienda_codigo"], "nombre": user["tienda_nombre"]}
    }
