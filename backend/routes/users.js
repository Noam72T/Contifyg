const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Company = require('../models/Company');
const Role = require('../models/Role');
const Employe = require('../models/Employe');
const Salaire = require('../models/Salaire');
const auth = require('../middleware/auth');
const mongoose = require('mongoose');

// Fonction utilitaire pour synchroniser les rôles User vers Employe
async function syncUserRoleToEmploye(userId, userRole, companyId = null) {
  try {
    // Récupérer l'utilisateur avec ses rôles par entreprise
    const user = await User.findById(userId).populate('companies.role');
    if (!user) return;
    
    // Filtrer les employés par entreprise si spécifiée
    const filter = { utilisateur: userId };
    if (companyId) filter.company = companyId;
    
    const employes = await Employe.find(filter);
    
    for (const employe of employes) {
      let roleToSync = null;
      
      // 1. Priorité aux rôles par entreprise (companies.role)
      const companyRole = user.companies?.find(c => 
        c.company.toString() === employe.company.toString()
      )?.role;
      
      if (companyRole) {
        roleToSync = companyRole._id || companyRole;
      }
      // 2. Sinon utiliser le rôle global (user.role)
      else if (user.role) {
        roleToSync = user.role;
      }
      // 3. Sinon utiliser le paramètre userRole passé
      else if (userRole) {
        roleToSync = userRole;
      }
      
      // Synchroniser le rôle si différent
      if (roleToSync && (!employe.role || employe.role.toString() !== roleToSync.toString())) {
        employe.role = roleToSync;
        await employe.save();
        console.log(`🔄 Rôle synchronisé pour employé ${employe._id} dans entreprise ${employe.company}`);
      }
    }
  } catch (error) {
    console.error('⚠️ Erreur lors de la synchronisation automatique du rôle:', error.message);
  }
}

// Middleware pour vérifier les permissions utilisateurs
const checkUserPermission = (permissionCode) => {
  return async (req, res, next) => {
    try {
      const Permission = require('../models/Permission');
      const user = await User.findById(req.userId)
        .populate({
          path: 'role',
          populate: {
            path: 'permissions',
            model: 'Permission'
          }
        })
        .populate({
          path: 'companies.role',
          populate: {
            path: 'permissions',
            model: 'Permission'
          }
        });
      
      console.log('🔍 Vérification permission:', { 
        permissionCode, 
        userId: req.userId,
        systemRole: user.systemRole,
        hasRole: !!user.role,
        hasCompanies: user.companies?.length || 0
      });

      // Si l'utilisateur est un technicien (accès total)
      if (user.systemRole === 'Technicien') {
        console.log('✅ Accès accordé: Technicien');
        return next();
      }

      // Si l'utilisateur a un niveau de rôle élevé (niveau 8 et plus = admin)
      if (user.role && user.role.level >= 8) {
        console.log('✅ Accès accordé: Niveau admin (niveau', user.role.level, ')');
        return next();
      }

      // Vérifier les permissions du rôle actuel (user.role)
      if (user.role && user.role.permissions) {
        const hasPermission = user.role.permissions.some(p => p.code === permissionCode);
        if (hasPermission) {
          console.log('✅ Accès accordé: Permission trouvée dans user.role');
          return next();
        }
        console.log('📋 Permissions dans user.role:', user.role.permissions.map(p => p.code));
      }

      // Vérifier les permissions dans les rôles des entreprises (user.companies)
      if (user.companies && user.companies.length > 0) {
        for (const company of user.companies) {
          if (company.role && company.role.permissions) {
            const hasPermission = company.role.permissions.some(p => p.code === permissionCode);
            if (hasPermission) {
              console.log('✅ Accès accordé: Permission trouvée dans user.companies');
              return next();
            }
            console.log('📋 Permissions dans company.role:', company.role.permissions.map(p => p.code));
          }
        }
      }

      console.log('❌ Accès refusé: Aucune permission trouvée');
      return res.status(403).json({ 
        success: false, 
        message: `Vous n'avez pas la permission ${permissionCode} requise pour cette action`,
        requiredPermission: permissionCode,
        userPermissions: user.role?.permissions?.map(p => p.code) || []
      });
    } catch (error) {
      console.error('Erreur de vérification des permissions:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur serveur', 
        error: error.message 
      });
    }
  };
};

// GET /api/users - OPTIMISÉ pour gros volumes
router.get('/', auth, async (req, res) => {
  try {
    const { company, page = 1, limit = 50 } = req.query; // PAGINATION ajoutée
    const skip = (page - 1) * limit;
    
    // OPTIMISATION: Récupérer l'utilisateur connecté SANS populate
    const user = await User.findById(req.userId)
      .select('systemRole role company currentCompany')
      .lean();
    
    let users;
    let total = 0;
    
    if (company) {
      // OPTIMISATION: Requête avec pagination et sans populate
      const query = {
        $or: [
          { company: company },
          { currentCompany: company },
          { 'companies.company': company }
        ],
        systemRole: { $ne: 'Technicien' }
      };
      
      // Compter le total pour la pagination
      total = await User.countDocuments(query);
      
      // Récupérer les utilisateurs SANS populate
      users = await User.find(query)
        .select('-password')
        .skip(skip)
        .limit(parseInt(limit))
        .lean(); // LEAN pour performance
      
      // OPTIMISATION: Récupérer les données liées en parallèle
      if (users.length > 0) {
        const userIds = users.map(u => u._id);
        const roleIds = [...new Set(users.map(u => u.role).filter(Boolean))];
        const companyIds = [...new Set([
          ...users.map(u => u.company).filter(Boolean),
          ...users.map(u => u.currentCompany).filter(Boolean)
        ])];
        
        // Récupérer tous les rôles des companies aussi
        const companyRoleIds = [...new Set(
          users.flatMap(u => u.companies?.map(c => c.role).filter(Boolean) || [])
        )];
        
        // Récupérer toutes les données en parallèle
        const [roles, companies, employes, companyRoles] = await Promise.all([
          Role.find({ _id: { $in: roleIds } })
            .select('nom normeSalariale typeContrat niveau')
            .lean(),
          Company.find({ _id: { $in: companyIds } })
            .select('name category')
            .lean(),
          // OPTIMISATION: Récupérer les employés en une seule requête
          Employe.find({
            utilisateur: { $in: userIds },
            company: company
          })
            .select('utilisateur salaire role')
            .populate('role', 'nom normeSalariale limiteSalaire typeContrat niveau')
            .lean(),
          // Récupérer les rôles des companies
          Role.find({ _id: { $in: companyRoleIds } })
            .select('nom normeSalariale typeContrat niveau')
            .lean()
        ]);
        
        // SYNCHRONISATION AUTOMATIQUE: Créer les entrées Employe manquantes
        const usersWithMissingEmploye = [];
        for (const user of users) {
          const employeData = employes.find(e => e.utilisateur.toString() === user._id.toString());
          if (!employeData) {
            // Trouver le rôle pour cette entreprise dans User.companies
            const fullUser = await User.findById(user._id).populate('companies.role');
            const companyEntry = fullUser.companies.find(c => 
              c.company.toString() === company.toString()
            );
            
            if (companyEntry && companyEntry.role) {
              usersWithMissingEmploye.push({
                user: fullUser,
                role: companyEntry.role
              });
            }
          }
        }
        
        // Créer les entrées Employe manquantes en parallèle
        if (usersWithMissingEmploye.length > 0) {
          console.log(`🔄 Création automatique de ${usersWithMissingEmploye.length} entrées Employe manquantes`);
          
          const createPromises = usersWithMissingEmploye.map(async ({ user, role }) => {
            try {
              const newEmploye = new Employe({
                utilisateur: user._id,
                company: company,
                role: role._id || role,
                poste: 'Employé',
                salaire: 0,
                typeContrat: 'cdi',
                dateEmbauche: new Date(),
                statut: 'actif',
                createdBy: user._id
              });
              
              const savedEmploye = await newEmploye.save();
              console.log(`✅ Entrée Employe créée pour ${user.username}`);
              
              // Populer le rôle pour le retour
              return await Employe.findById(savedEmploye._id)
                .populate('role', 'nom normeSalariale limiteSalaire typeContrat niveau')
                .lean();
            } catch (error) {
              console.error(`❌ Erreur création Employe pour ${user.username}:`, error.message);
              return null;
            }
          });
          
          const newEmployes = await Promise.all(createPromises);
          // Ajouter les nouvelles entrées à la liste des employés
          employes.push(...newEmployes.filter(Boolean));
        }
        
        // Mapper les données aux utilisateurs
        users = users.map(user => {
          const roleData = roles.find(r => r._id.toString() === user.role?.toString());
          const companyData = companies.find(c => c._id.toString() === user.company?.toString());
          const currentCompanyData = companies.find(c => c._id.toString() === user.currentCompany?.toString());
          const employeData = employes.find(e => e.utilisateur.toString() === user._id.toString());
          
          // Populer les rôles dans companies
          const populatedCompanies = user.companies?.map(companyEntry => ({
            ...companyEntry,
            role: companyRoles.find(r => r._id.toString() === companyEntry.role?.toString()) || companyEntry.role
          })) || [];
          
          return {
            ...user,
            role: roleData,
            companies: populatedCompanies,
            company: companyData,
            currentCompany: currentCompanyData,
            // Ajouter le rôle de l'employé pour cette entreprise spécifique
            employeRole: employeData?.role || null,
            salaire: employeData?.salaire || 0
          };
        });
      }
    } else if (user.systemRole === 'Technicien') {
      // OPTIMISATION: Technicien avec pagination
      total = await User.countDocuments({});
      users = await User.find({})
        .select('-password')
        .skip(skip)
        .limit(parseInt(limit))
        .lean();
        
      // Récupérer les données liées en parallèle
      if (users.length > 0) {
        const roleIds = [...new Set(users.map(u => u.role).filter(Boolean))];
        const companyIds = [...new Set(users.map(u => u.company).filter(Boolean))];
        
        const [roles, companies] = await Promise.all([
          Role.find({ _id: { $in: roleIds } })
            .select('nom level permissions')
            .lean(),
          Company.find({ _id: { $in: companyIds } })
            .select('name category')
            .lean()
        ]);
        
        users = users.map(user => ({
          ...user,
          role: roles.find(r => r._id.toString() === user.role?.toString()),
          company: companies.find(c => c._id.toString() === user.company?.toString())
        }));
      }
     
    } else {
      // OPTIMISATION: Utilisateur normal avec pagination
      const query = user.role?.level >= 8 ? 
        { isCompanyValidated: true } : 
        { company: user.company };
        
      total = await User.countDocuments(query);
      users = await User.find(query)
        .select('-password')
        .skip(skip)
        .limit(parseInt(limit))
        .lean();
        
      // Récupérer les données liées
      if (users.length > 0) {
        const roleIds = [...new Set(users.map(u => u.role).filter(Boolean))];
        const companyIds = [...new Set(users.map(u => u.company).filter(Boolean))];
        
        const [roles, companies] = await Promise.all([
          Role.find({ _id: { $in: roleIds } })
            .select('nom level permissions')
            .lean(),
          Company.find({ _id: { $in: companyIds } })
            .select('name category')
            .lean()
        ]);
        
        users = users.map(user => ({
          ...user,
          role: roles.find(r => r._id.toString() === user.role?.toString()),
          company: companies.find(c => c._id.toString() === user.company?.toString())
        }));
      }
    }

    res.json({
      success: true,
      users: users || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur', 
      error: error.message 
    });
  }
});

// POST /api/users/invite - Inviter un utilisateur dans l'entreprise
router.post('/invite', auth, checkUserPermission('canInviteUsers'), async (req, res) => {
  try {
    const { username, roleId } = req.body;
    const currentUser = await User.findById(req.userId);

    if (!currentUser.currentCompany) {
      return res.status(400).json({ message: 'Aucune entreprise sélectionnée' });
    }

    // Vérifier que l'utilisateur existe
    const userToInvite = await User.findOne({ username });
    if (!userToInvite) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Vérifier que le rôle existe et appartient à l'entreprise
    const role = await Role.findById(roleId);
    if (!role || (role.company && role.company.toString() !== currentUser.currentCompany.toString())) {
      return res.status(400).json({ message: 'Rôle invalide pour cette entreprise' });
    }

    // Vérifier que l'utilisateur n'est pas déjà dans l'entreprise
    const company = await Company.findById(currentUser.currentCompany);
    const existingMember = company.members.find(
      member => member.user.toString() === userToInvite._id.toString()
    );

    if (existingMember) {
      return res.status(400).json({ message: 'L\'utilisateur fait déjà partie de cette entreprise' });
    }

    // Ajouter l'utilisateur à l'entreprise
    company.members.push({
      user: userToInvite._id,
      role: roleId
    });
    await company.save();

    // Ajouter l'entreprise à l'utilisateur
    userToInvite.companies.push({
      company: currentUser.currentCompany,
      role: roleId
    });

    // Si c'est la première entreprise de l'utilisateur, la définir comme actuelle
    if (!userToInvite.currentCompany) {
      userToInvite.currentCompany = currentUser.currentCompany;
    }

    await userToInvite.save();

    // Retourner l'utilisateur avec ses détails
    const populatedUser = await User.findById(userToInvite._id)
      .populate('company', 'name')
      .populate('role', 'nom niveau')
      .select('-password');

    res.status(201).json({
      message: 'Utilisateur invité avec succès',
      user: populatedUser
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Ancienne route désactivée - remplacée par la nouvelle route plus bas

// DELETE /api/users/:id/remove - Retirer un utilisateur de l'entreprise et l'ajouter à l'historique
router.delete('/:id/remove', auth, checkUserPermission('canRemoveUsers'), async (req, res) => {
  try {
    const EmployeHistorique = require('../models/EmployeHistorique');
    const currentUser = await User.findById(req.userId);
    const targetUser = await User.findById(req.params.id).populate('role');

    if (!targetUser) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    if (!currentUser.currentCompany) {
      return res.status(400).json({ message: 'Aucune entreprise sélectionnée' });
    }

    // Ne pas permettre de se retirer soi-même
    if (targetUser._id.toString() === currentUser._id.toString()) {
      return res.status(400).json({ message: 'Vous ne pouvez pas vous retirer vous-même' });
    }

    // Créer l'entrée dans l'historique des employés
    const historiqueData = {
      firstName: targetUser.firstName,
      lastName: targetUser.lastName,
      email: targetUser.email,
      phoneNumber: targetUser.phoneNumber,
      compteBancaire: targetUser.compteBancaire,
      discordId: targetUser.discordId,
      discordUsername: targetUser.discordUsername,
      company: currentUser.currentCompany,
      role: targetUser.role?._id,
      roleName: targetUser.role?.name || 'Rôle inconnu',
      dateRecrutement: targetUser.createdAt || new Date(),
      dateLicenciement: new Date(),
      motifLicenciement: req.body.motif || 'Non spécifié',
      licenciePar: currentUser._id,
      originalUserId: targetUser._id
    };

    const employeHistorique = new EmployeHistorique(historiqueData);
    await employeHistorique.save();

    // Retirer de l'entreprise
    const company = await Company.findById(currentUser.currentCompany);
    company.members = company.members.filter(
      member => member.user.toString() !== targetUser._id.toString()
    );
    await company.save();

    // Retirer l'entreprise de l'utilisateur
    targetUser.companies = targetUser.companies.filter(
      c => c.company.toString() !== currentUser.currentCompany.toString()
    );

    // Si c'était l'entreprise actuelle, changer ou supprimer
    if (targetUser.currentCompany?.toString() === currentUser.currentCompany.toString()) {
      targetUser.currentCompany = targetUser.companies.length > 0 ? targetUser.companies[0].company : null;
    }

    // Retirer l'assignation company principale
    if (targetUser.company?.toString() === currentUser.currentCompany.toString()) {
      targetUser.company = null;
    }

    await targetUser.save();

    res.json({ message: 'Employé licencié et ajouté à l\'historique avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// POST /api/users/promote-to-technicien - Promouvoir un utilisateur en Technicien (seulement pour les Techniciens)
router.post('/promote-to-technicien', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);
    
    if (currentUser.systemRole !== 'Technicien' && currentUser.systemRole !== 'SuperAdmin') {
      return res.status(403).json({ message: 'Seuls les Techniciens et SuperAdmin peuvent promouvoir d\'autres utilisateurs' });
    }

    const { username } = req.body;
    const userToPromote = await User.findOne({ username });

    if (!userToPromote) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    if (userToPromote.systemRole === 'Technicien') {
      return res.status(400).json({ message: 'L\'utilisateur est déjà Technicien' });
    }

    console.log(`🔧 Promotion de ${username} en Technicien`);
    console.log(`📊 Données avant promotion:`, {
      company: userToPromote.company,
      companies: userToPromote.companies?.length || 0,
      role: userToPromote.role,
      isCompanyValidated: userToPromote.isCompanyValidated
    });

    // IMPORTANT: Promouvoir en Technicien SANS supprimer les liens avec l'entreprise
    // Cela permet au Technicien de rester PDG/membre de son entreprise tout en ayant accès à toutes les entreprises
    userToPromote.systemRole = 'Technicien';
    await userToPromote.save();

    console.log(`✅ ${username} promu en Technicien (entreprise préservée)`);

    res.json({ 
      message: 'Utilisateur promu en Technicien avec succès. Il conserve son rôle dans son entreprise.',
      user: {
        username: userToPromote.username,
        systemRole: userToPromote.systemRole,
        company: userToPromote.company,
        role: userToPromote.role
      }
    });
  } catch (error) {
    console.error('❌ Erreur promotion Technicien:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Route pour assigner manuellement un utilisateur à une entreprise
router.post('/assign-to-company', auth, async (req, res) => {
  try {
    const { username, companyId } = req.body;
    
    if (!username || !companyId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username et companyId requis' 
      });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Utilisateur non trouvé' 
      });
    }

    const Company = require('../models/Company');
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ 
        success: false, 
        message: 'Entreprise non trouvée' 
      });
    }

    // Créer un rôle par défaut si nécessaire
    const Role = require('../models/Role');
    let defaultRole = await Role.findOne({ 
      company: companyId,
      isDefault: true
    });
    
    if (!defaultRole) {
      defaultRole = new Role({
        nom: 'Employé',
        description: 'Rôle par défaut pour les employés',
        normeSalariale: 0,
        limiteSalaire: 0,
        typeContrat: 'CDI',
        isDefault: true,
        company: companyId,
        permissions: [],
        creePar: user._id, // ID de l'utilisateur à assigner
        customPermissions: new Map()
      });
      await defaultRole.save();
    }

    // Assigner l'utilisateur à l'entreprise
    user.company = companyId;
    user.role = defaultRole._id;
    user.isCompanyValidated = true;
    user.currentCompany = companyId;
    
    // Synchroniser le rôle avec les entrées Employe
    await syncUserRoleToEmploye(user._id, defaultRole._id);
    
    // Ajouter à l'array companies aussi pour compatibilité
    user.companies = [{
      company: companyId,
      role: defaultRole._id,
      isActive: true,
      joinedAt: new Date()
    }];

    await user.save();

    // IMPORTANT: Ajouter l'utilisateur dans company.members s'il n'y est pas déjà
    const isMember = company.members.some(m => m.user && m.user.toString() === user._id.toString());
    if (!isMember) {
      company.members.push({
        user: user._id,
        role: defaultRole._id,
        joinedAt: new Date()
      });
      await company.save();
      console.log(`✅ ${username} ajouté aux membres de ${company.name}`);
    }

    res.json({
      success: true,
      message: `Utilisateur ${username} assigné à l'entreprise ${company.name}`,
      user: {
        username: user.username,
        company: company.name,
        role: defaultRole.nom
      }
    });

  } catch (error) {
    console.error('Erreur lors de l\'assignation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/users/reassign-technician-to-company - Réassigner un Technicien à son entreprise (pour les Techniciens et SuperAdmin)
router.post('/reassign-technician-to-company', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);
    
    if (currentUser.systemRole !== 'Technicien' && currentUser.systemRole !== 'SuperAdmin') {
      return res.status(403).json({ 
        success: false,
        message: 'Seuls les Techniciens et SuperAdmin peuvent effectuer cette opération' 
      });
    }

    const { username, companyId, roleId } = req.body;
    
    if (!username || !companyId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username et companyId requis' 
      });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Utilisateur non trouvé' 
      });
    }

    const Company = require('../models/Company');
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ 
        success: false, 
        message: 'Entreprise non trouvée' 
      });
    }

    // Trouver ou créer un rôle Admin pour cette entreprise
    const Role = require('../models/Role');
    let adminRole;
    
    if (roleId) {
      // Utiliser le rôle spécifié
      adminRole = await Role.findById(roleId);
      if (!adminRole || adminRole.company.toString() !== companyId.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Rôle invalide pour cette entreprise'
        });
      }
    } else {
      // Chercher un rôle Admin existant
      adminRole = await Role.findOne({ 
        company: companyId,
        nom: { $in: ['Admin', 'PDG', 'Administrateur'] }
      });
      
      // Si pas de rôle Admin, créer un rôle Admin avec toutes les permissions
      if (!adminRole) {
        const Permission = require('../models/Permission');
        const allPermissions = await Permission.find();
        
        adminRole = new Role({
          nom: 'Admin',
          description: 'Administrateur de l\'entreprise avec tous les droits',
          company: companyId,
          creePar: req.userId,
          normeSalariale: 100,
          typeContrat: 'DIRECTION',
          isDefault: false,
          permissions: allPermissions.map(p => p._id),
          customPermissions: new Map()
        });
        await adminRole.save();
        console.log(`✅ Rôle Admin créé pour ${company.name}`);
      }
    }

    console.log(`🔧 Réassignation de ${username} à ${company.name} en tant que ${adminRole.nom}`);

    // Assigner l'utilisateur à l'entreprise
    user.company = companyId;
    user.role = adminRole._id;
    user.isCompanyValidated = true;
    user.currentCompany = companyId;
    
    // Mettre à jour ou ajouter dans l'array companies
    const existingCompanyIndex = user.companies.findIndex(
      c => c.company && c.company.toString() === companyId.toString()
    );
    
    if (existingCompanyIndex >= 0) {
      user.companies[existingCompanyIndex].role = adminRole._id;
      user.companies[existingCompanyIndex].isActive = true;
    } else {
      user.companies.push({
        company: companyId,
        role: adminRole._id,
        isActive: true,
        joinedAt: new Date()
      });
    }

    await user.save();

    // IMPORTANT: Créer ou mettre à jour l'entrée Employe pour qu'il apparaisse dans la liste des employés
    const Employe = require('../models/Employe');
    let employe = await Employe.findOne({ 
      utilisateur: user._id, 
      company: companyId 
    });

    if (!employe) {
      // Créer une nouvelle entrée Employe
      employe = new Employe({
        utilisateur: user._id,
        company: companyId,
        role: adminRole._id,
        nom: user.lastName || user.username,
        prenom: user.firstName || '',
        dateEmbauche: new Date(),
        actif: true
      });
      await employe.save();
      console.log(`✅ Entrée Employe créée pour ${username}`);
    } else {
      // Mettre à jour l'entrée existante
      employe.role = adminRole._id;
      employe.actif = true;
      await employe.save();
      console.log(`✅ Entrée Employe mise à jour pour ${username}`);
    }

    // Synchroniser le rôle avec les entrées Employe
    await syncUserRoleToEmploye(user._id, adminRole._id, companyId);

    // IMPORTANT: Ajouter l'utilisateur dans company.members s'il n'y est pas déjà
    const isMember = company.members.some(m => m.user && m.user.toString() === user._id.toString());
    if (!isMember) {
      company.members.push({
        user: user._id,
        role: adminRole._id,
        joinedAt: new Date()
      });
      await company.save();
      console.log(`✅ ${username} ajouté aux membres de ${company.name}`);
    } else {
      // Mettre à jour le rôle si déjà membre
      const memberIndex = company.members.findIndex(m => m.user && m.user.toString() === user._id.toString());
      if (memberIndex >= 0) {
        company.members[memberIndex].role = adminRole._id;
        await company.save();
        console.log(`✅ Rôle de ${username} mis à jour dans ${company.name}`);
      }
    }

    res.json({
      success: true,
      message: `${username} (Technicien) réassigné à ${company.name} en tant que ${adminRole.nom}`,
      user: {
        username: user.username,
        systemRole: user.systemRole,
        company: company.name,
        role: adminRole.nom
      }
    });

  } catch (error) {
    console.error('❌ Erreur réassignation Technicien:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/users/details/:username - Obtenir les détails d'un utilisateur (pour les Techniciens et SuperAdmin)
router.get('/details/:username', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);
    
    if (currentUser.systemRole !== 'Technicien' && currentUser.systemRole !== 'SuperAdmin') {
      return res.status(403).json({ 
        success: false,
        message: 'Seuls les Techniciens et SuperAdmin peuvent accéder à ces informations' 
      });
    }

    const { username } = req.params;
    
    const user = await User.findOne({ username })
      .populate('company', 'name code')
      .populate('role', 'nom description')
      .populate('companies.company', 'name code')
      .populate('companies.role', 'nom description')
      .select('-password -securityAnswer');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Utilisateur non trouvé' 
      });
    }

    res.json({
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        systemRole: user.systemRole,
        isCompanyValidated: user.isCompanyValidated,
        company: user.company,
        role: user.role,
        companies: user.companies,
        currentCompany: user.currentCompany,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Erreur récupération détails utilisateur:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route pour corriger les utilisateurs avec code d'entreprise
router.post('/fix-company-assignments', auth, async (req, res) => {
  try {
    // Trouver tous les utilisateurs qui ont un companyCode mais pas d'entreprise assignée
    const usersToFix = await User.find({
      companyCode: { $exists: true, $ne: null },
      $or: [
        { company: { $exists: false } },
        { company: null },
        { isCompanyValidated: false }
      ]
    });

  

    const CompanyCode = require('../models/CompanyCode');
    let fixedCount = 0;

    for (const user of usersToFix) {
      // Trouver le code d'entreprise correspondant
      const companyCodeDoc = await CompanyCode.findOne({ 
        code: user.companyCode 
      }).populate('company');

      if (companyCodeDoc && companyCodeDoc.company) {
        // Assigner l'entreprise et marquer comme validé
        user.company = companyCodeDoc.company._id;
        user.isCompanyValidated = true;
        
        // Créer un rôle par défaut si nécessaire
        const Role = require('../models/Role');
        if (!user.role) {
          let defaultRole = await Role.findOne({ 
            company: companyCodeDoc.company._id, 
            level: 1 
          });
          
          if (!defaultRole) {
            defaultRole = new Role({
              name: 'Employee',
              level: 1,
              company: companyCodeDoc.company._id,
              permissions: []
            });
            await defaultRole.save();
          }
          
          user.role = defaultRole._id;
          
          // Synchroniser le rôle avec les entrées Employe
          await syncUserRoleToEmploye(user._id, defaultRole._id);
        }

        await user.save();
        fixedCount++;
        
      }
    }

    res.json({
      success: true,
      message: `${fixedCount} utilisateurs corrigés`,
      fixedCount,
      totalFound: usersToFix.length
    });

  } catch (error) {
    console.error('Erreur lors de la correction:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/users/company/:companyId - Récupérer tous les utilisateurs d'une entreprise
router.get('/company/:companyId', auth, async (req, res) => {
  try {
    const { companyId } = req.params;
    
    // Vérifier que l'entreprise existe
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Entreprise non trouvée'
      });
    }
    
    // Récupérer tous les utilisateurs de cette entreprise
    const users = await User.find({
      $or: [
        { company: companyId },
        { currentCompany: companyId },
        { 'companies.company': companyId }
      ]
    })
    .select('_id username firstName lastName email systemRole')
    .lean();
    
    res.json({
      success: true,
      users: users
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs de l\'entreprise:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
});

// Route de debug temporaire pour vérifier les utilisateurs
router.get('/debug/:companyId', auth, async (req, res) => {
  try {
    const { companyId } = req.params;
    
    // Récupérer tous les utilisateurs avec leurs champs company
    const allUsers = await User.find({})
      .populate('company', 'name category')
      .populate('role', 'name level')
      .select('username firstName lastName company role isCompanyValidated companyCode');
    
    // Filtrer ceux qui correspondent à l'entreprise
    const companyUsers = allUsers.filter(user => 
      user.company && user.company._id.toString() === companyId
    );
    
    res.json({
      success: true,
      companyId,
      totalUsers: allUsers.length,
      companyUsers: companyUsers.length,
      allUsers: allUsers.map(user => ({
        id: user._id,
        username: user.username,
        name: `${user.firstName} ${user.lastName}`,
        companyId: user.company?._id,
        companyName: user.company?.name,
        isValidated: user.isCompanyValidated,
        companyCode: user.companyCode
      })),
      filteredUsers: companyUsers.map(user => ({
        id: user._id,
        username: user.username,
        name: `${user.firstName} ${user.lastName}`,
        companyId: user.company._id,
        companyName: user.company.name,
        role: user.role?.name
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/users/current-invitation-code - Récupérer le code d'invitation actuel s'il existe
router.get('/current-invitation-code', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId)
      .populate('currentCompany');

    // Récupérer l'ID de l'entreprise depuis les paramètres ou depuis l'utilisateur
    const companyId = req.query.companyId || currentUser.currentCompany?._id;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Aucune entreprise spécifiée'
      });
    }

    const CompanyCode = require('../models/CompanyCode');
    
    // Chercher un code actif et non expiré pour cette entreprise
    const existingCode = await CompanyCode.findOne({
      company: companyId,
      isActive: true,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 }); // Le plus récent

    if (existingCode) {
      const validFor = Math.ceil((new Date(existingCode.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      
      return res.json({
        success: true,
        data: {
          code: existingCode.code,
          expiresAt: existingCode.expiresAt,
          description: existingCode.description,
          createdAt: existingCode.createdAt,
          validFor: `${validFor} jour${validFor > 1 ? 's' : ''}`
        }
      });
    }

    return res.json({
      success: true,
      data: null
    });

  } catch (error) {
    console.error('Erreur lors de la récupération du code:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Générer un code d'invitation pour un employé
router.post('/generate-invitation-code', auth, async (req, res) => {
  try {
    
    
    const currentUser = await User.findById(req.userId)
      .populate('currentCompany')
      .populate('role');

    if (!currentUser) {
      console.log('❌ Utilisateur non trouvé');
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

  

    // Récupérer l'ID de l'entreprise depuis le body ou depuis l'utilisateur
    const companyId = req.body.companyId || currentUser.currentCompany?._id;
    
   
    
    if (!companyId) {
      console.log('❌ Aucune entreprise spécifiée');
      return res.status(400).json({
        success: false,
        message: 'Aucune entreprise spécifiée'
      });
    }

    // Vérifier la permission GENERATE_EMPLOYEE_CODE avec middleware auth existant
    const auth = require('../middleware/auth');
    const hasPermission = (permission) => {
      return currentUser.role && currentUser.role.permissions && 
             currentUser.role.permissions.some(p => p.code === permission);
    };
    
    // Charger les données complètes avec les rôles d'entreprise
    await currentUser.populate({
      path: 'companies.role',
      populate: {
        path: 'permissions',
        model: 'Permission'
      }
    });
    
    // Trouver le rôle pour l'entreprise spécifiée
    const companyEntry = currentUser.companies.find(c => 
      c.company.toString() === companyId.toString()
    );
    
    // Pour les techniciens, autoriser l'accès à toutes les entreprises
    const isTechnician = currentUser.systemRole === 'Technicien';
    console.log('🔧 Est technicien:', isTechnician);
    
    // Vérifier la permission dans le rôle d'entreprise ou si c'est un technicien
    const canGenerateCode = isTechnician || (companyEntry?.role?.permissions?.some(permission => 
      permission.code === 'GENERATE_EMPLOYEE_CODE'
    ));
    
   
    
    if (!canGenerateCode) {
      console.log('❌ Permission refusée pour générer code d\'invitation');
      return res.status(403).json({
        success: false,
        message: 'Vous n\'avez pas la permission pour générer des codes d\'invitation'
      });
    }

    // Générer un code unique
    
    const CompanyCode = require('../models/CompanyCode');
    let code;
    let isUnique = false;
    
    while (!isUnique) {
      code = Math.random().toString(36).substring(2, 10).toUpperCase();
      const existingCode = await CompanyCode.findOne({ code });
      if (!existingCode) {
        isUnique = true;
      }
    }

    

    // Créer le code d'invitation avec expiration de 4 jours et utilisation illimitée
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 4);

   

    const invitationCode = new CompanyCode({
      code,
      company: companyId,
      generatedBy: currentUser._id,
      expiresAt: expirationDate,
      maxUses: null, // Utilisation illimitée
      isActive: true,
      description: `Code d'invitation employé - généré le ${new Date().toLocaleDateString('fr-FR')}`
    });

    
    await invitationCode.save();
    console.log('✅ Code d\'invitation sauvegardé avec succès');

    res.status(201).json({
      success: true,
      message: 'Code d\'invitation généré avec succès',
      data: {
        code: invitationCode.code,
        expiresAt: invitationCode.expiresAt,
        description: invitationCode.description,
        createdAt: invitationCode.createdAt,
        validFor: '4 jours'
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors de la génération du code d\'invitation:', error);
    console.error('Stack trace:', error.stack);
    
    // Gestion spécifique des erreurs de validation
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation lors de la création du code',
        errors: validationErrors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la génération du code d\'invitation',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// PUT /api/users/:id/role - Assigner un rôle à un utilisateur
router.put('/:id/role', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { roleId } = req.body;
    
 
    
    // Vérifier les permissions de l'utilisateur connecté
    const currentUser = await User.findById(req.userId)
      .populate({
        path: 'companies.role',
        populate: {
          path: 'permissions',
          model: 'Permission'
        }
      });
    
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur connecté non trouvé'
      });
    }
    
    // Vérifier si l'utilisateur est technicien OU a la permission MANAGE_EMPLOYES
    let hasPermission = false;
    
    // 1. Vérifier si c'est un technicien
    if (currentUser.systemRole === 'Technicien') {
      hasPermission = true;
      
    } else {
      // 2. Vérifier les permissions dans les rôles d'entreprise
      for (const company of currentUser.companies || []) {
        if (company.role && company.role.permissions) {
          const hasManageEmployes = company.role.permissions.some(
            permission => permission.code === 'MANAGE_EMPLOYES'
          );
          if (hasManageEmployes) {
            hasPermission = true;
            console.log('💼 Permission MANAGE_EMPLOYES trouvée - autorisation accordée');
            break;
          }
        }
      }
    }
    
    if (!hasPermission) {
      console.log('❌ Permissions insuffisantes pour:', currentUser.username);
      return res.status(403).json({
        success: false,
        message: `Permissions insuffisantes. Vous devez être technicien ou avoir la permission MANAGE_EMPLOYES.`
      });
    }
    
    console.log('✅ Autorisation accordée pour assigner des rôles');
    
    
    
    // Vérifier que l'utilisateur à modifier existe
    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Vérifier que le rôle existe
    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Rôle non trouvé'
      });
    }
    
    // Trouver l'entrée de l'entreprise dans le tableau companies
    const companyEntry = targetUser.companies.find(c => 
      c.company.toString() === role.company.toString()
    );
    
    if (companyEntry) {
      // Mettre à jour le rôle existant
      companyEntry.role = new mongoose.Types.ObjectId(roleId);
    } else {
      // Ajouter une nouvelle entrée
      targetUser.companies.push({
        company: role.company,
        role: new mongoose.Types.ObjectId(roleId)
      });
    }
    
    await targetUser.save();
    
    // IMPORTANT: Mettre à jour ou créer l'entrée dans la table Employe
    try {
      let employe = await Employe.findOne({
        utilisateur: id,
        company: role.company
      });
      
      if (employe) {
        // Mettre à jour l'entrée existante
        employe.role = roleId;
        await employe.save();
        console.log('✅ Rôle mis à jour dans la table Employe existante');
      } else {
        // Créer une nouvelle entrée Employe
        employe = new Employe({
          utilisateur: id,
          company: role.company,
          role: roleId,
          poste: 'Employé',
          salaire: 0,
          typeContrat: 'cdi',
          dateEmbauche: new Date(),
          statut: 'actif',
          createdBy: req.userId
        });
        await employe.save();
        console.log('✅ Nouvelle entrée Employe créée avec le rôle');
      }
      
      // Synchronisation supplémentaire pour s'assurer que tout est à jour
      await syncUserRoleToEmploye(id, roleId, role.company);
      
    } catch (employeError) {
      console.log('⚠️ Erreur lors de la synchronisation Employe:', employeError.message);
      // Ne pas faire échouer la requête si il y a une erreur
    }
    
    // Retourner l'utilisateur mis à jour avec le rôle peuplé
    const updatedUser = await User.findById(id)
      .populate({
        path: 'companies.role',
        model: 'Role'
      })
      .populate({
        path: 'companies.company',
        model: 'Company'
      });
    
    res.json({
      success: true,
      message: 'Rôle assigné avec succès',
      user: updatedUser
    });
    
  } catch (error) {
    console.error('Erreur lors de l\'assignation du rôle:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
});

// PUT /api/users/:id - Modifier un utilisateur
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, phoneNumber, compteBancaire, discordId, discordUsername, primes, avances } = req.body;
    
 
    
    // Vérifier que l'utilisateur connecté a les permissions
    const currentUser = await User.findById(req.userId)
      .populate({
        path: 'companies.role',
        populate: {
          path: 'permissions',
          model: 'Permission'
        }
      });
    
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur connecté non trouvé'
      });
    }
    
    // Vérifier si l'utilisateur est technicien OU a la permission MANAGE_EMPLOYES ou MANAGE_SALAIRES
    let hasPermission = false;
    
    // 1. Vérifier si c'est un technicien
    if (currentUser.systemRole === 'Technicien') {
      hasPermission = true;
      console.log('🔧 Technicien - autorisation accordée');
    } else {
      // 2. Vérifier les permissions dans les rôles d'entreprise
      for (const company of currentUser.companies || []) {
        if (company.role && company.role.permissions) {
          const hasManageEmployes = company.role.permissions.some(
            permission => permission.code === 'MANAGE_EMPLOYES' || permission.code === 'MANAGE_SALAIRES'
          );
          if (hasManageEmployes) {
            hasPermission = true;
            console.log('💼 Permission MANAGE_EMPLOYES ou MANAGE_SALAIRES trouvée - autorisation accordée');
            break;
          }
        }
      }
    }
    
    if (!hasPermission) {
      console.log('❌ Permissions insuffisantes pour:', currentUser.username);
      return res.status(403).json({
        success: false,
        message: 'Vous n\'avez pas les permissions pour modifier les employés'
      });
    }
    
    console.log('✅ Autorisation accordée pour modifier l\'employé');
    
    // Vérifier que l'utilisateur à modifier existe
    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Mettre à jour les champs fournis
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (compteBancaire !== undefined) updateData.compteBancaire = compteBancaire;
    if (primes !== undefined) updateData.primes = parseFloat(primes) || 0;
    if (avances !== undefined) updateData.avances = parseFloat(avances) || 0;
    
    // Gestion spéciale pour discordId pour éviter les conflits de clé unique avec null
    if (discordId !== undefined) {
      if (discordId === null || discordId === '' || discordId === 'null') {
        // Si on veut supprimer le discordId, on utilise $unset pour éviter les conflits
        updateData.$unset = { discordId: 1 };
      } else {
        updateData.discordId = discordId;
      }
    }
    
    if (discordUsername !== undefined) updateData.discordUsername = discordUsername;
    
    // Mettre à jour l'utilisateur
    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('role', 'nom name level permissions')
      .populate('company', 'name category')
      .populate({
        path: 'companies.role',
        model: 'Role'
      })
      .populate({
        path: 'companies.company',
        model: 'Company'
      })
      .select('-password');
    
    res.json({
      success: true,
      message: 'Utilisateur modifié avec succès',
      user: updatedUser
    });
    
  } catch (error) {
    console.error('Erreur lors de la modification de l\'utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
});

// GET /api/users/historique - Récupérer l'historique des employés licenciés
router.get('/historique', auth, async (req, res) => {
  try {
    const EmployeHistorique = require('../models/EmployeHistorique');
    const currentUser = await User.findById(req.userId);
    
    // Récupérer l'ID de l'entreprise depuis les paramètres ou depuis l'utilisateur
    const companyId = req.query.companyId || currentUser.currentCompany || currentUser.company;
    
    
    
    if (!companyId) {
      return res.status(400).json({ 
        success: false,
        message: 'Aucune entreprise sélectionnée' 
      });
    }

    // Récupérer tout l'historique pour cette entreprise
    const historique = await EmployeHistorique.find({ 
      company: companyId 
    })
    .populate('licenciePar', 'firstName lastName')
    .sort({ dateLicenciement: -1 });

    
    
    // Debug: afficher les premières entrées
    if (historique.length > 0) {
    }

    res.json({
      success: true,
      historique,
      companyId: companyId
    });
  } catch (error) {
    console.error('❌ Erreur lors de la récupération de l\'historique:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur', 
      error: error.message 
    });
  }
});

// DELETE /api/users/:id/fire - Virer un employé (route simplifiée)
router.delete('/:id/fire', auth, checkUserPermission('MANAGE_EMPLOYES'), async (req, res) => {
  try {
   
    const { id } = req.params;
    const { motif } = req.body;
    const currentUser = await User.findById(req.userId).populate('role');

    // Vérifier que l'utilisateur à virer existe
    const targetUser = await User.findById(id)
      .populate('role', 'nom name')
      .populate('company', 'name');

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Employé non trouvé'
      });
    }

    // Ne pas permettre de se virer soi-même
    if (targetUser._id.toString() === currentUser._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas vous virer vous-même'
      });
    }

    // Sauvegarder dans l'historique des employés
    const EmployeHistorique = require('../models/EmployeHistorique');
    const historiqueData = {
      firstName: targetUser.firstName || 'Prénom non défini',
      lastName: targetUser.lastName || 'Nom non défini',
      email: targetUser.email, // Email optionnel maintenant
      phoneNumber: targetUser.phoneNumber,
      compteBancaire: targetUser.compteBancaire,
      discordId: targetUser.discordId,
      discordUsername: targetUser.discordUsername,
      avatar: targetUser.avatar, // Inclure la photo de profil
      company: targetUser.company?._id,
      role: targetUser.role?._id,
      roleName: targetUser.role?.nom || targetUser.role?.name || 'Rôle inconnu',
      dateRecrutement: targetUser.createdAt || new Date(),
      dateLicenciement: new Date(),
      motifLicenciement: motif || 'Licenciement',
      licenciePar: currentUser._id,
      originalUserId: targetUser._id
    };

    const employeHistorique = new EmployeHistorique(historiqueData);
    await employeHistorique.save();

    // Retirer de l'entreprise
    if (targetUser.company) {
      const company = await Company.findById(targetUser.company._id);
      if (company) {
        company.members = company.members.filter(
          member => member.user.toString() !== targetUser._id.toString()
        );
        await company.save();
      }
    }

    // Nettoyer les données de l'utilisateur
    targetUser.company = null;
    targetUser.role = null;
    targetUser.isCompanyValidated = false;
    targetUser.currentCompany = null;
    targetUser.companies = [];

    await targetUser.save();

    console.log(`🔥 Employé viré: ${targetUser.firstName} ${targetUser.lastName} par ${currentUser.firstName} ${currentUser.lastName}`);

    res.json({
      success: true,
      message: `Employé ${targetUser.firstName} ${targetUser.lastName} a été viré avec succès`,
      employeVire: {
        nom: `${targetUser.firstName} ${targetUser.lastName}`,
        motif: motif || 'Licenciement',
        dateLicenciement: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors du licenciement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors du licenciement',
      error: error.message
    });
  }
});

// DELETE /api/users/:id - Supprimer/Virer un utilisateur (route générique)
router.delete('/:id', auth, checkUserPermission('MANAGE_EMPLOYES'), async (req, res) => {
  try {
    
    const { id } = req.params;
    const { motif } = req.body;
    const currentUser = await User.findById(req.userId).populate('role');

    // Vérifier que l'utilisateur à virer existe
    const targetUser = await User.findById(id)
      .populate('role', 'nom name')
      .populate('company', 'name')
      .populate('companies.company', 'name');

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Employé non trouvé'
      });
    }

    // Ne pas permettre de se virer soi-même
    if (targetUser._id.toString() === currentUser._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas vous virer vous-même'
      });
    }

    // Sauvegarder dans l'historique des employés
    const EmployeHistorique = require('../models/EmployeHistorique');
    
    // Déterminer l'entreprise : priorité à celle de l'employé, sinon celle de l'admin
    let companyId = targetUser.company?._id;
    
    // Si l'employé n'a pas d'entreprise, utiliser celle de l'admin qui vire
    if (!companyId) {
      companyId = currentUser.currentCompany || currentUser.company;
    }
    
    // Si toujours pas d'entreprise, chercher dans les entreprises de l'employé
    if (!companyId && targetUser.companies && targetUser.companies.length > 0) {
      companyId = targetUser.companies[0].company;
    }
    
    console.log('🏢 Entreprise pour historique:', {
      targetUserCompany: targetUser.company?._id,
      targetUserCompanies: targetUser.companies?.map(c => c.company),
      currentUserCurrentCompany: currentUser.currentCompany,
      currentUserCompany: currentUser.company,
      finalCompanyId: companyId
    });
    
    if (!companyId) {
      console.error('❌ Impossible de déterminer l\'entreprise pour l\'historique');
      return res.status(400).json({
        success: false,
        message: 'Impossible de déterminer l\'entreprise pour l\'historique'
      });
    }
    
    const historiqueData = {
      firstName: targetUser.firstName || 'Prénom non défini',
      lastName: targetUser.lastName || 'Nom non défini',
      email: targetUser.email, // Email optionnel maintenant
      phoneNumber: targetUser.phoneNumber,
      compteBancaire: targetUser.compteBancaire,
      discordId: targetUser.discordId,
      discordUsername: targetUser.discordUsername,
      avatar: targetUser.avatar, // Inclure la photo de profil
      company: companyId, // Utiliser l'ID d'entreprise déterminé
      role: targetUser.role?._id,
      roleName: targetUser.role?.nom || targetUser.role?.name || 'Rôle inconnu',
      dateRecrutement: targetUser.createdAt || new Date(),
      dateLicenciement: new Date(),
      motifLicenciement: motif || 'Licenciement',
      licenciePar: currentUser._id,
      originalUserId: targetUser._id
    };

    console.log('📋 Données historique à sauvegarder:', {
      firstName: historiqueData.firstName,
      lastName: historiqueData.lastName,
      email: historiqueData.email,
      company: historiqueData.company
    });

    const employeHistorique = new EmployeHistorique(historiqueData);
    await employeHistorique.save();

    console.log(`✅ Historique sauvegardé avec ID: ${employeHistorique._id} pour l'entreprise: ${historiqueData.company}`);

    // Retirer de l'entreprise
    if (targetUser.company) {
      const company = await Company.findById(targetUser.company._id);
      if (company) {
        company.members = company.members.filter(
          member => member.user.toString() !== targetUser._id.toString()
        );
        await company.save();
      }
    }

    // Nettoyer les données de l'utilisateur
    targetUser.company = null;
    targetUser.role = null;
    targetUser.isCompanyValidated = false;
    targetUser.currentCompany = null;
    targetUser.companies = [];

    await targetUser.save();


    res.json({
      success: true,
      message: `Employé ${targetUser.firstName} ${targetUser.lastName} a été viré avec succès`,
      employeVire: {
        nom: `${targetUser.firstName} ${targetUser.lastName}`,
        motif: motif || 'Licenciement',
        dateLicenciement: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors du licenciement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors du licenciement',
      error: error.message
    });
  }
});

// Route de debug pour vérifier l'historique en base
router.get('/debug-historique/:companyId?', auth, async (req, res) => {
  try {
    const EmployeHistorique = require('../models/EmployeHistorique');
    const { companyId } = req.params;
    
    let query = {};
    if (companyId) {
      query.company = companyId;
    }
    
    const allHistorique = await EmployeHistorique.find(query)
      .populate('company', 'name')
      .populate('licenciePar', 'firstName lastName')
      .sort({ dateLicenciement: -1 });
    
    
    
    res.json({
      success: true,
      message: `${allHistorique.length} entrées d'historique trouvées`,
      historique: allHistorique.map(h => ({
        id: h._id,
        nom: `${h.firstName} ${h.lastName}`,
        entreprise: h.company?.name || 'Entreprise supprimée',
        companyId: h.company?._id,
        dateLicenciement: h.dateLicenciement,
        motif: h.motifLicenciement,
        licenciePar: h.licenciePar ? `${h.licenciePar.firstName} ${h.licenciePar.lastName}` : 'Inconnu'
      }))
    });
  } catch (error) {
    console.error('❌ Erreur debug historique:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ROUTE DEBUG TEMPORAIRE - À supprimer après résolution
router.get('/debug-user-data', auth, async (req, res) => {
  try {
    console.log('🐛 DEBUG: Récupération données complètes utilisateur:', req.userId);
    
    const user = await User.findById(req.userId)
      .populate({
        path: 'companies.company',
        model: 'Company',
        select: 'name description category owner members'
      })
      .populate({
        path: 'companies.role',
        model: 'Role',
        select: 'nom description'
      })
      .populate('company', 'name')
      .populate('currentCompany', 'name')
      .select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
   
    
    res.json({
      success: true,
      debug: true,
      user: user,
      analysis: {
        shouldHaveAccessTo: user.companies?.filter(c => 
          c.isActive !== false && 
          (c.company?.owner?.toString() === req.userId || 
           c.company?.members?.some(m => m.user.toString() === req.userId))
        ).map(c => c.company?.name)
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur debug user data:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// ROUTE DEBUG TEMPORAIRE - Nettoyer les accès non autorisés d'un utilisateur
router.post('/clean-unauthorized-access', auth, async (req, res) => {
  try {
    // Seulement pour les techniciens
    const currentUser = await User.findById(req.userId);
    if (currentUser.systemRole !== 'Technicien') {
      return res.status(403).json({ message: 'Accès refusé - Techniciens uniquement' });
    }

    const { targetUserId } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ message: 'targetUserId requis' });
    }

    

    const user = await User.findById(targetUserId)
      .populate('companies.company', 'name owner members');

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const validCompanies = [];
    const removedCompanies = [];

    for (const userCompany of user.companies) {
      const company = userCompany.company;
      const isOwner = company.owner?.toString() === targetUserId;
      const isMember = company.members?.some(m => m.user.toString() === targetUserId);
      
      if (isOwner || isMember) {
        validCompanies.push(userCompany);
        console.log('✅ Accès valide conservé:', company.name);
      } else {
        removedCompanies.push(company.name);
        console.log('❌ Accès non autorisé supprimé:', company.name);
      }
    }

    // Mettre à jour l'utilisateur
    user.companies = validCompanies;
    await user.save();

    res.json({
      success: true,
      message: 'Nettoyage terminé',
      user: user.username,
      validCompanies: validCompanies.map(c => c.company.name),
      removedCompanies: removedCompanies
    });

  } catch (error) {
    console.error('❌ Erreur nettoyage accès:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// GET /api/users/my-companies - Récupérer toutes les entreprises de l'utilisateur connecté
router.get('/my-companies', auth, async (req, res) => {
  try {
    
    
    // Récupérer l'utilisateur avec ses entreprises
    const user = await User.findById(req.userId).populate({
      path: 'companies.company',
      model: 'Company',
      select: 'name description category logo owner createdAt'
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    
    
    // Extraire les entreprises avec leurs détails
    const companies = [];
    
    if (user.companies && user.companies.length > 0) {
     
      for (const userCompany of user.companies) {
        console.log('  - Entreprise:', userCompany.company?.name, 'isActive:', userCompany.isActive);
        if (userCompany.company && userCompany.isActive !== false) {
          companies.push(userCompany.company);
        }
      }
    }
    
    console.log('✅ Entreprises actives récupérées:', companies.length);
    
    res.json({
      success: true,
      companies: companies,
      totalCompanies: companies.length
    });
    
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des entreprises utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des entreprises',
      error: error.message
    });
  }
});

// PUT /api/users/current-company - Mettre à jour l'entreprise actuelle de l'utilisateur
router.put('/current-company', auth, async (req, res) => {
  try {
    const { companyId } = req.body;
    
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'ID d\'entreprise requis'
      });
    }
    
    // Vérifier que l'utilisateur a accès à cette entreprise
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Vérifier que l'utilisateur est bien assigné à cette entreprise
   
    
    const isAssigned = user.companies?.some(c => {
      const companyIdStr = c.company.toString();
      return companyIdStr === companyId.toString();
    }) || user.company?.toString() === companyId.toString();
    
    
    
    // Permettre aux techniciens de changer vers n'importe quelle entreprise
    if (!isAssigned && user.systemRole !== 'Technicien') {
      console.log('❌ Utilisateur non assigné à cette entreprise');
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas assigné à cette entreprise'
      });
    }
    
    // Mettre à jour currentCompany
    user.currentCompany = companyId;
    await user.save();
    
    console.log('✅ Entreprise actuelle mise à jour');
    
    res.json({
      success: true,
      message: 'Entreprise actuelle mise à jour',
      currentCompany: companyId
    });
    
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour de l\'entreprise actuelle:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la mise à jour',
      error: error.message
    });
  }
});

// POST /api/users/sync-company-switch - Synchroniser complètement le switch d'entreprise
router.post('/sync-company-switch', auth, async (req, res) => {
  try {
    const { companyId } = req.body;
   
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'ID d\'entreprise requis'
      });
    }
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Vérifier l'accès à l'entreprise
    const isAssigned = user.companies?.some(c => c.company.toString() === companyId.toString()) || 
                      user.company?.toString() === companyId.toString() ||
                      user.systemRole === 'Technicien';
    
    if (!isAssigned) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé à cette entreprise'
      });
    }
    
    // 1. Mettre à jour currentCompany
    user.currentCompany = companyId;
    await user.save();
    console.log('✅ currentCompany mis à jour');
    
    // 2. Vérifier/créer l'entrée Employe pour cette entreprise
    let employe = await Employe.findOne({
      utilisateur: req.userId,
      company: companyId
    });
    
    if (!employe) {
      
      
      // Trouver le rôle de l'utilisateur dans cette entreprise
      const userCompany = user.companies?.find(c => c.company.toString() === companyId.toString());
      
      employe = new Employe({
        utilisateur: req.userId,
        company: companyId,
        poste: 'Employé', // Champ requis
        salaire: 0, // Champ requis
        typeContrat: 'cdi', // Champ requis
        dateEmbauche: new Date(),
        statut: 'actif',
        createdBy: req.userId
      });
      
      await employe.save();
      console.log('✅ Entrée Employe créée');
    } else {
      console.log('✅ Entrée Employe existante trouvée');
    }
    
    // 3. Créer une entrée de salaire par défaut si elle n'existe pas
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    const existingSalaire = await Salaire.findOne({
      employe: employe._id,
      company: companyId,
      'periode.mois': currentMonth,
      'periode.annee': currentYear
    });
    
    if (!existingSalaire) {
      
      
      const newSalaire = new Salaire({
        employe: employe._id,
        company: companyId,
        periode: {
          mois: currentMonth,
          annee: currentYear
        },
        salaireBrut: 0, // Champ requis selon le modèle
        salaireNet: 0,  // Champ requis selon le modèle
        statut: 'calcule', // Utiliser une valeur valide de l'enum
        createdBy: req.userId
      });
      
      await newSalaire.save();
      console.log('✅ Entrée salaire créée');
    } else {
      console.log('✅ Entrée salaire existante trouvée');
    }
    
    // 4. Récupérer les données complètes de l'entreprise
    const company = await Company.findById(companyId)
      .populate('owner', 'username firstName lastName')
      .populate('members.user', 'username firstName lastName')
      .populate('members.role', 'nom description');
    
    res.json({
      success: true,
      message: 'Synchronisation complète terminée',
      data: {
        user: {
          id: user._id,
          username: user.username,
          currentCompany: user.currentCompany
        },
        company: company,
        employe: employe
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur synchronisation switch entreprise:', error);
    console.error('Stack trace:', error.stack);
    
    // Logs détaillés pour identifier le problème
    if (error.name === 'ValidationError') {
      console.error('❌ Erreur de validation:', error.errors);
    }
    if (error.code === 11000) {
      console.error('❌ Erreur de duplication:', error.keyPattern);
    }
    
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la synchronisation',
      error: error.message,
      errorName: error.name,
      errorCode: error.code,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// POST /api/users/debug-discord - Route de debug spécifique pour les utilisateurs Discord
router.post('/debug-discord', auth, async (req, res) => {
  try {
    
    
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé',
        userId: req.userId
      });
    }
    
  
    
    res.json({
      success: true,
      message: 'Debug Discord réussi',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        discordId: user.discordId,
        discordUsername: user.discordUsername,
        currentCompany: user.currentCompany,
        companiesCount: user.companies?.length || 0,
        systemRole: user.systemRole,
        isActive: user.isActive,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    console.error('❌ Erreur debug Discord:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Erreur debug Discord',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// POST /api/users/test-auth - Route de test pour diagnostiquer les problèmes d'auth
router.post('/test-auth', auth, async (req, res) => {
  try {
   
    
    const user = await User.findById(req.userId);
    
    res.json({
      success: true,
      message: 'Auth fonctionne',
      userId: req.userId,
      userExists: !!user,
      username: user?.username
    });
  } catch (error) {
    console.error('❌ Erreur test auth:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur test auth',
      error: error.message
    });
  }
});

// POST /api/users/sync-company-switch-simple - Version simplifiée en cas de problème
router.post('/sync-company-switch-simple', auth, async (req, res) => {
  try {
    const { companyId } = req.body;
    
    
    if (!companyId) {
      console.log('❌ CompanyId manquant');
      return res.status(400).json({
        success: false,
        message: 'ID d\'entreprise requis'
      });
    }
    
    console.log('🔍 Recherche utilisateur...');
    const user = await User.findById(req.userId);
    if (!user) {
      console.log('❌ Utilisateur non trouvé:', req.userId);
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
   
    
    
    
    // Mettre à jour currentCompany seulement
    user.currentCompany = companyId;
    
    
    await user.save({ validateBeforeSave: false }); // Éviter les validations qui pourraient échouer
   
    
    res.json({
      success: true,
      message: 'Switch d\'entreprise terminé',
      data: {
        user: {
          id: user._id,
          username: user.username,
          currentCompany: user.currentCompany
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur switch simple:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors du switch simple',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ROUTE DEBUG TEMPORAIRE - Vérifier les ventes par entreprise
router.get('/debug-ventes/:companyId', auth, async (req, res) => {
  try {
    const { companyId } = req.params;
    
    
    // Récupérer toutes les ventes de cette entreprise
    const Vente = require('../models/Vente');
    const ventes = await Vente.find({ companyId: companyId })
      .populate('vendeur', 'username firstName lastName')
      .sort({ createdAt: -1 })
      .limit(20);
    
   
    
    const ventesDetails = ventes.map(vente => ({
      id: vente._id,
      vendeur: vente.vendeur?.username || vente.vendeurNom,
      vendeurId: vente.vendeur?._id,
      totalCommission: vente.totalCommission,
      companyId: vente.companyId,
      createdAt: vente.createdAt,
      week: vente.week,
      year: vente.year
    }));
    
   
    
    // Récupérer aussi les utilisateurs de cette entreprise
    const users = await User.find({
      $or: [
        { company: companyId },
        { currentCompany: companyId },
        { 'companies.company': companyId }
      ]
    }).select('username firstName lastName _id');
    
    
    
    res.json({
      success: true,
      debug: true,
      companyId: companyId,
      ventes: ventesDetails,
      users: users,
      summary: {
        totalVentes: ventes.length,
        totalUsers: users.length,
        totalCA: ventes.reduce((sum, v) => sum + (v.totalCommission || 0), 0)
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur debug ventes:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// GET /api/users/debug-role-issue - Route de debug pour identifier le problème de rôle
router.get('/debug-role-issue', auth, async (req, res) => {
  try {
    const { companyId } = req.query;
    
    console.log('🔍 Debug du problème de rôle pour l\'utilisateur:', req.userId);
    
    // Récupérer l'utilisateur connecté avec toutes ses données
    const currentUser = await User.findById(req.userId)
      .populate('companies.role', 'nom normeSalariale limiteSalaire typeContrat')
      .populate('role', 'nom normeSalariale')
      .populate('company', 'name')
      .populate('currentCompany', 'name');
    
    if (!currentUser) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    // Utiliser le companyId fourni ou celui de l'utilisateur
    const targetCompanyId = companyId || currentUser.currentCompany?._id || currentUser.company?._id;
    
    if (!targetCompanyId) {
      return res.status(400).json({ message: 'Aucune entreprise trouvée' });
    }
    
    // Chercher l'entrée Employe
    const employe = await Employe.findOne({
      utilisateur: req.userId,
      company: targetCompanyId
    }).populate('role', 'nom normeSalariale limiteSalaire typeContrat');
    
    // Trouver le rôle dans companies
    const companyEntry = currentUser.companies.find(c => 
      c.company.toString() === targetCompanyId.toString()
    );
    
    const debugInfo = {
      userId: currentUser._id,
      username: currentUser.username,
      name: `${currentUser.firstName} ${currentUser.lastName}`,
      targetCompanyId,
      targetCompanyName: currentUser.currentCompany?.name || currentUser.company?.name,
      
      // Données User
      userCompanies: currentUser.companies.map(c => ({
        companyId: c.company,
        roleId: c.role?._id,
        roleName: c.role?.nom,
        normeSalariale: c.role?.normeSalariale
      })),
      userMainRole: currentUser.role ? {
        id: currentUser.role._id,
        nom: currentUser.role.nom,
        normeSalariale: currentUser.role.normeSalariale
      } : null,
      
      // Données Employe
      employeExists: !!employe,
      employeData: employe ? {
        id: employe._id,
        roleId: employe.role?._id,
        roleName: employe.role?.nom,
        normeSalariale: employe.role?.normeSalariale
      } : null,
      
      // État de synchronisation
      companyRoleForTarget: companyEntry?.role ? {
        id: companyEntry.role._id,
        nom: companyEntry.role.nom,
        normeSalariale: companyEntry.role.normeSalariale
      } : null,
      
      isSynced: employe && companyEntry?.role && 
        employe.role?._id.toString() === companyEntry.role._id.toString(),
      
      needsSync: !employe || !companyEntry?.role || 
        !employe.role || 
        employe.role._id.toString() !== companyEntry.role._id.toString()
    };
    
    console.log('🔍 Debug info:', JSON.stringify(debugInfo, null, 2));
    
    res.json({
      success: true,
      debug: debugInfo
    });
    
  } catch (error) {
    console.error('Erreur debug:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
});

// GET /api/users/check-role-sync/:companyId - Vérifier l'état de synchronisation des rôles
router.get('/check-role-sync/:companyId', auth, async (req, res) => {
  try {
    const { companyId } = req.params;
    
    console.log('🔍 Vérification de la synchronisation des rôles pour l\'entreprise:', companyId);
    
    // Récupérer tous les utilisateurs de l'entreprise avec leurs rôles
    const users = await User.find({
      $or: [
        { company: companyId },
        { currentCompany: companyId },
        { 'companies.company': companyId }
      ]
    }).populate('companies.role', 'nom normeSalariale');
    
    const results = [];
    
    for (const user of users) {
      // Trouver le rôle pour cette entreprise dans User.companies
      const companyEntry = user.companies.find(c => 
        c.company.toString() === companyId.toString()
      );
      
      // Trouver l'entrée Employe correspondante
      const employe = await Employe.findOne({
        utilisateur: user._id,
        company: companyId
      }).populate('role', 'nom normeSalariale');
      
      const userRole = companyEntry?.role;
      const employeRole = employe?.role;
      
      const isSynced = userRole && employeRole && 
        userRole._id.toString() === employeRole._id.toString();
      
      results.push({
        userId: user._id,
        username: user.username,
        name: `${user.firstName} ${user.lastName}`,
        userRole: userRole ? {
          id: userRole._id,
          nom: userRole.nom,
          normeSalariale: userRole.normeSalariale
        } : null,
        employeRole: employeRole ? {
          id: employeRole._id,
          nom: employeRole.nom,
          normeSalariale: employeRole.normeSalariale
        } : null,
        employeExists: !!employe,
        isSynced,
        needsSync: !isSynced
      });
    }
    
    const needsSyncCount = results.filter(r => r.needsSync).length;
    
    res.json({
      success: true,
      companyId,
      totalUsers: results.length,
      needsSyncCount,
      results: results.sort((a, b) => a.needsSync ? -1 : 1) // Mettre les non-synchronisés en premier
    });
    
  } catch (error) {
    console.error('Erreur lors de la vérification:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
});

// POST /api/users/fix-my-role - Corriger le rôle de l'utilisateur connecté
router.post('/fix-my-role', auth, async (req, res) => {
  try {
    const { companyId } = req.body;
    
    console.log('🔧 Correction du rôle pour l\'utilisateur:', req.userId);
    
    // Récupérer l'utilisateur connecté
    const currentUser = await User.findById(req.userId)
      .populate('companies.role');
    
    if (!currentUser) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    // Utiliser le companyId fourni ou celui de l'utilisateur
    const targetCompanyId = companyId || currentUser.currentCompany || currentUser.company;
    
    if (!targetCompanyId) {
      return res.status(400).json({ message: 'Aucune entreprise trouvée' });
    }
    
    // Trouver le rôle dans companies
    const companyEntry = currentUser.companies.find(c => 
      c.company.toString() === targetCompanyId.toString()
    );
    
    if (!companyEntry || !companyEntry.role) {
      return res.status(400).json({ 
        message: 'Aucun rôle trouvé pour cette entreprise dans User.companies' 
      });
    }
    
    // Chercher ou créer l'entrée Employe
    let employe = await Employe.findOne({
      utilisateur: req.userId,
      company: targetCompanyId
    });
    
    if (employe) {
      // Mettre à jour l'entrée existante
      employe.role = companyEntry.role._id || companyEntry.role;
      await employe.save();
      console.log('✅ Rôle mis à jour dans Employe existant');
    } else {
      // Créer une nouvelle entrée Employe
      employe = new Employe({
        utilisateur: req.userId,
        company: targetCompanyId,
        role: companyEntry.role._id || companyEntry.role,
        poste: 'Employé',
        salaire: 0,
        typeContrat: 'cdi',
        dateEmbauche: new Date(),
        statut: 'actif',
        createdBy: req.userId
      });
      await employe.save();
      console.log('✅ Nouvelle entrée Employe créée avec le rôle');
    }
    
    // Récupérer les données mises à jour pour vérification
    const updatedEmploye = await Employe.findById(employe._id)
      .populate('role', 'nom normeSalariale limiteSalaire typeContrat');
    
    res.json({
      success: true,
      message: 'Rôle corrigé avec succès',
      data: {
        userId: req.userId,
        companyId: targetCompanyId,
        userRole: {
          id: companyEntry.role._id || companyEntry.role,
          nom: companyEntry.role.nom,
          normeSalariale: companyEntry.role.normeSalariale
        },
        employeRole: {
          id: updatedEmploye.role._id,
          nom: updatedEmploye.role.nom,
          normeSalariale: updatedEmploye.role.normeSalariale
        },
        isSynced: true
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de la correction du rôle:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
});

// POST /api/users/sync-roles - Synchroniser les rôles entre User.companies et Employe.role
router.post('/sync-roles', auth, async (req, res) => {
  try {
    const { companyId } = req.body;
    
    console.log('🔄 Début de la synchronisation des rôles...');
    
    // Vérifier les permissions (seuls les techniciens peuvent faire cette opération)
    const currentUser = await User.findById(req.userId);
    if (currentUser.systemRole !== 'Technicien') {
      return res.status(403).json({
        success: false,
        message: 'Seuls les techniciens peuvent synchroniser les rôles'
      });
    }
    
    let filter = {};
    if (companyId) {
      filter = { 'companies.company': companyId };
    }
    
    // Récupérer tous les utilisateurs avec leurs entreprises
    const users = await User.find(filter).populate('companies.role');
    
    let syncCount = 0;
    let errorCount = 0;
    
    for (const user of users) {
      for (const company of user.companies || []) {
        if (company.role && company.company) {
          try {
            // Vérifier si l'entrée Employe existe
            let employe = await Employe.findOne({
              utilisateur: user._id,
              company: company.company
            });
            
            if (employe) {
              // Mettre à jour l'entrée existante
              employe.role = company.role._id || company.role;
              await employe.save();
              syncCount++;
              console.log(`✅ Synchronisé: ${user.username} -> ${company.role.nom || company.role}`);
            } else {
              // Créer une nouvelle entrée Employe
              employe = new Employe({
                utilisateur: user._id,
                company: company.company,
                role: company.role._id || company.role,
                poste: 'Employé',
                salaire: 0,
                typeContrat: 'cdi',
                dateEmbauche: new Date(),
                statut: 'actif',
                createdBy: req.userId
              });
              await employe.save();
              syncCount++;
              console.log(`✅ Créé et synchronisé: ${user.username} -> ${company.role.nom || company.role}`);
            }
          } catch (error) {
            errorCount++;
            console.log(`❌ Erreur sync ${user.username}:`, error.message);
          }
        }
      }
    }
    
    console.log(`🔄 Synchronisation terminée: ${syncCount} succès, ${errorCount} erreurs`);
    
    res.json({
      success: true,
      message: `Synchronisation terminée: ${syncCount} rôles synchronisés, ${errorCount} erreurs`,
      syncCount,
      errorCount
    });
    
  } catch (error) {
    console.error('Erreur lors de la synchronisation des rôles:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
});

// POST /api/users/sync-employe-roles - Synchroniser les rôles User.role vers Employe.role
router.post('/sync-employe-roles', auth, async (req, res) => {
  try {
    const { companyId } = req.body;
    
    console.log('🔄 Synchronisation des rôles User.role vers Employe.role...');
    
    // Importer le script de synchronisation
    const { syncEmployeRoles } = require('../scripts/syncEmployeRoles');
    
    // Filtrer par entreprise si spécifiée
    let filter = {};
    if (companyId) {
      filter.company = companyId;
    }
    
    // Récupérer tous les employés avec leurs utilisateurs
    const employes = await Employe.find(filter)
      .populate('utilisateur', 'role firstName lastName username')
      .populate('role', 'name level');

    let syncCount = 0;
    let errorCount = 0;

    for (const employe of employes) {
      try {
        if (!employe.utilisateur) {
          console.log(`⚠️ Employé ${employe._id} sans utilisateur associé`);
          continue;
        }

        const userRole = employe.utilisateur.role;
        const employeRole = employe.role;

        // Si l'utilisateur a un rôle mais pas l'employé, synchroniser
        if (userRole && !employeRole) {
          employe.role = userRole;
          await employe.save();
          syncCount++;
          console.log(`✅ Rôle synchronisé pour ${employe.utilisateur.firstName} ${employe.utilisateur.lastName}`);
        }
        // Si les rôles sont différents, mettre à jour avec le rôle de l'utilisateur
        else if (userRole && employeRole && userRole.toString() !== employeRole.toString()) {
          employe.role = userRole;
          await employe.save();
          syncCount++;
          console.log(`🔄 Rôle mis à jour pour ${employe.utilisateur.firstName} ${employe.utilisateur.lastName}`);
        }

      } catch (error) {
        errorCount++;
        console.error(`❌ Erreur lors de la synchronisation de l'employé ${employe._id}:`, error.message);
      }
    }

    console.log(`📊 Synchronisation terminée: ${syncCount} rôles synchronisés, ${errorCount} erreurs`);

    res.json({
      success: true,
      message: `Synchronisation terminée: ${syncCount} rôles synchronisés, ${errorCount} erreurs`,
      syncCount,
      errorCount,
      total: employes.length
    });

  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation des rôles employés:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la synchronisation',
      error: error.message
    });
  }
});

module.exports = router;
