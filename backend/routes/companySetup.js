const express = require('express');
const router = express.Router();
const CompanyCode = require('../models/CompanyCode');
const Company = require('../models/Company');
const User = require('../models/User');
const auth = require('../middleware/auth');

// POST /api/company-setup/generate-first-code - Générer le premier code pour une entreprise nouvellement créée
router.post('/generate-first-code', auth, async (req, res) => {
  try {
    const { companyId, maxUses, expiresInDays, description } = req.body;
    
    // Vérifier que l'utilisateur existe
    const user = await User.findById(req.user.id);
    if (!user) {
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

    // Vérifier que l'utilisateur est le propriétaire de l'entreprise
    if (company.owner.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Seuls les propriétaires d\'entreprise peuvent générer des codes'
      });
    }

    // Vérifier qu'aucun code n'existe déjà pour cette entreprise
    const existingCodes = await CompanyCode.find({ company: companyId });
    if (existingCodes.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cette entreprise a déjà des codes générés. Utilisez la route normale pour générer de nouveaux codes.'
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

    // Créer le premier code d'entreprise
    const companyCode = new CompanyCode({
      code,
      company: companyId,
      generatedBy: user._id,
      maxUses: maxUses && maxUses > 0 ? parseInt(maxUses) : null,
      expiresAt,
      description: description || `Premier code généré pour ${company.name}`
    });

    await companyCode.save();

    res.status(201).json({
      success: true,
      message: 'Premier code d\'entreprise généré avec succès',
      data: {
        code: companyCode.code,
        company: {
          id: company._id,
          name: company.name
        },
        maxUses: companyCode.maxUses,
        expiresAt: companyCode.expiresAt,
        description: companyCode.description,
        createdAt: companyCode.createdAt,
        instructions: {
          message: 'Partagez ce code avec vos employés pour qu\'ils puissent s\'inscrire et être assignés à votre entreprise',
          registrationUrl: '/api/auth-company/register'
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la génération du premier code:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la génération du premier code'
    });
  }
});

// GET /api/company-setup/company-status/:companyId - Vérifier le statut d'une entreprise
router.get('/company-status/:companyId', auth, async (req, res) => {
  try {
    const { companyId } = req.params;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Entreprise non trouvée'
      });
    }

    // Vérifier que l'utilisateur est le propriétaire
    if (company.owner.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé'
      });
    }

    // Compter les codes existants
    const totalCodes = await CompanyCode.countDocuments({ company: companyId });
    const activeCodes = await CompanyCode.countDocuments({ 
      company: companyId, 
      isActive: true,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    });

    // Compter les employés
    const totalEmployees = await User.countDocuments({ 
      company: companyId,
      isCompanyValidated: true 
    });

    res.json({
      success: true,
      data: {
        company: {
          id: company._id,
          name: company.name,
          category: company.category,
          isActive: company.isActive
        },
        codes: {
          total: totalCodes,
          active: activeCodes,
          hasAnyCodes: totalCodes > 0
        },
        employees: {
          total: totalEmployees
        },
        canGenerateFirstCode: totalCodes === 0
      }
    });

  } catch (error) {
    console.error('Erreur lors de la vérification du statut:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la vérification du statut'
    });
  }
});

module.exports = router;
