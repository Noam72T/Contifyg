const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Employe = require('../models/Employe');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { checkRolePermissions } = require('../middleware/rolePermissions');

// Middleware pour vérifier l'authentification sur toutes les routes
router.use(auth);

// GET - OPTIMISÉ: Récupérer tous les employés d'une entreprise
router.get('/', async (req, res) => {
  try {
    const { companyId, statut, departement, page = 1, limit = 50 } = req.query; // Limite augmentée
    
    if (!companyId) {
      return res.status(400).json({ message: 'ID de l\'entreprise requis' });
    }

    const filter = { company: companyId };
    if (statut) filter.statut = statut;
    if (departement) filter.departement = departement;

    // OPTIMISATION: Compter et récupérer en parallèle SANS populate
    const [total, employes] = await Promise.all([
      Employe.countDocuments(filter),
      Employe.find(filter)
        .select('utilisateur manager createdBy poste salaire typeContrat dateEmbauche statut departement notes')
        .sort({ dateEmbauche: -1 })
        .limit(parseInt(limit))
        .skip((page - 1) * limit)
        .lean() // LEAN pour performance
    ]);

    // OPTIMISATION: Récupérer les données liées en parallèle
    if (employes.length > 0) {
      const userIds = [...new Set([
        ...employes.map(e => e.utilisateur),
        ...employes.map(e => e.createdBy),
        ...employes.map(e => e.manager).filter(Boolean)
      ])];
      
      const [users, managers] = await Promise.all([
        User.find({ _id: { $in: userIds } })
          .select('firstName lastName email username avatar')
          .lean(),
        Employe.find({ _id: { $in: employes.map(e => e.manager).filter(Boolean) } })
          .select('utilisateur')
          .lean()
      ]);
      
      // Mapper les données
      employes.forEach(employe => {
        employe.utilisateur = users.find(u => u._id.toString() === employe.utilisateur.toString());
        employe.createdBy = users.find(u => u._id.toString() === employe.createdBy.toString());
        
        if (employe.manager) {
          const managerEmploye = managers.find(m => m._id.toString() === employe.manager.toString());
          if (managerEmploye) {
            employe.manager = {
              _id: managerEmploye._id,
              utilisateur: users.find(u => u._id.toString() === managerEmploye.utilisateur.toString())
            };
          }
        }
      });
    }

    res.json({
      employes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des employés:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// GET - Récupérer un employé par ID
router.get('/:id', async (req, res) => {
  try {
    const employe = await Employe.findById(req.params.id)
      .populate('utilisateur', 'firstName lastName email username avatar')
      .populate('manager', 'utilisateur')
      .populate('company', 'name')
      .populate('createdBy', 'firstName lastName username');

    if (!employe) {
      return res.status(404).json({ message: 'Employé non trouvé' });
    }

    res.json(employe);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'employé:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// GET - Statistiques des employés
router.get('/stats/overview', async (req, res) => {
  try {
    const { companyId } = req.query;
    
    if (!companyId) {
      return res.status(400).json({ message: 'ID de l\'entreprise requis' });
    }

    const stats = await Employe.aggregate([
      { $match: { company: mongoose.Types.ObjectId(companyId) } },
      {
        $group: {
          _id: '$statut',
          count: { $sum: 1 }
        }
      }
    ]);

    const parDepartement = await Employe.aggregate([
      { $match: { company: mongoose.Types.ObjectId(companyId) } },
      {
        $group: {
          _id: '$departement',
          count: { $sum: 1 },
          salaireMoyen: { $avg: '$salaire' }
        }
      }
    ]);

    res.json({
      parStatut: stats,
      parDepartement
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// POST - Créer un nouvel employé
router.post('/', async (req, res) => {
  try {
    const employeData = {
      ...req.body,
      createdBy: req.user.id
    };

    // Vérifier que l'utilisateur existe
    const utilisateur = await User.findById(employeData.utilisateur);
    if (!utilisateur) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Vérifier que l'utilisateur n'est pas déjà employé dans cette entreprise
    const existingEmploye = await Employe.findOne({
      company: employeData.company,
      utilisateur: employeData.utilisateur
    });

    if (existingEmploye) {
      return res.status(400).json({ message: 'Cet utilisateur est déjà employé dans cette entreprise' });
    }

    const employe = new Employe(employeData);
    await employe.save();

    const populatedEmploye = await Employe.findById(employe._id)
      .populate('utilisateur', 'firstName lastName email username avatar')
      .populate('manager', 'utilisateur')
      .populate('company', 'name')
      .populate('createdBy', 'firstName lastName username');

    res.status(201).json(populatedEmploye);
  } catch (error) {
    console.error('Erreur lors de la création de l\'employé:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// PUT - Mettre à jour un employé
router.put('/:id', checkRolePermissions('MANAGE_EMPLOYES', 'ADMINISTRATION'), async (req, res) => {
  try {
    const employe = await Employe.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('utilisateur', 'firstName lastName email username avatar')
     .populate('manager', 'utilisateur')
     .populate('company', 'name')
     .populate('createdBy', 'firstName lastName username');

    if (!employe) {
      return res.status(404).json({ message: 'Employé non trouvé' });
    }

    res.json(employe);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'employé:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// DELETE - Supprimer un employé (licencier)
router.delete('/:id', async (req, res) => {
  // Vérification des permissions
  if (req.user.systemRole !== 'Technicien') {
    // Pour les utilisateurs normaux, vérifier les permissions de rôle
    try {
      const user = await User.findById(req.user._id)
        .populate({
          path: 'companies.role',
          populate: {
            path: 'permissions',
            model: 'Permission'
          }
        });

      const userPermissions = new Set();
      for (const company of user.companies || []) {
        if (company.role && company.role.permissions) {
          for (const permission of company.role.permissions) {
            userPermissions.add(permission.code);
          }
        }
      }

      if (!userPermissions.has('MANAGE_EMPLOYES')) {
        return res.status(403).json({
          success: false,
          message: 'Vous n\'avez pas les permissions pour virer des employés',
          required: 'MANAGE_EMPLOYES',
          userPermissions: Array.from(userPermissions)
        });
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la vérification des permissions'
      });
    }
  }
  
  try {
    console.log('🗑️ Tentative de suppression employé par:', req.user.username);
    console.log('🔧 Rôle système:', req.user.systemRole);
    
    const employe = await Employe.findById(req.params.id)
      .populate('utilisateur', 'firstName lastName username')
      .populate('company', 'name');

    if (!employe) {
      return res.status(404).json({ 
        success: false,
        message: 'Employé non trouvé' 
      });
    }

    // Vérifier que l'employé appartient à une entreprise de l'utilisateur (sauf pour les techniciens)
    if (req.user.systemRole !== 'Technicien') {
      const userCompanyIds = req.user.companies?.map(c => c.company.toString()) || [];
      if (!userCompanyIds.includes(employe.company._id.toString())) {
        return res.status(403).json({ 
          success: false,
          message: 'Vous ne pouvez pas licencier un employé d\'une autre entreprise' 
        });
      }
    }

    // Log de l'action
    console.log(`🚨 Licenciement: ${employe.utilisateur.firstName} ${employe.utilisateur.lastName} de ${employe.company.name} par ${req.user.username}`);

    await Employe.findByIdAndDelete(req.params.id);

    res.json({ 
      success: true,
      message: `Employé ${employe.utilisateur.firstName} ${employe.utilisateur.lastName} licencié avec succès`,
      employeData: {
        nom: `${employe.utilisateur.firstName} ${employe.utilisateur.lastName}`,
        username: employe.utilisateur.username,
        entreprise: employe.company.name
      }
    });
  } catch (error) {
    console.error('Erreur lors du licenciement de l\'employé:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur lors du licenciement', 
      error: error.message 
    });
  }
});

module.exports = router;
