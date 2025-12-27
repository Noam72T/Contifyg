const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/User');
const CompanyCode = require('../models/CompanyCode');
const Role = require('../models/Role');
const auth = require('../middleware/auth');

// POST /api/discord-company/complete-registration - Compléter l'inscription Discord sans code d'entreprise
router.post('/complete-registration', auth, async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber, compteBancaire, username } = req.body;

    console.log('📝 Complétion profil Discord - Données reçues:', {
      firstName,
      lastName,
      phoneNumber,
      compteBancaire,
      username
    });

    console.log('🔍 Validation des champs:', {
      hasFirstName: !!firstName,
      hasLastName: !!lastName,
      hasPhoneNumber: !!phoneNumber,
      hasCompteBancaire: !!compteBancaire,
      hasUsername: !!username
    });

    // Validation des champs obligatoires (pas de mot de passe pour Discord)
    if (!firstName || !lastName || !phoneNumber || !compteBancaire) {
      console.log('❌ Validation échouée - Champs manquants:', {
        firstName: firstName || 'MANQUANT',
        lastName: lastName || 'MANQUANT',
        phoneNumber: phoneNumber || 'MANQUANT',
        compteBancaire: compteBancaire || 'MANQUANT'
      });
      return res.status(400).json({
        success: false,
        message: 'Tous les champs obligatoires sont requis (firstName, lastName, phoneNumber, compteBancaire)'
      });
    }

    // Validation du numéro de téléphone (format 555-XXXXXXX obligatoire)
    if (!/^555-\d+$/.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Le numéro de téléphone doit commencer par 555- suivi de chiffres'
      });
    }

    // Validation du compte bancaire (maximum 7 chiffres obligatoire)
    if (!/^\d+$/.test(compteBancaire) || compteBancaire.length > 7) {
      return res.status(400).json({
        success: false,
        message: 'Le numéro de compte bancaire ne peut contenir que des chiffres (maximum 7)'
      });
    }

    // Récupérer l'utilisateur Discord
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier que c'est bien un utilisateur Discord non validé
    if (!user.discordId) {
      return res.status(400).json({
        success: false,
        message: 'Cette route est réservée aux utilisateurs Discord'
      });
    }

    // Mettre à jour l'utilisateur avec les informations complètes
    user.firstName = firstName;
    user.lastName = lastName;
    user.phoneNumber = phoneNumber;
    user.compteBancaire = compteBancaire;
    
    // Mettre à jour le username si fourni
    if (username && username !== user.username) {
      user.username = username;
    }
    
    // Pas de mot de passe pour les comptes Discord (authentification via Discord)
    
    // S'assurer que l'email est défini (utiliser l'email Discord ou un email par défaut)
    if (!user.email) {
      user.email = `${user.discordId}@discord.user`;
      console.log('⚠️ Email manquant, utilisation d\'un email par défaut:', user.email);
    }
    
    // Ne pas assigner d'entreprise ici, cela se fera avec le code d'entreprise
    console.log('✅ Utilisateur mis à jour:', {
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    });

    await user.save();

    // Générer un nouveau token JWT
    const token = jwt.sign(
      { 
        id: user._id,
        username: user.username,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ Profil Discord complété avec succès pour:', user.username);
    
    res.json({
      success: true,
      message: 'Profil Discord complété avec succès',
      token: token,
      user: {
        _id: user._id,
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        compteBancaire: user.compteBancaire,
        company: user.company,
        role: user.role,
        isCompanyValidated: user.isCompanyValidated,
        isActivated: user.isActivated,
        systemRole: user.systemRole,
        discordId: user.discordId,
        discordUsername: user.discordUsername,
        avatar: user.avatar,
        primes: user.primes || 0,
        avances: user.avances || 0,
        socialScore: user.socialScore || 0
      }
    });

  } catch (error) {
    console.error('Erreur lors de la complétion de l\'inscription Discord:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur lors de la complétion de l\'inscription' 
    });
  }
});

// GET /api/discord-company/status - Vérifier le statut de l'utilisateur Discord
router.get('/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('company', 'name description category')
      .populate('role', 'nom niveau');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
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
          compteBancaire: user.compteBancaire,
          isDiscordUser: !!user.discordId,
          isCompanyValidated: user.isCompanyValidated,
          needsCompletion: !!user.discordId && !user.isCompanyValidated,
          company: user.company,
          role: user.role,
          discordUsername: user.discordUsername,
          avatar: user.avatar,
          companyCodeUsedAt: user.companyCodeUsedAt
        }
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

// POST /api/discord-company/validate-company-code - Valider un code avant complétion
router.post('/validate-company-code', auth, async (req, res) => {
  try {
    const { companyCode } = req.body;

    if (!companyCode) {
      return res.status(400).json({
        success: false,
        message: 'Le code d\'entreprise est requis'
      });
    }

    // Vérifier que l'utilisateur est bien un utilisateur Discord non validé
    const user = await User.findById(req.user.id);
    if (!user || !user.discordId || user.isCompanyValidated) {
      return res.status(400).json({
        success: false,
        message: 'Cette route est réservée aux utilisateurs Discord non validés'
      });
    }

    // Chercher le code d'entreprise
    const companyCodeDoc = await CompanyCode.findOne({ 
      code: companyCode.toUpperCase() 
    }).populate('company', 'name description category');

    if (!companyCodeDoc) {
      return res.status(404).json({
        success: false,
        message: 'Code d\'entreprise non trouvé'
      });
    }

    // Vérifier la validité du code
    const validation = companyCodeDoc.isValid();
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
          id: companyCodeDoc.company._id,
          name: companyCodeDoc.company.name,
          description: companyCodeDoc.company.description,
          category: companyCodeDoc.company.category
        },
        codeInfo: {
          description: companyCodeDoc.description,
          remainingUses: companyCodeDoc.maxUses ? 
            Math.max(0, companyCodeDoc.maxUses - companyCodeDoc.currentUses) : null,
          expiresAt: companyCodeDoc.expiresAt
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

module.exports = router;
