// Clean VvebJS Website Generation Function
const fs = require('fs');
const path = require('path');

const generateVvebJSWebsite = (agentData) => {
  const properties = agentData.properties || [];
  
  // Generate unstyled HTML directly (no CSS/Bootstrap)
  const generateRatings = () => {
    if (!agentData.ratings) return '';
    return `<div>
      ${'★'.repeat(Math.floor(agentData.ratings))}${'☆'.repeat(5-Math.floor(agentData.ratings))} 
      <span>(${agentData.ratings}/5)</span>
    </div>`;
  };
  
  const generateProfileImage = () => {
    return agentData.profile_image_url ? 
      `<img src="${agentData.profile_image_url}" alt="${agentData.name}">` :
      '<div>👤</div>';
  };
  
  const generateWebsiteLink = () => {
    return agentData.website ? 
      `<p><a href="${agentData.website}" target="_blank">${agentData.website}</a></p>` : '';
  };
  
  const generateContactInfo = (side) => {
    if (side === 'left') {
      return `
        <p><strong>Phone:</strong> ${agentData.phone || 'Contact for phone'}</p>
        <p><strong>Email:</strong> ${agentData.email || 'Contact for email'}</p>
        ${agentData.address ? `<p><strong>Address:</strong> ${agentData.address}</p>` : ''}
      `;
    } else {
      return `
        <p><strong>License:</strong> ${agentData.license_number || agentData.license || 'Licensed Professional'}</p>
        <p><strong>State:</strong> ${agentData.license_state || agentData.state || 'State Licensed'}</p>
        ${agentData.website ? `<p><strong>Website:</strong> <a href="${agentData.website}" target="_blank">${agentData.website}</a></p>` : ''}
      `;
    }
  };
  
  const generateSocialMedia = () => {
    if (!agentData.social_media || (!agentData.social_media.facebook && !agentData.social_media.linkedin && !agentData.social_media.instagram && !agentData.social_media.twitter)) {
      return '';
    }
    
    return `
      <div>
        <h5>Connect With Me:</h5>
        <div>
          ${agentData.social_media.facebook ? `<a href="${agentData.social_media.facebook}" target="_blank">Facebook</a>` : ''}
          ${agentData.social_media.linkedin ? `<a href="${agentData.social_media.linkedin}" target="_blank">LinkedIn</a>` : ''}
          ${agentData.social_media.instagram ? `<a href="${agentData.social_media.instagram}" target="_blank">Instagram</a>` : ''}
          ${agentData.social_media.twitter ? `<a href="${agentData.social_media.twitter}" target="_blank">Twitter</a>` : ''}
        </div>
      </div>
    `;
  };
  
  const generateProfessionalDetails = () => {
    if (!agentData.specializations && !agentData.languages && !agentData.certifications && !agentData.service_areas) {
      return '';
    }
    
    return `
      <div>
        <h2>Professional Details</h2>
        
        ${agentData.specializations ? `
        <div>
          <h5>Specializations:</h5>
          <div>
            ${Array.isArray(agentData.specializations) ? 
              agentData.specializations.map(spec => `<span>${spec}</span>`).join(', ') :
              `<span>${agentData.specializations}</span>`
            }
          </div>
        </div>` : ''}
        
        ${agentData.languages ? `
        <div>
          <h5>Languages:</h5>
          <p>${Array.isArray(agentData.languages) ? agentData.languages.join(', ') : agentData.languages}</p>
        </div>` : ''}
        
        ${agentData.certifications ? `
        <div>
          <h5>Certifications:</h5>
          <p>${Array.isArray(agentData.certifications) ? agentData.certifications.join(', ') : agentData.certifications}</p>
        </div>` : ''}
        
        ${agentData.service_areas ? `
        <div>
          <h5>Service Areas:</h5>
          <p>${Array.isArray(agentData.service_areas) ? agentData.service_areas.join(', ') : agentData.service_areas}</p>
        </div>` : ''}
      </div>
    `;
  };
  
  const generateProfessionalStats = () => {
    return `
      <div>
        <h3>${properties.length || agentData.total_properties || 0}</h3>
        <small>Total Properties</small>
      </div>
      ${agentData.cities_served ? `
      <div>
        <h3>${Array.isArray(agentData.cities_served) ? agentData.cities_served.length : agentData.cities_served.split(',').length}</h3>
        <small>Cities Served</small>
      </div>` : ''}
      ${agentData.min_property_price && agentData.max_property_price ? `
      <div>
        <small>Price Range</small>
        <p>$${Math.round(agentData.min_property_price/1000)}K - $${Math.round(agentData.max_property_price/1000)}K</p>
      </div>` : ''}
    `;
  };
  
  const generatePropertiesList = () => {
    if (properties.length === 0) return '';
    
    return properties.map(prop => `
      <div>
        <div>
          <div>
            <h5>${prop.address || 'Property Address'}</h5>
            <p>
              <strong>Price:</strong> ${prop.price_formatted || prop.price || 'Contact for price'}<br>
              ${prop.bedrooms ? `<strong>Bedrooms:</strong> ${prop.bedrooms}<br>` : ''}
              ${prop.bathrooms ? `<strong>Bathrooms:</strong> ${prop.bathrooms}<br>` : ''}
              ${prop.square_feet ? `<strong>Square Feet:</strong> ${prop.square_feet}<br>` : ''}
              ${prop.description ? `<p>${prop.description}</p>` : ''}
            </p>
          </div>
        </div>
      </div>
    `).join('');
  };
  
  // Calculate average price for stats
  const avgPrice = properties.length > 0 ? 
    '$' + Math.round((properties.reduce((sum, p) => sum + parseFloat(p.price || 0), 0) / properties.length)/1000) + 'K' :
    (agentData.avg_property_price ? '$' + Math.round(agentData.avg_property_price/1000) + 'K' : 'Contact');
  
  // Generate completely unstyled HTML
  const unStyledHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="${agentData.name || 'Professional Realtor'} - ${agentData.company || 'Real Estate Company'} | Professional Real Estate Agent">
    <meta name="author" content="${agentData.name || 'Professional Realtor'}">
    <title>${agentData.name || 'Professional Realtor'} - ${agentData.company || 'Real Estate Company'} | Real Estate Professional</title>
</head>
<body>
    <header>
        <h1>${agentData.name || 'Professional Realtor'}</h1>
        <h2>${agentData.title || 'Real Estate Professional'}</h2>
        <h3>${agentData.company || 'Real Estate Company'}</h3>
    </header>
    
    <main>
        <section>
            ${generateProfileImage()}
            ${generateRatings()}
            <p>${agentData.bio || agentData.description || 'Experienced real estate professional dedicated to helping clients achieve their property goals.'}</p>
            ${generateWebsiteLink()}
        </section>
        
        <section>
            <h2>Contact Information</h2>
            ${generateContactInfo('left')}
            ${generateContactInfo('right')}
        </section>
        
        <section>
            <h2>Statistics</h2>
            <div>
                <div>
                    <strong>Total Properties:</strong> ${properties.length || agentData.total_properties || 0}
                </div>
                <div>
                    <strong>Average Price:</strong> ${avgPrice}
                </div>
                <div>
                    <strong>Experience:</strong> ${agentData.experience_years ? agentData.experience_years + ' Years' : 'Contact for details'}
                </div>
            </div>
            ${generateProfessionalStats()}
        </section>
        
        ${generateProfessionalDetails()}
        
        ${generateSocialMedia()}
        
        ${properties.length > 0 ? `
        <section>
            <h2>Properties</h2>
            <div>
                ${generatePropertiesList()}
            </div>
        </section>` : ''}
    </main>
</body>
</html>`;
  
  return unStyledHTML;
};

module.exports = { generateVvebJSWebsite };
