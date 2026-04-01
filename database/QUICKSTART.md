# 🚀 Démarrage Rapide - Base de Données Goma Security

## Installation en 3 étapes

### Étape 1: Installer les dépendances

```bash
cd gomasecure_backend
npm install
```

### Étape 2: Configurer l'environnement

```bash
# Copier le fichier d'exemple
cp .env.example .env

# Modifier les valeurs dans .env si nécessaire
# (optionnel pour le développement local)
```

### Étape 3: Initialiser la base de données

```bash
npm run db:setup
```

## ✅ Vérification

Après l'initialisation, vous devriez voir:

```
==================================================
🚀 GOMA SECURITY - INITIALISATION DE LA BASE DE DONNÉES
==================================================

📦 Connexion à la base de données...
✅ Connecté à: ./goma_security.db

📄 Lecture du script SQL...
✅ Script SQL chargé (XXXX caractères)

🔄 Exécution du script SQL...
✅ Script SQL exécuté avec succès

🔐 Mise à jour des mots de passe par défaut...
✅ X mots de passe mis à jour

🔍 Vérification des tables...
✅ Tables créées:
   - alert_zones
   - alerts
   - chat_messages
   - emergency_types
   - notifications
   - statistics
   - users
   - zones

🔍 Vérification des vues...
✅ Vues créées:
   - v_active_alerts
   - v_alerts_by_quartier
   - v_alerts_by_type
   - v_active_users

🔍 Vérification des index...
✅ Index créés:
   - idx_alerts_assigned_to (alerts)
   - idx_alerts_created_at (alerts)
   - idx_alerts_location (alerts)
   - idx_alerts_priority (alerts)
   - idx_alerts_quartier (alerts)
   - idx_alerts_status (alerts)
   - idx_alerts_type_id (alerts)
   - idx_alerts_user_id (alerts)
   - idx_chat_created_at (chat_messages)
   - idx_chat_is_read (chat_messages)
   - idx_chat_receiver_id (chat_messages)
   - idx_chat_sender_id (chat_messages)
   - idx_emergency_types_is_active (emergency_types)
   - idx_emergency_types_priorite (emergency_types)
   - idx_notifications_is_read (notifications)
   - idx_notifications_sent_at (notifications)
   - idx_notifications_user_id (notifications)
   - idx_users_email (users)
   - idx_users_location (users)
   - idx_users_quartier (users)
   - idx_users_role (users)
   - idx_users_telephone (users)

📊 Comptage des enregistrements...
   - users: 3 enregistrement(s)
   - emergency_types: 10 enregistrement(s)
   - alerts: 0 enregistrement(s)
   - chat_messages: 0 enregistrement(s)
   - notifications: 0 enregistrement(s)
   - zones: 10 enregistrement(s)

==================================================
📋 INFORMATIONS DE CONNEXION
==================================================
📁 Base de données: ./goma_security.db

👤 Comptes par défaut:
   Admin:    +243000000000 / admin123
   Agent:    +243111111111 / admin123
   Citoyen:  +243222222222 / admin123

⚠️  IMPORTANT: Changez les mots de passe en production!
==================================================

✅ Initialisation terminée avec succès!

🔒 Fermeture de la connexion...
✅ Connexion fermée
```

## 🎯 Prochaines Étapes

1. **Démarrer le serveur**:
   ```bash
   npm start
   ```

2. **Accéder à l'API**:
   ```
   http://localhost:3000
   ```

3. **Tester la connexion**:
   ```bash
   curl http://localhost:3000/health
   ```

## 🔄 Commandes Utiles

| Commande | Description |
|----------|-------------|
| `npm run db:setup` | Initialiser la base de données |
| `npm run db:reset` | Réinitialiser la base de données |
| `npm start` | Démarrer le serveur |
| `npm run dev` | Démarrer en mode développement |

## 🆘 Problèmes Courants

### Erreur: "Cannot find module 'sqlite3'"

```bash
npm install sqlite3
```

### Erreur: "database is locked"

```bash
# Arrêter tous les processus utilisant la base
# Puis réessayer
npm run db:setup
```

### Erreur: "permission denied"

```bash
# Sur Linux/Mac
chmod +x database/setup.js
```

## 📞 Support

En cas de problème, consultez:
- [README.md](./README.md) - Documentation complète
- [server.js](../server.js) - Code du serveur
- [.env.example](../.env.example) - Configuration

---

**Goma Security** 🇨🇩
