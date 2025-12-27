const express = require('express');
const router = express.Router();
const CompanyCode = require('../models/CompanyCode');
const Company = require('../models/Company');
const User = require('../models/User');
const auth = require('../middleware/auth');

// POST /api/company-codes/generate - Générer un nouveau code d'entreprise
router.post('/generate', auth, async (req, res) => {
  try {
    const { maxUses, expiresInDays, description } = req.body;
    
    // Vérifier que l'utilisateur a une entreprise
    const user = await User.findById(req.user.id).populate('company');
    if (!user || !user.company) {
      return res.status(403).json({
        success: false,
        message: 'Vous devez être associé à une entreprise pour générer des codes'
      });
    }

    // Vérifier les permissions (seuls les propriétaires ou administrateurs peuvent générer des codes)
    const company = await Company.findById(user.company._id);
    if (!company || company.owner.toString() !== user._id.toString()) {
      // TODO: Ajouter vérification des rôles administrateurs
      return res.status(403).json({
        success: false,
        message: 'Seuls les propriétaires d\'entreprise peuvent générer des codes'
      });
    }

    // Générer un code unique
    const code = await CompanyCode.generateUniqueCode();
    
    // Calculer la date d'expiration si spécifiée
    let expiresAt = null;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiresInDays));
    }

    // Créer le code d'entreprise
    const companyCode = new CompanyCode({
      code,
      company: user.company._id,
      generatedBy: user._id,
      maxUses: maxUses && maxUses > 0 ? parseInt(maxUses) : null,
      expiresAt,
      description: description || `Code généré le ${new Date().toLocaleDateString('fr-FR')}`
    });

    await companyCode.save();

    res.status(201).json({
      success: true,
      message: 'Code d\'entreprise généré avec succès',
      data: {
        code: companyCode.code,
        maxUses: companyCode.maxUses,
        expiresAt: companyCode.expiresAt,
        description: companyCode.description,
        createdAt: companyCode.createdAt
      }
    });

  } catch (error) {
    console.error('Erreur lors de la génération du code:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la génération du code'
    });
  }
});

// GET /api/company-codes - Lister les codes de l'entreprise
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('company');
    if (!user || !user.company) {
      return res.status(403).json({
        success: false,
        message: 'Vous devez être associé à une entreprise'
      });
    }

    // Vérifier les permissions
    const company = await Company.findById(user.company._id);
    if (!company || company.owner.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Seuls les propriétaires d\'entreprise peuvent voir les codes'
      });
    }

    const codes = await CompanyCode.findByCompany(user.company._id, false);
    
    const codesWithStats = codes.map(code => ({
      id: code._id,
      code: code.code,
      description: code.description,
      stats: code.getUsageStats(),
      generatedBy: code.generatedBy,
      createdAt: code.createdAt
    }));

    res.json({
      success: true,
      data: {
        codes: codesWithStats,
        total: codes.length
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des codes:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des codes'
    });
  }
});

// POST /api/company-codes/validate - Valider un code d'entreprise
router.post('/validate', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Le code est requis'
      });
    }

    // Chercher le code d'entreprise
    const companyCode = await CompanyCode.findOne({ 
      code: code.toUpperCase() 
    }).populate('company', 'name description category');

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

    res.json({
      success: true,
      message: 'Code d\'entreprise valide',
      data: {
        company: {
          id: companyCode.company._id,
          name: companyCode.company.name,
          description: companyCode.company.description,
          category: companyCode.company.category
        },
        codeInfo: {
          description: companyCode.description,
          remainingUses: companyCode.maxUses ? 
            Math.max(0, companyCode.maxUses - companyCode.currentUses) : null,
          expiresAt: companyCode.expiresAt
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la validation du code:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la validation du code'
    });
  }
});

// PUT /api/company-codes/:id/toggle - Activer/désactiver un code
router.put('/:id/toggle', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('company');
    if (!user || !user.company) {
      return res.status(403).json({
        success: false,
        message: 'Vous devez être associé à une entreprise'
      });
    }

    const companyCode = await CompanyCode.findById(req.params.id);
    if (!companyCode) {
      return res.status(404).json({
        success: false,
        message: 'Code non trouvé'
      });
    }

    // Vérifier que le code appartient à l'entreprise de l'utilisateur
    if (companyCode.company.toString() !== user.company._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez pas modifier ce code'
      });
    }

    // Vérifier les permissions
    const company = await Company.findById(user.company._id);
    if (!company || company.owner.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Seuls les propriétaires d\'entreprise peuvent modifier les codes'
      });
    }

    companyCode.isActive = !companyCode.isActive;
    await companyCode.save();

    res.json({
      success: true,
      message: `Code ${companyCode.isActive ? 'activé' : 'désactivé'} avec succès`,
      data: {
        isActive: companyCode.isActive
      }
    });

  } catch (error) {
    console.error('Erreur lors de la modification du code:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la modification du code'
    });
  }
});

// DELETE /api/company-codes/:id - Supprimer un code
router.delete('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('company');
    if (!user || !user.company) {
      return res.status(403).json({
        success: false,
        message: 'Vous devez être associé à une entreprise'
      });
    }

    const companyCode = await CompanyCode.findById(req.params.id);
    if (!companyCode) {
      return res.status(404).json({
        success: false,
        message: 'Code non trouvé'
      });
    }

    // Vérifier que le code appartient à l'entreprise de l'utilisateur
    if (companyCode.company.toString() !== user.company._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez pas supprimer ce code'
      });
    }

    // Vérifier les permissions
    const company = await Company.findById(user.company._id);
    if (!company || company.owner.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Seuls les propriétaires d\'entreprise peuvent supprimer les codes'
      });
    }

    await CompanyCode.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Code supprimé avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la suppression du code:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la suppression du code'
    });
  }
});

// GET /api/company-codes/:id/usage - Historique d'utilisation d'un code
router.get('/:id/usage', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('company');
    if (!user || !user.company) {
      return res.status(403).json({
        success: false,
        message: 'Vous devez être associé à une entreprise'
      });
    }

    const companyCode = await CompanyCode.findById(req.params.id)
      .populate('usageHistory.user', 'username email firstName lastName');
    
    if (!companyCode) {
      return res.status(404).json({
        success: false,
        message: 'Code non trouvé'
      });
    }

    // Vérifier que le code appartient à l'entreprise de l'utilisateur
    if (companyCode.company.toString() !== user.company._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez pas voir l\'historique de ce code'
      });
    }

    // Vérifier les permissions
    const company = await Company.findById(user.company._id);
    if (!company || company.owner.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Seuls les propriétaires d\'entreprise peuvent voir l\'historique'
      });
    }

    res.json({
      success: true,
      data: {
        code: companyCode.code,
        stats: companyCode.getUsageStats(),
        usageHistory: companyCode.usageHistory
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération de l\'historique'
    });
  }
});

// POST /api/company-codes/use - Utiliser un code d'entreprise (assigner l'utilisateur)
router.post('/use', auth, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Le code est requis'
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

    // Chercher le code d'entreprise
    const companyCode = await CompanyCode.findOne({ 
      code: code.toUpperCase() 
    }).populate('company', 'name description category');

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
    const Role = require('../models/Role');
    let defaultRole = await Role.findOne({ 
      company: companyCode.company._id,
      nom: { $in: ['Employé', 'Utilisateur', 'Membre'] }
    });

    if (!defaultRole) {
      // Si aucun rôle par défaut, créer un rôle basique
      defaultRole = new Role({
        nom: 'Employé',
        description: 'Rôle employé par défaut',
        company: companyCode.company._id,
        permissions: [],
        normeSalariale: 0,
        typeContrat: 'CDI',
        isDefault: true,
        actif: true,
        creePar: user._id // Utilisateur qui utilise le code devient le créateur du rôle
      });
      await defaultRole.save();

      // Assigner les permissions de base au rôle Employé
      try {
        const { assignBasicPermissionsToEmployeeRole } = require('../utils/initializePermissions');
        await assignBasicPermissionsToEmployeeRole(defaultRole._id);
      } catch (permissionError) {
        console.error('Erreur lors de l\'assignation des permissions de base:', permissionError);
      }
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
    await user.save({ validateBeforeSave: false }); // Désactiver validation pour utilisateurs Discord

    // Ajouter l'utilisateur aux membres de l'entreprise
    const company = await Company.findById(companyCode.company._id);
    if (!company.members) {
      company.members = [];
    }

    const existingMember = company.members.find(
      m => m.user.toString() === user._id.toString()
    );

    if (!existingMember) {
      company.members.push({
        user: user._id,
        role: defaultRole._id,
        isActive: true,
        joinedAt: new Date()
      });
      await company.save();
    }

    // Enregistrer l'utilisation du code
    companyCode.usageHistory.push({
      user: user._id,
      usedAt: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
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
      company: {
        id: companyCode.company._id,
        name: companyCode.company.name,
        description: companyCode.company.description,
        category: companyCode.company.category
      },
      user: {
        id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        currentCompany: companyCode.company._id,
        isCompanyValidated: true
      },
      redirectTo: '/dashboard'
    });

  } catch (error) {
    console.error('Erreur lors de l\'utilisation du code d\'entreprise:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'utilisation du code',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
