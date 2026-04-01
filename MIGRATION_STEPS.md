# Étapes de Migration vers PostgreSQL

## Étape 1 : Installer les dépendances

```bash
npm install pg
```

## Étape 2 : Modifier server.js

### 2.1 Remplacer l'import SQLite (ligne 10)

**Avant :**
```javascript
const sqlite3 = require('sqlite3').verbose();
```

**Après :**
```javascript
const { Pool } = require('pg');
```

### 2.2 Remplacer la connexion à la base de données (lignes 47-54)

**Avant :**
```javascript
const dbPath = process.env.DB_PATH || './goma_security.db';
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erreur de connexion a la base de donnees:', err.message);
    } else {
        console.log('Connecte a la base de donnees SQLite');
    }
});
```

**Après :**
```javascript
// Configuration de la connexion PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/goma_security',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Tester la connexion
pool.on('connect', () => {
    console.log('Connecté à la base de données PostgreSQL');
});

pool.on('error', (err) => {
    console.error('Erreur de connexion à PostgreSQL:', err.message);
});
```

### 2.3 Remplacer l'initialisation de la base de données (lignes 56-175)

**Avant :**
```javascript
// Initialize database tables
db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (...)`);
    
    // Emergency types table
    db.run(`CREATE TABLE IF NOT EXISTS emergency_types (...)`);
    
    // Alerts table
    db.run(`CREATE TABLE IF NOT EXISTS alerts (...)`);
    
    // Chat messages table
    db.run(`CREATE TABLE IF NOT EXISTS chat_messages (...)`);
    
    // Insert default emergency types
    const stmt = db.prepare('INSERT OR IGNORE INTO emergency_types ...');
    emergencyTypes.forEach(type => {
        stmt.run(type.nom, type.icone, type.couleur, type.priorite);
    });
    stmt.finalize();
    
    // Create admin user
    const adminPassword = bcrypt.hashSync('admin111', 10);
    db.run(`INSERT OR IGNORE INTO users ...`);
    
    // Create security center user
    const securityCenterPassword = bcrypt.hashSync('admin222', 10);
    db.run(`INSERT OR IGNORE INTO users ...`);
});
```

**Après :**
```javascript
c
```

### 2.4 Remplacer toutes les requêtes SQL

**Pattern général :**

**Avant (SQLite) :**
```javascript
db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
        return res.status(500).json({ error: 'Erreur serveur' });
    }
    // utiliser user
});
```

**Après (PostgreSQL) :**
```javascript
pool.query('SELECT * FROM users WHERE id = $1', [userId], (err, result) => {
    if (err) {
        return res.status(500).json({ error: 'Erreur serveur' });
    }
    const user = result.rows[0];
    // utiliser user
});
```

**Exemples de requêtes à modifier :**

1. **SELECT avec db.get :**
```javascript
// Avant
db.get('SELECT * FROM users WHERE telephone = ?', [telephone], (err, user) => {});

// Après
pool.query('SELECT * FROM users WHERE telephone = $1', [telephone], (err, result) => {
    const user = result.rows[0];
});
```

2. **SELECT avec db.all :**
```javascript
// Avant
db.all('SELECT * FROM alerts WHERE user_id = ?', [userId], (err, rows) => {});

// Après
pool.query('SELECT * FROM alerts WHERE user_id = $1', [userId], (err, result) => {
    const rows = result.rows;
});
```

3. **INSERT avec db.run :**
```javascript
// Avant
db.run('INSERT INTO users (nom, prenom, telephone) VALUES (?, ?, ?)', [nom, prenom, telephone], function(err) {
    const userId = this.lastID;
});

// Après
pool.query('INSERT INTO users (nom, prenom, telephone) VALUES ($1, $2, $3) RETURNING id', [nom, prenom, telephone], (err, result) => {
    const userId = result.rows[0].id;
});
```

4. **UPDATE avec db.run :**
```javascript
// Avant
db.run('UPDATE users SET nom = ? WHERE id = ?', [nom, userId], function(err) {
    const changes = this.changes;
});

// Après
pool.query('UPDATE users SET nom = $1 WHERE id = $2', [nom, userId], (err, result) => {
    const changes = result.rowCount;
});
```

5. **DELETE avec db.run :**
```javascript
// Avant
db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
    const changes = this.changes;
});

// Après
pool.query('DELETE FROM users WHERE id = $1', [userId], (err, result) => {
    const changes = result.rowCount;
});
```

## Étape 3 : Configurer les variables d'environnement

### 3.1 Créer un fichier .env.local
```bash
DATABASE_URL=postgresql://postgres:[VOTRE_MOT_DE_PASSE]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
JWT_SECRET=votre_secret_jwt_ici
NODE_ENV=development
```

### 3.2 Configurer sur Render
1. Aller sur votre dashboard Render
2. Sélectionner votre service
3. Aller dans **Environment**
4. Ajouter les variables suivantes :
   - `DATABASE_URL` : `postgresql://postgres:[VOTRE_MOT_DE_PASSE]@db.xxxxxxxxxxxx.supabase.co:5432/postgres`
   - `JWT_SECRET` : (votre secret JWT)
   - `NODE_ENV` : `production`

## Étape 4 : Tester localement

```bash
npm start
```

Vérifier les logs pour confirmer la connexion à PostgreSQL.

## Étape 5 : Déployer sur Render

1. Commiter les changements
2. Pousser vers GitHub
3. Render va automatiquement redéployer
4. Vérifier les logs pour confirmer la connexion à PostgreSQL

## Résumé des changements

- ✅ Remplacer `sqlite3` par `pg`
- ✅ Remplacer `db` par `pool`
- ✅ Remplacer `db.get()` par `pool.query()`
- ✅ Remplacer `db.all()` par `pool.query()`
- ✅ Remplacer `db.run()` par `pool.query()`
- ✅ Remplacer `?` par `$1, $2, $3, ...`
- ✅ Remplacer `this.lastID` par `result.rows[0].id`
- ✅ Remplacer `this.changes` par `result.rowCount`
- ✅ Remplacer `db.serialize()` par `async function initializeDatabase()`
- ✅ Remplacer `INTEGER PRIMARY KEY AUTOINCREMENT` par `SERIAL PRIMARY KEY`
- ✅ Remplacer `DATETIME` par `TIMESTAMP`
- ✅ Remplacer `INSERT OR IGNORE` par `INSERT ... ON CONFLICT DO NOTHING`
