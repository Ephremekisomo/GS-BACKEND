# Goma Security Backend

API Backend pour l'application de sécurité urbaine de Goma, RDC.

## Description

Ce backend fournit une API REST complète pour gérer les alertes d'urgence, les utilisateurs, et les notifications push pour l'application Goma Security.

## Fonctionnalités

- 🔐 Authentification JWT avec 2FA (Two-Factor Authentication)
- 🚨 Gestion des alertes d'urgence en temps réel
- 📍 Géolocalisation des incidents
- 👥 Gestion des utilisateurs et des rôles
- 📱 Notifications push (Web Push)
- 💬 Communication en temps réel via Socket.IO
- 📊 Tableau de bord administrateur
- 📁 Export de données (Excel, PDF)

## Prérequis

- Node.js >= 14.0.0
- npm ou yarn

## Installation

```bash
# Cloner le repository
git clone <URL_DU_REPO_BACKEND>

# Entrer dans le dossier
cd goma-security-backend

# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env

# Modifier le fichier .env avec vos configurations
nano .env
```

## Configuration

Créez un fichier `.env` à la racine du projet avec les variables suivantes :

```env
# Serveur
PORT=3000
NODE_ENV=production

# Base de données
DB_PATH=./goma_security.db

# JWT
JWT_SECRET=votre_secret_jwt_ici
JWT_EXPIRES_IN=7d

# 2FA
TWO_FA_SERVICE_NAME=Goma Security

# Web Push (clés VAPID)
VAPID_PUBLIC_KEY=votre_cle_publique_vapid
VAPID_PRIVATE_KEY=votre_cle_privee_vapid
VAPID_EMAIL=mailto:votre@email.com

# CORS
CORS_ORIGIN=*
```

## Lancement

```bash
# Mode développement
npm run dev

# Mode production
npm start
```

## API Endpoints

### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `POST /api/auth/logout` - Déconnexion
- `POST /api/auth/2fa/setup` - Configurer 2FA
- `POST /api/auth/2fa/verify` - Vérifier 2FA

### Alertes
- `GET /api/alerts` - Liste des alertes
- `POST /api/alerts` - Créer une alerte
- `GET /api/alerts/:id` - Détails d'une alerte
- `PUT /api/alerts/:id` - Mettre à jour une alerte
- `DELETE /api/alerts/:id` - Supprimer une alerte

### Utilisateurs
- `GET /api/users` - Liste des utilisateurs (admin)
- `GET /api/users/:id` - Profil utilisateur
- `PUT /api/users/:id` - Mettre à jour le profil
- `DELETE /api/users/:id` - Supprimer un utilisateur (admin)

### Administration
- `GET /api/admin/stats` - Statistiques
- `GET /api/admin/export` - Exporter les données

## Déploiement

### Avec Docker (recommandé)

```bash
# Construire l'image
docker build -t goma-security-backend .

# Lancer le conteneur
docker run -d -p 3000:3000 --env-file .env goma-security-backend
```

### Sans Docker

```bash
# Installer PM2 globalement
npm install -g pm2

# Lancer l'application
pm2 start server.js --name "goma-security-backend"

# Sauvegarder la configuration
pm2 save
pm2 startup
```

## Structure du projet

```
backend/
├── server.js          # Point d'entrée principal
├── package.json       # Dépendances
├── .env.example       # Exemple de configuration
├── .gitignore         # Fichiers ignorés par Git
├── README.md          # Documentation
├── scripts/           # Scripts utilitaires
│   └── backup.js      # Script de sauvegarde
└── uploads/           # Fichiers uploadés
```

## Technologies

- **Express.js** - Framework web
- **Socket.IO** - Communication temps réel
- **SQLite** - Base de données
- **JWT** - Authentification
- **bcryptjs** - Hachage des mots de passe
- **speakeasy** - Authentification 2FA
- **web-push** - Notifications push
- **multer** - Upload de fichiers

## Support

Pour toute question ou problème, veuillez ouvrir une issue sur le repository.

## License

MIT © Goma Security Team
