/**
 * Goma Security - PostgreSQL Database Configuration
 * Configuration de la base de données PostgreSQL pour la persistance des données
 */

const { Pool } = require('pg');

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

// Fonction pour initialiser la base de données
async function initializeDatabase() {
    try {
        // Créer les tables
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                nom TEXT NOT NULL,
                prenom TEXT NOT NULL,
                telephone TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'citoyen' CHECK(role IN ('citoyen', 'admin', 'pompiers','police','protection civile','ambulance', 'centre_securite')),
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
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS emergency_types (
                id SERIAL PRIMARY KEY,
                nom TEXT UNIQUE NOT NULL,
                icone TEXT NOT NULL,
                couleur TEXT NOT NULL,
                priorite INTEGER NOT NULL DEFAULT 3
            )
        `);

        await pool.query(`
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
            )
        `);

        await pool.query(`
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
            )
        `);

        // Insérer les types d'urgence par défaut
        const emergencyTypes = [
            { nom: 'Agression', icone: 'fa-user-graduate', couleur: '#e74c3c', priorite: 1 },
            { nom: 'Accident', icone: 'fa-car-crash', couleur: '#e67e22', priorite: 1 },
            { nom: 'Incendie', icone: 'fa-fire', couleur: '#f39c12', priorite: 1 },
            { nom: 'Urgence Medicale', icone: 'fa-heartbeat', couleur: '#9b59b6', priorite: 2 },
            { nom: 'Activite Suspecte', icone: 'fa-user-secret', couleur: '#7f8c8d', priorite: 3 },
            { nom: 'Manifestation', icone: 'fa-users', couleur: '#3498db', priorite: 4 },
            { nom: 'Catastrophe Naturelle', icone: 'fa-hurricane', couleur: '#1abc9c', priorite: 1 }
        ];

        for (const type of emergencyTypes) {
            await pool.query(
                'INSERT INTO emergency_types (nom, icone, couleur, priorite) VALUES ($1, $2, $3, $4) ON CONFLICT (nom) DO NOTHING',
                [type.nom, type.icone, type.couleur, type.priorite]
            );
        }

        // Créer l'utilisateur admin par défaut
        const bcrypt = require('bcryptjs');
        const adminPassword = bcrypt.hashSync('admin111', 10);
        await pool.query(
            'INSERT INTO users (nom, prenom, telephone, email, password_hash, role, quartier) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING',
            ['Admin', 'Goma', '+243000000001', 'admin@gomasecurity.cd', adminPassword, 'admin', 'Goma']
        );

        // Créer l'utilisateur centre de sécurité par défaut
        const securityCenterPassword = bcrypt.hashSync('admin222', 10);
        await pool.query(
            'INSERT INTO users (nom, prenom, telephone, email, password_hash, role, quartier) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING',
            ['Security', 'Center', '+243000000002', 'security@gomasecurity.cd', securityCenterPassword, 'centre_securite', 'Goma']
        );

        console.log('Base de données PostgreSQL initialisée avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'initialisation de la base de données:', error.message);
    }
}

module.exports = {
    pool,
    initializeDatabase
};
