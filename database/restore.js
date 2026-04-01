/**
 * Goma Security - Database Restore Script
 * Script de restauration de la base de données SQLite
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const DB_PATH = process.env.DB_PATH || './goma_security.db';
const BACKUP_DIR = process.env.BACKUP_DIR || './backups';

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
 * Demande une confirmation à l'utilisateur
 */
function askConfirmation(question) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'oui' || answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
        });
    });
}

/**
 * Liste les sauvegardes disponibles
 */
function listAvailableBackups() {
    return new Promise((resolve) => {
        log('\n📋 Sauvegardes disponibles:', 'cyan');
        
        if (!fs.existsSync(BACKUP_DIR)) {
            log('   Aucune sauvegarde trouvée', 'yellow');
            resolve([]);
            return;
        }
        
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(file => file.endsWith('.db'))
            .sort()
            .reverse();
        
        if (files.length === 0) {
            log('   Aucune sauvegarde trouvée', 'yellow');
            resolve([]);
            return;
        }
        
        files.forEach((file, index) => {
            const filePath = path.join(BACKUP_DIR, file);
            const stats = fs.statSync(filePath);
            const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
            const date = stats.mtime.toLocaleString();
            
            log(`   ${index + 1}. ${file}`, 'blue');
            log(`      Taille: ${fileSizeInMB} MB | Date: ${date}`, 'blue');
        });
        
        resolve(files);
    });
}

/**
 * Sélectionne une sauvegarde à restaurer
 */
function selectBackup(backups) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        rl.question('\n🔢 Entrez le numéro de la sauvegarde à restaurer (ou "q" pour quitter): ', (answer) => {
            rl.close();
            
            if (answer.toLowerCase() === 'q') {
                resolve(null);
                return;
            }
            
            const index = parseInt(answer) - 1;
            
            if (isNaN(index) || index < 0 || index >= backups.length) {
                log('❌ Numéro invalide', 'red');
                resolve(null);
                return;
            }
            
            resolve(backups[index]);
        });
    });
}

/**
 * Vérifie l'intégrité d'une sauvegarde
 */
function verifyBackup(backupPath) {
    return new Promise((resolve, reject) => {
        log('\n🔍 Vérification de l\'intégrité de la sauvegarde...', 'cyan');
        
        const db = new sqlite3.Database(backupPath, sqlite3.OPEN_READONLY, (err) => {
            if (err) {
                log(`❌ Erreur ouverture sauvegarde: ${err.message}`, 'red');
                reject(err);
                return;
            }
            
            db.get('PRAGMA integrity_check', [], (err, row) => {
                if (err) {
                    log(`❌ Erreur vérification: ${err.message}`, 'red');
                    db.close();
                    reject(err);
                } else if (row.integrity_check === 'ok') {
                    log('✅ Intégrité vérifiée', 'green');
                    db.close();
                    resolve(true);
                } else {
                    log(`❌ Intégrité compromise: ${row.integrity_check}`, 'red');
                    db.close();
                    reject(new Error('Intégrité de la sauvegarde compromise'));
                }
            });
        });
    });
}

/**
 * Crée une sauvegarde de la base actuelle avant restauration
 */
function backupCurrentDatabase() {
    return new Promise((resolve, reject) => {
        log('\n💾 Sauvegarde de la base actuelle avant restauration...', 'cyan');
        
        if (!fs.existsSync(DB_PATH)) {
            log('ℹ️  Aucune base de données existante à sauvegarder', 'yellow');
            resolve(null);
            return;
        }
        
        const timestamp = new Date().toISOString()
            .replace(/T/, '_')
            .replace(/\..+/, '')
            .replace(/:/g, '-');
        const preRestoreBackupPath = path.join(BACKUP_DIR, `pre_restore_${timestamp}.db`);
        
        fs.copyFileSync(DB_PATH, preRestoreBackupPath);
        log(`✅ Sauvegarde pré-restauration créée: ${preRestoreBackupPath}`, 'green');
        resolve(preRestoreBackupPath);
    });
}

/**
 * Restaure la base de données à partir d'une sauvegarde
 */
function restoreDatabase(backupPath) {
    return new Promise((resolve, reject) => {
        log('\n🔄 Restauration de la base de données...', 'cyan');
        
        // Supprimer l'ancienne base si elle existe
        if (fs.existsSync(DB_PATH)) {
            fs.unlinkSync(DB_PATH);
            log('🗑️  Ancienne base de données supprimée', 'yellow');
        }
        
        // Copier la sauvegarde
        fs.copyFileSync(backupPath, DB_PATH);
        log('✅ Base de données restaurée', 'green');
        
        resolve();
    });
}

/**
 * Vérifie la base de données restaurée
 */
function verifyRestoredDatabase() {
    return new Promise((resolve, reject) => {
        log('\n🔍 Vérification de la base restaurée...', 'cyan');
        
        const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
            if (err) {
                log(`❌ Erreur ouverture base restaurée: ${err.message}`, 'red');
                reject(err);
                return;
            }
            
            // Vérifier les tables
            db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
                if (err) {
                    log(`❌ Erreur vérification tables: ${err.message}`, 'red');
                    db.close();
                    reject(err);
                } else {
                    log(`✅ ${tables.length} table(s) trouvée(s)`, 'green');
                    tables.forEach(table => {
                        log(`   - ${table.name}`, 'blue');
                    });
                    db.close();
                    resolve(tables);
                }
            });
        });
    });
}

/**
 * Affiche le résumé de la restauration
 */
function displayRestoreSummary(backupPath) {
    return new Promise((resolve) => {
        log('\n' + '='.repeat(50), 'cyan');
        log('📊 RÉSUMÉ DE LA RESTAURATION', 'cyan');
        log('='.repeat(50), 'cyan');
        
        const stats = fs.statSync(backupPath);
        const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
        
        log(`📁 Sauvegarde restaurée: ${backupPath}`, 'blue');
        log(`📏 Taille: ${fileSizeInMB} MB`, 'blue');
        log(`📅 Date de la sauvegarde: ${stats.mtime.toLocaleString()}`, 'blue');
        log(`✅ Restauration terminée avec succès!`, 'green');
        log('='.repeat(50), 'cyan');
        
        resolve();
    });
}

/**
 * Fonction principale
 */
async function main() {
    log('\n' + '='.repeat(50), 'cyan');
    log('🔄 GOMA SECURITY - RESTAURATION DE LA BASE DE DONNÉES', 'cyan');
    log('='.repeat(50), 'cyan');
    
    try {
        // Lister les sauvegardes disponibles
        const backups = await listAvailableBackups();
        
        if (backups.length === 0) {
            log('\n❌ Aucune sauvegarde disponible pour la restauration', 'red');
            process.exit(1);
        }
        
        // Sélectionner une sauvegarde
        const selectedBackup = await selectBackup(backups);
        
        if (!selectedBackup) {
            log('\n❌ Restauration annulée', 'yellow');
            process.exit(0);
        }
        
        const backupPath = path.join(BACKUP_DIR, selectedBackup);
        
        // Vérifier l'intégrité de la sauvegarde
        await verifyBackup(backupPath);
        
        // Demander confirmation
        const confirmed = await askConfirmation('\n⚠️  Êtes-vous sûr de vouloir restaurer cette sauvegarde? (oui/non): ');
        
        if (!confirmed) {
            log('\n❌ Restauration annulée', 'yellow');
            process.exit(0);
        }
        
        // Sauvegarder la base actuelle
        await backupCurrentDatabase();
        
        // Restaurer la base de données
        await restoreDatabase(backupPath);
        
        // Vérifier la base restaurée
        await verifyRestoredDatabase();
        
        // Afficher le résumé
        await displayRestoreSummary(backupPath);
        
    } catch (error) {
        log(`\n❌ Erreur lors de la restauration: ${error.message}`, 'red');
        process.exit(1);
    }
}

// Exécuter le script
if (require.main === module) {
    main();
}

module.exports = {
    listAvailableBackups,
    selectBackup,
    verifyBackup,
    backupCurrentDatabase,
    restoreDatabase,
    verifyRestoredDatabase
};
