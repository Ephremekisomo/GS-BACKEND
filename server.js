/**
 * Goma Security - Main Server
 * Application de securite urbaine pour la ville de Goma, RDC
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// Security middleware
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const compression = require('compression');

// Authentication
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

// File uploads
const multer = require('multer');

// Initialize Express
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// =====================
// DATABASE SETUP
// =====================




// Configuration de la connexion PostgreSQL
const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction 
    ? { rejectUnauthorized: false } 
    : false
});
const connectionString = process.env.DATABASE_URL;

// Tester la connexion au démarrage
async function testConnection() {
    try {
        const client = await pool.connect();
        console.log('✅ Connecté à la base de données PostgreSQL');
        client.release();
    } catch (err) {
        console.error('❌ Erreur de connexion à PostgreSQL:', err.message);
    }
}

pool.on('error', (err) => {
    console.error('Erreur de connexion à PostgreSQL:', err.message);
});

// Initialize database tables
async function initializeDatabase() {
    try {
        // Users table
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
                is_active INTEGER DEFAULT 1,
                last_login TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Emergency types table
        await pool.query(`
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
            )
        `);

        // Alerts table
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

        // Chat messages table
        await pool.query(`
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

        // Insert default emergency types
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
            await pool.query(
                'INSERT INTO emergency_types (nom, icone, couleur, priorite, description) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (nom) DO NOTHING',
                [type.nom, type.icone, type.couleur, type.priorite, type.description]
            );
        }

        // Create admin user
        const adminPassword = bcrypt.hashSync('admin111', 10);
        await pool.query(
            'INSERT INTO users (nom, prenom, telephone, email, password_hash, role, quartier) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING',
            ['Admin', 'Goma', '+243000000001', 'admin@gomasecurity.cd', adminPassword, 'admin', 'Goma']
        );

        // Create security center user
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

// Tester la connexion et initialiser la base de données
async function startApp() {
    await testConnection();
    await initializeDatabase();
    
    server.listen(PORT, () => {
        console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🏢 GOMA SECURITY - Serveur en ligne                    ║
║                                                            ║
║   📍 Interface citizens: http://localhost:${PORT}            ║
║   📍 Centre de securite: http://localhost:${PORT}/security-center  ║
║   📍 Poste de securite: http://localhost:${PORT}/poste      ║
║   📍 Panel Admin: http://localhost:${PORT}/admin             ║
║                                                            ║
║   👤 Admin par defaut:                                     ║
║      Telephone: +243000000000                              ║
║      Mot de passe: admin123                                ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
        `);
    });
}

startApp();



// =====================
// MIDDLEWARE
// =====================

app.use(helmet({
    contentSecurityPolicy: false
}));

app.use(cors({
    origin: true,
    credentials: true
}));

app.use(compression());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Rate limiting - global (permissive for authenticated users)
const globalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 500,
    message: { error: 'Trop de requetes, veuillez reessayer dans une minute.' }
});
app.use(globalLimiter);

// Rate limiting - strict for auth endpoints (anti brute-force)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 login attempts per 15 min
    message: { error: 'Trop de tentatives de connexion, veuillez reessayer dans 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Static files
// app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));

// Serve uploaded files with proper headers for media/audio
app.use('/uploads', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    res.setHeader('Accept-Ranges', 'bytes');
    next();
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath = process.env.UPLOAD_PATH || './uploads';
        if (file.fieldname === 'photo') {
            uploadPath = path.join(uploadPath, 'profiles');
        } else if (file.fieldname === 'voice') {
            uploadPath = path.join(uploadPath, 'voices');
        }
        
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 }
});

// Voice upload configuration
const voiceStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'uploads', 'voices');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'voice-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadVoice = multer({
    storage: voiceStorage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit for voice
});

// =====================
// CONSTANTS
// =====================

const VALID_ROLES = ['citoyen', 'admin', 'pompiers','police','protection civile','ambulance', 'centre_securite'];

const ROLE_REDIRECTS = {
    'admin': '/admin.html',
    'centre_securite': '/security-center.html',
    'police': '/poste.html',
    'pompiers': '/poste.html',
    'protection civile': '/poste.html',
    'ambulance': '/poste.html',
    'citoyen': '/'
};

// =====================
// AUTHENTICATION MIDDLEWARE
// =====================

const authenticateToken = (req, res, next) => {
    const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Authentification requise' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'default_secret', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token invalide' });
        }
        req.user = user;
        next();
    });
};

const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acces reserve aux administrateurs' });
    }
    next();
};

const requireAdminOrSecurityCenter = (req, res, next) => {
    if (req.user.role !== 'admin' && req.user.role !== 'centre_securite') {
        return res.status(403).json({ error: 'Acces reserve aux administrateurs et au centre de securite' });
    }
    next();
};

const validateRole = (role) => {
    return VALID_ROLES.includes(role);
};

// =====================
// ROUTES - AUTHENTICATION
// =====================

// Register
app.post('/api/auth/register', authLimiter, upload.single('photo'), async (req, res) => {
    try {
        const { nom, prenom, telephone, email, password, quartier, avenue, latitude, longitude } = req.body;
        

        // Check if user exists
        const userCheck = await pool.query('SELECT id FROM users WHERE telephone = $1', [telephone]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Ce numero de telephone est deja enregistre' });
        }

        const password_hash = await bcrypt.hash(password, 10);
        const photo_profil = req.file ? '/uploads/profiles/' + req.file.filename : null;

        const insertResult = await pool.query(
            `INSERT INTO users (nom, prenom, telephone, email, password_hash, quartier, avenue, latitude, longitude, photo_profil)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
            [nom, prenom, telephone, email, password_hash, quartier, avenue, latitude, longitude, photo_profil]
        );

        const newUser = insertResult.rows[0];
        const token = jwt.sign(
            { id: newUser.id, telephone, role: 'citoyen' },
            process.env.JWT_SECRET || 'default_secret'
        );

        res.json({
            message: 'Inscription reussie',
            token,
            user: { id: newUser.id, nom, prenom, telephone, role: 'citoyen' }
        });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Login
app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
        const { telephone, password } = req.body;

        const result = await pool.query('SELECT * FROM users WHERE telephone = $1', [telephone]);
        const user = result?.rows[0];
        if (!user) {
            return res.status(401).json({ error: 'Utilisateur non trouve' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Mot de passe incorrect' });
        }

        // If 2FA is enabled, return temp token
        if (user.two_fa_enabled === 1) {
            const tempToken = jwt.sign(
                { id: user.id, telephone: user.telephone, temp: true },
                process.env.JWT_SECRET || 'default_secret',
                { expiresIn: '5m' }
            );
            return res.json({ requires2FA: true, tempToken });
        }

        const token = jwt.sign(
            { id: user.id, telephone: user.telephone, role: user.role },
            process.env.JWT_SECRET || 'default_secret'
        );

        res.json({
            message: 'Connexion reussie',
            token,
            redirectTo: ROLE_REDIRECTS[user.role] || '/',
            user: {
                id: user.id,
                nom: user.nom,
                prenom: user.prenom,
                telephone: user.telephone,
                role: user.role,
                twoFaEnabled: user.two_fa_enabled === 1
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Verify 2FA
app.post('/api/auth/verify-2fa', authLimiter, async (req, res) => {
    try {
        const { tempToken, code } = req.body;

        const decoded = jwt.verify(tempToken, process.env.JWT_SECRET || 'default_secret');
        if (!decoded.temp) {
            return res.status(401).json({ error: 'Token invalide ou expire' });
        }

        const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
        const user = result?.rows[0];
        if (!user) {
            return res.status(401).json({ error: 'Utilisateur non trouve' });
        }

        const verified = speakeasy.totp.verify({
            secret: user.two_fa_secret,
            encoding: 'base32',
            token: code,
            window: 1
        });

        if (!verified) {
            return res.status(401).json({ error: 'Code invalide' });
        }

        const token = jwt.sign(
            { id: user.id, telephone: user.telephone, role: user.role },
            process.env.JWT_SECRET || 'default_secret'
        );

        res.json({
            message: 'Connexion reussie',
            token,
            redirectTo: ROLE_REDIRECTS[user.role] || '/',
            user: {
                id: user.id,
                nom: user.nom,
                prenom: user.prenom,
                telephone: user.telephone,
                role: user.role,
                twoFaEnabled: user.two_fa_enabled === 1
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get role redirect URL
app.get('/api/auth/role-redirect', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT role FROM users WHERE id = $1', [req.user.id]);
        const user = result.rows[0];
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouve' });
        }
        res.json({
            role: user.role,
            redirectTo: ROLE_REDIRECTS[user.role] || '/'
        });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Setup 2FA
app.post('/api/auth/setup-2fa', authenticateToken, async (req, res) => {
    try {
        const secret = speakeasy.generateSecret({
            name: `GomaSecurity:${req.user.telephone}`
        });

        await pool.query('UPDATE users SET two_fa_secret = $1 WHERE id = $2', [secret.base32, req.user.id]);

        QRCode.toDataURL(secret.otpauth_url, (err, data_url) => {
            res.json({
                secret: secret.base32,
                qrCode: data_url
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la configuration' });
    }
});

// Enable 2FA
app.post('/api/auth/enable-2fa', authenticateToken, async (req, res) => {
    try {
        const { code } = req.body;

        const result = await pool.query('SELECT two_fa_secret FROM users WHERE id = $1', [req.user.id]);
        const user = result?.rows[0];
        if (!user) {
            return res.status(401).json({ error: 'Utilisateur non trouve' });
        }

        const verified = speakeasy.totp.verify({
            secret: user.two_fa_secret,
            encoding: 'base32',
            token: code,
            window: 1
        });

        if (!verified) {
            return res.status(401).json({ error: 'Code invalide' });
        }

        await pool.query('UPDATE users SET two_fa_enabled = 1 WHERE id = $1', [req.user.id]);
        res.json({ message: '2FA active' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// =====================
// ROUTES - ALERTS
// =====================

// Get emergency types
app.get('/api/emergency-types', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM emergency_types ORDER BY priorite');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Create emergency type (admin only)
app.post('/api/emergency-types', authenticateToken, requireAdmin, upload.single('photo'), async (req, res) => {
    try {
        const { nom, icone, couleur, priorite, description } = req.body;
        const photo = req.file ? '/uploads/profiles/' + req.file.filename : null;
        
        if (!nom || !icone || !couleur) {
            return res.status(400).json({ error: 'Nom, icone et couleur requis' });
        }

        const result = await pool.query(
            `INSERT INTO emergency_types (nom, icone, couleur, priorite, description, photo)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [nom, icone, couleur, priorite || 3, description, photo]
        );

        res.status(201).json({ message: 'Type d\'urgence cree', type: result.rows[0] });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Ce type d\'urgence existe deja' });
        }
        res.status(500).json({ error: 'Erreur lors de la creation' });
    }
});

// Update emergency type (admin only)
app.put('/api/emergency-types/:id', authenticateToken, requireAdmin, upload.single('photo'), async (req, res) => {
    try {
        const typeId = parseInt(req.params.id);
        const { nom, icone, couleur, priorite, description, existing_photo } = req.body;
        const photo = req.file ? '/uploads/profiles/' + req.file.filename : existing_photo;

        const result = await pool.query(
            `UPDATE emergency_types SET nom = $1, icone = $2, couleur = $3, priorite = $4, description = $5, photo = $6
             WHERE id = $7 RETURNING *`,
            [nom, icone, couleur, priorite, description, photo, typeId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Type d\'urgence non trouve' });
        }

        res.json({ message: 'Type d\'urgence mis a jour', type: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la mise a jour' });
    }
});

// Delete emergency type (admin only)
app.delete('/api/emergency-types/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const typeId = parseInt(req.params.id);

        // Check if type is used by any alerts
        const checkResult = await pool.query('SELECT COUNT(*) as count FROM alerts WHERE type_id = $1', [typeId]);
        if (parseInt(checkResult.rows[0].count) > 0) {
            return res.status(400).json({ error: 'Ce type d\'urgence est utilise par des alertes. Impossible de le supprimer.' });
        }

        await pool.query('DELETE FROM emergency_types WHERE id = $1', [typeId]);
        res.json({ message: 'Type d\'urgence supprime' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});

// Create alert
app.post('/api/alerts', authenticateToken, upload.single('photo'), async (req, res) => {
    try {
        const { type_id, description, latitude, longitude, accuracy, address, quartier, avenue, priority } = req.body;
        const photo = req.file ? '/uploads/profiles/' + req.file.filename : null;

        // Validate geolocation accuracy - must be 15 meters or less for emergency alerts
        if (!latitude || !longitude) {
            return res.status(400).json({ error: 'Latitude et longitude requis' });
        }

        // If accuracy is provided and is too high (more than 50 meters), log warning but still allow
        if (accuracy && parseFloat(accuracy) > 50) {
            console.warn(`Warning: Alert submitted with low accuracy: ${accuracy}m`);
        }

        // Validate coordinates are within reasonable bounds (Goma, RDC area)
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        
        // Goma, DRC bounds: approximately -1.5 to -2.0 latitude, 29.0 to 29.5 longitude
        if (lat < -2.5 || lat > -1.0 || lng < 28.5 || lng > 30.0) {
            return res.status(400).json({ error: 'Position invalide. Vous semblez etre hors de la zone de Goma.' });
        }

        const insertResult = await pool.query(
            `INSERT INTO alerts (user_id, type_id, description, latitude, longitude, accuracy, address, quartier, avenue, photo, priority)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
            [req.user.id, type_id, description, latitude, longitude, accuracy, address, quartier, avenue, photo, priority || 3]
        );

        const alertId = insertResult.rows[0].id;

        // Get alert with type info
        const alertResult = await pool.query(
            `SELECT a.*, u.nom, u.prenom, u.telephone, et.nom as type_nom, et.icone, et.couleur
             FROM alerts a
             JOIN users u ON a.user_id = u.id
             JOIN emergency_types et ON a.type_id = et.id
             WHERE a.id = $1`,
            [alertId]
        );

        if (alertResult.rows.length > 0) {
            io.emit('new-alert', alertResult.rows[0]);
            emitNotificationCounts();
        }

        res.json({
            message: 'Alerte creee avec succes',
            alertId
        });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la creation de l\'alerte' });
    }
});

// Get citizen's alerts
app.get('/api/alerts/my', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT a.*, et.nom as type_nom, et.icone, et.couleur
             FROM alerts a
             JOIN emergency_types et ON a.type_id = et.id
             WHERE a.user_id = $1
             ORDER BY a.created_at DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Delete alert (admin can delete any alert, citizen can only delete their own alerts)
app.delete('/api/alerts/:id', authenticateToken, async (req, res) => {
    try {
        const alertId = parseInt(req.params.id);
        
        // Check if the alert belongs to the user only if they are not admin or security center
        const isAdminOrSecurityCenter = req.user.role === 'admin' || req.user.role === 'centre_securite';
        
        // First check if the alert exists
        const alertResult = await pool.query('SELECT user_id FROM alerts WHERE id = $1', [alertId]);
        if (alertResult.rows.length === 0) {
            return res.status(404).json({ error: 'Alerte non trouvee' });
        }
        
        // If not admin or security center, check if the alert belongs to the user
        if (!isAdminOrSecurityCenter && alertResult.rows[0].user_id !== req.user.id) {
            return res.status(403).json({ error: 'Non autorise' });
        }
        
        // Delete the alert
        await pool.query('DELETE FROM alerts WHERE id = $1', [alertId]);
        res.json({ message: 'Alerte supprimee avec succes' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});

// =====================
// CHAT API
// =====================

// Get chat messages (for citizen: get messages between user and admin)
app.get('/api/chat/messages', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM chat_messages 
             WHERE sender_id = $1 OR receiver_id = $1
             ORDER BY created_at ASC`,
            [req.user.id]
        );
        res.json(result.rows || []);
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Send chat message
app.post('/api/chat/messages', authenticateToken, async (req, res) => {
    try {
        const { message, receiver_id } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message requis' });
        }
        
        // Get admin user id if no receiver specified
        let receiverId = receiver_id;
        if (!receiverId) {
            const adminResult = await pool.query('SELECT id FROM users WHERE role IN ($1, $2) LIMIT 1', ['admin', 'centre_securite']);
            if (adminResult.rows.length === 0) {
                return res.status(500).json({ error: 'Admin non trouve' });
            }
            receiverId = adminResult.rows[0].id;
        }
        
        const insertResult = await pool.query(
            `INSERT INTO chat_messages (sender_id, receiver_id, message, is_from_admin)
             VALUES ($1, $2, $3, 0) RETURNING id`,
            [req.user.id, receiverId, message]
        );
        
        io.emit('chat-message', {
            id: insertResult.rows[0].id,
            sender_id: req.user.id,
            receiver_id: receiverId,
            message: message,
            created_at: new Date().toISOString()
        });
        emitNotificationCounts();
        
        res.json({ message: 'Message envoye', id: insertResult.rows[0].id });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de l\'envoi' });
    }
});

// Send voice message (citizen)
app.post('/api/chat/voice', authenticateToken, uploadVoice.single('audio'), async (req, res) => {
    try {
        console.log('Voice upload request received');
        console.log('File:', req.file);
        console.log('Body:', req.body);
        
        if (!req.file) {
            return res.status(400).json({ error: 'Audio requis' });
        }

        const user = req.user;
        
        const audioPath = '/uploads/voices/' + path.basename(req.file.path);
        const message = '[Message vocal]';
        
        // Get admin user id
        const adminResult = await pool.query("SELECT id FROM users WHERE role IN ('admin', 'centre_securite') LIMIT 1");
        if (adminResult.rows.length === 0) {
            return res.status(500).json({ error: 'Admin non trouve' });
        }
        
        const insertResult = await pool.query(
            `INSERT INTO chat_messages (sender_id, receiver_id, message, is_from_admin, audio_path)
             VALUES ($1, $2, $3, 0, $4) RETURNING id`,
            [user.id, adminResult.rows[0].id, message, audioPath]
        );
        
        io.emit('chat-message', {
            id: insertResult.rows[0].id,
            sender_id: user.id,
            receiver_id: adminResult.rows[0].id,
            message: message,
            audio_path: audioPath,
            created_at: new Date().toISOString()
        });
        emitNotificationCounts();
        
        res.json({ message: 'Message vocal envoye', id: insertResult.rows[0].id, audioPath: audioPath });
    } catch (error) {
        console.error('Insert error:', error);
        res.status(500).json({ error: 'Erreur lors de l\'envoi' });
    }
});

// Delete chat message (citizen can only delete their own messages)
app.delete('/api/chat/messages/:id', authenticateToken, async (req, res) => {
    try {
        const messageId = parseInt(req.params.id);
        
        const result = await pool.query(
            'DELETE FROM chat_messages WHERE id = $1 AND sender_id = $2',
            [messageId, req.user.id]
        );
        
        if (result.rowCount === 0) {
            return res.status(403).json({ error: 'Vous ne pouvez pas supprimer ce message' });
        }
        
        // Emit event about deleted message
        io.emit('chat-message-deleted', { id: messageId });
        
        res.json({ message: 'Message supprime' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});

// Get all chat messages (admin only)
app.get('/api/chat/all', authenticateToken, requireAdminOrSecurityCenter, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT cm.*, u.nom as sender_nom, u.prenom as sender_prenom
             FROM chat_messages cm
             JOIN users u ON cm.sender_id = u.id
             ORDER BY cm.created_at DESC
             LIMIT 100`
        );
        res.json(result.rows || []);
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Send message from admin
app.post('/api/chat/admin/send', authenticateToken, requireAdminOrSecurityCenter, async (req, res) => {
    try {
        const { user_id, message } = req.body;
        
        if (!user_id || !message) {
            return res.status(400).json({ error: 'Parametres requis' });
        }
        
        const insertResult = await pool.query(
            `INSERT INTO chat_messages (sender_id, receiver_id, message, is_from_admin)
             VALUES ($1, $2, $3, 1) RETURNING id`,
            [req.user.id, user_id, message]
        );
        
        io.emit('chat-message', {
            id: insertResult.rows[0].id,
            sender_id: req.user.id,
            receiver_id: user_id,
            message: message,
            is_from_admin: 1,
            created_at: new Date().toISOString()
        });
        emitNotificationCounts();
        
        res.json({ message: 'Message envoye' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de l\'envoi' });
    }
});

// Send voice message from admin
app.post('/api/chat/admin/voice', authenticateToken, requireAdminOrSecurityCenter, uploadVoice.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Audio requis' });
        }
        
        const user_id = parseInt(req.body.user_id);
        if (!user_id) {
            return res.status(400).json({ error: 'ID utilisateur requis' });
        }
        
        const audioPath = '/uploads/voices/' + path.basename(req.file.path);
        const message = '[Message vocal]';
        
        const insertResult = await pool.query(
            `INSERT INTO chat_messages (sender_id, receiver_id, message, is_from_admin, audio_path)
             VALUES ($1, $2, $3, 1, $4) RETURNING id`,
            [req.user.id, user_id, message, audioPath]
        );
        
        io.emit('chat-message', {
            id: insertResult.rows[0].id,
            sender_id: req.user.id,
            receiver_id: user_id,
            message: message,
            audio_path: audioPath,
            is_from_admin: 1,
            created_at: new Date().toISOString()
        });
        emitNotificationCounts();
        
        res.json({ message: 'Message vocal envoye', audioPath: audioPath });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de l\'envoi' });
    }
});

// Delete chat message (admin can delete any message)
app.delete('/api/chat/admin/messages/:id', authenticateToken, requireAdminOrSecurityCenter, async (req, res) => {
    try {
        const messageId = parseInt(req.params.id);
        
        await pool.query('DELETE FROM chat_messages WHERE id = $1', [messageId]);
        
        // Emit event about deleted message
        io.emit('chat-message-deleted', { id: messageId });
        
        res.json({ message: 'Message supprime' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});



// Get users who have sent chat messages (admin)
app.get('/api/chat/users', authenticateToken, requireAdminOrSecurityCenter, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT DISTINCT 
                u.id, 
                u.nom, 
                u.prenom, 
                u.telephone,
                (SELECT message FROM chat_messages 
                 WHERE sender_id = u.id 
                 ORDER BY created_at DESC LIMIT 1) as last_message,
                (SELECT created_at FROM chat_messages 
                 WHERE sender_id = u.id 
                 ORDER BY created_at DESC LIMIT 1) as last_message_time
            FROM chat_messages cm
            JOIN users u ON cm.sender_id = u.id
            WHERE cm.is_from_admin = 0
            ORDER BY last_message_time DESC`
        );
        res.json(result.rows || []);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la recuperation' });
    }
});

// Get messages for a specific user (admin)
app.get('/api/chat/messages/:userId', authenticateToken, requireAdminOrSecurityCenter, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        
        const result = await pool.query(
            `SELECT cm.*, 
                CASE WHEN cm.is_from_admin = 1 THEN 'admin' ELSE 'citizen' END as sender_type
            FROM chat_messages cm
            WHERE (cm.sender_id = $1 AND cm.receiver_id IN (SELECT id FROM users WHERE role IN ('admin', 'centre_securite')))
               OR (cm.sender_id IN (SELECT id FROM users WHERE role IN ('admin', 'centre_securite')) AND cm.receiver_id = $2)
            ORDER BY cm.created_at ASC`,
            [userId, userId]
        );
        res.json(result.rows || []);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la recuperation' });
    }
});

// Get all alerts (admin and security center)
app.get('/api/alerts', authenticateToken, requireAdminOrSecurityCenter, async (req, res) => {
    try {
        const { status, priority, quartier } = req.query;
        
        let query = `SELECT a.*, u.nom, u.prenom, u.telephone, et.nom as type_nom, et.icone, et.couleur, agent.role as assigned_role
                     FROM alerts a
                     JOIN users u ON a.user_id = u.id
                     JOIN emergency_types et ON a.type_id = et.id
                     LEFT JOIN users agent ON a.assigned_to = agent.id
                     WHERE 1=1`;
        
        const params = [];
        let paramIndex = 1;
        
        if (status) {
            query += ` AND a.status = ${paramIndex}`;
            params.push(status);
            paramIndex++;
        }
        if (priority) {
            query += ` AND a.priority <= ${paramIndex}`;
            params.push(priority);
            paramIndex++;
        }
        if (quartier) {
            query += ` AND a.quartier = ${paramIndex}`;
            params.push(quartier);
            paramIndex++;
        }
        
        query += ' ORDER BY a.priority ASC, a.created_at DESC';

        const result = await pool.query(query, params);
        res.json(result.rows || []);
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get alerts assigned to a specific poste
app.get('/api/alerts/poste/:posteId', async (req, res) => {
    try {
        const { posteId } = req.params;

        const posteToRole = {
            'poste1': 'police',
            'poste2': 'pompiers',
            'poste3': 'ambulance',
            'poste4': 'protection civile',
            'poste5': 'police',
            'poste6': 'centre_securite',
            'poste7': 'admin',
            'poste8': 'admin'
        };

        let assignedUserId = null;
        const role = posteToRole[posteId];
        if (role) {
            const userResult = await pool.query(
                'SELECT id FROM users WHERE role = $1 ORDER BY id ASC LIMIT 1',
                [role]
            );
            if (userResult.rows.length > 0) {
                assignedUserId = userResult.rows[0].id;
            }
        }

        if (!assignedUserId) {
            return res.json([]);
        }

        const query = `SELECT a.*, u.nom, u.prenom, u.telephone, et.nom as type_nom, et.icone, et.couleur
                     FROM alerts a
                     JOIN users u ON a.user_id = u.id
                     JOIN emergency_types et ON a.type_id = et.id
                     WHERE a.assigned_to = $1
                     ORDER BY a.priority ASC, a.created_at DESC`;

        const result = await pool.query(query, [assignedUserId]);
        res.json(result.rows || []);
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update alert status (admin and security center)
app.put('/api/alerts/:id/status', authenticateToken, requireAdminOrSecurityCenter, async (req, res) => {
    try {
        let { status } = req.body;
        const alertId = parseInt(req.params.id);
        
        // Trim and validate status
        if (status) {
            status = status.trim().toLowerCase();
            
            // Convert frontend values to database values
            const statusMap = {
                'en_cours': 'in_progress',
                'en cours': 'in_progress',
                'resolu': 'resolved',
                'résolu': 'resolved'
            };
            
            if (statusMap[status]) {
                status = statusMap[status];
            }
        }
        
        const validStatuses = ['active', 'in_progress', 'resolved', 'cancelled', 'false_alarm'];
        
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ 
                error: 'Status invalide. Valeurs acceptées: ' + validStatuses.join(', ')
            });
        }

        // Check if alert exists
        const alertCheck = await pool.query('SELECT id FROM alerts WHERE id = $1', [alertId]);
        if (alertCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Alerte non trouvee' });
        }

        await pool.query(
            `UPDATE alerts SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [status, alertId]
        );

        io.emit('alert-updated', { id: alertId, status });
        emitNotificationCounts();

        res.json({ message: 'Statut mis a jour', status });
    } catch (error) {
        console.error('Error updating alert status:', error);
        res.status(500).json({ error: 'Erreur lors de la mise a jour: ' + error.message });
    }
});

// Assign alert (admin and security center)
app.put('/api/alerts/:id/assign', authenticateToken, requireAdminOrSecurityCenter, async (req, res) => {
    try {
        const { assigned_to } = req.body;
        let assignedUserId = null;

        if (assigned_to) {
            if (Number.isInteger(assigned_to)) {
                const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [assigned_to]);
                if (userCheck.rows.length > 0) {
                    assignedUserId = assigned_to;
                }
            } else {
                const posteToRole = {
                    'poste1': 'police',
                    'poste2': 'pompiers',
                    'poste3': 'ambulance',
                    'poste4': 'protection civile',
                    'poste5': 'police',
                    'poste6': 'centre_securite',
                    'poste7': 'admin',
                    'poste8': 'admin',
                    'police': 'police',
                    'pompiers': 'pompiers',
                    'ambulance': 'ambulance',
                    'protection civile': 'protection civile',
                    'centre_securite': 'centre_securite'
                };

                const role = posteToRole[assigned_to] || assigned_to;
                const userResult = await pool.query(
                    'SELECT id FROM users WHERE role = $1 ORDER BY id ASC LIMIT 1',
                    [role]
                );
                if (userResult.rows.length > 0) {
                    assignedUserId = userResult.rows[0].id;
                }
            }
        }

        await pool.query(
            'UPDATE alerts SET assigned_to = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [assignedUserId, req.params.id]
        );

        io.emit('alert-updated', { id: parseInt(req.params.id), assigned_to: assignedUserId });

        res.json({ message: 'Alerte assignee', assigned_to: assignedUserId });
    } catch (error) {
        console.error('Assign error:', error);
        res.status(500).json({ error: 'Erreur lors de l\'assignation' });
    }
});

// =====================
// ROUTES - STATISTICS
// =====================

app.get('/api/stats', authenticateToken, requireAdminOrSecurityCenter, async (req, res) => {
    try {
        const stats = {};
        
        console.log('Stats API called');
        
        // Use PostgreSQL with ::int casting
        const totalResult = await pool.query('SELECT COUNT(*)::int as total FROM alerts');
        stats.total = totalResult.rows[0]?.total || 0;
        
        const activeResult = await pool.query("SELECT COUNT(*)::int as active FROM alerts WHERE LOWER(status) = 'active' OR status IS NULL");
        stats.active = activeResult.rows[0]?.active || 0;
        
        const inProgressResult = await pool.query("SELECT COUNT(*)::int as in_progress FROM alerts WHERE LOWER(status) = 'in_progress'");
        stats.in_progress = inProgressResult.rows[0]?.in_progress || 0;
        
        const resolvedResult = await pool.query("SELECT COUNT(*)::int as resolved FROM alerts WHERE LOWER(status) = 'resolved'");
        stats.resolved = resolvedResult.rows[0]?.resolved || 0;
        
        const byTypeResult = await pool.query(
            `SELECT et.nom, COUNT(*)::int as count 
             FROM alerts a 
             JOIN emergency_types et ON a.type_id = et.id 
             GROUP BY et.nom`
        );
        stats.by_type = byTypeResult.rows || [];
        res.json(stats);
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get alerts by quartier and type (for histogram/diagram)
app.get('/api/stats/quartier', authenticateToken, requireAdminOrSecurityCenter, async (req, res) => {
    try {
        // Get alerts grouped by quartier and type
        const result = await pool.query(
            `SELECT 
                COALESCE(a.quartier, 'Non specifie') as quartier,
                et.nom as type_nom,
                et.couleur as type_couleur,
                COUNT(*)::int as count
             FROM alerts a
             JOIN emergency_types et ON a.type_id = et.id
             GROUP BY a.quartier, et.nom, et.couleur
             ORDER BY quartier, count DESC`
        );
        
        // Also get summary by quartier
        const quartierSummary = await pool.query(
            `SELECT 
                COALESCE(quartier, 'Non specifie') as quartier,
                COUNT(*)::int as total
             FROM alerts
             GROUP BY quartier
             ORDER BY total DESC`
        );
        
        res.json({
            by_quartier_type: result.rows,
            by_quartier: quartierSummary.rows
        });
    } catch (error) {
        console.error('Stats quartier error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get unread alerts count for admin/security center
app.get('/api/alerts/unread/count', authenticateToken, requireAdminOrSecurityCenter, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT COUNT(*)::int as count FROM alerts WHERE LOWER(status) = 'active' OR status IS NULL"
        );
        res.json({ count: result.rows[0]?.count || 0 });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get unread messages count
app.get('/api/chat/unread/count', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT COUNT(*)::int as count FROM chat_messages WHERE receiver_id = $1 AND is_read = 0",
            [req.user.id]
        );
        res.json({ count: result.rows[0]?.count || 0 });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Mark messages as read
app.put('/api/chat/messages/read', authenticateToken, async (req, res) => {
    try {
        await pool.query(
            `UPDATE chat_messages SET is_read = 1 WHERE receiver_id = $1 AND is_read = 0`,
            [req.user.id]
        );
        res.json({ message: 'Messages marques comme lus' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// =====================
// ROUTES - USER PROFILE
// =====================

app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, nom, prenom, telephone, email, role, quartier, avenue, latitude, longitude, photo_profil, two_fa_enabled, created_at FROM users WHERE id = $1',
            [req.user.id]
        );
        const user = result.rows[0];
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouve' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/api/user/role', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT role FROM users WHERE id = $1', [req.user.id]);
        const user = result.rows[0];
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouve' });
        }
        res.json({ role: user.role });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.put('/api/user/profile', authenticateToken, upload.single('photo'), async (req, res) => {
    try {
        const { nom, prenom, email, quartier, avenue, latitude, longitude } = req.body;
        const photo_profil = req.file ? '/uploads/profiles/' + req.file.filename : req.body.existing_photo;

        await pool.query(
            `UPDATE users SET nom = $1, prenom = $2, email = $3, quartier = $4, avenue = $5, latitude = $6, longitude = $7, photo_profil = $8
             WHERE id = $9`,
            [nom, prenom, email, quartier, avenue, latitude, longitude, photo_profil, req.user.id]
        );
        res.json({ message: 'Profil mis a jour' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la mise a jour' });
    }
});

// =====================
// SOCKET.IO
// =====================

io.on('connection', (socket) => {
    console.log('Client connecte:', socket.id);

    socket.on('join-room', (room) => {
        socket.join(room);
    });

    socket.on('ping-server', () => {
        socket.emit('pong-server');
    });
    
    socket.on('reinforcement-call', (data) => {
        console.log('Reinforcement call received:', data);
        io.to('security-center').emit('reinforcement-call', data);
        io.emit('reinforcement-call', data);
    });

    socket.on('disconnect', () => {
        console.log('Client deconnecte:', socket.id);
    });
});

// Emit notification counts to admin/security center
async function emitNotificationCounts() {
    try {
        const alertsResult = await pool.query(
            "SELECT COUNT(*)::int as count FROM alerts WHERE LOWER(status) = 'active' OR status IS NULL"
        );
        const alertCount = alertsResult.rows[0]?.count || 0;

        const messagesResult = await pool.query(
            "SELECT COUNT(*)::int as count FROM chat_messages WHERE is_read = 0"
        );
        const messageCount = messagesResult.rows[0]?.count || 0;

        io.emit('notification-counts', {
            alerts: alertCount,
            messages: messageCount
        });
    } catch (error) {
        console.error('Error emitting notification counts:', error);
    }
}

// =====================
// PAGES
// =====================

// app.get('/', (req, res) => {
//     res.sendFile(path.join(__dirname, '..', 'frontend', 'public', 'index.html'));
// });

// app.get('/security-center', (req, res) => {
//     res.sendFile(path.join(__dirname, '..', 'frontend', 'public', 'security-center.html'));
// });

// app.get('/poste', (req, res) => {
//     res.sendFile(path.join(__dirname, '..', 'frontend', 'public', 'poste.html'));
// });

// app.get('/admin', (req, res) => {
//     res.sendFile(path.join(__dirname, '..', 'frontend', 'public', 'admin.html'));
// });
app.get('/',(req, res)=>{
    res.status(200).json({
        success:true,
        message:'Backend Goma secure '
    });
});

// =====================
// ROUTES - SYSTEM (Admin only)
// =====================

// Get database info
app.get('/api/system/database', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const tableCountResult = await pool.query(
            "SELECT COUNT(*)::int as count FROM information_schema.tables WHERE table_schema = 'public'"
        );
        
        const usersCount = await pool.query('SELECT COUNT(*)::int as count FROM users');
        const alertsCount = await pool.query('SELECT COUNT(*)::int as count FROM alerts');
        const messagesCount = await pool.query('SELECT COUNT(*)::int as count FROM chat_messages');
        const emergencyTypesCount = await pool.query('SELECT COUNT(*)::int as count FROM emergency_types');
        
        res.json({
            type: 'PostgreSQL',
            tables: tableCountResult.rows[0]?.count || 0,
            users: usersCount.rows[0]?.count || 0,
            alerts: alertsCount.rows[0]?.count || 0,
            messages: messagesCount.rows[0]?.count || 0,
            emergencyTypes: emergencyTypesCount.rows[0]?.count || 0
        });
    } catch (error) {
        console.error('Database info error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get server info
app.get('/api/system/server', authenticateToken, requireAdmin, (req, res) => {
    const os = require('os');
    const memoryUsage = process.memoryUsage();
    
    res.json({
        port: process.env.PORT || 3000,
        environment: process.env.NODE_ENV || 'production',
        uptime: Math.floor(process.uptime()),
        memoryUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        memoryTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        cpuCount: os.cpus().length
    });
});

// Get storage and file stats from database
app.get('/api/system/storage', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const photosResult = await pool.query(
            "SELECT COUNT(*)::int as count FROM alerts WHERE photo IS NOT NULL AND photo != ''"
        );
        const voicesResult = await pool.query(
            "SELECT COUNT(*)::int as count FROM chat_messages WHERE audio_path IS NOT NULL AND audio_path != ''"
        );
        
        const totalPhotos = photosResult.rows[0]?.count || 0;
        const totalVoices = voicesResult.rows[0]?.count || 0;
        
        res.json({ 
            photos: totalPhotos,
            voices: totalVoices,
            totalFiles: totalPhotos + totalVoices,
            note: 'Stockage fichier non disponible sur Render'
        });
    } catch (error) {
        console.error('Storage info error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get socket connections and real-time stats
app.get('/api/system/socket', authenticateToken, requireAdmin, async (req, res) => {
    const connections = io.engine ? io.engine.clientsCount : 0;
    
    try {
        const activeAlertsResult = await pool.query(
            "SELECT COUNT(*)::int as count FROM alerts WHERE LOWER(status) = 'active' OR status IS NULL"
        );
        const unreadMessagesResult = await pool.query(
            "SELECT COUNT(*)::int as count FROM chat_messages WHERE is_read = 0"
        );
        
        res.json({
            connections: connections,
            activeAlerts: activeAlertsResult.rows[0]?.count || 0,
            unreadMessages: unreadMessagesResult.rows[0]?.count || 0
        });
    } catch (error) {
        console.error('Socket stats error:', error);
        res.json({
            connections: connections,
            activeAlerts: 'N/A',
            unreadMessages: 'N/A'
        });
    }
});

// Backup database
app.post('/api/system/backup', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // For PostgreSQL, we'll return a message indicating backup should be done via pg_dump
        res.json({ 
            message: 'Pour PostgreSQL, utilisez pg_dump pour sauvegarder la base de données',
            command: 'pg_dump -U postgres -d goma_security > backup.sql'
        });
    } catch (error) {
        res.status(500).json({ error: 'Erreur de sauvegarde' });
    }
});

// Cleanup unused files
app.post('/api/system/cleanup', authenticateToken, requireAdmin, async (req, res) => {
    const fs = require('fs');
    const path = require('path');
    
    const uploadsDir = path.join(__dirname, 'uploads');
    let deleted = 0;
    
    try {
        // Get all photo paths from alerts
        const alertsResult = await pool.query('SELECT photo FROM alerts WHERE photo IS NOT NULL');
        const usedPhotos = new Set(alertsResult.rows.map(a => a.photo));
        
        // Get all voice paths from chat messages
        const messagesResult = await pool.query('SELECT audio_path FROM chat_messages WHERE audio_path IS NOT NULL');
        const usedVoices = new Set(messagesResult.rows.map(m => m.audio_path));
        
        // Clean profiles directory
        const profilesDir = path.join(uploadsDir, 'profiles');
        if (fs.existsSync(profilesDir)) {
            const files = fs.readdirSync(profilesDir);
            files.forEach(file => {
                if (file !== '.gitkeep') {
                    const filePath = `/uploads/profiles/${file}`;
                    if (!usedPhotos.has(filePath)) {
                        fs.unlinkSync(path.join(profilesDir, file));
                        deleted++;
                    }
                }
            });
        }
        
        // Clean voices directory
        const voicesDir = path.join(uploadsDir, 'voices');
        if (fs.existsSync(voicesDir)) {
            const files = fs.readdirSync(voicesDir);
            files.forEach(file => {
                if (file !== '.gitkeep') {
                    const filePath = `/uploads/voices/${file}`;
                    if (!usedVoices.has(filePath)) {
                        fs.unlinkSync(path.join(voicesDir, file));
                        deleted++;
                    }
                }
            });
        }
        
        res.json({ deleted });
    } catch (error) {
        res.status(500).json({ error: 'Erreur de nettoyage' });
    }
});

// Get logs
app.get('/api/system/logs', authenticateToken, requireAdmin, (req, res) => {
    // In a real application, you would read from a log file
    // For now, return a placeholder
    res.send('Logs non disponibles dans cette version');
});

// Get all users (admin only)
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, nom, prenom, telephone, email, role, quartier, avenue, two_fa_enabled, created_at FROM users ORDER BY created_at DESC'
        );
        res.json(result.rows || []);
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Create user (admin only)
app.post('/api/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { nom, prenom, telephone, email, password, role, quartier, avenue } = req.body;
        
        if (!nom || !prenom || !telephone || !password) {
            return res.status(400).json({ error: 'Nom, prenom, telephone et mot de passe requis' });
        }
        
        if (role && !validateRole(role)) {
            return res.status(400).json({ error: 'Role invalide. Roles valides: ' + VALID_ROLES.join(', ') });
        }
        
        // Check if telephone already exists
        const existingUser = await pool.query('SELECT id FROM users WHERE telephone = $1', [telephone]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Ce numero de telephone existe deja' });
        }
        
        const password_hash = await bcrypt.hash(password, 10);
        
        const result = await pool.query(
            `INSERT INTO users (nom, prenom, telephone, email, password_hash, role, quartier, avenue)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, nom, prenom, telephone, role`,
            [nom, prenom, telephone, email, password_hash, role || 'citoyen', quartier, avenue]
        );
        
        res.status(201).json({ message: 'Utilisateur cree avec succes', user: result.rows[0] });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Erreur lors de la creation de l\'utilisateur' });
    }
});

// Update user (admin only)
app.put('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { nom, prenom, email, role, quartier } = req.body;
        const userId = req.params.id;
        
        // Validate role if provided
        if (role && !validateRole(role)) {
            return res.status(400).json({ error: 'Role invalide. Roles valides: ' + VALID_ROLES.join(', ') });
        }
        
        await pool.query(
            'UPDATE users SET nom = $1, prenom = $2, email = $3, role = $4, quartier = $5 WHERE id = $6',
            [nom, prenom, email, role, quartier, userId]
        );

        const updatedUser = await pool.query(
            'SELECT id, nom, prenom, telephone, email, role, quartier FROM users WHERE id = $1',
            [userId]
        );
        const user = updatedUser.rows[0];

        let newToken = null;
        if (req.user.id == userId) {
            newToken = jwt.sign(
                { id: user.id, telephone: user.telephone, role: user.role },
                process.env.JWT_SECRET || 'default_secret'
            );
        }

        res.json({
            message: 'Utilisateur mis a jour',
            user,
            ...(newToken && { token: newToken, redirectTo: ROLE_REDIRECTS[user.role] || '/' })
        });
    } catch (error) {
        res.status(500).json({ error: 'Erreur de mise a jour' });
    }
});

// Delete user (admin only)
app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Don't allow deleting admin
        const userResult = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
        const user = userResult.rows[0];
        if (user && user.role === 'admin') {
            return res.status(403).json({ error: 'Impossible de supprimer un administrateur' });
        }
        
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);
        res.json({ message: 'Utilisateur supprime' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur de suppression' });
    }
});

// Change password
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
        const user = result.rows[0];
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouve' });
        }
        
        const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
        }
        
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        
        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPasswordHash, req.user.id]);
        res.json({ message: 'Mot de passe change' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur de mise a jour' });
    }
});

// =====================
// START SERVER
// =====================

const PORT = process.env.PORT || 3000;

// Le serveur démarre dans startApp() après connexion à la DB

module.exports = { app, pool, io };
