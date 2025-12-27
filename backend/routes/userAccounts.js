const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/User');
const Company = require('../models/Company');
const Role = require('../models/Role');
const auth = require('../middleware/auth');

// GET /api/user-accounts - Récupérer tous les comptes de l'utilisateur connecté
router.get('/', auth, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    
    // Trouver tous les comptes avec le même discordId ou username
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    let accounts = [];
    
    // Si l'utilisateur a un accountFamilyId, chercher tous les comptes de la même famille
    if (currentUser.accountFamilyId) {
      accounts = await User.find({ 
        accountFamilyId: currentUser.accountFamilyId,
        isActive: true 
      })
      .populate('company', 'name logo category')
      .populate('role', 'name level permissions')
      .select('-password')
      .sort({ createdAt: 1 });
    }
    // Sinon, si l'utilisateur a un discordId, chercher tous les comptes avec le même discordId
    else if (currentUser.discordId) {
      accounts = await User.find({ 
        discordId: currentUser.discordId,
        isActive: true 
      })
      .populate('company', 'name logo category')
      .populate('role', 'name level permissions')
      .select('-password')
      .sort({ createdAt: 1 });
    }
    // Sinon, retourner seulement le compte actuel
    else {
      accounts = await User.find({ 
        _id: currentUser._id,
        isActive: true 
      })
      .populate('company', 'name logo category')
      .populate('role', 'name level permissions')
      .select('-password');
    }

    // Formater les données pour le frontend
    const formattedAccounts = accounts.map(account => ({
      id: account._id,
      username: account.username,
      firstName: account.firstName,
      lastName: account.lastName,
      avatar: account.avatar,
      company: account.company ? {
        id: account.company._id,
        name: account.company.name,
        logo: account.company.logo,
        category: account.company.category
      } : null,
      role: account.role ? {
        id: account.role._id,
        name: account.role.name,
        level: account.role.level
      } : null,
      systemRole: account.systemRole,
      isActivated: account.isActivated,
      isCompanyValidated: account.isCompanyValidated,
      createdAt: account.createdAt,
      isCurrent: account._id.toString() === currentUserId
    }));

    res.json({
      success: true,
      accounts: formattedAccounts,
      currentAccountId: currentUserId
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des comptes:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des comptes'
    });
  }
});

// POST /api/user-accounts/switch - Changer de compte
router.post('/switch', auth, async (req, res) => {
  try {
    const { accountId } = req.body;
    const currentUserId = req.user.id;

    if (!accountId) {
      return res.status(400).json({
        success: false,
        message: 'ID du compte requis'
      });
    }

    // Vérifier que le compte cible existe et appartient au même utilisateur
    const currentUser = await User.findById(currentUserId);
    const targetAccount = await User.findById(accountId)
      .populate('company', 'name logo category')
      .populate('role', 'name level permissions');

    if (!currentUser || !targetAccount) {
      return res.status(404).json({
        success: false,
        message: 'Compte non trouvé'
      });
    }

    // Vérifier que les comptes appartiennent à la même famille (accountFamilyId)
    let canSwitch = false;
    
    // Priorité 1: Vérifier par accountFamilyId (système multi-comptes)
    if (currentUser.accountFamilyId && targetAccount.accountFamilyId) {
      canSwitch = currentUser.accountFamilyId === targetAccount.accountFamilyId;
      console.log('🔍 Vérification par accountFamilyId:', {
        current: currentUser.accountFamilyId,
        target: targetAccount.accountFamilyId,
        canSwitch
      });
    }
    // Priorité 2: Vérifier par discordId (ancien système)
    else if (currentUser.discordId && targetAccount.discordId) {
      canSwitch = currentUser.discordId === targetAccount.discordId;
      console.log('🔍 Vérification par discordId');
    }
    // Priorité 3: Vérifier par username (très ancien système)
    else {
      canSwitch = currentUser.username === targetAccount.username;
      console.log('🔍 Vérification par username');
    }

    if (!canSwitch) {
      console.log('❌ Switch refusé - comptes non liés');
      return res.status(403).json({
        success: false,
        message: 'Vous n\'avez pas l\'autorisation de basculer vers ce compte'
      });
    }
    
    console.log('✅ Switch autorisé');

    // Vérifier que le compte cible est actif
    if (!targetAccount.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Ce compte est désactivé'
      });
    }

    // Générer un nouveau token pour le compte cible
    const token = jwt.sign(
      { 
        id: targetAccount._id,
        username: targetAccount.username,
        systemRole: targetAccount.systemRole
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Mettre à jour la date de dernière connexion
    targetAccount.lastLogin = new Date();
    await targetAccount.save();

    // Retourner les informations du nouveau compte avec toutes les données nécessaires
    console.log('📤 Envoi des données du compte:', {
      username: targetAccount.username,
      company: targetAccount.company?.name || 'Aucune',
      accountFamilyId: targetAccount.accountFamilyId
    });
    
    res.json({
      success: true,
      message: 'Changement de compte réussi',
      token,
      user: {
        _id: targetAccount._id,
        id: targetAccount._id,
        username: targetAccount.username,
        firstName: targetAccount.firstName,
        lastName: targetAccount.lastName,
        email: targetAccount.email,
        avatar: targetAccount.avatar,
        phoneNumber: targetAccount.phoneNumber,
        compteBancaire: targetAccount.compteBancaire,
        company: targetAccount.company,
        currentCompany: targetAccount.company?._id || targetAccount.company,
        companies: targetAccount.companies || [],
        role: targetAccount.role,
        systemRole: targetAccount.systemRole,
        isActivated: targetAccount.isActivated,
        isCompanyValidated: targetAccount.isCompanyValidated,
        discordId: targetAccount.discordId,
        discordUsername: targetAccount.discordUsername,
        lastLogin: targetAccount.lastLogin,
        primes: targetAccount.primes || 0,
        avances: targetAccount.avances || 0,
        socialScore: targetAccount.socialScore || 0,
        accountFamilyId: targetAccount.accountFamilyId
      }
    });

  } catch (error) {
    console.error('Erreur lors du changement de compte:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors du changement de compte'
    });
  }
});

// DELETE /api/user-accounts/:accountId - Supprimer un compte
router.delete('/:accountId', auth, async (req, res) => {
  try {
    const { accountId } = req.params;
    const currentUserId = req.user.id;

    console.log('🗑️ Demande de suppression du compte:', accountId);

    if (!accountId) {
      return res.status(400).json({
        success: false,
        message: 'ID du compte requis'
      });
    }

    // Récupérer le compte actuel et le compte à supprimer
    const currentUser = await User.findById(currentUserId);
    const accountToDelete = await User.findById(accountId);

    if (!currentUser || !accountToDelete) {
      return res.status(404).json({
        success: false,
        message: 'Compte non trouvé'
      });
    }

    // Vérifier que les comptes appartiennent à la même famille
    let canDelete = false;
    
    if (currentUser.accountFamilyId && accountToDelete.accountFamilyId) {
      canDelete = currentUser.accountFamilyId === accountToDelete.accountFamilyId;
    } else if (currentUser.discordId && accountToDelete.discordId) {
      canDelete = currentUser.discordId === accountToDelete.discordId;
    }

    if (!canDelete) {
      console.log('❌ Suppression refusée - comptes non liés');
      return res.status(403).json({
        success: false,
        message: 'Vous n\'avez pas l\'autorisation de supprimer ce compte'
      });
    }

    // Empêcher la suppression du compte actuellement connecté
    if (accountId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas supprimer le compte actuellement connecté. Veuillez d\'abord basculer vers un autre compte.'
      });
    }

    // Supprimer le compte
    await User.findByIdAndDelete(accountId);
    
    console.log('✅ Compte supprimé avec succès:', {
      deletedAccount: accountToDelete.username,
      deletedBy: currentUser.username
    });

    res.json({
      success: true,
      message: 'Compte supprimé avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur lors de la suppression du compte:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la suppression du compte'
    });
  }
});

// POST /api/user-accounts/create - Créer un nouveau compte pour rejoindre une entreprise
router.post('/create', auth, async (req, res) => {
  try {
    const { companyCode, firstName, lastName, username, password, phoneNumber, compteBancaire } = req.body;
    const currentUserId = req.user.id;

    if (!companyCode || !firstName || !lastName || !username || !password || !phoneNumber || !compteBancaire) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs obligatoires sont requis'
      });
    }

    // Récupérer l'utilisateur actuel
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier le code d'entreprise
    const company = await Company.findOne({ 
      companyCode: companyCode.toUpperCase(),
      isActive: true 
    });

    if (!company) {
      return res.status(400).json({
        success: false,
        message: 'Code d\'entreprise invalide'
      });
    }

    // Vérifier si l'utilisateur actuel a déjà un compte pour cette entreprise
    // On cherche tous les comptes liés à cet utilisateur (même discordId ou même identité)
    let existingAccountQuery = {};
    
    if (currentUser.discordId) {
      // Si l'utilisateur a un discordId, on cherche tous les comptes avec le même discordId
      existingAccountQuery = {
        discordId: currentUser.discordId,
        company: company._id,
        isActive: true
      };
    } else {
      // Sinon, on cherche par username/email de l'utilisateur actuel
      existingAccountQuery = {
        $or: [
          { username: currentUser.username, company: company._id },
          { email: currentUser.email, company: company._id }
        ],
        isActive: true
      };
    }

    const existingAccount = await User.findOne(existingAccountQuery);

    if (existingAccount) {
      return res.status(400).json({
        success: false,
        message: 'Vous avez déjà un compte pour cette entreprise'
      });
    }

    // Vérifier l'unicité du username globalement
    const existingUsername = await User.findOne({
      username: username,
      isActive: true
    });

    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'Ce nom d\'utilisateur est déjà pris'
      });
    }

    // Obtenir le rôle par défaut de l'entreprise
    const defaultRole = await Role.findOne({
      company: company._id,
      level: 0
    });

    // Créer le nouveau compte
    const newAccount = new User({
      username: username,
      password: password, // Le mot de passe sera hashé automatiquement par le middleware
      firstName,
      lastName,
      discordId: currentUser.discordId,
      discordUsername: currentUser.discordUsername,
      avatar: currentUser.avatar,
      company: company._id,
      role: defaultRole ? defaultRole._id : null,
      systemRole: 'Utilisateur',
      isActivated: true,
      isCompanyValidated: true,
      companyCode: companyCode.toUpperCase(),
      companyCodeUsedAt: new Date(),
      phoneNumber: phoneNumber,
      compteBancaire: compteBancaire
    });

    await newAccount.save();

    // Populer les données pour la réponse
    await newAccount.populate('company', 'name logo category');
    await newAccount.populate('role', 'name level permissions');

    res.status(201).json({
      success: true,
      message: 'Nouveau compte créé avec succès',
      account: {
        id: newAccount._id,
        username: newAccount.username,
        firstName: newAccount.firstName,
        lastName: newAccount.lastName,
        avatar: newAccount.avatar,
        company: {
          id: newAccount.company._id,
          name: newAccount.company.name,
          logo: newAccount.company.logo,
          category: newAccount.company.category
        },
        role: newAccount.role ? {
          id: newAccount.role._id,
          name: newAccount.role.name,
          level: newAccount.role.level
        } : null,
        systemRole: newAccount.systemRole,
        isActivated: newAccount.isActivated,
        isCompanyValidated: newAccount.isCompanyValidated,
        createdAt: newAccount.createdAt
      }
    });

  } catch (error) {
    console.error('Erreur lors de la création du compte:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création du compte'
    });
  }
});

module.exports = router;
