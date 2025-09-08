const fs = require('fs');
const path = require('path');

// Create fallback file for 'Agent Name Not Found' from John L Scott Real Estate
const template = fs.readFileSync('new-page-blank-template.html', 'utf8');

const content = template
  .replace(/{{REALTOR_NAME}}/g, 'Real Estate Professional at John L Scott Real Estate')
  .replace(/{{REALTOR_COMPANY}}/g, 'John L Scott Real Estate')
  .replace(/{{REALTOR_PHONE}}/g, 'Contact for Phone Number')
  .replace(/{{REALTOR_EMAIL}}/g, 'Contact for Email')
  .replace(/{{REALTOR_ADDRESS}}/g, 'Contact for Address')
  .replace(/{{REALTOR_SPECIALTY}}/g, 'Residential and Commercial Real Estate')
  .replace(/{{REALTOR_BIO}}/g, 'Professional real estate services with John L Scott Real Estate. Contact us for more information about buying, selling, or leasing properties.')
  .replace(/{{REALTOR_PHOTO}}/g, 'https://via.placeholder.com/300x400?text=Agent+Photo')
  .replace(/{{REALTOR_WEBSITE}}/g, '#')
  .replace(/{{REALTOR_LINKEDIN}}/g, '#')
  .replace(/{{REALTOR_FACEBOOK}}/g, '#')
  .replace(/{{REALTOR_TWITTER}}/g, '#');

// Create realtor-database directory if it doesn't exist
const realtorDbDir = path.join('generated-realtors', 'realtor-database');
if (!fs.existsSync(realtorDbDir)) {
  fs.mkdirSync(realtorDbDir, { recursive: true });
}

// Generate a unique ID for this fallback page
const uniqueId = Math.floor(1000000 + Math.random() * 9000000);
const fileName = `agent-at-john-l-scott-real-estate-${uniqueId}.html`;

fs.writeFileSync(path.join(realtorDbDir, fileName), content);
console.log(`✅ Created fallback page: ${fileName}`);
