# Guide de mise en ligne - Pas a pas

Ce guide te prend par la main pour mettre en ligne ton app sur ton VPS Hostinger.
Pour les details techniques complets, voir `DEPLOYMENT.md`.

---

## Etape 0 : Ce dont tu as besoin avant de commencer

- [ ] L'IP de ton VPS Hostinger (visible dans ton panel Hostinger > VPS > "Manage")
- [ ] Le mot de passe root (envoye par email par Hostinger, ou defini dans le panel)
- [ ] Ton nom de domaine (ex: `moto-pieces.com`)
- [ ] ~30 minutes de tranquillite

---

## Etape 1 : Connexion SSH a ton VPS

Ouvre un terminal sur ton Mac :

```bash
ssh root@TON_IP_VPS
```

Remplace `TON_IP_VPS` par l'IP de ton VPS (ex: `185.123.45.67`).

La premiere fois, il te demandera de confirmer l'empreinte du serveur :
```
Are you sure you want to continue connecting (yes/no)?
```
Tape `yes` puis entre ton mot de passe root.

> Si ca ne marche pas, verifie dans ton panel Hostinger que le VPS est bien demarre ("Running").

---

## Etape 2 : Configurer le DNS (pointer ton domaine vers le VPS)

### Si ton domaine est chez Hostinger :
1. Va dans **Hostinger Panel > Domaines > ton-domaine.com > DNS Zone**
2. Modifie ou cree un enregistrement **A** :
   - Name: `@`
   - Type: `A`
   - Value: `TON_IP_VPS`
   - TTL: `3600`
3. Cree un second enregistrement A pour le `www` :
   - Name: `www`
   - Type: `A`
   - Value: `TON_IP_VPS`
   - TTL: `3600`

### Si ton domaine est ailleurs (OVH, Gandi, etc.) :
Va dans la gestion DNS de ton registrar et fais la meme chose (2 enregistrements A).

> Le DNS peut prendre entre 5 minutes et 24h pour se propager.
> Tu peux verifier avec : `ping ton-domaine.com` - il devrait afficher l'IP de ton VPS.

---

## Etape 3 : Installer les logiciels sur le VPS

Connecte-toi en SSH puis copie-colle ces commandes **bloc par bloc** :

### 3.1 Mise a jour du systeme
```bash
apt update && apt upgrade -y
```

### 3.2 Installer Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node --version
```
Tu devrais voir `v20.x.x`.

### 3.3 Installer pnpm
```bash
npm install -g pnpm
pnpm --version
```

### 3.4 Installer PostgreSQL 16
```bash
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget -qO- https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
apt update
apt install -y postgresql-16 postgresql-contrib-16
systemctl start postgresql
systemctl enable postgresql
```

### 3.5 Creer la base de donnees

**IMPORTANT** : remplace `MotDePasse_Super_Fort_123!` par un vrai mot de passe que tu notes quelque part.

```bash
sudo -u postgres psql <<EOF
CREATE DATABASE gestion_moto;
CREATE USER moto_user WITH ENCRYPTED PASSWORD 'MotDePasse_Super_Fort_123!';
GRANT ALL PRIVILEGES ON DATABASE gestion_moto TO moto_user;
\c gestion_moto
GRANT ALL ON SCHEMA public TO moto_user;
ALTER DATABASE gestion_moto OWNER TO moto_user;
EOF
```

### 3.6 Installer PM2 (garde ton app en vie)
```bash
npm install -g pm2
pm2 startup systemd
```

### 3.7 Installer Nginx (serveur web)
```bash
apt install -y nginx
systemctl start nginx
systemctl enable nginx
```

### 3.8 Installer Certbot (certificat SSL/HTTPS gratuit)
```bash
apt install -y certbot python3-certbot-nginx
```

### 3.9 Configurer le firewall
```bash
apt install -y ufw
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
ufw status
```

---

## Etape 4 : Configurer tes fichiers en local (sur ton Mac)

### 4.1 Backend `.env.production`

Edite le fichier `packages/backend/.env.production` avec tes vraies valeurs :

```env
DATABASE_URL="postgresql://moto_user:MotDePasse_Super_Fort_123!@localhost:5432/gestion_moto?schema=public"
JWT_SECRET="COLLE_ICI_LE_RESULTAT_DE_LA_COMMANDE_CI_DESSOUS"
JWT_EXPIRES_IN="7d"
PORT=3001
NODE_ENV="production"
FRONTEND_URL="https://ton-domaine.com"
```

Pour generer le JWT_SECRET, lance ceci dans ton terminal :
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Copie le resultat et colle-le dans `JWT_SECRET`.

### 4.2 Frontend `.env.production`

Edite le fichier `packages/frontend/.env.production` :

```env
VITE_API_URL=https://ton-domaine.com/api
```

---

## Etape 5 : Configurer Nginx sur le VPS

Toujours connecte en SSH sur le VPS :

```bash
nano /etc/nginx/sites-available/gestion-moto
```

Colle ce contenu (remplace `ton-domaine.com` par ton vrai domaine - 2 endroits) :

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name ton-domaine.com www.ton-domaine.com;

    location / {
        root /var/www/gestion-pieces-moto/packages/frontend/dist;
        try_files $uri $uri/ /index.html;

        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

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
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    client_max_body_size 10M;
}
```

Sauvegarde avec `Ctrl+O`, `Entree`, puis `Ctrl+X`.

Ensuite :
```bash
# Activer le site
ln -s /etc/nginx/sites-available/gestion-moto /etc/nginx/sites-enabled/

# Desactiver le site par defaut
rm -f /etc/nginx/sites-enabled/default

# Verifier que la config est correcte
nginx -t

# Recharger Nginx
systemctl reload nginx
```

---

## Etape 6 : Premier deploiement

De retour sur ton Mac, a la racine du projet :

```bash
./deploy.sh
```

Il va te demander l'IP de ton VPS et l'utilisateur SSH.
Le script va :
1. Verifier tes fichiers `.env.production`
2. Builder le frontend et le backend
3. Envoyer les fichiers sur le VPS
4. Installer les dependances
5. Lancer les migrations Prisma
6. Demarrer l'app avec PM2

### Initialiser les donnees (premiere fois uniquement)

Apres le premier deploiement, connecte-toi en SSH pour seeder la base :
```bash
ssh root@TON_IP_VPS
cd /var/www/gestion-pieces-moto/packages/backend
npx prisma db seed
```

---

## Etape 7 : Activer HTTPS (certificat SSL gratuit)

Toujours en SSH sur le VPS :

```bash
certbot --nginx -d ton-domaine.com -d www.ton-domaine.com
```

Il va te demander :
- Ton email (pour les alertes d'expiration)
- D'accepter les conditions (Y)
- Si tu veux rediriger HTTP vers HTTPS (choisis 2 = redirect)

Certbot modifie automatiquement ta config Nginx pour ajouter le SSL.

Verifie que le renouvellement automatique fonctionne :
```bash
certbot renew --dry-run
```

---

## Etape 8 : Verifier que tout marche

### Sur le VPS :
```bash
# Verifier que le backend tourne
pm2 status

# Tester l'API
curl http://localhost:3001/api/health
```

### Dans ton navigateur :
1. Va sur `https://ton-domaine.com`
2. La page de connexion devrait s'afficher
3. Connecte-toi avec les identifiants du seed
4. Verifie que tu peux naviguer, creer une piece, etc.

---

## Etape 9 : Securiser (recommande)

### Configurer les sauvegardes automatiques de la BDD
```bash
# Creer le script de sauvegarde
mkdir -p /var/backups/postgres
cat > /root/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
sudo -u postgres pg_dump gestion_moto | gzip > $BACKUP_DIR/gestion_moto_$DATE.sql.gz
find $BACKUP_DIR -name "gestion_moto_*.sql.gz" -mtime +7 -delete
echo "Backup cree: gestion_moto_$DATE.sql.gz"
EOF
chmod +x /root/backup-db.sh

# Tester
/root/backup-db.sh

# Automatiser (tous les jours a 2h du matin)
(crontab -l 2>/dev/null; echo "0 2 * * * /root/backup-db.sh >> /var/log/backup-db.log 2>&1") | crontab -
```

### Installer fail2ban (protection contre les attaques)
```bash
apt install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban
```

---

## Deploiements suivants

Pour chaque mise a jour future, c'est simple :

```bash
# Depuis ton Mac, a la racine du projet
./deploy.sh
```

Ou si tu veux eviter de retaper l'IP a chaque fois :
```bash
./deploy.sh 185.123.45.67 root
```

---

## En cas de probleme

### Le site affiche une page blanche
```bash
# Verifier que le build frontend existe
ls /var/www/gestion-pieces-moto/packages/frontend/dist/
# Verifier la config Nginx
nginx -t
tail -20 /var/log/nginx/error.log
```

### L'API ne repond pas
```bash
pm2 logs gestion-moto-backend --lines 50
# Verifier le .env
cat /var/www/gestion-pieces-moto/packages/backend/.env.production
```

### Erreur CORS
Verifier que `FRONTEND_URL` dans `.env.production` du backend correspond exactement a ton domaine (avec `https://`, sans `/` a la fin).

### Erreur de connexion a la BDD
```bash
# Tester la connexion PostgreSQL
sudo -u postgres psql -d gestion_moto -c "SELECT version();"
```
