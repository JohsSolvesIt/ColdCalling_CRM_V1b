require('dotenv').config();
const EmailService = require('./emailService_axios');

async function testEmailService() {
  console.log('🧪 Testing Email Service Integration...');
  console.log('=' .repeat(50));
  
  // Check environment variables
  console.log('🔍 Checking configuration...');
  console.log('API Key present:', !!process.env.BREVO_API_KEY);
  console.log('API Key (first 20 chars):', process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.substring(0, 20) + '...' : 'Not found');
  console.log('Sender Email:', process.env.SENDER_EMAIL || 'jaywarner123solve@gmail.com (default)');
  console.log('');

  const emailService = new EmailService();
  
  // Check if service is configured
  if (!emailService.isConfigured()) {
    console.log('❌ Email service is not configured properly.');
    console.log('Please make sure BREVO_API_KEY is set in your .env file.');
    return;
  }
  
  console.log('✅ Email service is configured.');
  console.log('');

  // Test email
  const testEmail = 'curiouslyinventing@gmail.com';
  
  try {
    console.log(`📧 Sending test email to: ${testEmail}`);
    console.log('⏳ Please wait...');
    
    const result = await emailService.sendTestEmail(testEmail);
    
    console.log('');
    console.log('🎉 SUCCESS! Email sent successfully!');
    console.log('📨 Message ID:', result.messageId);
    console.log('📧 Sent to:', result.to);
    console.log('📝 Subject:', result.subject);
    console.log('⏰ Timestamp:', result.timestamp);
    console.log('👤 Sender:', result.sender.email);
    console.log('');
    console.log('✅ Check your email inbox for the test message!');
    
  } catch (error) {
    console.log('');
    console.log('❌ FAILED to send email:');
    console.log('Error:', error.message);
    console.log('');
    
    if (error.message.includes('Invalid API key')) {
      console.log('💡 Suggestion: Check that your BREVO_API_KEY is correct in the .env file');
    } else if (error.message.includes('401')) {
      console.log('💡 Suggestion: API key might be invalid or expired');
    } else if (error.message.includes('403')) {
      console.log('💡 Suggestion: API key might not have email sending permissions');
    }
  }
}

// Run the test
testEmailService().catch(console.error);
