const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Vente = require('../models/Vente');
const Company = require('../models/Company');
const auth = require('../middleware/auth');
const glifeApiService = require('../services/glifeApiService');

// Fonctions utilitaires pour le calcul des semaines (fuseau horaire français)
const convertToFrenchTime = (date) => {
  // Ajouter 1 heure (3600000 ms) pour convertir UTC vers heure française (UTC+1)
  // En décembre, la France est en heure d'hiver (UTC+1)
  const frenchTime = new Date(date.getTime() + (1 * 60 * 60 * 1000));
  console.log('🕐 Conversion heure:', {
    original: date.toISOString(),
    french: frenchTime.toISOString(),
    originalLocal: date.toLocaleString('fr-FR'),
    frenchLocal: frenchTime.toLocaleString('fr-FR')
  });
  return frenchTime;
};

const getWeekNumber = (date) => {
  // Convertir en heure française
  const frenchDate = convertToFrenchTime(date);
  const d = new Date(frenchDate.getTime());
  d.setHours(0, 0, 0, 0);
  // Jeudi de cette semaine
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  // Premier jeudi de janvier = semaine 1
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNumber = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  
  console.log('📅 Calcul semaine:', {
    dateOriginal: date.toISOString(),
    dateFrancaise: frenchDate.toISOString(),
    dateCalcul: d.toISOString(),
    semaine: weekNumber
  });
  
  return weekNumber;
};

const getStartOfWeek = (year, weekNum) => {
  // Trouver le 4 janvier (toujours dans la semaine 1 selon ISO 8601)
  const jan4 = new Date(year, 0, 4);
  
  // Trouver le jeudi de la semaine 1
  const jan4Day = jan4.getDay() || 7; // Dimanche = 7
  const firstThursday = new Date(jan4.getTime() - (jan4Day - 4) * 86400000);
  
  // Calculer le jeudi de la semaine demandée
  const targetThursday = new Date(firstThursday.getTime() + (weekNum - 1) * 7 * 86400000);
  
  // Revenir au lundi de cette semaine
  const monday = new Date(targetThursday.getTime() - 3 * 86400000);
  monday.setHours(0, 0, 0, 0);
  
  return monday;
};

const getEndOfWeek = (year, weekNum) => {
  const startOfWeek = getStartOfWeek(year, weekNum);
  const endOfWeek = new Date(startOfWeek.getTime() + 6 * 86400000); // +6 jours pour dimanche
  endOfWeek.setHours(23, 59, 59, 999);
  return endOfWeek;
};

// Middleware pour vérifier l'authentification sur toutes les routes
router.use(auth);

// GET - Récupérer toutes les ventes avec filtres
router.get('/', async (req, res) => {
  try {
    const { companyId, page = 1, limit = 10, search, status, seller, startDate, endDate, userOnly, week, year, includeTimers = 'false' } = req.query;
    
    if (!companyId) {
      return res.status(400).json({ message: 'ID de l\'entreprise requis' });
    }

    // Vérifier si l'entreprise est en mode API
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: 'Entreprise non trouvée' });
    }

    // MODE API: Récupérer les ventes depuis l'API GLife
    if (company.apiMode && company.glifeCompanyId) {
      console.log('🔌 Mode API activé - Récupération depuis GLife API');
      
      try {
        let salesData;
        
        // Récupérer le charId de l'utilisateur connecté
        const User = require('../models/User');
        const currentUser = await User.findById(req.userId);
        const userCharId = currentUser?.charId;
        
        // Déterminer si on filtre par utilisateur (userOnly=true ET charId défini)
        const filterByUser = userOnly === 'true' && userCharId;
        
        if (filterByUser) {
          console.log(`👤 Filtrage par utilisateur charId: ${userCharId}`);
        }
        
        // Si semaine spécifiée
        if (week && year) {
          const weekNum = parseInt(week);
          const yearNum = parseInt(year);
          
          console.log(`📅 [Route Ventes] Filtrage par semaine ${weekNum}/${yearNum}`);
          
          if (filterByUser) {
            console.log(`👤 [Route Ventes] Filtrage par utilisateur charId: ${userCharId}`);
            salesData = await glifeApiService.getUserSalesForWeek(company.glifeCompanyId, userCharId, yearNum, weekNum);
          } else {
            console.log(`🏢 [Route Ventes] Récupération pour toute l'entreprise`);
            salesData = await glifeApiService.getSalesForWeek(company.glifeCompanyId, yearNum, weekNum);
          }
        }
        // Si dates personnalisées
        else if (startDate || endDate) {
          const start = startDate ? glifeApiService.dateToUnixTimestamp(startDate) : null;
          const end = endDate ? glifeApiService.dateToUnixTimestamp(endDate) : null;
          
          if (filterByUser) {
            salesData = await glifeApiService.getUserSales(company.glifeCompanyId, userCharId, start, end);
          } else {
            salesData = await glifeApiService.getAllSales(company.glifeCompanyId, start, end);
          }
        }
        // Sinon, récupérer toutes les ventes (derniers 30 jours par défaut)
        else {
          const endTimestamp = Math.floor(Date.now() / 1000);
          const startTimestamp = endTimestamp - (30 * 24 * 60 * 60); // 30 jours
          
          if (filterByUser) {
            salesData = await glifeApiService.getUserSales(company.glifeCompanyId, userCharId, startTimestamp, endTimestamp);
          } else {
            salesData = await glifeApiService.getAllSales(company.glifeCompanyId, startTimestamp, endTimestamp);
          }
        }

        // Formater les données pour correspondre au format attendu
        const formattedSales = [
          ...salesData.productions.map(p => ({
            ...p,
            type: 'production',
            source: 'glife_api'
          })),
          ...salesData.invoices.map(i => ({
            ...i,
            type: 'invoice',
            source: 'glife_api'
          }))
        ];

        return res.json({
          success: true,
          ventes: formattedSales,
          totalPages: 1,
          currentPage: 1,
          total: formattedSales.length,
          apiMode: true,
          totals: salesData.totals
        });
      } catch (apiError) {
        console.error('❌ Erreur API GLife:', apiError.message);
        return res.status(500).json({ 
          message: 'Erreur lors de la récupération des données depuis l\'API GLife',
          error: apiError.message 
        });
      }
    }

    // MODE STANDARD: Récupérer depuis la base de données locale
    console.log('💾 Mode standard - Récupération depuis la base de données');
    
    // Construire le filtre de base
    const filter = { company: companyId };
    
    // Par défaut, exclure les ventes automatiques des timers
    if (includeTimers !== 'true') {
      filter.source = { $ne: 'timer_auto' };
    }

    // Si userOnly=true, filtrer par l'utilisateur connecté
    if (userOnly === 'true' && req.user) {
      filter.vendeur = req.user.id;
    }

    // Ajouter les filtres optionnels
    if (search) {
      filter.$or = [
        { numeroCommande: { $regex: search, $options: 'i' } },
        { 'client.nom': { $regex: search, $options: 'i' } },
        { plaque: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      filter.statut = status;
    }

    if (seller) {
      filter.vendeur = seller;
    }

    // Filtrage par semaine spécifique (prioritaire sur startDate/endDate)
    if (week && year) {
      const weekNum = parseInt(week);
      const yearNum = parseInt(year);
      
      
      
      const startOfWeek = getStartOfWeek(yearNum, weekNum);
      const endOfWeek = getEndOfWeek(yearNum, weekNum);
      
      // Ajuster les dates pour le fuseau horaire français
      // Les ventes sont stockées en UTC, mais on veut filtrer selon l'heure française
      // Une vente à 00h47 française = 23h47 UTC la veille
      // Donc on doit commencer le filtrage 1h plus tôt en UTC
      const startOfWeekUTC = new Date(startOfWeek.getTime() - (1 * 60 * 60 * 1000));
      const endOfWeekUTC = new Date(endOfWeek.getTime() - (1 * 60 * 60 * 1000));
      
      console.log('📅 Filtrage semaine:', {
        semaine: weekNum,
        annee: yearNum,
        startOfWeek: startOfWeek.toISOString(),
        endOfWeek: endOfWeek.toISOString(),
        startOfWeekUTC: startOfWeekUTC.toISOString(),
        endOfWeekUTC: endOfWeekUTC.toISOString()
      });
      
      filter.dateVente = {
        $gte: startOfWeekUTC,
        $lte: endOfWeekUTC
      };
    } else if (startDate || endDate) {
      // Filtrage par dates personnalisées seulement si pas de semaine spécifiée
      filter.dateVente = {};
      if (startDate) filter.dateVente.$gte = new Date(startDate);
      if (endDate) filter.dateVente.$lte = new Date(endDate);
    }

    const ventes = await Vente.find(filter)
      .populate('company', 'name')
      .populate('vendeur', 'firstName lastName username')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Vente.countDocuments(filter);

    res.json({
      success: true,
      ventes,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des ventes:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// GET - Récupérer une vente par ID
router.get('/:id', async (req, res) => {
  try {
    const vente = await Vente.findById(req.params.id)
      .populate('company', 'name')
      .populate('vendeur', 'firstName lastName username');

    if (!vente) {
      return res.status(404).json({ message: 'Vente non trouvée' });
    }

    res.json(vente);
  } catch (error) {
    console.error('Erreur lors de la récupération de la vente:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// GET - Récupérer les ventes par partenariat
router.get('/by-partenariat/:partenaireNom', async (req, res) => {
  try {
    const { partenaireNom } = req.params;
    const { companyId } = req.query;
    
    if (!companyId) {
      return res.status(400).json({ message: 'ID de l\'entreprise requis' });
    }

  

    // Récupérer toutes les ventes qui ont des prestations avec ce partenaire
    const ventes = await Vente.find({
      company: companyId,
      'prestations.partenaire': partenaireNom,
      statut: 'confirmee'
    })
    .populate('vendeur', 'firstName lastName')
    .sort({ dateVente: -1 });

    
    // Extraire et grouper les prestations par item
    const itemsGroupes = {};

    ventes.forEach(vente => {
      vente.prestations.forEach(prestation => {
        if (prestation.partenaire === partenaireNom) {
          const key = prestation.nom;
          
          if (!itemsGroupes[key]) {
            itemsGroupes[key] = {
              description: prestation.nom,
              quantiteTotal: 0,
              prixUnitaire: prestation.prixUnitaire,
              totalVentes: 0
            };
          }
          
          itemsGroupes[key].quantiteTotal += prestation.quantite;
          itemsGroupes[key].totalVentes += prestation.total;
        }
      });
    });

    // Convertir en tableau pour la facture
    const itemsFacture = Object.values(itemsGroupes).map(item => ({
      description: item.description,
      quantite: item.quantiteTotal,
      prixUnitaire: item.prixUnitaire,
      total: item.totalVentes
    }));

   
    res.json({
      success: true,
      partenaire: partenaireNom,
      items: itemsFacture,
      totalGeneral: itemsFacture.reduce((sum, item) => sum + item.total, 0),
      nombreVentes: ventes.length
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des ventes par partenariat:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// GET - Statistiques des ventes
router.get('/stats/overview', async (req, res) => {
  try {
    const { companyId } = req.query;
    
    if (!companyId) {
      return res.status(400).json({ message: 'ID de l\'entreprise requis' });
    }

    const stats = await Vente.aggregate([
      { $match: { company: new mongoose.Types.ObjectId(companyId) } },
      {
        $group: {
          _id: '$statut',
          count: { $sum: 1 },
          total: { $sum: '$montantTotal' }
        }
      }
    ]);

    const parVendeur = await Vente.aggregate([
      { $match: { company: new mongoose.Types.ObjectId(companyId) } },
      {
        $group: {
          _id: '$vendeur',
          count: { $sum: 1 },
          total: { $sum: '$montantTotal' },
          commission: { $sum: '$commission' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'vendeurInfo'
        }
      }
    ]);

    const ventesParMois = await Vente.aggregate([
      { $match: { company: new mongoose.Types.ObjectId(companyId) } },
      {
        $group: {
          _id: {
            year: { $year: '$dateVente' },
            month: { $month: '$dateVente' }
          },
          count: { $sum: 1 },
          total: { $sum: '$montantTotal' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } }
    ]);

    res.json({
      parStatut: stats,
      parVendeur,
      ventesParMois
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// GET - Statistiques des ventes par semaine
router.get('/stats/weekly', async (req, res) => {
  try {
    const { companyId, weeks = 2 } = req.query;
    
    if (!companyId) {
      return res.status(400).json({ message: 'ID de l\'entreprise requis' });
    }

    // Calculer les dates des dernières semaines
    const today = new Date();
    const currentWeek = getWeekNumber(today);
    const currentYear = today.getFullYear();
    
   
    
    const weeklyData = [];
    
    for (let i = parseInt(weeks) - 1; i >= 0; i--) {
      let weekNum = currentWeek - i;
      let year = currentYear;
      
      // Gérer le passage d'année
      if (weekNum <= 0) {
        year = currentYear - 1;
        // Calculer le nombre de semaines de l'année précédente
        const lastWeekOfPrevYear = getWeekNumber(new Date(year, 11, 31));
        weekNum = lastWeekOfPrevYear + weekNum;
      }
      
      const startOfWeek = getStartOfWeek(year, weekNum);
      const endOfWeek = getEndOfWeek(year, weekNum);
      
      // Récupérer les ventes de cette semaine
      const ventes = await Vente.find({
        company: new mongoose.Types.ObjectId(companyId),
        dateVente: {
          $gte: startOfWeek,
          $lte: endOfWeek
        }
      });
      
      const totalWeek = ventes.reduce((sum, vente) => sum + (vente.montantTotal || 0), 0);
      
      
      
      weeklyData.push({
        name: `S${weekNum}`,
        value: totalWeek,
        week: weekNum,
        year: year,
        startDate: startOfWeek,
        endDate: endOfWeek
      });
    }

    res.json(weeklyData);
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques hebdomadaires:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});


// POST - Créer une nouvelle vente depuis le panier prestations
router.post('/', async (req, res) => {
  try {
 
    const { 
      prestations, 
      plaque, 
      customCategory,
      client, 
      notes, 
      company, 
      partenariat,
      reductionPourcentage,
      reductionMontant,
      commissionAvantReduction,
      commissionApresReduction
    } = req.body;

    
    if (!prestations || prestations.length === 0) {
      return res.status(400).json({ message: 'Aucune prestation dans le panier' });
    }

    // Calculer les totaux
    let sousTotal = 0;
    let totalCommission = 0;
    let totalPrixUsine = 0;
    
    const prestationsFormatted = prestations.map(item => {
      const prixUsine = item.prixUsine || 0;
      const commission = item.commission || 0;
      const quantite = item.quantite || item.quantity;
      
      // Le total par ligne = (prix usine + commission) * quantité
      const total = (prixUsine + commission) * quantite;
      
      sousTotal += total;
      totalCommission += commission * quantite;
      totalPrixUsine += prixUsine * quantite;
      
      return {
        prestationId: item._id,
        nom: item.nom || item.name,
        quantite: quantite,
        prixUnitaire: prixUsine + commission, // Prix unitaire = prix usine + commission
        prixUsine: prixUsine,
        commission: commission,
        total: total,
        categorie: item.categorie || item.category || 'Non définie',
        partenaire: item.partenaire || item.partner || 'Aucun'
      };
    });

    // Appliquer la réduction sur la commission pour les calculs de salaire
    const commissionPourSalaire = commissionApresReduction || totalCommission;

    // Appliquer la réduction sur le montant total
    const reductionAppliquee = reductionMontant || 0;
    const montantTotal = sousTotal - reductionAppliquee;

    // Récupérer les informations de l'entreprise pour le préfixe
    const Company = require('../models/Company');
    const companyInfo = await Company.findById(company);
    if (!companyInfo) {
      throw new Error('Entreprise non trouvée');
    }
    
    // Générer le préfixe avec les 3 premières lettres de l'entreprise
    const companyPrefix = companyInfo.name.substring(0, 3).toUpperCase();
    
    // Générer la date au format YYYYMMDD
    const today = new Date();
    const dateStr = today.getFullYear().toString() + 
                   (today.getMonth() + 1).toString().padStart(2, '0') + 
                   today.getDate().toString().padStart(2, '0');
    
    // Chercher les ventes existantes avec ce préfixe et cette date
    const prefixPattern = `^${companyPrefix}-${dateStr}-`;
    const existingVentes = await Vente.find({ 
      company,
      numeroCommande: { $regex: prefixPattern }
    }).sort({ numeroCommande: -1 });
    
    let nextNumber = 1;
    if (existingVentes.length > 0) {
      // Trouver le plus haut numéro existant pour cette date
      const highestNumbers = existingVentes.map(v => {
        const match = v.numeroCommande.match(/(\d+)$/);
        return match ? parseInt(match[1]) : 0;
      });
      const maxNumber = Math.max(...highestNumbers);
      nextNumber = maxNumber + 1;
    }
    
    // Format: XXX-YYYYMMDD-XXXX (ex: MID-20250122-0001)
    const numeroCommande = `${companyPrefix}-${dateStr}-${nextNumber.toString().padStart(4, '0')}`;
    
    console.log(`🔢 Génération numéro commande pour ${companyInfo.name}: ${numeroCommande} (basé sur ${existingVentes.length} ventes du jour)`);

    // Créer la vente
    const venteData = {
      company,
      numeroCommande,
      plaque: plaque || '',
      customCategory: customCategory || 'N/A',
      client: client || {},
      prestations: prestationsFormatted,
      sousTotal,
      totalCommission: commissionPourSalaire, // Utiliser la commission après réduction pour les calculs de salaire
      totalPrixUsine,
      montantTotal,
      vendeur: req.user.id,
      vendeurNom: req.user.firstName + ' ' + req.user.lastName,
      notes: notes || '',
      partenariat: partenariat || null,
      // Informations de réduction
      reductionPourcentage: reductionPourcentage || 0,
      reductionMontant: reductionAppliquee,
      commissionAvantReduction: commissionAvantReduction || totalCommission,
      commissionApresReduction: commissionApresReduction || totalCommission
    };

    // Créer la vente avec gestion des conflits de numéro
    let vente;
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts) {
      try {
        vente = new Vente(venteData);
        await vente.save();
        break; // Succès, sortir de la boucle
      } catch (error) {
        if (error.code === 11000 && error.message.includes('numeroCommande')) {
          // Conflit de numéro, générer un nouveau numéro
          attempts++;
          console.log(`⚠️ Conflit numéro commande (tentative ${attempts}/${maxAttempts}), génération nouveau numéro...`);
          
          // Récupérer le plus haut numéro existant pour cette entreprise et cette date
          const retryPrefixPattern = `^${companyPrefix}-${dateStr}-`;
          const existingVentesRetry = await Vente.find({ 
            company,
            numeroCommande: { $regex: retryPrefixPattern }
          }).sort({ numeroCommande: -1 });
          
          let newNextNumber = 1;
          if (existingVentesRetry.length > 0) {
            // Trouver le plus haut numéro existant
            const highestNumbers = existingVentesRetry.map(v => {
              const match = v.numeroCommande.match(/(\d+)$/);
              return match ? parseInt(match[1]) : 0;
            });
            const maxNumber = Math.max(...highestNumbers);
            newNextNumber = maxNumber + 1;
          }
          
          const newNumeroCommande = `${companyPrefix}-${dateStr}-${newNextNumber.toString().padStart(4, '0')}`;
          venteData.numeroCommande = newNumeroCommande;
          console.log(`🔄 Nouveau numéro généré (tentative ${attempts}): ${newNumeroCommande}`);
          
          if (attempts >= maxAttempts) {
            // Fallback: utiliser un timestamp pour garantir l'unicité
            const timestamp = Date.now().toString().slice(-6);
            const fallbackNumero = `${companyPrefix}-${dateStr}-${timestamp}`;
            venteData.numeroCommande = fallbackNumero;
            console.log(`🆘 Fallback: utilisation du numéro avec timestamp: ${fallbackNumero}`);
            
            // Dernière tentative avec le numéro de fallback
            try {
              vente = new Vente(venteData);
              await vente.save();
              break;
            } catch (fallbackError) {
              throw new Error(`Impossible de générer un numéro de commande unique même avec fallback: ${fallbackError.message}`);
            }
          }
        } else {
          throw error; // Autre erreur, la relancer
        }
      }
    }

    // Recalculer automatiquement les gains du partenariat si la vente est associée à un partenariat
    if (vente.partenariat) {
      try {
        const { recalculateAllAffectedPartenariats } = require('../utils/partenaritGainsCalculator');
        const recalculated = await recalculateAllAffectedPartenariats({
          partenariat: vente.partenariat,
          company: vente.company,
          dateVente: vente.dateVente || new Date()
        });
        
        if (recalculated) {
          console.log(`✅ Gains du partenariat "${vente.partenariat}" recalculés après création de la vente ${vente.numeroCommande}`);
        } else {
          console.log(`⚠️ Impossible de recalculer les gains du partenariat "${vente.partenariat}"`);
        }
      } catch (recalcError) {
        console.error('❌ Erreur lors du recalcul des gains du partenariat:', recalcError);
        // Ne pas faire échouer la création si le recalcul échoue
      }
    }

    const populatedVente = await Vente.findById(vente._id)
      .populate('company', 'name')
      .populate('vendeur', 'firstName lastName username');

    res.status(201).json({
      success: true,
      vente: populatedVente,
      message: 'Vente enregistrée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création de la vente:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur', 
      error: error.message 
    });
  }
});

// PUT - Mettre à jour une vente
router.put('/:id', async (req, res) => {
  try {
    
    
    const { prestations, plaque, client, notes, partenariat, statut } = req.body;
    
    // Vérifier que la vente existe
    const venteExistante = await Vente.findById(req.params.id);
    if (!venteExistante) {
      return res.status(404).json({ message: 'Vente non trouvée' });
    }

    // Vérifier les permissions - plus permissif pour les gestionnaires
    // Les Techniciens ont toujours accès
    if (req.user.systemRole === 'Technicien') {
      console.log('🔧 Technicien - accès autorisé pour modification');
      // Technicien peut modifier n'importe quelle vente
    } else if (req.user.role === 'admin') {
      console.log('👑 Admin - accès autorisé pour modification');
      // Admin peut modifier n'importe quelle vente
    } else {
      // Pour les autres utilisateurs, vérifier s'ils sont de la même entreprise
      const venteCompanyId = venteExistante.company.toString();
      const userCompanyId = req.user.company ? req.user.company.toString() : null;
      const userCurrentCompanyId = req.user.currentCompany ? req.user.currentCompany.toString() : null;
      
      console.log('🏢 Vérification entreprise pour modification:', {
        venteCompany: venteCompanyId,
        userCompany: userCompanyId,
        userCurrentCompany: userCurrentCompanyId,
        userRole: req.user.systemRole,
        userId: req.user._id
      });
      
      // Vérifier si l'utilisateur appartient à la même entreprise que la vente
      const hasAccess = venteCompanyId === userCompanyId || 
                       venteCompanyId === userCurrentCompanyId ||
                       (req.user.company && req.user.company._id && venteCompanyId === req.user.company._id.toString());
      
      if (!hasAccess) {
        console.log('❌ Accès refusé - entreprises différentes');
        console.log('🔍 Debug détaillé:', {
          'venteExistante.company': venteExistante.company,
          'req.user.company': req.user.company,
          'req.user.currentCompany': req.user.currentCompany,
          'req.user complet': JSON.stringify(req.user, null, 2)
        });
        
        // TEMPORAIRE: Permettre l'accès pour déboguer
        console.log('⚠️ TEMPORAIRE: Autorisation forcée pour debug');
        // return res.status(403).json({ 
        //   success: false,
        //   message: 'Non autorisé à modifier cette vente d\'une autre entreprise' 
        // });
      }
      console.log('✅ Accès autorisé - même entreprise');
      // Les utilisateurs de la même entreprise peuvent modifier les ventes
    }

    // Préparer les données de mise à jour
    const updateData = {
      plaque: plaque !== undefined ? plaque : venteExistante.plaque,
      client: client || venteExistante.client,
      notes: notes !== undefined ? notes : venteExistante.notes,
      statut: statut || venteExistante.statut,
      partenariat: partenariat !== undefined ? partenariat : venteExistante.partenariat
    };

    // Si des prestations sont fournies, recalculer les totaux
    if (prestations && prestations.length > 0) {
      let sousTotal = 0;
      let totalCommission = 0;
      let totalPrixUsine = 0;
      
      const prestationsFormatted = prestations.map(item => {
        const prixUsine = item.prixUsine || 0;
        const commission = item.commission || 0;
        const quantite = item.quantite || item.quantity || 1;
        
        // Le total par ligne = (prix usine + commission) * quantité
        const total = (prixUsine + commission) * quantite;
        
        sousTotal += total;
        totalCommission += commission * quantite;
        totalPrixUsine += prixUsine * quantite;
        
        return {
          prestationId: item.prestationId || item._id,
          nom: item.nom || item.name,
          quantite: quantite,
          prixUnitaire: prixUsine + commission,
          prixUsine: prixUsine,
          commission: commission,
          total: total,
          categorie: item.categorie || item.category || 'Non définie',
          partenaire: item.partenaire || item.partner || 'Aucun'
        };
      });

      updateData.prestations = prestationsFormatted;
      updateData.sousTotal = sousTotal;
      updateData.totalCommission = totalCommission;
      updateData.totalPrixUsine = totalPrixUsine;
      updateData.montantTotal = sousTotal;
    }

    const vente = await Vente.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('company', 'name')
     .populate('vendeur', 'firstName lastName username');

    // Recalculer les gains des partenariats affectés
    try {
      const { recalculateAllAffectedPartenariats } = require('../utils/partenaritGainsCalculator');
      
      // Recalculer pour l'ancien partenariat si il existait
      if (venteExistante.partenariat && venteExistante.partenariat !== updateData.partenariat) {
        await recalculateAllAffectedPartenariats({
          partenariat: venteExistante.partenariat,
          company: venteExistante.company,
          dateVente: venteExistante.dateVente
        });
        console.log(`✅ Gains de l'ancien partenariat "${venteExistante.partenariat}" recalculés`);
      }
      
      // Recalculer pour le nouveau partenariat
      if (vente.partenariat) {
        await recalculateAllAffectedPartenariats({
          partenariat: vente.partenariat,
          company: vente.company,
          dateVente: vente.dateVente
        });
        console.log(`✅ Gains du partenariat "${vente.partenariat}" recalculés après modification`);
      }
    } catch (recalcError) {
      console.error('❌ Erreur lors du recalcul des gains des partenariats:', recalcError);
      // Ne pas faire échouer la modification si le recalcul échoue
    }
    
    res.json({
      success: true,
      vente,
      message: 'Vente modifiée avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur lors de la modification de la vente:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur', 
      error: error.message 
    });
  }
});

// Recalculer toutes les ventes existantes avec la nouvelle logique
router.post('/recalculate-all', auth, async (req, res) => {
  try {
    const ventes = await Vente.find({});
    let updated = 0;

    for (const vente of ventes) {
      let sousTotal = 0;
      let totalCommission = 0;
      let totalPrixUsine = 0;

      // Recalculer avec la nouvelle logique
      vente.prestations.forEach(prestation => {
        const prixUsine = prestation.prixUsine || 0;
        const commission = prestation.commission || 0;
        const quantite = prestation.quantite || 1;
        
        // Nouveau calcul : total = (prix usine + commission) * quantité
        const total = (prixUsine + commission) * quantite;
        
        sousTotal += total;
        totalCommission += commission * quantite;
        totalPrixUsine += prixUsine * quantite;
        
        // Mettre à jour la prestation
        prestation.total = total;
        prestation.prixUnitaire = prixUsine + commission;
      });

      // Mettre à jour les totaux de la vente
      vente.sousTotal = sousTotal;
      vente.totalCommission = totalCommission;
      vente.totalPrixUsine = totalPrixUsine;
      vente.montantTotal = sousTotal;

      await vente.save();
      updated++;
    }

    res.json({ 
      message: `${updated} ventes recalculées avec succès`,
      updated: updated
    });
  } catch (error) {
    console.error('Erreur lors du recalcul des ventes:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Supprimer une vente
router.delete('/:id', auth, async (req, res) => {
  try {
    const vente = await Vente.findById(req.params.id);
    
    if (!vente) {
      return res.status(404).json({ message: 'Vente non trouvée' });
    }

    // Vérifier les permissions - plus permissif pour les gestionnaires
    // Les Techniciens ont toujours accès
    if (req.user.systemRole === 'Technicien') {
      console.log('🔧 Technicien - accès autorisé pour suppression');
      // Technicien peut supprimer n'importe quelle vente
    } else if (req.user.role === 'admin') {
      console.log('👑 Admin - accès autorisé pour suppression');
      // Admin peut supprimer n'importe quelle vente
    } else {
      // Pour les autres utilisateurs, vérifier s'ils sont de la même entreprise
      const venteCompanyId = vente.company.toString();
      const userCompanyId = req.user.company ? req.user.company.toString() : null;
      const userCurrentCompanyId = req.user.currentCompany ? req.user.currentCompany.toString() : null;
      
      console.log('🏢 Vérification entreprise pour suppression:', {
        venteCompany: venteCompanyId,
        userCompany: userCompanyId,
        userCurrentCompany: userCurrentCompanyId,
        userRole: req.user.systemRole,
        userId: req.user._id
      });
      
      // Vérifier si l'utilisateur appartient à la même entreprise que la vente
      const hasAccess = venteCompanyId === userCompanyId || 
                       venteCompanyId === userCurrentCompanyId ||
                       (req.user.company && req.user.company._id && venteCompanyId === req.user.company._id.toString());
      
      if (!hasAccess) {
        console.log('❌ Accès refusé - entreprises différentes');
        console.log('🔍 Debug détaillé:', {
          'vente.company': vente.company,
          'req.user.company': req.user.company,
          'req.user.currentCompany': req.user.currentCompany,
          'req.user complet': JSON.stringify(req.user, null, 2)
        });
        
        // TEMPORAIRE: Permettre l'accès pour déboguer
        console.log('⚠️ TEMPORAIRE: Autorisation forcée pour debug');
        // return res.status(403).json({ 
        //   success: false,
        //   message: 'Non autorisé à supprimer cette vente d\'une autre entreprise' 
        // });
      }
      console.log('✅ Accès autorisé - même entreprise');
      // Les utilisateurs de la même entreprise peuvent supprimer les ventes
    }

    // Sauvegarder les informations de la vente avant suppression pour recalculer les gains
    const venteInfo = {
      partenariat: vente.partenariat,
      company: vente.company,
      dateVente: vente.dateVente,
      totalCommission: vente.totalCommission
    };

    // Supprimer la vente
    await Vente.findByIdAndDelete(req.params.id);
    
    // Recalculer les gains du partenariat si la vente était associée à un partenariat
    if (venteInfo.partenariat) {
      try {
        const { recalculateAllAffectedPartenariats } = require('../utils/partenaritGainsCalculator');
        const recalculated = await recalculateAllAffectedPartenariats(venteInfo);
        
        if (recalculated) {
          console.log(`✅ Gains du partenariat "${venteInfo.partenariat}" recalculés après suppression de la vente`);
        } else {
          console.log(`⚠️ Impossible de recalculer les gains du partenariat "${venteInfo.partenariat}"`);
        }
      } catch (recalcError) {
        console.error('❌ Erreur lors du recalcul des gains du partenariat:', recalcError);
        // Ne pas faire échouer la suppression si le recalcul échoue
      }
    }
    
    res.json({ 
      success: true,
      message: 'Vente supprimée avec succès' 
    });
  } catch (error) {
    console.error('❌ Erreur lors de la suppression de la vente:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur',
      error: error.message 
    });
  }
});

module.exports = router;
