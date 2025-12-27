/**
 * Routes spécifiques pour la gestion des salaires hebdomadaires des SuperAdmin
 * Les SuperAdmin ont un système de reset hebdomadaire contrairement aux utilisateurs normaux (mensuel)
 */

const express = require('express');
const router = express.Router();
const Salaire = require('../models/Salaire');
const Employe = require('../models/Employe');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Fonction pour obtenir le numéro de semaine
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Middleware pour vérifier l'authentification
router.use(auth);

// POST - Créer ou mettre à jour le salaire hebdomadaire d'un SuperAdmin
router.post('/weekly/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { companyId, montant, week, year } = req.body;

    console.log('💼 Création/MAJ salaire hebdomadaire SuperAdmin:', { userId, companyId, montant, week, year });

    // Vérifier que l'utilisateur est bien un SuperAdmin
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    if (user.systemRole !== 'SuperAdmin') {
      return res.status(403).json({ message: 'Cette route est réservée aux SuperAdmin uniquement' });
    }

    // Récupérer ou créer l'employé
    let employe = await Employe.findOne({ utilisateur: userId, company: companyId });
    if (!employe) {
      return res.status(404).json({ message: 'Employé non trouvé pour cette entreprise' });
    }

    // Calculer la période
    const currentDate = new Date();
    const currentWeek = week || getWeekNumber(currentDate);
    const currentYear = year || currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    console.log('📅 Période:', { semaine: currentWeek, mois: currentMonth, annee: currentYear });

    // Chercher un salaire existant pour cette semaine spécifique
    let salaire = await Salaire.findOne({
      employe: employe._id,
      company: companyId,
      'periode.semaine': currentWeek,
      'periode.annee': currentYear
    });

    if (!salaire) {
      // Créer un nouveau salaire hebdomadaire
      salaire = new Salaire({
        employe: employe._id,
        company: companyId,
        periode: {
          mois: currentMonth,
          annee: currentYear,
          semaine: currentWeek // IMPORTANT : Champ semaine pour les SuperAdmin
        },
        salaireBrut: montant,
        salaireNet: montant,
        primes: 0,
        statut: 'calcule',
        createdBy: req.user.id,
        cotisationsSociales: {
          securiteSociale: 0,
          retraite: 0,
          chomage: 0,
          mutuelle: 0,
          total: 0
        }
      });
      console.log('✅ Nouveau salaire hebdomadaire créé');
    } else {
      // Mettre à jour le salaire existant
      salaire.salaireBrut = montant;
      salaire.salaireNet = montant;
      console.log('✅ Salaire hebdomadaire mis à jour');
    }

    await salaire.save();

    const populatedSalaire = await Salaire.findById(salaire._id)
      .populate({
        path: 'employe',
        populate: {
          path: 'utilisateur',
          select: 'firstName lastName username systemRole'
        }
      })
      .populate('company', 'name');

    res.json({
      success: true,
      message: `Salaire hebdomadaire ${salaire.isNew ? 'créé' : 'mis à jour'} pour la semaine ${currentWeek}/${currentYear}`,
      salaire: populatedSalaire
    });
  } catch (error) {
    console.error('❌ Erreur lors de la création/MAJ du salaire hebdomadaire:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// GET - Récupérer le salaire hebdomadaire d'un SuperAdmin
router.get('/weekly/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { companyId, week, year } = req.query;

    // Vérifier que l'utilisateur est bien un SuperAdmin
    const user = await User.findById(userId);
    if (!user || user.systemRole !== 'SuperAdmin') {
      return res.status(403).json({ message: 'Accès réservé aux SuperAdmin' });
    }

    const currentDate = new Date();
    const currentWeek = week ? parseInt(week) : getWeekNumber(currentDate);
    const currentYear = year ? parseInt(year) : currentDate.getFullYear();

    const employe = await Employe.findOne({ utilisateur: userId, company: companyId });
    if (!employe) {
      return res.status(404).json({ message: 'Employé non trouvé' });
    }

    const salaire = await Salaire.findOne({
      employe: employe._id,
      company: companyId,
      'periode.semaine': currentWeek,
      'periode.annee': currentYear
    })
      .populate({
        path: 'employe',
        populate: {
          path: 'utilisateur',
          select: 'firstName lastName username systemRole'
        }
      })
      .populate('company', 'name');

    if (!salaire) {
      return res.json({
        success: true,
        message: 'Aucun salaire pour cette semaine',
        salaire: null,
        montant: 0
      });
    }

    res.json({
      success: true,
      salaire,
      montant: salaire.salaireBrut || 0
    });
  } catch (error) {
    console.error('❌ Erreur lors de la récupération du salaire hebdomadaire:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// DELETE - Supprimer le salaire hebdomadaire d'un SuperAdmin (reset)
router.delete('/weekly/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { companyId, week, year } = req.query;

    const user = await User.findById(userId);
    if (!user || user.systemRole !== 'SuperAdmin') {
      return res.status(403).json({ message: 'Accès réservé aux SuperAdmin' });
    }

    const currentDate = new Date();
    const currentWeek = week ? parseInt(week) : getWeekNumber(currentDate);
    const currentYear = year ? parseInt(year) : currentDate.getFullYear();

    const employe = await Employe.findOne({ utilisateur: userId, company: companyId });
    if (!employe) {
      return res.status(404).json({ message: 'Employé non trouvé' });
    }

    const result = await Salaire.deleteOne({
      employe: employe._id,
      company: companyId,
      'periode.semaine': currentWeek,
      'periode.annee': currentYear
    });

    res.json({
      success: true,
      message: `Salaire hebdomadaire supprimé pour la semaine ${currentWeek}/${currentYear}`,
      deleted: result.deletedCount
    });
  } catch (error) {
    console.error('❌ Erreur lors de la suppression du salaire hebdomadaire:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

module.exports = router;
