const express = require('express');
const router = express.Router();
const Bilan = require('../models/Bilan');
const Charge = require('../models/Charge');
const Company = require('../models/Company');
const User = require('../models/User');
const Vente = require('../models/Vente');
const TimerSession = require('../models/TimerSession');
const auth = require('../middleware/auth');
const { calculateEmployeeSalary } = require('../utils/salaryCalculator');
const { calculateSimpleTax, calculateProgressiveTax } = require('../utils/taxBracketsCalculator');
const glifeApiService = require('../services/glifeApiService');

// Middleware pour vérifier l'authentification sur toutes les routes
router.use(auth);

// GET - Récupérer tous les bilans d'une entreprise
router.get('/', async (req, res) => {
  try {
    const { companyId } = req.query;
    
    if (!companyId) {
      return res.status(400).json({ message: 'ID de l\'entreprise requis' });
    }

    const bilans = await Bilan.find({ company: companyId })
      .populate('createdBy', 'firstName lastName username')
      .sort({ 'periode.debut': -1 });

    res.json(bilans);
  } catch (error) {
    console.error('Erreur lors de la récupération des bilans:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// GET - Récupérer un bilan par ID
router.get('/:id', async (req, res) => {
  try {
    const bilan = await Bilan.findById(req.params.id)
      .populate('company', 'name')
      .populate('createdBy', 'firstName lastName username');

    if (!bilan) {
      return res.status(404).json({ message: 'Bilan non trouvé' });
    }

    res.json(bilan);
  } catch (error) {
    console.error('Erreur lors de la récupération du bilan:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// POST - Créer un nouveau bilan
router.post('/', async (req, res) => {
  try {
    const bilanData = {
      ...req.body,
      createdBy: req.user.id
    };

    // Calculer les totaux
    if (bilanData.actif) {
      bilanData.actif.total = 
        (bilanData.actif.immobilisations || 0) +
        (bilanData.actif.stocks || 0) +
        (bilanData.actif.creances || 0) +
        (bilanData.actif.tresorerie || 0);
    }

    if (bilanData.passif) {
      bilanData.passif.total = 
        (bilanData.passif.capitaux || 0) +
        (bilanData.passif.dettes || 0) +
        (bilanData.passif.provisions || 0);
    }

    if (bilanData.resultat) {
      bilanData.resultat.benefice = 
        (bilanData.resultat.chiffreAffaires || 0) - 
        (bilanData.resultat.charges || 0);
    }

    const bilan = new Bilan(bilanData);
    await bilan.save();

    const populatedBilan = await Bilan.findById(bilan._id)
      .populate('company', 'name')
      .populate('createdBy', 'firstName lastName username');

    res.status(201).json(populatedBilan);
  } catch (error) {
    console.error('Erreur lors de la création du bilan:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// PUT - Mettre à jour un bilan
router.put('/:id', async (req, res) => {
  try {
    const bilanData = req.body;

    // Calculer les totaux
    if (bilanData.actif) {
      bilanData.actif.total = 
        (bilanData.actif.immobilisations || 0) +
        (bilanData.actif.stocks || 0) +
        (bilanData.actif.creances || 0) +
        (bilanData.actif.tresorerie || 0);
    }

    if (bilanData.passif) {
      bilanData.passif.total = 
        (bilanData.passif.capitaux || 0) +
        (bilanData.passif.dettes || 0) +
        (bilanData.passif.provisions || 0);
    }

    if (bilanData.resultat) {
      bilanData.resultat.benefice = 
        (bilanData.resultat.chiffreAffaires || 0) - 
        (bilanData.resultat.charges || 0);
    }

    const bilan = await Bilan.findByIdAndUpdate(
      req.params.id,
      bilanData,
      { new: true, runValidators: true }
    ).populate('company', 'name')
     .populate('createdBy', 'firstName lastName username');

    if (!bilan) {
      return res.status(404).json({ message: 'Bilan non trouvé' });
    }

    res.json(bilan);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du bilan:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// DELETE - Supprimer un bilan
router.delete('/:id', async (req, res) => {
  try {
    const bilan = await Bilan.findByIdAndDelete(req.params.id);

    if (!bilan) {
      return res.status(404).json({ message: 'Bilan non trouvé' });
    }

    res.json({ message: 'Bilan supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du bilan:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Fonctions utilitaires pour les calculs de semaine (fuseau horaire français)
function convertToFrenchTime(date) {
  // Ajouter 1 heure (3600000 ms) pour convertir UTC vers heure française (UTC+1)
  // En décembre, la France est en heure d'hiver (UTC+1)
  const frenchTime = new Date(date.getTime() + (1 * 60 * 60 * 1000));
  console.log('🕐 [Bilans] Conversion heure:', {
    original: date.toISOString(),
    french: frenchTime.toISOString(),
    originalLocal: date.toLocaleString('fr-FR'),
    frenchLocal: frenchTime.toLocaleString('fr-FR')
  });
  return frenchTime;
}

function getWeekNumber(date) {
  // Convertir en heure française
  const frenchDate = convertToFrenchTime(date);
  const d = new Date(Date.UTC(frenchDate.getFullYear(), frenchDate.getMonth(), frenchDate.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const weekNumber = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
  
  console.log('📅 [Bilans] Calcul semaine:', {
    dateOriginal: date.toISOString(),
    dateFrancaise: frenchDate.toISOString(),
    semaine: weekNumber
  });
  
  return weekNumber;
}

function getStartOfWeek(date) {
  // Convertir en heure française
  const frenchDate = convertToFrenchTime(date);
  const d = new Date(frenchDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Lundi = début de semaine
  return new Date(d.setDate(diff));
}

function getEndOfWeek(date) {
  // Convertir en heure française
  const frenchDate = convertToFrenchTime(date);
  const d = new Date(frenchDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? 0 : 7); // Dimanche = fin de semaine
  const endDate = new Date(d.setDate(diff));
  // S'assurer que la fin de semaine va jusqu'à 23h59:59
  endDate.setHours(23, 59, 59, 999);
  return endDate;
}

function getStartOfWeekFromWeekNumber(weekNumber, year) {
  // Trouver le premier jeudi de l'année (semaine 1)
  const jan4 = new Date(year, 0, 4);
  const firstThursday = new Date(jan4.getTime() - (jan4.getDay() - 4) * 86400000);
  
  // Calculer le lundi de la semaine demandée
  const targetWeekStart = new Date(firstThursday.getTime() + (weekNumber - 1) * 7 * 86400000);
  targetWeekStart.setDate(targetWeekStart.getDate() - 3); // Revenir au lundi
  targetWeekStart.setHours(0, 0, 0, 0); // S'assurer que ça commence à minuit
  
  return targetWeekStart;
}

// GET /bilans/calculate/:companyId - Calculer les données financières
router.get('/calculate/:companyId', auth, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { week, year } = req.query;

    

    // Utiliser la semaine et l'année spécifiées ou la semaine courante par défaut
    const targetWeek = week ? parseInt(week) : getWeekNumber(new Date());
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    
    console.log('📅 Période calculée:', { targetWeek, targetYear });
    
    // Calculer les dates de début et fin de la semaine spécifiée
    const startOfWeek = getStartOfWeekFromWeekNumber(targetWeek, targetYear);
    const endOfWeek = getEndOfWeek(startOfWeek);
    
    console.log('📅 Dates de la semaine:', { startOfWeek, endOfWeek });

    // Récupérer l'entreprise pour vérifier le mode API
    const Company = require('../models/Company');
    const company = await Company.findById(companyId).populate('pdg');
    
    if (!company) {
      return res.status(404).json({ success: false, message: 'Entreprise non trouvée' });
    }

  

    // Récupérer les charges de la semaine spécifiée
    const charges = await Charge.find({ 
      company: companyId,
      dateCharge: {
        $gte: startOfWeek,
        $lte: endOfWeek
      }
    });

  

    // Calculer les totaux
    const chargesDeductibles = charges
      .filter(c => c.deductibilite === 'deductible')
      .reduce((sum, c) => sum + c.montant, 0);
    
    const chargesNonDeductibles = charges
      .filter(c => c.deductibilite === 'non_deductible')
      .reduce((sum, c) => sum + c.montant, 0);
    
    const chargesPartielles = charges
      .filter(c => c.deductibilite === 'partiellement_deductible')
      .reduce((sum, c) => sum + c.montant, 0);

    const totalChargesDeductibles = chargesDeductibles + chargesPartielles;
    
    // Calculs par catégorie (maintenant avec raisons libres)
    const salaires = charges
      .filter(c => c.categorie.toLowerCase().includes('salaire') || c.categorie.toLowerCase().includes('paie'))
      .reduce((sum, c) => sum + c.montant, 0);
    
    // Récupérer les ventes en utilisant la même logique que la route /ventes
    const Vente = require('../models/Vente');
    let ventesEntreprise = [];
    let chiffreAffairesVentes = 0;
    
    // Vérifier si l'entreprise utilise l'API GLife
    if (company.apiMode && company.glifeCompanyId) {
      console.log('🌐 Mode API GLife activé - Récupération des ventes depuis l\'API');
      
      try {
        const glifeApiService = require('../services/glifeApiService');
        
        // Utiliser la même méthode que la route /ventes pour récupérer les données par semaine
        const salesData = await glifeApiService.getSalesForWeek(company.glifeCompanyId, targetYear, targetWeek);
        
        console.log(`📦 Productions récupérées: ${salesData.productions.length}`);
        console.log(`📄 Factures récupérées: ${salesData.invoices.length}`);
        
        // Calculer le CA total depuis l'API (somme des revenues)
        const totalProductions = salesData.productions.reduce((sum, prod) => {
          const revenue = parseInt(prod.revenue || '0');
          return sum + revenue;
        }, 0);
        
        const totalInvoices = salesData.invoices.reduce((sum, inv) => {
          const revenue = parseInt(inv.revenue || '0');
          return sum + revenue;
        }, 0);
        
        chiffreAffairesVentes = totalProductions + totalInvoices;
        
        console.log(`💰 CA Productions: $${totalProductions}`);
        console.log(`💰 CA Factures: $${totalInvoices}`);
        console.log(`💰 CA Total API: $${chiffreAffairesVentes}`);
        
      } catch (error) {
        console.error('❌ Erreur récupération API GLife:', error.message);
        // En cas d'erreur API, continuer avec CA = 0
        chiffreAffairesVentes = 0;
      }
    } else {
      console.log('📊 Mode base de données locale');
      
      // Mode normal : récupérer depuis la base de données
      // Ajuster les dates pour le fuseau horaire français
      const startOfWeekUTC = new Date(startOfWeek.getTime() - (1 * 60 * 60 * 1000));
      const endOfWeekUTC = new Date(endOfWeek.getTime() - (1 * 60 * 60 * 1000));
      
      console.log('📅 [Bilans] Filtrage ventes:', {
        startOfWeek: startOfWeek.toISOString(),
        endOfWeek: endOfWeek.toISOString(),
        startOfWeekUTC: startOfWeekUTC.toISOString(),
        endOfWeekUTC: endOfWeekUTC.toISOString()
      });
      
      ventesEntreprise = await Vente.find({ 
        company: companyId,
        dateVente: {
          $gte: startOfWeekUTC,
          $lte: endOfWeekUTC
        }
      });
      
      console.log(`📊 Ventes trouvées: ${ventesEntreprise.length}`);
      if (ventesEntreprise.length > 0) {
        console.log('📋 Détail des ventes:', ventesEntreprise.map(v => ({
          id: v._id,
          date: v.dateVente,
          montant: v.totalCommission || v.montantTotal || 0
        })));
      }
      
      // Calculer le CA des ventes normales
      chiffreAffairesVentes = ventesEntreprise.reduce((sum, vente) => sum + (vente.totalCommission || 0), 0);
      
      console.log(`💰 CA Ventes locales: $${chiffreAffairesVentes}`);
    }
    
    // Utiliser toutes les ventes de l'entreprise de cette semaine
    const ventes = ventesEntreprise;
    
    // Calculer les salaires basés sur les marges des vendeurs × pourcentage de leur rôle
    const User = require('../models/User');
    const Role = require('../models/Role');
    
    let totalSalairesVendeurs = 0;
    const detailsSalaires = []; // Tableau pour stocker les détails de chaque salaire
    
    // Récupérer les sessions TimerSession terminées de la semaine pour les salaires
    const TimerSession = require('../models/TimerSession');
    const timerSessionsSalaires = await TimerSession.find({
      company: companyId,
      statut: 'termine',
      createdAt: {
        $gte: startOfWeek,
        $lte: endOfWeek
      }
    }).populate('vehicle', 'nom tarifParMinute').populate('utilisateur', 'username firstName lastName');
    
    // Grouper les ventes par vendeur
    const ventesParVendeur = {};
    
    // Pour les ventes API GLife, grouper par nom de vendeur
    if (company.apiMode && company.glifeCompanyId) {
      // Récupérer tous les utilisateurs de l'entreprise pour mapper les noms
      const allUsers = await User.find({
        'companies.company': companyId
      });
      
      // Créer un map des utilisateurs par nom complet et charId
      const usersByName = {};
      const usersByCharId = {};
      allUsers.forEach(user => {
        const fullName = `${user.firstName} ${user.lastName}`.trim();
        usersByName[fullName] = user;
        if (user.charId) {
          usersByCharId[user.charId.toString()] = user;
        }
      });
      
      // Grouper les ventes API par vendeur
      const salesData = await glifeApiService.getSalesForWeek(company.glifeCompanyId, targetYear, targetWeek);
      const allSales = [...salesData.productions, ...salesData.invoices];
      
      allSales.forEach(sale => {
        // Trouver l'utilisateur correspondant par nom ou charId
        let user = usersByName[sale.name];
        if (!user && sale.id) {
          user = usersByCharId[sale.id.toString()];
        }
        
        if (user) {
          const vendeurId = user._id.toString();
          if (!ventesParVendeur[vendeurId]) {
            ventesParVendeur[vendeurId] = {
              vendeur: user._id,
              vendeurNom: `${user.firstName} ${user.lastName}`.trim(),
              totalMarge: 0
            };
          }
          ventesParVendeur[vendeurId].totalMarge += parseInt(sale.revenue || '0');
        }
      });
    } else {
      // Mode normal : ventes de la base de données
      ventes.forEach(vente => {
        const vendeurId = vente.vendeur.toString();
        if (!ventesParVendeur[vendeurId]) {
          ventesParVendeur[vendeurId] = {
            vendeur: vente.vendeur,
            vendeurNom: vente.vendeurNom,
            totalMarge: 0
          };
        }
        ventesParVendeur[vendeurId].totalMarge += (vente.totalCommission || 0);
      });
    }
    
    // Ajouter les timers au CA des vendeurs
    timerSessionsSalaires.forEach(session => {
      if (session.utilisateur) {
        const vendeurId = session.utilisateur._id.toString();
        if (!ventesParVendeur[vendeurId]) {
          ventesParVendeur[vendeurId] = {
            vendeur: session.utilisateur._id,
            vendeurNom: `${session.utilisateur.firstName || ''} ${session.utilisateur.lastName || ''}`.trim() || session.utilisateur.username,
            totalMarge: 0
          };
        }
        ventesParVendeur[vendeurId].totalMarge += (session.coutCalcule || 0);
      }
    });
    
    
    
    // Calculer le salaire pour chaque vendeur avec plafonnement du score social
    for (const vendeurData of Object.values(ventesParVendeur)) {
      try {
        const user = await User.findById(vendeurData.vendeur).populate({
          path: 'companies.role',
          match: { company: companyId }
        });
        
        if (user && user.companies) {
          const userCompany = user.companies.find(c => c.company.toString() === companyId);
          if (userCompany && userCompany.role) {
            const role = await Role.findById(userCompany.role);
            if (role && role.normeSalariale) {
              const salaryResult = calculateEmployeeSalary(
                vendeurData.totalMarge, 
                role.normeSalariale,
                role.limiteSalaire // Ajouter la limite de salaire
              );
              
              const salaireVendeur = salaryResult.salaireCalculeFinal;
              totalSalairesVendeurs += salaireVendeur;
              
              // Stocker les détails du salaire
              detailsSalaires.push({
                employeId: user._id,
                nom: `${user.firstName} ${user.lastName}`.trim(),
                username: user.username,
                role: role.nom,
                chiffreAffaires: vendeurData.totalMarge,
                normeSalariale: role.normeSalariale,
                limiteSalaire: role.limiteSalaire,
                salaireCalcule: salaryResult.salaireCalcule,
                salaireFinal: salaireVendeur,
                salaireBloque: salaryResult.salaireBloque,
                montantRetenu: salaryResult.montantRetenuEntreprise || 0,
                avances: user.avances || 0,
                primes: user.primes || 0
              });
              
              console.log(`   ${vendeurData.vendeurNom}: CA ${vendeurData.totalMarge}€ → Salaire ${salaireVendeur}€`);
            }
          }
        }
      } catch (error) {
        console.error(`Erreur calcul salaire vendeur ${vendeurData.vendeurNom}:`, error);
      }
    }
    
   

    const notesDeFrais = charges
      .filter(c => c.categorie.toLowerCase().includes('frais') || c.categorie.toLowerCase().includes('note'))
      .reduce((sum, c) => sum + c.montant, 0);

    const coutDeReviens = charges
      .filter(c => c.categorie.toLowerCase().includes('revient') || c.categorie.toLowerCase().includes('coût'))
      .reduce((sum, c) => sum + c.montant, 0);

    const maintenance = charges
      .filter(c => c.categorie.toLowerCase().includes('maintenance') || c.categorie.toLowerCase().includes('réparation'))
      .reduce((sum, c) => sum + c.montant, 0);

    const autres = charges
      .filter(c => 
        !c.categorie.toLowerCase().includes('salaire') &&
        !c.categorie.toLowerCase().includes('frais') &&
        !c.categorie.toLowerCase().includes('revient') &&
        !c.categorie.toLowerCase().includes('maintenance')
      )
      .reduce((sum, c) => sum + c.montant, 0);

    // Calculs financiers
    const totalCharges = chargesDeductibles + chargesNonDeductibles + chargesPartielles;
    
    // Afficher les détails des ventes de l'entreprise
    if (ventes.length > 0) {
     
    }
    
    // Récupérer les sessions TimerSession terminées de la semaine
    const timerSessions = await TimerSession.find({
      company: companyId,
      statut: 'termine',
      createdAt: {
        $gte: startOfWeek,
        $lte: endOfWeek
      }
    }).populate('vehicle', 'nom tarifParMinute');
    
    // Calculer le CA des timers
    const chiffreAffairesTimers = timerSessions.reduce((sum, session) => sum + (session.coutCalcule || 0), 0);
    
    // CA total = ventes (déjà calculé selon le mode) + timers
    const chiffreAffaires = chiffreAffairesVentes + chiffreAffairesTimers;
    const ventesClients = chiffreAffaires;
    const ventesPartenaires = 0;
    
    console.log(`💰 CA Timers: $${chiffreAffairesTimers}`);
    console.log(`💰 CA TOTAL: $${chiffreAffaires}`);
  
    
    

    // Calculs du bilan
    const chargesRecurrentes = charges
      .filter(c => c.recurrente)
      .reduce((sum, c) => sum + c.montant, 0);

    // Calcul selon la formule demandée : CA (marges) - salaires (vendeurs + charges salaires) - charges déductibles - impôts = bénéfice net
    const totalSalaires = salaires + totalSalairesVendeurs;
    const beneficeBrutImposable = Math.max(0, chiffreAffaires - totalSalaires - totalChargesDeductibles);
    
    // Utiliser les paliers d'imposition progressifs configurés dans l'entreprise
    const taxBrackets = company.taxBrackets || [];
    const calculImpots = calculateProgressiveTax(beneficeBrutImposable, taxBrackets);
    
    console.log('💰 Bénéfice brut imposable:', beneficeBrutImposable);
    console.log('📊 Paliers d\'imposition:', taxBrackets.length > 0 ? `${taxBrackets.length} paliers` : 'Aucun (taux fixe 25%)');
    console.log('💸 Impôts calculés:', calculImpots.impotTotal, `(taux effectif: ${calculImpots.tauxEffectif}%)`);
    
    const impots = calculImpots.impotTotal;
    const beneficeNet = calculImpots.beneficeNetApresImpot;
    
    // Calcul des dividendes et primes basés sur la répartition configurée dans l'entreprise
    const taxDistribution = company.taxDistribution || { primes: 10, dividendes: 30, tresorerie: 60, ville: 0 };
    
    const primes = beneficeNet > 0 ? Math.round(beneficeNet * (taxDistribution.primes / 100)) : 0;
    const dividendes = beneficeNet > 0 ? Math.round(beneficeNet * (taxDistribution.dividendes / 100)) : 0;
    const villeGerance = beneficeNet > 0 ? Math.round(beneficeNet * (taxDistribution.ville / 100)) : 0;
    const tresorerie = beneficeNet > 0 ? Math.round(beneficeNet * (taxDistribution.tresorerie / 100)) : 0;
    
  

    const financialData = {
      // Chiffre d'affaire
      chiffreAffaire: {
        salairesEtNotesDeFrais: totalSalaires + notesDeFrais,
        salaires: totalSalaires, // Inclut salaires charges + salaires vendeurs calculés
        notesDeFrais: notesDeFrais,
        chargesDeductibles: chargesDeductibles + chargesPartielles,
        coutDeReviens: coutDeReviens,
        chargesRecurrentes: chargesRecurrentes,
        beneficeBrutImposable: beneficeBrutImposable,
        impots: impots,
        beneficeNet: beneficeNet,
        primes: primes,
        dividendes: dividendes,
        villeGerance: villeGerance,
        tresorerie: tresorerie
      },
      // Charges
      charges: {
        chargesNonDeductibles: chargesNonDeductibles,
        chargesDeductibles: chargesDeductibles + chargesPartielles
      },
      // Ventes
      ventes: {
        ventesClients: ventesClients,
        ventesPartenaires: ventesPartenaires
      },
      // Détail des charges par catégorie
      detailCharges: {
        salaires,
        notesDeFrais,
        maintenance,
        autres,
        total: totalCharges
      },
      // Détails des salaires par employé
      detailsSalaires: detailsSalaires,
      // Informations de l'entreprise
      company: {
        name: company?.name || 'Entreprise',
        pdg: company?.pdg || 'Non défini',
        nombreEmployes: company?.nombreEmployes || 0
      },
      // Configuration de répartition des taxes
      taxDistribution: taxDistribution,
      // Détails du calcul d'impôts
      calculImpots: {
        beneficeBrut: calculImpots.beneficeBrut,
        impotTotal: calculImpots.impotTotal,
        tauxEffectif: calculImpots.tauxEffectif,
        beneficeNetApresImpot: calculImpots.beneficeNetApresImpot,
        detailCalcul: calculImpots.detailCalcul
      }
    };

    res.json({ success: true, data: financialData });
  } catch (error) {
    console.error('Erreur lors du calcul des données financières:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// GET - Calculer le bilan hebdomadaire avec plafonnement des salaires
router.get('/hebdomadaire', async (req, res) => {
  try {
    const { companyId, week, year } = req.query;
    
    if (!companyId) {
      return res.status(400).json({ message: 'ID de l\'entreprise requis' });
    }



    // Calculer les dates de début et fin de semaine
    const weekNum = parseInt(week) || new Date().getWeek();
    const yearNum = parseInt(year) || new Date().getFullYear();
    
    // Fonction pour calculer le début de semaine (fuseau horaire français)
    function getStartOfWeek(year, week) {
      const jan4 = new Date(year, 0, 4);
      const startOfWeek = new Date(jan4.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
      startOfWeek.setDate(startOfWeek.getDate() - jan4.getDay() + 1);
      return startOfWeek;
    }

    function getEndOfWeek(year, week) {
      const startOfWeek = getStartOfWeek(year, week);
      const endOfWeek = new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000);
      endOfWeek.setHours(23, 59, 59, 999);
      return endOfWeek;
    }

    const startOfWeek = getStartOfWeek(yearNum, weekNum);
    const endOfWeek = getEndOfWeek(yearNum, weekNum);

 

    // Récupérer toutes les ventes de la semaine
    // Ajuster les dates pour le fuseau horaire français
    const startOfWeekUTC = new Date(startOfWeek.getTime() - (1 * 60 * 60 * 1000));
    const endOfWeekUTC = new Date(endOfWeek.getTime() - (1 * 60 * 60 * 1000));
    
    console.log('📅 [Bilans Hebdo] Filtrage ventes:', {
      startOfWeek: startOfWeek.toISOString(),
      endOfWeek: endOfWeek.toISOString(),
      startOfWeekUTC: startOfWeekUTC.toISOString(),
      endOfWeekUTC: endOfWeekUTC.toISOString()
    });
    
    const ventes = await Vente.find({
      company: companyId,
      dateVente: {
        $gte: startOfWeekUTC,
        $lte: endOfWeekUTC
      }
    }).populate('vendeur', 'socialScore');

    // Récupérer tous les utilisateurs de l'entreprise avec leurs rôles
    const users = await User.find({ company: companyId })
      .populate('role')
      .populate({
        path: 'companies.role',
        model: 'Role'
      });

;

    let totalSalaires = 0;
    let totalCAVersEntreprise = 0;
    let totalChiffreAffaires = 0;

    // Calculer pour chaque employé
    for (const user of users) {
      // Calculer le chiffre d'affaires de l'employé pour cette semaine
      const ventesEmploye = ventes.filter(v => v.vendeur && v.vendeur._id.toString() === user._id.toString());
      const chiffreAffaires = ventesEmploye.reduce((total, vente) => {
        return total + (vente.commission || 0);
      }, 0);

      if (chiffreAffaires > 0) {
        // Récupérer la norme salariale du rôle
        const normeSalariale = user.companies?.[0]?.role?.normeSalariale || user.role?.normeSalariale || 0;
        const socialScore = user.socialScore || 0;

        // Calculer le salaire avec plafonnement
        const salaryResult = calculateEmployeeSalary(chiffreAffaires, normeSalariale, socialScore);

        totalSalaires += salaryResult.salaireCalculeFinal + (user.primes || 0) - (user.avances || 0);
        totalCAVersEntreprise += salaryResult.caVersEntreprise;
        totalChiffreAffaires += chiffreAffaires;

        
      }
    }

    // Calculer les totaux du bilan
    const bilanData = {
      periode: {
        semaine: weekNum,
        annee: yearNum,
        debut: startOfWeek,
        fin: endOfWeek
      },
      chiffreAffaires: {
        total: totalChiffreAffaires,
        salaires: totalSalaires,
        caVersEntreprise: totalCAVersEntreprise,
        caNet: totalChiffreAffaires - totalSalaires
      },
      charges: {
        salaires: totalSalaires,
        total: totalSalaires // Simplifié pour l'exemple
      },
      benefice: totalChiffreAffaires - totalSalaires,
      ventes: {
        nombre: ventes.length,
        details: ventes.length
      }
    };

   

    res.json({
      success: true,
      bilan: bilanData
    });
  } catch (error) {
    console.error('❌ Erreur lors du calcul du bilan hebdomadaire:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur', 
      error: error.message 
    });
  }
});

// GET /bilans/debug-ventes - Route de diagnostic pour vérifier les ventes
router.get('/debug-ventes', auth, async (req, res) => {
  try {
    console.log('🔍 Diagnostic des ventes pour utilisateur:', req.user.id);
    
    // Récupérer toutes les ventes de l'utilisateur
    const Vente = require('../models/Vente');
    const toutesVentes = await Vente.find({ vendeur: req.user.id }).populate('company', 'name');
    
    console.log('💰 Toutes les ventes de l\'utilisateur:', toutesVentes.length);
    
    const ventesParEntreprise = {};
    toutesVentes.forEach(vente => {
      const companyId = vente.company._id.toString();
      const companyName = vente.company.name;
      
      if (!ventesParEntreprise[companyId]) {
        ventesParEntreprise[companyId] = {
          companyName,
          ventes: []
        };
      }
      
      ventesParEntreprise[companyId].ventes.push({
        numeroCommande: vente.numeroCommande,
        dateVente: vente.dateVente,
        totalCommission: vente.totalCommission
      });
    });
    
    console.log('📊 Ventes par entreprise:', ventesParEntreprise);
    
    res.json({
      success: true,
      data: {
        utilisateur: {
          id: req.user.id,
          company: req.user.company,
          currentCompany: req.user.currentCompany
        },
        totalVentes: toutesVentes.length,
        ventesParEntreprise
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur diagnostic ventes:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du diagnostic des ventes',
      error: error.message
    });
  }
});

module.exports = router;
