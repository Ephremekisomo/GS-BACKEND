/**
 * Goma Security - PostgreSQL Database Setup Script
 * Script d'initialisation de la base de données PostgreSQL
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Configuration
const SQL_FILE_PATH = path.join(__dirname, 'init-postgresql.sql');

// Couleurs pour la console
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

/**
 * Affiche un message coloré dans la console
 */
function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Crée la connexion à la base de données PostgreSQL
 */
function createPool() {
    return new Promise((resolve, reject) => {
        log('\n📦 Connexion à la base de données PostgreSQL...', 'cyan');
        
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/goma_security',
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        
        pool.on('connect', () => {
            log('✅ Connecté à PostgreSQL', 'green');
        });
        
        pool.on('error', (err) => {
            log(`❌ Erreur de connexion: ${err.message}`, 'red');
        });
        
        resolve(pool);
    });
}

/**
 * Corrige la contrainte de rôle si elle existe avec d'anciennes valeurs
 */
function fixRoleConstraint(pool) {
    return new Promise((resolve, reject) => {
        log('\n🔧 Vérification et correction de la contrainte de rôle...', 'cyan');
        
        const fixSQL = `
            DO $$ 
            BEGIN
                -- Supprimer l'ancienne contrainte si elle existe
                IF EXISTS (
                    SELECT 1 FROM pg_constraint 
                    WHERE conname = 'users_role_check'
                ) THEN
                    ALTER TABLE users DROP CONSTRAINT users_role_check;
                    RAISE NOTICE '✅ Ancienne contrainte supprimée';
                END IF;
                
                -- Ajouter la nouvelle contrainte avec les bons rôles
                ALTER TABLE users ADD CONSTRAINT users_role_check 
                    CHECK(role IN ('citoyen', 'admin', 'pompiers','police','protection civile','ambulance', 'centre_securite'));
                RAISE NOTICE '✅ Nouvelle contrainte ajoutée';
            END $$;
        `;
        
        pool.query(fixSQL, (err, result) => {
            if (err) {
                log(`⚠️  Avertissement contrainte: ${err.message}`, 'yellow');
                // Continue même si la contrainte n'existe pas encore
                resolve();
            } else {
                log('✅ Contrainte de rôle vérifiée/corrigée', 'green');
                resolve();
            }
        });
    });
}

/**
 * Exécute le script SQL
 */
function executeSQLScript(pool) {
    return new Promise((resolve, reject) => {
        log('\n📄 Lecture du script SQL...', 'cyan');
        
        if (!fs.existsSync(SQL_FILE_PATH)) {
            const error = new Error(`Fichier SQL non trouvé: ${SQL_FILE_PATH}`);
            log(`❌ ${error.message}`, 'red');
            reject(error);
            return;
        }
        
        const sql = fs.readFileSync(SQL_FILE_PATH, 'utf8');
        log(`✅ Script SQL chargé (${sql.length} caractères)`, 'green');
        
        log('\n🔄 Exécution du script SQL...', 'cyan');
        
        pool.query(sql, (err, result) => {
            if (err) {
                log(`❌ Erreur d'exécution SQL: ${err.message}`, 'red');
                reject(err);
            } else {
                log('✅ Script SQL exécuté avec succès', 'green');
                resolve();
            }
        });
    });
}

/**
 * Met à jour les mots de passe des utilisateurs par défaut
 */
function updateDefaultPasswords(pool) {
    return new Promise((resolve, reject) => {
        log('\n🔐 Mise à jour des mots de passe par défaut...', 'cyan');
        
        const defaultPassword = 'admin123';
        const hashedPassword = bcrypt.hashSync(defaultPassword, 10);
        
        const query = `
            UPDATE users 
            SET password_hash = $1 
            WHERE telephone IN ('+243000000000', '+243111111111', '+243222222222')
        `;
        
        pool.query(query, [hashedPassword], (err, result) => {
            if (err) {
                log(`❌ Erreur mise à jour mots de passe: ${err.message}`, 'red');
                reject(err);
            } else {
                log(`✅ ${result.rowCount} mots de passe mis à jour`, 'green');
                resolve();
            }
        });
    });
}

/**
 * Vérifie les tables créées
 */
function verifyTables(pool) {
    return new Promise((resolve, reject) => {
        log('\n🔍 Vérification des tables...', 'cyan');
        
        const query = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `;
        
        pool.query(query, [], (err, result) => {
            if (err) {
                log(`❌ Erreur vérification: ${err.message}`, 'red');
                reject(err);
            } else {
                log('✅ Tables créées:', 'green');
                result.rows.forEach(row => {
                    log(`   - ${row.table_name}`, 'blue');
                });
                resolve(result.rows);
            }
        });
    });
}

/**
 * Vérifie les vues créées
 */
function verifyViews(pool) {
    return new Promise((resolve, reject) => {
        log('\n🔍 Vérification des vues...', 'cyan');
        
        const query = `
            SELECT table_name 
            FROM information_schema.views 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `;
        
        pool.query(query, [], (err, result) => {
            if (err) {
                log(`❌ Erreur vérification: ${err.message}`, 'red');
                reject(err);
            } else {
                if (result.rows.length > 0) {
                    log('✅ Vues créées:', 'green');
                    result.rows.forEach(row => {
                        log(`   - ${row.table_name}`, 'blue');
                    });
                } else {
                    log('ℹ️  Aucune vue trouvée', 'yellow');
                }
                resolve(result.rows);
            }
        });
    });
}

/**
 * Vérifie les index créés
 */
function verifyIndexes(pool) {
    return new Promise((resolve, reject) => {
        log('\n🔍 Vérification des index...', 'cyan');
        
        const query = `
            SELECT indexname, tablename 
            FROM pg_indexes 
            WHERE schemaname = 'public' 
            ORDER BY tablename, indexname
        `;
        
        pool.query(query, [], (err, result) => {
            if (err) {
                log(`❌ Erreur vérification: ${err.message}`, 'red');
                reject(err);
            } else {
                if (result.rows.length > 0) {
                    log('✅ Index créés:', 'green');
                    result.rows.forEach(row => {
                        log(`   - ${row.indexname} (${row.tablename})`, 'blue');
                    });
                } else {
                    log('ℹ️  Aucun index trouvé', 'yellow');
                }
                resolve(result.rows);
            }
        });
    });
}

/**
 * Compte les enregistrements dans chaque table
 */
function countRecords(pool) {
    return new Promise((resolve, reject) => {
        log('\n📊 Comptage des enregistrements...', 'cyan');
        
        const tables = ['users', 'emergency_types', 'alerts', 'chat_messages', 'notifications', 'zones'];
        let completed = 0;
        
        tables.forEach(table => {
            pool.query(`SELECT COUNT(*) as count FROM ${table}`, [], (err, result) => {
                if (err) {
                    log(`❌ Erreur comptage ${table}: ${err.message}`, 'red');
                } else {
                    log(`   - ${table}: ${result.rows[0].count} enregistrement(s)`, 'blue');
                }
                
                completed++;
                if (completed === tables.length) {
                    resolve();
                }
            });
        });
    });
}

/**
 * Affiche les informations de connexion
 */
function displayConnectionInfo() {
    log('\n' + '='.repeat(50), 'cyan');
    log('📋 INFORMATIONS DE CONNEXION', 'cyan');
    log('='.repeat(50), 'cyan');
    log(`📁 Base de données: PostgreSQL`, 'blue');
    log(`🔗 URL: ${process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/goma_security'}`, 'blue');
    log('\n👤 Comptes par défaut:', 'yellow');
    log('   Admin:    +243000000000 / admin123', 'blue');
    log('   Agent:    +243111111111 / admin123', 'blue');
    log('   Citoyen:  +243222222222 / admin123', 'blue');
    log('\n⚠️  IMPORTANT: Changez les mots de passe en production!', 'yellow');
    log('='.repeat(50), 'cyan');
}

/**
 * Ferme la connexion à la base de données
 */
function closePool(pool) {
    return new Promise((resolve, reject) => {
        log('\n🔒 Fermeture de la connexion...', 'cyan');
        
        pool.end((err) => {
            if (err) {
                log(`❌ Erreur fermeture: ${err.message}`, 'red');
                reject(err);
            } else {
                log('✅ Connexion fermée', 'green');
                resolve();
            }
        });
    });
}

/**
 * Fonction principale
 */
async function main() {
    log('\n' + '='.repeat(50), 'cyan');
    log('🚀 GOMA SECURITY - INITIALISATION DE LA BASE DE DONNÉES', 'cyan');
    log('='.repeat(50), 'cyan');
    
    let pool;
    
    try {
        // Créer la connexion
        pool = await createPool();
        
        // Corriger la contrainte de rôle si nécessaire
        await fixRoleConstraint(pool);
        
        // Exécuter le script SQL
        await executeSQLScript(pool);
        
        // Mettre à jour les mots de passe
        await updateDefaultPasswords(pool);
        
        // Vérifications
        await verifyTables(pool);
        await verifyViews(pool);
        await verifyIndexes(pool);
        await countRecords(pool);
        
        // Afficher les informations de connexion
        displayConnectionInfo();
        
        log('\n✅ Initialisation terminée avec succès!', 'green');
        
    } catch (error) {
        log(`\n❌ Erreur lors de l'initialisation: ${error.message}`, 'red');
        process.exit(1);
    } finally {
        if (pool) {
            await closePool(pool);
        }
    }
}

// Exécuter le script
if (require.main === module) {
    main();
}

module.exports = {
    createPool,
    fixRoleConstraint,
    executeSQLScript,
    updateDefaultPasswords,
    verifyTables,
    verifyViews,
    verifyIndexes,
    countRecords,
    closePool
};
