/**
 * Goma Security - Initialisation Supabase PostgreSQL
 * Script optimisé pour Supabase
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Couleurs pour la console
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function initializeDatabase() {
    log('\n' + '='.repeat(50), 'cyan');
    log('🚀 GOMA SECURITY - INITIALISATION SUPABASE', 'cyan');
    log('='.repeat(50), 'cyan');
    
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    let client;
    
    try {
        log('\n📦 Connexion à Supabase PostgreSQL...', 'cyan');
        client = await pool.connect();
        log('✅ Connecté à Supabase', 'green');
        
        // =============================================
        // TABLE: users
        // =============================================
        log('\n📄 Création de la table users...', 'cyan');
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                nom TEXT NOT NULL,
                prenom TEXT NOT NULL,
                telephone TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'citoyen' CHECK(role IN ('citoyen', 'agent', 'admin', 'super_admin', 'centre_securite')),
                quartier TEXT,
                avenue TEXT,
                photo_profil TEXT,
                latitude REAL,
                longitude REAL,
                accuracy REAL,
                two_fa_enabled INTEGER DEFAULT 0,
                two_fa_secret TEXT,
                push_subscription TEXT,
                is_active INTEGER DEFAULT 1,
                last_login TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        log('✅ Table users créée', 'green');
        
        // =============================================
        // TABLE: emergency_types
        // =============================================
        log('\n📄 Création de la table emergency_types...', 'cyan');
        await client.query(`
            CREATE TABLE IF NOT EXISTS emergency_types (
                id SERIAL PRIMARY KEY,
                nom TEXT UNIQUE NOT NULL,
                icone TEXT NOT NULL,
                couleur TEXT NOT NULL,
                priorite INTEGER NOT NULL DEFAULT 3 CHECK(priorite BETWEEN 1 AND 5),
                description TEXT,
                is_active INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        log('✅ Table emergency_types créée', 'green');
        
        // =============================================
        // TABLE: alerts
        // =============================================
        log('\n📄 Création de la table alerts...', 'cyan');
        await client.query(`
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
                status TEXT DEFAULT 'active' CHECK(status IN ('active', 'in_progress', 'resolved', 'cancelled', 'false_alarm')),
                priority INTEGER DEFAULT 3 CHECK(priority BETWEEN 1 AND 5),
                assigned_to INTEGER,
                resolved_at TIMESTAMP,
                resolution_notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (type_id) REFERENCES emergency_types(id) ON DELETE SET NULL,
                FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        log('✅ Table alerts créée', 'green');
        
        // =============================================
        // TABLE: chat_messages
        // =============================================
        log('\n📄 Création de la table chat_messages...', 'cyan');
        await client.query(`
            CREATE TABLE IF NOT EXISTS chat_messages (
                id SERIAL PRIMARY KEY,
                sender_id INTEGER NOT NULL,
                receiver_id INTEGER,
                message TEXT NOT NULL,
                is_from_admin INTEGER DEFAULT 0,
                audio_path TEXT,
                is_read INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        log('✅ Table chat_messages créée', 'green');
        
        // =============================================
        // TABLE: notifications
        // =============================================
        log('\n📄 Création de la table notifications...', 'cyan');
        await client.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                body TEXT NOT NULL,
                type TEXT DEFAULT 'info' CHECK(type IN ('info', 'alert', 'warning', 'success')),
                reference_id INTEGER,
                reference_type TEXT,
                is_read INTEGER DEFAULT 0,
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        log('✅ Table notifications créée', 'green');
        
        // =============================================
        // TABLE: zones
        // =============================================
        log('\n📄 Création de la table zones...', 'cyan');
        await client.query(`
            CREATE TABLE IF NOT EXISTS zones (
                id SERIAL PRIMARY KEY,
                nom TEXT UNIQUE NOT NULL,
                description TEXT,
                latitude REAL,
                longitude REAL,
                rayon REAL DEFAULT 1000,
                is_active INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        log('✅ Table zones créée', 'green');
        
        // =============================================
        // TABLE: alert_zones
        // =============================================
        log('\n📄 Création de la table alert_zones...', 'cyan');
        await client.query(`
            CREATE TABLE IF NOT EXISTS alert_zones (
                id SERIAL PRIMARY KEY,
                alert_id INTEGER NOT NULL,
                zone_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE,
                FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE,
                UNIQUE(alert_id, zone_id)
            )
        `);
        log('✅ Table alert_zones créée', 'green');
        
        // =============================================
        // TABLE: statistics
        // =============================================
        log('\n📄 Création de la table statistics...', 'cyan');
        await client.query(`
            CREATE TABLE IF NOT EXISTS statistics (
                id SERIAL PRIMARY KEY,
                date DATE UNIQUE NOT NULL,
                total_alerts INTEGER DEFAULT 0,
                active_alerts INTEGER DEFAULT 0,
                resolved_alerts INTEGER DEFAULT 0,
                false_alarms INTEGER DEFAULT 0,
                new_users INTEGER DEFAULT 0,
                avg_response_time REAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        log('✅ Table statistics créée', 'green');
        
        // =============================================
        // INDEXES
        // =============================================
        log('\n📄 Création des index...', 'cyan');
        
        // Index sur les utilisateurs
        await client.query('CREATE INDEX IF NOT EXISTS idx_users_telephone ON users(telephone)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_users_quartier ON users(quartier)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_users_location ON users(latitude, longitude)');
        
        // Index sur les alertes
        await client.query('CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_alerts_type_id ON alerts(type_id)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_alerts_priority ON alerts(priority)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_alerts_location ON alerts(latitude, longitude)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_alerts_quartier ON alerts(quartier)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_alerts_assigned_to ON alerts(assigned_to)');
        
        // Index sur les messages de chat
        await client.query('CREATE INDEX IF NOT EXISTS idx_chat_sender_id ON chat_messages(sender_id)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_chat_receiver_id ON chat_messages(receiver_id)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_chat_created_at ON chat_messages(created_at)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_chat_is_read ON chat_messages(is_read)');
        
        // Index sur les notifications
        await client.query('CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON notifications(sent_at)');
        
        // Index sur les types d'urgence
        await client.query('CREATE INDEX IF NOT EXISTS idx_emergency_types_priorite ON emergency_types(priorite)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_emergency_types_is_active ON emergency_types(is_active)');
        
        log('✅ Index créés', 'green');
        
        // =============================================
        // TRIGGERS
        // =============================================
        log('\n📄 Création des triggers...', 'cyan');
        
        // Fonction pour mettre à jour updated_at
        await client.query(`
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql'
        `);
        
        // Trigger pour users
        await client.query('DROP TRIGGER IF EXISTS update_users_timestamp ON users');
        await client.query(`
            CREATE TRIGGER update_users_timestamp
            BEFORE UPDATE ON users
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column()
        `);
        
        // Trigger pour alerts
        await client.query('DROP TRIGGER IF EXISTS update_alerts_timestamp ON alerts');
        await client.query(`
            CREATE TRIGGER update_alerts_timestamp
            BEFORE UPDATE ON alerts
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column()
        `);
        
        // Fonction pour mettre à jour resolved_at
        await client.query(`
            CREATE OR REPLACE FUNCTION update_resolved_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
                    NEW.resolved_at = CURRENT_TIMESTAMP;
                END IF;
                RETURN NEW;
            END;
            $$ language 'plpgsql'
        `);
        
        // Trigger pour resolved_at
        await client.query('DROP TRIGGER IF EXISTS update_alert_resolved_at ON alerts');
        await client.query(`
            CREATE TRIGGER update_alert_resolved_at
            BEFORE UPDATE OF status ON alerts
            FOR EACH ROW
            EXECUTE FUNCTION update_resolved_at_column()
        `);
        
        log('✅ Triggers créés', 'green');
        
        // =============================================
        // VIEWS
        // =============================================
        log('\n📄 Création des vues...', 'cyan');
        
        // Vue pour les alertes actives
        await client.query(`
            CREATE OR REPLACE VIEW v_active_alerts AS
            SELECT 
                a.id,
                a.description,
                a.latitude,
                a.longitude,
                a.address,
                a.quartier,
                a.avenue,
                a.photo,
                a.voice_message,
                a.status,
                a.priority,
                a.created_at,
                a.updated_at,
                u.nom AS user_nom,
                u.prenom AS user_prenom,
                u.telephone AS user_telephone,
                et.nom AS type_nom,
                et.icone AS type_icone,
                et.couleur AS type_couleur,
                agent.nom AS agent_nom,
                agent.prenom AS agent_prenom
            FROM alerts a
            LEFT JOIN users u ON a.user_id = u.id
            LEFT JOIN emergency_types et ON a.type_id = et.id
            LEFT JOIN users agent ON a.assigned_to = agent.id
            WHERE a.status IN ('active', 'in_progress')
            ORDER BY a.priority ASC, a.created_at DESC
        `);
        
        // Vue pour les statistiques par quartier
        await client.query(`
            CREATE OR REPLACE VIEW v_alerts_by_quartier AS
            SELECT 
                quartier,
                COUNT(*) AS total_alerts,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_alerts,
                SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolved_alerts,
                AVG(CASE WHEN resolved_at IS NOT NULL 
                    THEN EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60
                    ELSE NULL END) AS avg_response_time_minutes
            FROM alerts
            WHERE quartier IS NOT NULL
            GROUP BY quartier
            ORDER BY total_alerts DESC
        `);
        
        // Vue pour les statistiques par type d'urgence
        await client.query(`
            CREATE OR REPLACE VIEW v_alerts_by_type AS
            SELECT 
                et.nom AS type_nom,
                et.icone AS type_icone,
                et.couleur AS type_couleur,
                COUNT(a.id) AS total_alerts,
                SUM(CASE WHEN a.status = 'active' THEN 1 ELSE 0 END) AS active_alerts,
                SUM(CASE WHEN a.status = 'resolved' THEN 1 ELSE 0 END) AS resolved_alerts
            FROM emergency_types et
            LEFT JOIN alerts a ON et.id = a.type_id
            GROUP BY et.id
            ORDER BY total_alerts DESC
        `);
        
        // Vue pour les utilisateurs actifs
        await client.query(`
            CREATE OR REPLACE VIEW v_active_users AS
            SELECT 
                id,
                nom,
                prenom,
                telephone,
                email,
                role,
                quartier,
                avenue,
                latitude,
                longitude,
                last_login,
                created_at
            FROM users
            WHERE is_active = 1
            ORDER BY last_login DESC
        `);
        
        log('✅ Vues créées', 'green');
        
        // =============================================
        // DEFAULT DATA
        // =============================================
        log('\n📄 Insertion des données par défaut...', 'cyan');
        
        // Types d'urgence
        const emergencyTypes = [
            { nom: 'Agression', icone: 'fa-user-graduate', couleur: '#e74c3c', priorite: 1, description: 'Agression physique ou verbale' },
            { nom: 'Accident', icone: 'fa-car-crash', couleur: '#e67e22', priorite: 1, description: 'Accident de la route ou autre' },
            { nom: 'Incendie', icone: 'fa-fire', couleur: '#f39c12', priorite: 1, description: 'Début d\'incendie ou feu' },
            { nom: 'Urgence Médicale', icone: 'fa-heartbeat', couleur: '#9b59b6', priorite: 2, description: 'Urgence médicale nécessitant une intervention' },
            { nom: 'Activité Suspecte', icone: 'fa-user-secret', couleur: '#7f8c8d', priorite: 3, description: 'Activité suspecte ou suspect' },
            { nom: 'Manifestation', icone: 'fa-users', couleur: '#3498db', priorite: 4, description: 'Manifestation ou rassemblement' },
            { nom: 'Catastrophe Naturelle', icone: 'fa-hurricane', couleur: '#1abc9c', priorite: 1, description: 'Inondation, tremblement de terre, etc.' },
            { nom: 'Vol', icone: 'fa-mask', couleur: '#e74c3c', priorite: 2, description: 'Vol ou tentative de vol' }
        ];
        
        for (const type of emergencyTypes) {
            await client.query(
                'INSERT INTO emergency_types (nom, icone, couleur, priorite, description) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (nom) DO NOTHING',
                [type.nom, type.icone, type.couleur, type.priorite, type.description]
            );
        }
        log('✅ Types d\'urgence insérés', 'green');
        
        // Zones de Goma
        const zones = [
            { nom: 'Centre-ville', description: 'Centre commercial et administratif', latitude: -1.6793, longitude: 29.2286, rayon: 2000 },
            { nom: 'Birere', description: 'Quartier de Birere', latitude: -1.6850, longitude: 29.2350, rayon: 1500 },
            { nom: 'Mabanga Nord', description: 'Quartier Mabanga Nord', latitude: -1.6700, longitude: 29.2200, rayon: 1500 },
            { nom: 'Mabanga Sud', description: 'Quartier Mabanga Sud', latitude: -1.6900, longitude: 29.2200, rayon: 1500 },
            { nom: 'Katoyi', description: 'Quartier de Katoyi', latitude: -1.6650, longitude: 29.2400, rayon: 1500 },
            { nom: 'Majengo', description: 'Quartier de Majengo', latitude: -1.6750, longitude: 29.2500, rayon: 1500 },
            { nom: 'Kyeshero', description: 'Quartier de Kyeshero', latitude: -1.6600, longitude: 29.2150, rayon: 1500 },
            { nom: 'Les Volcans', description: 'Quartier des Volcans', latitude: -1.6550, longitude: 29.2300, rayon: 1500 },
            { nom: 'Mugunga', description: 'Quartier de Mugunga', latitude: -1.7000, longitude: 29.2100, rayon: 2000 },
            { nom: 'Lac Vert', description: 'Zone du Lac Vert', latitude: -1.7100, longitude: 29.2000, rayon: 2500 }
        ];
        
        for (const zone of zones) {
            await client.query(
                'INSERT INTO zones (nom, description, latitude, longitude, rayon) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (nom) DO NOTHING',
                [zone.nom, zone.description, zone.latitude, zone.longitude, zone.rayon]
            );
        }
        log('✅ Zones insérées', 'green');
        
        // Utilisateur admin
        const adminPassword = bcrypt.hashSync('admin123', 10);
        await client.query(
            'INSERT INTO users (nom, prenom, telephone, email, password_hash, role, quartier, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING',
            ['Admin', 'Goma Security', '+243000000000', 'admin@gomasecurity.cd', adminPassword, 'admin', 'Centre-ville', 1]
        );
        
        // Agent de test
        const agentPassword = bcrypt.hashSync('admin123', 10);
        await client.query(
            'INSERT INTO users (nom, prenom, telephone, email, password_hash, role, quartier, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING',
            ['Agent', 'Test', '+243111111111', 'agent@gomasecurity.cd', agentPassword, 'agent', 'Centre-ville', 1]
        );
        
        // Citoyen de test
        const citoyenPassword = bcrypt.hashSync('admin123', 10);
        await client.query(
            'INSERT INTO users (nom, prenom, telephone, email, password_hash, role, quartier, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING',
            ['Citoyen', 'Test', '+243222222222', 'citoyen@gomasecurity.cd', citoyenPassword, 'citoyen', 'Birere', 1]
        );
        
        log('✅ Utilisateurs par défaut créés', 'green');
        
        // =============================================
        // VERIFICATION
        // =============================================
        log('\n🔍 Vérification des tables créées...', 'cyan');
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        log('✅ Tables créées:', 'green');
        tables.rows.forEach(row => {
            log(`   - ${row.table_name}`, 'blue');
        });
        
        // Compter les enregistrements
        log('\n📊 Comptage des enregistrements:', 'cyan');
        const tableNames = ['users', 'emergency_types', 'alerts', 'chat_messages', 'notifications', 'zones'];
        for (const table of tableNames) {
            try {
                const count = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
                log(`   - ${table}: ${count.rows[0].count} enregistrement(s)`, 'blue');
            } catch (err) {
                log(`   - ${table}: Erreur (${err.message})`, 'yellow');
            }
        }
        
        // =============================================
        // CONNECTION INFO
        // =============================================
        log('\n' + '='.repeat(50), 'cyan');
        log('📋 INFORMATIONS DE CONNEXION', 'cyan');
        log('='.repeat(50), 'cyan');
        log(`📁 Base de données: Supabase PostgreSQL`, 'blue');
        log(`🔗 Host: db.xouuaudwfjtlaedocvin.supabase.co`, 'blue');
        log('\n👤 Comptes par défaut:', 'yellow');
        log('   Admin:    +243000000000 / admin123', 'blue');
        log('   Agent:    +243111111111 / admin123', 'blue');
        log('   Citoyen:  +243222222222 / admin123', 'blue');
        log('\n⚠️  IMPORTANT: Changez les mots de passe en production!', 'yellow');
        log('='.repeat(50), 'cyan');
        
        log('\n✅ Initialisation terminée avec succès!', 'green');
        
    } catch (error) {
        log(`\n❌ Erreur lors de l'initialisation: ${error.message}`, 'red');
        if (error.code) {
            log(`   Code: ${error.code}`, 'red');
        }
        process.exit(1);
    } finally {
        if (client) {
            client.release();
        }
        await pool.end();
    }
}

// Exécuter le script
if (require.main === module) {
    initializeDatabase();
}

module.exports = { initializeDatabase };
