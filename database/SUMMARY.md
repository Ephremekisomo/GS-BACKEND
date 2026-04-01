# 📦 Goma Security - Scripts de Base de Données

## 📋 Résumé

Ce dossier contient tous les scripts nécessaires pour gérer la base de données PostgreSQL de l'application Goma Security.

## 📁 Fichiers Créés

| Fichier | Description | Taille |
|---------|-------------|--------|
| [`init.sql`](./init.sql) | Script SQL SQLite (ancien) | ~15 KB |
| [`init-postgresql.sql`](./init-postgresql.sql) | Script SQL PostgreSQL (nouveau) | ~18 KB |
| [`setup.js`](./setup.js) | Script Node.js pour SQLite (ancien) | ~8 KB |
| [`setup-postgresql.js`](./setup-postgresql.js) | Script Node.js pour PostgreSQL (nouveau) | ~9 KB |
| [`postgresql.js`](./postgresql.js) | Module PostgreSQL | ~6 KB |
| [`backup.js`](./backup.js) | Script de sauvegarde de la base | ~6 KB |
| [`restore.js`](./restore.js) | Script de restauration de la base | ~7 KB |
| [`README.md`](./README.md) | Documentation complète | ~5 KB |
| [`QUICKSTART.md`](./QUICKSTART.md) | Guide de démarrage rapide | ~3 KB |
| [`SUMMARY.md`](./SUMMARY.md) | Ce fichier | ~2 KB |

## 🚀 Commandes Disponibles

### Initialisation PostgreSQL

```bash
# Initialiser la base de données PostgreSQL
npm run db:setup:postgresql

# Réinitialiser complètement la base PostgreSQL
npm run db:reset:postgresql
```

### Initialisation SQLite (ancien)

```bash
# Initialiser la base de données SQLite
npm run db:setup

# Réinitialiser complètement la base SQLite
npm run db:reset
```

### Sauvegarde et Restauration

```bash
# Créer une sauvegarde PostgreSQL
npm run db:backup:postgresql

# Restaurer une sauvegarde PostgreSQL
npm run db:restore:postgresql
```

### Serveur

```bash
# Démarrer le serveur
npm start

# Démarrer en mode développement
npm run dev
```

## 📊 Structure de la Base de Données

### Tables Principales

1. **users** - Utilisateurs de l'application
   - Citoyens, agents, administrateurs
   - Informations de profil et localisation
   - Authentification 2FA

2. **emergency_types** - Types d'urgences
   - 10 types prédéfinis
   - Priorités et couleurs

3. **alerts** - Alertes d'urgence
   - Signalements des utilisateurs
   - Géolocalisation
   - Statuts et priorités

4. **chat_messages** - Messages de chat
   - Communication entre utilisateurs
   - Support audio

5. **notifications** - Notifications push
   - Alertes en temps réel

6. **zones** - Zones géographiques
   - 10 zones de Goma

7. **alert_zones** - Relation alertes-zones
   - Association many-to-many

8. **statistics** - Statistiques quotidiennes
   - Métriques d'utilisation

### Vues

1. **v_active_alerts** - Alertes actives avec détails
2. **v_alerts_by_quartier** - Statistiques par quartier
3. **v_alerts_by_type** - Statistiques par type d'urgence
4. **v_active_users** - Liste des utilisateurs actifs

### Index

- 25 index pour optimiser les performances
- Sur les colonnes fréquemment utilisées

### Triggers

- Mise à jour automatique des timestamps
- Gestion des statuts d'alertes

## 🔐 Sécurité

### Comptes par Défaut

| Rôle | Téléphone | Mot de passe |
|------|-----------|--------------|
| Admin | +243000000000 | admin123 |
| Agent | +243111111111 | admin123 |
| Citoyen | +243222222222 | admin123 |

⚠️ **IMPORTANT**: Changez ces mots de passe en production!

### Bonnes Pratiques

1. **Sauvegardes régulières**
   ```bash
   # Sauvegarde quotidienne recommandée
   npm run db:backup
   ```

2. **Vérification d'intégrité**
   ```bash
   sqlite3 goma_security.db "PRAGMA integrity_check;"
   ```

3. **Chiffrement** (optionnel)
   ```bash
   # Utiliser SQLCipher pour chiffrer la base
   npm install better-sqlcipher
   ```

## 📈 Performance

### Optimisations Incluses

- **Index** sur les colonnes critiques
- **Vues** pour les requêtes fréquentes
- **Triggers** pour la maintenance automatique
- **Foreign keys** pour l'intégrité référentielle

### Recommandations

1. **Taille de la base**
   - Surveiller la croissance
   - Archiver les anciennes alertes

2. **Performances PostgreSQL**
   - Exécuter `VACUUM` périodiquement
   - Analyser les requêtes lentes avec `EXPLAIN ANALYZE`
   - Utiliser `pg_stat_statements` pour le monitoring

3. **Monitoring**
   - Logger les erreurs
   - Surveiller les temps de réponse
   - Utiliser `pg_stat_activity` pour les connexions actives

## 🔧 Maintenance

### Quotidienne

```bash
# Sauvegarde PostgreSQL
npm run db:backup:postgresql

# Vérification des logs
tail -f logs/app.log
```

### Hebdomadaire

```bash
# Vérification d'intégrité PostgreSQL
psql -U postgres -d goma_security -c "SELECT COUNT(*) FROM users;"

# Optimisation PostgreSQL
psql -U postgres -d goma_security -c "VACUUM ANALYZE;"
```

### Mensuelle

```bash
# Nettoyage des anciennes données PostgreSQL
psql -U postgres -d goma_security -c "DELETE FROM alerts WHERE created_at < NOW() - INTERVAL '90 days';"

# Archivage
npm run db:backup:postgresql
```

## 🐛 Dépannage

### Problèmes Courants

1. **Connexion refusée**
   ```bash
   # Vérifier que PostgreSQL est en cours d'exécution
   sudo systemctl status postgresql
   # Démarrer PostgreSQL si nécessaire
   sudo systemctl start postgresql
   ```

2. **Authentification échouée**
   ```bash
   # Vérifier les variables d'environnement
   echo $DATABASE_URL
   # Modifier le fichier .env avec les bonnes informations
   ```

3. **Espace disque**
   ```bash
   # Vérifier l'espace
   df -h
   # Nettoyer les anciennes sauvegardes
   rm backups/*.sql
   ```

## 📚 Documentation

- [`README.md`](./README.md) - Documentation complète
- [`QUICKSTART.md`](./QUICKSTART.md) - Guide de démarrage rapide
- [`init.sql`](./init.sql) - Script SQL commenté

## 🆘 Support

En cas de problème:

1. Consulter la documentation
2. Vérifier les logs
3. Contacter l'équipe de développement

## 📝 Notes

- **Base de données**: PostgreSQL 15+
- **Encodage**: UTF-8
- **Taille maximale**: Illimitée (théorique)
- **Taille recommandée**: < 100 GB
- **Hébergement**: Supabase (gratuit jusqu'à 500MB)

---

**Goma Security** 🇨🇩  
Application de sécurité urbaine pour Goma, RDC
