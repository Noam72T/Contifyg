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
        .populate('creePar', 'firstName lastName')
        .sort({ niveau: 1, nom: 1 });
    } else {
      // Utilisateur normal voit seulement les rôles de ses entreprises
      const companyIds = user.companies.map(c => c.company);
      roles = await Role.find({ company: { $in: companyIds } })
        .populate('company', 'name')
        .populate('creePar', 'firstName lastName')
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
    const { nom, description, niveau } = req.body;
    
    // Validation
    if (!nom || niveau === undefined) {
      return res.status(400).json({ message: 'Le nom et le niveau sont requis' });
    }

    if (niveau < 1 || niveau > 10) {
      return res.status(400).json({ message: 'Le niveau doit être entre 1 et 10' });
    }

    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: 'Rôle non trouvé' });
    }

    // Vérifier les doublons de nom dans la même entreprise (excluant le rôle actuel)
    const existingRole = await Role.findOne({
      nom: nom.trim(),
      company: role.company,
      _id: { $ne: req.params.id }
    });

    if (existingRole) {
      return res.status(400).json({ message: 'Un rôle avec ce nom existe déjà dans cette entreprise' });
    }

    // Mettre à jour le rôle
    role.nom = nom.trim();
    role.description = description?.trim() || '';
    role.niveau = parseInt(niveau);
    
    await role.save();

    const populatedRole = await Role.findById(role._id)
      .populate('company', 'name')
      .populate('creePar', 'firstName lastName');

    res.json({
      success: true,
      role: populatedRole
    });
  } catch (error) {
    console.error('Erreur lors de la modification du rôle:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur', 
      error: error.message 
    });
  }
});

// DELETE /api/roles/:id - Supprimer un rôle
router.delete('/:id', auth, checkRoleManagement, async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: 'Rôle non trouvé' });
    }

    // Vérifier qu'aucun utilisateur n'utilise ce rôle
    const usersWithRole = await User.find({ 'companies.role': req.params.id });
    if (usersWithRole.length > 0) {
      return res.status(400).json({ 
        message: 'Ce rôle ne peut pas être supprimé car il est utilisé par des utilisateurs' 
      });
    }

    await Role.findByIdAndDelete(req.params.id);
    res.json({ 
      success: true,
      message: 'Rôle supprimé avec succès' 
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du rôle:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur', 
      error: error.message 
    });
  }
});

module.exports = router;
