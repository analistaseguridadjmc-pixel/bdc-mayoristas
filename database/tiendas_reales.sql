-- Insertar tiendas BDC reales (del archivo Distribución Distritos y Zonas Junio_2026)
-- Ejecutar en Supabase SQL Editor

INSERT INTO tiendas (codigo, nombre, ciudad) VALUES
  ('BDC-703',  'BDC RIOHACHA MERCADO VIEJO',        'Riohacha'),
  ('BDC-711',  'BDC VALLEDUPAR MERCABASTOS',         'Valledupar'),
  ('BDC-718',  'BDC VALLEDUPAR MERCADO',             'Valledupar'),
  ('BDC-739',  'BDC MAICAO TRONCAL',                 'Maicao'),
  ('BDC-752',  'BDC FONSECA CALLE 13',               'Fonseca'),
  ('BDC-835',  'BDC AGUACHICA MERCADO',              'Aguachica'),
  ('BDC-874',  'BDC BOSCONIA EL CRUCE',              'Bosconia'),
  ('BDC-976',  'BDC PARAGUACHÓN TRONCAL CARIBE',     'Paraguachón'),
  ('BDC-1042', 'BDC URIBIA PATIO BONITO',            'Uribia'),
  ('BDC-1125', 'BDC RIOHACHA MERCADO NUEVO',         'Riohacha'),
  ('BDC-1269', 'BDC AGUSTÍN CODAZZI MERCADO',        'Agustín Codazzi'),
  ('BDC-1303', 'BDC MERCADO CENTRO EL BANCO',        'El Banco'),
  ('BDC-1318', 'BDC PLATO MERCADO',                  'Plato')
ON CONFLICT (codigo) DO NOTHING;

-- Desactivar las tiendas de prueba (sin borrarlas para no romper FK)
UPDATE tiendas SET activa = FALSE
WHERE codigo IN ('BDC-001', 'BDC-002', 'BDC-003');
