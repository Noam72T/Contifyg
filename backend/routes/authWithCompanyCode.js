const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/User');
const Company = require('../models/Company');
const Role = require('../models/Role');
const CompanyCode = require('../models/CompanyCode');

// Middleware d'authentification
const auth = require('../middleware/auth');

// POST /api/auth-company/register - Inscription d'un utilisateur sans code d'entreprise (sera validé plus tard)
router.post('/register', async (req, res) => {
  try {
    const { username, password, firstName, lastName, phoneNumber, compteBancaire } = req.body;

    // Validation des champs obligatoires
    if (!username || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs obligatoires doivent être remplis (nom d\'utilisateur, mot de passe, prénom, nom)'
      });
    }

    // Validation du numéro de téléphone (format 555-XXXXXXX si fourni)
    if (phoneNumber && !/^555-\d+$/.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Le numéro de téléphone doit commencer par 555- suivi de chiffres'
      });
    }

    // Validation du compte bancaire (maximum 7 chiffres si fourni)
    if (compteBancaire && (!/^\d+$/.test(compteBancaire) || compteBancaire.length > 7)) {
      return res.status(400).json({
        success: false,
        message: 'Le numéro de compte bancaire ne peut contenir que des chiffres (maximum 7)'
      });
    }

    // Vérifier si l'utilisateur existe déjà (seulement par username maintenant)
    const existingUser = await User.findOne({ username });
    
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Un utilisateur avec ce nom d\'utilisateur existe déjà' 
      });
    }

    // Créer l'utilisateur sans assignation d'entreprise (sera fait lors de la validation du code)
    const user = new User({
      username,
      password, // Le hachage se fait automatiquement via le middleware pre('save')
      firstName,
      lastName,
      phoneNumber: phoneNumber || '',
      compteBancaire: compteBancaire || '',
      isCompanyValidated: false, // Pas encore validé
      isActive: true
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'Inscription réussie. Veuillez valider votre code d\'entreprise pour accéder à l\'application.',
      user: {
        id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        compteBancaire: user.compteBancaire,
        isCompanyValidated: user.isCompanyValidated
      }
    });

  } catch (error) {
    console.error('Erreur lors de l\'inscription avec code d\'entreprise:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur lors de l\'inscription' 
    });
  }
});

// POST /api/auth-company/validate-code - Validation du code d'entreprise pour un utilisateur connecté
router.post('/validate-code', auth, async (req, res) => {
  try {
    const { companyCode } = req.body;
    const userId = req.user.userId;

    // Validation des champs obligatoires
    if (!companyCode) {
      return res.status(400).json({
        success: false,
        message: 'Le code d\'entreprise est requis'
      });
    }

    // Récupérer l'utilisateur
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier si l'utilisateur n'est pas déjà validé
    if (user.isCompanyValidated) {
      return res.status(400).json({
        success: false,
        message: 'Utilisateur déjà validé pour une entreprise'
      });
    }

    // Vérifier si le code d'entreprise existe et est actif
    const companyCodeDoc = await CompanyCode.findOne({ 
      code: companyCode.toUpperCase(),
      isActive: true 
    }).populate('company');

    if (!companyCodeDoc) {
      return res.status(400).json({
        success: false,
        message: 'Code d\'entreprise invalide ou inactif'
      });
    }

    // Vérifier la validité du code
    const validation = companyCodeDoc.isValid();
    if (!validation.valid) {
      return res.status(400).json({ 
        success: false, 
        message: `Code d'entreprise non valide: ${validation.reason}` 
      });
    }

    // Obtenir le rôle par défaut (niveau 1) pour l'entreprise
    let defaultRole = await Role.findOne({ 
      company: companyCodeDoc.company._id,
      level: 1
    });

    // Si aucun rôle niveau 1, créer un rôle par défaut
    if (!defaultRole) {
      defaultRole = new Role({
        name: 'Employee',
        level: 1,
        company: companyCodeDoc.company._id,
        permissions: []
      });
      await defaultRole.save();
    }

    // Mettre à jour l'utilisateur avec les informations de l'entreprise
    user.company = companyCodeDoc.company._id;
    user.role = defaultRole._id;
    user.companyCode = companyCode.toUpperCase();
    user.companyCodeUsedAt = new Date();
    user.isCompanyValidated = true;

    await user.save();

    // Utiliser le code d'entreprise (incrémenter le compteur, ajouter à l'historique)
    const userAgent = req.get('User-Agent');
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    await companyCodeDoc.useCode(user._id, ipAddress, userAgent);

    // Générer un nouveau token JWT avec les informations de l'entreprise
    const token = jwt.sign(
      { 
        userId: user._id, 
        companyId: user.company,
        roleId: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Code d\'entreprise validé avec succès',
      token,
      user: {
        id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        compteBancaire: user.compteBancaire,
        company: {
          id: companyCodeDoc.company._id,
          name: companyCodeDoc.company.name,
          category: companyCodeDoc.company.category
        },
        role: {
          id: defaultRole._id,
          name: defaultRole.name,
          level: defaultRole.level
        },
        isCompanyValidated: user.isCompanyValidated
      }
    });

  } catch (error) {
    console.error('Erreur lors de la validation du code d\'entreprise:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur lors de la validation du code' 
    });
  }
});

// POST /api/auth-company/login - Connexion avec vérification d'entreprise
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Trouver l'utilisateur avec ses relations
    const user = await User.findOne({ username })
      .populate('company')
      .populate('role');

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Nom d\'utilisateur ou mot de passe incorrect' 
      });
    }

    // Vérifier si l'utilisateur est actif
    if (!user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Compte désactivé' 
      });
    }

    // Note: On permet la connexion même si l'utilisateur n'est pas encore validé
    // La validation du code d'entreprise se fera après la connexion

    // Vérifier le mot de passe
    const validPassword = await user.comparePassword(password);
    
    if (!validPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Nom d\'utilisateur ou mot de passe incorrect' 
      });
    }

    // Générer le token JWT avec toutes les informations utilisateur
    const tokenPayload = { 
      userId: user._id,
      username: user.username,
      systemRole: user.systemRole,
      isCompanyValidated: user.isCompanyValidated
    };
    
    // Ajouter les informations d'entreprise si disponibles
    if (user.company) {
      tokenPayload.company = user.company._id;
    }
    if (user.currentCompany) {
      tokenPayload.currentCompany = user.currentCompany;
    }
    if (user.role) {
      tokenPayload.roleId = user.role._id;
    }
    
    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Mettre à jour la dernière connexion
    user.lastLogin = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Connexion réussie',
      token,
      user: {
        id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        compteBancaire: user.compteBancaire,
        company: user.company || null,
        role: user.role || null,
        lastLogin: user.lastLogin,
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

// POST /api/auth-company/validate-company-code - Valider un code d'entreprise (route publique)
router.post('/validate-company-code', async (req, res) => {
  try {
    const { companyCode } = req.body;

    if (!companyCode) {
      return res.status(400).json({
        success: false,
        message: 'Le code d\'entreprise est requis'
      });
    }

    // Chercher le code d'entreprise
    const companyCodeDoc = await CompanyCode.findOne({ 
      code: companyCode.toUpperCase(),
      isActive: true
    }).populate('company');

    if (!companyCodeDoc) {
      return res.status(404).json({
        success: false,
        message: 'Code d\'entreprise invalide ou inactif'
      });
    }

    // Vérifier la validité du code
    const validation = companyCodeDoc.isValid();
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: `Code non valide: ${validation.reason}`
      });
    }

    // Retourner les informations de l'entreprise pour permettre l'accès
    res.json({
      success: true,
      message: 'Code d\'entreprise valide',
      company: {
        id: companyCodeDoc.company._id,
        name: companyCodeDoc.company.name,
        description: companyCodeDoc.company.description,
        category: companyCodeDoc.company.category
      },
      companyCode: companyCode.toUpperCase()
    });

  } catch (error) {
    console.error('Erreur lors de la validation du code:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la validation du code'
    });
  }
});

// GET /api/auth-company/me - Obtenir les informations de l'utilisateur connecté
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('company', 'name description category')
      .populate('role', 'nom niveau permissions')
      .select('-password');

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Utilisateur non trouvé' 
      });
    }

    // Vérifier si l'utilisateur est validé par code d'entreprise
    if (!user.isCompanyValidated) {
      return res.status(401).json({ 
        success: false, 
        message: 'Accès refusé: vous devez être assigné à une entreprise via un code valide' 
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          company: user.company,
          role: user.role,
          lastLogin: user.lastLogin,
          isCompanyValidated: user.isCompanyValidated,
          companyCodeUsedAt: user.companyCodeUsedAt
        }
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

// POST /api/auth-company/create-user-with-code - Créer un utilisateur avec un code d'entreprise
router.post('/create-user-with-code', async (req, res) => {
  try {
    const { companyCode, username, firstName, lastName, phoneNumber, password, confirmPassword, compteBancaire } = req.body;

    // Validation des champs obligatoires
    if (!companyCode || !username || !firstName || !lastName || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Code d\'entreprise, nom d\'utilisateur, prénom, nom et mots de passe sont requis'
      });
    }

    // Vérifier que les mots de passe correspondent
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Les mots de passe ne correspondent pas'
      });
    }

    // Validation du mot de passe (minimum 6 caractères)
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir au moins 6 caractères'
      });
    }

    // Validation du numéro de téléphone (format 555-XXXXXXX si fourni)
    if (phoneNumber && !/^555-\d+$/.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Le numéro de téléphone doit commencer par 555- suivi de chiffres'
      });
    }

    // Validation du compte bancaire (maximum 7 chiffres si fourni)
    if (compteBancaire && (!/^\d+$/.test(compteBancaire) || compteBancaire.length > 7)) {
      return res.status(400).json({
        success: false,
        message: 'Le numéro de compte bancaire ne peut contenir que des chiffres (maximum 7)'
      });
    }

    // Vérifier si le code d'entreprise existe et est actif
    const companyCodeDoc = await CompanyCode.findOne({ 
      code: companyCode.toUpperCase(),
      isActive: true 
    }).populate('company');

    if (!companyCodeDoc) {
      return res.status(400).json({
        success: false,
        message: 'Code d\'entreprise invalide ou inactif'
      });
    }

    // Vérifier la validité du code
    const validation = companyCodeDoc.isValid();
    if (!validation.valid) {
      return res.status(400).json({ 
        success: false, 
        message: `Code d'entreprise non valide: ${validation.reason}` 
      });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Ce nom d\'utilisateur est déjà utilisé'
      });
    }

    // Obtenir le rôle par défaut (niveau 1) pour l'entreprise
    let defaultRole = await Role.findOne({ 
      company: companyCodeDoc.company._id,
      level: 1
    });

    // Si aucun rôle niveau 1, créer un rôle par défaut
    if (!defaultRole) {
      defaultRole = new Role({
        name: 'Employee',
        level: 1,
        company: companyCodeDoc.company._id,
        permissions: []
      });
      await defaultRole.save();
    }

    // Créer l'utilisateur
    const newUser = new User({
      username,
      firstName,
      lastName,
      phoneNumber: phoneNumber || '',
      compteBancaire: compteBancaire || '',
      password, // Le hachage se fait automatiquement via le middleware pre('save')
      company: companyCodeDoc.company._id,
      role: defaultRole._id,
      companyCode: companyCode.toUpperCase(),
      companyCodeUsedAt: new Date(),
      isCompanyValidated: true,
      isActive: true,
      systemRole: 'Utilisateur'
    });

    await newUser.save();

    // Utiliser le code d'entreprise (incrémenter le compteur, ajouter à l'historique)
    const userAgent = req.get('User-Agent');
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    await companyCodeDoc.useCode(newUser._id, ipAddress, userAgent);

    res.json({
      success: true,
      message: 'Utilisateur créé avec succès',
      user: {
        id: newUser._id,
        username: newUser.username,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        phoneNumber: newUser.phoneNumber,
        compteBancaire: newUser.compteBancaire,
        company: {
          id: companyCodeDoc.company._id,
          name: companyCodeDoc.company.name,
          category: companyCodeDoc.company.category
        },
        role: {
          id: defaultRole._id,
          name: defaultRole.name,
          level: defaultRole.level
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur lors de la création de l\'utilisateur' 
    });
  }
});

// POST /api/auth-company/assign-existing-user - Assigner un utilisateur existant à une entreprise
router.post('/assign-existing-user', auth, async (req, res) => {
  try {
    console.log('🏢 Assignation utilisateur existant à une entreprise');
    console.log('👤 Utilisateur ID:', req.userId);
    console.log('🎫 Code entreprise:', req.body.companyCode);
    
    const { companyCode } = req.body;
    const userId = req.userId;

    if (!companyCode) {
      console.log('❌ Code entreprise manquant');
      return res.status(400).json({
        success: false,
        message: 'Le code d\'entreprise est requis'
      });
    }

    // Récupérer l'utilisateur actuel
    console.log('👤 Recherche utilisateur...');
    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ Utilisateur non trouvé');
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    console.log('✅ Utilisateur trouvé:', user.username);

    // Valider le code d'entreprise
    console.log('🔍 Validation du code d\'entreprise...');
    const companyCodeDoc = await CompanyCode.findOne({ 
      code: companyCode.toUpperCase() 
    }).populate('company');

    if (!companyCodeDoc) {
      console.log('❌ Code d\'entreprise non trouvé');
      return res.status(404).json({
        success: false,
        message: 'Code d\'entreprise non trouvé'
      });
    }

    console.log('✅ Code d\'entreprise valide pour:', companyCodeDoc.company.name);

    // Vérifier la validité du code
    const validation = companyCodeDoc.isValid();
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.reason
      });
    }

    // Vérifier si l'utilisateur n'est pas déjà assigné à cette entreprise
    const isAlreadyAssigned = user.companies?.some(c => 
      c.company.toString() === companyCodeDoc.company._id.toString()
    ) || (user.company && user.company.toString() === companyCodeDoc.company._id.toString());

    if (isAlreadyAssigned) {
      console.log('ℹ️ Utilisateur déjà assigné à cette entreprise - redirection vers dashboard');
      
      // Mettre à jour currentCompany si nécessaire
      if (user.currentCompany?.toString() !== companyCodeDoc.company._id.toString()) {
        user.currentCompany = companyCodeDoc.company._id;
        await user.save();
        console.log('🔄 Entreprise actuelle mise à jour');
      }

      // Générer un nouveau token
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Retourner un succès avec redirection au lieu d'une erreur
      return res.json({
        success: true,
        message: `Vous êtes déjà membre de ${companyCodeDoc.company.name}`,
        company: {
          id: companyCodeDoc.company._id,
          name: companyCodeDoc.company.name,
          description: companyCodeDoc.company.description,
          category: companyCodeDoc.company.category
        },
        user: {
          id: user._id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          currentCompany: user.currentCompany
        },
        token: token,
        redirectTo: '/dashboard',
        shouldRefresh: true,
        alreadyMember: true // Indiquer que l'utilisateur était déjà membre
      });
    }

    // Trouver ou créer un rôle par défaut pour l'entreprise
    let defaultRole = await Role.findOne({ 
      company: companyCodeDoc.company._id, 
      isDefault: true 
    });

    if (!defaultRole) {
      // Créer un rôle par défaut "Employé"
      defaultRole = new Role({
        nom: 'Employé',
        creePar: user._id,
        company: companyCodeDoc.company._id,
        description: 'Rôle par défaut pour les employés',
        normeSalariale: 0,
        typeContrat: 'CDI',
        isDefault: true,
        permissions: []
      });
      await defaultRole.save();
    }

    // Assigner l'utilisateur à l'entreprise
    user.company = companyCodeDoc.company._id;
    user.role = defaultRole._id;
    user.isCompanyValidated = true;
    user.currentCompany = companyCodeDoc.company._id;
    
    // Ajouter l'entreprise à la liste des entreprises de l'utilisateur si pas déjà présente
    const companyExists = user.companies.some(c => 
      c.company.toString() === companyCodeDoc.company._id.toString()
    );
    
    if (!companyExists) {
      user.companies.push({
        company: companyCodeDoc.company._id,
        role: defaultRole._id,
        joinedAt: new Date()
      });
    }

    await user.save();

    // L'utilisateur est déjà ajouté à l'entreprise via le champ companies dans le modèle User
    console.log('✅ Utilisateur ajouté à l\'entreprise via le champ companies du modèle User');

    // Enregistrer l'utilisation du code
    companyCodeDoc.usageHistory.push({
      user: user._id,
      usedAt: new Date()
    });
    companyCodeDoc.currentUses += 1;
    await companyCodeDoc.save();

    // Générer un nouveau token avec les informations mises à jour
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ Utilisateur assigné à l\'entreprise avec succès');
    console.log('🏢 Entreprise:', companyCodeDoc.company.name);
    console.log('🎯 Redirection vers dashboard recommandée');

    res.json({
      success: true,
      message: 'Utilisateur assigné à l\'entreprise avec succès',
      company: {
        id: companyCodeDoc.company._id,
        name: companyCodeDoc.company.name,
        description: companyCodeDoc.company.description,
        category: companyCodeDoc.company.category
      },
      user: {
        id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        currentCompany: user.currentCompany,
        role: {
          id: defaultRole._id,
          name: defaultRole.nom
        }
      },
      token: token,
      redirectTo: '/dashboard', // Indiquer au frontend où rediriger
      shouldRefresh: true // Indiquer qu'il faut rafraîchir les données utilisateur
    });

  } catch (error) {
    console.error('Erreur lors de l\'assignation de l\'utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'assignation de l\'utilisateur'
    });
  }
});

// GET /api/auth-company/refresh-user-data - Récupérer les données utilisateur mises à jour
router.get('/refresh-user-data', auth, async (req, res) => {
  try {
    console.log('🔄 Rafraîchissement des données utilisateur:', req.userId);
    
    const user = await User.findById(req.userId)
      .populate('currentCompany', 'name description category')
      .populate({
        path: 'companies.company',
        select: 'name description category'
      })
      .populate({
        path: 'companies.role',
        select: 'nom description normeSalariale typeContrat'
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    console.log('✅ Données utilisateur récupérées');
    console.log('🏢 Entreprise actuelle:', user.currentCompany?.name || 'Aucune');

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        systemRole: user.systemRole,
        currentCompany: user.currentCompany,
        companies: user.companies,
        isCompanyValidated: user.isCompanyValidated,
        isActive: user.isActive
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors du rafraîchissement des données:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors du rafraîchissement des données'
    });
  }
});

module.exports = router;
