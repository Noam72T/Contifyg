const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Route pour diagnostiquer et nettoyer les doublons Liberty Walk
router.get('/debug-liberty-walk', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    // Vérifier que c'est un Technicien
    if (user.systemRole !== 'Technicien') {
      return res.status(403).json({ message: 'Accès refusé - Technicien requis' });
    }

  
    
    // Trouver toutes les entreprises Liberty Walk
    const libertyWalkCompanies = await Company.find({
      name: { $regex: /liberty.*walk/i }
    });
    
    
    
    const results = [];
    
    for (let company of libertyWalkCompanies) {
     
      
      // Chercher les utilisateurs assignés (ancien système)
      const usersOldSystem = await User.find({ company: company._id });
      
      // Chercher les utilisateurs assignés (nouveau système)
      const usersNewSystem = await User.find({ 'companies.company': company._id });
      
      const companyInfo = {
        id: company._id.toString(),
        name: company.name,
        description: company.description || 'Aucune',
        category: company.category || 'Aucune',
        createdAt: company.createdAt,
        membersInCompany: company.members ? company.members.length : 0,
        usersOldSystem: usersOldSystem.length,
        usersNewSystem: usersNewSystem.length,
        totalUsers: usersOldSystem.length + usersNewSystem.length,
        usersList: [
          ...usersOldSystem.map(u => ({ username: u.username, system: 'old' })),
          ...usersNewSystem.map(u => ({ username: u.username, system: 'new' }))
        ]
      };
      
      results.push(companyInfo);
      
      
    }
    
    // Déterminer quelle est la bonne entreprise
    const goodCompany = results.find(c => c.totalUsers > 0) || results[0];
    const duplicates = results.filter(c => c.id !== goodCompany.id);
    
    res.json({
      success: true,
      totalFound: results.length,
      companies: results,
      recommendation: {
        keepCompany: goodCompany,
        deleteCompanies: duplicates,
        hasDuplicates: duplicates.length > 0
      }
    });
    
  } catch (error) {
    console.error('Erreur debug Liberty Walk:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Route pour migrer automatiquement Liberty Walk #2 vers #1
router.post('/migrate-liberty-walk', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    // Vérifier que c'est un Technicien
    if (user.systemRole !== 'Technicien') {
      return res.status(403).json({ message: 'Accès refusé - Technicien requis' });
    }

    
    
    // Trouver toutes les entreprises Liberty Walk
    const libertyWalkCompanies = await Company.find({
      name: { $regex: /liberty.*walk/i }
    }).sort({ createdAt: 1 }); // Trier par date de création
    
    if (libertyWalkCompanies.length !== 2) {
      return res.status(400).json({ 
        message: `Erreur: Trouvé ${libertyWalkCompanies.length} entreprises Liberty Walk, attendu 2` 
      });
    }
    
    const company1 = libertyWalkCompanies[0]; // La première (destination)
    const company2 = libertyWalkCompanies[1]; // La deuxième (source à migrer)
    
    
    
    let migratedUsers = 0;
    
    // Migrer ancien système (users.company)
    const usersOldSystem = await User.find({ company: company2._id });
    for (let userDoc of usersOldSystem) {
    
      userDoc.company = company1._id;
      await userDoc.save();
      migratedUsers++;
    }
    
    // Migrer nouveau système (users.companies array)
    const usersNewSystem = await User.find({ 'companies.company': company2._id });
    for (let userDoc of usersNewSystem) {
     
      
      // Remplacer l'ID de l'entreprise dans le tableau
      userDoc.companies = userDoc.companies.map(c => 
        c.company.toString() === company2._id.toString() 
          ? { ...c, company: company1._id } 
          : c
      );
      
      // Mettre à jour currentCompany si nécessaire
      if (userDoc.currentCompany && userDoc.currentCompany.toString() === company2._id.toString()) {
        userDoc.currentCompany = company1._id;
      }
      
      await userDoc.save();
      migratedUsers++;
    }
    
    // Migrer les membres de l'entreprise #2 vers #1
    if (company2.members && company2.members.length > 0) {
    
      for (let member of company2.members) {
        // Vérifier si ce membre n'est pas déjà dans company1
        const existingMember = company1.members.find(m => 
          m.user.toString() === member.user.toString()
        );
        
        if (!existingMember) {
          company1.members.push(member);
       
        }
      }
      await company1.save();
    }
    
    // Copier les informations manquantes de company2 vers company1
    let updated = false;
    if (!company1.description && company2.description) {
      company1.description = company2.description;
      updated = true;
     
    }
    
    if (!company1.category && company2.category) {
      company1.category = company2.category;
      updated = true;
     
    }
    
    if (updated) {
      await company1.save();
    }
    
    // Supprimer l'entreprise #2
  
    await Company.findByIdAndDelete(company2._id);
    
    
    res.json({
      success: true,
      message: `Migration terminée. ${migratedUsers} utilisateurs migrés de "${company2.name}" vers "${company1.name}".`,
      migratedUsers,
      sourceCompany: { id: company2._id, name: company2.name },
      destinationCompany: { id: company1._id, name: company1.name }
    });
    
  } catch (error) {
    console.error('Erreur migration Liberty Walk:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

module.exports = router;
