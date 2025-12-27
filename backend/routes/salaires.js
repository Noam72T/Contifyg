const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Salaire = require('../models/Salaire');
const Employe = require('../models/Employe');
const auth = require('../middleware/auth');

// Fonction utilitaire pour ajouter le rôle d'affichage
function addDisplayRole(salaire, companyId = null) {
  const salaireObj = salaire.toObject ? salaire.toObject() : salaire;
  
  if (salaireObj.employe && salaireObj.employe.utilisateur) {
    const employe = salaireObj.employe;
    const user = employe.utilisateur;
    
    // Logique pour déterminer le rôle à afficher
    let displayRole = null;
    
    // 1. PRIORITÉ au rôle par entreprise (le plus à jour)
    if (user.companies && user.companies.length > 0) {
      const targetCompanyId = companyId || salaireObj.company;
      const companyRole = user.companies.find(c => 
        c.company && c.company.toString() === targetCompanyId.toString() && c.role
      )?.role;
      if (companyRole) {
        displayRole = companyRole;
      }
    }
    // 2. Sinon rôle employé synchronisé
    if (!displayRole && employe.role) {
      displayRole = employe.role;
    }
    // 3. Sinon rôle global
    if (!displayRole && user.role) {
      displayRole = user.role;
    }
    
    // Ajouter le rôle calculé à l'objet employé
    salaireObj.employe.displayRole = displayRole;
  }
  
  return salaireObj;
}

// Middleware pour vérifier l'authentification sur toutes les routes
router.use(auth);

// GET - Récupérer tous les salaires d'une entreprise
router.get('/', async (req, res) => {
  try {
    const { companyId, employe, annee, mois, semaine, statut, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    if (companyId) filter.company = companyId;
    if (employe) filter.employe = employe;
    if (annee) filter['periode.annee'] = parseInt(annee);
    if (mois) filter['periode.mois'] = parseInt(mois);
    if (semaine) filter['periode.semaine'] = parseInt(semaine); // Support pour filtrage par semaine (SuperAdmin)
    if (statut) filter.statut = statut;

    const salaires = await Salaire.find(filter)
      .populate({
        path: 'employe',
        populate: [
          {
            path: 'utilisateur',
            select: 'firstName lastName username companies role',
            populate: [
              {
                path: 'companies.role',
                select: 'name level'
              },
              {
                path: 'role',
                select: 'name level'
              }
            ]
          },
          {
            path: 'role',
            select: 'name level'
          }
        ]
      })
      .populate('createdBy', 'firstName lastName username')
      .sort({ 'periode.annee': -1, 'periode.mois': -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Ajouter la logique pour déterminer le rôle à afficher
    const salairesWithDisplayRole = salaires.map(salaire => addDisplayRole(salaire, companyId));

    const total = await Salaire.countDocuments(filter);

    res.json({
      salaires: salairesWithDisplayRole,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des salaires:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// GET - Récupérer un salaire par ID
router.get('/:id', async (req, res) => {
  try {
    const salaire = await Salaire.findById(req.params.id)
      .populate({
        path: 'employe',
        populate: [
          {
            path: 'utilisateur',
            select: 'firstName lastName username email companies role',
            populate: [
              {
                path: 'companies.role',
                select: 'name level'
              },
              {
                path: 'role',
                select: 'name level'
              }
            ]
          },
          {
            path: 'role',
            select: 'name level'
          }
        ]
      })
      .populate('company', 'name')
      .populate('createdBy', 'firstName lastName username');

    if (!salaire) {
      return res.status(404).json({ message: 'Salaire non trouvé' });
    }

    // Ajouter le rôle d'affichage
    const salaireWithDisplayRole = addDisplayRole(salaire);

    res.json(salaireWithDisplayRole);
  } catch (error) {
    console.error('Erreur lors de la récupération du salaire:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// GET - Statistiques des salaires
router.get('/stats/overview', async (req, res) => {
  try {
    const { companyId, annee } = req.query;
    
    if (!companyId) {
      return res.status(400).json({ message: 'ID de l\'entreprise requis' });
    }

    const filter = { company: mongoose.Types.ObjectId(companyId) };
    if (annee) filter['periode.annee'] = parseInt(annee);

    const masseSalariale = await Salaire.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalBrut: { $sum: '$salaireBrut' },
          totalNet: { $sum: '$salaireNet' },
          totalCotisations: { $sum: '$cotisationsSociales.total' }
        }
      }
    ]);

    const parMois = await Salaire.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            mois: '$periode.mois',
            annee: '$periode.annee'
          },
          totalBrut: { $sum: '$salaireBrut' },
          totalNet: { $sum: '$salaireNet' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.annee': -1, '_id.mois': -1 } }
    ]);

    res.json({
      masseSalariale: masseSalariale[0] || { totalBrut: 0, totalNet: 0, totalCotisations: 0 },
      parMois
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// POST - Créer un nouveau salaire
router.post('/', async (req, res) => {
  try {
    const salaireData = {
      ...req.body,
      createdBy: req.user.id
    };

    console.log('💼 Création salaire:', salaireData);

    // Vérifier que le companyId est fourni
    if (!salaireData.company) {
      return res.status(400).json({ message: 'ID d\'entreprise requis' });
    }

    // Vérifier que l'employé existe
    const employe = await Employe.findById(salaireData.employe);
    if (!employe) {
      return res.status(404).json({ message: 'Employé non trouvé' });
    }

    // Vérifier que l'employé appartient à cette entreprise
    if (employe.company.toString() !== salaireData.company.toString()) {
      return res.status(400).json({ message: 'L\'employé n\'appartient pas à cette entreprise' });
    }

    // Calculer automatiquement les cotisations si pas fournies
    if (!salaireData.cotisationsSociales || !salaireData.cotisationsSociales.total) {
      const salaireBrut = salaireData.salaireBrut;
      const cotisations = {
        securiteSociale: salaireBrut * 0.077, // 7.7%
        retraite: salaireBrut * 0.1075, // 10.75%
        chomage: salaireBrut * 0.024, // 2.4%
        mutuelle: salaireData.cotisationsSociales?.mutuelle || 0
      };
      cotisations.total = cotisations.securiteSociale + cotisations.retraite + cotisations.chomage + cotisations.mutuelle;
      salaireData.cotisationsSociales = cotisations;
    }

    // Calculer le salaire net si pas fourni
    if (!salaireData.salaireNet) {
      salaireData.salaireNet = salaireData.salaireBrut - 
        salaireData.cotisationsSociales.total - 
        (salaireData.impots || 0);
    }

    const salaire = new Salaire(salaireData);
    await salaire.save();

    const populatedSalaire = await Salaire.findById(salaire._id)
      .populate({
        path: 'employe',
        populate: [
          {
            path: 'utilisateur',
            select: 'firstName lastName username companies role',
            populate: [
              {
                path: 'companies.role',
                select: 'name level'
              },
              {
                path: 'role',
                select: 'name level'
              }
            ]
          },
          {
            path: 'role',
            select: 'name level'
          }
        ]
      })
      .populate('company', 'name')
      .populate('createdBy', 'firstName lastName username');

    // Ajouter le rôle d'affichage
    const salaireWithDisplayRole = addDisplayRole(populatedSalaire);

    res.status(201).json(salaireWithDisplayRole);
  } catch (error) {
    console.error('Erreur lors de la création du salaire:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// PUT - Mettre à jour un salaire
router.put('/:id', async (req, res) => {
  try {
    const salaireData = req.body;

    // Recalculer les cotisations et le net si nécessaire
    if (salaireData.salaireBrut && (!salaireData.cotisationsSociales || !salaireData.cotisationsSociales.total)) {
      const salaireBrut = salaireData.salaireBrut;
      const cotisations = {
        securiteSociale: salaireBrut * 0.077,
        retraite: salaireBrut * 0.1075,
        chomage: salaireBrut * 0.024,
        mutuelle: salaireData.cotisationsSociales?.mutuelle || 0
      };
      cotisations.total = cotisations.securiteSociale + cotisations.retraite + cotisations.chomage + cotisations.mutuelle;
      salaireData.cotisationsSociales = cotisations;
    }

    if (salaireData.salaireBrut && !salaireData.salaireNet) {
      salaireData.salaireNet = salaireData.salaireBrut - 
        salaireData.cotisationsSociales.total - 
        (salaireData.impots || 0);
    }

    const salaire = await Salaire.findByIdAndUpdate(
      req.params.id,
      salaireData,
      { new: true, runValidators: true }
    ).populate({
      path: 'employe',
      populate: [
        {
          path: 'utilisateur',
          select: 'firstName lastName username companies role',
          populate: [
            {
              path: 'companies.role',
              select: 'name level'
            },
            {
              path: 'role',
              select: 'name level'
            }
          ]
        },
        {
          path: 'role',
          select: 'name level'
        }
      ]
    })
    .populate('company', 'name')
    .populate('createdBy', 'firstName lastName username');

    if (!salaire) {
      return res.status(404).json({ message: 'Salaire non trouvé' });
    }

    res.json(salaire);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du salaire:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// PUT - Ajouter une avance à un employé
router.put('/avance/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { montant, description } = req.body;

    if (!montant || montant <= 0) {
      return res.status(400).json({ message: 'Montant d\'avance invalide' });
    }

    // Trouver l'utilisateur et mettre à jour ses avances
    const User = require('../models/User');
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Initialiser les avances si elles n'existent pas
    if (!user.avances) {
      user.avances = 0;
    }

    user.avances += montant;
    await user.save();

    // Log de l'avance
    

    res.json({
      success: true,
      message: `Avance de ${montant}€ ajoutée avec succès`,
      user: {
        _id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avances: user.avances
      }
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout d\'avance:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// PUT - Ajouter une prime à un employé (COMPATIBLE ANCIEN/NOUVEAU SYSTÈME)
router.put('/prime/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { montant, description, companyId } = req.body;

    console.log('💰 Ajout prime:', { userId, montant, companyId, description });

    if (!montant || montant <= 0) {
      return res.status(400).json({ message: 'Montant de prime invalide' });
    }

    // NOUVEAU SYSTÈME OBLIGATOIRE - companyId requis
    if (!companyId) {
      return res.status(400).json({ 
        message: 'ID d\'entreprise requis pour isoler les primes par entreprise' 
      });
    }

    // Trouver l'employé pour cette entreprise
    let employe = await Employe.findOne({
      utilisateur: userId,
      company: companyId
    });

    if (!employe) {
      console.log('❌ Employé non trouvé, création automatique...');
      
      // Vérifier que l'utilisateur existe
      const User = require('../models/User');
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }

      // Créer automatiquement l'entrée Employe avec tous les champs requis
      employe = new Employe({
        utilisateur: userId,
        company: companyId,
        poste: 'Employé',
        salaire: 0,
        typeContrat: 'cdi',
        dateEmbauche: new Date(),
        statut: 'actif',
        createdBy: req.user.id
      });
      
      await employe.save();
      console.log('✅ Employé créé automatiquement:', employe._id);
    }

    // Créer ou mettre à jour l'entrée de salaire pour le mois courant
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    let salaire = await Salaire.findOne({
      employe: employe._id,
      company: companyId,
      'periode.mois': currentMonth,
      'periode.annee': currentYear
    });

    if (!salaire) {
      // Créer une nouvelle entrée de salaire
      salaire = new Salaire({
        employe: employe._id,
        company: companyId,
        periode: {
          mois: currentMonth,
          annee: currentYear
        },
        salaireBrut: 0,
        salaireNet: montant,
        primes: montant,
        statut: 'calcule',
        createdBy: req.user.id
      });
    } else {
      // Ajouter la prime à l'entrée existante
      salaire.primes = (salaire.primes || 0) + montant;
      salaire.salaireNet = (salaire.salaireBrut || 0) + salaire.primes;
    }

    await salaire.save();

    console.log('✅ Prime ajoutée au salaire:', {
      salaireId: salaire._id,
      primesTotal: salaire.primes,
      entreprise: companyId
    });

    // Récupérer les données complètes
    const populatedSalaire = await Salaire.findById(salaire._id)
      .populate({
        path: 'employe',
        populate: [
          {
            path: 'utilisateur',
            select: 'firstName lastName username companies role',
            populate: [
              {
                path: 'companies.role',
                select: 'name level'
              },
              {
                path: 'role',
                select: 'name level'
              }
            ]
          },
          {
            path: 'role',
            select: 'name level'
          }
        ]
      })
      .populate('company', 'name');

    // Ajouter le rôle d'affichage
    const salaireWithDisplayRole = addDisplayRole(populatedSalaire, companyId);

    res.json({
      success: true,
      message: `Prime de ${montant}€ ajoutée avec succès pour ${salaireWithDisplayRole.company.name}`,
      salaire: salaireWithDisplayRole,
      user: {
        _id: userId,
        username: populatedSalaire.employe.utilisateur.username,
        firstName: populatedSalaire.employe.utilisateur.firstName,
        lastName: populatedSalaire.employe.utilisateur.lastName,
        primes: salaire.primes
      }
    });
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout de prime:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// PUT - Modifier les primes d'un employé (COMPATIBLE ANCIEN/NOUVEAU SYSTÈME)
router.put('/prime/edit/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { montant, companyId } = req.body;

    console.log('✏️ Modification prime:', { userId, montant, companyId });

    if (montant < 0) {
      return res.status(400).json({ message: 'Le montant des primes ne peut pas être négatif' });
    }

    // NOUVEAU SYSTÈME OBLIGATOIRE - companyId requis
    if (!companyId) {
      return res.status(400).json({ 
        message: 'ID d\'entreprise requis pour isoler les primes par entreprise' 
      });
    }

    // Trouver l'employé pour cette entreprise
    let employe = await Employe.findOne({
      utilisateur: userId,
      company: companyId
    });

    if (!employe) {
      console.log('❌ Employé non trouvé, création automatique...');
      
      // Vérifier que l'utilisateur existe
      const User = require('../models/User');
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }

      // Créer automatiquement l'entrée Employe avec tous les champs requis
      employe = new Employe({
        utilisateur: userId,
        company: companyId,
        poste: 'Employé',
        salaire: 0,
        typeContrat: 'cdi',
        dateEmbauche: new Date(),
        statut: 'actif',
        createdBy: req.user.id
      });
      
      await employe.save();
      console.log('✅ Employé créé automatiquement:', employe._id);
    }

    // Trouver ou créer l'entrée de salaire pour le mois courant
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    let salaire = await Salaire.findOne({
      employe: employe._id,
      company: companyId,
      'periode.mois': currentMonth,
      'periode.annee': currentYear
    });

    if (!salaire) {
      // Créer une nouvelle entrée de salaire
      salaire = new Salaire({
        employe: employe._id,
        company: companyId,
        periode: {
          mois: currentMonth,
          annee: currentYear
        },
        salaireBrut: 0,
        salaireNet: montant,
        primes: montant,
        statut: 'calcule',
        createdBy: req.user.id
      });
    } else {
      // Modifier les primes de l'entrée existante
      const ancienMontant = salaire.primes || 0;
      salaire.primes = montant;
      salaire.salaireNet = (salaire.salaireBrut || 0) + salaire.primes;
      
      console.log('📝 Prime modifiée:', { ancien: ancienMontant, nouveau: montant });
    }

    await salaire.save();

    // IMPORTANT: Mettre à jour aussi le champ primes dans le modèle User
    const User = require('../models/User');
    await User.findByIdAndUpdate(userId, {
      primes: montant
    });
    console.log('✅ Primes mises à jour dans User:', { userId, montant });

    // Récupérer les données complètes
    const populatedSalaire = await Salaire.findById(salaire._id)
      .populate({
        path: 'employe',
        populate: [
          {
            path: 'utilisateur',
            select: 'firstName lastName username companies role',
            populate: [
              {
                path: 'companies.role',
                select: 'name level'
              },
              {
                path: 'role',
                select: 'name level'
              }
            ]
          },
          {
            path: 'role',
            select: 'name level'
          }
        ]
      })
      .populate('company', 'name');

    // Ajouter le rôle d'affichage
    const salaireWithDisplayRole = addDisplayRole(populatedSalaire, companyId);

    res.json({
      success: true,
      message: `Primes modifiées avec succès pour ${salaireWithDisplayRole.company.name}`,
      salaire: salaireWithDisplayRole,
      user: {
        _id: userId,
        username: populatedSalaire.employe.utilisateur.username,
        firstName: populatedSalaire.employe.utilisateur.firstName,
        lastName: populatedSalaire.employe.utilisateur.lastName,
        primes: salaire.primes
      }
    });
  } catch (error) {
    console.error('❌ Erreur lors de la modification des primes:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// PUT - Modifier les avances d'un employé
router.put('/avance/edit/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { montant } = req.body;

    if (montant < 0) {
      return res.status(400).json({ message: 'Le montant des avances ne peut pas être négatif' });
    }

    const User = require('../models/User');
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const ancienMontant = user.avances || 0;
    user.avances = montant;
    await user.save();

    

    res.json({
      success: true,
      message: `Avances modifiées avec succès`,
      user: {
        _id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avances: user.avances
      }
    });
  } catch (error) {
    console.error('Erreur lors de la modification des avances:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// PUT - Modifier le salaire d'un employé
router.put('/edit/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { salaire, companyId } = req.body;

    

    if (salaire < 0) {
      return res.status(400).json({ message: 'Le montant du salaire ne peut pas être négatif' });
    }

    if (!companyId) {
      return res.status(400).json({ 
        message: 'ID d\'entreprise requis pour modifier le salaire' 
      });
    }

    // Trouver l'employé pour cette entreprise
    let employe = await Employe.findOne({
      utilisateur: userId,
      company: companyId
    });

    if (!employe) {
      console.log('❌ Employé non trouvé');
      return res.status(404).json({ message: 'Employé non trouvé dans cette entreprise' });
    }

    // Mettre à jour le salaire de l'employé
    const ancienSalaire = employe.salaire || 0;
    employe.salaire = salaire;
    await employe.save();

    

    // Récupérer les données complètes
    const populatedEmploye = await Employe.findById(employe._id)
      .populate({
        path: 'utilisateur',
        select: 'firstName lastName username companies role',
        populate: [
          {
            path: 'companies.role',
            select: 'name level'
          },
          {
            path: 'role',
            select: 'name level'
          }
        ]
      })
      .populate('company', 'name')
      .populate('role', 'name level');

    res.json({
      success: true,
      message: `Salaire modifié avec succès pour ${populatedEmploye.company.name}`,
      employe: populatedEmploye,
      user: {
        _id: userId,
        username: populatedEmploye.utilisateur.username,
        firstName: populatedEmploye.utilisateur.firstName,
        lastName: populatedEmploye.utilisateur.lastName,
        salaire: employe.salaire
      }
    });
  } catch (error) {
    console.error('❌ Erreur lors de la modification du salaire:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// DELETE - Supprimer toutes les primes d'un employé (COMPATIBLE ANCIEN/NOUVEAU SYSTÈME)
router.delete('/prime/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { companyId } = req.body;

    console.log('🗑️ Suppression primes:', { userId, companyId });

    // NOUVEAU SYSTÈME OBLIGATOIRE - companyId requis
    if (!companyId) {
      return res.status(400).json({ 
        message: 'ID d\'entreprise requis pour isoler les primes par entreprise' 
      });
    }

    // Trouver l'employé pour cette entreprise
    let employe = await Employe.findOne({
      utilisateur: userId,
      company: companyId
    });

    if (!employe) {
      console.log('❌ Employé non trouvé, création automatique...');
      
      // Vérifier que l'utilisateur existe
      const User = require('../models/User');
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }

      // Créer automatiquement l'entrée Employe avec tous les champs requis
      employe = new Employe({
        utilisateur: userId,
        company: companyId,
        poste: 'Employé',
        salaire: 0,
        typeContrat: 'cdi',
        dateEmbauche: new Date(),
        statut: 'actif',
        createdBy: req.user.id
      });
      
      await employe.save();
      console.log('✅ Employé créé automatiquement:', employe._id);
    }

    // Trouver l'entrée de salaire pour le mois courant
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    const salaire = await Salaire.findOne({
      employe: employe._id,
      company: companyId,
      'periode.mois': currentMonth,
      'periode.annee': currentYear
    });

    if (salaire) {
      const ancienMontant = salaire.primes || 0;
      salaire.primes = 0;
      salaire.salaireNet = (salaire.salaireBrut || 0) + salaire.primes;
      await salaire.save();

      console.log('✅ Primes supprimées:', { ancien: ancienMontant, nouveau: 0 });

      // Récupérer les données complètes
      const populatedSalaire = await Salaire.findById(salaire._id)
        .populate({
          path: 'employe',
          populate: [
            {
              path: 'utilisateur',
              select: 'firstName lastName username companies role',
              populate: [
                {
                  path: 'companies.role',
                  select: 'name level'
                },
                {
                  path: 'role',
                  select: 'name level'
                }
              ]
            },
            {
              path: 'role',
              select: 'name level'
            }
          ]
        })
        .populate('company', 'name');

      // Ajouter le rôle d'affichage
      const salaireWithDisplayRole = addDisplayRole(populatedSalaire, companyId);

      res.json({
        success: true,
        message: `Primes supprimées avec succès pour ${salaireWithDisplayRole.company.name}`,
        salaire: salaireWithDisplayRole,
        user: {
          _id: userId,
          username: populatedSalaire.employe.utilisateur.username,
          firstName: populatedSalaire.employe.utilisateur.firstName,
          lastName: populatedSalaire.employe.utilisateur.lastName,
          primes: 0
        }
      });
    } else {
      res.json({
        success: true,
        message: 'Aucune prime à supprimer pour cette période',
        user: {
          _id: userId,
          primes: 0
        }
      });
    }
  } catch (error) {
    console.error('❌ Erreur lors de la suppression des primes:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// GET - Récupérer les primes d'un employé pour une entreprise spécifique
router.get('/prime/:userId/:companyId', async (req, res) => {
  try {
    const { userId, companyId } = req.params;
    
    console.log('🔍 Récupération primes pour:', { userId, companyId });
    
    // Trouver l'employé pour cette entreprise
    const employe = await Employe.findOne({
      utilisateur: userId,
      company: companyId
    });

    if (!employe) {
      console.log('❌ Employé non trouvé dans cette entreprise');
      return res.json({
        success: true,
        primes: 0,
        message: 'Employé non trouvé dans cette entreprise'
      });
    }

    // Trouver l'entrée de salaire pour le mois courant
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    const salaire = await Salaire.findOne({
      employe: employe._id,
      company: companyId,
      'periode.mois': currentMonth,
      'periode.annee': currentYear
    });

    const primes = salaire ? (salaire.primes || 0) : 0;
    
    console.log('✅ Primes trouvées:', primes);

    res.json({
      success: true,
      primes: primes,
      employe: employe._id,
      company: companyId
    });

  } catch (error) {
    console.error('❌ Erreur récupération primes:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur', 
      error: error.message 
    });
  }
});

// DELETE - Supprimer toutes les avances d'un employé
router.delete('/avance/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const User = require('../models/User');
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const ancienMontant = user.avances || 0;
    user.avances = 0;
    await user.save();

 

    res.json({
      success: true,
      message: `Avances supprimées avec succès`,
      user: {
        _id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avances: user.avances
      }
    });
  } catch (error) {
    console.error('Erreur lors de la suppression des avances:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// DELETE - Supprimer un salaire
router.delete('/:id', async (req, res) => {
  try {
    const salaire = await Salaire.findByIdAndDelete(req.params.id);

    if (!salaire) {
      return res.status(404).json({ message: 'Salaire non trouvé' });
    }

    res.json({ message: 'Salaire supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du salaire:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

module.exports = router;
