const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Facture = require('../models/Facture');
const Partenariat = require('../models/Partenariat');
const Company = require('../models/Company');
const auth = require('../middleware/auth');
const axios = require('axios');
const puppeteer = require('puppeteer');

// Fonction pour générer le numéro de semaine selon ISO 8601
function generateWeekNumber() {
  const now = new Date();
  const year = now.getFullYear();
  
  // Premier jeudi de l'année
  const firstThursday = new Date(year, 0, 4);
  const dayOfWeek = firstThursday.getDay();
  const daysToAdd = dayOfWeek === 0 ? 4 : 4 - dayOfWeek;
  firstThursday.setDate(firstThursday.getDate() + daysToAdd);
  
  // Calculer le nombre de semaines depuis le premier jeudi
  const weekNumber = Math.floor((now - firstThursday) / (7 * 24 * 60 * 60 * 1000)) + 1;
  
  return Math.max(1, Math.min(53, weekNumber));
}

// Schéma pour les paramètres globaux de facture
const InvoiceSettings = mongoose.model('InvoiceSettings', new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  configuration: {
    couleurPrimaire: String,
    couleurSecondaire: String,
    couleurAccent: String,
    couleurPrix: String,
    couleurTotal: String,
    couleurFondFacture: String,
    couleurFondLogo: String,
    couleurTitrePrincipal: String,
    couleurAdresseExpediteur: String,
    couleurAdresseDestinataire: String,
    couleurTexteInfos: String,
    couleurBordures: String,
    styleHeader: String,
    positionLogo: String,
    tailleHeader: String,
    afficherAdresse: Boolean,
    adressePersonnalisee: String,
    titrePersonnalise: String,
    adresseExpediteurPersonnalisee: String,
    styleTableau: String,
    borduresTableau: Boolean,
    template: String,
    footer: {
      afficher: Boolean,
      texte: String,
      couleur: String,
      taille: String
    },
    logo: String
  },
  dateCreation: { type: Date, default: Date.now },
  dateModification: { type: Date, default: Date.now }
}));

// Middleware pour vérifier l'authentification sur toutes les routes
router.use(auth);

// GET - Récupérer toutes les factures d'une entreprise
router.get('/', async (req, res) => {
  try {
    const { companyId, statut, page = 1, limit = 20, week, year } = req.query;
    
    if (!companyId) {
      return res.status(400).json({ message: 'ID de l\'entreprise requis' });
    }

    const filter = { company: companyId };
    if (statut) filter.statut = statut;

    // Filtre par semaine si spécifié (calcul ISO 8601 correct)
    if (week && year) {
      const weekNum = parseInt(week);
      const yearNum = parseInt(year);
      
      // Calcul ISO 8601 correct - même logique que le frontend
      const jan1 = new Date(yearNum, 0, 1);
      const jan1Day = jan1.getDay() || 7; // Dimanche = 7, Lundi = 1
      
      // Calculer le premier jeudi de l'année
      const firstThursday = new Date(jan1);
      if (jan1Day <= 4) {
        // Si le 1er janvier est lundi, mardi, mercredi ou jeudi
        firstThursday.setDate(jan1.getDate() + (4 - jan1Day));
      } else {
        // Si le 1er janvier est vendredi, samedi ou dimanche
        firstThursday.setDate(jan1.getDate() + (11 - jan1Day));
      }
      
      // Le lundi de la semaine 1 est 3 jours avant le premier jeudi
      const firstMonday = new Date(firstThursday);
      firstMonday.setDate(firstThursday.getDate() - 3);
      
      // Début de la semaine demandée
      const weekStart = new Date(firstMonday);
      weekStart.setDate(firstMonday.getDate() + (weekNum - 1) * 7);
      
      // Fin de la semaine (dimanche)
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      console.log(`🗓️ Filtre semaine backend (Factures) - S${weekNum} ${yearNum}:`, {
        weekStart: weekStart.toLocaleDateString('fr-FR'),
        weekEnd: weekEnd.toLocaleDateString('fr-FR'),
        startISO: weekStart.toISOString(),
        endISO: weekEnd.toISOString()
      });

      filter.createdAt = {
        $gte: weekStart,
        $lte: weekEnd
      };
    }

    const factures = await Facture.find(filter)
      .populate('partenariat', 'nom entreprisePartenaire')
      .populate('company', 'name logo pdg compteBancaire')
      .populate('createdBy', 'firstName lastName username')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Facture.countDocuments(filter);

    res.json({
      success: true,
      factures,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des factures:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

// GET - Récupérer une facture par ID
router.get('/:id', async (req, res) => {
  try {
    const facture = await Facture.findById(req.params.id)
      .populate('partenariat', 'nom entreprisePartenaire')
      .populate('entrepriseEmettrice', 'name logo pdg compteBancaire')
      .populate('creePar', 'firstName lastName username');

    if (!facture) {
      return res.status(404).json({ success: false, message: 'Facture non trouvée' });
    }

    res.json({ success: true, facture });
  } catch (error) {
    console.error('Erreur lors de la récupération de la facture:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

// GET - Récupérer les partenariats d'une entreprise pour le menu déroulant
router.get('/partenariats/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    
    const partenariats = await Partenariat.find({ 
      company: companyId, 
      statut: 'actif' 
    }).select('nom entreprisePartenaire');

    res.json({ success: true, partenariats });
  } catch (error) {
    console.error('Erreur lors de la récupération des partenariats:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

// GET - Récupérer les informations d'une entreprise pour l'affichage de facture
router.get('/company-info/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Entreprise non trouvée' });
    }

    res.json({
      success: true,
      company: {
        _id: company._id,
        name: company.name,
        logo: company.logo,
        pdg: company.pdg,
        compteBancaire: company.compteBancaire,
        description: company.description
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des informations d\'entreprise:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Obtenir les données sauvegardées pour un partenariat spécifique
router.get('/partenariat-data/:partenaritId', async (req, res) => {
  try {
    const { partenaritId } = req.params;
    
    // Chercher la dernière facture pour ce partenariat
    const facture = await Facture.findOne({ 
      partenariat: partenaritId 
    }).sort({ createdAt: -1 });

    if (!facture) {
      return res.json({ success: false, message: 'Aucune donnée sauvegardée' });
    }

    res.json({
      success: true,
      facture: {
        articles: facture.articles,
        configuration: facture.configuration,
        notes: facture.notes
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des données du partenariat:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET - Statistiques des factures
router.get('/stats/overview', async (req, res) => {
  try {
    const { companyId } = req.query;
    
    if (!companyId) {
      return res.status(400).json({ message: 'ID de l\'entreprise requis' });
    }

    const stats = await Facture.aggregate([
      { $match: { company: mongoose.Types.ObjectId(companyId) } },
      {
        $group: {
          _id: '$statut',
          count: { $sum: 1 },
          total: { $sum: '$montantTTC' }
        }
      }
    ]);

    const chiffreAffaires = await Facture.aggregate([
      { 
        $match: { 
          company: mongoose.Types.ObjectId(companyId),
          type: 'emission',
          statut: 'payee'
        } 
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$montantTTC' }
        }
      }
    ]);

    res.json({
      parStatut: stats,
      chiffreAffaires: chiffreAffaires[0]?.total || 0
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// POST - Créer une nouvelle facture et l'envoyer au webhook Discord
router.post('/', async (req, res) => {
  try {
    const factureData = {
      ...req.body,
      createdBy: req.user.id // Correction: utiliser createdBy au lieu de creePar
    };

    // Validation des champs requis
    if (!factureData.dateEmission) {
      factureData.dateEmission = new Date();
    }

    // Générer un numéro de facture si pas fourni
    if (!factureData.numero) {
      factureData.numero = await Facture.generateNumero(factureData.company, factureData.type || 'emission');
    }

    // Valeurs par défaut pour le type si non fourni
    if (!factureData.type) {
      factureData.type = 'emission';
    }

    let partenariat = null;
    // Récupérer les informations du partenariat avec le webhook
    if (factureData.partenariat) {
      partenariat = await Partenariat.findById(factureData.partenariat);
      if (partenariat) {
        factureData.destinataire = {
          nom: partenariat.nom,
          entreprise: partenariat.entreprisePartenaire
        };
      }
    }

    // Calculer automatiquement la date d'échéance (5 jours après création)
    if (!factureData.dateEcheance) {
      const dateEcheance = new Date();
      dateEcheance.setDate(dateEcheance.getDate() + 5);
      factureData.dateEcheance = dateEcheance;
    }

   
    
    if (factureData.configuration) {
      
    }

    const facture = new Facture(factureData);
    await facture.save();

    const populatedFacture = await Facture.findById(facture._id)
      .populate('partenariat', 'nom entreprisePartenaire webhookDiscord')
      .populate('entrepriseEmettrice', 'name logo pdg compteBancaire')
      .populate('createdBy', 'firstName lastName username');
    
    // Ajouter la configuration à la facture populée
    populatedFacture.configuration = factureData.configuration;
    
    
    if (populatedFacture.configuration) {
     
    }

    // Envoyer au webhook Discord si le partenariat a un webhook
    if (partenariat && partenariat.webhookDiscord) {
      try {
        await sendInvoiceToDiscord(populatedFacture, partenariat.webhookDiscord);
        
      } catch (webhookError) {
        console.error('❌ Erreur lors de l\'envoi au webhook Discord:', webhookError);
        // Ne pas faire échouer la création de facture si le webhook échoue
      }
    }

    res.status(201).json({ success: true, facture: populatedFacture });
  } catch (error) {
    console.error('Erreur lors de la création de la facture:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

// PUT - Mettre à jour une facture
router.put('/:id', async (req, res) => {
  try {
    const factureData = req.body;

    const facture = await Facture.findByIdAndUpdate(
      req.params.id,
      factureData,
      { new: true, runValidators: true }
    ).populate('partenariat', 'nom entreprisePartenaire')
     .populate('entrepriseEmettrice', 'name logo pdg compteBancaire')
     .populate('creePar', 'firstName lastName username');

    if (!facture) {
      return res.status(404).json({ success: false, message: 'Facture non trouvée' });
    }

    res.json({ success: true, facture });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la facture:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

// PUT - Marquer une facture comme envoyée
router.put('/:id/envoyer', async (req, res) => {
  try {
    const facture = await Facture.findById(req.params.id);
    
    if (!facture) {
      return res.status(404).json({ success: false, message: 'Facture non trouvée' });
    }

    await facture.marquerEnvoyee();
    
    res.json({ success: true, message: 'Facture marquée comme envoyée' });
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la facture:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

// PUT - Marquer une facture comme payée
router.put('/:id/payer', async (req, res) => {
  try {
    const facture = await Facture.findById(req.params.id);
    
    if (!facture) {
      return res.status(404).json({ success: false, message: 'Facture non trouvée' });
    }

    await facture.marquerPayee();
    
    res.json({ success: true, message: 'Facture marquée comme payée' });
  } catch (error) {
    console.error('Erreur lors du paiement de la facture:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

// GET - Télécharger une facture en PDF
router.get('/:id/download', async (req, res) => {
  try {
    const facture = await Facture.findById(req.params.id)
      .populate('partenariat', 'nom entreprisePartenaire')
      .populate('company', 'name logo pdg compteBancaire')
      .populate('createdBy', 'firstName lastName username');

    if (!facture) {
      return res.status(404).json({ success: false, message: 'Facture non trouvée' });
    }

    // Récupérer la configuration globale si elle existe
    try {
      const settings = await InvoiceSettings.findOne({ companyId: facture.company });
      if (settings && settings.configuration) {
        facture.configuration = settings.configuration;
      }
    } catch (configError) {
      
    }

    // Générer le PDF de la facture
    const pdfBuffer = await generateInvoicePDF(facture);
    
    const filename = `facture_${facture.numero || facture.numeroFacture || 'document'}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Erreur lors du téléchargement de la facture:', error);
    res.status(500).json({ success: false, message: 'Erreur lors du téléchargement', error: error.message });
  }
});

// GET - Voir une facture (aperçu)
router.get('/:id/preview', async (req, res) => {
  try {
    const facture = await Facture.findById(req.params.id)
      .populate('partenariat', 'nom entreprisePartenaire')
      .populate('company', 'name logo pdg compteBancaire')
      .populate('createdBy', 'firstName lastName username');

    if (!facture) {
      return res.status(404).json({ success: false, message: 'Facture non trouvée' });
    }

    // Récupérer la configuration globale si elle existe
    try {
      const settings = await InvoiceSettings.findOne({ companyId: facture.company });
      if (settings && settings.configuration) {
        facture.configuration = settings.configuration;
      
      }
    } catch (configError) {
     
    }

    // Générer le HTML de la facture pour aperçu
    const html = generateInvoiceHTML(facture);
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(html);
  } catch (error) {
    console.error('Erreur lors de l\'aperçu de la facture:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de l\'aperçu', error: error.message });
  }
});

// DELETE - Supprimer une facture
router.delete('/:id', async (req, res) => {
  try {
    const facture = await Facture.findByIdAndDelete(req.params.id);

    if (!facture) {
      return res.status(404).json({ success: false, message: 'Facture non trouvée' });
    }

    res.json({ success: true, message: 'Facture supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la facture:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

// POST - Sauvegarder les paramètres globaux de facture
router.post('/save-global-settings', async (req, res) => {
  try {
    const { companyId, configuration } = req.body;
    
    if (!companyId || !configuration) {
      return res.status(400).json({ success: false, message: 'CompanyId et configuration requis' });
    }

    // Mettre à jour ou créer les paramètres
    const settings = await InvoiceSettings.findOneAndUpdate(
      { companyId },
      { 
        configuration,
        dateModification: new Date()
      },
      { 
        upsert: true, 
        new: true 
      }
    );

    res.json({
      success: true,
      message: 'Paramètres sauvegardés avec succès',
      settings
    });
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des paramètres globaux:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

// GET - Récupérer les paramètres globaux de facture
router.get('/global-settings/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    
    const settings = await InvoiceSettings.findOne({ companyId });
    
    if (!settings) {
      return res.json({ success: false, message: 'Aucun paramètre trouvé' });
    }

    res.json({
      success: true,
      configuration: settings.configuration
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des paramètres globaux:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

function generateInvoiceHTML(facture) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR');
  };

  // Configuration par défaut si pas de configuration
  const config = facture.configuration || {
    couleurPrimaire: '#1e293b',
    couleurSecondaire: '#334155',
    couleurFondFacture: '#ffffff',
    couleurBordures: '#e5e7eb',
    couleurTexteInfos: '#374151',
    couleurTotal: '#ef4444',
    couleurPrix: '#22c55e',
    styleHeader: 'solid',
    positionLogo: 'right',
    tailleHeader: 'medium'
  };
  

  
  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Facture</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #ffffff; margin: 0; padding: 0; }
        .invoice-container { max-width: 800px; margin: 0 auto; background: ${config.couleurFondFacture}; border: 1px solid ${config.couleurBordures}; border-radius: 8px; overflow: hidden; }
        .header { 
          background: ${config.styleHeader === 'gradient' ? `linear-gradient(to right, ${config.couleurPrimaire}, ${config.couleurSecondaire})` : config.couleurPrimaire};
          color: white; 
          padding: ${config.tailleHeader === 'small' ? '16px' : config.tailleHeader === 'medium' ? '24px' : '32px'}; 
          display: flex; 
          justify-content: ${config.positionLogo === 'center' ? 'center' : 'space-between'}; 
          align-items: center;
          ${config.positionLogo === 'center' ? 'flex-direction: column; text-align: center;' : ''}
        }
        .company-info h1 { 
          font-size: ${config.tailleHeader === 'small' ? '24px' : config.tailleHeader === 'medium' ? '30px' : '36px'}; 
          font-weight: bold; 
          color: ${config.couleurTitrePrincipal || '#ffffff'}; 
        }
        .company-info p { margin-top: 8px; opacity: 0.8; color: ${config.couleurAdresseExpediteur || '#ffffff'}; }
        .logo { 
          width: ${config.tailleHeader === 'small' ? '64px' : config.tailleHeader === 'medium' ? '80px' : '96px'}; 
          height: ${config.tailleHeader === 'small' ? '64px' : config.tailleHeader === 'medium' ? '80px' : '96px'}; 
          background: ${config.couleurFondLogo || '#ffffff'}; 
          border-radius: 8px; 
          padding: 8px; 
          ${config.positionLogo === 'center' ? 'margin-bottom: 16px;' : ''}
          ${config.positionLogo === 'left' ? 'margin-right: 24px;' : ''}
        }
        .logo img { width: 100%; height: 100%; object-fit: contain; }
        .price-banner { background: ${config.couleurPrimaire || '#1e293b'}; color: white; text-align: center; padding: 20px; }
        .price-banner h2 { font-size: 32px; font-weight: bold; color: ${config.couleurTotal || '#ef4444'}; }
        .price-banner p { font-size: 18px; margin-top: 8px; opacity: 0.9; }
        .invoice-details { padding: 32px; background: ${config.couleurFondFacture || '#ffffff'}; }
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px; }
        .details-section p { margin-bottom: 4px; color: ${config.couleurTexteInfos || '#374151'}; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 32px; border: 2px solid ${config.couleurBorduresTableau || config.couleurBordures || '#e5e7eb'}; }
        .items-table th { background: ${config.couleurFondEnTetes || config.couleurPrimaire || '#1e293b'}; color: ${config.couleurTexteEnTetes || 'white'}; padding: 12px; text-align: left; border: 1px solid ${config.couleurBorduresTableau || config.couleurBordures || '#e5e7eb'}; }
        .items-table td { padding: 12px; border: 1px solid ${config.couleurBorduresTableau || config.couleurBordures || '#e5e7eb'}; color: #000000; }
        .items-table .price-cell { color: ${config.couleurPrix || '#22c55e'}; font-weight: 600; }
        .total-section { text-align: right; font-size: 18px; font-weight: bold; color: ${config.couleurTotal || '#ef4444'}; margin-bottom: 20px; }
        .footer { background: ${config.couleurFondFooter || '#f3f4f6'}; text-align: center; padding: 20px; }
        .header-content { 
          display: flex; 
          ${config.positionLogo === 'center' ? 'flex-direction: column; align-items: center;' : config.positionLogo === 'left' ? 'flex-direction: row; align-items: center;' : 'justify-content: space-between; align-items: center;'}
          width: 100%;
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <div class="header-content">
            ${config.positionLogo === 'left' && config.logo ? `
              <div class="logo">
                <img src="${config.logo}" alt="Logo" />
              </div>
            ` : ''}
            
            ${config.positionLogo === 'center' && config.logo ? `
              <div class="logo">
                <img src="${config.logo}" alt="Logo" />
              </div>
            ` : ''}
            
            <div class="company-info" ${config.positionLogo === 'center' ? '' : 'style="flex: 1;"'}>
              <h1>${config.titrePersonnalise}™</h1>
              ${(config.adresseExpediteurPersonnalisee || config.adressePersonnalisee) ? `
                <div style="margin-top: 8px; opacity: 0.8; color: ${config.couleurAdresseExpediteur};">
                  ${(config.adresseExpediteurPersonnalisee || config.adressePersonnalisee || '').replace(/\n/g, '<br>')}
                </div>
              ` : `
                <div style="margin-top: 8px; opacity: 0.8; color: ${config.couleurAdresseExpediteur};">
                  ${config.adressePersonnalisee || ''}
                </div>
              `}
            </div>
            
            ${config.positionLogo === 'right' && config.logo ? `
              <div class="logo">
                <img src="${config.logo}" alt="Logo" />
              </div>
            ` : ''}
          </div>
        </div>

        <div class="price-banner">
          <h2>${formatCurrency(facture.montantTTC || facture.montantTotal)}</h2>
          <p style="font-size: 14px; margin-top: 5px;">S${generateWeekNumber()}</p>
        </div>

        <div class="invoice-details">
          <div class="details-grid">
            <div class="details-section">
              <p style="color: ${config.couleurAdresseDestinataire};"><strong>Destinataire:</strong> ${facture.client?.nom || facture.destinataire?.entreprise}</p>
              <p style="color: ${config.couleurAdresseDestinataire};"><strong>Payable à:</strong> ${facture.payableA || ''}</p>
            </div>
            <div class="details-section">
              <p style="color: ${config.couleurTexteInfos};"><strong>N° de compte:</strong> ${facture.numeroCompte}</p>
              <p style="color: ${config.couleurTexteInfos};"><strong>Projet:</strong> ${facture.notes || facture.projet}</p>
              <p style="color: ${config.couleurTexteInfos};"><strong>Date d'échéance:</strong> ${facture.dateEcheance ? formatDate(facture.dateEcheance) : ''}</p>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: center;">Quantité</th>
                <th style="text-align: center;">Prix unitaire</th>
                <th style="text-align: center;">Prix total</th>
              </tr>
            </thead>
            <tbody>
              ${facture.articles?.map(article => `
                <tr>
                  <td>${article.designation || article.description}</td>
                  <td style="text-align: center;">${article.quantite}</td>
                  <td style="text-align: center;">${formatCurrency(article.prixUnitaire)}</td>
                  <td style="text-align: center;" class="price-cell">${formatCurrency(article.total || article.prixTotal)}</td>
                </tr>
              `).join('') || ''}
            </tbody>
          </table>

          <div class="total-section">
            <p>Total: ${formatCurrency(facture.montantTTC || facture.montantTotal)}</p>
          </div>
        </div>

        ${config.footer?.afficher ? `
          <div class="footer">
            <p style="color: ${config.footer?.couleur};">${config.footer?.texte}</p>
          </div>
        ` : ''}
      </div>
    </body>
    </html>
  `;
}

// Fonction pour générer un PDF de la facture
async function generateInvoicePDF(facture) {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-default-apps',
      '--disable-hang-monitor',
      '--disable-prompt-on-repost',
      '--disable-sync',
      '--disable-translate',
      '--disable-ipc-flooding-protection',
      '--single-process',
      '--no-zygote',
      '--no-first-run'
    ],
    executablePath: process.env.CHROME_BIN || undefined,
    ignoreDefaultArgs: ['--disable-extensions'],
    timeout: 60000
  });
  
  try {
    const page = await browser.newPage();
    
    // Définir la taille de la page
    await page.setViewport({ width: 1200, height: 1600 });
    
    const html = generateInvoiceHTML(facture);
   
    
    await page.setContent(html, { 
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 60000
    });
    
    // Attendre que les images soient chargées
    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images, img => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve, reject) => {
            img.addEventListener('load', resolve);
            img.addEventListener('error', reject);
            setTimeout(reject, 10000); // Timeout après 10s
          });
        })
      );
    });
    
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: false,
      margin: {
        top: '15mm',
        right: '15mm',
        bottom: '15mm',
        left: '15mm'
      }
    });
    
    
    return pdf;
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Fonction pour convertir HTML en PNG avec Canvas
async function generateInvoicePNG(facture) {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--force-color-profile=srgb',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-default-apps',
      '--disable-hang-monitor',
      '--disable-prompt-on-repost',
      '--disable-sync',
      '--disable-translate',
      '--disable-ipc-flooding-protection',
      '--single-process',
      '--no-zygote',
      '--no-first-run'
    ],
    executablePath: process.env.CHROME_BIN || undefined,
    ignoreDefaultArgs: ['--disable-extensions'],
    timeout: 60000
  });
  
  try {
    const page = await browser.newPage();
    
    // Forcer le rendu des couleurs et images
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    });
    
    const html = generateInvoiceHTML(facture);
    
    
    await page.setContent(html, { 
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 30000
    });
    
    await page.setViewport({ 
      width: 800, 
      height: 1200,
      deviceScaleFactor: 2 // Meilleure qualité
    });
    
    // Attendre que toutes les images soient chargées
    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images, img => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve, reject) => {
            img.addEventListener('load', resolve);
            img.addEventListener('error', reject);
          });
        })
      );
    });
    
    // Calculer la hauteur réelle du contenu sans padding supplémentaire
    const contentHeight = await page.evaluate(() => {
      const container = document.querySelector('.invoice-container');
      if (container) {
        return container.offsetHeight; // Pas de padding supplémentaire
      }
      return Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.clientHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight
      );
    });
    
    
    
    const screenshot = await page.screenshot({
      type: 'png',
      clip: {
        x: 0,
        y: 0,
        width: 800,
        height: Math.min(contentHeight, 1500) // Réduire la hauteur max
      },
      omitBackground: false
    });
    
    return screenshot;
  } finally {
    await browser.close();
  }
}

// Fonction pour envoyer la facture au webhook Discord
async function sendInvoiceToDiscord(facture, webhookUrl) {
  try {
    const factureNumber = facture.numero || facture.numeroFacture || 'INCONNUE';
    
    
    // Récupérer la configuration sauvegardée depuis la base de données
    if (!facture.configuration && facture.entrepriseEmettrice) {
      try {
        const GlobalSettings = require('../models/GlobalSettings');
        const globalSettings = await GlobalSettings.findOne({ 
          companyId: facture.entrepriseEmettrice._id || facture.entrepriseEmettrice 
        });
        
        if (globalSettings) {
          facture.configuration = globalSettings.configuration;
          
        }
      } catch (configError) {
        
      }
    }
    
    // Générer l'image PNG de la facture
    let pngBuffer;
    try {
      pngBuffer = await generateInvoicePNG(facture);
    } catch (puppeteerError) {
      console.error('❌ Erreur Puppeteer:', puppeteerError.message);
      
      // Fallback : envoyer un message sans image si Puppeteer échoue
      const fallbackEmbed = {
        title: `Facture ${facture.partenariat?.nom || facture.partenariat?.entreprisePartenaire || 'PARTENARIAT'}`,
        description: `Bonjour! Voici la facture de la semaine, bonne semaine!\n\n**⚠️ Aperçu visuel indisponible** - Erreur de génération d'image sur le serveur.`,
        color: parseInt((facture.configuration?.couleurPrimaire || '#1e293b').replace('#', ''), 16),
        fields: [
          {
            name: 'Numéro de facture',
            value: factureNumber,
            inline: true
          },
          {
            name: 'Montant total',
            value: `$${facture.montantTTC?.toFixed(2) || '0.00'}`,
            inline: true
          },
          {
            name: 'Date d\'échéance',
            value: facture.dateEcheance ? new Date(facture.dateEcheance).toLocaleDateString('fr-FR') : 'Non définie',
            inline: true
          }
        ],
        footer: {
          text: `Créée par Snow Way • Entreprise • Today at ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
        }
      };
      
      // Envoyer seulement l'embed sans image
      const fallbackResponse = await axios.post(webhookUrl, {
        embeds: [fallbackEmbed]
      });
      
      console.log('✅ Facture envoyée à Discord (mode fallback sans image)');
      return fallbackResponse.data;
    }
    
    // Créer le FormData pour l'envoi
    const FormData = require('form-data');
    const form = new FormData();
    
    // Ajouter l'image
    form.append('file', pngBuffer, {
      filename: `facture_${factureNumber}.png`,
      contentType: 'image/png'
    });
    
    // Créer l'embed Discord simple
    const embed = {
      title: `Facture ${facture.partenariat?.nom || facture.partenariat?.entreprisePartenaire || 'PARTENARIAT'}`,
      description: `Bonjour! Voici la facture de la semaine, bonne semaine!`,
      color: parseInt((facture.configuration?.couleurPrimaire || '#1e293b').replace('#', ''), 16),
      image: {
        url: `attachment://facture_${factureNumber}.png`
      },
      footer: {
        text: `Créée par Snow Way • Entreprise • Today at ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
      }
    };
    
    // Ajouter l'embed au payload
    form.append('payload_json', JSON.stringify({
      embeds: [embed]
    }));
    
    // Envoyer au webhook Discord
    const response = await axios.post(webhookUrl, form, {
      headers: {
        ...form.getHeaders()
      }
    });
    
    
    return response.data;
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi au webhook Discord:', error.message);
    throw error;
  }
}

module.exports = router;
