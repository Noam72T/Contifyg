const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Company = require('../models/Company');
const Role = require('../models/Role');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { createDefaultCategories } = require('../utils/defaultCategories');

// Configuration multer pour l'upload de fichiers
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/logos');
    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Générer un nom unique pour le fichier
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max (augmenté pour les grandes images)
  },
  fileFilter: function (req, file, cb) {
    // Vérifier que c'est une image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées'), false);
    }
  }
});

// Middleware pour vérifier les permissions modernes
const checkModernPermission = (permissionCode) => {
  return async (req, res, next) => {
    try {
   
      
      const user = await User.findById(req.userId)
        .populate({
          path: 'companies.role',
          model: 'Role',
          populate: {
            path: 'permissions',
            model: 'Permission'
          }
        });

      

      // Vérifier le rôle système
      if (user.systemRole === 'Technicien' || user.systemRole === 'SuperAdmin') {
        return next(); // Technicien et SuperAdmin ont tous les droits
      }

      // IRS a accès en lecture seule - refuser les actions de modification
      if (user.systemRole === 'IRS') {
        return res.status(403).json({ message: 'Accès en lecture seule - modification interdite' });
      }

      // Vérifier les permissions dans l'entreprise actuelle ou celle demandée
      const companyId = req.params.id || user.currentCompany;
     
      
      if (companyId) {
        const userCompany = user.companies.find(
          c => c.company.toString() === companyId.toString()
        );
        
        if (userCompany && userCompany.role && userCompany.role.permissions) {
         
          
          // Vérifier si l'utilisateur a la permission requise
          const hasPermission = userCompany.role.permissions.some(
            perm => perm.code === permissionCode
          );
          
          
          
          if (hasPermission) {
            
            return next();
          }
        }
      }

      
      return res.status(403).json({ message: 'Permission refusée' });
    } catch (error) {
      console.error('❌ Erreur middleware permission:', error);
      return res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
  };
};

// GET /api/companies - Lister les entreprises
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
  
    
    let companies;
    if (user.systemRole === 'Technicien' || user.systemRole === 'SuperAdmin' || user.systemRole === 'IRS') {
      // Technicien, SuperAdmin et IRS voient toutes les entreprises
      
      companies = await Company.find()
        .populate('owner', 'username firstName lastName')
        .populate('members.user', 'username firstName lastName')
        .populate('members.role', 'nom description normeSalariale typeContrat permissions');
      
    } else {
      // Utilisateur normal voit seulement ses entreprises
      
      companies = await Company.find({
        'members.user': req.userId
      })
        .populate('owner', 'username firstName lastName')
        .populate('members.user', 'username firstName lastName')
        .populate('members.role', 'nom description normeSalariale typeContrat permissions');
      
    }

    res.json({
      success: true,
      companies: companies
    });
  } catch (error) {
    console.error('Error in GET /companies:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// POST /api/companies - Créer une entreprise
router.post('/', auth, async (req, res) => {
  try {
    console.log('🏢 Début création entreprise pour utilisateur:', req.userId);
    console.log('📝 Données reçues:', req.body);
    
    const { name, description, category, apiMode, glifeCompanyId } = req.body;

    // Validation des données
    if (!name || name.trim() === '') {
      return res.status(400).json({ 
        success: false,
        message: 'Le nom de l\'entreprise est requis' 
      });
    }

    // Validation mode API
    if (apiMode && !glifeCompanyId) {
      return res.status(400).json({
        success: false,
        message: 'L\'ID de l\'entreprise GLife est requis en mode API'
      });
    }

    console.log('✅ Validation des données OK');
    if (apiMode) {
      console.log('🔌 Mode API activé avec ID GLife:', glifeCompanyId);
    }

    // Créer l'entreprise
    const company = new Company({
      name: name.trim(),
      description: description?.trim() || '',
      category: category || 'Autre',
      owner: req.userId,
      members: [],
      apiMode: apiMode || false,
      glifeCompanyId: apiMode ? parseInt(glifeCompanyId) : null
    });

    console.log('💾 Sauvegarde de l\'entreprise...');
    await company.save();
    console.log('✅ Entreprise sauvegardée avec ID:', company._id);

    // Créer les catégories par défaut pour l'entreprise
    try {
      console.log('📂 Création des catégories par défaut...');
      await createDefaultCategories(company._id);
      console.log('✅ Catégories par défaut créées');
    } catch (categoryError) {
      console.error('❌ Erreur lors de la création des catégories par défaut:', categoryError);
      // On continue même si les catégories échouent
    }

    // Créer le rôle Admin par défaut pour cette entreprise
    console.log('👑 Création du rôle Admin...');
    const adminRole = new Role({
      nom: 'Admin',
      description: 'Administrateur de l\'entreprise avec tous les droits',
      company: company._id,
      creePar: req.userId,
      normeSalariale: 100, // Admin a accès à 100% des bénéfices
      typeContrat: 'DIRECTION',
      isDefault: true
    });

    await adminRole.save();
    console.log('✅ Rôle Admin créé avec ID:', adminRole._id);

    // Ajouter le créateur comme Admin de l'entreprise
    console.log('👤 Ajout du créateur comme membre...');
    company.members.push({
      user: req.userId,
      role: adminRole._id
    });

    await company.save();
    console.log('✅ Membre ajouté à l\'entreprise');

    // Mettre à jour l'utilisateur
    console.log('🔄 Mise à jour de l\'utilisateur...');
    const user = await User.findById(req.userId);
    
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    user.companies.push({
      company: company._id,
      role: adminRole._id
    });
    
    // Si c'est la première entreprise, la définir comme entreprise actuelle
    if (!user.currentCompany) {
      user.currentCompany = company._id;
      console.log('🎯 Définie comme entreprise actuelle');
    }
    
    // Sauvegarder sans validation pour éviter les erreurs de champs conditionnels
    await user.save({ validateBeforeSave: false });
    console.log('✅ Utilisateur mis à jour');

    // Retourner l'entreprise créée avec les détails
    console.log('📤 Récupération des détails de l\'entreprise...');
    const populatedCompany = await Company.findById(company._id)
      .populate('owner', 'username firstName lastName')
      .populate('members.user', 'username firstName lastName')
      .populate('members.role', 'nom description normeSalariale typeContrat permissions');

    console.log('🎉 Entreprise créée avec succès!');
    res.status(201).json({
      success: true,
      company: populatedCompany,
      message: 'Entreprise créée avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'entreprise:', error);
    console.error('Stack trace:', error.stack);
    
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur lors de la création de l\'entreprise', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// GET /api/companies/:id - Obtenir une entreprise spécifique
router.get('/:id', auth, async (req, res) => {
  try {
    console.log('🏢 Récupération entreprise par ID:', req.params.id, 'pour utilisateur:', req.userId);
    
    const company = await Company.findById(req.params.id)
      .populate('owner', 'username firstName lastName')
      .populate('members.user', 'username firstName lastName')
      .populate('members.role', 'nom description normeSalariale typeContrat permissions');

    if (!company) {
      console.log('❌ Entreprise non trouvée:', req.params.id);
      return res.status(404).json({ message: 'Entreprise non trouvée' });
    }

    console.log('✅ Entreprise trouvée:', company.name);

    // Vérifier si l'utilisateur a accès à cette entreprise
    const user = await User.findById(req.userId);
    
    console.log('🔍 Vérification accès utilisateur:', {
      userId: req.userId,
      username: user.username,
      systemRole: user.systemRole,
      userCompany: user.company?.toString(),
      currentCompany: user.currentCompany?.toString(),
      companiesCount: user.companies?.length || 0,
      requestedCompanyId: req.params.id
    });
    
    // Debug des membres de l'entreprise
    console.log('👥 Membres de l\'entreprise:', company.members.map(member => ({
      userId: member.user?._id?.toString() || 'UNDEFINED',
      username: member.user?.username || 'UNDEFINED',
      role: member.role?.nom || 'UNDEFINED'
    })));
    
    const hasAccess = (user.systemRole === 'Technicien' || user.systemRole === 'SuperAdmin' || user.systemRole === 'IRS') || 
                     company.members.some(member => member.user?._id?.toString() === req.userId) ||
                     user.company?.toString() === req.params.id ||
                     user.currentCompany?.toString() === req.params.id ||
                     (user.companies && user.companies.some(c => c.company.toString() === req.params.id));

    console.log('🔐 Résultat vérification accès:', hasAccess);

    if (!hasAccess) {
      console.log('❌ Accès refusé pour utilisateur:', user.username, 'vers entreprise:', company.name);
      return res.status(403).json({ message: 'Accès refusé à cette entreprise' });
    }

    console.log('✅ Accès autorisé pour:', user.username, 'vers:', company.name);
    res.json({
      success: true,
      company
    });
  } catch (error) {
    console.error('❌ Erreur serveur route companies/:id:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// PUT /api/companies/:id - Modifier une entreprise
router.put('/:id', auth, checkModernPermission('MANAGE_COMPANY'), async (req, res) => {
  try {
    const { name, description, pdg, compteBancaire, nombreEmployes, logo, taxDistribution, tauxImpot, taxBrackets } = req.body;
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (pdg !== undefined) updateData.pdg = pdg;
    if (compteBancaire !== undefined) updateData.compteBancaire = compteBancaire;
    if (nombreEmployes !== undefined) updateData.nombreEmployes = parseInt(nombreEmployes) || 0;
    if (logo !== undefined) updateData.logo = logo;
    if (taxDistribution !== undefined) updateData.taxDistribution = taxDistribution;
    if (tauxImpot !== undefined) updateData.tauxImpot = parseFloat(tauxImpot) || 25;
    if (taxBrackets !== undefined) updateData.taxBrackets = taxBrackets;
    
    const company = await Company.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('owner', 'username firstName lastName')
      .populate('members.user', 'username firstName lastName')
      .populate('members.role', 'nom description normeSalariale typeContrat permissions');

    if (!company) {
      return res.status(404).json({ message: 'Entreprise non trouvée' });
    }

    res.json({
      success: true,
      company,
      message: 'Entreprise mise à jour avec succès'
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// POST /api/companies/:id/upload-logo - Upload du logo
router.post('/:id/upload-logo', auth, checkModernPermission('MANAGE_COMPANY'), upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier fourni' });
    }

    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: 'Entreprise non trouvée' });
    }

    // Supprimer l'ancien logo s'il existe
    if (company.logo) {
      const oldLogoPath = path.join(__dirname, '../uploads/logos', path.basename(company.logo));
      if (fs.existsSync(oldLogoPath)) {
        fs.unlinkSync(oldLogoPath);
      }
    }

    // Sauvegarder le chemin du nouveau logo
    const logoUrl = `/uploads/logos/${req.file.filename}`;
    company.logo = logoUrl;
    await company.save();

    res.json({
      success: true,
      logoUrl,
      message: 'Logo uploadé avec succès'
    });
  } catch (error) {
    // Supprimer le fichier uploadé en cas d'erreur
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// POST /api/companies/:id/switch - Changer d'entreprise actuelle
router.post('/:id/switch', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    // Vérifier que l'utilisateur fait partie de cette entreprise
    const hasAccess = user.companies.some(
      c => c.company.toString() === req.params.id
    );

    if (!hasAccess && !(user.systemRole === 'Technicien' || user.systemRole === 'SuperAdmin' || user.systemRole === 'IRS')) {
      return res.status(403).json({ message: 'Vous ne faites pas partie de cette entreprise' });
    }

    user.currentCompany = req.params.id;
    await user.save();

    res.json({ message: 'Entreprise changée avec succès', currentCompany: req.params.id });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// ROUTE DEBUG TEMPORAIRE - Nettoyer les membres corrompus des entreprises
router.post('/clean-corrupted-members', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!(user.systemRole === 'Technicien' || user.systemRole === 'SuperAdmin')) {
      return res.status(403).json({ message: 'Accès refusé - Permissions insuffisantes' });
    }

    console.log('🧹 Nettoyage des membres corrompus dans toutes les entreprises');

    const companies = await Company.find()
      .populate('members.user', 'username firstName lastName')
      .populate('members.role', 'nom');

    let totalCleaned = 0;
    const results = [];

    for (const company of companies) {
      const originalMembersCount = company.members.length;
      const validMembers = company.members.filter(member => {
        if (!member.user || !member.user._id) {
          console.log(`❌ Membre corrompu supprimé dans ${company.name}:`, member);
          return false;
        }
        return true;
      });

      if (validMembers.length !== originalMembersCount) {
        const removedCount = originalMembersCount - validMembers.length;
        company.members = validMembers;
        await company.save();
        
        console.log(`✅ ${company.name}: ${removedCount} membres corrompus supprimés`);
        results.push({
          companyName: company.name,
          removedMembers: removedCount,
          validMembers: validMembers.length
        });
        totalCleaned += removedCount;
      }
    }

    res.json({
      success: true,
      message: `Nettoyage terminé - ${totalCleaned} membres corrompus supprimés`,
      results: results
    });

  } catch (error) {
    console.error('❌ Erreur nettoyage membres corrompus:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Route supprimée - dupliquée avec celle du dessus qui a les bonnes vérifications de permissions

// GET /api/companies/:id/employees - Récupérer les employés d'une entreprise
router.get('/:id/employees', auth, async (req, res) => {
  try {
    const companyId = req.params.id;
    
    // Vérifier l'accès à l'entreprise
    const user = await User.findById(req.userId);
    const hasAccess = (user.systemRole === 'Technicien' || user.systemRole === 'SuperAdmin' || user.systemRole === 'IRS') || 
                     user.currentCompany?.toString() === companyId ||
                     (user.companies && user.companies.some(c => c.company.toString() === companyId));

    if (!hasAccess) {
      return res.status(403).json({ message: 'Accès refusé à cette entreprise' });
    }

    // Récupérer tous les utilisateurs qui ont cette entreprise dans leur array companies
    const employees = await User.find({
      'companies.company': companyId,
      $and: [
        { systemRole: { $ne: 'Technicien' } }, // Exclure les techniciens
        { systemRole: { $ne: 'IRS' } } // Exclure les auditeurs IRS
      ]
    })
    .populate({
      path: 'companies.role',
      select: 'nom name typeContrat description permissions'
    })
    .select('username firstName lastName email phoneNumber compteBancaire discordId discordUsername avatar createdAt isActive avances primes companies socialScore');

    // Transformer les données pour correspondre au format attendu
    const formattedEmployees = employees.map(employee => {
      // Trouver le rôle pour cette entreprise spécifique
      const companyData = employee.companies.find(c => c.company.toString() === companyId);
      
      return {
        _id: employee._id,
        username: employee.username,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        phoneNumber: employee.phoneNumber,
        compteBancaire: employee.compteBancaire,
        discordId: employee.discordId,
        discordUsername: employee.discordUsername,
        avatar: employee.avatar, // Inclure la photo de profil
        createdAt: employee.createdAt,
        isActive: employee.isActive,
        avances: employee.avances,
        primes: employee.primes,
        socialScore: employee.socialScore,
        role: companyData?.role ? {
          _id: companyData.role._id,
          nom: companyData.role.nom || companyData.role.name,
          name: companyData.role.name || companyData.role.nom,
          typeContrat: companyData.role.typeContrat,
          description: companyData.role.description,
          permissions: companyData.role.permissions
        } : null
      };
    });

   

    res.json({
      success: true,
      users: formattedEmployees
    });
  } catch (error) {
    console.error('Error in GET /companies/:id/employees:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// GET /api/companies/:id/visible-pages - Récupérer les pages visibles d'une entreprise
router.get('/:id/visible-pages', auth, async (req, res) => {
  try {
    const companyId = req.params.id;
    
    // Vérifier l'accès à l'entreprise
    const user = await User.findById(req.userId);
    const hasAccess = (user.systemRole === 'Technicien' || user.systemRole === 'SuperAdmin' || user.systemRole === 'IRS') || 
                     user.currentCompany?.toString() === companyId ||
                     (user.companies && user.companies.some(c => c.company.toString() === companyId));

    if (!hasAccess) {
      return res.status(403).json({ message: 'Accès refusé à cette entreprise' });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: 'Entreprise non trouvée' });
    }

    res.json({
      success: true,
      visiblePages: company.visiblePages || []
    });
  } catch (error) {
    console.error('Error in GET /companies/:id/visible-pages:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// PUT /api/companies/:id/visible-pages - Mettre à jour les pages visibles (Admin/Technicien uniquement)
router.put('/:id/visible-pages', auth, async (req, res) => {
  try {
    const companyId = req.params.id;
    const { visiblePages } = req.body;
    
    // Vérifier l'accès à l'entreprise
    const user = await User.findById(req.userId)
      .populate({
        path: 'companies.role',
        model: 'Role'
      });

    // Seuls les Techniciens et les utilisateurs avec un rôle de niveau élevé peuvent modifier
    const isTechnician = (user.systemRole === 'Technicien' || user.systemRole === 'SuperAdmin');
    const userCompany = user.companies?.find(c => c.company.toString() === companyId);
    const isAdmin = userCompany?.role?.nom === 'Admin' || userCompany?.role?.name === 'Admin';

    if (!isTechnician && !isAdmin) {
      return res.status(403).json({ 
        message: 'Seuls les administrateurs peuvent modifier les pages visibles' 
      });
    }

    // Valider que visiblePages est un tableau
    if (!Array.isArray(visiblePages)) {
      return res.status(400).json({ message: 'visiblePages doit être un tableau' });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: 'Entreprise non trouvée' });
    }

    company.visiblePages = visiblePages;
    await company.save();

    console.log(`✅ Pages visibles mises à jour pour ${company.name}:`, visiblePages);

    res.json({
      success: true,
      message: 'Pages visibles mises à jour avec succès',
      visiblePages: company.visiblePages
    });
  } catch (error) {
    console.error('Error in PUT /companies/:id/visible-pages:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Note: Les fichiers statiques sont maintenant servis depuis server.js

module.exports = router;
