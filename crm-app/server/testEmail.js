const EmailService = require('./emailService');

// Test email functionality
async function testBrevoEmail() {
  console.log('🧪 Testing Brevo Email Integration...');
  console.log('Current environment variables:');
  console.log('- BREVO_API_KEY:', process.env.BREVO_API_KEY ? 'SET (hidden)' : 'NOT SET');
  console.log('- SENDER_EMAIL:', process.env.SENDER_EMAIL || 'NOT SET (using default)');
  console.log('');
  
  const emailService = new EmailService();
  
  // Check if configured
  if (!emailService.isConfigured()) {
    console.log('❌ Brevo API key not configured');
    console.log('');
    console.log('📋 To set up Brevo email:');
    console.log('1. 🌐 Sign up/login at https://brevo.com');
    console.log('2. 🔑 Go to Settings > API Keys');
    console.log('3. 📋 Copy your API key');
    console.log('4. 💻 Set it as environment variable:');
    console.log('   export BREVO_API_KEY="xkeysib-your-api-key-here"');
    console.log('5. 🔄 Run this test again: node testEmail.js');
    console.log('');
    console.log('🔗 Direct link: https://app.brevo.com/settings/keys/api');
    return;
  }
  
  try {
    console.log('✅ Brevo API key found');
    console.log('📧 Sending test email to curiouslyinventing@gmail.com...');
    
    const result = await emailService.sendTestEmail(
      'curiouslyinventing@gmail.com',
      '🎉 CRM Email Test - Brevo Integration Working!',
      null // Use default test email content
    );
    
    console.log('');
    console.log('🎉 EMAIL SENT SUCCESSFULLY!');
    console.log('📧 Message ID:', result.messageId);
    console.log('📤 Sent to:', result.to);
    console.log('📝 Subject:', result.subject);
    console.log('⏰ Timestamp:', result.timestamp);
    console.log('👤 From:', result.sender.email);
    console.log('');
    console.log('🎯 Check curiouslyinventing@gmail.com for the test email!');
    console.log('📱 Also check spam folder if not in inbox');
    
  } catch (error) {
    console.error('');
    console.error('❌ FAILED TO SEND EMAIL');
    console.error('Error message:', error.message);
    
    if (error.message.includes('Invalid API key')) {
      console.log('');
      console.log('💡 API Key Issues:');
      console.log('- Double-check your API key is correct');
      console.log('- Make sure it starts with "xkeysib-"');
      console.log('- Verify the API key has email sending permissions');
      console.log('- Check if your Brevo account is active');
    } else if (error.message.includes('IP')) {
      console.log('');
      console.log('💡 IP Address Issues:');
      console.log('- Your IP might need to be authorized in Brevo');
      console.log('- Go to Settings > Authorized IP addresses');
      console.log('- Add your current IP or disable IP restrictions for testing');
    }
    
    console.log('');
    console.log('🔗 Brevo Dashboard: https://app.brevo.com');
  }
}

// Run the test
testBrevoEmail();
