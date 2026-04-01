/**
 * Goma Security - Database Backup Script
 * Script de sauvegarde de la base de données SQLite
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

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
 * Crée le dossier de sauvegarde s'il n'existe pas
 */
function ensureBackupDir() {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
            log(`📁 Dossier de sauvegarde créé: ${BACKUP_DIR}`, 'green');
        }
        resolve();
    });
}

/**
 * Génère un nom de fichier de sauvegarde avec timestamp
 */
function generateBackupFilename() {
    const now = new Date();
    const timestamp = now.toISOString()
        .replace(/T/, '_')
        .replace(/\..+/, '')
        .replace(/:/g, '-');
    return `goma_security_backup_${timestamp}.db`;
}

/**
 * Crée une sauvegarde de la base de données
 */
function createBackup() {
    return new Promise((resolve, reject) => {
        log('\n📦 Création de la sauvegarde...', 'cyan');
        
        if (!fs.existsSync(DB_PATH)) {
            const error = new Error(`Base de données non trouvée: ${DB_PATH}`);
            log(`❌ ${error.message}`, 'red');
            reject(error);
            return;
        }
        
        const backupFilename = generateBackupFilename();
        const backupPath = path.join(BACKUP_DIR, backupFilename);
        
        // Ouvrir la base de données source
        const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
            if (err) {
                log(`❌ Erreur ouverture base: ${err.message}`, 'red');
                reject(err);
                return;
            }
            
            // Créer la sauvegarde
            const backupDb = new sqlite3.Database(backupPath, (err) => {
                if (err) {
                    log(`❌ Erreur création sauvegarde: ${err.message}`, 'red');
                    db.close();
                    reject(err);
                    return;
                }
                
                // Effectuer la sauvegarde
                db.backup(backupPath, (err) => {
                    if (err) {
                        log(`❌ Erreur sauvegarde: ${err.message}`, 'red');
                        db.close();
                        backupDb.close();
                        reject(err);
                    } else {
                        log(`✅ Sauvegarde créée: ${backupPath}`, 'green');
                        db.close();
                        backupDb.close();
                        resolve(backupPath);
                    }
                });
            });
        });
    });
}

/**
 * Affiche les informations de la sauvegarde
 */
function displayBackupInfo(backupPath) {
    return new Promise((resolve) => {
        log('\n📊 Informations de la sauvegarde:', 'cyan');
        
        const stats = fs.statSync(backupPath);
        const fileSizeInBytes = stats.size;
        const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
        
        log(`   📁 Fichier: ${backupPath}`, 'blue');
        log(`   📏 Taille: ${fileSizeInMB} MB`, 'blue');
        log(`   📅 Date: ${new Date().toLocaleString()}`, 'blue');
        
        resolve();
    });
}

/**
 * Liste les sauvegardes existantes
 */
function listBackups() {
    return new Promise((resolve) => {
        log('\n📋 Sauvegardes existantes:', 'cyan');
        
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
 * Nettoie les anciennes sauvegardes (garde les 10 plus récentes)
 */
function cleanOldBackups() {
    return new Promise((resolve) => {
        log('\n🧹 Nettoyage des anciennes sauvegardes...', 'cyan');
        
        if (!fs.existsSync(BACKUP_DIR)) {
            resolve();
            return;
        }
        
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(file => file.endsWith('.db'))
            .map(file => ({
                name: file,
                path: path.join(BACKUP_DIR, file),
                time: fs.statSync(path.join(BACKUP_DIR, file)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time);
        
        const MAX_BACKUPS = 10;
        
        if (files.length > MAX_BACKUPS) {
            const filesToDelete = files.slice(MAX_BACKUPS);
            
            filesToDelete.forEach(file => {
                fs.unlinkSync(file.path);
                log(`   🗑️  Supprimé: ${file.name}`, 'yellow');
            });
            
            log(`✅ ${filesToDelete.length} ancienne(s) sauvegarde(s) supprimée(s)`, 'green');
        } else {
            log('✅ Aucune sauvegarde à nettoyer', 'green');
        }
        
        resolve();
    });
}

/**
 * Fonction principale
 */
async function main() {
    log('\n' + '='.repeat(50), 'cyan');
    log('💾 GOMA SECURITY - SAUVEGARDE DE LA BASE DE DONNÉES', 'cyan');
    log('='.repeat(50), 'cyan');
    
    try {
        // Créer le dossier de sauvegarde
        await ensureBackupDir();
        
        // Lister les sauvegardes existantes
        await listBackups();
        
        // Créer une nouvelle sauvegarde
        const backupPath = await createBackup();
        
        // Afficher les informations
        await displayBackupInfo(backupPath);
        
        // Nettoyer les anciennes sauvegardes
        await cleanOldBackups();
        
        log('\n✅ Sauvegarde terminée avec succès!', 'green');
        
    } catch (error) {
        log(`\n❌ Erreur lors de la sauvegarde: ${error.message}`, 'red');
        process.exit(1);
    }
}

// Exécuter le script
if (require.main === module) {
    main();
}

module.exports = {
    createBackup,
    listBackups,
    cleanOldBackups,
    generateBackupFilename
};
