const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

// Importation des configurations
const connectDB = require('./config/database');
const passport = require('./config/passport');
const discordLogger = require('./services/discordLogger');
const { initializeDefaultPermissions } = require('./utils/initializePermissions');

// Importation des routes
const authRoutes = require('./routes/auth');
const discordRoutes = require('./routes/discord');
const companyRoutes = require('./routes/companies');
const roleRoutes = require('./routes/roles');
// const rolesManagementRoutes = require('./routes/rolesManagement'); // SUPPRIMÉ - utiliser /api/roles à la place
const userRoutes = require('./routes/users');
const prestationRoutes = require('./routes/prestations');
const categoryRoutes = require('./routes/categories');
const bilanRoutes = require('./routes/bilans');
const chargeRoutes = require('./routes/charges');
const factureRoutes = require('./routes/factures');
const employeRoutes = require('./routes/employes');
const venteRoutes = require('./routes/ventes');
const salaireRoutes = require('./routes/salaires');
const salaireSuperAdminRoutes = require('./routes/salaires-superadmin');
const permissionRoutes = require('./routes/permissions');
const itemRoutes = require('./routes/items');
const stockRoutes = require('./routes/stock');
const partenaritRoutes = require('./routes/partenariats');
const companyCodeRoutes = require('./routes/companyCodes');
const authCompanyRoutes = require('./routes/authWithCompanyCode');
const companySetupRoutes = require('./routes/companySetup');
const discordCompanyRoutes = require('./routes/discordWithCompanyCode');
const adminRoutes = require('./routes/admin');
const userAccountsRoutes = require('./routes/userAccounts');
const timerRoutes = require('./routes/timers');
const testDiscordLoggerRoutes = require('./routes/testDiscordLogger');
const serviceSessionRoutes = require('./routes/serviceSession');
const technicianAdminRoutes = require('./routes/technicianAdmin');
const glifeApiMonitoringRoutes = require('./routes/glifeApiMonitoring');


const app = express();
const PORT = process.env.PORT || 5007;

// Connexion à la base de données
connectDB().then(async () => {
  // Initialiser les permissions par défaut au démarrage
  try {
    await initializeDefaultPermissions();
    console.log('✅ Permissions par défaut initialisées au démarrage');
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation des permissions au démarrage:', error);
  }
});

// Middlewares de sécurité
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

// Configuration CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://contify.fr', 'https://www.contify.fr'] 
    : ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Cache-Control'],
  optionsSuccessStatus: 200 // Pour les navigateurs legacy
}));

// Middleware pour gérer les requêtes OPTIONS préflight
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100000, // Limite chaque IP à 100 requêtes par windowMs
  message: {
    success: false,
    message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.'
  }
});

// Exclure les callbacks Discord du rate limiting
app.use('/api/', (req, res, next) => {
  // Exclure les routes Discord callback du rate limiting
  if (req.path.startsWith('/discord/callback') || req.path.startsWith('/discord/login')) {
    console.log('⚡ Exclusion rate limiting pour:', req.path);
    return next();
  }
  return limiter(req, res, next);
});

// Rate limiting spécifique pour l'authentification
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limite chaque IP à 5 tentatives de connexion par 15 minutes
  message: {
    success: false,
    message: 'Trop de tentatives de connexion, veuillez réessayer plus tard.'
  }
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Middleware de logging détaillé pour débugger les routes
app.use((req, res, next) => {
  // Log seulement les requêtes importantes (pas les health checks ni les assets)
  if (!req.url.includes('/health') && !req.url.includes('/profile') && !req.url.includes('.js') && !req.url.includes('.css')) {
    console.log(`📡 ${req.method} ${req.originalUrl}`);
  }
  next();
});

// Parsing des données
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configuration des sessions pour Passport
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 heures
  }
}));

// Initialisation de Passport
app.use(passport.initialize());
app.use(passport.session());

// Routes avec préfixe /api
app.use('/api/auth', authRoutes);
app.use('/api/discord', discordRoutes);
app.use('/api/auth-company', authCompanyRoutes);
app.use('/api/discord-company', discordCompanyRoutes);
app.use('/api/company-codes', companyCodeRoutes);
app.use('/api/company-setup', companySetupRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/users', userRoutes);
app.use('/api/user-accounts', userAccountsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/vehicles', require('./routes/vehicles'));
app.use('/api/test-discord', testDiscordLoggerRoutes);


// ADAPTATION PROXY: Votre reverse proxy supprime /api, donc on ajoute aussi les routes sans préfixe
app.use('/auth', authRoutes);
app.use('/discord', discordRoutes);
app.use('/auth-company', authCompanyRoutes);
app.use('/discord-company', discordCompanyRoutes);
app.use('/company-codes', companyCodeRoutes);
app.use('/company-setup', companySetupRoutes);
app.use('/companies', companyRoutes);
app.use('/roles', roleRoutes);
app.use('/users', userRoutes);
app.use('/user-accounts', userAccountsRoutes);
app.use('/admin', adminRoutes);
app.use('/vehicles', require('./routes/vehicles'));
app.use('/test-discord', testDiscordLoggerRoutes);


console.log('✅ Routes principales chargées sur /api/* ET /* (adaptation proxy)');
console.log('📋 Routes disponibles:');
console.log('  - Auth: /api/auth/* ET /auth/*');
console.log('  - Companies: /api/companies/* ET /companies/*');
console.log('  - Roles: /api/roles/* ET /roles/*');
console.log('  - Users: /api/users/* ET /users/*');
console.log('  - User Accounts: /api/user-accounts/* ET /user-accounts/*');
console.log('  - Discord: /api/discord/* ET /discord/*');

// Route temporaire pour supprimer l'index email (à supprimer après utilisation)
const mongoose = require('mongoose');
app.get('/api/admin/drop-email-index', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const collection = db.collection('users');
    
    try {
      await collection.dropIndex('email_1');
      res.json({ success: true, message: 'Index email_1 supprimé avec succès' });
    } catch (error) {
      if (error.code === 27) {
        res.json({ success: true, message: 'Index email_1 n\'existe pas (déjà supprimé)' });
      } else {
        throw error;
      }
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
app.use('/api/prestations', prestationRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/bilans', bilanRoutes);

app.use('/api/charges', chargeRoutes);
app.use('/api/factures', factureRoutes);
app.use('/api/employes', employeRoutes);
app.use('/api/ventes', venteRoutes);
app.use('/api/salaires', salaireRoutes);
app.use('/api/salaires-superadmin', salaireSuperAdminRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/partenariats', partenaritRoutes);
app.use('/api/timers', timerRoutes);
app.use('/api/timer-permissions', require('./routes/timerPermissions'));
app.use('/api/service-sessions', serviceSessionRoutes);
app.use('/api/test-discord', testDiscordLoggerRoutes);
app.use('/api/technician-admin', technicianAdminRoutes);
app.use('/api/item-packs', require('./routes/itemPacks'));
app.use('/api/glife-api', glifeApiMonitoringRoutes);


// Routes sans préfixe /api (adaptation proxy)
app.use('/prestations', prestationRoutes);
app.use('/categories', categoryRoutes);
app.use('/bilans', bilanRoutes);
app.use('/charges', chargeRoutes);
app.use('/factures', factureRoutes);
app.use('/employes', employeRoutes);
app.use('/ventes', venteRoutes);
app.use('/salaires', salaireRoutes);
app.use('/permissions', permissionRoutes);
app.use('/items', itemRoutes);
app.use('/stock', stockRoutes);
app.use('/partenariats', partenaritRoutes);
app.use('/timers', timerRoutes);
app.use('/timer-permissions', require('./routes/timerPermissions'));
app.use('/service-sessions', serviceSessionRoutes);
app.use('/technician-admin', technicianAdminRoutes);
app.use('/item-packs', require('./routes/itemPacks'));
app.use('/glife-api', glifeApiMonitoringRoutes);
// Note: company-codes, auth-company, company-setup et discord-company sont déjà déclarés plus haut



// Routes de test (avec et sans préfixe /api)
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Serveur en ligne',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Serveur en ligne (sans préfixe /api)',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Route de test pour vérifier les routes Discord
app.get('/api/test-discord-routes', (req, res) => {
  res.json({
    success: true,
    message: 'Test des routes Discord',
    routes: {
      login: '/api/discord/login',
      callback: '/api/discord/callback',
      test: '/api/discord/test'
    },
    timestamp: new Date().toISOString(),
    debug: {
      receivedUrl: req.originalUrl,
      receivedPath: req.path,
      baseUrl: req.baseUrl
    }
  });
});

// Route de debug pour voir ce que reçoit réellement le serveur
app.get('/api/discord-debug', (req, res) => {
  console.log('🔍 DEBUG ROUTE /api/discord-debug atteinte!');
  res.json({
    success: true,
    message: 'Route /api/discord-debug fonctionnelle',
    received: {
      originalUrl: req.originalUrl,
      path: req.path,
      baseUrl: req.baseUrl,
      method: req.method
    },
    timestamp: new Date().toISOString()
  });
});

// ROUTES TEMPORAIRES SUPPRIMÉES - Utiliser directement /api/discord/* dans Discord Developer Portal
// Si vous arrivez ici, c'est que l'URL dans Discord Developer Portal n'est pas correcte
// URL correcte à configurer: https://visionaryvault.online/api/discord/callback

// Route catch-all supprimée - Les routes Discord sont maintenant disponibles sur /discord grâce à l'adaptation proxy

// Gestion des routes non trouvées (DOIT être après toutes les routes)
app.use('*', (req, res) => {
  console.log('❌ Route non trouvée:', req.originalUrl);
  res.status(404).json({
    success: false,
    message: 'Route non trouvée',
    path: req.originalUrl
  });
});

// Middleware de gestion d'erreurs globales
app.use(async (error, req, res, next) => {
  console.error('Erreur globale:', error);
  
  // Éviter les doublons Discord - seulement pour les routes /api/*
  const shouldLogToDiscord = req.originalUrl.startsWith('/api/');
  
  // Notifier Discord pour les erreurs critiques (seulement pour /api/*)
  if (shouldLogToDiscord) {
    try {
      const context = {
        route: req.originalUrl,
        method: req.method,
        userId: req.user?.id || req.user?._id,
        companyId: req.user?.currentCompany || req.user?.company
      };
      
      // Log critique si erreur 500 ou crash
      if (!error.status || error.status >= 500) {
        await discordLogger.logCrash(error, context);
      } else {
        // Log d'action échouée pour les autres erreurs
        await discordLogger.logFailedAction(
          `${req.method} ${req.originalUrl}`,
          error,
          context
        );
      }
    } catch (logError) {
      console.error('Erreur lors du log Discord:', logError.message);
    }
  } else {
    console.log('🔇 Log Discord ignoré pour route sans /api:', req.originalUrl);
  }
  
  res.status(error.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Erreur interne du serveur' 
      : error.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
  });
});

// Démarrage du serveur
app.listen(PORT, async () =>  {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`🌍 Environnement: ${process.env.NODE_ENV}`);
  console.log(`📡 API disponible sur: http://localhost:${PORT}/api`);
  console.log(`✅ SERVEUR PRÊT - Toutes les routes sont maintenant disponibles`);
  
  try {
    await discordLogger.logServerStart();
  } catch (error) {
    console.error('Erreur lors de la notification Discord de démarrage:', error.message);
  }

  if (process.env.NODE_ENV === 'production') {
  }
});

// Gestion propre des signaux d'arrêt
process.on('SIGTERM', async () => {
  console.log('SIGTERM reçu, arrêt du serveur...');
  try {
    await discordLogger.logServerStop('SIGTERM reçu');
  } catch (error) {
    console.error('Erreur lors de la notification Discord d\'arrêt:', error.message);
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT reçu, arrêt du serveur...');
  try {
    await discordLogger.logServerStop('SIGINT reçu (Ctrl+C)');
  } catch (error) {
    console.error('Erreur lors de la notification Discord d\'arrêt:', error.message);
  }
  process.exit(0);
});

// Gestion des exceptions non capturées
process.on('uncaughtException', async (error) => {
  console.error('Exception non capturée:', error);
  try {
    await discordLogger.logCrash(error, { context: 'uncaughtException' });
  } catch (logError) {
    console.error('Erreur lors du log Discord:', logError.message);
  }
  process.exit(1);
});

// Gestion des promesses rejetées
process.on('unhandledRejection', async (reason, promise) => {
  console.error('Promesse rejetée non gérée:', reason);
  try {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    await discordLogger.logCrash(error, { context: 'unhandledRejection' });
  } catch (logError) {
    console.error('Erreur lors du log Discord:', logError.message);
  }
  process.exit(1);
});

module.exports = app;
