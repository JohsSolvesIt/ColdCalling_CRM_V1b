#!/usr/bin/env node

const PostgresManager = require('./server/PostgresManager');

async function initializeSmsTemplates() {
  const db = new PostgresManager();
  
  try {
    console.log('🔌 Connecting to database...');
    await db.connect();
    
    console.log('📝 Ensuring database schema...');
    await db.ensureSchema();
    
    console.log('📱 Creating initial SMS template...');
    
    // Your SMS template
    const template = {
      name: 'Agent Website Offer',
      content: `Hey {firstName}, it's Joshua Willey. I help agents like you stand out with high-converting Agent Websites. Normally they're $500, but since I'm doing well in your area, I'd like to offer it for just $300, since I've already made one for you.  Are you cool with using the website I've already made for you, you so you can boost your sales and get more clients?`,
      variables: ['firstName'],
      category: 'sales',
      created_by: 'Joshua Willey'
    };
    
    // Check if template already exists
    const existingTemplates = await db.getSmsTemplates();
    const templateExists = existingTemplates.some(t => t.name === template.name);
    
    if (templateExists) {
      console.log('✅ Template already exists, skipping creation');
    } else {
      const createdTemplate = await db.createSmsTemplate(template);
      console.log('✅ SMS template created successfully:');
      console.log(`   ID: ${createdTemplate.id}`);
      console.log(`   Name: ${createdTemplate.name}`);
      console.log(`   Variables: ${createdTemplate.variables.join(', ')}`);
      console.log(`   Category: ${createdTemplate.category}`);
    }
    
    // Display all templates
    console.log('\n📋 Current SMS templates in database:');
    const allTemplates = await db.getSmsTemplates();
    allTemplates.forEach((template, index) => {
      console.log(`\n${index + 1}. ${template.name}`);
      console.log(`   Category: ${template.category}`);
      console.log(`   Variables: ${template.variables.join(', ')}`);
      console.log(`   Usage Count: ${template.usage_count}`);
      console.log(`   Created: ${template.created_at}`);
      console.log(`   Content: ${template.content.substring(0, 100)}...`);
    });
    
    console.log(`\n🎉 SMS templates database initialized with ${allTemplates.length} templates!`);
    
  } catch (error) {
    console.error('❌ Error initializing SMS templates:', error);
    process.exit(1);
  } finally {
    await db.close();
    console.log('🔐 Database connection closed');
  }
}

// Run the initialization
if (require.main === module) {
  initializeSmsTemplates();
}

module.exports = initializeSmsTemplates;
