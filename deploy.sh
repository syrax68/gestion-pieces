#!/bin/bash
set -e

echo "Demarrage du deploiement..."

# Variables - A PERSONNALISER
DEPLOY_DIR="/var/www/gestion-pieces-moto"
BACKEND_DIR="$DEPLOY_DIR/packages/backend"
FRONTEND_DIR="$DEPLOY_DIR/packages/frontend"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Demander les infos de connexion (ou les passer en argument)
VPS_IP="${1:-}"
SSH_USER="${2:-root}"

if [ -z "$VPS_IP" ]; then
  read -p "IP du VPS: " VPS_IP
  read -p "Utilisateur SSH (default: root): " SSH_USER_INPUT
  SSH_USER="${SSH_USER_INPUT:-root}"
fi

echo -e "${YELLOW}Cible: ${SSH_USER}@${VPS_IP}${NC}"

# 1. Verifier que les fichiers .env.production existent
echo -e "${YELLOW}[1/5] Verification des fichiers .env.production...${NC}"
if [ ! -f "packages/backend/.env.production" ]; then
  echo -e "${RED}ERREUR: packages/backend/.env.production manquant${NC}"
  exit 1
fi
if [ ! -f "packages/frontend/.env.production" ]; then
  echo -e "${RED}ERREUR: packages/frontend/.env.production manquant${NC}"
  exit 1
fi

# 2. Build local du frontend
echo -e "${YELLOW}[2/5] Build du frontend...${NC}"
cd packages/frontend
cp .env.production .env
pnpm build
cd ../..

# 3. Build local du backend
echo -e "${YELLOW}[3/5] Build du backend...${NC}"
cd packages/backend
cp .env.production .env
pnpm build
cd ../..

# 4. Transfert des fichiers vers le VPS
echo -e "${YELLOW}[4/5] Transfert des fichiers vers le VPS...${NC}"

ssh "$SSH_USER@$VPS_IP" "mkdir -p $DEPLOY_DIR"

# Synchroniser les fichiers (sans node_modules, .git, sources frontend, postgres_data)
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'postgres_data' \
  --exclude 'packages/frontend/src' \
  --exclude 'packages/frontend/dist' \
  --exclude '.env' \
  --exclude '.env.local' \
  ./ "$SSH_USER@$VPS_IP:$DEPLOY_DIR/"

# Envoyer le build frontend separement
rsync -avz packages/frontend/dist/ "$SSH_USER@$VPS_IP:$FRONTEND_DIR/dist/"

# 5. Commandes sur le VPS
echo -e "${YELLOW}[5/5] Installation et redemarrage sur le VPS...${NC}"
ssh "$SSH_USER@$VPS_IP" << 'ENDSSH'
set -e
cd /var/www/gestion-pieces-moto

# Installation des dependances
cd packages/backend
pnpm install --prod

# Generation du client Prisma (necessaire apres chaque install)
npx prisma generate

# Migrations Prisma
echo "Execution des migrations..."
npx prisma migrate deploy

# Redemarrage avec PM2
echo "Redemarrage de l'application..."
cd ../..
pm2 restart ecosystem.config.js --env production 2>/dev/null || pm2 start ecosystem.config.js --env production
pm2 save

# Verification que l'app repond
sleep 2
if curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
  echo "Backend OK - health check passe"
else
  echo "ATTENTION: le backend ne repond pas sur /api/health"
  pm2 logs gestion-moto-backend --lines 20 --nostream
fi

pm2 status
ENDSSH

echo -e "${GREEN}Deploiement termine !${NC}"
echo -e "${GREEN}Verifie ton site sur ton domaine${NC}"
