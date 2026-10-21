#!/usr/bin/env python3
import json
import os
import random
import sqlite3
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs, unquote

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'db', 'tacos.db')
SCHEMA_PATH = os.path.join(BASE_DIR, 'db', 'schema.sql')
PORT = 8080

# Columnas nuevas del esquema (numero, sensacion, peso, agilidad, golpe, sensacion_texto)
COLS = 'numero, sensacion, peso, agilidad, golpe, sensacion_texto'


def init_db():
    conn = sqlite3.connect(DB_PATH)
    with open(SCHEMA_PATH, 'r', encoding='utf-8') as f:
        conn.executescript(f.read())
    conn.commit()
    conn.close()
    print('[DB] lista en ' + DB_PATH)


def query(sql, params=()):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(sql, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # Taco al azar (excluyendo el actual si viene ?except=...)
        if path == '/api/taco/random':
            exc = parse_qs(parsed.query).get('except', [None])[0]
            if exc:
                rows = query('SELECT ' + COLS + ' FROM tacos WHERE numero != ?', (exc,))
            else:
                rows = query('SELECT ' + COLS + ' FROM tacos')
            return self.send_json(random.choice(rows) if rows else None)

        # Taco específico por número
        if path.startswith('/api/taco/'):
            numero = unquote(path[len('/api/taco/'):])
            rows = query('SELECT ' + COLS + ' FROM tacos WHERE numero = ?', (numero,))
            return self.send_json(rows[0] if rows else None)

        return super().do_GET()

    def send_json(self, data):
        if data is None:
            body = json.dumps({'error': 'no encontrado'}, ensure_ascii=False).encode()
            status = 404
        else:
            body = json.dumps(data, ensure_ascii=False).encode()
            status = 200
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        pass


if __name__ == '__main__':
    os.chdir(BASE_DIR)
    init_db()
    print('Lector NFC sirviendo en http://localhost:' + str(PORT))
    HTTPServer(('0.0.0.0', PORT), Handler).serve_forever()