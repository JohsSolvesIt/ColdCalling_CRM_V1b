require('dotenv').config();
const axios = require('axios');

class EmailService {
  constructor() {
    this.apiKey = process.env.BREVO_API_KEY || null;
    this.baseURL = 'https://api.brevo.com/v3';
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
  async sendTestEmail(recipientEmail) {
    try {
      if (!this.apiKey) {
        throw new Error('No API key provided');
      }

      console.log('📧 Sending test email to:', recipientEmail);
      
      const emailData = {
        sender: this.defaultSender,
        to: [{ 
          email: recipientEmail,
          name: "Test Recipient"
        }],
        subject: "🎉 Test Email from Your CRM System",
        htmlContent: `
          <html>
            <body>
              <h2>🎉 Success! Your CRM Email is Working!</h2>
              <p>This test email confirms that your cold calling CRM system can successfully send emails through Brevo.</p>
              
              <h3>📧 System Details:</h3>
              <ul>
                <li><strong>Sent from:</strong> CRM System</li>
                <li><strong>Email Service:</strong> Brevo (SendinBlue)</li>
                <li><strong>Time:</strong> ${new Date().toISOString()}</li>
                <li><strong>Status:</strong> Operational ✅</li>
              </ul>
              
              <h3>🚀 Available Features:</h3>
              <ul>
                <li>📱 SMS messaging via ADB</li>
                <li>📧 Email campaigns via Brevo</li>
                <li>📊 Contact management</li>
                <li>📈 Campaign tracking</li>
              </ul>
              
              <p>Your CRM system is ready for cold calling campaigns!</p>
              
              <hr>
              <p><small>Sent from: SMS CRM App</small></p>
            </body>
          </html>
        `
      };

      const response = await axios.post(`${this.baseURL}/smtp/email`, emailData, {
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey
        }
      });

      console.log('✅ Email sent successfully');
      console.log('📧 Message ID:', response.data.messageId);
      
      return {
        success: true,
        messageId: response.data.messageId,
        data: response.data
      };

    } catch (error) {
      console.error('❌ Email send failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  // Send campaign email to a contact
  async sendCampaignEmail(contact, template = 'default') {
    if (!this.isConfigured()) {
      throw new Error('Brevo API key not configured');
    }

    const emailField = this.findEmailField(contact);
    if (!emailField || !contact[emailField]) {
      throw new Error('No email address found for contact');
    }

    const recipientEmail = contact[emailField];
    const recipientName = contact.name || contact.Name || contact.first_name || 'Valued Customer';
    
    const templates = {
      default: this.getDefaultCampaignTemplate(contact),
      followup: this.getFollowUpTemplate(contact),
      introduction: this.getIntroductionTemplate(contact)
    };

    const { subject, htmlContent } = templates[template] || templates.default;

    try {
      console.log('📧 Sending campaign email to:', recipientEmail);
      
      const emailData = {
        sender: this.defaultSender,
        to: [{ 
          email: recipientEmail,
          name: recipientName
        }],
        subject: subject,
        htmlContent: htmlContent
      };

      const response = await axios.post(`${this.baseURL}/smtp/email`, emailData, {
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey
        }
      });

      console.log('✅ Campaign email sent successfully');
      console.log('📧 Message ID:', response.data.messageId);

      return {
        success: true,
        messageId: response.data.messageId,
        data: response.data
      };

    } catch (error) {
      console.error('❌ Campaign email failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  // Find email field in contact data
  findEmailField(contact) {
    const emailFields = ['email', 'Email', 'email_address', 'emailAddress', 'e_mail', 'mail'];
    return Object.keys(contact).find(key => 
      emailFields.some(field => key.toLowerCase().includes(field.toLowerCase()))
    );
  }

  // Get default campaign template
  getDefaultCampaignTemplate(contact) {
    const name = contact.name || contact.Name || contact.first_name || 'there';
    const company = contact.company || contact.Company || '';
    
    return {
      subject: `Follow-up: Great connecting with you${company ? ` at ${company}` : ''}`,
      htmlContent: `
        <html>
          <body>
            <h2>Hi ${name}!</h2>
            <p>I hope this email finds you well.</p>
            
            <p>I wanted to follow up on our conversation and see if you had any questions about the opportunity we discussed.</p>
            
            ${company ? `<p>I understand that at <strong>${company}</strong>, you're likely focused on growth and efficiency.</p>` : ''}
            
            <p>Would you be available for a brief call this week to discuss how we might be able to help?</p>
            
            <p>Best regards,<br>
            ${this.defaultSender.name}</p>
            
            <hr>
            <p><small>Sent via CRM System - SMS CRM App</small></p>
          </body>
        </html>
      `
    };
  }

  // Get follow-up template
  getFollowUpTemplate(contact) {
    const name = contact.name || contact.Name || contact.first_name || 'there';
    
    return {
      subject: 'Quick follow-up on our conversation',
      htmlContent: `
        <html>
          <body>
            <h2>Hello ${name},</h2>
            <p>I wanted to quickly follow up on our recent conversation.</p>
            
            <p>I know you're busy, so I'll keep this brief. I believe we have a solution that could really benefit you.</p>
            
            <p>Would you be interested in a 15-minute call to explore this further?</p>
            
            <p>Looking forward to hearing from you.</p>
            
            <p>Best,<br>
            ${this.defaultSender.name}</p>
            
            <hr>
            <p><small>Sent via CRM System - SMS CRM App</small></p>
          </body>
        </html>
      `
    };
  }

  // Get introduction template
  getIntroductionTemplate(contact) {
    const name = contact.name || contact.Name || contact.first_name || 'there';
    
    return {
      subject: 'Introduction and potential opportunity',
      htmlContent: `
        <html>
          <body>
            <h2>Hi ${name},</h2>
            <p>I hope you're having a great day!</p>
            
            <p>My name is ${this.defaultSender.name}, and I wanted to reach out because I believe we have something that could be valuable for you.</p>
            
            <p>I'd love to schedule a brief conversation to learn more about your current challenges and see if there's a fit.</p>
            
            <p>Would you be open to a quick 10-minute call this week?</p>
            
            <p>Thanks for your time!</p>
            
            <p>Best regards,<br>
            ${this.defaultSender.name}</p>
            
            <hr>
            <p><small>Sent via CRM System - SMS CRM App</small></p>
          </body>
        </html>
      `
    };
  }
}

module.exports = EmailService;
