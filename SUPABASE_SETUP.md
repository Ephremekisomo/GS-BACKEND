# Configuration Supabase - Goma Security

## ✅ Configuration terminée avec succès

Votre base de données Supabase PostgreSQL est maintenant configurée et initialisée.

---

## 📋 Informations de connexion

- **Host**: `db.xouuaudwfjtlaedocvin.supabase.co`
- **Port**: `5432`
- **Database**: `postgres`
- **User**: `postgres`
- **SSL**: Activé (requis pour Supabase)

---

## 🗄️ Tables créées

| Table | Description |
|-------|-------------|
| `users` | Utilisateurs de l'application |
| `emergency_types` | Types d'urgences disponibles |
| `alerts` | Alertes d'urgence signalées |
| `chat_messages` | Messages de chat entre utilisateurs |
| `notifications` | Notifications push envoyées |
| `zones` | Zones géographiques de Goma |
| `alert_zones` | Relation alertes-zones |
| `statistics` | Statistiques quotidiennes |

---

## 👤 Comptes par défaut

| Rôle | Téléphone | Mot de passe |
|------|-----------|--------------|
| Admin | +243000000000 | admin123 |
| Agent | +243111111111 | admin123 |
| Citoyen | +243222222222 | admin123 |

⚠️ **IMPORTANT**: Changez ces mots de passe en production !

---

## 🚀 Démarrer le serveur

```bash
# Option 1: Utiliser npm
npm start

# Option 2: Utiliser node directement
node server.js
```

Le serveur démarrera sur le port 3000 (ou le port défini dans `.env`).

---

## 📊 Données par défaut

### Types d'urgence (8 types)
- Agression (priorité 1)
- Accident (priorité 1)
- Incendie (priorité 1)
- Catastrophe Naturelle (priorité 1)
- Urgence Médicale (priorité 2)
- Vol (priorité 2)
- Activité Suspecte (priorité 3)
- Manifestation (priorité 4)

### Zones de Goma (10 zones)
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

---

## 🔧 Fichiers de configuration

### `.env`
Fichier de configuration principal avec toutes les variables d'environnement.

### `database/init-supabase.js`
Script d'initialisation optimisé pour Supabase. Peut être réexécuté pour réinitialiser la base de données.

### `database/postgresql.js`
Module de connexion à PostgreSQL utilisé par le serveur.

---

## 🛠️ Commandes utiles

### Tester la connexion
```bash
node test-connection.js
```

### Vérifier la configuration
```bash
node test-server.js
```

### Réinitialiser la base de données
```bash
node database/init-supabase.js
```

### Sauvegarder la base de données
```bash
node database/backup.js
```

### Restaurer la base de données
```bash
node database/restore.js <fichier_backup>
```

---

## 📝 Notes importantes

1. **SSL requis**: Supabase nécessite une connexion SSL. La configuration est déjà en place dans le fichier `.env` avec `NODE_ENV=production`.

2. **Pool de connexions**: Le serveur utilise un pool de connexions pour gérer efficacement les requêtes simultanées.

3. **Triggers automatiques**: Les champs `updated_at` et `resolved_at` sont mis à jour automatiquement via des triggers PostgreSQL.

4. **Vues prédéfinies**: Des vues sont créées pour faciliter les requêtes courantes :
   - `v_active_alerts`: Alertes actives avec détails
   - `v_alerts_by_quartier`: Statistiques par quartier
   - `v_alerts_by_type`: Statistiques par type d'urgence
   - `v_active_users`: Utilisateurs actifs

5. **Index optimisés**: Des index sont créés sur les colonnes fréquemment utilisées pour optimiser les performances.

---

## 🔒 Sécurité

- Changez le `JWT_SECRET` dans le fichier `.env` pour une valeur unique et sécurisée
- Changez les mots de passe par défaut des utilisateurs
- Configurez les origines CORS autorisées (actuellement `*` pour le développement)
- Activez HTTPS en production si nécessaire

---

## 📞 Support

En cas de problème :
1. Vérifiez que votre connexion internet est active
2. Vérifiez que les identifiants Supabase sont corrects
3. Consultez les logs du serveur pour plus de détails
4. Testez la connexion avec `node test-connection.js`

---

**Configuration réussie le**: 31 mars 2026
**Base de données**: Supabase PostgreSQL 17.6
