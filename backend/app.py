import os
import json
import uuid
import time
from functools import wraps

from flask import Flask, jsonify, request, abort, session
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

DEFAULT_AFFECTATIONS = ["Ville", "Académie", "Guilde", "Patapote"]

MAX_AVATAR_LENGTH = 1_800_000  # ~ image de 1.3 Mo encodée en base64

DEFAULT_RELATION_TYPES = [
    "Parent",
    "Enfant",
    "Grand-parent",
    "Petit-enfant",
    "Frère/Sœur",
    "Oncle/Tante",
    "Neveu/Nièce",
    "Cousin/Cousine",
    "Allié",
    "Rival",
    "Ami",
    "Mentor",
    "Élève",
    "Autre",
]

FRONTEND_DIST = os.path.join(BASE_DIR, "..", "frontend", "dist")

app = Flask(__name__, static_folder=FRONTEND_DIST, static_url_path="")
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-a-changer-en-prod")
CORS(app, supports_credentials=True)


@app.get("/")
def serve_frontend():
    return app.send_static_file("index.html")


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


def load_data():
    ensure_storage()
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_statuts():
    ensure_storage()
    with open(STATUTS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_statuts(statuts):
    with open(STATUTS_FILE, "w", encoding="utf-8") as f:
        json.dump(statuts, f, ensure_ascii=False, indent=2)


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
        return json.load(f)


def save_affectations(affectations):
    with open(AFFECTATIONS_FILE, "w", encoding="utf-8") as f:
        json.dump(affectations, f, ensure_ascii=False, indent=2)


def remember_affectation(value):
    """Ajoute une nouvelle affectation à la liste connue, si elle n'y est pas déjà (comparaison insensible à la casse)."""
    value = (value or "").strip()
    if not value:
        return
    affectations = load_affectations()
    if not any(a.lower() == value.lower() for a in affectations):
        affectations.append(value)
        save_affectations(affectations)


def load_relation_types():
    ensure_storage()
    with open(RELATION_TYPES_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_relation_types(types):
    with open(RELATION_TYPES_FILE, "w", encoding="utf-8") as f:
        json.dump(_autre_last(types), f, ensure_ascii=False, indent=2)


def _autre_last(types):
    """Garde 'Autre' en dernière position de la liste, s'il y est présent."""
    others = [t for t in types if t.lower() != "autre"]
    autres = [t for t in types if t.lower() == "autre"]
    return others + autres


def load_users():
    ensure_storage()
    with open(USERS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_users(users):
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, ensure_ascii=False, indent=2)


def find_user(users, username):
    return next((u for u in users if u["username"].lower() == username.lower()), None)


def load_relations():
    ensure_storage()
    with open(RELATIONS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_relations(relations):
    with open(RELATIONS_FILE, "w", encoding="utf-8") as f:
        json.dump(relations, f, ensure_ascii=False, indent=2)


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
        if session.get("role") != "admin":
            return jsonify({"error": "Réservé aux comptes admin."}), 403
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
    return jsonify({"username": session["username"], "role": session["role"]})


@app.get("/api/users")
@login_required
@admin_required
def list_users():
    users = load_users()
    return jsonify([public_user(u) for u in users])


@app.post("/api/users")
@login_required
@admin_required
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
@admin_required
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
@admin_required
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
    return jsonify(sorted(affectations, key=lambda a: a.lower()))


@app.post("/api/affectations")
@login_required
@admin_required
def create_affectation():
    body = request.get_json(force=True) or {}
    value = (body.get("value") or "").strip()
    if not value:
        return jsonify({"error": "Valeur requise."}), 400
    affectations = load_affectations()
    if any(a.lower() == value.lower() for a in affectations):
        return jsonify({"error": "Cette affectation existe déjà."}), 400
    affectations.append(value)
    save_affectations(affectations)
    return jsonify(sorted(affectations, key=lambda a: a.lower())), 201


@app.delete("/api/affectations/<path:value>")
@login_required
@admin_required
def delete_affectation(value):
    affectations = load_affectations()
    affectations = [a for a in affectations if a.lower() != value.lower()]
    save_affectations(affectations)
    return jsonify(sorted(affectations, key=lambda a: a.lower()))


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
    if not value:
        return jsonify({"error": "Valeur requise."}), 400
    types = load_relation_types()
    if any(t.lower() == value.lower() for t in types):
        return jsonify({"error": "Ce type de lien existe déjà."}), 400
    types.append(value)
    save_relation_types(types)
    return jsonify(load_relation_types()), 201


@app.delete("/api/relation-types/<path:value>")
@login_required
@admin_required
def delete_relation_type(value):
    if value.lower() == "autre":
        return jsonify({"error": "Impossible de supprimer 'Autre'."}), 400
    types = load_relation_types()
    types = [t for t in types if t.lower() != value.lower()]
    save_relation_types(types)
    return jsonify(load_relation_types())


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


if __name__ == "__main__":
    ensure_storage()
    app.run(debug=True, port=5000)
