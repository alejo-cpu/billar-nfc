#!/usr/bin/env python3
import os
import sys
import re
import sqlite3
from typing import Optional
from fastapi import FastAPI, HTTPException, Header, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse
from pydantic import BaseModel, field_validator

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

DB_PATH = os.path.join(BASE_DIR, 'db', 'tacos.db')
SCHEMA_PATH = os.path.join(BASE_DIR, 'db', 'schema.sql')

ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'hdp1985')
SYNC_TOKEN = os.environ.get('SYNC_TOKEN', 'hdp-sync-secret-1985')
STANDARD_CATS = {'LIGHT', 'BALANCED', 'POWER'}

app = FastAPI(title="HDP Billar NFC API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Conexión SQLite
def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=30.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA busy_timeout = 30000;")
    return conn

def init_db():
    os.makedirs(os.path.join(BASE_DIR, 'db'), exist_ok=True)
    conn = get_db()
    try:
        with open(SCHEMA_PATH, 'r', encoding='utf-8') as f:
            conn.executescript(f.read())
        conn.commit()
    finally:
        conn.close()

init_db()

def get_next_available_number(conn):
    rows = conn.execute("SELECT numero FROM tacos").fetchall()
    existing = set()
    for r in rows:
        try:
            existing.add(int(r["numero"]))
        except (ValueError, TypeError):
            pass
    n = 1
    while n in existing:
        n += 1
    return f"{n:02d}"

# Modelos
class LoginRequest(BaseModel):
    password: str

class CategoriaModel(BaseModel):
    id: str
    nombre: str
    color: str
    tagline: str
    descripcion_default: str
    ideal_default: str
    other_text: Optional[str] = None
    peso_default: Optional[int] = 3
    agilidad_default: Optional[int] = 3
    golpe_default: Optional[str] = "Equilibrado"
    sensacion_texto_default: Optional[str] = "Natural y estable"
    es_estandar: Optional[int] = 0

    @field_validator('id', 'nombre')
    @classmethod
    def to_upper_clean(cls, v: str):
        cleaned = v.strip().upper()
        if not cleaned:
            raise ValueError('Campo obligatorio vacío.')
        return cleaned

class TacoModel(BaseModel):
    nfc_uid: str
    numero: Optional[str] = None
    categoria_id: str
    peso: int
    agilidad: int
    golpe: Optional[str] = "Equilibrado"
    sensacion_texto: Optional[str] = "Natural y estable"
    descripcion_custom: Optional[str] = None
    ideal_custom: Optional[str] = None

    @field_validator('nfc_uid')
    @classmethod
    def validate_uid(cls, v: str):
        cleaned = v.strip().lower()
        if not re.match(r'^[0-9a-f]{4,32}$', cleaned):
            raise ValueError('UID debe ser hexadecimal (4 a 32 caracteres).')
        return cleaned

    @field_validator('numero')
    @classmethod
    def validate_numero(cls, v: Optional[str]):
        if v is not None and v.strip() != "":
            cleaned = v.strip()
            if not re.match(r'^[0-9]{1,4}$', cleaned):
                raise ValueError('El número debe contener solo dígitos.')
            return cleaned
        return None

# Autenticación
def verify_admin(x_admin_password: Optional[str] = Header(None)):
    if not x_admin_password or x_admin_password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="No autorizado")
    return True

@app.post("/api/auth/login")
def login(req: LoginRequest):
    conn = get_db()
    try:
        user = conn.execute("SELECT * FROM usuarios WHERE password = ?", (req.password,)).fetchone()
        if user or req.password == ADMIN_PASSWORD:
            perms = {
                "crear": bool(user["perm_crear"]) if user else True,
                "editar": bool(user["perm_editar"]) if user else True,
                "eliminar": bool(user["perm_eliminar"]) if user else True,
                "categorias": bool(user["perm_categorias"]) if user else True,
                "rol": user["rol"] if user else "admin"
            }
            return {"status": "ok", "token": req.password, "permisos": perms}
        raise HTTPException(status_code=401, detail="Contraseña incorrecta")
    finally:
        conn.close()

# Sincronización con token privado
@app.get("/api/sync")
def sync_data(request: Request, x_sync_token: Optional[str] = Header(None), token: Optional[str] = None):
    is_local = request.client and request.client.host in ("127.0.0.1", "localhost")
    client_token = x_sync_token or token

    if not is_local and SYNC_TOKEN:
        if client_token != SYNC_TOKEN and client_token != ADMIN_PASSWORD:
            raise HTTPException(status_code=401, detail="No autorizado")

    conn = get_db()
    try:
        cats = conn.execute("SELECT * FROM categorias").fetchall()
        cues = conn.execute("""
            SELECT t.*, c.nombre as cat_nombre, c.color as cat_color, c.tagline as cat_tagline,
                   c.descripcion_default, c.ideal_default, c.other_text, c.es_estandar
            FROM tacos t
            JOIN categorias c ON t.categoria_id = c.id
        """).fetchall()
        return {
            "categorias": [dict(c) for c in cats],
            "tacos": [dict(t) for t in cues],
            "version": os.path.getmtime(DB_PATH) if os.path.exists(DB_PATH) else 1
        }
    finally:
        conn.close()

@app.get("/api/tacos")
def list_tacos():
    conn = get_db()
    try:
        cues = conn.execute("""
            SELECT t.*, c.nombre as cat_nombre, c.color as cat_color, c.es_estandar, c.ideal_default
            FROM tacos t
            JOIN categorias c ON t.categoria_id = c.id
            ORDER BY CAST(t.numero AS INTEGER) ASC, t.numero ASC
        """).fetchall()
        return [dict(t) for t in cues]
    finally:
        conn.close()

@app.get("/api/tacos/next-number")
def get_next_number():
    conn = get_db()
    try:
        return {"next_number": get_next_available_number(conn)}
    finally:
        conn.close()

@app.get("/api/taco/{uid_or_numero}")
def get_taco(uid_or_numero: str):
    conn = get_db()
    try:
        cue = conn.execute("""
            SELECT t.*, c.nombre as cat_nombre, c.color as cat_color, c.tagline as cat_tagline,
                   c.descripcion_default, c.ideal_default, c.other_text, c.es_estandar
            FROM tacos t
            JOIN categorias c ON t.categoria_id = c.id
            WHERE LOWER(t.nfc_uid) = LOWER(?) OR LOWER(t.numero) = LOWER(?)
        """, (uid_or_numero, uid_or_numero)).fetchone()
        if not cue:
            raise HTTPException(status_code=404, detail="Taco no encontrado")
        
        item = dict(cue)
        item["sensacion"] = item["cat_nombre"]
        item["color"] = item["cat_color"]
        item["descripcion"] = item["descripcion_custom"] if item["descripcion_custom"] else item["descripcion_default"]
        item["ideal"] = item["ideal_custom"] if item["ideal_custom"] else item["ideal_default"]
        item["tag"] = item["cat_tagline"]
        return item
    finally:
        conn.close()

@app.post("/api/tacos")
def create_taco(taco: TacoModel, authorized: bool = Depends(verify_admin)):
    conn = get_db()
    try:
        with conn:
            numero = taco.numero if taco.numero else get_next_available_number(conn)
            conn.execute("""
                INSERT INTO tacos (nfc_uid, numero, categoria_id, peso, agilidad, golpe, sensacion_texto, descripcion_custom, ideal_custom)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                taco.nfc_uid,
                numero,
                taco.categoria_id,
                taco.peso,
                taco.agilidad,
                taco.golpe,
                taco.sensacion_texto,
                taco.descripcion_custom,
                taco.ideal_custom
            ))
        return {"status": "ok", "numero": numero}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="UID NFC o Número ya registrado.")
    finally:
        conn.close()

@app.put("/api/tacos/{nfc_uid}")
def update_taco(nfc_uid: str, taco: TacoModel, authorized: bool = Depends(verify_admin)):
    conn = get_db()
    try:
        with conn:
            numero = taco.numero if taco.numero else get_next_available_number(conn)
            conn.execute("""
                UPDATE tacos
                SET numero = ?, categoria_id = ?, peso = ?, agilidad = ?, golpe = ?, sensacion_texto = ?, descripcion_custom = ?, ideal_custom = ?, actualizado_en = CURRENT_TIMESTAMP
                WHERE LOWER(nfc_uid) = LOWER(?)
            """, (
                numero,
                taco.categoria_id,
                taco.peso,
                taco.agilidad,
                taco.golpe,
                taco.sensacion_texto,
                taco.descripcion_custom,
                taco.ideal_custom,
                nfc_uid.lower().strip()
            ))
        return {"status": "ok"}
    finally:
        conn.close()

@app.delete("/api/tacos/{nfc_uid}")
def delete_taco(nfc_uid: str, authorized: bool = Depends(verify_admin)):
    conn = get_db()
    try:
        with conn:
            conn.execute("DELETE FROM tacos WHERE LOWER(nfc_uid) = LOWER(?)", (nfc_uid.lower().strip(),))
        return {"status": "ok"}
    finally:
        conn.close()

@app.get("/api/categorias")
def list_categorias():
    conn = get_db()
    try:
        cats = conn.execute("SELECT * FROM categorias ORDER BY es_estandar DESC, nombre ASC").fetchall()
        return [dict(c) for c in cats]
    finally:
        conn.close()

@app.post("/api/categorias")
def create_or_update_categoria(cat: CategoriaModel, authorized: bool = Depends(verify_admin)):
    if cat.id in STANDARD_CATS:
        raise HTTPException(status_code=400, detail="Categorías estándar fijas.")
    
    conn = get_db()
    try:
        with conn:
            conn.execute("""
                INSERT OR REPLACE INTO categorias (id, nombre, color, tagline, descripcion_default, ideal_default, other_text, peso_default, agilidad_default, golpe_default, sensacion_texto_default, es_estandar)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
            """, (
                cat.id,
                cat.nombre,
                cat.color.strip(),
                cat.tagline.strip(),
                cat.descripcion_default.strip(),
                cat.ideal_default.strip(),
                cat.other_text.strip() if cat.other_text else cat.descripcion_default.strip(),
                cat.peso_default or 3,
                cat.agilidad_default or 3,
                cat.golpe_default or "Equilibrado",
                cat.sensacion_texto_default or "Natural y estable"
            ))
        return {"status": "ok"}
    finally:
        conn.close()

@app.delete("/api/categorias/{cat_id}")
def delete_categoria(cat_id: str, authorized: bool = Depends(verify_admin)):
    if cat_id in STANDARD_CATS:
        raise HTTPException(status_code=400, detail="No se pueden borrar estándar.")
        
    conn = get_db()
    try:
        with conn:
            usage = conn.execute("SELECT COUNT(*) FROM tacos WHERE categoria_id = ?", (cat_id,)).fetchone()[0]
            if usage > 0:
                raise HTTPException(status_code=400, detail="Categoría en uso.")
            conn.execute("DELETE FROM categorias WHERE id = ? AND es_estandar = 0", (cat_id,))
        return {"status": "ok"}
    finally:
        conn.close()

# Vistas
@app.get("/admin")
def serve_admin():
    return FileResponse(os.path.join(BASE_DIR, 'admin.html'))

@app.get("/")
def serve_index():
    if os.environ.get("RAILWAY_ENVIRONMENT") or os.environ.get("IS_REMOTE"):
        return RedirectResponse(url="/admin")
    return FileResponse(os.path.join(BASE_DIR, 'index.html'))

for static_dir in ['css', 'js', 'img', 'fonts', 'vendor']:
    full_path = os.path.join(BASE_DIR, static_dir)
    if os.path.exists(full_path):
        app.mount(f"/{static_dir}", StaticFiles(directory=full_path), name=static_dir)

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
