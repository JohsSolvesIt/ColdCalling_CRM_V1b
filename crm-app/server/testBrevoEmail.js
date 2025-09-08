require('dotenv').config();
const axios = require('axios');

async function sendBrevoEmail() {
  console.log('🔑 Testing Brevo API Key...');
  
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error('❌ BREVO_API_KEY not found in environment variables');
    return;
  }
  
  console.log('✅ API Key found:', apiKey.substring(0, 20) + '...');
  
  // Brevo API endpoint
  const url = 'https://api.brevo.com/v3/smtp/email';
  
  // Email data
  const emailData = {
    sender: {
      name: "CRM System Test",
      email: "jaywarner123solve@gmail.com"
    },
    to: [
      {
        email: "curiouslyinventing@gmail.com",
        name: "Test Recipient"
      }
    ],
    subject: "🎉 Brevo Email Test - Working!",
    htmlContent: `
      <html>
        <body>
          <h2>🎉 Success! Brevo Email is Working!</h2>
          <p>This email confirms that your CRM system can successfully send emails through Brevo.</p>
          
          <h3>📧 Test Details:</h3>
          <ul>
            <li><strong>Sent from:</strong> CRM System</li>
            <li><strong>API:</strong> Brevo (SendinBlue)</li>
            <li><strong>Time:</strong> ${new Date().toISOString()}</li>
          </ul>
          
          <h3>🚀 Your CRM Features:</h3>
          <ul>
            <li>📱 SMS via ADB</li>
            <li>📧 Email via Brevo</li>
            <li>📊 Contact Management</li>
            <li>📈 Campaign Tracking</li>
          </ul>
          
          <p>Your cold calling CRM is ready to go!</p>
          
          <hr>
          <p><small>Sent from: SMS CRM App</small></p>
        </body>
      </html>
    `
  };
  
  try {
    console.log('📧 Sending email to curiouslyinventing@gmail.com...');
    
    const response = await axios.post(url, emailData, {
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      }
    });
    
    console.log('');
    console.log('🎉 EMAIL SENT SUCCESSFULLY!');
    console.log('✅ Status:', response.status);
    console.log('📧 Message ID:', response.data.messageId);
    console.log('📤 Response:', response.data);
    console.log('');
    console.log('📬 CHECK YOUR EMAIL: curiouslyinventing@gmail.com');
    console.log('📱 Also check spam/junk folder');
    console.log('⏰ Email should arrive within 1-2 minutes');
    
  } catch (error) {
    console.error('');
    console.error('❌ EMAIL FAILED TO SEND');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('');
      console.log('🔑 API Key Issue:');
      console.log('- Check if your API key is correct');
      console.log('- Verify your Brevo account is active');
      console.log('- Make sure the API key has email permissions');
    } else if (error.response?.status === 403) {
      console.log('');
      console.log('🚫 Permission Issue:');
      console.log('- Your IP might need to be authorized');
      console.log('- Check sender email verification');
      console.log('- Verify account limits/quotas');
    }
    
    console.log('');
    console.log('🔗 Brevo Dashboard: https://app.brevo.com/account');
  }
}

// Run the test
sendBrevoEmail();
