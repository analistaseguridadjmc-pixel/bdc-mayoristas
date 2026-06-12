-- ============================================================
-- BDC MAYORISTAS — ESQUEMA COMPLETO
-- PostgreSQL 15+ / Supabase
-- Ejecutar en orden, una sola vez
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ── TIPOS ENUMERADOS ─────────────────────────────────────────
CREATE TYPE rol_usuario   AS ENUM ('jdt','sdt','vigilante','jvo','auditor');
CREATE TYPE estado_venta  AS ENUM ('registrada','facturada','en_separacion','entrega_parcial','entregada','vencida');
CREATE TYPE tipo_retiro   AS ENUM ('total','parcial');

-- ── TIENDAS ──────────────────────────────────────────────────
CREATE TABLE tiendas (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo           VARCHAR(20)  NOT NULL UNIQUE,
    nombre           VARCHAR(100) NOT NULL,
    ciudad           VARCHAR(60)  NOT NULL,
    tipo_caja_fuerte VARCHAR(20)  CHECK (tipo_caja_fuerte IN ('smart_cash','mecanica')),
    activa           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── USUARIOS ─────────────────────────────────────────────────
CREATE TABLE usuarios (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre        VARCHAR(100) NOT NULL,
    documento     VARCHAR(20)  NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol           rol_usuario  NOT NULL,
    tienda_id     UUID         NOT NULL REFERENCES tiendas(id),
    activo        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── VIGILANTES (perfil extendido) ────────────────────────────
CREATE TABLE vigilantes (
    usuario_id        UUID PRIMARY KEY REFERENCES usuarios(id),
    empresa_seguridad VARCHAR(100) NOT NULL,
    numero_carnet     VARCHAR(30)  NOT NULL UNIQUE,
    turno             VARCHAR(10)  CHECK (turno IN ('diurno','nocturno','mixto')),
    activo            BOOLEAN      NOT NULL DEFAULT TRUE
);

-- ── SESIONES DE TURNO ────────────────────────────────────────
CREATE TABLE sesiones_turno (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vigilante_id  UUID        NOT NULL REFERENCES usuarios(id),
    tienda_id     UUID        NOT NULL REFERENCES tiendas(id),
    inicio_turno  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fin_turno     TIMESTAMPTZ,
    token_hash    VARCHAR(64) NOT NULL UNIQUE,
    activa        BOOLEAN     NOT NULL DEFAULT TRUE
);

-- ── CLIENTES MAYORISTAS ──────────────────────────────────────
CREATE TABLE clientes_mayoristas (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    razon_social VARCHAR(150) NOT NULL,
    nit          VARCHAR(20)  NOT NULL UNIQUE,
    nombre_rep   VARCHAR(100),
    documento_rep VARCHAR(20),
    telefono     VARCHAR(20),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── VENTAS MAYORISTAS ────────────────────────────────────────
CREATE TABLE ventas_mayoristas (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tienda_id                   UUID          NOT NULL REFERENCES tiendas(id),
    cliente_id                  UUID          NOT NULL REFERENCES clientes_mayoristas(id),
    numero_factura              VARCHAR(50)   NOT NULL,
    monto_total                 NUMERIC(15,2) NOT NULL CHECK (monto_total > 0),
    requiere_sagrilaft          BOOLEAN       GENERATED ALWAYS AS (monto_total >= 40000000) STORED,
    sagrilaft_diligenciado      BOOLEAN       NOT NULL DEFAULT FALSE,
    estado                      estado_venta  NOT NULL DEFAULT 'facturada',
    jdt_nombre                  VARCHAR(100),
    registrado_por_vigilante_id UUID          REFERENCES usuarios(id),
    observaciones               TEXT,
    fecha_venta                 TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    created_at                  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    UNIQUE (tienda_id, numero_factura)
);

-- ── ÍTEMS DE VENTA ───────────────────────────────────────────
CREATE TABLE items_venta (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id           UUID        NOT NULL REFERENCES ventas_mayoristas(id) ON DELETE CASCADE,
    referencia         VARCHAR(50) NOT NULL,
    descripcion        VARCHAR(200),
    unidad             VARCHAR(10) NOT NULL CHECK (unidad IN ('UND','R1','CX')),
    cantidad_facturada INTEGER     NOT NULL CHECK (cantidad_facturada > 0),
    cantidad_entregada INTEGER     NOT NULL DEFAULT 0,
    precio_unitario    NUMERIC(12,2) NOT NULL DEFAULT 0,
    CONSTRAINT chk_entrega CHECK (cantidad_entregada <= cantidad_facturada)
);

-- ── FORMATOS GVM-001 ─────────────────────────────────────────
CREATE TABLE formatos_gvm001 (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id         UUID      NOT NULL REFERENCES ventas_mayoristas(id) ON DELETE CASCADE,
    numero_formato   SMALLINT  NOT NULL DEFAULT 1,
    formato_padre_id UUID      REFERENCES formatos_gvm001(id),
    fecha_apertura   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_limite     TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '72 hours',
    activo           BOOLEAN   NOT NULL DEFAULT TRUE,
    cerrado_por      VARCHAR(30) CHECK (cerrado_por IN ('entrega_completa','vencimiento','nuevo_formato')),
    UNIQUE (venta_id, numero_formato)
);

CREATE OR REPLACE FUNCTION fn_set_fecha_limite()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_limite := NEW.fecha_apertura + INTERVAL '72 hours';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_fecha_limite
    BEFORE INSERT ON formatos_gvm001
    FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_limite();

-- ── RETIROS ──────────────────────────────────────────────────
CREATE TABLE retiros (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id            UUID         NOT NULL REFERENCES ventas_mayoristas(id),
    formato_id          UUID         NOT NULL REFERENCES formatos_gvm001(id),
    numero_retiro       SMALLINT     NOT NULL CHECK (numero_retiro BETWEEN 1 AND 3),
    tipo                tipo_retiro  NOT NULL,
    retira_el_comprador BOOLEAN      NOT NULL DEFAULT TRUE,
    nombre_autorizado   VARCHAR(100),
    doc_autorizado      VARCHAR(20),
    carta_autorizacion  BOOLEAN      NOT NULL DEFAULT FALSE,
    vigilante_id        UUID         REFERENCES usuarios(id),
    sesion_id           UUID         REFERENCES sesiones_turno(id),
    vigilante_nombre    VARCHAR(100),
    vigilante_carnet    VARCHAR(30),
    vigilante_empresa   VARCHAR(100),
    factura_presentada  BOOLEAN      NOT NULL DEFAULT FALSE,
    sello_colocado      BOOLEAN      NOT NULL DEFAULT FALSE,
    fecha_retiro        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    observaciones       TEXT,
    UNIQUE (formato_id, numero_retiro)
);

-- ── ÍTEMS POR RETIRO ─────────────────────────────────────────
CREATE TABLE items_retiro (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    retiro_id          UUID    NOT NULL REFERENCES retiros(id) ON DELETE CASCADE,
    item_venta_id      UUID    NOT NULL REFERENCES items_venta(id),
    cantidad_entregada INTEGER NOT NULL CHECK (cantidad_entregada > 0)
);

-- ── INVENTARIOS SEMANALES (GVM-003) ──────────────────────────
CREATE TABLE inventarios_semanales (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tienda_id         UUID  NOT NULL REFERENCES tiendas(id),
    fecha_inventario  DATE  NOT NULL,
    vigilante_id      UUID  NOT NULL REFERENCES usuarios(id),
    novedades         TEXT,
    enviado_jdv       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE inventario_detalle (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventario_id         UUID    NOT NULL REFERENCES inventarios_semanales(id),
    venta_id              UUID    NOT NULL REFERENCES ventas_mayoristas(id),
    mercancia_rotulada    BOOLEAN NOT NULL DEFAULT FALSE,
    mercancia_separada    BOOLEAN NOT NULL DEFAULT FALSE,
    cantidades_correctas  BOOLEAN NOT NULL DEFAULT FALSE,
    observacion           TEXT
);

-- ── AUDITORÍA ────────────────────────────────────────────────
CREATE TABLE eventos_auditoria (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id         UUID REFERENCES ventas_mayoristas(id),
    usuario_id       UUID NOT NULL REFERENCES usuarios(id),
    sesion_id        UUID REFERENCES sesiones_turno(id),
    vigilante_nombre VARCHAR(100),
    vigilante_carnet VARCHAR(30),
    evento           VARCHAR(80) NOT NULL,
    detalle          JSONB,
    ip               INET,
    lat              DECIMAL(9,6),
    lng              DECIMAL(9,6),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ÍNDICES ──────────────────────────────────────────────────
CREATE INDEX idx_ventas_tienda_estado   ON ventas_mayoristas(tienda_id, estado);
CREATE INDEX idx_ventas_factura_trgm    ON ventas_mayoristas USING gin(numero_factura gin_trgm_ops);
CREATE INDEX idx_ventas_cliente         ON ventas_mayoristas(cliente_id);
CREATE INDEX idx_items_venta            ON items_venta(venta_id);
CREATE INDEX idx_retiros_venta          ON retiros(venta_id);
CREATE INDEX idx_retiros_formato        ON retiros(formato_id);
CREATE INDEX idx_retiros_vigilante      ON retiros(vigilante_id, fecha_retiro DESC);
CREATE INDEX idx_formatos_venta_activo  ON formatos_gvm001(venta_id, activo) WHERE activo = TRUE;
CREATE INDEX idx_sesiones_activa        ON sesiones_turno(vigilante_id, activa) WHERE activa = TRUE;
CREATE INDEX idx_eventos_venta          ON eventos_auditoria(venta_id, created_at DESC);
CREATE INDEX idx_clientes_nit           ON clientes_mayoristas(nit);
CREATE INDEX idx_clientes_nombre_trgm   ON clientes_mayoristas USING gin(razon_social gin_trgm_ops);

-- ── TRIGGER: validar retiros ─────────────────────────────────
CREATE OR REPLACE FUNCTION validar_limite_retiros()
RETURNS TRIGGER AS $$
DECLARE v_fmt formatos_gvm001%ROWTYPE; v_cnt INTEGER;
BEGIN
    SELECT * INTO v_fmt FROM formatos_gvm001 WHERE id = NEW.formato_id;
    IF NOW() > v_fmt.fecha_limite THEN
        RAISE EXCEPTION 'Formato GVM-001 vencido el %.', TO_CHAR(v_fmt.fecha_limite,'DD/MM/YYYY HH24:MI');
    END IF;
    SELECT COUNT(*) INTO v_cnt FROM retiros WHERE formato_id = NEW.formato_id;
    IF v_cnt >= 3 THEN
        RAISE EXCEPTION 'Formato GVM-001 #% alcanzó el límite de 3 retiros.', v_fmt.numero_formato;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_retiros
    BEFORE INSERT ON retiros
    FOR EACH ROW EXECUTE FUNCTION validar_limite_retiros();

-- ── FUNCIÓN: cerrar sesión anterior ──────────────────────────
CREATE OR REPLACE FUNCTION cerrar_sesion_anterior(p_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE sesiones_turno SET activa=FALSE, fin_turno=NOW()
    WHERE vigilante_id=p_id AND activa=TRUE;
END;
$$ LANGUAGE plpgsql;

-- ── FUNCIÓN: marcar ventas vencidas ──────────────────────────
CREATE OR REPLACE FUNCTION marcar_ventas_vencidas()
RETURNS INTEGER AS $$
DECLARE v_count INTEGER;
BEGIN
    UPDATE ventas_mayoristas v SET estado='vencida', updated_at=NOW()
    FROM formatos_gvm001 f
    WHERE f.venta_id=v.id AND f.activo=TRUE
      AND NOW() > f.fecha_limite
      AND v.estado NOT IN ('entregada','vencida');
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ── FUNCIÓN: registrar venta completa ────────────────────────
CREATE OR REPLACE FUNCTION registrar_venta_mayorista(
    p_tienda_id    UUID, p_cliente_id UUID, p_vigilante_id UUID,
    p_factura      VARCHAR, p_monto NUMERIC, p_sagrilaft BOOLEAN,
    p_jdt_nombre   VARCHAR, p_items JSONB, p_obs TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_venta_id   UUID := gen_random_uuid();
    v_formato_id UUID := gen_random_uuid();
    v_item       JSONB;
BEGIN
    IF EXISTS (SELECT 1 FROM ventas_mayoristas WHERE numero_factura=p_factura AND tienda_id=p_tienda_id) THEN
        RAISE EXCEPTION 'La factura % ya está registrada en esta tienda.', p_factura;
    END IF;
    IF jsonb_array_length(p_items)=0 THEN
        RAISE EXCEPTION 'La venta debe tener al menos un ítem.';
    END IF;
    IF p_monto >= 40000000 AND NOT p_sagrilaft THEN
        RAISE EXCEPTION 'Compras >= $40.000.000 requieren formato SAGRILAFT diligenciado.';
    END IF;
    INSERT INTO ventas_mayoristas
        (id,tienda_id,cliente_id,numero_factura,monto_total,sagrilaft_diligenciado,
         jdt_nombre,registrado_por_vigilante_id,estado,observaciones)
    VALUES
        (v_venta_id,p_tienda_id,p_cliente_id,UPPER(p_factura),p_monto,p_sagrilaft,
         p_jdt_nombre,p_vigilante_id,'facturada',p_obs);
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        INSERT INTO items_venta(venta_id,referencia,descripcion,unidad,cantidad_facturada,precio_unitario)
        VALUES(v_venta_id,v_item->>'referencia',v_item->>'descripcion',
               v_item->>'unidad',(v_item->>'cantidad')::INTEGER,
               COALESCE((v_item->>'precio')::NUMERIC,0));
    END LOOP;
    INSERT INTO formatos_gvm001(id,venta_id,numero_formato,activo)
    VALUES(v_formato_id,v_venta_id,1,TRUE);
    INSERT INTO eventos_auditoria(venta_id,usuario_id,evento,detalle)
    VALUES(v_venta_id,p_vigilante_id,'venta_registrada',
           jsonb_build_object('factura',p_factura,'monto',p_monto,'jdt',p_jdt_nombre));
    RETURN jsonb_build_object('venta_id',v_venta_id,'formato_id',v_formato_id,'numero_factura',UPPER(p_factura));
END;
$$ LANGUAGE plpgsql;

-- ── FUNCIÓN: crear formato adicional ─────────────────────────
CREATE OR REPLACE FUNCTION crear_formato_adicional(p_formato_id UUID, p_vigilante_id UUID)
RETURNS UUID AS $$
DECLARE
    v_fmt    formatos_gvm001%ROWTYPE;
    v_nuevo  UUID := gen_random_uuid();
    v_cnt    INTEGER; v_num SMALLINT;
BEGIN
    SELECT * INTO v_fmt FROM formatos_gvm001 WHERE id=p_formato_id;
    SELECT COUNT(*) INTO v_cnt FROM retiros WHERE formato_id=p_formato_id;
    IF v_cnt < 3 THEN RAISE EXCEPTION 'El formato aún tiene % retiro(s) disponible(s).', 3-v_cnt; END IF;
    SELECT COALESCE(MAX(numero_formato),0)+1 INTO v_num FROM formatos_gvm001 WHERE venta_id=v_fmt.venta_id;
    UPDATE formatos_gvm001 SET activo=FALSE, cerrado_por='nuevo_formato' WHERE id=p_formato_id;
    INSERT INTO formatos_gvm001(id,venta_id,numero_formato,formato_padre_id)
    VALUES(v_nuevo,v_fmt.venta_id,v_num,p_formato_id);
    INSERT INTO eventos_auditoria(venta_id,usuario_id,evento,detalle)
    VALUES(v_fmt.venta_id,p_vigilante_id,'formato_adicional_creado',
           jsonb_build_object('formato_anterior',p_formato_id,'formato_nuevo',v_nuevo,'numero',v_num));
    RETURN v_nuevo;
END;
$$ LANGUAGE plpgsql;

-- ── VISTA COMPLETA PARA EL VIGILANTE ─────────────────────────
CREATE OR REPLACE VIEW v_venta_vigilante AS
SELECT
    vm.id AS venta_id, vm.numero_factura, vm.estado, vm.monto_total,
    vm.requiere_sagrilaft, vm.sagrilaft_diligenciado,
    vm.fecha_venta, vm.jdt_nombre, vm.observaciones,
    t.codigo AS tienda_codigo, t.nombre AS tienda_nombre,
    c.razon_social AS cliente_nombre, c.nit AS cliente_nit,
    c.nombre_rep AS cliente_representante, c.telefono AS cliente_telefono,
    ur.nombre AS registrado_por_nombre,
    vr.numero_carnet AS registrado_por_carnet,
    vr.empresa_seguridad AS registrado_por_empresa,
    f.id AS formato_id, f.numero_formato,
    f.fecha_apertura AS formato_apertura,
    f.fecha_limite AS formato_vencimiento,
    ROUND(EXTRACT(EPOCH FROM (f.fecha_limite - NOW()))/3600,1) AS horas_restantes,
    NOW() > f.fecha_limite AS formato_vencido,
    (SELECT COUNT(*) FROM retiros r WHERE r.formato_id=f.id) AS retiros_usados,
    3-(SELECT COUNT(*) FROM retiros r WHERE r.formato_id=f.id) AS retiros_disponibles,
    (SELECT json_agg(json_build_object(
        'item_id',iv.id,'referencia',iv.referencia,'descripcion',iv.descripcion,
        'unidad',iv.unidad,'cantidad_facturada',iv.cantidad_facturada,
        'cantidad_entregada',iv.cantidad_entregada,
        'cantidad_pendiente',iv.cantidad_facturada-iv.cantidad_entregada
    ) ORDER BY iv.referencia) FROM items_venta iv WHERE iv.venta_id=vm.id) AS items,
    (SELECT json_agg(json_build_object(
        'numero_retiro',r.numero_retiro,'tipo',r.tipo,'fecha',r.fecha_retiro,
        'retira_comprador',r.retira_el_comprador,'nombre_autorizado',r.nombre_autorizado,
        'doc_autorizado',r.doc_autorizado,'carta_autorizacion',r.carta_autorizacion,
        'vigilante_nombre',r.vigilante_nombre,'vigilante_carnet',r.vigilante_carnet,
        'vigilante_empresa',r.vigilante_empresa,'sello_colocado',r.sello_colocado,
        'observaciones',r.observaciones,
        'items',(SELECT json_agg(json_build_object('referencia',iv2.referencia,
                 'cantidad',ir.cantidad_entregada,'unidad',iv2.unidad))
                 FROM items_retiro ir JOIN items_venta iv2 ON iv2.id=ir.item_venta_id
                 WHERE ir.retiro_id=r.id)
    ) ORDER BY r.numero_retiro)
    FROM retiros r WHERE r.formato_id=f.id) AS historial_retiros,
    (SELECT SUM(cantidad_facturada) FROM items_venta WHERE venta_id=vm.id) AS total_facturado,
    (SELECT SUM(cantidad_entregada) FROM items_venta WHERE venta_id=vm.id) AS total_entregado,
    (SELECT SUM(cantidad_facturada-cantidad_entregada) FROM items_venta WHERE venta_id=vm.id) AS total_pendiente
FROM ventas_mayoristas vm
JOIN tiendas t ON t.id=vm.tienda_id
JOIN clientes_mayoristas c ON c.id=vm.cliente_id
LEFT JOIN usuarios ur ON ur.id=vm.registrado_por_vigilante_id
LEFT JOIN vigilantes vr ON vr.usuario_id=vm.registrado_por_vigilante_id
LEFT JOIN formatos_gvm001 f ON f.venta_id=vm.id AND f.activo=TRUE;

-- ── DATOS DE PRUEBA ───────────────────────────────────────────
INSERT INTO tiendas(codigo,nombre,ciudad,tipo_caja_fuerte) VALUES
    ('BDC-001','Bogotá Américas','Bogotá','smart_cash'),
    ('BDC-002','Bogotá Kennedy','Bogotá','mecanica'),
    ('BDC-003','Medellín Itagüí','Medellín','smart_cash');

-- Contraseña para todos los usuarios de prueba: "bdc2024"
-- Hash bcrypt de "bdc2024"
INSERT INTO usuarios(nombre,documento,password_hash,rol,tienda_id) VALUES
    ('Juan Pérez Romero','1020456789',
     '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMlJbekRSsmqkpZo58dTMfj9.i',
     'vigilante',(SELECT id FROM tiendas WHERE codigo='BDC-001')),
    ('Gloria Ríos Castro','52345678',
     '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMlJbekRSsmqkpZo58dTMfj9.i',
     'vigilante',(SELECT id FROM tiendas WHERE codigo='BDC-002')),
    ('Mario Solano Díaz','71234567',
     '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMlJbekRSsmqkpZo58dTMfj9.i',
     'vigilante',(SELECT id FROM tiendas WHERE codigo='BDC-003'));

INSERT INTO vigilantes(usuario_id,empresa_seguridad,numero_carnet,turno) VALUES
    ((SELECT id FROM usuarios WHERE documento='1020456789'),'Prosegur S.A.','VIG-2041','diurno'),
    ((SELECT id FROM usuarios WHERE documento='52345678'),'G4S Colombia','VIG-1189','diurno'),
    ((SELECT id FROM usuarios WHERE documento='71234567'),'Prosegur S.A.','VIG-0872','nocturno');
