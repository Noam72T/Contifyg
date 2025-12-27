const mongoose = require('mongoose');
const User = require('./models/User');
const { v4: uuidv4 } = require('uuid');

async function autoLinkAccounts() {
  try {
    console.log('========================================');
    console.log('  LIAISON AUTOMATIQUE DES COMPTES');
    console.log('========================================');

    // Connexion à MongoDB
    console.log('\n🔄 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/compta');
    console.log('✅ Connecté à MongoDB');

    // Récupérer tous les utilisateurs
    const users = await User.find({}).select('username firstName lastName accountFamilyId createdAt');

    console.log(`\n📋 ${users.length} utilisateurs trouvés`);

    // Grouper les utilisateurs par critères de liaison potentielle
    const potentialGroups = {};

    users.forEach(user => {
      // Critère de regroupement : même prénom ET même nom
      const groupKey = `${user.firstName?.toLowerCase()}_${user.lastName?.toLowerCase()}`;
      
      if (!potentialGroups[groupKey]) {
        potentialGroups[groupKey] = [];
      }
      potentialGroups[groupKey].push(user);
    });

    console.log('\n🔍 Analyse des groupes potentiels:');
    console.log('─'.repeat(80));

    let groupsToLink = [];

    Object.entries(potentialGroups).forEach(([groupKey, members]) => {
      if (members.length > 1) {
        console.log(`\n👥 Groupe "${groupKey}" (${members.length} membres):`);
        
        // Vérifier les familyId existants
        const familyIds = [...new Set(members.map(m => m.accountFamilyId).filter(Boolean))];
        
        members.forEach(member => {
          console.log(`  • ${member.username} (${member.firstName} ${member.lastName})`);
          console.log(`    FamilyId: ${member.accountFamilyId || 'AUCUN'}`);
        });

        if (familyIds.length === 0) {
          console.log(`  💡 Aucun familyId existant - nouveau familyId sera créé`);
          groupsToLink.push({ groupKey, members, action: 'create_new' });
        } else if (familyIds.length === 1) {
          const hasMembersWithoutFamily = members.some(m => !m.accountFamilyId);
          if (hasMembersWithoutFamily) {
            console.log(`  💡 Certains membres sans familyId - utiliser ${familyIds[0]}`);
            groupsToLink.push({ groupKey, members, action: 'use_existing', familyId: familyIds[0] });
          } else {
            console.log(`  ✅ Tous les membres ont déjà le même familyId`);
          }
        } else {
          console.log(`  ⚠️  FamilyIds multiples détectés: ${familyIds.join(', ')}`);
          console.log(`  💡 Utiliser le premier familyId: ${familyIds[0]}`);
          groupsToLink.push({ groupKey, members, action: 'merge_families', familyId: familyIds[0] });
        }
      }
    });

    if (groupsToLink.length === 0) {
      console.log('\n✅ Aucune liaison automatique nécessaire');
      return;
    }

    console.log(`\n🔗 ${groupsToLink.length} groupe(s) à traiter:`);
    console.log('─'.repeat(80));

    for (const group of groupsToLink) {
      console.log(`\n🔄 Traitement du groupe "${group.groupKey}":`);
      
      let targetFamilyId;
      
      if (group.action === 'create_new') {
        targetFamilyId = uuidv4();
        console.log(`  🆕 Nouveau familyId créé: ${targetFamilyId}`);
      } else {
        targetFamilyId = group.familyId;
        console.log(`  📌 Utilisation du familyId existant: ${targetFamilyId}`);
      }

      // Mettre à jour tous les membres du groupe
      for (const member of group.members) {
        if (member.accountFamilyId !== targetFamilyId) {
          console.log(`  🔄 Mise à jour ${member.username}: ${member.accountFamilyId || 'AUCUN'} → ${targetFamilyId}`);
          
          await User.findByIdAndUpdate(member._id, {
            accountFamilyId: targetFamilyId
          });
          
          console.log(`  ✅ ${member.username} mis à jour`);
        } else {
          console.log(`  ⏭️  ${member.username} déjà correct`);
        }
      }
    }

    console.log('\n🎉 Liaison automatique terminée !');
    
    // Vérification finale
    console.log('\n📊 Vérification finale:');
    console.log('─'.repeat(80));
    
    const updatedUsers = await User.find({}).select('username firstName lastName accountFamilyId');
    const finalGroups = {};
    
    updatedUsers.forEach(user => {
      const familyId = user.accountFamilyId || 'AUCUN';
      if (!finalGroups[familyId]) {
        finalGroups[familyId] = [];
      }
      finalGroups[familyId].push(user);
    });

    Object.entries(finalGroups).forEach(([familyId, members]) => {
      if (familyId !== 'AUCUN' && members.length > 1) {
        console.log(`👨‍👩‍👧‍👦 Famille ${familyId}: ${members.map(m => m.username).join(', ')}`);
      }
    });

    console.log('\n========================================');
    console.log('  ✅ LIAISON AUTOMATIQUE TERMINÉE');
    console.log('========================================');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Exécuter le script
autoLinkAccounts();
