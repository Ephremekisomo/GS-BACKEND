-- =============================================
-- Goma Security - Complete Database Script
-- Application de sécurité urbaine pour Goma, RDC
-- =============================================

-- Supprimer les tables existantes (optionnel - pour réinitialisation)
-- DROP TABLE IF EXISTS chat_messages;
-- DROP TABLE IF EXISTS alerts;
-- DROP TABLE IF EXISTS emergency_types;
-- DROP TABLE IF EXISTS users;

-- =============================================
-- TABLE: users
-- Description: Utilisateurs de l'application
-- =============================================
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    telephone TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
   --role TEXT DEFAULT 'citoyen' CHECK(role IN ('citoyen', 'admin', 'poste_securite', 'security_center')),
   role TEXT DEFAULT 'citoyen' CHECK(role IN ('citoyen', 'admin', 'poste_securite', 'centre_securite')),
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
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABLE: emergency_types
-- Description: Types d'urgences disponibles
-- =============================================
CREATE TABLE IF NOT EXISTS emergency_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT UNIQUE NOT NULL,
    icone TEXT NOT NULL,
    couleur TEXT NOT NULL,
    priorite INTEGER NOT NULL DEFAULT 3 CHECK(priorite BETWEEN 1 AND 5),
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABLE: alerts
-- Description: Alertes d'urgence signalées
-- =============================================
CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    resolved_at DATETIME,
    resolution_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (type_id) REFERENCES emergency_types(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================
-- TABLE: chat_messages
-- Description: Messages de chat entre utilisateurs
-- =============================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER,
    message TEXT NOT NULL,
    is_from_admin INTEGER DEFAULT 0,
    audio_path TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================
-- TABLE: notifications
-- Description: Notifications push envoyées
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK(type IN ('info', 'alert', 'warning', 'success')),
    reference_id INTEGER,
    reference_type TEXT,
    is_read INTEGER DEFAULT 0,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- TABLE: zones
-- Description: Zones géographiques de Goma
-- =============================================
CREATE TABLE IF NOT EXISTS zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT UNIQUE NOT NULL,
    description TEXT,
    latitude REAL,
    longitude REAL,
    rayon REAL DEFAULT 1000,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABLE: alert_zones
-- Description: Relation alertes-zones
-- =============================================
CREATE TABLE IF NOT EXISTS alert_zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_id INTEGER NOT NULL,
    zone_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE,
    FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE,
    UNIQUE(alert_id, zone_id)
);

-- =============================================
-- TABLE: statistics
-- Description: Statistiques quotidiennes
-- =============================================
CREATE TABLE IF NOT EXISTS statistics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE UNIQUE NOT NULL,
    total_alerts INTEGER DEFAULT 0,
    active_alerts INTEGER DEFAULT 0,
    resolved_alerts INTEGER DEFAULT 0,
    false_alarms INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    avg_response_time REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- INDEXES - Pour optimiser les performances
-- =============================================

-- Index sur les utilisateurs
CREATE INDEX IF NOT EXISTS idx_users_telephone ON users(telephone);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_quartier ON users(quartier);
CREATE INDEX IF NOT EXISTS idx_users_location ON users(latitude, longitude);

-- Index sur les alertes
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_type_id ON alerts(type_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_priority ON alerts(priority);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_location ON alerts(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_alerts_quartier ON alerts(quartier);
CREATE INDEX IF NOT EXISTS idx_alerts_assigned_to ON alerts(assigned_to);

-- Index sur les messages de chat
CREATE INDEX IF NOT EXISTS idx_chat_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_receiver_id ON chat_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_chat_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_is_read ON chat_messages(is_read);

-- Index sur les notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON notifications(sent_at);

-- Index sur les types d'urgence
CREATE INDEX IF NOT EXISTS idx_emergency_types_priorite ON emergency_types(priorite);
CREATE INDEX IF NOT EXISTS idx_emergency_types_is_active ON emergency_types(is_active);

-- =============================================
-- TRIGGERS - Mise à jour automatique
-- =============================================

-- Trigger pour mettre à jour updated_at sur users
CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger pour mettre à jour updated_at sur alerts
CREATE TRIGGER IF NOT EXISTS update_alerts_timestamp 
AFTER UPDATE ON alerts
BEGIN
    UPDATE alerts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger pour mettre à jour resolved_at quand le statut change
CREATE TRIGGER IF NOT EXISTS update_alert_resolved_at
AFTER UPDATE OF status ON alerts
WHEN NEW.status = 'resolved' AND OLD.status != 'resolved'
BEGIN
    UPDATE alerts SET resolved_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- =============================================
-- VIEWS - Vues pour les requêtes fréquentes
-- =============================================

-- Vue pour les alertes actives avec détails
CREATE VIEW IF NOT EXISTS v_active_alerts AS
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
ORDER BY a.priority ASC, a.created_at DESC;

-- Vue pour les statistiques par quartier
CREATE VIEW IF NOT EXISTS v_alerts_by_quartier AS
SELECT 
    quartier,
    COUNT(*) AS total_alerts,
    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_alerts,
    SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolved_alerts,
    AVG(CASE WHEN resolved_at IS NOT NULL 
        THEN (julianday(resolved_at) - julianday(created_at)) * 24 * 60 
        ELSE NULL END) AS avg_response_time_minutes
FROM alerts
WHERE quartier IS NOT NULL
GROUP BY quartier
ORDER BY total_alerts DESC;

-- Vue pour les statistiques par type d'urgence
CREATE VIEW IF NOT EXISTS v_alerts_by_type AS
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
ORDER BY total_alerts DESC;

-- Vue pour les utilisateurs actifs
CREATE VIEW IF NOT EXISTS v_active_users AS
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
ORDER BY last_login DESC;

-- =============================================
-- DEFAULT DATA - Données par défaut
-- =============================================

-- Insérer les types d'urgence par défaut
INSERT OR IGNORE INTO emergency_types (nom, icone, couleur, priorite, description) VALUES
    ('Agression', 'fa-user-graduate', '#e74c3c', 1, 'Agression physique ou verbale'),
    ('Accident', 'fa-car-crash', '#e67e22', 1, 'Accident de la route ou autre'),
    ('Incendie', 'fa-fire', '#f39c12', 1, 'Début d''incendie ou feu'),
    ('Urgence Médicale', 'fa-heartbeat', '#9b59b6', 2, 'Urgence médicale nécessitant une intervention'),
    ('Activité Suspecte', 'fa-user-secret', '#7f8c8d', 3, 'Activité suspecte ou suspect'),
    ('Manifestation', 'fa-users', '#3498db', 4, 'Manifestation ou rassemblement'),
    ('Catastrophe Naturelle', 'fa-hurricane', '#1abc9c', 1, 'Inondation, tremblement de terre, etc.'),
    ('Vol', 'fa-mask', '#e74c3c', 2, 'Vol ou tentative de vol');

-- Insérer les zones par défaut de Goma
INSERT OR IGNORE INTO zones (nom, description, latitude, longitude, rayon) VALUES
    ('Centre-ville', 'Centre commercial et administratif', -1.6793, 29.2286, 2000),
    ('Birere', 'Quartier de Birere', -1.6850, 29.2350, 1500),
    ('Mabanga Nord', 'Quartier Mabanga Nord', -1.6700, 29.2200, 1500),
    ('Mabanga Sud', 'Quartier Mabanga Sud', -1.6900, 29.2200, 1500),
    ('Katoyi', 'Quartier de Katoyi', -1.6650, 29.2400, 1500),
    ('Majengo', 'Quartier de Majengo', -1.6750, 29.2500, 1500),
    ('Kyeshero', 'Quartier de Kyeshero', -1.6600, 29.2150, 1500),
    ('Les Volcans', 'Quartier des Volcans', -1.6550, 29.2300, 1500),
    ('Mugunga', 'Quartier de Mugunga', -1.7000, 29.2100, 2000),
    ('Lac Vert', 'Zone du Lac Vert', -1.7100, 29.2000, 2500);

-- Insérer l'utilisateur admin par défaut
-- Mot de passe: admin123 (hashé avec bcrypt)
INSERT INTO users (nom, prenom, telephone, email, password_hash, role, quartier, is_active) VALUES
    ('Admin', 'Goma Security', '+243000000000', 'admin@gomasecurity.cd', 
     '$2a$10$rQZ8kHp0rVX1JcXxQz1ZxOQZ8kHp0rVX1JcXxQz1ZxOQZ8kHp0rVX', 
     'admin', 'Centre-ville', 1);
     on conflict do nothing;

-- Insérer un agent de test
INSERT INTO users (nom, prenom, telephone, email, password_hash, role, quartier, is_active) VALUES
    ('Agent', 'Test', '+243111111111', 'agent@gomasecurity.cd', 
     '$2a$10$rQZ8kHp0rVX1JcXxQz1ZxOQZ8kHp0rVX1JcXxQz1ZxOQZ8kHp0rVX', 
     'poste_securite', 'Centre-ville', 1);
     ON CONFLICT DO NOTHING;

-- Insérer un citoyen de test
INSERT INTO users (nom, prenom, telephone, email, password_hash, role, quartier, is_active)
VALUES
    ('Citoyen', 'Test', '+243222222222', 'citoyen@gomasecurity.cd',
     '$2a$10$rQZ8kHp0rVX1JcXxQz1ZxOQZ8kHp0rVX1JcXxQz1ZxOQZ8kHp0rVX',
     'citoyen', 'Birere', 1)
ON CONFLICT DO NOTHING;

-- =============================================
-- STORED PROCEDURES (SQLite ne supporte pas les procédures)
-- Mais voici des requêtes utiles pour l'application
-- =============================================

-- Requête pour obtenir les alertes dans un rayon donné
-- SELECT * FROM alerts 
-- WHERE (latitude BETWEEN ? AND ?) 
-- AND (longitude BETWEEN ? AND ?)
-- AND status = 'active'
-- ORDER BY priority ASC, created_at DESC;

-- Requête pour obtenir les statistiques du jour
-- SELECT 
--     COUNT(*) as total_alerts,
--     SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_alerts,
--     SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_alerts,
--     AVG(CASE WHEN resolved_at IS NOT NULL 
--         THEN (julianday(resolved_at) - julianday(created_at)) * 24 * 60 
--         ELSE NULL END) as avg_response_time
-- FROM alerts
-- WHERE date(created_at) = date('now');

-- =============================================
-- FIN DU SCRIPT
-- =============================================
