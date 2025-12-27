# 🚀 Guide de Déploiement en Production

## Configuration des Variables d'Environnement

### Développement (`.env`)
```env
VITE_API_URL=http://localhost:5006
```

### Production (`.env.production`)
```env
VITE_API_URL=https://votre-domaine.com
```

⚠️ **IMPORTANT** : Avant de déployer en production, modifiez le fichier `.env.production` avec l'URL réelle de votre serveur backend.

## Commandes de Build

### Build de développement
```bash
npm run dev
```

### Build de production
```bash
npm run build
```

Le build de production utilisera automatiquement les variables du fichier `.env.production`.

## Vérification de la Configuration

Après le build, vérifiez que :
1. ✅ Le fichier `.env.production` contient la bonne URL du backend
2. ✅ Le backend est accessible depuis l'URL configurée
3. ✅ Les CORS sont correctement configurés sur le backend
4. ✅ Le backend écoute sur le bon port et domaine

## Structure des URLs

- **Frontend** : Votre domaine principal (ex: `https://app.votre-domaine.com`)
- **Backend API** : Sous-domaine ou port (ex: `https://api.votre-domaine.com` ou `https://votre-domaine.com:5006`)

## Exemple de Configuration Nginx

```nginx
# Frontend
server {
    listen 80;
    server_name app.votre-domaine.com;
    
    root /var/www/frontend/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# Backend API
server {
    listen 80;
    server_name api.votre-domaine.com;
    
    location / {
        proxy_pass http://localhost:5006;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Dépannage

### Erreur "Erreur de connexion au serveur"
- Vérifiez que `VITE_API_URL` dans `.env.production` est correct
- Vérifiez que le backend est en ligne
- Vérifiez les CORS sur le backend

### Erreur 401 (Non autorisé)
- Vérifiez que le token JWT est valide
- Vérifiez que le middleware `auth` fonctionne correctement

### Service ne fonctionne pas en production
- Vérifiez que l'instance `api` est utilisée partout (pas de `fetch` direct)
- Vérifiez les logs du backend
- Vérifiez la console du navigateur pour les erreurs
