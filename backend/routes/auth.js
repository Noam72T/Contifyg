const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const User = require('../models/User');
const Company = require('../models/Company');
const Role = require('../models/Role');
const ActivationCode = require('../models/ActivationCode');

// Middleware d'authentification
const auth = require('../middleware/auth');

// POST /api/auth/register - Inscription simple (SANS code d'activation et SANS email)
router.post('/register', async (req, res) => {
  try {
    const { username, password, firstName, lastName, phoneNumber, compteBancaire, charId, accountFamilyId } = req.body;

    // Vérification des champs requis
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nom d\'utilisateur et mot de passe sont requis' 
      });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ username });
    
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Un utilisateur avec ce nom d\'utilisateur existe déjà' 
      });
    }

    console.log('📝 Création du compte pour:', username);
    console.log('📌 AccountFamilyId fourni:', accountFamilyId || 'Aucun');

    // Si aucun accountFamilyId n'est fourni, en créer un nouveau
    // Cela permet de créer une nouvelle famille de comptes
    let finalAccountFamilyId = accountFamilyId;
    if (!finalAccountFamilyId) {
      finalAccountFamilyId = uuidv4();
      console.log('🆕 Nouveau AccountFamilyId créé:', finalAccountFamilyId);
    }

    // Créer l'utilisateur SANS hasher le mot de passe ici
    // Le middleware pre('save') du modèle User s'en chargera automatiquement
    const user = new User({
      username,
      password: password, // Mot de passe en clair, sera hashé par le middleware
      firstName: firstName || '',
      lastName: lastName || '',
      phoneNumber: phoneNumber || '',
      compteBancaire: compteBancaire || '',
      charId: charId ? parseInt(charId) : null, // ID du personnage GLife (optionnel)
      systemRole: 'Utilisateur', // Rôle par défaut (valeur enum correcte)
      isActive: true,
      isCompanyValidated: false, // Pas encore validé dans une entreprise
      accountFamilyId: finalAccountFamilyId // Toujours assigner un familyId
    });

    await user.save();
    
    console.log('✅ Compte créé avec succès pour:', username);
    
    console.log('✅ Utilisateur créé:', {
      id: user._id,
      username: user.username,
      accountFamilyId: user.accountFamilyId
    });

    // Générer le token JWT basique
    const token = jwt.sign(
      { 
        userId: user._id,
        username: user.username,
        systemRole: user.systemRole,
        isCompanyValidated: user.isCompanyValidated
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Compte créé avec succès. Utilisez un code d\'entreprise pour rejoindre une entreprise.',
      token,
      user: {
        id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        systemRole: user.systemRole,
        isCompanyValidated: user.isCompanyValidated,
        accountFamilyId: user.accountFamilyId, // Retourner le familyId pour le localStorage
        needsCompanyCode: true // Indique au frontend qu'il faut un code d'entreprise
      }
    });

  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur lors de l\'inscription' 
    });
  }
});

// POST /api/auth/login - Connexion OPTIMISÉE
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body; // Utilise username selon mémoire
    
    console.log('🔐 Tentative de connexion:', { username, passwordLength: password?.length });

    // OPTIMISATION: Trouver l'utilisateur SANS populate pour éviter les requêtes multiples
    // ATTENTION: Ne pas utiliser .lean() car on a besoin des méthodes du modèle
    const user = await User.findOne({ 
      username, 
      isActive: true // Filtrer directement les utilisateurs actifs
    });

    console.log('👤 Utilisateur trouvé:', user ? { 
      id: user._id, 
      username: user.username, 
      hasPassword: !!user.password,
      isActive: user.isActive 
    } : 'Aucun');

    if (!user) {
      console.log('❌ Utilisateur non trouvé ou inactif');
      return res.status(401).json({ 
        success: false, 
        message: 'Nom d\'utilisateur ou mot de passe incorrect' 
      });
    }

    // Vérifier le mot de passe avec bcryptjs directement
    console.log('🔑 Vérification du mot de passe...');
    console.log('   Hash stocké (début):', user.password.substring(0, 30));
    
    const validPassword = await bcrypt.compare(password, user.password);
    
    console.log('   Résultat:', validPassword ? '✅ VALIDE' : '❌ INVALIDE');
    
    if (!validPassword) {
      console.log('❌ Mot de passe incorrect pour:', username);
      return res.status(401).json({ 
        success: false, 
        message: 'Nom d\'utilisateur ou mot de passe incorrect' 
      });
    }
    
    console.log('✅ Authentification réussie pour:', username);

    // Générer le token JWT (sans données sensibles)
    const token = jwt.sign(
      { 
        userId: user._id, 
        username: user.username,
        systemRole: user.systemRole,
        company: user.company,
        currentCompany: user.currentCompany
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

   

    // Récupérer les données company et role SEULEMENT si nécessaires
    let companyData = null;
    let roleData = null;
    
    if (user.company) {
      const Company = require('../models/Company');
      companyData = await Company.findById(user.company)
        .select('name category')
        .lean();
    }
    
    if (user.role) {
      const Role = require('../models/Role');
      roleData = await Role.findById(user.role)
        .select('nom level')
        .lean();
    }

    res.json({
      success: true,
      message: 'Connexion réussie',
      token,
      user: {
        id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        company: companyData,
        role: roleData,
        systemRole: user.systemRole,
        isCompanyValidated: user.isCompanyValidated
      }
    });

  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur lors de la connexion' 
    });
  }
});

// GET /api/auth/me - Obtenir les informations de l'utilisateur connecté
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('company', 'name _id')
      .populate('role', 'nom niveau')
      .select('-password');

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Utilisateur non trouvé' 
      });
    }

    

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        company: user.company ? user.company._id : null,
        companyName: user.company ? user.company.name : null,
        role: user.role,
        isCompanyValidated: user.isCompanyValidated,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// GET /api/auth/profile - OPTIMISÉ pour gros volumes
router.get('/profile', auth, async (req, res) => {
  try {
    // OPTIMISATION: Récupérer l'utilisateur SANS populate d'abord
    const user = await User.findById(req.user.id)
      .select('-password')
      .lean(); // LEAN pour performance

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Utilisateur non trouvé' 
      });
    }

    // OPTIMISATION: Récupérer les données liées en parallèle avec projection
    const [companyData, currentCompanyData, roleData] = await Promise.all([
      // Company principale (ancien système)
      user.company ? 
        Company.findById(user.company)
          .select('name description category')
          .lean() : 
        null,
      
      // Current company (nouveau système)
      user.currentCompany ? 
        Company.findById(user.currentCompany)
          .select('name description category')
          .lean() : 
        null,
      
      // Rôle principal
      user.role ? 
        Role.findById(user.role)
          .select('nom description normeSalariale typeContrat niveau')
          .lean() : 
        null
    ]);

    // OPTIMISATION: Récupérer les companies avec leurs rôles (si nécessaire)
    let companiesData = [];
    if (user.companies && user.companies.length > 0) {
      const companyIds = user.companies.map(c => c.company);
      const roleIds = user.companies.map(c => c.role).filter(Boolean);
      
      const [companiesInfo, rolesInfo] = await Promise.all([
        Company.find({ _id: { $in: companyIds } })
          .select('name description category')
          .lean(),
        Role.find({ _id: { $in: roleIds } })
          .select('nom description normeSalariale typeContrat')
          .lean()
      ]);
      
      // Mapper les données
      companiesData = user.companies.map(companyEntry => {
        const companyInfo = companiesInfo.find(c => c._id.toString() === companyEntry.company.toString());
        const roleInfo = rolesInfo.find(r => r._id.toString() === companyEntry.role.toString());
        
        return {
          ...companyEntry,
          company: companyInfo,
          role: roleInfo
        };
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        compteBancaire: user.compteBancaire,
        charId: user.charId,
        avatar: user.avatar,
        systemRole: user.systemRole,
        company: companyData, // Ancien système (compatibilité)
        currentCompany: currentCompanyData, // Nouveau système
        companies: companiesData, // Liste des entreprises optimisée
        role: roleData,
        isCompanyValidated: user.isCompanyValidated,
        lastLogin: user.lastLogin
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération du profil:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// POST /api/auth/logout - Déconnexion (côté client principalement)
router.post('/logout', auth, (req, res) => {
  res.json({
    success: true,
    message: 'Déconnexion réussie'
  });
});

// POST /api/auth/change-password - Changer le mot de passe
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Mot de passe actuel et nouveau mot de passe requis' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Le nouveau mot de passe doit contenir au moins 6 caractères' 
      });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Utilisateur non trouvé' 
      });
    }

    // Vérifier l'ancien mot de passe
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    
    if (!validPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Mot de passe actuel incorrect' 
      });
    }

    // Hasher le nouveau mot de passe
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    
    user.password = hashedNewPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Mot de passe changé avec succès'
    });

  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// PUT /api/auth/update-profile - Mettre à jour le profil utilisateur
router.put('/update-profile', auth, async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber, compteBancaire, charId, email, avatar } = req.body;
    
    console.log('📝 [Update Profile] Données reçues:', {
      firstName, lastName, phoneNumber, compteBancaire, charId, email,
      avatarPresent: !!avatar
    });
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Utilisateur non trouvé' 
      });
    }

    // Validation du numéro de téléphone si fourni
    if (phoneNumber && !/^555-\d+$/.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Le numéro de téléphone doit commencer par 555- suivi de chiffres'
      });
    }

    // Validation du compte bancaire si fourni
    if (compteBancaire && (!/^\d+$/.test(compteBancaire) || compteBancaire.length > 7)) {
      return res.status(400).json({
        success: false,
        message: 'Le numéro de compte bancaire ne peut contenir que des chiffres (maximum 7)'
      });
    }

    // Validation du charId si fourni
    if (charId && !/^\d+$/.test(charId)) {
      return res.status(400).json({
        success: false,
        message: 'L\'ID du personnage GLife doit être un nombre'
      });
    }

    // Validation de l'avatar base64 si fourni
    if (avatar && !avatar.startsWith('data:image/')) {
      return res.status(400).json({
        success: false,
        message: 'L\'avatar doit être une image en format base64 valide'
      });
    }

    // Mettre à jour les champs fournis
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    if (compteBancaire !== undefined) user.compteBancaire = compteBancaire;
    if (charId !== undefined) {
      const parsedCharId = charId ? parseInt(charId) : null;
      console.log('🔢 [Update Profile] CharId:', { original: charId, parsed: parsedCharId });
      user.charId = parsedCharId;
    }
    if (email !== undefined) user.email = email;
    if (avatar !== undefined) user.avatar = avatar;

    console.log('💾 [Update Profile] Avant sauvegarde, charId:', user.charId);
    await user.save();
    console.log('✅ [Update Profile] Après sauvegarde, charId:', user.charId);

    // Retourner l'utilisateur mis à jour sans le mot de passe
    const updatedUser = await User.findById(req.user.id)
      .populate('company', 'name description category')
      .populate('role', 'nom niveau permissions')
      .populate({
        path: 'companies.company',
        model: 'Company',
        select: 'name description category'
      })
      .populate({
        path: 'companies.role',
        model: 'Role',
        select: 'nom description normeSalariale typeContrat'
      })
      .populate({
        path: 'currentCompany',
        model: 'Company',
        select: 'name description category'
      })
      .select('-password');

    console.log('📤 [Update Profile] CharId dans updatedUser:', updatedUser.charId);
    
    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phoneNumber: updatedUser.phoneNumber,
        compteBancaire: updatedUser.compteBancaire,
        charId: updatedUser.charId,
        avatar: updatedUser.avatar,
        systemRole: updatedUser.systemRole,
        company: updatedUser.company,
        currentCompany: updatedUser.currentCompany,
        companies: updatedUser.companies,
        role: updatedUser.role,
        isCompanyValidated: updatedUser.isCompanyValidated,
        lastLogin: updatedUser.lastLogin
      }
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur lors de la mise à jour du profil' 
    });
  }
});

// POST /api/auth/forgot-password - Demande de réinitialisation de mot de passe
// router.post('/forgot-password', async (req, res) => {
//   try {
//     const { email } = req.body;

//     console.log('🔐 Demande de reset de mot de passe pour:', email);

//     // Vérifier si l'utilisateur existe
//     const user = await User.findOne({ email });
//     if (!user) {
//       // Pour des raisons de sécurité, on renvoie toujours un succès
//       // même si l'email n'existe pas
//       return res.json({
//         success: true,
//         message: 'Si cet email existe, un lien de réinitialisation a été envoyé'
//       });
//     }

//     // Supprimer les anciens tokens de reset pour cet utilisateur
//     await PasswordReset.deleteMany({ userId: user._id });

//     // Générer un token sécurisé
//     const resetToken = crypto.randomBytes(32).toString('hex');

//     // Créer l'entrée de reset
//     const passwordReset = new PasswordReset({
//       userId: user._id,
//       email: user.email,
//       token: resetToken,
//       expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 heures
//     });

//     await passwordReset.save();

//     console.log('✅ Token de reset créé:', {
//       userId: user._id,
//       email: user.email,
//       token: resetToken.substring(0, 8) + '...',
//       expiresAt: passwordReset.expiresAt
//     });

//     // TODO: Envoyer l'email avec le lien de reset
//     // const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
//     // await sendResetEmail(user.email, resetUrl);

//     res.json({
//       success: true,
//       message: 'Si cet email existe, un lien de réinitialisation a été envoyé',
//       // En développement, on peut retourner le token pour les tests
//       ...(process.env.NODE_ENV === 'development' && { resetToken })
//     });

//   } catch (error) {
//     console.error('❌ Erreur lors de la demande de reset:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Erreur serveur lors de la demande de réinitialisation'
//     });
//   }
// });

// POST /api/auth/reset-password - Réinitialisation du mot de passe avec token
// router.post('/reset-password', async (req, res) => {
//   try {
//     const { token, newPassword } = req.body;

//     console.log('🔐 Tentative de reset avec token:', token.substring(0, 8) + '...');

//     // Vérifier le token
//     const passwordReset = await PasswordReset.findOne({
//       token,
//       used: false,
//       expiresAt: { $gt: new Date() }
//     }).populate('userId');

//     if (!passwordReset) {
//       return res.status(400).json({
//         success: false,
//         message: 'Token invalide ou expiré'
//       });
//     }

//     // Vérifier que l'utilisateur existe toujours
//     const user = await User.findById(passwordReset.userId);
//     if (!user) {
//       return res.status(400).json({
//         success: false,
//         message: 'Utilisateur introuvable'
//       });
//     }

//     // Hasher le nouveau mot de passe
//     const hashedPassword = await bcrypt.hash(newPassword, 12);

//     // Mettre à jour le mot de passe
//     await User.findByIdAndUpdate(user._id, {
//       password: hashedPassword
//     });

//     // Marquer le token comme utilisé
//     await PasswordReset.findByIdAndUpdate(passwordReset._id, {
//       used: true
//     });

//     console.log('✅ Mot de passe réinitialisé avec succès pour:', user.email);

//     res.json({
//       success: true,
//       message: 'Mot de passe réinitialisé avec succès'
//     });

//   } catch (error) {
//     console.error('❌ Erreur lors du reset de mot de passe:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Erreur serveur lors de la réinitialisation'
//     });
//   }
// });

// GET /api/auth/verify-reset-token - Vérifier la validité d'un token de reset
router.get('/verify-reset-token/:token', async (req, res) => {
  try {
    const { token } = req.params;

    console.log('🔍 Vérification du token:', token.substring(0, 8) + '...');

    const passwordReset = await PasswordReset.findOne({
      token,
      used: false,
      expiresAt: { $gt: new Date() }
    }).populate('userId', 'email');

    if (!passwordReset) {
      return res.status(400).json({
        success: false,
        message: 'Token invalide ou expiré'
      });
    }

    res.json({
      success: true,
      message: 'Token valide',
      email: passwordReset.email
    });

  } catch (error) {
    console.error('❌ Erreur lors de la vérification du token:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la vérification'
    });
  }
});

// POST /api/auth/assign-existing-user - Assigner un utilisateur existant à une entreprise
router.post('/assign-existing-user', auth, async (req, res) => {
  try {
    const { userId, companyId, roleId } = req.body;

    // Vérifier que l'utilisateur connecté a les permissions pour assigner des utilisateurs
    const currentUser = await User.findById(req.user.id);
    if (!currentUser || (currentUser.systemRole !== 'Administrateur' && currentUser.systemRole !== 'SuperAdmin')) {
      return res.status(403).json({
        success: false,
        message: 'Permissions insuffisantes pour assigner des utilisateurs'
      });
    }

    // Vérifier que l'utilisateur à assigner existe
    const userToAssign = await User.findById(userId);
    if (!userToAssign) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier que l'entreprise existe
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Entreprise non trouvée'
      });
    }

    // Vérifier que le rôle existe et appartient à l'entreprise
    const role = await Role.findOne({ _id: roleId, company: companyId });
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Rôle non trouvé ou ne correspond pas à l\'entreprise'
      });
    }

    // Vérifier si l'utilisateur n'est pas déjà assigné à cette entreprise
    const existingAssignment = userToAssign.companies?.find(
      c => c.company.toString() === companyId.toString()
    );

    if (existingAssignment) {
      return res.status(400).json({
        success: false,
        message: 'L\'utilisateur est déjà assigné à cette entreprise'
      });
    }

    // Assigner l'utilisateur à l'entreprise
    if (!userToAssign.companies) {
      userToAssign.companies = [];
    }

    userToAssign.companies.push({
      company: companyId,
      role: roleId,
      isActive: true,
      joinedAt: new Date()
    });

    // Si c'est la première entreprise, la définir comme entreprise courante
    if (!userToAssign.currentCompany) {
      userToAssign.currentCompany = companyId;
      userToAssign.company = companyId; // Compatibilité ancien système
      userToAssign.role = roleId;
    }

    userToAssign.isCompanyValidated = true;
    await userToAssign.save();

    // Ajouter l'utilisateur aux membres de l'entreprise
    if (!company.members) {
      company.members = [];
    }

    const existingMember = company.members.find(
      m => m.user.toString() === userId.toString()
    );

    if (!existingMember) {
      company.members.push({
        user: userId,
        role: roleId,
        isActive: true,
        joinedAt: new Date()
      });
      await company.save();
    }

    res.json({
      success: true,
      message: 'Utilisateur assigné avec succès à l\'entreprise',
      user: {
        id: userToAssign._id,
        username: userToAssign.username,
        firstName: userToAssign.firstName,
        lastName: userToAssign.lastName,
        currentCompany: companyId,
        isCompanyValidated: true
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors de l\'assignation de l\'utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'assignation'
    });
  }
});

// POST /api/auth/set-security-question - Configurer la question de sécurité (utilisateur connecté)
router.post('/set-security-question', auth, async (req, res) => {
  try {
    const { securityQuestion, securityAnswer } = req.body;

    if (!securityQuestion || !securityAnswer) {
      return res.status(400).json({
        success: false,
        message: 'Question et réponse de sécurité requises'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    user.securityQuestion = securityQuestion;
    user.securityAnswer = securityAnswer; // Sera hashé par le middleware
    await user.save();

    res.json({
      success: true,
      message: 'Question de sécurité configurée avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur lors de la configuration de la question de sécurité:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/auth/get-security-question - Récupérer la question de sécurité d'un utilisateur
router.post('/get-security-question', async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Nom d\'utilisateur requis'
      });
    }

    const user = await User.findOne({ username }).select('securityQuestion');
    
    if (!user || !user.securityQuestion) {
      return res.status(404).json({
        success: false,
        message: 'Aucune question de sécurité configurée pour cet utilisateur'
      });
    }

    res.json({
      success: true,
      securityQuestion: user.securityQuestion
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération de la question:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/auth/reset-password-with-security - Réinitialiser le mot de passe avec question de sécurité
router.post('/reset-password-with-security', async (req, res) => {
  try {
    const { username, securityAnswer, newPassword } = req.body;

    console.log('🔐 Tentative de reset password pour:', username);

    if (!username || !securityAnswer || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs sont requis'
      });
    }

    // Trouver l'utilisateur
    const user = await User.findOne({ username });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier si une question de sécurité est configurée
    if (!user.securityQuestion || !user.securityAnswer) {
      return res.status(400).json({
        success: false,
        message: 'Aucune question de sécurité configurée pour cet utilisateur'
      });
    }

    // Vérifier la réponse de sécurité
    const validAnswer = await user.compareSecurityAnswer(securityAnswer);
    
    if (!validAnswer) {
      console.log('❌ Réponse de sécurité incorrecte');
      return res.status(401).json({
        success: false,
        message: 'Réponse de sécurité incorrecte'
      });
    }

    // Réinitialiser le mot de passe
    user.password = newPassword; // Sera hashé par le middleware
    await user.save();

    console.log('✅ Mot de passe réinitialisé avec succès pour:', username);

    res.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur lors du reset password:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la réinitialisation'
    });
  }
});

// POST /api/auth/use-company-code - Utiliser un code d'entreprise pour rejoindre une entreprise
router.post('/use-company-code', auth, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Le code d\'entreprise est requis'
      });
    }

    // Récupérer l'utilisateur connecté
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Valider le code d'entreprise
    const CompanyCode = require('../models/CompanyCode');
    const companyCode = await CompanyCode.findOne({ 
      code: code.toUpperCase() 
    }).populate('company');

    if (!companyCode) {
      return res.status(404).json({
        success: false,
        message: 'Code d\'entreprise non trouvé'
      });
    }

    // Vérifier la validité du code
    const validation = companyCode.isValid();
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.reason
      });
    }

    // Vérifier si l'utilisateur n'est pas déjà dans cette entreprise
    const existingAssignment = user.companies?.find(
      c => c.company.toString() === companyCode.company._id.toString()
    );

    if (existingAssignment) {
      return res.status(400).json({
        success: false,
        message: 'Vous êtes déjà membre de cette entreprise'
      });
    }

    // Chercher un rôle par défaut pour l'entreprise
    const defaultRole = await Role.findOne({ 
      company: companyCode.company._id,
      nom: { $in: ['Employé', 'Utilisateur', 'Membre'] }
    });

    if (!defaultRole) {
      return res.status(400).json({
        success: false,
        message: 'Aucun rôle par défaut trouvé pour cette entreprise'
      });
    }

    // Assigner l'utilisateur à l'entreprise
    if (!user.companies) {
      user.companies = [];
    }

    user.companies.push({
      company: companyCode.company._id,
      role: defaultRole._id,
      isActive: true,
      joinedAt: new Date()
    });

    // Si c'est la première entreprise, la définir comme entreprise courante
    if (!user.currentCompany) {
      user.currentCompany = companyCode.company._id;
      user.company = companyCode.company._id; // Compatibilité ancien système
      user.role = defaultRole._id;
    }

    user.isCompanyValidated = true;
    await user.save();

    // Ajouter l'utilisateur aux membres de l'entreprise
    const company = await Company.findById(companyCode.company._id);
    if (!company.members) {
      company.members = [];
    }

    company.members.push({
      user: user._id,
      role: defaultRole._id,
      isActive: true,
      joinedAt: new Date()
    });
    await company.save();

    // Enregistrer l'utilisation du code
    companyCode.usageHistory.push({
      user: user._id,
      usedAt: new Date()
    });
    companyCode.currentUses += 1;
    await companyCode.save();

    // Générer un nouveau token avec les informations mises à jour
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { 
        userId: user._id, 
        username: user.username,
        systemRole: user.systemRole,
        company: user.company,
        currentCompany: user.currentCompany
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: `Vous avez rejoint l'entreprise ${companyCode.company.name} avec succès !`,
      token,
      user: {
        id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        currentCompany: companyCode.company._id,
        companyName: companyCode.company.name,
        isCompanyValidated: true,
        needsCompanyCode: false
      },
      redirectTo: '/dashboard'
    });

  } catch (error) {
    console.error('❌ Erreur lors de l\'utilisation du code d\'entreprise:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'utilisation du code'
    });
  }
});

// ROUTE TEMPORAIRE - Réinitialiser le mot de passe d'un utilisateur (à supprimer après utilisation)
router.post('/reset-password-temp', async (req, res) => {
  try {
    const { username, newPassword } = req.body;

    if (!username || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Username et nouveau mot de passe requis'
      });
    }

    const user = await User.findOne({ username });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Hasher le nouveau mot de passe avec bcryptjs
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Mettre à jour directement (sans passer par le middleware pre-save)
    await User.updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword } }
    );

    console.log(`✅ Mot de passe réinitialisé pour ${username}`);

    res.json({
      success: true,
      message: `Mot de passe réinitialisé pour ${username}`
    });

  } catch (error) {
    console.error('Erreur lors de la réinitialisation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

module.exports = router;