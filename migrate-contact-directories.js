const fs = require('fs');
const path = require('path');

// Migration script to rename existing contact directories to human-readable format
async function migrateContactDirectories() {
  console.log('🔄 Migrating Contact Directories to Human-Readable Format');
  console.log('=========================================================');
  
  const contactsDir = path.join(__dirname, 'vvebjs/generated-realtors/contacts');
  
  if (!fs.existsSync(contactsDir)) {
    console.log('❌ Contacts directory does not exist');
    return;
  }
  
  const contactDirs = fs.readdirSync(contactsDir);
  const oldFormatDirs = contactDirs.filter(dir => 
    dir.startsWith('contact-') && 
    dir.match(/^contact-[0-9a-f-]+$/) // UUID format
  );
  
  if (oldFormatDirs.length === 0) {
    console.log('✅ No directories need migration - all are already in human-readable format');
    return;
  }
  
  console.log(`📊 Found ${oldFormatDirs.length} directories to migrate:`);
  
  // We need to make API calls to get contact names, but for now, let's just mark them as needing migration
  for (const oldDirName of oldFormatDirs) {
    console.log(`📁 ${oldDirName}`);
    
    // Extract contact ID from directory name
    const contactId = oldDirName.replace('contact-', '');
    
    // For now, just log what would happen
    // In a real migration, we'd need to:
    // 1. Look up the contact name from the database
    // 2. Generate the new human-readable name
    // 3. Rename the directory
    
    console.log(`   📝 Contact ID: ${contactId}`);
    console.log(`   🔄 Would need to fetch contact name and rename directory`);
  }
  
  console.log('\n💡 Migration Notes:');
  console.log('   • Existing directories will continue to work');
  console.log('   • New websites will use human-readable names');
  console.log('   • The system searches for directories by contact ID, so both formats work');
  console.log('   • You can manually rename directories if desired');
}

migrateContactDirectories().catch(console.error);
