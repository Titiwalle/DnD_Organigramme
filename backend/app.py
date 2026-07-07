import os
import json
import uuid
import time
import tempfile
import zipfile
import io
from functools import wraps

from flask import Flask, jsonify, request, abort, session, send_file
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
DATA_FILE = os.path.join(DATA_DIR, "characters.json")
STATUTS_FILE = os.path.join(DATA_DIR, "statuts.json")
USERS_FILE = os.path.join(DATA_DIR, "users.json")
RELATIONS_FILE = os.path.join(DATA_DIR, "relations.json")
AFFECTATIONS_FILE = os.path.join(DATA_DIR, "affectations.json")
RELATION_TYPES_FILE = os.path.join(DATA_DIR, "relation_types.json")
CANVAS_LAYOUTS_FILE = os.path.join(DATA_DIR, "canvas_layouts.json")
MASCOT_CONFIG_FILE = os.path.join(DATA_DIR, "mascot_config.json")

MAX_MASCOT_VALUE_LENGTH = 1_800_000  # ~ image de 1.3 Mo encodée en base64, ou du texte largement suffisant
MASCOT_STATES = ("talking", "clicked", "hover")

DEFAULT_STATUTS = [
    "Professeur",
    "Étudiant",
    "Chef de guilde",
    "Membre",
    "Recrue",
    "Garde",
    "Marchand",
    "Apprenti",
    "Ancien",
    "Fondatrice",
]

DEFAULT_AFFECTATION_COLOR = "#c9a227"

DEFAULT_AFFECTATIONS = [
    {"name": "Ville", "color": "#c9a227"},
    {"name": "Académie", "color": "#4a7566"},
    {"name": "Guilde", "color": "#b25656"},
    {"name": "Patapote", "color": "#8f7fe0"},
]

MAX_AVATAR_LENGTH = 1_800_000  # ~ image de 1.3 Mo encodée en base64

DEFAULT_RELATION_TYPES = [
    {"name": "Parent", "color": "#e6c458"},
    {"name": "Enfant", "color": "#e6c458"},
    {"name": "Grand-parent", "color": "#e6c458"},
    {"name": "Petit-enfant", "color": "#e6c458"},
    {"name": "Frère/Sœur", "color": "#e6c458"},
    {"name": "Oncle/Tante", "color": "#e6c458"},
    {"name": "Neveu/Nièce", "color": "#e6c458"},
    {"name": "Cousin/Cousine", "color": "#e6c458"},
    {"name": "Allié", "color": "#62967f"},
    {"name": "Rival", "color": "#b25656"},
    {"name": "Ami", "color": "#62967f"},
    {"name": "Mentor", "color": "#62967f"},
    {"name": "Élève", "color": "#62967f"},
    {"name": "Autre", "color": "#786c56"},
]

FRONTEND_DIST = os.path.join(BASE_DIR, "..", "frontend", "dist")

app = Flask(__name__, static_folder=FRONTEND_DIST, static_url_path="")
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-a-changer-en-prod")
CORS(app, supports_credentials=True)


@app.get("/")
def serve_frontend():
    return app.send_static_file("index.html")


def write_json_atomic(path, data):
    """Écrit un fichier JSON de façon atomique (fichier temporaire + remplacement),
    pour qu'une écriture ne puisse jamais laisser un fichier à moitié écrit/corrompu,
    même si deux sauvegardes se produisent presque en même temps."""
    dir_name = os.path.dirname(path)
    fd, tmp_path = tempfile.mkstemp(dir=dir_name, suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(tmp_path, path)
    except Exception:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        raise


def ensure_storage():
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(DATA_FILE):
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump([], f)
    if not os.path.exists(STATUTS_FILE):
        with open(STATUTS_FILE, "w", encoding="utf-8") as f:
            json.dump(DEFAULT_STATUTS, f, ensure_ascii=False, indent=2)
    if not os.path.exists(USERS_FILE):
        admin = {
            "username": "Admin",
            "passwordHash": generate_password_hash("UneChouette"),
            "role": "admin",
            "createdAt": now_ms(),
        }
        with open(USERS_FILE, "w", encoding="utf-8") as f:
            json.dump([admin], f, ensure_ascii=False, indent=2)
    if not os.path.exists(RELATIONS_FILE):
        with open(RELATIONS_FILE, "w", encoding="utf-8") as f:
            json.dump([], f)
    if not os.path.exists(AFFECTATIONS_FILE):
        with open(AFFECTATIONS_FILE, "w", encoding="utf-8") as f:
            json.dump(DEFAULT_AFFECTATIONS, f, ensure_ascii=False, indent=2)
    if not os.path.exists(RELATION_TYPES_FILE):
        with open(RELATION_TYPES_FILE, "w", encoding="utf-8") as f:
            json.dump(DEFAULT_RELATION_TYPES, f, ensure_ascii=False, indent=2)
    if not os.path.exists(CANVAS_LAYOUTS_FILE):
        with open(CANVAS_LAYOUTS_FILE, "w", encoding="utf-8") as f:
            json.dump({}, f)
    if not os.path.exists(MASCOT_CONFIG_FILE):
        with open(MASCOT_CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump({}, f)


def load_data():
    ensure_storage()
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_data(data):
    write_json_atomic(DATA_FILE, data)


def load_statuts():
    ensure_storage()
    with open(STATUTS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_statuts(statuts):
    write_json_atomic(STATUTS_FILE, statuts)


def remember_statut(value):
    """Ajoute une nouvelle valeur de fonction/statut à la liste connue, si elle n'y est pas déjà (comparaison insensible à la casse)."""
    value = (value or "").strip()
    if not value:
        return
    statuts = load_statuts()
    if not any(s.lower() == value.lower() for s in statuts):
        statuts.append(value)
        save_statuts(statuts)


def load_affectations():
    ensure_storage()
    with open(AFFECTATIONS_FILE, "r", encoding="utf-8") as f:
        raw = json.load(f)
    # Compatibilité : d'anciennes installations stockent une simple liste de noms (chaînes).
    return [a if isinstance(a, dict) else {"name": a, "color": DEFAULT_AFFECTATION_COLOR} for a in raw]


def save_affectations(affectations):
    write_json_atomic(AFFECTATIONS_FILE, affectations)


def find_affectation(affectations, name):
    return next((a for a in affectations if a["name"].lower() == name.lower()), None)


def load_relation_types():
    ensure_storage()
    with open(RELATION_TYPES_FILE, "r", encoding="utf-8") as f:
        raw = json.load(f)
    # Compatibilité : d'anciennes installations stockent une simple liste de noms (chaînes).
    return [t if isinstance(t, dict) else {"name": t, "color": DEFAULT_AFFECTATION_COLOR} for t in raw]


def save_relation_types(types):
    write_json_atomic(RELATION_TYPES_FILE, _autre_last(types))


def load_canvas_layouts():
    ensure_storage()
    try:
        with open(CANVAS_LAYOUTS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, ValueError):
        # Fichier corrompu (ex: deux écritures concurrentes avant le passage à
        # l'écriture atomique) : on repart d'une base vide plutôt que de planter.
        return {}


def save_canvas_layouts(layouts):
    write_json_atomic(CANVAS_LAYOUTS_FILE, layouts)


def load_mascot_config():
    ensure_storage()
    try:
        with open(MASCOT_CONFIG_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, ValueError):
        return {}


def save_mascot_config(config):
    write_json_atomic(MASCOT_CONFIG_FILE, config)


def _autre_last(types):
    """Garde 'Autre' en dernière position de la liste, s'il y est présent."""
    others = [t for t in types if t["name"].lower() != "autre"]
    autres = [t for t in types if t["name"].lower() == "autre"]
    return others + autres


def find_relation_type(types, name):
    return next((t for t in types if t["name"].lower() == name.lower()), None)


def load_users():
    ensure_storage()
    with open(USERS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_users(users):
    write_json_atomic(USERS_FILE, users)


def find_user(users, username):
    return next((u for u in users if u["username"].lower() == username.lower()), None)


def load_relations():
    ensure_storage()
    with open(RELATIONS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_relations(relations):
    write_json_atomic(RELATIONS_FILE, relations)


def public_user(u):
    return {"username": u["username"], "role": u["role"], "createdAt": u["createdAt"]}


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if "username" not in session:
            return jsonify({"error": "Connexion requise."}), 401
        return fn(*args, **kwargs)
    return wrapper


def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        users = load_users()
        current = find_user(users, session.get("username", ""))
        if not current or current["role"] != "admin":
            return jsonify({"error": "Réservé aux comptes admin."}), 403
        return fn(*args, **kwargs)
    return wrapper


def main_admin_required(fn):
    """Réservé au compte Admin lui-même, pas aux autres comptes qui ont juste le rôle admin
    (ceux-là ont accès à l'onglet Admin, mais pas à la gestion des comptes)."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if session.get("username", "").lower() != "admin":
            return jsonify({"error": "Réservé au compte Admin."}), 403
        return fn(*args, **kwargs)
    return wrapper


def thetas_required(fn):
    """Réservé au compte Thêtas Skoupa : seul lui peut personnaliser la mascotte."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if session.get("username", "").lower() != "thêtas skoupa":
            return jsonify({"error": "Réservé au compte Thêtas Skoupa."}), 403
        return fn(*args, **kwargs)
    return wrapper


def now_ms():
    return int(time.time() * 1000)


def find_character(data, char_id):
    for c in data:
        if c["id"] == char_id:
            return c
    return None


@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.post("/api/login")
def login():
    body = request.get_json(force=True) or {}
    username = (body.get("username") or "").strip()
    password = body.get("password") or ""
    users = load_users()
    user = find_user(users, username)
    if not user or not check_password_hash(user["passwordHash"], password):
        return jsonify({"error": "Identifiants incorrects."}), 401
    session["username"] = user["username"]
    session["role"] = user["role"]
    return jsonify(public_user(user))


@app.post("/api/logout")
def logout():
    session.clear()
    return "", 204


@app.get("/api/me")
def me():
    if "username" not in session:
        return jsonify(None)
    users = load_users()
    current = find_user(users, session["username"])
    if not current:
        session.clear()
        return jsonify(None)
    session["role"] = current["role"]
    return jsonify({"username": current["username"], "role": current["role"]})


@app.get("/api/users")
@login_required
@main_admin_required
def list_users():
    users = load_users()
    return jsonify([public_user(u) for u in users])


@app.post("/api/users")
@login_required
@main_admin_required
def create_user():
    body = request.get_json(force=True) or {}
    username = (body.get("username") or "").strip()
    password = body.get("password") or ""
    role = "admin" if body.get("role") == "admin" else "member"

    if not username or len(password) < 4:
        return jsonify({"error": "Pseudo requis, mot de passe de 4 caractères minimum."}), 400

    users = load_users()
    if find_user(users, username):
        return jsonify({"error": "Ce pseudo existe déjà."}), 400

    user = {
        "username": username,
        "passwordHash": generate_password_hash(password),
        "role": role,
        "createdAt": now_ms(),
    }
    users.append(user)
    save_users(users)
    return jsonify(public_user(user)), 201


@app.put("/api/users/<username>")
@login_required
@main_admin_required
def update_user(username):
    body = request.get_json(force=True) or {}
    users = load_users()
    user = find_user(users, username)
    if not user:
        abort(404)

    new_role = body.get("role")
    if new_role in ("admin", "member") and new_role != user["role"]:
        if user["role"] == "admin" and new_role == "member":
            other_admins = [u for u in users if u["role"] == "admin" and u["username"].lower() != user["username"].lower()]
            if not other_admins:
                return jsonify({"error": "Il doit rester au moins un compte admin."}), 400
        user["role"] = new_role

    new_password = body.get("password")
    if new_password:
        if len(new_password) < 4:
            return jsonify({"error": "Mot de passe de 4 caractères minimum."}), 400
        user["passwordHash"] = generate_password_hash(new_password)

    save_users(users)
    if user["username"].lower() == session.get("username", "").lower():
        session["role"] = user["role"]
    return jsonify(public_user(user))


@app.delete("/api/users/<username>")
@login_required
@main_admin_required
def delete_user(username):
    users = load_users()
    user = find_user(users, username)
    if not user:
        abort(404)
    if user["username"].lower() == session.get("username", "").lower():
        return jsonify({"error": "Impossible de supprimer ton propre compte."}), 400
    if user["role"] == "admin":
        other_admins = [u for u in users if u["role"] == "admin" and u["username"].lower() != user["username"].lower()]
        if not other_admins:
            return jsonify({"error": "Impossible de supprimer le dernier compte admin."}), 400

    users = [u for u in users if u["username"].lower() != username.lower()]
    save_users(users)
    return "", 204


@app.get("/api/statuts")
@login_required
def list_statuts():
    statuts = load_statuts()
    return jsonify(sorted(statuts, key=lambda s: s.lower()))


@app.post("/api/statuts")
@login_required
@admin_required
def create_statut():
    body = request.get_json(force=True) or {}
    value = (body.get("value") or "").strip()
    if not value:
        return jsonify({"error": "Valeur requise."}), 400
    statuts = load_statuts()
    if any(s.lower() == value.lower() for s in statuts):
        return jsonify({"error": "Ce statut existe déjà."}), 400
    statuts.append(value)
    save_statuts(statuts)
    return jsonify(sorted(statuts, key=lambda s: s.lower())), 201


@app.delete("/api/statuts/<path:value>")
@login_required
@admin_required
def delete_statut(value):
    statuts = load_statuts()
    statuts = [s for s in statuts if s.lower() != value.lower()]
    save_statuts(statuts)
    return jsonify(sorted(statuts, key=lambda s: s.lower()))


@app.get("/api/affectations")
@login_required
def list_affectations():
    affectations = load_affectations()
    return jsonify(sorted(affectations, key=lambda a: a["name"].lower()))


@app.post("/api/affectations")
@login_required
@admin_required
def create_affectation():
    body = request.get_json(force=True) or {}
    value = (body.get("value") or "").strip()
    color = (body.get("color") or DEFAULT_AFFECTATION_COLOR).strip()
    if not value:
        return jsonify({"error": "Valeur requise."}), 400
    affectations = load_affectations()
    if find_affectation(affectations, value):
        return jsonify({"error": "Cette affectation existe déjà."}), 400
    affectations.append({"name": value, "color": color})
    save_affectations(affectations)
    return jsonify(sorted(affectations, key=lambda a: a["name"].lower())), 201


@app.put("/api/affectations/<path:value>")
@login_required
@admin_required
def update_affectation_color(value):
    body = request.get_json(force=True) or {}
    affectations = load_affectations()
    entry = find_affectation(affectations, value)
    if not entry:
        abort(404)

    new_name = (body.get("name") or "").strip()
    if new_name and new_name.lower() != entry["name"].lower():
        if find_affectation(affectations, new_name):
            return jsonify({"error": "Une affectation porte déjà ce nom."}), 400
        old_name = entry["name"]
        entry["name"] = new_name
        # Les fiches qui utilisaient l'ancien nom suivent le renommage.
        data = load_data()
        changed = False
        for c in data:
            if (c.get("affectationType") or "").lower() == old_name.lower():
                c["affectationType"] = new_name
                changed = True
        if changed:
            save_data(data)

    color = (body.get("color") or "").strip()
    if color:
        entry["color"] = color

    save_affectations(affectations)
    return jsonify(sorted(affectations, key=lambda a: a["name"].lower()))


@app.delete("/api/affectations/<path:value>")
@login_required
@admin_required
def delete_affectation(value):
    affectations = load_affectations()
    affectations = [a for a in affectations if a["name"].lower() != value.lower()]
    save_affectations(affectations)
    return jsonify(sorted(affectations, key=lambda a: a["name"].lower()))


@app.get("/api/relation-types")
@login_required
def list_relation_types():
    return jsonify(load_relation_types())


@app.post("/api/relation-types")
@login_required
@admin_required
def create_relation_type():
    body = request.get_json(force=True) or {}
    value = (body.get("value") or "").strip()
    color = (body.get("color") or DEFAULT_AFFECTATION_COLOR).strip()
    if not value:
        return jsonify({"error": "Valeur requise."}), 400
    types = load_relation_types()
    if find_relation_type(types, value):
        return jsonify({"error": "Ce type de lien existe déjà."}), 400
    types.append({"name": value, "color": color})
    save_relation_types(types)
    return jsonify(load_relation_types()), 201


@app.put("/api/relation-types/<path:value>")
@login_required
@admin_required
def update_relation_type(value):
    body = request.get_json(force=True) or {}
    types = load_relation_types()
    entry = find_relation_type(types, value)
    if not entry:
        abort(404)

    new_name = (body.get("name") or "").strip()
    if new_name and new_name.lower() != entry["name"].lower():
        if value.lower() == "autre":
            return jsonify({"error": "Impossible de renommer 'Autre'."}), 400
        if find_relation_type(types, new_name):
            return jsonify({"error": "Un type de lien porte déjà ce nom."}), 400
        entry["name"] = new_name

    color = (body.get("color") or "").strip()
    if color:
        entry["color"] = color

    save_relation_types(types)
    return jsonify(load_relation_types())


@app.delete("/api/relation-types/<path:value>")
@login_required
@admin_required
def delete_relation_type(value):
    if value.lower() == "autre":
        return jsonify({"error": "Impossible de supprimer 'Autre'."}), 400
    types = load_relation_types()
    types = [t for t in types if t["name"].lower() != value.lower()]
    save_relation_types(types)
    return jsonify(load_relation_types())


@app.get("/api/canvas-layout")
@login_required
def get_canvas_layout():
    layouts = load_canvas_layouts()
    saved = layouts.get(session["username"]) or {}
    return jsonify({
        "overrides": saved.get("overrides", {}),
        "zoom": saved.get("zoom", 1),
        "panOffset": saved.get("panOffset", {"x": 0, "y": 0}),
    })


@app.put("/api/canvas-layout")
@login_required
def save_canvas_layout():
    body = request.get_json(force=True) or {}
    overrides = body.get("overrides")
    if not isinstance(overrides, dict):
        return jsonify({"error": "Format invalide."}), 400
    layout_data = {
        "overrides": overrides,
        "zoom": body.get("zoom", 1),
        "panOffset": body.get("panOffset", {"x": 0, "y": 0}),
    }
    layouts = load_canvas_layouts()
    layouts[session["username"]] = layout_data
    save_canvas_layouts(layouts)
    return jsonify(layout_data)


@app.delete("/api/canvas-layout")
@login_required
def reset_canvas_layout():
    layouts = load_canvas_layouts()
    layouts.pop(session["username"], None)
    save_canvas_layouts(layouts)
    return "", 204


@app.get("/api/characters")
@login_required
def list_characters():
    data = load_data()
    data.sort(key=lambda c: c.get("updatedAt", 0), reverse=True)
    return jsonify(data)


@app.post("/api/characters")
@login_required
def create_character():
    body = request.get_json(force=True) or {}
    name = (body.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Le nom est obligatoire."}), 400

    avatar = body.get("avatar") or ""
    if len(avatar) > MAX_AVATAR_LENGTH:
        return jsonify({"error": "Image trop lourde, réessaie avec une image plus légère."}), 400

    author = session["username"]
    ts = now_ms()
    character = {
        "id": uuid.uuid4().hex[:12],
        "name": name,
        "role": body.get("role") or "Secondaire",
        "classe": body.get("classe") or "Autre",
        "classeCustom": body.get("classeCustom") or "",
        "avatar": avatar,
        "affectationType": body.get("affectationType") or "Ville",
        "affectationNom": body.get("affectationNom") or "",
        "affectationPlus": body.get("affectationPlus") or "",
        "descriptionGenerale": body.get("descriptionGenerale") or "",
        "descriptionAuteur": author,
        "descriptionUpdatedAt": ts,
        "temoignages": [],
        "createdAt": ts,
        "createdBy": author,
        "updatedAt": ts,
    }

    data = load_data()
    data.append(character)
    save_data(data)
    remember_statut(character["affectationPlus"])
    return jsonify(character), 201


@app.get("/api/characters/<char_id>")
@login_required
def get_character(char_id):
    data = load_data()
    character = find_character(data, char_id)
    if not character:
        abort(404)
    return jsonify(character)


@app.put("/api/characters/<char_id>")
@login_required
def update_character(char_id):
    body = request.get_json(force=True) or {}
    name = (body.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Le nom est obligatoire."}), 400

    avatar = body.get("avatar", None)
    if avatar is not None and len(avatar) > MAX_AVATAR_LENGTH:
        return jsonify({"error": "Image trop lourde, réessaie avec une image plus légère."}), 400

    data = load_data()
    character = find_character(data, char_id)
    if not character:
        abort(404)

    author = session["username"]
    ts = now_ms()
    character.update(
        {
            "name": name,
            "role": body.get("role", character["role"]),
            "classe": body.get("classe", character["classe"]),
            "classeCustom": body.get("classeCustom", character.get("classeCustom", "")),
            "avatar": avatar if avatar is not None else character.get("avatar", ""),
            "affectationType": body.get("affectationType", character["affectationType"]),
            "affectationNom": body.get("affectationNom", character.get("affectationNom", "")),
            "affectationPlus": body.get("affectationPlus", character.get("affectationPlus", "")),
            "descriptionGenerale": body.get("descriptionGenerale", character.get("descriptionGenerale", "")),
            "descriptionAuteur": author,
            "descriptionUpdatedAt": ts,
            "updatedAt": ts,
        }
    )
    save_data(data)
    remember_statut(character["affectationPlus"])
    return jsonify(character)


@app.get("/api/relations")
@login_required
def list_relations():
    return jsonify(load_relations())


@app.post("/api/relations")
@login_required
def create_relation():
    body = request.get_json(force=True) or {}
    from_kind = body.get("fromKind") or "character"
    to_kind = body.get("toKind") or "character"
    from_id = body.get("fromId")
    to_id = body.get("toId")
    rel_type = (body.get("type") or "").strip()
    type_custom = (body.get("typeCustom") or "").strip()

    if from_kind not in ("character", "affectation") or to_kind not in ("character", "affectation"):
        return jsonify({"error": "Type d'extrémité invalide."}), 400
    if not from_id or not to_id or (from_kind == to_kind and from_id == to_id):
        return jsonify({"error": "Choisis deux extrémités différentes."}), 400
    if not rel_type:
        return jsonify({"error": "Le type de lien est obligatoire."}), 400

    if from_kind == "character":
        if not find_character(load_data(), from_id):
            return jsonify({"error": "Personnage introuvable."}), 404
    else:
        if not str(from_id).strip():
            return jsonify({"error": "Affectation introuvable."}), 404

    if to_kind == "character":
        if not find_character(load_data(), to_id):
            return jsonify({"error": "Personnage introuvable."}), 404
    else:
        if not str(to_id).strip():
            return jsonify({"error": "Affectation introuvable."}), 404

    relation = {
        "id": uuid.uuid4().hex[:12],
        "fromKind": from_kind,
        "fromId": from_id,
        "toKind": to_kind,
        "toId": to_id,
        "type": rel_type,
        "typeCustom": type_custom if rel_type == "Autre" else "",
        "createdBy": session["username"],
        "createdAt": now_ms(),
    }
    relations = load_relations()
    relations.append(relation)
    save_relations(relations)
    return jsonify(relation), 201


@app.delete("/api/relations/<relation_id>")
@login_required
def delete_relation(relation_id):
    relations = load_relations()
    if not any(r["id"] == relation_id for r in relations):
        abort(404)
    relations = [r for r in relations if r["id"] != relation_id]
    save_relations(relations)
    return "", 204


@app.delete("/api/characters/<char_id>")
@login_required
def delete_character(char_id):
    data = load_data()
    character = find_character(data, char_id)
    if not character:
        abort(404)
    data = [c for c in data if c["id"] != char_id]
    save_data(data)

    relations = load_relations()
    relations = [
        r for r in relations
        if not (r.get("fromKind", "character") == "character" and r["fromId"] == char_id)
        and not (r.get("toKind", "character") == "character" and r["toId"] == char_id)
    ]
    save_relations(relations)

    return "", 204


@app.put("/api/characters/<char_id>/testimony")
@login_required
def upsert_testimony(char_id):
    body = request.get_json(force=True) or {}
    author = session["username"]
    text = (body.get("text") or "").strip()
    if not text:
        return jsonify({"error": "Texte requis."}), 400

    data = load_data()
    character = find_character(data, char_id)
    if not character:
        abort(404)

    ts = now_ms()
    temoignages = character.setdefault("temoignages", [])
    existing = next((t for t in temoignages if t["author"] == author), None)
    if existing:
        existing["text"] = text
        existing["updatedAt"] = ts
    else:
        temoignages.append({"author": author, "text": text, "updatedAt": ts})

    character["updatedAt"] = ts
    save_data(data)
    return jsonify(character)


@app.delete("/api/characters/<char_id>/testimony")
@login_required
def delete_testimony(char_id):
    author = session["username"]

    data = load_data()
    character = find_character(data, char_id)
    if not character:
        abort(404)

    character["temoignages"] = [t for t in character.get("temoignages", []) if t["author"] != author]
    character["updatedAt"] = now_ms()
    save_data(data)
    return jsonify(character)


@app.get("/api/mascot-config")
@login_required
def get_mascot_config():
    return jsonify(load_mascot_config())


@app.put("/api/mascot-config")
@login_required
@thetas_required
def update_mascot_config():
    body = request.get_json(force=True) or {}
    state = body.get("state")
    value_type = body.get("type")
    value = body.get("value") or ""
    color = (body.get("color") or "").strip()
    try:
        size = int(body.get("size") or 100)
    except (TypeError, ValueError):
        size = 100
    size = max(50, min(200, size))

    if state not in MASCOT_STATES:
        return jsonify({"error": "État invalide."}), 400
    if value_type not in ("image", "text"):
        return jsonify({"error": "Type invalide."}), 400
    if not value.strip():
        return jsonify({"error": "Valeur requise."}), 400
    if len(value) > MAX_MASCOT_VALUE_LENGTH:
        return jsonify({"error": "Image trop lourde, réessaie avec une image plus légère."}), 400

    config = load_mascot_config()
    entry = {"type": value_type, "value": value, "size": size}
    if value_type == "text" and color:
        entry["color"] = color
    config[state] = entry
    save_mascot_config(config)
    return jsonify(config)


@app.delete("/api/mascot-config/<state>")
@login_required
@thetas_required
def reset_mascot_state(state):
    if state not in MASCOT_STATES:
        return jsonify({"error": "État invalide."}), 400
    config = load_mascot_config()
    config.pop(state, None)
    save_mascot_config(config)
    return jsonify(config)


@app.get("/api/admin/export-data")
@login_required
@admin_required
def export_data():
    ensure_storage()
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for filename in os.listdir(DATA_DIR):
            filepath = os.path.join(DATA_DIR, filename)
            if os.path.isfile(filepath):
                zf.write(filepath, arcname=filename)
    buffer.seek(0)
    timestamp = time.strftime("%Y%m%d-%H%M%S")
    return send_file(
        buffer,
        mimetype="application/zip",
        as_attachment=True,
        download_name=f"registre-sauvegarde-{timestamp}.zip"
    )


if __name__ == "__main__":
    ensure_storage()
    app.run(debug=True, port=5000)
