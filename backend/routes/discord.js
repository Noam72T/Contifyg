const express = require('express');
const passport = require('passport');
const { generateToken, sanitizeUser } = require('../utils/auth');

// Fonction wrapper sécurisée pour générer le token
const safeGenerateToken = (userId) => {
  try {
    if (!userId) {
      console.error('❌ Erreur: Impossible de générer un token sans userId');
      return null;
    }
    return generateToken(userId);
  } catch (error) {
    console.error('❌ Erreur lors de la génération du token:', error);
    return null;
  }
};


const router = express.Router();

// Route de test simple pour vérifier que le routeur fonctionne
router.get('/ping', (req, res) => {
  console.log('🏓 PING Discord route atteinte!');
  res.json({
    success: true,
    message: 'Discord router fonctionne!',
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  });
});

// Route de test pour vérifier la fonction generateToken
router.get('/test-token', (req, res) => {
  try {
    const testUserId = 'test-user-id';
    const token = safeGenerateToken(testUserId);
    
    // Décoder le token pour vérifier sa durée
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(token);
    const expirationDate = new Date(decoded.exp * 1000);
    const currentDate = new Date();
    const daysRemaining = Math.ceil((expirationDate - currentDate) / (1000 * 60 * 60 * 24));
    
    res.json({
      success: true,
      message: 'Test de génération de token Discord',
      tokenGenerated: !!token,
      expiresAt: expirationDate.toISOString(),
      daysRemaining: daysRemaining,
      functionAvailable: typeof generateDiscordToken === 'function'
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      functionAvailable: typeof generateDiscordToken === 'function'
    });
  }
});

// @route   GET /api/discord/test
// @desc    Test de la route Discord
// @access  Public
router.get('/test', (req, res) => {
  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.DISCORD_REDIRECT_URI)}&response_type=code&scope=identify%20email`;
  
  res.json({
    success: true,
    message: 'Route Discord fonctionnelle',
    timestamp: new Date().toISOString(),
    config: {
      clientId: process.env.DISCORD_CLIENT_ID ? 'Configuré' : 'Manquant',
      clientSecret: process.env.DISCORD_CLIENT_SECRET ? 'Configuré' : 'Manquant',
      redirectUri: process.env.DISCORD_REDIRECT_URI,
      frontendUrl: process.env.FRONTEND_URL,
      nodeEnv: process.env.NODE_ENV
    },
    urls: {
      login: '/api/discord/login',
      callback: '/api/discord/callback',
      test: '/api/discord/test'
    },
    discordAuthUrl: discordAuthUrl
  });
});

// @route   GET /api/discord/login
// @desc    Redirection vers Discord pour l'authentification
// @access  Public
router.get('/login', (req, res, next) => {
  console.log('🚀 Tentative de connexion Discord initiée');
  console.log('Redirect URI configuré:', process.env.DISCORD_REDIRECT_URI);
  console.log('Client ID:', process.env.DISCORD_CLIENT_ID);
  
  // Récupérer le accountFamilyId s'il est fourni
  const accountFamilyId = req.query.accountFamilyId;
  if (accountFamilyId) {
    console.log('📌 AccountFamilyId reçu:', accountFamilyId);
    // Stocker dans la session pour le récupérer dans le callback
    req.session = req.session || {};
    req.session.accountFamilyId = accountFamilyId;
  }
  
  next();
}, passport.authenticate('discord'));

// @route   GET /api/discord/callback
// @desc    Callback Discord après authentification
// @access  Public
router.get('/callback', (req, res, next) => {
  console.log('🔥 CALLBACK DISCORD ROUTE ATTEINTE!');
  console.log('🔍 Method:', req.method);
  console.log('🔍 URL:', req.url);
  console.log('🔍 Original URL:', req.originalUrl);
  console.log('🔍 Query params:', req.query);
  console.log('🔍 Headers:', req.headers);
  console.log('🔍 Timestamp:', new Date().toISOString());
  next();
}, passport.authenticate('discord', { 
  session: false,
  failureRedirect: '/api/discord/error'
}), async (req, res) => {
  try {
    console.log('✅ Authentification Discord réussie');
    console.log('User reçu:', req.user ? 'Oui' : 'Non');
    
    if (!req.user) {
      console.error('❌ Aucun utilisateur reçu de Passport');
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_user`);
    }
    
    const user = req.user;
    
    // Récupérer le accountFamilyId de la session s'il existe
    const accountFamilyId = req.session?.accountFamilyId;
    if (accountFamilyId && !user.accountFamilyId) {
      console.log('📌 Attribution du accountFamilyId au compte Discord:', accountFamilyId);
      user.accountFamilyId = accountFamilyId;
      await user.save({ validateBeforeSave: false });
      // Nettoyer la session
      delete req.session.accountFamilyId;
    } else if (!user.accountFamilyId) {
      // Si pas de familyId fourni et l'utilisateur n'en a pas, en créer un nouveau
      const { v4: uuidv4 } = require('uuid');
      user.accountFamilyId = uuidv4();
      await user.save({ validateBeforeSave: false });
      console.log('🆕 Nouveau accountFamilyId créé pour le compte Discord:', user.accountFamilyId);
    }
    console.log('User ID:', user._id);
    console.log('User email:', user.email);

    // Générer le token standard (7 jours)
    console.log('🔑 Génération du token standard (7 jours)...');
    const token = safeGenerateToken(user._id);
    console.log('Token Discord généré:', token ? 'Oui' : 'Non');
    
    // Obtenir l'URL du frontend depuis les variables d'environnement
    const frontendUrl = process.env.FRONTEND_URL;
    console.log('Frontend URL:', frontendUrl);
    
    // Vérifier si l'utilisateur a une entreprise assignée
    console.log('👤 Vérification du statut de l\'utilisateur Discord...');
    console.log('🏢 isCompanyValidated:', user.isCompanyValidated);
    console.log('🏢 Company:', user.company);
    console.log('🏢 Companies:', user.companies?.length || 0);
    
    // Si pas d'entreprise actuelle mais des entreprises disponibles, définir la première
    if (!user.currentCompany && user.companies && user.companies.length > 0) {
      console.log('🔧 Définition de l\'entreprise par défaut...');
      user.currentCompany = user.companies[0].company;
      await user.save();
      console.log('✅ Entreprise par défaut définie:', user.currentCompany);
    }
    
    // Vérifier si l'utilisateur a complété son profil
    const hasCompleteProfile = user.firstName && user.lastName && user.phoneNumber && user.compteBancaire;
    

    
    if (!hasCompleteProfile) {
      // Utilisateur sans profil complet → Complete Profile
      console.log('⚠️ Profil incomplet → Complete Profile');
      const encodedUserData = encodeURIComponent(JSON.stringify({
        discordId: user.discordId,
        discordUsername: user.discordUsername,
        email: user.email,
        avatar: user.avatar,
        username: user.username
      }));
      const redirectUrl = `${frontendUrl}/complete-profile?token=${token}&data=${encodedUserData}&discord=success`;
      console.log('🔄 Redirection vers complete-profile:', redirectUrl);
      return res.redirect(redirectUrl);
    }
    
    // Rediriger selon le statut de validation d'entreprise
    if (user.isCompanyValidated && user.company) {
      // Utilisateur avec entreprise → Dashboard
      console.log('✅ Utilisateur validé avec entreprise → Dashboard');
      const redirectUrl = `${frontendUrl}/dashboard?token=${token}&discord=success`;
      console.log('🔄 Redirection vers dashboard:', redirectUrl);
      return res.redirect(redirectUrl);
    } else {
      // Utilisateur sans entreprise → Company Code
      console.log('⚠️ Utilisateur sans entreprise → Company Code');
      const redirectUrl = `${frontendUrl}/company-code?token=${token}&discord=success`;
      console.log('🔄 Redirection vers company-code:', redirectUrl);
      return res.redirect(redirectUrl);
    }
    
  } catch (error) {
    console.error('Erreur lors du callback Discord:', error);
    const frontendUrl = process.env.FRONTEND_URL;
    res.redirect(`${frontendUrl}/login?error=discord_error`);
  }
});

// @route   GET /api/discord/error
// @desc    Gestion des erreurs d'authentification Discord
// @access  Public
router.get('/error', (req, res) => {
  console.error('❌ Erreur d\'authentification Discord');
  console.log('Query params sur erreur:', req.query);
  const frontendUrl = process.env.FRONTEND_URL;
  res.redirect(`${frontendUrl}/login?error=discord_auth_failed`);
});

// @route   GET /api/discord/debug
// @desc    Route de debug pour tester les fonctions
// @access  Public
router.get('/debug', (req, res) => {
  try {
    const testUser = { _id: 'test123', email: 'test@example.com' };
    const token = safeGenerateToken(testUser._id);
    const sanitized = sanitizeUser(testUser);
    
    res.json({
      success: true,
      message: 'Test des fonctions Discord',
      tests: {
        generateDiscordToken: token ? 'OK' : 'ERREUR',
        sanitizeUser: sanitized ? 'OK' : 'ERREUR'
      },
      tokenInfo: {
        token: token ? token.substring(0, 20) + '...' : 'Aucun',
        expiresIn: '14 jours'
      },
      config: {
        frontendUrl: process.env.FRONTEND_URL,
        redirectUri: process.env.DISCORD_REDIRECT_URI
      }
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

// @route   GET /api/discord/callback-test
// @desc    Callback Discord simplifié pour test (sans redirection)
// @access  Public
router.get('/callback-test', passport.authenticate('discord', { session: false }), (req, res) => {
  try {
    console.log('✅ Test callback Discord réussi');
    const user = req.user;
    
    if (!user) {
      return res.json({
        success: false,
        message: 'Aucun utilisateur reçu'
      });
    }

    const token = safeGenerateToken(user._id);
    const userData = sanitizeUser(user);
    
    // Retourner JSON au lieu de rediriger
    res.json({
      success: true,
      message: 'Authentification Discord réussie',
      user: userData,
      token: token,
      redirectUrl: `${process.env.FRONTEND_URL}/login-success?token=${token}&user=${encodeURIComponent(JSON.stringify(userData))}`
    });
    
  } catch (error) {
    console.error('Erreur callback test:', error);
    res.json({
      success: false,
      error: error.message
    });
  }
});

// @route   GET /api/discord/logout
// @desc    Déconnexion
// @access  Public
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la déconnexion'
      });
    }
    res.json({
      success: true,
      message: 'Déconnexion réussie'
    });
  });
});

// @route   GET /api/discord/verify-token
// @desc    Vérifier si un token est valide (pour debug)
// @access  Public
router.get('/verify-token', (req, res) => {
  const { token } = req.query;
  
  if (!token) {
    return res.json({
      success: false,
      message: 'Token manquant'
    });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const expirationDate = new Date(decoded.exp * 1000);
    const currentDate = new Date();
    const daysRemaining = Math.ceil((expirationDate - currentDate) / (1000 * 60 * 60 * 24));
    
    res.json({
      success: true,
      message: 'Token Discord valide',
      userId: decoded.id,
      expiresAt: expirationDate.toISOString(),
      daysRemaining: daysRemaining,
      isDiscordToken: true
    });
  } catch (error) {
    res.json({
      success: false,
      message: 'Token invalide',
      error: error.message
    });
  }
});

// @route   GET /api/discord/success-page
// @desc    Page de succès temporaire pour l'authentification Discord (DEPRECATED - plus utilisée)
// @access  Public
/*
router.get('/success-page', (req, res) => {
  const { token, user } = req.query;
  
  if (!token) {
    return res.send(`
      <html>
        <head><title>Erreur d'authentification</title></head>
        <body>
          <h1>❌ Erreur</h1>
          <p>Token manquant</p>
          <a href="${process.env.FRONTEND_URL}/login">Retour à la connexion</a>
        </body>
      </html>
    `);
  }

  const userData = user ? decodeURIComponent(user) : '{}';
  
  res.send(`
    <html>
      <head><title>Authentification réussie</title></head>
      <body>
        <h1>✅ Authentification Discord réussie!</h1>
        <p><strong>Token:</strong> ${token.substring(0, 20)}...</p>
        <p><strong>Utilisateur:</strong> ${userData}</p>
        <script>
          // Stocker le token dans localStorage
          localStorage.setItem('authToken', '${token}');
          localStorage.setItem('userData', '${userData}');
          
          // Rediriger vers le dashboard après 2 secondes
          setTimeout(() => {
            window.location.href = '${process.env.FRONTEND_URL}/dashboard';
          }, 2000);
        </script>
        <p>Redirection automatique vers le dashboard dans 2 secondes...</p>
        <a href="${process.env.FRONTEND_URL}/dashboard">Aller au dashboard maintenant</a>
      </body>
    </html>
  `);
});
*/

module.exports = router;
