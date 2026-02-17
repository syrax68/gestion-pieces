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
