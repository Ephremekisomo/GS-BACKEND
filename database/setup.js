/**
 * Goma Security - Database Setup Script
 * Script d'initialisation de la base de données SQLite
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Configuration
const DB_PATH = process.env.DB_PATH || './goma_security.db';
const SQL_FILE_PATH = path.join(__dirname, 'init.sql');

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
 * Crée la connexion à la base de données
 */
function createDatabase() {
    return new Promise((resolve, reject) => {
        log('\n📦 Connexion à la base de données...', 'cyan');
        
        const db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                log(`❌ Erreur de connexion: ${err.message}`, 'red');
                reject(err);
            } else {
                log(`✅ Connecté à: ${DB_PATH}`, 'green');
                resolve(db);
            }
        });
    });
}

/**
 * Exécute le script SQL
 */
function executeSQLScript(db) {
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
        
        db.exec(sql, (err) => {
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
function updateDefaultPasswords(db) {
    return new Promise((resolve, reject) => {
        log('\n🔐 Mise à jour des mots de passe par défaut...', 'cyan');
        
        const defaultPassword = 'admin123';
        const hashedPassword = bcrypt.hashSync(defaultPassword, 10);
        
        const query = `
            UPDATE users 
            SET password_hash = ? 
            WHERE telephone IN ('+243000000000', '+243111111111', '+243222222222')
        `;
        
        db.run(query, [hashedPassword], function(err) {
            if (err) {
                log(`❌ Erreur mise à jour mots de passe: ${err.message}`, 'red');
                reject(err);
            } else {
                log(`✅ ${this.changes} mots de passe mis à jour`, 'green');
                resolve();
            }
        });
    });
}

/**
 * Vérifie les tables créées
 */
function verifyTables(db) {
    return new Promise((resolve, reject) => {
        log('\n🔍 Vérification des tables...', 'cyan');
        
        const query = `
            SELECT name FROM sqlite_master 
            WHERE type='table' 
            ORDER BY name
        `;
        
        db.all(query, [], (err, tables) => {
            if (err) {
                log(`❌ Erreur vérification: ${err.message}`, 'red');
                reject(err);
            } else {
                log('✅ Tables créées:', 'green');
                tables.forEach(table => {
                    log(`   - ${table.name}`, 'blue');
                });
                resolve(tables);
            }
        });
    });
}

/**
 * Vérifie les vues créées
 */
function verifyViews(db) {
    return new Promise((resolve, reject) => {
        log('\n🔍 Vérification des vues...', 'cyan');
        
        const query = `
            SELECT name FROM sqlite_master 
            WHERE type='view' 
            ORDER BY name
        `;
        
        db.all(query, [], (err, views) => {
            if (err) {
                log(`❌ Erreur vérification: ${err.message}`, 'red');
                reject(err);
            } else {
                if (views.length > 0) {
                    log('✅ Vues créées:', 'green');
                    views.forEach(view => {
                        log(`   - ${view.name}`, 'blue');
                    });
                } else {
                    log('ℹ️  Aucune vue trouvée', 'yellow');
                }
                resolve(views);
            }
        });
    });
}

/**
 * Vérifie les index créés
 */
function verifyIndexes(db) {
    return new Promise((resolve, reject) => {
        log('\n🔍 Vérification des index...', 'cyan');
        
        const query = `
            SELECT name, tbl_name FROM sqlite_master 
            WHERE type='index' 
            ORDER BY tbl_name, name
        `;
        
        db.all(query, [], (err, indexes) => {
            if (err) {
                log(`❌ Erreur vérification: ${err.message}`, 'red');
                reject(err);
            } else {
                if (indexes.length > 0) {
                    log('✅ Index créés:', 'green');
                    indexes.forEach(index => {
                        log(`   - ${index.name} (${index.tbl_name})`, 'blue');
                    });
                } else {
                    log('ℹ️  Aucun index trouvé', 'yellow');
                }
                resolve(indexes);
            }
        });
    });
}

/**
 * Compte les enregistrements dans chaque table
 */
function countRecords(db) {
    return new Promise((resolve, reject) => {
        log('\n📊 Comptage des enregistrements...', 'cyan');
        
        const tables = ['users', 'emergency_types', 'alerts', 'chat_messages', 'notifications', 'zones'];
        let completed = 0;
        
        tables.forEach(table => {
            db.get(`SELECT COUNT(*) as count FROM ${table}`, [], (err, row) => {
                if (err) {
                    log(`❌ Erreur comptage ${table}: ${err.message}`, 'red');
                } else {
                    log(`   - ${table}: ${row.count} enregistrement(s)`, 'blue');
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
    log(`📁 Base de données: ${DB_PATH}`, 'blue');
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
function closeDatabase(db) {
    return new Promise((resolve, reject) => {
        log('\n🔒 Fermeture de la connexion...', 'cyan');
        
        db.close((err) => {
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
    
    let db;
    
    try {
        // Créer la connexion
        db = await createDatabase();
        
        // Activer les clés étrangères
        db.run('PRAGMA foreign_keys = ON');
        
        // Exécuter le script SQL
        await executeSQLScript(db);
        
        // Mettre à jour les mots de passe
        await updateDefaultPasswords(db);
        
        // Vérifications
        await verifyTables(db);
        await verifyViews(db);
        await verifyIndexes(db);
        await countRecords(db);
        
        // Afficher les informations de connexion
        displayConnectionInfo();
        
        log('\n✅ Initialisation terminée avec succès!', 'green');
        
    } catch (error) {
        log(`\n❌ Erreur lors de l'initialisation: ${error.message}`, 'red');
        process.exit(1);
    } finally {
        if (db) {
            await closeDatabase(db);
        }
    }
}

// Exécuter le script
if (require.main === module) {
    main();
}

module.exports = {
    createDatabase,
    executeSQLScript,
    updateDefaultPasswords,
    verifyTables,
    verifyViews,
    verifyIndexes,
    countRecords,
    closeDatabase
};
