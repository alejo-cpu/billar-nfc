CREATE TABLE IF NOT EXISTS tacos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero TEXT UNIQUE NOT NULL,
  sensacion TEXT NOT NULL,
  peso INTEGER NOT NULL,
  agilidad INTEGER NOT NULL,
  golpe TEXT,
  sensacion_texto TEXT,
  creado_en TEXT DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO tacos (numero, sensacion, peso, agilidad, golpe, sensacion_texto) VALUES
  ('07', 'BALANCED', 3, 4, 'Equilibrado', 'Natural y estable'),
  ('03', 'LIGHT', 2, 5, 'Suave', 'Ligera y rápida'),
  ('05', 'LIGHT', 2, 4, 'Suave', 'Ágil y controlada'),
  ('09', 'BALANCED', 4, 3, 'Equilibrado', 'Estable y predecible'),
  ('12', 'POWER', 5, 2, 'Contundente', 'Sólida y firme'),
  ('15', 'POWER', 4, 2, 'Contundente', 'Pesada y potente');
