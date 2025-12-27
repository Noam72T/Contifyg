const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Company = require('../models/Company');
const Role = require('../models/Role');
const CompanyCode = require('../models/CompanyCode');

// Middleware pour vérifier que l'utilisateur est un Technicien ou SuperAdmin
const isTechnician = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || (user.systemRole !== 'Technicien' && user.systemRole !== 'SuperAdmin')) {
      return res.status(403).json({ message: 'Accès réservé aux Techniciens et SuperAdmin uniquement' });
    }
    next();
  } catch (error) {
    console.error('Erreur vérification Technicien/SuperAdmin:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ==================== UTILISATEURS ====================

// GET - Récupérer tous les utilisateurs
router.get('/users', auth, isTechnician, async (req, res) => {
  try {
    const users = await User.find()
      .populate('company', 'name')
      .populate('role', 'nom')
      .select('-password')
      .sort({ createdAt: -1 });

    console.log(`✅ [TECH ADMIN] ${users.length} utilisateurs récupérés`);
    res.json(users);
  } catch (error) {
    console.error('❌ Erreur récupération utilisateurs:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs' });
  }
});

// PUT - Modifier un utilisateur
router.put('/users/:id', auth, isTechnician, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Ne pas permettre la modification du mot de passe via cette route
    delete updates.password;

    // Empêcher un technicien de changer son propre rôle
    if (id === req.userId && updates.systemRole) {
      return res.status(400).json({ message: 'Vous ne pouvez pas modifier votre propre rôle système' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('company', 'name')
      .populate('role', 'nom')
      .select('-password');

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    console.log(`✅ [TECH ADMIN] Utilisateur ${user.username} modifié`);
    res.json(user);
  } catch (error) {
    console.error('❌ Erreur modification utilisateur:', error);
    res.status(500).json({ message: 'Erreur lors de la modification de l\'utilisateur' });
  }
});

// DELETE - Supprimer un utilisateur
router.delete('/users/:id', auth, isTechnician, async (req, res) => {
  try {
    const { id } = req.params;

    // Empêcher la suppression de soi-même
    if (id === req.userId) {
      return res.status(400).json({ message: 'Vous ne pouvez pas vous supprimer vous-même' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Retirer l'utilisateur de son entreprise si assigné
    if (user.company) {
      await Company.findByIdAndUpdate(user.company, {
        $pull: { members: id }
      });
    }

    await User.findByIdAndDelete(id);

    console.log(`✅ [TECH ADMIN] Utilisateur ${user.username} supprimé`);
    res.json({ message: 'Utilisateur supprimé avec succès', username: user.username });
  } catch (error) {
    console.error('❌ Erreur suppression utilisateur:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression de l\'utilisateur' });
  }
});

// POST - Réinitialiser le mot de passe d'un utilisateur
router.post('/users/:id/reset-password', auth, isTechnician, async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    user.password = newPassword;
    await user.save();

    console.log(`✅ [TECH ADMIN] Mot de passe réinitialisé pour ${user.username}`);
    res.json({ message: 'Mot de passe réinitialisé avec succès', username: user.username });
  } catch (error) {
    console.error('❌ Erreur réinitialisation mot de passe:', error);
    res.status(500).json({ message: 'Erreur lors de la réinitialisation du mot de passe' });
  }
});

// ==================== ENTREPRISES ====================

// GET - Récupérer toutes les entreprises
router.get('/companies', auth, isTechnician, async (req, res) => {
  try {
    const companies = await Company.find()
      .populate({
        path: 'members.user',
        select: 'username firstName lastName email'
      })
      .sort({ createdAt: -1 });

    console.log(`✅ [TECH ADMIN] ${companies.length} entreprises récupérées`);
    
    // Transformer les données pour le frontend
    const companiesData = companies.map(company => ({
      _id: company._id,
      name: company.name,
      code: company.code,
      description: company.description,
      category: company.category,
      tauxImpot: company.tauxImpot,
      taxDistribution: company.taxDistribution,
      createdAt: company.createdAt,
      members: company.members
        .filter(m => m.user && m.user._id && m.user.username) // Filtrer les membres virés et sans username
        .map(m => ({
          _id: m.user._id,
          username: m.user.username,
          firstName: m.user.firstName,
          lastName: m.user.lastName,
          email: m.user.email,
          joinedAt: m.joinedAt
        }))
    }));
    
    console.log(`📊 Données transformées:`, companiesData[0]?.members);
    
    res.json(companiesData);
  } catch (error) {
    console.error('❌ Erreur récupération entreprises:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des entreprises' });
  }
});

// ==================== CODES D'INVITATION ====================

// GET - Récupérer le code d'invitation actif d'une entreprise
router.get('/companies/:id/invitation-code', auth, isTechnician, async (req, res) => {
  try {
    const { id } = req.params;

    // Utiliser la méthode findByCompany qui filtre les codes actifs et non expirés
    const codes = await CompanyCode.findByCompany(id, true);
    
    console.log(`🔍 [DEBUG] Codes actifs trouvés pour entreprise ${id}:`, codes.length);

    if (!codes || codes.length === 0) {
      console.log(`⚠️ [TECH ADMIN] Aucun code actif trouvé pour entreprise ${id}`);
      return res.json({ code: null });
    }

    // Prendre le code le plus récent
    const code = codes[0];

    console.log(`✅ [TECH ADMIN] Code d'invitation récupéré pour entreprise ${id}: ${code.code}`);
    res.json({
      code: code.code,
      expiresAt: code.expiresAt,
      maxUses: code.maxUses,
      currentUses: code.currentUses
    });
  } catch (error) {
    console.error('❌ Erreur récupération code invitation:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération du code d\'invitation' });
  }
});

// POST - Générer un nouveau code d'invitation pour une entreprise
router.post('/companies/:id/generate-code', auth, isTechnician, async (req, res) => {
  try {
    const { id } = req.params;
    const { maxUses, expiresAt } = req.body;

    // Vérifier que l'entreprise existe
    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ message: 'Entreprise non trouvée' });
    }

    // Désactiver les anciens codes
    await CompanyCode.updateMany(
      { company: id, isActive: true },
      { isActive: false }
    );

    // Générer un nouveau code
    const newCode = await CompanyCode.generateUniqueCode();

    // Créer le nouveau code d'invitation
    const companyCode = new CompanyCode({
      code: newCode,
      company: id,
      generatedBy: req.userId,
      maxUses: maxUses || null,
      expiresAt: expiresAt || null,
      description: 'Code généré par un technicien'
    });

    await companyCode.save();

    console.log(`✅ [TECH ADMIN] Nouveau code généré pour ${company.name}: ${newCode}`);
    res.json({
      code: companyCode.code,
      expiresAt: companyCode.expiresAt,
      maxUses: companyCode.maxUses,
      currentUses: companyCode.currentUses
    });
  } catch (error) {
    console.error('❌ Erreur génération code invitation:', error);
    res.status(500).json({ message: 'Erreur lors de la génération du code d\'invitation' });
  }
});

// PUT - Modifier une entreprise
router.put('/companies/:id', auth, isTechnician, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const company = await Company.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate({
      path: 'members.user',
      select: 'username firstName lastName email'
    });

    if (!company) {
      return res.status(404).json({ message: 'Entreprise non trouvée' });
    }

    // Transformer les données
    const companyData = {
      _id: company._id,
      name: company.name,
      code: company.code,
      description: company.description,
      category: company.category,
      tauxImpot: company.tauxImpot,
      taxDistribution: company.taxDistribution,
      createdAt: company.createdAt,
      members: company.members
        .filter(m => m.user && m.user._id && m.user.username) // Filtrer les membres virés et sans username
        .map(m => ({
          _id: m.user._id,
          username: m.user.username,
          firstName: m.user.firstName,
          lastName: m.user.lastName,
          email: m.user.email,
          joinedAt: m.joinedAt
        }))
    };

    console.log(`✅ [TECH ADMIN] Entreprise ${company.name} modifiée`);
    res.json(companyData);
  } catch (error) {
    console.error('❌ Erreur modification entreprise:', error);
    res.status(500).json({ message: 'Erreur lors de la modification de l\'entreprise' });
  }
});

// DELETE - Supprimer une entreprise
router.delete('/companies/:id', auth, isTechnician, async (req, res) => {
  try {
    const { id } = req.params;

    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ message: 'Entreprise non trouvée' });
    }

    // Retirer l'entreprise de tous les utilisateurs membres
    await User.updateMany(
      { company: id },
      { 
        $set: { 
          company: null, 
          isCompanyValidated: false,
          currentCompany: null
        },
        $pull: { companies: id }
      }
    );

    // Supprimer tous les rôles de l'entreprise
    await Role.deleteMany({ company: id });

    // Supprimer l'entreprise
    await Company.findByIdAndDelete(id);

    console.log(`✅ [TECH ADMIN] Entreprise ${company.name} supprimée`);
    res.json({ message: 'Entreprise supprimée avec succès', name: company.name });
  } catch (error) {
    console.error('❌ Erreur suppression entreprise:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression de l\'entreprise' });
  }
});

// POST - Retirer un membre d'une entreprise
router.post('/companies/:companyId/remove-member/:userId', auth, isTechnician, async (req, res) => {
  try {
    const { companyId, userId } = req.params;

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: 'Entreprise non trouvée' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Retirer le membre de l'entreprise
    company.members = company.members.filter(m => m.toString() !== userId);
    await company.save();

    // Nettoyer les données de l'utilisateur
    user.company = null;
    user.isCompanyValidated = false;
    user.currentCompany = null;
    user.role = null;
    user.companies = user.companies.filter(c => c.toString() !== companyId);
    await user.save();

    console.log(`✅ [TECH ADMIN] ${user.username} retiré de ${company.name}`);
    res.json({ 
      message: 'Membre retiré avec succès',
      username: user.username,
      companyName: company.name
    });
  } catch (error) {
    console.error('❌ Erreur retrait membre:', error);
    res.status(500).json({ message: 'Erreur lors du retrait du membre' });
  }
});

// GET - Statistiques globales
router.get('/stats', auth, isTechnician, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalCompanies = await Company.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const validatedUsers = await User.countDocuments({ isCompanyValidated: true });
    const technicians = await User.countDocuments({ systemRole: 'Technicien' });

    const stats = {
      totalUsers,
      totalCompanies,
      activeUsers,
      validatedUsers,
      technicians,
      inactiveUsers: totalUsers - activeUsers,
      unvalidatedUsers: totalUsers - validatedUsers
    };

    console.log('✅ [TECH ADMIN] Statistiques récupérées');
    res.json(stats);
  } catch (error) {
    console.error('❌ Erreur récupération statistiques:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des statistiques' });
  }
});

module.exports = router;
