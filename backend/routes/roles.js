const express = require('express');
const router = express.Router();
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const Company = require('../models/Company');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Middleware pour vérifier les permissions de gestion des rôles
const checkRoleManagement = async (req, res, next) => {
  try {
    console.log('🔐 Vérification permissions gestion rôles pour utilisateur:', req.userId);
    
    const user = await User.findById(req.userId)
      .populate({
        path: 'companies.role',
        model: 'Role'
      });

    if (!user) {
      console.log('❌ Utilisateur non trouvé');
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    console.log('👤 Utilisateur:', {
      systemRole: user.systemRole,
      companies: user.companies?.length || 0
    });

    // Les techniciens ont tous les droits
    if (user.systemRole === 'Technicien') {
      console.log('🔧 Technicien - autorisation accordée');
      return next();
    }

    // Pour les autres utilisateurs, on autorise pour l'instant
    // TODO: Implémenter la vérification des permissions spécifiques
    console.log('👨‍💼 Utilisateur normal - autorisation accordée (temporaire)');
    return next();

  } catch (error) {
    console.error('❌ Erreur middleware gestion rôles:', error);
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// GET /api/roles - Lister les rôles
router.get('/', auth, async (req, res) => {
  try {
    const { companyId } = req.query;
    console.log('📋 Récupération des rôles pour utilisateur:', req.userId);
    console.log('🏢 CompanyId demandé:', companyId);
    
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    console.log('👤 Utilisateur:', {
      id: user._id,
      systemRole: user.systemRole,
      currentCompany: user.currentCompany
    });
   
    // Construire la requête de base avec des filtres pour éviter les données corrompues
    let query = {
      nom: { $exists: true, $ne: null, $ne: '' },
      company: { $exists: true, $ne: null },
      actif: true
    };

    // Si un companyId spécifique est demandé, filtrer directement dans la requête
    if (companyId) {
      query.company = companyId;
    }

    let roles = await Role.find(query)
      .populate('company', 'name')
      .populate('permissions', 'name code description category')
      .populate('creePar', 'firstName lastName')
      .sort({ nom: 1 });

    console.log('🎭 Total rôles trouvés:', roles.length);
    
    // Log de tous les rôles pour debug
    roles.forEach((role, index) => {
      console.log(`Rôle ${index + 1}:`, {
        nom: role.nom,
        company: role.company?.name,
        companyId: role.company?._id?.toString()
      });
    });

    // Si pas de companyId spécifique, appliquer le filtrage selon le type d'utilisateur
    if (!companyId) {
      if (user.systemRole !== 'Technicien') {
        console.log('👨‍💼 Utilisateur normal - filtrage par ses entreprises');
        const userCompanyIds = user.companies?.map(c => c.company?.toString()) || [];
        console.log('🏢 Entreprises de l\'utilisateur:', userCompanyIds);
        
        // Ajouter le filtrage par entreprises de l'utilisateur à la requête
        query.company = { $in: userCompanyIds };
        
        // Refaire la requête avec le nouveau filtre
        roles = await Role.find(query)
          .populate('company', 'name')
          .populate('permissions', 'name code description category')
          .populate('creePar', 'firstName lastName')
          .sort({ nom: 1 });
          
        console.log('📊 Rôles après filtrage utilisateur:', roles.length);
      } else {
        console.log('🔧 Technicien - accès à tous les rôles');
      }
    } else {
      console.log('🔍 Filtrage par entreprise appliqué dans la requête:', companyId);
      console.log('📊 Rôles trouvés pour cette entreprise:', roles.length);
    }

    // Simplifier la réponse pour éviter les erreurs de calcul
    const rolesData = roles.map(role => ({
      _id: role._id,
      nom: role.nom,
      description: role.description,
      normeSalariale: role.normeSalariale,
      limiteSalaire: role.limiteSalaire,
      typeContrat: role.typeContrat,
      isDefault: role.isDefault,
      company: role.company,
      permissions: role.permissions || [],
      userCount: 0, // À calculer si nécessaire
      creePar: role.creePar,
      dateCreation: role.dateCreation
    }));

    console.log('📤 Envoi de', rolesData.length, 'rôles au frontend');
    res.json(rolesData);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des rôles:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur', 
      error: error.message 
    });
  }
});

// POST /api/roles - Créer un nouveau rôle
router.post('/', auth, async (req, res) => {
  try {
    const { 
      nom, 
      description, 
      normeSalariale = 0, 
      limiteSalaire = 0, 
      typeContrat = 'CDI',
      isDefault = false,
      company,
      permissions = []
    } = req.body;

    

    // Validation basique
    if (!nom || !company) {
      return res.status(400).json({ 
        success: false,
        message: 'Le nom et l\'entreprise sont requis' 
      });
    }

    if (normeSalariale < 0 || normeSalariale > 100) {
      return res.status(400).json({ 
        success: false,
        message: 'La norme salariale doit être entre 0 et 100%' 
      });
    }

    if (limiteSalaire < 0) {
      return res.status(400).json({ 
        success: false,
        message: 'La limite salariale ne peut pas être négative' 
      });
    }

    const validContractTypes = ['DIRECTION', 'CDI', 'CDD', 'STAGIAIRE'];
    if (!validContractTypes.includes(typeContrat)) {
      return res.status(400).json({ 
        success: false,
        message: 'Type de contrat invalide' 
      });
    }

    // Vérifier les doublons de nom dans la même entreprise
    const existingRole = await Role.findOne({
      nom: nom.trim(),
      company: company
    });

    if (existingRole) {
      return res.status(400).json({ 
        success: false,
        message: 'Un rôle avec ce nom existe déjà dans cette entreprise' 
      });
    }

    // Valider les permissions si fournies
    if (permissions && Array.isArray(permissions) && permissions.length > 0) {
      const validPermissions = await Permission.find({ _id: { $in: permissions } });
      if (validPermissions.length !== permissions.length) {
        return res.status(400).json({ 
          success: false,
          message: 'Certaines permissions sont invalides' 
        });
      }
    }

    // Gérer le rôle par défaut - s'assurer qu'il n'y en a qu'un seul par entreprise
    if (isDefault) {
      await Role.updateMany(
        { company: company, isDefault: true },
        { $set: { isDefault: false } }
      );
      console.log('🔄 Autres rôles par défaut désactivés pour l\'entreprise:', company);
    }

    // Créer le rôle avec tous les champs
    const role = new Role({
      nom: nom.trim(),
      description: description?.trim() || '',
      normeSalariale: parseInt(normeSalariale),
      limiteSalaire: parseInt(limiteSalaire),
      typeContrat: typeContrat,
      isDefault: isDefault,
      company: company,
      permissions: permissions || [],
      creePar: req.userId,
      actif: true
    });

    console.log('🎭 Création du rôle:', {
      nom: role.nom,
      company: role.company,
      creePar: role.creePar,
      normeSalariale: role.normeSalariale,
      typeContrat: role.typeContrat,
      actif: role.actif
    });

    // Sauvegarder le rôle
    const savedRole = await role.save();
    console.log('✅ Rôle sauvegardé avec ID:', savedRole._id);

    // Récupérer le rôle avec toutes les données populées
    const populatedRole = await Role.findById(savedRole._id)
      .populate('company', 'name')
      .populate('creePar', 'firstName lastName')
      .populate('permissions');

    if (!populatedRole) {
      console.error('❌ Erreur: Rôle non trouvé après création');
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du rôle créé'
      });
    }

    console.log('📋 Rôle populé:', {
      _id: populatedRole._id,
      nom: populatedRole.nom,
      company: populatedRole.company?.name,
      companyId: populatedRole.company?._id
    });

    res.status(201).json({
      success: true,
      role: populatedRole
    });
  } catch (error) {
    console.error('❌ Erreur lors de la création du rôle:', error);
    console.error('Stack trace:', error.stack);
    
    // Gestion spécifique des erreurs de validation
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false,
        message: 'Erreur de validation', 
        errors: validationErrors
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur lors de la création du rôle', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// PUT /api/roles/:id - Modifier un rôle
router.put('/:id', auth, checkRoleManagement, async (req, res) => {
  try {
    console.log('✏️ Modification du rôle:', req.params.id);
    console.log('📝 Données reçues:', req.body);
    
    const { 
      nom, 
      description, 
      normeSalariale, 
      limiteSalaire, 
      typeContrat,
      isDefault,
      permissions = []
    } = req.body;
    
    
    
    // Validation avec logs détaillés
  

    if (!nom) {
    
      return res.status(400).json({ 
        success: false,
        message: 'Le nom est requis' 
      });
    }

    if (normeSalariale !== undefined && (normeSalariale < 0 || normeSalariale > 100)) {
      
      return res.status(400).json({ 
        success: false,
        message: 'La norme salariale doit être entre 0 et 100%' 
      });
    }

    if (limiteSalaire !== undefined && limiteSalaire < 0) {
     
      return res.status(400).json({ 
        success: false,
        message: 'La limite salariale ne peut pas être négative' 
      });
    }

    const validContractTypes = ['DIRECTION', 'CDI', 'CDD', 'STAGIAIRE'];
    if (typeContrat && !validContractTypes.includes(typeContrat)) {
      
      return res.status(400).json({ 
        success: false,
        message: 'Type de contrat invalide' 
      });
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
      
      return res.status(400).json({ 
        success: false,
        message: 'Un rôle avec ce nom existe déjà dans cette entreprise' 
      });
    }

    // Gérer le rôle par défaut - s'assurer qu'il n'y en a qu'un seul par entreprise
    if (isDefault !== undefined) {
      if (isDefault) {
        // Désactiver tous les autres rôles par défaut de cette entreprise
        await Role.updateMany(
          { company: role.company, _id: { $ne: req.params.id }, isDefault: true },
          { $set: { isDefault: false } }
        );
        console.log('🔄 Autres rôles par défaut désactivés pour l\'entreprise:', role.company);
      }
      role.isDefault = isDefault;
    }

    // Mettre à jour le rôle avec tous les champs
    role.nom = nom.trim();
    role.description = description?.trim() || '';
    
    if (normeSalariale !== undefined) {
      role.normeSalariale = parseInt(normeSalariale);
    }
    
    if (limiteSalaire !== undefined) {
      role.limiteSalaire = parseInt(limiteSalaire);
    }
    
    if (typeContrat) {
      role.typeContrat = typeContrat;
    }

    // Gérer les permissions si fournies
    if (permissions && Array.isArray(permissions)) {
     
      
      // Filtrer les permissions vides ou nulles
      const validPermissionIds = permissions.filter(p => p && p.trim && p.trim() !== '');
     
      
      if (validPermissionIds.length > 0) {
        // Valider que toutes les permissions existent
        const validPermissions = await Permission.find({ _id: { $in: validPermissionIds } });
        
        
        if (validPermissions.length !== validPermissionIds.length) {
         
          
          // Identifier les permissions invalides
          const foundIds = validPermissions.map(p => p._id.toString());
          const invalidIds = validPermissionIds.filter(id => !foundIds.includes(id));
       
          
          return res.status(400).json({ 
            success: false,
            message: `Certaines permissions sont invalides: ${invalidIds.join(', ')}` 
          });
        }
        role.permissions = validPermissionIds;
      } else {
       
        role.permissions = [];
      }
    }
    
    await role.save();
    


    const populatedRole = await Role.findById(role._id)
      .populate('company', 'name')
      .populate('creePar', 'firstName lastName')
      .populate('permissions');

    res.json({
      success: true,
      role: populatedRole,
      limiteSalaire: role.limiteSalaire,
      normeSalariale: role.normeSalariale
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

// PUT /api/roles/:id/permissions - Modifier les permissions d'un rôle
router.put('/:id/permissions', auth, checkRoleManagement, async (req, res) => {
  try {
    const { permissions = [] } = req.body;
    
   
    
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ 
        success: false,
        message: 'Rôle non trouvé' 
      });
    }

    // Valider que toutes les permissions existent
    if (permissions.length > 0) {
      const validPermissions = await Permission.find({ _id: { $in: permissions } });
      if (validPermissions.length !== permissions.length) {
        return res.status(400).json({ 
          success: false,
          message: 'Certaines permissions sont invalides' 
        });
      }
    }

    // Mettre à jour les permissions
    role.permissions = permissions;
    await role.save();
    
   

    // Retourner le rôle avec les permissions populées
    const populatedRole = await Role.findById(role._id)
      .populate('company', 'name')
      .populate('creePar', 'firstName lastName')
      .populate('permissions', 'name code description category');

    res.json({
      success: true,
      role: populatedRole,
      message: 'Permissions mises à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des permissions:', error);
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
    console.log('🗑️ Suppression du rôle:', req.params.id);
    
    const role = await Role.findById(req.params.id);
    if (!role) {
      console.log('❌ Rôle non trouvé');
      return res.status(404).json({ message: 'Rôle non trouvé' });
    }

    console.log('🎭 Rôle à supprimer:', {
      nom: role.nom,
      company: role.company
    });

    // Vérifier qu'aucun utilisateur n'utilise ce rôle
    const usersWithRole = await User.find({ 'companies.role': req.params.id });
    if (usersWithRole.length > 0) {
      return res.status(400).json({ 
        message: 'Ce rôle ne peut pas être supprimé car il est utilisé par des utilisateurs' 
      });
    }

    await Role.findByIdAndDelete(req.params.id);
    console.log('✅ Rôle supprimé avec succès');
    
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
