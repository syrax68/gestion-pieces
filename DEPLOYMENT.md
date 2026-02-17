# Plan de déploiement Hostinger VPS

## Vue d'ensemble

Déploiement d'une application full-stack (Express + React + PostgreSQL) sur un VPS Hostinger avec:

- Backend Node.js/Express sur port interne 3001
- Frontend React (build statique)
- PostgreSQL 16 comme base de données
- Nginx comme reverse proxy
- SSL/HTTPS avec Let's Encrypt
- PM2 pour la gestion du processus Node.js
- Scripts de déploiement automatisé

## Architecture de déploiement

```
Internet (HTTPS/443)
    ↓
Nginx (reverse proxy + SSL)
    ├─→ Frontend statique (React build)
    └─→ Backend API (/api/*) → Node.js:3001
              ↓
        PostgreSQL:5432
```

## Prérequis

### Côté Hostinger

- VPS avec Ubuntu 20.04/22.04 LTS minimum
- Accès SSH root
- RAM recommandée: 2GB minimum (4GB idéal)
- Espace disque: 20GB minimum
- Domaine configuré avec DNS pointant vers l'IP du VPS

### Côté développement

- `pnpm` installé localement
- Accès SSH configuré
- Variables d'environnement de production définies

## Fichiers critiques à créer/modifier

### Nouveaux fichiers à créer

- `/packages/backend/.env.production` - Variables d'environnement production backend
- `/packages/frontend/.env.production` - Variables d'environnement production frontend
- `/deploy.sh` - Script de déploiement automatisé
- `/ecosystem.config.js` - Configuration PM2
- `/nginx.conf` - Configuration Nginx
- `/.env.example` - Template des variables d'environnement

### Fichiers à modifier

- `/packages/backend/src/index.ts` - Durcir la configuration CORS pour production

## Étapes de déploiement détaillées

### Phase 1: Préparation du VPS (première installation)

#### 1.1 Connexion et mise à jour

```bash
# Se connecter au VPS
ssh root@votre-ip-vps

# Mise à jour du système
apt update && apt upgrade -y
```

#### 1.2 Installation Node.js 20.x LTS

```bash
# Installation de Node.js via nodesource
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Vérification
node --version  # devrait afficher v20.x.x
npm --version
```

#### 1.3 Installation pnpm globalement

```bash
npm install -g pnpm
pnpm --version
```

#### 1.4 Installation PostgreSQL 16

```bash
# Ajout du repository PostgreSQL
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget -qO- https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
apt update
apt install -y postgresql-16 postgresql-contrib-16

# Démarrage et activation au boot
systemctl start postgresql
systemctl enable postgresql

# Vérification
sudo -u postgres psql --version
```

#### 1.5 Configuration PostgreSQL

```bash
# Créer la base de données et l'utilisateur
sudo -u postgres psql <<EOF
CREATE DATABASE gestion_moto;
CREATE USER moto_user WITH ENCRYPTED PASSWORD 'VOTRE_MOT_DE_PASSE_SECURISE';
GRANT ALL PRIVILEGES ON DATABASE gestion_moto TO moto_user;
\c gestion_moto
GRANT ALL ON SCHEMA public TO moto_user;
ALTER DATABASE gestion_moto OWNER TO moto_user;
EOF
```

#### 1.6 Installation PM2 (gestionnaire de processus)

```bash
npm install -g pm2

# Configuration du démarrage automatique
pm2 startup systemd
# Suivre les instructions affichées
```

#### 1.7 Installation Nginx

```bash
apt install -y nginx

# Démarrage et activation
systemctl start nginx
systemctl enable nginx

# Vérification
systemctl status nginx
```

#### 1.8 Installation Certbot (Let's Encrypt SSL)

```bash
apt install -y certbot python3-certbot-nginx
```

#### 1.9 Configuration du firewall

```bash
# Installation UFW si non présent
apt install -y ufw

# Configuration des règles
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# Vérification
ufw status
```

### Phase 2: Configuration des fichiers d'environnement

#### 2.1 Backend `.env.production`

Créer `/packages/backend/.env.production`:

```env
# Base de données
DATABASE_URL="postgresql://moto_user:VOTRE_MOT_DE_PASSE_SECURISE@localhost:5432/gestion_moto?schema=public"

# JWT - GÉNÉRER UN SECRET FORT
JWT_SECRET="GENERER_UN_SECRET_SECURISE_64_CARACTERES_MINIMUM"
JWT_EXPIRES_IN="7d"

# Serveur
PORT=3001
NODE_ENV="production"

# Frontend URL pour CORS
FRONTEND_URL="https://votre-domaine.com"
```

**Important**: Générer un JWT_SECRET fort:

```bash
# Sur votre machine locale ou le VPS
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### 2.2 Frontend `.env.production`

Créer `/packages/frontend/.env.production`:

```env
VITE_API_URL=https://votre-domaine.com/api
```

#### 2.3 Fichier exemple `.env.example`

Créer `/.env.example` à la racine:

```env
# Backend
DATABASE_URL="postgresql://user:password@localhost:5432/gestion_moto?schema=public"
JWT_SECRET="your-secret-key-change-in-production"
JWT_EXPIRES_IN="7d"
PORT=3001
NODE_ENV="development"
FRONTEND_URL="http://localhost:5173"

# Frontend
VITE_API_URL=http://localhost:3001/api
```

### Phase 3: Configuration CORS production

Modifier `/packages/backend/src/index.ts`:

**Chercher**:

```typescript
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = process.env.FRONTEND_URL?.split(",") || [];
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0) {
        return callback(null, true);
      }
      if (allowedOrigins.indexOf(origin) !== -1 || origin.includes("localhost")) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);
```

**Remplacer par** (version durcie pour production):

```typescript
app.use(
  cors({
    origin: (origin, callback) => {
      // En développement, autoriser localhost
      if (process.env.NODE_ENV !== "production") {
        if (!origin || origin.includes("localhost")) {
          return callback(null, true);
        }
      }

      // En production, utiliser la whitelist stricte
      const allowedOrigins = process.env.FRONTEND_URL?.split(",") || [];

      // Autoriser les requêtes sans origin (ex: Postman, curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);
```

### Phase 4: Configuration PM2

Créer `/ecosystem.config.js` à la racine:

```javascript
module.exports = {
  apps: [
    {
      name: "gestion-moto-backend",
      cwd: "/var/www/gestion-pieces-moto/packages/backend",
      script: "dist/index.js",
      instances: 1,
      exec_mode: "fork",
      env_production: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      error_file: "~/.pm2/logs/gestion-moto-error.log",
      out_file: "~/.pm2/logs/gestion-moto-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      time: true,
    },
  ],
};
```

### Phase 5: Configuration Nginx

Créer `/nginx.conf` (template):

```nginx
# Configuration à placer dans /etc/nginx/sites-available/gestion-moto
server {
    listen 80;
    listen [::]:80;
    server_name votre-domaine.com www.votre-domaine.com;

    # Redirection HTTP vers HTTPS (après configuration SSL)
    # return 301 https://$server_name$request_uri;

    # Configuration temporaire avant SSL
    location / {
        root /var/www/gestion-pieces-moto/packages/frontend/dist;
        try_files $uri $uri/ /index.html;

        # Cache pour les assets statiques
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API backend
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Sécurité
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Taille max upload (pour imports Excel)
    client_max_body_size 10M;
}

# Configuration HTTPS (après certbot)
# server {
#     listen 443 ssl http2;
#     listen [::]:443 ssl http2;
#     server_name votre-domaine.com www.votre-domaine.com;
#
#     ssl_certificate /etc/letsencrypt/live/votre-domaine.com/fullchain.pem;
#     ssl_certificate_key /etc/letsencrypt/live/votre-domaine.com/privkey.pem;
#     ssl_protocols TLSv1.2 TLSv1.3;
#     ssl_ciphers HIGH:!aNULL:!MD5;
#     ssl_prefer_server_ciphers on;
#
#     # Même configuration location que ci-dessus
# }
```

### Phase 6: Script de déploiement automatisé

Créer `/deploy.sh` à la racine:

```bash
#!/bin/bash
set -e

echo "🚀 Démarrage du déploiement..."

# Variables
DEPLOY_DIR="/var/www/gestion-pieces-moto"
BACKEND_DIR="$DEPLOY_DIR/packages/backend"
FRONTEND_DIR="$DEPLOY_DIR/packages/frontend"
ENV_MODE="production"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Build local du frontend avec les bonnes variables d'env
echo -e "${YELLOW}📦 Build du frontend...${NC}"
cd packages/frontend
cp .env.production .env
pnpm build
cd ../..

# 2. Build local du backend
echo -e "${YELLOW}📦 Build du backend...${NC}"
cd packages/backend
cp .env.production .env
pnpm build
cd ../..

# 3. Transfert des fichiers vers le VPS
echo -e "${YELLOW}📤 Transfert des fichiers vers le VPS...${NC}"
read -p "IP du VPS: " VPS_IP
read -p "Utilisateur SSH (default: root): " SSH_USER
SSH_USER=${SSH_USER:-root}

# Créer le répertoire si nécessaire
ssh $SSH_USER@$VPS_IP "mkdir -p $DEPLOY_DIR"

# Synchroniser les fichiers nécessaires
rsync -avz --exclude 'node_modules' \
           --exclude '.git' \
           --exclude 'postgres_data' \
           --exclude 'packages/backend/src' \
           --exclude 'packages/frontend/src' \
           --exclude 'packages/frontend/dist' \
           ./ $SSH_USER@$VPS_IP:$DEPLOY_DIR/

# Envoyer le build frontend
rsync -avz packages/frontend/dist/ $SSH_USER@$VPS_IP:$FRONTEND_DIR/dist/

# 4. Commandes sur le VPS
echo -e "${YELLOW}🔧 Configuration sur le VPS...${NC}"
ssh $SSH_USER@$VPS_IP << 'ENDSSH'
cd /var/www/gestion-pieces-moto

# Installation des dépendances backend uniquement
cd packages/backend
pnpm install --prod

# Migrations Prisma
echo "🗄️ Exécution des migrations..."
npx prisma migrate deploy

# Redémarrage avec PM2
echo "♻️ Redémarrage de l'application..."
cd ../..
pm2 restart ecosystem.config.js --env production || pm2 start ecosystem.config.js --env production
pm2 save

echo "✅ Déploiement terminé!"
pm2 status
ENDSSH

echo -e "${GREEN}✅ Déploiement réussi!${NC}"
echo -e "${GREEN}🌐 Visitez: https://votre-domaine.com${NC}"
```

Rendre le script exécutable:

```bash
chmod +x deploy.sh
```

### Phase 7: Procédure de déploiement initial

#### 7.1 Sur votre machine locale

```bash
# 1. Créer les fichiers .env.production
# (voir Phase 2)

# 2. Committer les nouveaux fichiers
git add ecosystem.config.js nginx.conf deploy.sh
git add packages/backend/.env.production packages/frontend/.env.production
git commit -m "feat: add production deployment configuration"

# 3. Pousser sur le repository (optionnel si vous utilisez Git)
git push
```

#### 7.2 Sur le VPS

```bash
# Se connecter
ssh root@votre-ip-vps

# Créer le répertoire de déploiement
mkdir -p /var/www/gestion-pieces-moto
cd /var/www/gestion-pieces-moto

# Option A: Cloner depuis Git (recommandé)
git clone https://votre-repo.git .

# Option B: Transférer depuis votre machine locale
# (depuis votre machine)
rsync -avz --exclude 'node_modules' --exclude '.git' ./ root@votre-ip-vps:/var/www/gestion-pieces-moto/

# Installer les dépendances
pnpm install

# Copier les fichiers d'environnement
cd packages/backend
cp .env.production .env

cd ../frontend
cp .env.production .env

# Build le backend
cd ../backend
pnpm build

# Build le frontend (avec les variables d'env de prod)
cd ../frontend
pnpm build

# Retour à la racine
cd ../..

# Migrations de base de données
cd packages/backend
npx prisma migrate deploy
npx prisma db seed  # Si vous voulez les données initiales

# Démarrer avec PM2
cd ../..
pm2 start ecosystem.config.js --env production
pm2 save
```

#### 7.3 Configuration Nginx

```bash
# Copier la configuration
cp nginx.conf /etc/nginx/sites-available/gestion-moto

# Mettre à jour avec votre domaine
nano /etc/nginx/sites-available/gestion-moto
# Remplacer "votre-domaine.com" par votre vrai domaine

# Activer le site
ln -s /etc/nginx/sites-available/gestion-moto /etc/nginx/sites-enabled/

# Désactiver le site par défaut
rm /etc/nginx/sites-enabled/default

# Tester la configuration
nginx -t

# Recharger Nginx
systemctl reload nginx
```

#### 7.4 Configuration SSL avec Let's Encrypt

```bash
# Obtenir le certificat SSL
certbot --nginx -d votre-domaine.com -d www.votre-domaine.com

# Suivre les instructions (email, accepter les termes)
# Certbot configurera automatiquement Nginx pour HTTPS

# Renouvellement automatique (déjà configuré par défaut)
# Test du renouvellement
certbot renew --dry-run
```

### Phase 8: Déploiements ultérieurs

Pour les mises à jour futures, utiliser le script automatisé:

```bash
# Depuis votre machine locale
./deploy.sh
```

Ou manuellement sur le VPS:

```bash
ssh root@votre-ip-vps

cd /var/www/gestion-pieces-moto

# Récupérer les derniers changements
git pull  # Si vous utilisez Git

# Build
cd packages/backend
pnpm install --prod
pnpm build

cd ../frontend
pnpm build

# Migrations si nécessaire
cd ../backend
npx prisma migrate deploy

# Redémarrer
cd ../..
pm2 restart ecosystem.config.js --env production
```

## Sécurité additionnelle

### Créer un utilisateur non-root (recommandé)

```bash
# Sur le VPS en tant que root
adduser deployer
usermod -aG sudo deployer

# Copier les clés SSH
mkdir -p /home/deployer/.ssh
cp ~/.ssh/authorized_keys /home/deployer/.ssh/
chown -R deployer:deployer /home/deployer/.ssh
chmod 700 /home/deployer/.ssh
chmod 600 /home/deployer/.ssh/authorized_keys

# Changer le propriétaire du répertoire de déploiement
chown -R deployer:deployer /var/www/gestion-pieces-moto

# Configurer PM2 pour cet utilisateur
su - deployer
pm2 startup systemd
# Suivre les instructions
```

### Sécuriser SSH

Modifier `/etc/ssh/sshd_config`:

```bash
PermitRootLogin no  # Désactiver le login root
PasswordAuthentication no  # Désactiver l'authentification par mot de passe
```

Redémarrer SSH:

```bash
systemctl restart sshd
```

### Configurer fail2ban (contre les attaques par force brute)

```bash
apt install -y fail2ban

# Créer une configuration personnalisée
cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
EOF

systemctl enable fail2ban
systemctl start fail2ban
```

## Monitoring et maintenance

### Logs

```bash
# Logs PM2
pm2 logs gestion-moto-backend

# Logs Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Logs PostgreSQL
tail -f /var/log/postgresql/postgresql-16-main.log
```

### Monitoring PM2

```bash
# Statut
pm2 status

# Monitoring en temps réel
pm2 monit

# Informations détaillées
pm2 info gestion-moto-backend
```

### Sauvegardes PostgreSQL

Créer un script de sauvegarde `/root/backup-db.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Sauvegarde
sudo -u postgres pg_dump gestion_moto | gzip > $BACKUP_DIR/gestion_moto_$DATE.sql.gz

# Garder seulement les 7 derniers jours
find $BACKUP_DIR -name "gestion_moto_*.sql.gz" -mtime +7 -delete

echo "Backup créé: gestion_moto_$DATE.sql.gz"
```

Automatiser avec cron:

```bash
chmod +x /root/backup-db.sh

# Ajouter au cron (tous les jours à 2h du matin)
crontab -e
# Ajouter la ligne:
0 2 * * * /root/backup-db.sh >> /var/log/backup-db.log 2>&1
```

### Restauration depuis une sauvegarde

```bash
# Arrêter l'application
pm2 stop gestion-moto-backend

# Restaurer
gunzip < /var/backups/postgres/gestion_moto_XXXXXXXX_XXXXXX.sql.gz | sudo -u postgres psql gestion_moto

# Redémarrer
pm2 start gestion-moto-backend
```

## Vérification du déploiement

### 1. Vérifier les services

```bash
# PostgreSQL
systemctl status postgresql

# Nginx
systemctl status nginx

# PM2
pm2 status

# Firewall
ufw status
```

### 2. Tester l'API backend

```bash
# Depuis le VPS
curl http://localhost:3001/api/health  # Devrait retourner un status OK

# Depuis l'extérieur (après configuration DNS)
curl https://votre-domaine.com/api/health
```

### 3. Tester le frontend

Ouvrir dans un navigateur:

```
https://votre-domaine.com
```

Vérifier:

- ✅ La page de connexion s'affiche correctement
- ✅ Les ressources statiques (CSS, JS, images) se chargent
- ✅ Pas d'erreurs dans la console du navigateur (F12)
- ✅ La connexion API fonctionne (essayer de se connecter)

### 4. Tester l'authentification

```bash
# Obtenir un token JWT
curl -X POST https://votre-domaine.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"votre-mot-de-passe"}'

# Utiliser le token pour une requête authentifiée
curl https://votre-domaine.com/api/auth/me \
  -H "Authorization: Bearer VOTRE_TOKEN_JWT"
```

### 5. Tester les opérations CRUD

Se connecter via l'interface web et vérifier:

- ✅ Création d'une pièce
- ✅ Lecture de la liste des pièces
- ✅ Modification d'une pièce
- ✅ Suppression d'une pièce
- ✅ Création d'une facture
- ✅ Ajustement de stock
- ✅ Export Excel

### 6. Vérifier les logs

```bash
# Vérifier qu'il n'y a pas d'erreurs
pm2 logs --lines 50
tail -50 /var/log/nginx/error.log
```

### 7. Tester la performance

```bash
# Test de charge basique (depuis une autre machine)
ab -n 1000 -c 10 https://votre-domaine.com/
```

### 8. Vérifier le SSL

Ouvrir https://www.ssllabs.com/ssltest/ et tester votre domaine.
Note attendue: A ou A+

## Résolution de problèmes courants

### Backend ne démarre pas

```bash
# Vérifier les logs PM2
pm2 logs gestion-moto-backend

# Erreur commune: DATABASE_URL incorrecte
# Vérifier le fichier .env
cat /var/www/gestion-pieces-moto/packages/backend/.env

# Tester la connexion PostgreSQL
sudo -u postgres psql -d gestion_moto -c "SELECT version();"
```

### Erreurs CORS

```bash
# Vérifier la variable FRONTEND_URL dans .env
cat /var/www/gestion-pieces-moto/packages/backend/.env | grep FRONTEND_URL

# Devrait être: FRONTEND_URL="https://votre-domaine.com"
# Sans trailing slash
```

### Frontend affiche une page blanche

```bash
# Vérifier les logs Nginx
tail -50 /var/log/nginx/error.log

# Vérifier que le build existe
ls -la /var/www/gestion-pieces-moto/packages/frontend/dist/

# Vérifier la configuration Nginx
nginx -t

# Vérifier que VITE_API_URL est correct
# Lors du build, cette variable doit pointer vers https://votre-domaine.com/api
```

### Erreurs de migration Prisma

```bash
cd /var/www/gestion-pieces-moto/packages/backend

# Vérifier le statut des migrations
npx prisma migrate status

# Réinitialiser si nécessaire (⚠️ DANGER: supprime toutes les données)
npx prisma migrate reset

# Ou appliquer manuellement
npx prisma migrate deploy
```

### Port 3001 déjà utilisé

```bash
# Trouver le processus
lsof -i :3001

# Tuer le processus
kill -9 PID

# Ou changer le port dans .env et redémarrer
```

## Checklist finale

Avant de considérer le déploiement comme terminé:

- [ ] VPS configuré avec Ubuntu à jour
- [ ] Node.js 20 LTS installé
- [ ] PostgreSQL 16 installé et configuré
- [ ] Base de données créée avec utilisateur dédié
- [ ] Nginx installé et configuré
- [ ] PM2 installé et configuré pour le démarrage automatique
- [ ] Fichiers `.env.production` créés avec valeurs réelles
- [ ] JWT_SECRET généré de manière sécurisée
- [ ] CORS configuré strictement pour le domaine de production
- [ ] DNS configuré (A record pointant vers l'IP du VPS)
- [ ] Certificat SSL obtenu via Let's Encrypt
- [ ] Firewall UFW activé avec règles appropriées
- [ ] Application déployée et accessible via HTTPS
- [ ] Tests de connexion et d'authentification réussis
- [ ] Tests CRUD de base réussis
- [ ] Logs vérifiés (pas d'erreurs critiques)
- [ ] Sauvegardes automatiques PostgreSQL configurées
- [ ] Utilisateur non-root créé (recommandé)
- [ ] SSH sécurisé (désactiver root, mot de passe)
- [ ] fail2ban installé et configuré
- [ ] Monitoring PM2 vérifié
- [ ] Documentation des accès sauvegardée en lieu sûr

## Ressources utiles

- Documentation Hostinger VPS: https://www.hostinger.com/tutorials/vps
- Prisma Deploy: https://www.prisma.io/docs/guides/deployment
- PM2 Documentation: https://pm2.keymetrics.io/docs/usage/quick-start/
- Let's Encrypt: https://letsencrypt.org/getting-started/
- Nginx Documentation: https://nginx.org/en/docs/
