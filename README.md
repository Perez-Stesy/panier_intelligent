# 🛒 PurchaseFlow — Application de Gestion des Achats

Une application **responsive**, animée et moderne pour gérer vos achats, consulter votre historique et analyser vos dépenses.

---

## 📁 Structure du projet

```
purchase_app/
├── frontend/                   ← Interface utilisateur (HTML/CSS/JS)
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── backend/                    ← Serveur Django + API REST
│   ├── purchase_project/       ← Configuration Django
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   └── __init__.py
│   ├── purchases_app/          ← Application Django principale
│   │   ├── models.py           ← Produit & Achat
│   │   ├── serializers.py      ← DRF serializers avec validation
│   │   ├── views.py            ← ViewSets + top_produit / bilan
│   │   ├── urls.py             ← Routage API
│   │   ├── admin.py
│   │   ├── apps.py
│   │   └── migrations/
│   │       └── 0001_initial.py
│   └── requirements.txt
└── README.md
```

---

## ⚡ Installation rapide

### 1. PostgreSQL

Assurez-vous que PostgreSQL est installé et lancé. Créez une base :

```bash
sudo -u postgres psql
CREATE DATABASE purchaseflow;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE purchaseflow TO postgres;
\q
```

> 💡 Vous pouvez configurer ces valeurs via des variables d'environnement :
> `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`

### 2. Backend Django

```bash
cd backend

# Environnement virtuel (recommandé)
python -m venv venv
source venv/bin/activate        # Linux/Mac
# venv\Scripts\activate         # Windows

# Installer les dépendances
pip install -r requirements.txt

# Appliquer les migrations
python manage.py migrate

# Démarrer le serveur
python manage.py runserver
```

Le serveur sera disponible à : **http://127.0.0.1:8000**

### 3. Frontend

Le frontend est automatiquement servi par Django en mode développement.
Ouvrez votre navigateur sur **http://127.0.0.1:8000** — c'est tout !

> 💡 **Mode standalone** : vous pouvez aussi ouvrir `frontend/index.html`
> directement dans le navigateur. L'app détectera l'absence de backend
> et activera automatiquement un **mode démonstration** avec stockage local.

---

## 🌐 API REST — Documentation

| Méthode | Endpoint                          | Description                         |
|---------|-----------------------------------|-------------------------------------|
| GET     | `/api/produits/`                  | Liste tous les produits             |
| POST    | `/api/produits/`                  | Créer un produit                    |
| GET     | `/api/achats/`                    | Liste tous les achats (récents en premier) |
| POST    | `/api/achats/`                    | Créer un achat (auto-crée le produit) |
| DELETE  | `/api/achats/{id}/`               | Supprimer un achat                  |
| GET     | `/api/achats/top_produit/?start=YYYY-MM-DD&end=YYYY-MM-DD` | Top produit sur période |
| GET     | `/api/achats/bilan/?start=YYYY-MM-DD&end=YYYY-MM-DD`       | Bilan financier sur période |

### Exemple — Créer un achat

```json
POST /api/achats/
{
  "nom_produit": "Riz basmati",
  "prix": "2500.00",
  "date_achat": "2025-01-15"
}
```

### Exemple — Top produit

```
GET /api/achats/top_produit/?start=2025-01-01&end=2025-01-31

{
  "egalite": false,
  "produit": "Riz basmati",
  "nombre": 5,
  "ranking": [
    {"produit": "Riz basmati", "nombre": 5},
    {"produit": "Lait", "nombre": 3}
  ]
}
```

---

## 🎨 Fonctionnalités de l'interface

| Section | Ce qu'elle fait |
|---------|-----------------|
| **Tableau de bord** | KPIs animés (total, nombre, moyenne) + formulaire d'ajout avec auto-complétion + derniers achats |
| **Historique** | Table complète avec recherche, tri multi-critères et suppression avec confirmation |
| **Analyse → Top Produit** | Sélection de période, détection d'égalité, classement top 5 animé |
| **Analyse → Bilan** | Calculs dynamiques (total, moyenne, min, max) avec barre de progression |
| **Analyse → Graphique** | Donut chart vanilla Canvas — répartition des dépenses par produit |

---

## 📐 Modèle de données

```
PRODUIT                    ACHAT
┌──────────────┐          ┌──────────────────┐
│ id (PK)      │  (0,n)   │ id (PK)          │
│ nom_produit  │◄─────────│ produit (FK)     │
└──────────────┘  (1,1)   │ prix             │
                          │ date_achat       │
                          └──────────────────┘
```

> ⚠️ Le **top produit** et le **bilan financier** ne sont pas stockés :
> ils sont calculés dynamiquement à chaque requête.

---

## 📱 Responsive

L'application s'adapte automatiquement à :
- **Desktop** (> 900px) : layout multi-colonnes
- **Tablet** (720–900px) : grille adaptée
- **Mobile** (< 720px) : navigation hamburger, layout colonne unique

---

## 🛠 Technologies

| Couche | Technologie |
|--------|-------------|
| Frontend | HTML5, CSS3 (animations, grid, flexbox), JavaScript vanilla |
| Backend | Django 4.2+, Django REST Framework |
| Base de données | PostgreSQL |
| CORS | django-cors-headers |
