# Guide de Migration vers PostgreSQL (Supabase)

## Problème actuel
Sur Render (plan gratuit), le système de fichiers est éphémère. La base de données SQLite est perdue à chaque redéploiement.

## Solution : Migrer vers PostgreSQL avec Supabase

### Étape 1 : Créer un compte Supabase
1. Aller sur [https://supabase.com](https://supabase.com)
2. Cliquer sur "Start your project"
3. Créer un compte avec GitHub ou email
4. Créer un nouveau projet :
   - Nom : `goma-security`
   - Mot de passe : (garder une note)
   - Région : Choisir la plus proche (Europe ou US)

### Étape 2 : Obtenir les informations de connexion
1. Dans le dashboard Supabase, aller dans **Settings** → **Database**
2. Copier les informations suivantes :
   - **Host** : `db.xxxxxxxxxxxx.supabase.co`
   - **Database name** : `postgres`
   - **Port** : `5432`
   - **User** : `postgres`
   - **Password** : (celui que vous avez créé)

3. Construire l'URL de connexion :
   ```
   postgresql://postgres:[VOTRE_MOT_DE_PASSE]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
   ```

### Étape 3 : Modifier le code backend

#### 3.1 Installer les dépendances
```bash
npm install pg
```

#### 3.2 Modifier server.js
Remplacer la connexion SQLite par PostgreSQL :

```javascript
// =====================
// DATABASE SETUP
// =====================

const { Pool } = require('pg');

// Configuration de la connexion PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:[VOTRE_MOT_DE_PASSE]@db.xxxxxxxxxxxx.supabase.co:5432/postgres',
    ssl: {
        rejectUnauthorized: false
    }
});

// Tester la connexion
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Erreur de connexion à la base de données:', err.message);
    } else {
        console.log('Connecté à la base de données PostgreSQL');
    }
});
```

#### 3.3 Créer les tables dans PostgreSQL
Créer un fichier `database/init-postgresql.sql` avec le schéma adapté :

```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    telephone TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'citoyen',
    quartier TEXT,
    avenue TEXT,
    photo_profil TEXT,
    latitude REAL,
    longitude REAL,
    accuracy REAL,
    two_fa_enabled INTEGER DEFAULT 0,
    two_fa_secret TEXT,
    push_subscription TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Emergency types table
CREATE TABLE IF NOT EXISTS emergency_types (
    id SERIAL PRIMARY KEY,
    nom TEXT UNIQUE NOT NULL,
    icone TEXT NOT NULL,
    couleur TEXT NOT NULL,
    priorite INTEGER NOT NULL DEFAULT 3 CHECK(priorite BETWEEN 1 AND 5),
    description TEXT,
    photo TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    type_id INTEGER,
    description TEXT,
    latitude REAL,
    longitude REAL,
    accuracy REAL,
    address TEXT,
    quartier TEXT,
    avenue TEXT,
    photo TEXT,
    voice_message TEXT,
    status TEXT DEFAULT 'active',
    priority INTEGER DEFAULT 3,
    assigned_to INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (type_id) REFERENCES emergency_types(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER,
    message TEXT NOT NULL,
    is_from_admin INTEGER DEFAULT 0,
    audio_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
);

-- Insert default emergency types
INSERT INTO emergency_types (nom, icone, couleur, priorite) VALUES
('Agression', 'fa-user-graduate', '#e74c3c', 1),
('Accident', 'fa-car-crash', '#e67e22', 1),
('Incendie', 'fa-fire', '#f39c12', 1),
('Urgence Medicale', 'fa-heartbeat', '#9b59b6', 2),
('Activite Suspecte', 'fa-user-secret', '#7f8c8d', 3),
('Manifestation', 'fa-users', '#3498db', 4),
('Catastrophe Naturelle', 'fa-hurricane', '#1abc9c', 1)
ON CONFLICT (nom) DO NOTHING;

-- Create admin user
INSERT INTO users (nom, prenom, telephone, email, password_hash, role, quartier) VALUES
('Admin', 'Goma', '+243000000001', 'admin@gomasecurity.cd', '$2a$10$...', 'admin', 'Goma')
ON CONFLICT (telephone) DO NOTHING;

-- Create security center user
INSERT INTO users (nom, prenom, telephone, email, password_hash, role, quartier) VALUES
('Security', 'Center', '+243000000002', 'security@gomasecurity.cd', '$2a$10$...', 'centre_securite', 'Goma')
ON CONFLICT (telephone) DO NOTHING;
```

#### 3.4 Adapter les requêtes SQL
Remplacer les requêtes SQLite par PostgreSQL :

**Avant (SQLite) :**
```javascript
db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
    // ...
});
```

**Après (PostgreSQL) :**
```javascript
pool.query('SELECT * FROM users WHERE id = $1', [userId], (err, result) => {
    if (err) {
        return res.status(500).json({ error: 'Erreur serveur' });
    }
    const user = result.rows[0];
    // ...
});
```

### Étape 4 : Configurer les variables d'environnement sur Render

1. Aller sur votre dashboard Render
2. Sélectionner votre service
3. Aller dans **Environment**
4. Ajouter les variables suivantes :
   - `DATABASE_URL` : `postgresql://postgres:[Ephreme0977]@db.goma-secure.supabase.co:5432/postgres`
   - `JWT_SECRET` : (votre secret JWT)
   - `NODE_ENV` : `production`

### Étape 5 : Déployer

1. Commiter les changements
2. Pousser vers GitHub
3. Render va automatiquement redéployer
4. Vérifier les logs pour confirmer la connexion à PostgreSQL

## Avantages de cette solution

✅ **Persistant** : Les données ne sont pas perdues après redéploiement
✅ **Gratuit** : Supabase offre 500MB gratuit
✅ **Professionnel** : PostgreSQL est une base de données robuste
✅ **Scalable** : Peut gérer beaucoup plus de données
✅ **Sécurisé** : Connexion SSL incluse

## Ressources

- [Documentation Supabase](https://supabase.com/docs)
- [Documentation PostgreSQL](https://www.postgresql.org/docs/)
- [Documentation node-postgres](https://node-postgres.com/)
