from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, update
from pydantic import BaseModel, field_validator
from decimal import Decimal
from uuid import UUID
from datetime import datetime, timezone
from typing import Optional
from app.database import get_db
from app.middleware.security import require_role, get_current_user

router = APIRouter(prefix="/vigilante", tags=["Vigilante"])

# ── SCHEMAS ──────────────────────────────────────────────────
class ItemVentaInput(BaseModel):
    referencia: str
    descripcion: str = ""
    unidad: str
    cantidad: int
    precio: Decimal = Decimal("0")

    @field_validator("unidad")
    @classmethod
    def unidad_valida(cls, v):
        if v not in ("UND","R1","CX"):
            raise ValueError("Unidad debe ser UND, R1 o CX")
        return v

    @field_validator("cantidad")
    @classmethod
    def cantidad_pos(cls, v):
        if v <= 0: raise ValueError("Cantidad debe ser > 0")
        return v

class RegistrarVentaSchema(BaseModel):
    numero_factura: str
    jdt_nombre: str
    cliente_id: Optional[UUID] = None
    cliente_nuevo: Optional[dict] = None
    monto_total: Decimal
    sagrilaft_diligenciado: bool = False
    items: list[ItemVentaInput]
    observaciones: Optional[str] = None

    @field_validator("numero_factura")
    @classmethod
    def limpiar(cls, v):
        if not v.strip(): raise ValueError("Factura requerida")
        return v.strip().upper()

    @field_validator("jdt_nombre")
    @classmethod
    def jdt_req(cls, v):
        if not v.strip(): raise ValueError("Nombre del JDT requerido")
        return v.strip()

class ItemEntregaInput(BaseModel):
    item_venta_id: UUID
    cantidad: int

class ConfirmarEntregaSchema(BaseModel):
    tipo: str
    retira_el_comprador: bool = True
    nombre_autorizado: Optional[str] = None
    doc_autorizado: Optional[str] = None
    carta_autorizacion: bool = False
    items_entregados: list[ItemEntregaInput]
    observaciones: Optional[str] = None

class LlegadaClienteSchema(BaseModel):
    retira_el_comprador: bool = True
    nombre_autorizado: Optional[str] = None
    doc_autorizado: Optional[str] = None
    factura_presentada: bool = True

class ReporteAnomaliaSchema(BaseModel):
    tipo: str
    numero_factura: Optional[str] = None
    descripcion: str

# ── HELPERS ───────────────────────────────────────────────────
async def _sesion_activa(db, vigilante_id):
    r = await db.execute(text("""
        SELECT st.id AS sesion_id, u.nombre, v.numero_carnet, v.empresa_seguridad
        FROM sesiones_turno st
        JOIN usuarios u ON u.id=st.vigilante_id
        JOIN vigilantes v ON v.usuario_id=st.vigilante_id
        WHERE st.vigilante_id=:vid AND st.activa=TRUE LIMIT 1
    """), {"vid": str(vigilante_id)})
    s = r.mappings().first()
    if not s:
        raise HTTPException(status_code=403, detail={"codigo":"SIN_SESION","mensaje":"Sin turno activo."})
    return dict(s)

async def _estado_venta(db, numero_factura, tienda_id):
    r = await db.execute(text("""
        SELECT * FROM v_venta_vigilante
        WHERE numero_factura=:fac
          AND tienda_codigo=(SELECT codigo FROM tiendas WHERE id=:tid)
    """), {"fac": numero_factura.upper().strip(), "tid": str(tienda_id)})
    v = r.mappings().first()
    if not v:
        raise HTTPException(status_code=404, detail={"codigo":"NO_ENCONTRADA","numero_factura":numero_factura})
    return dict(v)

# ── VENTAS ACTIVAS ────────────────────────────────────────────
@router.get("/ventas-activas")
async def ventas_activas(db: AsyncSession = Depends(get_db),
                         usuario=Depends(require_role(["vigilante"]))):
    r = await db.execute(text("""
        SELECT numero_factura, estado, monto_total, cliente_nombre, jdt_nombre,
               horas_restantes, retiros_usados, retiros_disponibles, formato_vencido,
               total_facturado, total_entregado, total_pendiente
        FROM v_venta_vigilante
        WHERE tienda_codigo=(SELECT codigo FROM tiendas WHERE id=:tid)
          AND estado NOT IN ('entregada','vencida')
        ORDER BY horas_restantes ASC NULLS LAST
    """), {"tid": str(usuario["tienda_id"])})
    ventas = r.mappings().all()
    return [dict(v) for v in ventas]

# ── BUSCAR POR FACTURA ────────────────────────────────────────
@router.get("/buscar")
async def buscar_factura(q: str = Query(..., min_length=2),
                         db: AsyncSession = Depends(get_db),
                         usuario=Depends(require_role(["vigilante"]))):
    r = await db.execute(text("""
        SELECT numero_factura, cliente_nombre, estado, monto_total,
               horas_restantes, retiros_disponibles, formato_vencido
        FROM v_venta_vigilante
        WHERE tienda_codigo=(SELECT codigo FROM tiendas WHERE id=:tid)
          AND numero_factura ILIKE :q
        ORDER BY fecha_venta DESC LIMIT 8
    """), {"tid": str(usuario["tienda_id"]), "q": f"%{q}%"})
    return [dict(v) for v in r.mappings().all()]

# ── DETALLE COMPLETO ──────────────────────────────────────────
@router.get("/factura/{numero_factura}")
async def detalle_venta(numero_factura: str,
                        db: AsyncSession = Depends(get_db),
                        usuario=Depends(require_role(["vigilante"]))):
    v = await _estado_venta(db, numero_factura, usuario["tienda_id"])
    return {
        "numero_factura": v["numero_factura"],
        "estado": v["estado"],
        "alerta_sagrilaft": v["requiere_sagrilaft"] and not v["sagrilaft_diligenciado"],
        "tienda": {"codigo": v["tienda_codigo"], "nombre": v["tienda_nombre"]},
        "cliente": {"nombre": v["cliente_nombre"], "nit": v["cliente_nit"],
                    "representante": v["cliente_representante"], "telefono": v["cliente_telefono"]},
        "venta": {"monto_total": float(v["monto_total"]), "fecha": v["fecha_venta"].isoformat(),
                  "jdt_nombre": v["jdt_nombre"], "observaciones": v["observaciones"]},
        "control": {
            "formato_id": str(v["formato_id"]) if v["formato_id"] else None,
            "numero_formato": v["numero_formato"],
            "formato_vencimiento": v["formato_vencimiento"].isoformat() if v["formato_vencimiento"] else None,
            "horas_restantes": float(v["horas_restantes"]) if v["horas_restantes"] else None,
            "formato_vencido": v["formato_vencido"],
            "retiros_usados": int(v["retiros_usados"] or 0),
            "retiros_disponibles": int(v["retiros_disponibles"] or 0),
            "puede_recibir_retiro": (
                not v["formato_vencido"] and
                int(v["retiros_disponibles"] or 0) > 0 and
                v["estado"] not in ("entregada","vencida")
            )
        },
        "items": v["items"] or [],
        "totales": {
            "facturado": int(v["total_facturado"] or 0),
            "entregado": int(v["total_entregado"] or 0),
            "pendiente": int(v["total_pendiente"] or 0),
            "porcentaje": round(int(v["total_entregado"] or 0) / max(int(v["total_facturado"] or 1),1) * 100, 1)
        },
        "historial_retiros": v["historial_retiros"] or [],
        "registrado_por": {
            "nombre": v["registrado_por_nombre"],
            "carnet": v["registrado_por_carnet"],
            "empresa": v["registrado_por_empresa"]
        }
    }

# ── REGISTRAR VENTA ───────────────────────────────────────────
@router.post("/ventas/registrar")
async def registrar_venta(payload: RegistrarVentaSchema,
                          db: AsyncSession = Depends(get_db),
                          usuario=Depends(require_role(["vigilante"]))):
    sesion = await _sesion_activa(db, usuario["id"])

    if payload.cliente_id:
        r = await db.execute(text("SELECT id FROM clientes_mayoristas WHERE id=:id"),
                             {"id": str(payload.cliente_id)})
        if not r.first():
            raise HTTPException(status_code=404, detail="Cliente no encontrado.")
        cliente_id = payload.cliente_id
    elif payload.cliente_nuevo:
        datos = payload.cliente_nuevo
        if not datos.get("razon_social") or not datos.get("nit"):
            raise HTTPException(status_code=422, detail="Se requieren razón social y NIT.")
        dup = await db.execute(text("SELECT id FROM clientes_mayoristas WHERE nit=:nit"),
                               {"nit": datos["nit"]})
        ex = dup.first()
        if ex:
            raise HTTPException(status_code=409, detail={
                "codigo":"NIT_DUPLICADO","cliente_id":str(ex[0]),
                "mensaje":f"Cliente con NIT {datos['nit']} ya existe."})
        r2 = await db.execute(text("""
            INSERT INTO clientes_mayoristas(razon_social,nit,nombre_rep,telefono)
            VALUES(:rs,:nit,:rep,:tel) RETURNING id
        """), {"rs":datos["razon_social"],"nit":datos["nit"],
               "rep":datos.get("nombre_rep"),"tel":datos.get("telefono")})
        cliente_id = r2.scalar()
    else:
        raise HTTPException(status_code=422, detail="Proporcione cliente_id o cliente_nuevo.")

    if float(payload.monto_total) >= 40_000_000 and not payload.sagrilaft_diligenciado:
        raise HTTPException(status_code=422, detail={
            "codigo":"SAGRILAFT_REQUERIDO",
            "mensaje":"Compras >= $40.000.000 requieren formato SAGRILAFT."})

    items_json = str([{
        "referencia":i.referencia,"descripcion":i.descripcion,
        "unidad":i.unidad,"cantidad":i.cantidad,"precio":str(i.precio)
    } for i in payload.items]).replace("'",'"')

    try:
        r3 = await db.execute(text("""
            SELECT registrar_venta_mayorista(
                :tid,:cid,:vid,:fac,:monto,:sag,:jdt,:items::jsonb,:obs
            ) AS resultado
        """), {
            "tid":str(usuario["tienda_id"]),"cid":str(cliente_id),
            "vid":str(usuario["id"]),"fac":payload.numero_factura,
            "monto":str(payload.monto_total),"sag":payload.sagrilaft_diligenciado,
            "jdt":payload.jdt_nombre,"items":items_json,"obs":payload.observaciones
        })
        resultado = r3.scalar()
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=409, detail={"codigo":"ERROR","mensaje":str(e)})

    return {
        "ok": True,
        "numero_factura": payload.numero_factura,
        "registrado_por": {"vigilante":sesion["nombre"],"carnet":sesion["numero_carnet"]},
        "mensaje": f"Venta {payload.numero_factura} registrada correctamente."
    }

# ── CONFIRMAR LLEGADA ─────────────────────────────────────────
@router.post("/factura/{numero_factura}/confirmar-llegada")
async def confirmar_llegada(numero_factura: str, payload: LlegadaClienteSchema,
                            db: AsyncSession = Depends(get_db),
                            usuario=Depends(require_role(["vigilante"]))):
    venta = await _estado_venta(db, numero_factura, usuario["tienda_id"])
    sesion = await _sesion_activa(db, usuario["id"])

    if venta["formato_vencido"]:
        raise HTTPException(status_code=409, detail={"codigo":"VENCIDO","mensaje":"Plazo de 72h vencido."})
    if int(venta["retiros_disponibles"] or 0) <= 0:
        raise HTTPException(status_code=409, detail={"codigo":"AGOTADO","mensaje":"3 retiros completados. Solicitar formato adicional al JDT/SDT."})
    if not payload.retira_el_comprador and (not payload.nombre_autorizado or not payload.doc_autorizado):
        raise HTTPException(status_code=422, detail={"codigo":"AUTORIZACION","mensaje":"Ingrese datos del autorizado."})

    await db.execute(text("""
        INSERT INTO eventos_auditoria(venta_id,usuario_id,sesion_id,vigilante_nombre,vigilante_carnet,evento,detalle)
        VALUES(:vid,:uid,:sid,:vnom,:vcar,'cliente_llego_a_retirar',:det::jsonb)
    """), {
        "vid":str(venta["venta_id"]),"uid":str(usuario["id"]),"sid":str(sesion["sesion_id"]),
        "vnom":sesion["nombre"],"vcar":sesion["numero_carnet"],
        "det":str({"numero_factura":numero_factura,"retiro":int(venta["retiros_usados"] or 0)+1,
                   "retira_comprador":payload.retira_el_comprador,
                   "nombre_autorizado":payload.nombre_autorizado}).replace("'",'"')
    })
    await db.commit()

    return {
        "ok": True, "numero_factura": numero_factura,
        "retiro_numero": int(venta["retiros_usados"] or 0)+1,
        "retiros_restantes": int(venta["retiros_disponibles"] or 0)-1,
        "horas_restantes": float(venta["horas_restantes"] or 0)
    }

# ── CONFIRMAR ENTREGA ─────────────────────────────────────────
@router.post("/factura/{numero_factura}/confirmar-entrega")
async def confirmar_entrega(numero_factura: str, payload: ConfirmarEntregaSchema,
                            db: AsyncSession = Depends(get_db),
                            usuario=Depends(require_role(["vigilante"]))):
    venta = await _estado_venta(db, numero_factura, usuario["tienda_id"])
    sesion = await _sesion_activa(db, usuario["id"])

    if venta["formato_vencido"]:
        raise HTTPException(status_code=409, detail={"codigo":"VENCIDO","mensaje":"Plazo de 72h vencido."})

    # Validar cantidades
    for ic in payload.items_entregados:
        r = await db.execute(text("SELECT referencia,cantidad_facturada,cantidad_entregada FROM items_venta WHERE id=:id"),
                             {"id": str(ic.item_venta_id)})
        item = r.mappings().first()
        if not item:
            raise HTTPException(status_code=404, detail=f"Ítem {ic.item_venta_id} no encontrado.")
        pendiente = item["cantidad_facturada"] - item["cantidad_entregada"]
        if ic.cantidad > pendiente:
            raise HTTPException(status_code=422, detail={
                "referencia":item["referencia"],"pendiente":pendiente,"solicitado":ic.cantidad})

    try:
        # Insertar retiro (trigger valida límite)
        r2 = await db.execute(text("""
            INSERT INTO retiros(venta_id,formato_id,numero_retiro,tipo,
                retira_el_comprador,nombre_autorizado,doc_autorizado,carta_autorizacion,
                vigilante_id,sesion_id,vigilante_nombre,vigilante_carnet,vigilante_empresa,
                factura_presentada,sello_colocado,observaciones)
            VALUES(:vid,:fid,:num,:tipo,:rc,:na,:da,:ca,:vig_id,:sid,:vnom,:vcar,:vemp,
                   TRUE,TRUE,:obs)
            RETURNING id
        """), {
            "vid":str(venta["venta_id"]),"fid":str(venta["formato_id"]),
            "num":int(venta["retiros_usados"] or 0)+1,"tipo":payload.tipo,
            "rc":payload.retira_el_comprador,"na":payload.nombre_autorizado,
            "da":payload.doc_autorizado,"ca":payload.carta_autorizacion,
            "vig_id":str(usuario["id"]),"sid":str(sesion["sesion_id"]),
            "vnom":sesion["nombre"],"vcar":sesion["numero_carnet"],
            "vemp":sesion["empresa_seguridad"],"obs":payload.observaciones
        })
        retiro_id = r2.scalar()

        for ic in payload.items_entregados:
            await db.execute(text("""
                INSERT INTO items_retiro(retiro_id,item_venta_id,cantidad_entregada)
                VALUES(:rid,:iid,:cant)
            """), {"rid":str(retiro_id),"iid":str(ic.item_venta_id),"cant":ic.cantidad})
            await db.execute(text("""
                UPDATE items_venta SET cantidad_entregada=cantidad_entregada+:cant WHERE id=:id
            """), {"cant":ic.cantidad,"id":str(ic.item_venta_id)})

        # Verificar si todo fue entregado
        r3 = await db.execute(text("""
            SELECT COUNT(*) FROM items_venta
            WHERE venta_id=:vid AND cantidad_entregada < cantidad_facturada
        """), {"vid":str(venta["venta_id"])})
        pendientes_count = r3.scalar()
        nuevo_estado = "entregada" if pendientes_count == 0 else "entrega_parcial"

        await db.execute(text("""
            UPDATE ventas_mayoristas SET estado=:est, updated_at=NOW() WHERE id=:id
        """), {"est":nuevo_estado,"id":str(venta["venta_id"])})

        await db.execute(text("""
            INSERT INTO eventos_auditoria(venta_id,usuario_id,sesion_id,vigilante_nombre,vigilante_carnet,evento,detalle)
            VALUES(:vid,:uid,:sid,:vnom,:vcar,'sello_colocado',:det::jsonb)
        """), {
            "vid":str(venta["venta_id"]),"uid":str(usuario["id"]),"sid":str(sesion["sesion_id"]),
            "vnom":sesion["nombre"],"vcar":sesion["numero_carnet"],
            "det":str({"factura":numero_factura,"retiro":int(venta["retiros_usados"] or 0)+1,
                       "completa":pendientes_count==0}).replace("'",'"')
        })
        await db.commit()

        retiros_nuevos = int(venta["retiros_usados"] or 0)+1
        resp = {"ok":True,"numero_factura":numero_factura,
                "entrega_completa":pendientes_count==0,
                "retiros_usados":retiros_nuevos}
        if retiros_nuevos >= 3 and pendientes_count > 0:
            resp["alerta"] = {"codigo":"FORMATO_AGOTADO",
                              "mensaje":"3 retiros usados con mercancía pendiente. Solicitar formato adicional al JDT/SDT."}
        return resp

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=409, detail={"codigo":"ERROR","mensaje":str(e)})

# ── REPORTAR ANOMALÍA ─────────────────────────────────────────
@router.post("/reportar-anomalia")
async def reportar_anomalia(payload: ReporteAnomaliaSchema,
                            db: AsyncSession = Depends(get_db),
                            usuario=Depends(require_role(["vigilante"]))):
    sesion = await _sesion_activa(db, usuario["id"])
    tipos = ["mercancia_sin_factura","retiro_no_autorizado","venta_sin_cliente",
             "discrepancia_cantidades","formato_agotado","otro"]
    if payload.tipo not in tipos:
        raise HTTPException(status_code=422, detail=f"Tipo debe ser uno de: {tipos}")

    venta_id = None
    if payload.numero_factura:
        r = await db.execute(text("""
            SELECT id FROM ventas_mayoristas
            WHERE numero_factura=:fac AND tienda_id=:tid
        """), {"fac":payload.numero_factura.upper(),"tid":str(usuario["tienda_id"])})
        row = r.first()
        if row: venta_id = str(row[0])

    await db.execute(text("""
        INSERT INTO eventos_auditoria(venta_id,usuario_id,sesion_id,vigilante_nombre,vigilante_carnet,evento,detalle)
        VALUES(:vid,:uid,:sid,:vnom,:vcar,:ev,:det::jsonb)
    """), {
        "vid":venta_id,"uid":str(usuario["id"]),"sid":str(sesion["sesion_id"]),
        "vnom":sesion["nombre"],"vcar":sesion["numero_carnet"],
        "ev":f"ANOMALIA_{payload.tipo.upper()}",
        "det":str({"tipo":payload.tipo,"descripcion":payload.descripcion,
                   "factura":payload.numero_factura}).replace("'",'"')
    })
    await db.commit()
    return {"ok":True,"mensaje":"Anomalía reportada y registrada en auditoría."}

# ── CLIENTES: búsqueda ────────────────────────────────────────
@router.get("/clientes/buscar")
async def buscar_clientes(q: str = Query(..., min_length=2),
                          db: AsyncSession = Depends(get_db),
                          usuario=Depends(require_role(["vigilante"]))):
    r = await db.execute(text("""
        SELECT id, razon_social, nit, nombre_rep, telefono,
               (SELECT COUNT(*) FROM ventas_mayoristas WHERE cliente_id=c.id) AS total_compras
        FROM clientes_mayoristas c
        WHERE razon_social ILIKE :q OR nit ILIKE :q
        ORDER BY razon_social LIMIT 8
    """), {"q": f"%{q}%"})
    return [dict(row) for row in r.mappings().all()]

# ── FORMATO ADICIONAL ─────────────────────────────────────────
@router.post("/factura/{numero_factura}/formato-adicional")
async def formato_adicional(numero_factura: str,
                            db: AsyncSession = Depends(get_db),
                            usuario=Depends(require_role(["vigilante"]))):
    venta = await _estado_venta(db, numero_factura, usuario["tienda_id"])
    if int(venta["retiros_disponibles"] or 0) > 0:
        raise HTTPException(status_code=400, detail={"mensaje":"El formato actual aún tiene retiros disponibles."})
    if int(venta["total_pendiente"] or 0) <= 0:
        raise HTTPException(status_code=400, detail={"mensaje":"No hay mercancía pendiente."})
    try:
        r = await db.execute(text("""
            SELECT crear_formato_adicional(:fid,:uid) AS nuevo_id
        """), {"fid":str(venta["formato_id"]),"uid":str(usuario["id"])})
        nuevo_id = r.scalar()
        await db.commit()
        return {"ok":True,"nuevo_formato_id":str(nuevo_id),
                "mensaje":f"Formato GVM-001 #{int(venta['numero_formato'] or 1)+1} creado."}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=409, detail={"mensaje":str(e)})
