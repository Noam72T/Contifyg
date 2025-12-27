const express = require('express');
const router = express.Router();
const Partenariat = require('../models/Partenariat');
const auth = require('../middleware/auth');

// Fonction pour générer le numéro de semaine selon ISO 8601
function generateWeekNumber() {
  const now = new Date();
  const year = now.getFullYear();
  
  // Obtenir le 4 janvier de l'année (toujours dans la semaine 1)
  const jan4 = new Date(year, 0, 4);
  
  // Trouver le lundi de la semaine du 4 janvier
  const jan4Day = jan4.getDay() || 7; // Dimanche = 7
  const firstMonday = new Date(jan4.getTime() - (jan4Day - 1) * 24 * 60 * 60 * 1000);
  
  // Calculer la différence en jours
  const diffTime = now.getTime() - firstMonday.getTime();
  const diffDays = Math.floor(diffTime / (24 * 60 * 60 * 1000));
  
  // Calculer le numéro de semaine
  return Math.floor(diffDays / 7) + 1;
};

// GET /api/partenariats - Récupérer tous les partenariats d'une entreprise
router.get('/', auth, async (req, res) => {
  try {
    const { companyId } = req.query;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'ID de l\'entreprise requis'
      });
    }

    const partenariats = await Partenariat.find({ 
      company: companyId 
    }).populate('creePar', 'firstName lastName')
      .populate('categoriesVisibles', 'name');

    // Mettre à jour la semaine actuelle pour tous les partenariats
    const semaineActuelle = generateWeekNumber();
    for (const partenariat of partenariats) {
      if (partenariat.semaineActuelle !== semaineActuelle) {
        partenariat.semaineActuelle = semaineActuelle;
        await partenariat.save();
      }
    }

    res.json({
      success: true,
      partenariats
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des partenariats:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des partenariats'
    });
  }
});

// POST /api/partenariats - Créer un nouveau partenariat
router.post('/', auth, async (req, res) => {
  try {
    const { 
      nom,
      entreprisePartenaire,
      companyId,
      categoriesVisibles,
      webhookDiscord
    } = req.body;

    // Validation des champs requis
    if (!nom || !entreprisePartenaire || !companyId || !categoriesVisibles || !Array.isArray(categoriesVisibles) || categoriesVisibles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nom, entreprise partenaire, ID de l\'entreprise et au moins une catégorie visible sont requis'
      });
    }

    // Validation des catégories (vérifier que les IDs existent)
    const PrestationCategory = require('../models/PrestationCategory');
    const categoriesExistantes = await PrestationCategory.find({
      _id: { $in: categoriesVisibles },
      company: companyId
    });
    
    if (categoriesExistantes.length !== categoriesVisibles.length) {
      return res.status(400).json({
        success: false,
        message: 'Une ou plusieurs catégories sélectionnées n\'existent pas'
      });
    }

    // Validation du webhook Discord si fourni
    if (webhookDiscord && !/^https:\/\/discord(app)?\.com\/api\/webhooks\//.test(webhookDiscord)) {
      return res.status(400).json({
        success: false,
        message: 'Le webhook Discord doit être une URL valide Discord'
      });
    }

    // Créer le nouveau partenariat
    const semaineActuelle = generateWeekNumber();
    const nouveauPartenariat = new Partenariat({
      nom,
      entreprisePartenaire,
      company: companyId,
      statut: 'actif',
      creePar: req.user.id,
      dateCreation: new Date(),
      categoriesVisibles,
      webhookDiscord: webhookDiscord || null,
      semaineActuelle,
      gainsParSemaine: [{
        semaine: semaineActuelle,
        montant: 0,
        dateCreation: new Date()
      }]
    });

    await nouveauPartenariat.save();

    // Populer les données avant de renvoyer
    await nouveauPartenariat.populate('creePar', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Partenariat créé avec succès',
      partenariat: nouveauPartenariat
    });
  } catch (error) {
    console.error('Erreur lors de la création du partenariat:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création du partenariat'
    });
  }
});

// PUT /api/partenariats/:id - Modifier un partenariat
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      nom,
      entreprisePartenaire,
      statut,
      categoriesVisibles,
      webhookDiscord
    } = req.body;

    const partenariat = await Partenariat.findById(id);
    
    if (!partenariat) {
      return res.status(404).json({
        success: false,
        message: 'Partenariat non trouvé'
      });
    }

    // Validation des catégories si fournies
    if (categoriesVisibles) {
      if (!Array.isArray(categoriesVisibles) || categoriesVisibles.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Au moins une catégorie visible est requise'
        });
      }

      const PrestationCategory = require('../models/PrestationCategory');
      const categoriesExistantes = await PrestationCategory.find({
        _id: { $in: categoriesVisibles },
        company: partenariat.company
      });
      
      if (categoriesExistantes.length !== categoriesVisibles.length) {
        return res.status(400).json({
          success: false,
          message: 'Une ou plusieurs catégories sélectionnées n\'existent pas'
        });
      }
    }

    // Validation du webhook Discord si fourni
    if (webhookDiscord && !/^https:\/\/discord(app)?\.com\/api\/webhooks\//.test(webhookDiscord)) {
      return res.status(400).json({
        success: false,
        message: 'Le webhook Discord doit être une URL valide Discord'
      });
    }

    // Mettre à jour les champs
    if (nom) partenariat.nom = nom;
    if (entreprisePartenaire) partenariat.entreprisePartenaire = entreprisePartenaire;
    if (statut) partenariat.statut = statut;
    if (categoriesVisibles) partenariat.categoriesVisibles = categoriesVisibles;
    if (webhookDiscord !== undefined) partenariat.webhookDiscord = webhookDiscord || null;
    
    partenariat.dateModification = new Date();

    await partenariat.save();
    await partenariat.populate('creePar', 'firstName lastName');

    res.json({
      success: true,
      message: 'Partenariat modifié avec succès',
      partenariat
    });
  } catch (error) {
    console.error('Erreur lors de la modification du partenariat:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la modification du partenariat'
    });
  }
});

// DELETE /api/partenariats/:id - Supprimer un partenariat
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const partenariat = await Partenariat.findById(id);
    
    if (!partenariat) {
      return res.status(404).json({
        success: false,
        message: 'Partenariat non trouvé'
      });
    }

    await Partenariat.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Partenariat supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du partenariat:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la suppression du partenariat'
    });
  }
});

// PUT /api/partenariats/:id/status - Changer le statut d'un partenariat
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;

    if (!['actif', 'inactif', 'suspendu'].includes(statut)) {
      return res.status(400).json({
        success: false,
        message: 'Statut invalide. Valeurs acceptées: actif, inactif, suspendu'
      });
    }

    const partenariat = await Partenariat.findById(id);
    
    if (!partenariat) {
      return res.status(404).json({
        success: false,
        message: 'Partenariat non trouvé'
      });
    }

    partenariat.statut = statut;
    partenariat.dateModification = new Date();

    await partenariat.save();
    await partenariat.populate('creePar', 'firstName lastName');
    await partenariat.populate('categoriesVisibles', 'name');

    res.json({
      success: true,
      message: `Partenariat ${statut === 'actif' ? 'activé' : statut === 'inactif' ? 'désactivé' : 'suspendu'} avec succès`,
      partenariat
    });
  } catch (error) {
    console.error('Erreur lors du changement de statut:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors du changement de statut'
    });
  }
});

// POST /api/partenariats/update-weeks - Mettre à jour toutes les semaines actuelles
router.post('/update-weeks', auth, async (req, res) => {
  try {
    const semaineActuelle = generateWeekNumber();
    
    // Mettre à jour tous les partenariats avec la nouvelle semaine
    const result = await Partenariat.updateMany(
      {},
      { 
        $set: { semaineActuelle: semaineActuelle }
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} partenariats mis à jour avec la semaine ${semaineActuelle}`,
      semaineActuelle
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des semaines:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la mise à jour des semaines'
    });
  }
});

// POST /api/partenariats/:id/gains - Ajouter des gains pour la semaine actuelle
router.post('/:id/gains', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { montant } = req.body;

    if (!montant || montant <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Montant invalide'
      });
    }

    const partenariat = await Partenariat.findById(id);
    
    if (!partenariat) {
      return res.status(404).json({
        success: false,
        message: 'Partenariat non trouvé'
      });
    }

    const semaineActuelle = generateWeekNumber();
    
    // Vérifier si la semaine a changé
    if (partenariat.semaineActuelle !== semaineActuelle) {
      // Nouvelle semaine, créer une nouvelle entrée
      partenariat.gainsParSemaine.push({
        semaine: semaineActuelle,
        montant: montant,
        dateCreation: new Date()
      });
      partenariat.semaineActuelle = semaineActuelle;
    } else {
      // Même semaine, ajouter au montant existant
      const gainSemaineActuelle = partenariat.gainsParSemaine.find(g => g.semaine === semaineActuelle);
      if (gainSemaineActuelle) {
        gainSemaineActuelle.montant += montant;
      } else {
        partenariat.gainsParSemaine.push({
          semaine: semaineActuelle,
          montant: montant,
          dateCreation: new Date()
        });
      }
    }

    await partenariat.save();

    res.json({
      success: true,
      message: 'Gains ajoutés avec succès',
      partenariat
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout des gains:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'ajout des gains'
    });
  }
});

// POST /api/partenariats/:id/recalculate-gains - Recalculer les gains d'un partenariat pour une semaine
router.post('/:id/recalculate-gains', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { weekNumber, year } = req.body;

    const partenariat = await Partenariat.findById(id);
    
    if (!partenariat) {
      return res.status(404).json({
        success: false,
        message: 'Partenariat non trouvé'
      });
    }

    // Utiliser la semaine courante si pas spécifiée
    const targetWeek = weekNumber || generateWeekNumber();
    const targetYear = year || new Date().getFullYear();

    // Importer et utiliser la fonction de recalcul
    const { recalculatePartenaritGains } = require('../utils/partenaritGainsCalculator');
    const success = await recalculatePartenaritGains(id, targetWeek, targetYear);

    if (success) {
      // Récupérer le partenariat mis à jour
      const updatedPartenariat = await Partenariat.findById(id)
        .populate('creePar', 'firstName lastName')
        .populate('categoriesVisibles', 'name');

      res.json({
        success: true,
        message: `Gains recalculés avec succès pour la semaine ${targetWeek}/${targetYear}`,
        partenariat: updatedPartenariat
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Erreur lors du recalcul des gains'
      });
    }
  } catch (error) {
    console.error('Erreur lors du recalcul des gains:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors du recalcul des gains'
    });
  }
});

// POST /api/partenariats/recalculate-all - Recalculer tous les gains de la semaine courante
router.post('/recalculate-all', auth, async (req, res) => {
  try {
    const { companyId, weekNumber, year } = req.body;

    // Importer les fonctions de recalcul
    const { recalculateAllCurrentWeekGains, recalculateCompanyWeekGains } = require('../utils/partenaritGainsCalculator');
    
    let result;
    
    if (weekNumber && year && companyId) {
      // Recalculer pour une entreprise et une semaine spécifique
      result = await recalculateCompanyWeekGains(companyId, weekNumber, year);
    } else if (companyId) {
      // Recalculer pour une entreprise, semaine courante
      result = await recalculateAllCurrentWeekGains(companyId);
    } else {
      // Recalculer pour toutes les entreprises, semaine courante
      result = await recalculateAllCurrentWeekGains();
    }

    if (result.error) {
      return res.status(500).json({
        success: false,
        message: 'Erreur lors du recalcul automatique',
        error: result.error
      });
    }

    res.json({
      success: true,
      message: `Recalcul automatique terminé: ${result.successCount} succès, ${result.errorCount} erreurs sur ${result.total} partenariats`,
      stats: result
    });
  } catch (error) {
    console.error('Erreur lors du recalcul automatique:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors du recalcul automatique'
    });
  }
});

module.exports = router;