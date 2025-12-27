const express = require('express');
const router = express.Router();
const Role = require('../models/Role');
const Company = require('../models/Company');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Middleware pour vérifier les permissions de gestion des rôles
const checkRoleManagement = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({
        path: 'companies.role',
        model: 'Role'
      });

    // Technicien a tous les droits
    if (user.systemRole === 'Technicien') {
      return next();
    }

    // Pour l'instant, on autorise tous les utilisateurs connectés à gérer les rôles
    // car on a un nouveau système de permissions personnalisées
    return next();

  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// GET /api/roles - Lister les rôles
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    let roles;
    if (user.systemRole === 'Technicien') {
      // Technicien voit tous les rôles
      roles = await Role.find()
        .populate('company', 'name')
        .populate('createdBy', 'firstName lastName')
        .sort({ niveau: 1, nom: 1 });
    } else {
      // Utilisateur normal voit seulement les rôles de ses entreprises
      const companyIds = user.companies.map(c => c.company);
      roles = await Role.find({ company: { $in: companyIds } })
        .populate('company', 'name')
        .populate('createdBy', 'firstName lastName')
        .sort({ niveau: 1, nom: 1 });
    }

    // Filtrer par entreprise si companyId est fourni dans la query
    if (req.query.companyId) {
      roles = roles.filter(role => role.company._id.toString() === req.query.companyId);
    }

    res.json({
      success: true,
      roles
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des rôles:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur', 
      error: error.message 
    });
  }
// GET /api/roles/levels - Obtenir les niveaux de permissions avec descriptions
router.get('/levels', auth, (req, res) => {
  const levels = {
    0: {
      name: 'Utilisateur de base',
      description: 'Peut voir ses propres données et modifier son profil',
      permissions: ['canViewOwnData', 'canEditOwnProfile']
    },
    1: {
      name: 'Stagiaire',
      description: 'Peut consulter les prestations en lecture seule',
      permissions: ['canViewOwnData', 'canEditOwnProfile', 'canViewPrestations']
    },
    2: {
      name: 'Employé',
      description: 'Peut créer des prestations',
      permissions: ['canViewOwnData', 'canEditOwnProfile', 'canViewPrestations', 'canCreatePrestations']
    },
    3: {
      name: 'Comptable junior',
      description: 'Accès en lecture/écriture à la comptabilité de base',
      permissions: ['canViewCompta', 'canCreateCompta', 'canEditPrestations']
    },
    4: {
      name: 'Comptable',
      description: 'Gestion complète de la comptabilité et rapports',
      permissions: ['canEditCompta', 'canViewReports', 'canCreateReports']
    },
    5: {
      name: 'Chef d\'équipe',
      description: 'Supervision d\'équipe et validation des données',
      permissions: ['canDeleteCompta', 'canValidatePrestations', 'canViewUsers', 'canInviteUsers']
    },
    6: {
      name: 'Manager',
      description: 'Gestion des opérations et des partenariats',
      permissions: ['canValidateCompta', 'canDeletePrestations', 'canEditUsers', 'canManageItems', 'canManagePartnerships']
    },
    7: {
      name: 'Directeur',
      description: 'Direction générale et gestion des rôles',
      permissions: ['canRemoveUsers', 'canManageRoles', 'canManageCompanies', 'canExportData']
    },
    8: {
      name: 'Administrateur',
      description: 'Administration système et multi-entreprises',
      permissions: ['canManageSystem', 'canViewAllCompanies', 'canEditCompanySettings']
    },
    9: {
      name: 'Super Administrateur',
      description: 'Contrôle total avec suppression d\'entreprises',
      permissions: ['canDeleteCompany']
    },
    10: {
      name: 'Administrateur système',
      description: 'Accès complet au système et aux logs',
      permissions: ['canManageActivationCodes', 'canAccessSystemLogs']
    }
  };
  
  res.json(levels);
});

// POST /api/roles - Créer un nouveau rôle
router.post('/', auth, checkRoleManagement, async (req, res) => {
  try {
    const { nom, description, niveau, company } = req.body;
    const user = await User.findById(req.user.id);

    // Validation
    if (!nom || niveau === undefined || !company) {
      return res.status(400).json({ message: 'Le nom, le niveau et l\'entreprise sont requis' });
    }

    if (niveau < 1 || niveau > 10) {
      return res.status(400).json({ message: 'Le niveau doit être entre 1 et 10' });
    }

    // Vérifier que l'utilisateur appartient à cette entreprise
    const userCompany = user.companies.find(c => c.company.toString() === company);
    if (!userCompany && user.systemRole !== 'Technicien') {
      return res.status(403).json({ message: 'Vous n\'avez pas accès à cette entreprise' });
    }

    // Vérifier les doublons de nom dans la même entreprise
    const existingRole = await Role.findOne({
      nom: nom.trim(),
      company: company
    });

    if (existingRole) {
      return res.status(400).json({ message: 'Un rôle avec ce nom existe déjà dans cette entreprise' });
    }

    // Créer le rôle
    const role = new Role({
      nom: nom.trim(),
      description: description?.trim() || '',
      niveau: parseInt(niveau),
      company: company,
      creePar: req.user.id,
      actif: true
    });

    await role.save();

    const populatedRole = await Role.findById(role._id)
      .populate('company', 'name')
      .populate('creePar', 'firstName lastName');

    res.status(201).json({
      success: true,
      role: populatedRole
    });
  } catch (error) {
    console.error('Erreur lors de la création du rôle:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur', 
      error: error.message 
    });
  }
});

// PUT /api/roles/:id - Modifier un rôle
router.put('/:id', auth, checkRoleManagement, async (req, res) => {
  try {
    const { name, description, level } = req.body;
    const user = await User.findById(req.userId);

    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: 'Rôle non trouvé' });
    }

    // Vérifier que l'utilisateur peut modifier ce rôle
    if (user.systemRole !== 'Technicien' && role.company?.toString() !== user.currentCompany?.toString()) {
      return res.status(403).json({ message: 'Permission refusée' });
    }

    // Empêcher la modification des rôles système
    if (role.isSystemRole) {
      return res.status(403).json({ message: 'Impossible de modifier un rôle système' });
    }

    // Validation
    if (level !== undefined && (level < 0 || level > 10)) {
      return res.status(400).json({ message: 'Le niveau doit être entre 0 et 10' });
    }

    // Vérifier les doublons de nom
    if (name && name.trim() !== role.name) {
      const existingRole = await Role.findOne({
        name: name.trim(),
        company: role.company,
        _id: { $ne: role._id }
      });

      if (existingRole) {
        return res.status(400).json({ message: 'Un rôle avec ce nom existe déjà dans cette entreprise' });
      }
    }

    // Mettre à jour les champs
    if (name) role.name = name.trim();
    if (description !== undefined) role.description = description.trim();
    if (level !== undefined) role.level = parseInt(level);

    await role.save();

    const updatedRole = await Role.findById(role._id)
      .populate('company', 'name')
      .populate('createdBy', 'firstName lastName');

    res.json(updatedRole);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// DELETE /api/roles/:id - Supprimer un rôle
router.delete('/:id', auth, checkRoleManagement, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({ message: 'Rôle non trouvé' });
    }

    // Vérifier que l'utilisateur peut supprimer ce rôle
    if (user.systemRole !== 'Technicien' && role.company?.toString() !== user.currentCompany?.toString()) {
      return res.status(403).json({ message: 'Permission refusée' });
    }

    // Empêcher la suppression des rôles système
    if (role.isSystemRole) {
      return res.status(403).json({ message: 'Impossible de supprimer un rôle système' });
    }

    // Vérifier qu'aucun utilisateur n'utilise ce rôle
    const usersWithRole = await User.find({
      'companies.role': role._id
    });

    if (usersWithRole.length > 0) {
      return res.status(400).json({ 
        message: `Impossible de supprimer ce rôle car ${usersWithRole.length} utilisateur(s) l'utilisent encore`,
        usersCount: usersWithRole.length
      });
    }

    await Role.findByIdAndDelete(req.params.id);
    res.json({ message: 'Rôle supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// GET /api/roles/:id/permissions - Obtenir les permissions détaillées d'un rôle
router.get('/:id/permissions', auth, async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: 'Rôle non trouvé' });
    }

    const permissionDescriptions = {
      canViewOwnData: 'Consulter ses propres données',
      canEditOwnProfile: 'Modifier son profil',
      canViewCompta: 'Consulter la comptabilité',
      canCreateCompta: 'Créer des écritures comptables',
      canEditCompta: 'Modifier la comptabilité',
      canDeleteCompta: 'Supprimer des écritures comptables',
      canValidateCompta: 'Valider les écritures comptables',
      canViewPrestations: 'Consulter les prestations',
      canCreatePrestations: 'Créer des prestations',
      canEditPrestations: 'Modifier les prestations',
      canDeletePrestations: 'Supprimer des prestations',
      canValidatePrestations: 'Valider les prestations',
      canViewUsers: 'Consulter les utilisateurs',
      canInviteUsers: 'Inviter des utilisateurs',
      canEditUsers: 'Modifier les utilisateurs',
      canRemoveUsers: 'Supprimer des utilisateurs',
      canManageRoles: 'Gérer les rôles',
      canManageItems: 'Gérer les articles/services',
      canManagePartnerships: 'Gérer les partenariats',
      canManageCompanies: 'Gérer les entreprises',
      canViewReports: 'Consulter les rapports',
      canCreateReports: 'Créer des rapports',
      canExportData: 'Exporter les données',
      canManageSystem: 'Administrer le système',
      canViewAllCompanies: 'Voir toutes les entreprises',
      canEditCompanySettings: 'Modifier les paramètres d\'entreprise',
      canDeleteCompany: 'Supprimer une entreprise',
      canManageActivationCodes: 'Gérer les codes d\'activation',
      canAccessSystemLogs: 'Accéder aux logs système'
    };

    const permissions = {};
    Object.keys(role.permissions.toObject()).forEach(key => {
      permissions[key] = {
        granted: role.permissions[key],
        description: permissionDescriptions[key] || key
      };
    });

    res.json({
      role: {
        _id: role._id,
        name: role.name,
        level: role.level,
        description: role.description
      },
      permissions
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

module.exports = router;
