require('dotenv').config();
const axios = require('axios');

class EmailService {
  constructor() {
    this.apiKey = process.env.BREVO_API_KEY;
    this.apiUrl = 'https://api.brevo.com/v3/smtp/email';
    this.defaultSender = {
      email: process.env.SENDER_EMAIL || 'jaywarner123solve@gmail.com',
      name: process.env.SENDER_NAME || 'CRM System'
    };
  }

  // Check if email service is configured
  isConfigured() {
    return !!this.apiKey;
  }

  // Send a test email
  async sendTestEmail(toEmail, subject = 'Test Email from CRM System', content = null) {
    if (!this.isConfigured()) {
      throw new Error('Brevo API key not configured. Please set BREVO_API_KEY in .env file.');
    }

    const htmlContent = content || `
      <html>
        <head></head>
        <body>
          <h2>🎉 CRM Email Test Successful!</h2>
          <p>Hello!</p>
          <p>This is a test email from your CRM system to verify that Brevo email integration is working correctly.</p>
          
          <h3>📧 Email Service Details:</h3>
          <ul>
            <li><strong>Service:</strong> Brevo (formerly SendinBlue)</li>
            <li><strong>Sent from:</strong> ${this.defaultSender.email}</li>
            <li><strong>Sent to:</strong> ${toEmail}</li>
            <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
          </ul>
          
          <h3>🚀 CRM Features Available:</h3>
          <ul>
            <li>📱 SMS Integration via ADB</li>
            <li>📧 Email campaigns via Brevo</li>
            <li>📊 Contact management</li>
            <li>📈 Status tracking</li>
            <li>📋 CSV import/export</li>
          </ul>
          
          <p>Your CRM system is ready for cold calling campaigns!</p>
          
          <hr>
          <p><small>This email was sent from your SMS-CRM application</small></p>
        </body>
      </html>
    `;

    const emailData = {
      sender: this.defaultSender,
      to: [{ email: toEmail }],
      subject: subject,
      htmlContent: htmlContent
    };

    try {
      console.log('🔧 Sending email with Brevo API...');
      console.log('📧 To:', toEmail);
      console.log('📝 Subject:', subject);
      console.log('🔑 API Key (first 20 chars):', this.apiKey.substring(0, 20) + '...');
      
      const response = await axios.post(this.apiUrl, emailData, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': this.apiKey
        }
      });

      console.log('✅ Email sent successfully!');
      console.log('📨 Message ID:', response.data.messageId);
      
      return {
        success: true,
        messageId: response.data.messageId,
        to: toEmail,
        subject: subject,
        timestamp: new Date().toISOString(),
        sender: this.defaultSender,
        response: response.data
      };
    } catch (error) {
      console.error('❌ Failed to send email:');
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data);
      console.error('Message:', error.message);
      
      throw new Error(`Email sending failed: ${error.response?.data?.message || error.message}`);
    }
  }

  // Send campaign email to a contact
  async sendCampaignEmail(contact, template = 'default') {
    if (!this.isConfigured()) {
      throw new Error('Brevo API key not configured');
    }

    const templates = {
      default: {
        subject: `Hello {{firstName}}, let's connect!`,
        content: `
          <p>Hi {{firstName}},</p>
          <p>I hope this email finds you well. I wanted to reach out regarding {{company}}.</p>
          <p>Would you be interested in a brief call to discuss how we could help your business?</p>
          <p>Best regards,<br>{{senderName}}</p>
        `
      },
      followup: {
        subject: `Following up on our conversation, {{firstName}}`,
        content: `
          <p>Hi {{firstName}},</p>
          <p>Thank you for your time yesterday. As discussed, I'm following up with some additional information.</p>
          <p>Please let me know if you have any questions or would like to schedule a follow-up call.</p>
          <p>Best regards,<br>{{senderName}}</p>
        `
      }
    };

    const templateData = templates[template] || templates.default;
    
    // Process template variables
    const processTemplate = (text) => {
      return text
        .replace(/{{firstName}}/g, contact.firstName || contact.name || 'Friend')
        .replace(/{{company}}/g, contact.company || 'your company')
        .replace(/{{senderName}}/g, this.defaultSender.name);
    };

    const subject = processTemplate(templateData.subject);
    const htmlContent = `
      <html>
        <head></head>
        <body>
          ${processTemplate(templateData.content)}
          <hr>
          <p><small>This email was sent from CRM System. To unsubscribe, please reply with "UNSUBSCRIBE".</small></p>
        </body>
      </html>
    `;

    return await this.sendTestEmail(contact.email, subject, htmlContent);
  }

  // Get email templates
  getTemplates() {
    return [
      { id: 'default', name: 'Default Introduction' },
      { id: 'followup', name: 'Follow-up Email' }
    ];
  }
}

module.exports = EmailService;
