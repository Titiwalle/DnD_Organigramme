# Le Registre des Compagnons

Application DnD pour centraliser les fiches de personnages du groupe.
- **Backend** : Python (Flask), stockage dans un fichier JSON.
- **Frontend** : React (JSX) + Vite, CSS séparé.

## 1. Lancer le backend

```bash
cd .\backend\
python -m venv .venv         
.venv\Scripts\activate
python -m pip install --upgrade pip          # Si la commande suivante ne marche pas faire ceci
pip install -r requirements.txt
python app.py
```

Le serveur tourne sur **http://localhost:5000**.
Les données sont stockées dans `backend/data/characters.json` (créé automatiquement).

## 2. Lancer le frontend

Dans un autre terminal :

```bash
cd frontend
npm install
npm run dev
```

L'app s'ouvre sur **http://localhost:5173**. Elle appelle l'API Flask via un proxy Vite
(`/api` → `http://localhost:5000`), donc pas besoin de configurer CORS côté navigateur.

## Comment ça fonctionne

- Chaque personne choisit un **pseudo** à la première visite (stocké dans le navigateur, pas de mot de passe).
- Les fiches (nom, rôle, classe, affectation, description générale) sont **partagées** : tout le monde
  les voit et peut les modifier.
- La section "Ce qu'en disent les joueuses" permet à **chaque pseudo** d'ajouter/modifier son propre
  témoignage sur un personnage — visibles par tout le monde, mais chacune ne modifie que le sien.

## Pour aller plus loin

- Remplacer le stockage JSON par une vraie base (SQLite est un bon premier pas, le code de
  `backend/app.py` est volontairement simple pour faciliter la bascule).
- Ajouter une vraie authentification si vous voulez un jour restreindre l'accès plutôt que
  simplement identifier qui écrit quoi.
- Déployer le frontend (`npm run build`) sur Vercel/Netlify et le backend sur un petit serveur
  (Render, Fly.io…) si vous voulez y accéder sans que chacune lance les deux serveurs en local.
