const mongoose = require('mongoose');
const User = require('./models/User');

async function debugAccountLinking() {
  try {
    console.log('========================================');
    console.log('  DEBUG LIAISON DES COMPTES');
    console.log('========================================');

    // Connexion à MongoDB
    console.log('\n🔄 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/compta');
    console.log('✅ Connecté à MongoDB');

    // Récupérer tous les utilisateurs
    const users = await User.find({}).select('username firstName lastName accountFamilyId createdAt');

    console.log('\n📋 Tous les utilisateurs:');
    console.log('─'.repeat(80));

    const familyGroups = {};

    users.forEach((user, index) => {
      const familyId = user.accountFamilyId || 'AUCUN';
      
      if (!familyGroups[familyId]) {
        familyGroups[familyId] = [];
      }
      familyGroups[familyId].push(user);

      console.log(`  ${index + 1}. ${user.username} (${user.firstName} ${user.lastName})`);
      console.log(`     FamilyId: ${familyId}`);
      console.log(`     Créé le: ${user.createdAt.toLocaleString('fr-FR')}`);
      console.log('');
    });

    console.log('\n👨‍👩‍👧‍👦 Groupes de familles:');
    console.log('─'.repeat(80));

    Object.entries(familyGroups).forEach(([familyId, members]) => {
      if (familyId === 'AUCUN') {
        console.log(`\n❌ Comptes SANS familyId (${members.length}):`);
      } else {
        console.log(`\n👨‍👩‍👧‍👦 Famille ${familyId} (${members.length} membres):`);
      }
      
      members.forEach(member => {
        console.log(`  • ${member.username} (${member.firstName} ${member.lastName})`);
      });
    });

    // Analyser les problèmes potentiels
    console.log('\n🔍 ANALYSE:');
    console.log('─'.repeat(80));

    const usersWithoutFamily = familyGroups['AUCUN'] || [];
    if (usersWithoutFamily.length > 0) {
      console.log(`⚠️  ${usersWithoutFamily.length} utilisateur(s) sans familyId`);
    }

    const familiesWithMultipleMembers = Object.entries(familyGroups)
      .filter(([familyId, members]) => familyId !== 'AUCUN' && members.length > 1);

    if (familiesWithMultipleMembers.length > 0) {
      console.log(`✅ ${familiesWithMultipleMembers.length} famille(s) avec plusieurs membres`);
      familiesWithMultipleMembers.forEach(([familyId, members]) => {
        console.log(`   • Famille ${familyId}: ${members.map(m => m.username).join(', ')}`);
      });
    }

    const singleMemberFamilies = Object.entries(familyGroups)
      .filter(([familyId, members]) => familyId !== 'AUCUN' && members.length === 1);

    if (singleMemberFamilies.length > 0) {
      console.log(`📝 ${singleMemberFamilies.length} famille(s) avec un seul membre`);
    }

    // Vérifier les comptes Jack et Snow spécifiquement
    console.log('\n🎯 VÉRIFICATION SPÉCIFIQUE (Jack et Snow):');
    console.log('─'.repeat(80));

    const jack = users.find(u => u.username.toLowerCase() === 'jack');
    const snow = users.find(u => u.username.toLowerCase() === 'snow');

    if (jack) {
      console.log(`👤 Jack trouvé:`);
      console.log(`   • FamilyId: ${jack.accountFamilyId || 'AUCUN'}`);
      console.log(`   • Nom: ${jack.firstName} ${jack.lastName}`);
    } else {
      console.log(`❌ Jack non trouvé`);
    }

    if (snow) {
      console.log(`👤 Snow trouvé:`);
      console.log(`   • FamilyId: ${snow.accountFamilyId || 'AUCUN'}`);
      console.log(`   • Nom: ${snow.firstName} ${snow.lastName}`);
    } else {
      console.log(`❌ Snow non trouvé`);
    }

    if (jack && snow) {
      if (jack.accountFamilyId === snow.accountFamilyId) {
        console.log(`✅ Jack et Snow ont le même familyId: ${jack.accountFamilyId}`);
      } else {
        console.log(`❌ Jack et Snow ont des familyId différents:`);
        console.log(`   • Jack: ${jack.accountFamilyId || 'AUCUN'}`);
        console.log(`   • Snow: ${snow.accountFamilyId || 'AUCUN'}`);
        console.log(`\n💡 SOLUTION: Utiliser le script de liaison manuelle`);
      }
    }

    console.log('\n========================================');
    console.log('  FIN DU DEBUG');
    console.log('========================================');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Exécuter le script
debugAccountLinking();
