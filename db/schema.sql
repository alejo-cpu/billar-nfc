PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 30000;

CREATE TABLE IF NOT EXISTS categorias (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  color TEXT NOT NULL,
  tagline TEXT NOT NULL,
  descripcion_default TEXT NOT NULL,
  ideal_default TEXT NOT NULL,
  other_text TEXT NOT NULL,
  peso_default INTEGER DEFAULT 3,
  agilidad_default INTEGER DEFAULT 3,
  golpe_default TEXT DEFAULT 'Equilibrado',
  sensacion_texto_default TEXT DEFAULT 'Natural y estable',
  es_estandar INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tacos (
  nfc_uid TEXT PRIMARY KEY,
  numero TEXT UNIQUE NOT NULL,
  categoria_id TEXT NOT NULL,
  peso INTEGER NOT NULL DEFAULT 3,
  agilidad INTEGER NOT NULL DEFAULT 3,
  golpe TEXT DEFAULT 'Equilibrado',
  sensacion_texto TEXT DEFAULT 'Natural y estable',
  descripcion_custom TEXT,
  ideal_custom TEXT,
  actualizado_en TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);

CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'staff',
  perm_crear INTEGER DEFAULT 1,
  perm_editar INTEGER DEFAULT 1,
  perm_eliminar INTEGER DEFAULT 0,
  perm_categorias INTEGER DEFAULT 0
);

INSERT OR IGNORE INTO usuarios (username, password, rol, perm_crear, perm_editar, perm_eliminar, perm_categorias)
VALUES ('admin', 'hdp1985', 'admin', 1, 1, 1, 1);

INSERT OR IGNORE INTO categorias (id, nombre, color, tagline, descripcion_default, ideal_default, other_text, peso_default, agilidad_default, golpe_default, sensacion_texto_default, es_estandar) VALUES
  ('LIGHT', 'LIGHT', '#37d67a', 'Ligero · Ágil · Suave', 'Un taco ligero y ágil, con una sensación de golpe más suave. Fácil de mover y rápido en el toque.', 'Jugadores que buscan rapidez, control fino y un golpe suave.', 'Más ligero y ágil, con una sensación de golpe más suave. Buscá los tacos con la pegatina verde.', 2, 4, 'Suave', 'Ágil y controlada', 1),
  ('BALANCED', 'BALANCED', '#f0c928', 'Equilibrado · Estable · Versátil', 'Un taco con una sensación equilibrada entre ligereza y solidez. Fácil de controlar y cómodo para diferentes estilos de juego.', 'Jugadores que buscan un taco cómodo y versátil, sin irse a ninguno de los extremos.', 'Equilibrado y versátil, cómodo para cualquier estilo. Buscá los tacos con la pegatina amarilla.', 3, 3, 'Equilibrado', 'Natural y estable', 1),
  ('POWER', 'POWER', '#f65b5b', 'Sólido · Firme · Potente', 'Un taco sólido y firme, con mayor sensación de peso y contundencia en el golpe.', 'Jugadores que buscan potencia, firmeza y contundencia.', 'Más sólido y firme, con mayor sensación de peso y contundencia en el golpe. Buscá los tacos con la pegatina roja.', 5, 2, 'Contundente', 'Sólida y firme', 1);

INSERT OR IGNORE INTO tacos (nfc_uid, numero, categoria_id, peso, agilidad, golpe, sensacion_texto, descripcion_custom, ideal_custom) VALUES
  ('812acd7cf5aa04', '07', 'BALANCED', 3, 4, 'Equilibrado', 'Natural y estable', NULL, NULL),
  ('00000039ddab7c', '05', 'LIGHT', 2, 4, 'Suave', 'Ágil y controlada', NULL, NULL),
  ('00000039c250ec', '12', 'POWER', 5, 2, 'Contundente', 'Sólida y firme', NULL, NULL),
  ('81268da9f39704', '01', 'LIGHT', 2, 5, 'Suave', 'Ligera y rápida', NULL, NULL),
  ('81268da9f39804', '02', 'LIGHT', 2, 4, 'Suave', 'Fácil control', NULL, NULL),
  ('81268da9f39a04', '03', 'BALANCED', 3, 3, 'Equilibrado', 'Natural y estable', NULL, NULL),
  ('81268da9f3a304', '04', 'BALANCED', 4, 3, 'Equilibrado', 'Estable y firme', NULL, NULL),
  ('81268da9f3aa04', '10', 'POWER', 5, 1, 'Contundente', 'Pesada y potente', NULL, NULL);
