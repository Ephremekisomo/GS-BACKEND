# Goma Security - Base de Données

## 📋 Description

Ce dossier contient les scripts d'initialisation et de gestion de la base de données PostgreSQL pour l'application Goma Security.

## 📁 Structure

```
database/
├── init.sql                  # Script SQL SQLite (ancien)
├── init-postgresql.sql       # Script SQL PostgreSQL (nouveau)
├── setup.js                  # Script Node.js pour SQLite (ancien)
├── setup-postgresql.js       # Script Node.js pour PostgreSQL (nouveau)
├── postgresql.js             # Module PostgreSQL
├── backup.js                 # Script de sauvegarde
├── restore.js                # Script de restauration
└── README.md                 # Ce fichier
```

## 🚀 Installation Rapide

### Option 1: Utiliser le script Node.js PostgreSQL (Recommandé)

```bash
# Depuis le dossier gomasecure_backend
node database/setup-postgresql.js
```

### Option 2: Via npm (si configuré)

```bash
npm run db:setup:postgresql
```

### Option 3: Utiliser psql directement

```bash
# Depuis le dossier gomasecure_backend
psql -U postgres -d goma_security -f database/init-postgresql.sql
```

### Option 4: Ancien script SQLite (déprécié)

```bash
# Depuis le dossier gomasecure_backend
node database/setup.js
```

## 📊 Tables Créées

| Table | Description |
|-------|-------------|
| `users` | Utilisateurs de l'application (citoyens, Post_securite, admins, securite_cent) |
| `emergency_types` | Types d'urgences disponibles (agression, accident, etc.) |
| `alerts` | Alertes d'urgence signalées par les utilisateurs |
| `chat_messages` | Messages de chat entre utilisateurs |
| `notifications` | Notifications push envoyées |
| `zones` | Zones géographiques de Goma |
| `alert_zones` | Relation alertes-zones |
| `statistics` | Statistiques quotidiennes |

## 👁️ Vues Créées

| Vue | Description |
|-----|-------------|
| `v_active_alerts` | Alertes actives avec détails utilisateurs et types |
| `v_alerts_by_quartier` | Statistiques par quartier |
| `v_alerts_by_type` | Statistiques par type d'urgence |
| `v_active_users` | Liste des utilisateurs actifs |

## 📇 Index Créés

Les index sont créés pour optimiser les performances sur les colonnes fréquemment utilisées :
- Utilisateurs: téléphone, email, rôle, quartier, localisation
- Alertes: user_id, type_id, status, priorité, date, localisation, quartier
- Chat: sender_id, receiver_id, date, is_read
- Notifications: user_id, is_read, date

## 🔐 Comptes par Défaut

| Rôle | Téléphone | Mot de passe |
|------|-----------|--------------|
| Admin | +243000000000 | admin123 |
| Agent | +243111111111 | admin123 |
| Citoyen | +243222222222 | admin123 |

⚠️ **IMPORTANT**: Changez ces mots de passe en production!

## 🗺️ Zones de Goma Incluses

Le script inclut les zones suivantes :
- Centre-ville
- Birere
- Mabanga Nord
- Mabanga Sud
- Katoyi
- Majengo
- Kyeshero
- Les Volcans
- Mugunga
- Lac Vert

## 🚨 Types d'Urgence Inclus

| Type | Priorité | Couleur |
|------|----------|---------|
| Agression | 1 (Haute) | Rouge |
| Accident | 1 (Haute) | Orange |
| Incendie | 1 (Haute) | Jaune |
| Urgence Médicale | 2 | Violet |
| Activité Suspecte | 3 | Gris |
| Manifestation | 4 | Bleu |
| Catastrophe Naturelle | 1 (Haute) | Turquoise |
| Vol | 2 | Rouge |

## 🔧 Utilisation Avancée

### Réinitialiser la base de données PostgreSQL

```bash
# Supprimer et recréer les tables
node database/setup-postgresql.js
```

### Sauvegarder la base de données PostgreSQL

```bash
pg_dump -U postgres goma_security > backup_$(date +%Y%m%d).sql
```

### Restaurer une sauvegarde PostgreSQL

```bash
psql -U postgres goma_security < backup_20260330.sql
```

### Vérifier l'intégrité PostgreSQL

```bash
psql -U postgres -d goma_security -c "SELECT COUNT(*) FROM users;"
```

## 📝 Requêtes Utiles

### Voir toutes les alertes actives

```sql
SELECT * FROM v_active_alerts;
```

### Statistiques par quartier

```sql
SELECT * FROM v_alerts_by_quartier;
```

### Alertes des dernières 24 heures

```sql
SELECT * FROM alerts 
WHERE created_at >= NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;
```

### Utilisateurs par rôle

```sql
SELECT role, COUNT(*) as count 
FROM users 
GROUP BY role;
```

## 🐛 Dépannage

### Erreur: "connection refused"

```bash
# Vérifier que PostgreSQL est en cours d'exécution
sudo systemctl status postgresql

# Démarrer PostgreSQL si nécessaire
sudo systemctl start postgresql
```

### Erreur: "password authentication failed"

```bash
# Vérifier les variables d'environnement
echo $DATABASE_URL

# Modifier le fichier .env avec les bonnes informations
```

## 📞 Support

Pour toute question ou problème, contactez l'équipe de développement.

---

**Goma Security** - Application de sécurité urbaine pour Goma, RDC 🇨🇩

## 📚 Documentation

- [`GUIDE_MIGRATION.md`](../GUIDE_MIGRATION.md) - Guide de migration vers PostgreSQL
- [`MIGRATION_STEPS.md`](../MIGRATION_STEPS.md) - Étapes de migration détaillées
- [`init-postgresql.sql`](./init-postgresql.sql) - Script SQL PostgreSQL
- [`setup-postgresql.js`](./setup-postgresql.js) - Script d'initialisation PostgreSQL
