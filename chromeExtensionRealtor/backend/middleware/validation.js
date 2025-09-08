const Joi = require('joi');

const extractionSchema = Joi.object({
  url: Joi.string().uri().required(),
  pageType: Joi.string().valid('agent', 'property', 'search', 'unknown').required(),
  agentData: Joi.object({
    name: Joi.string().max(255),
    title: Joi.string().max(255),
    company: Joi.string().max(255),
    phone: Joi.string().max(50),
    email: Joi.string().email().max(255),
    address: Joi.string(),
    website: Joi.string().allow(''),
    bio: Joi.string(),
    specializations: Joi.array().items(Joi.string()),
    languages: Joi.array().items(Joi.string()),
    experience_years: Joi.number().integer().min(0).max(100),
    license_number: Joi.string().max(100),
    license_state: Joi.string().max(10),
    profile_image_url: Joi.string().uri(),
    social_media: Joi.object(),
    ratings: Joi.object(),
    certifications: Joi.array().items(Joi.string()),
    service_areas: Joi.array().items(Joi.string()),
    agent_id: Joi.string().max(100)
  }),
  properties: Joi.array().items(Joi.object({
    property_id: Joi.string().max(100),
    address: Joi.string(),
    city: Joi.string().max(100),
    state: Joi.string().max(10),
    zip_code: Joi.string().max(20),
    price: Joi.alternatives().try(Joi.number(), Joi.string()).allow(null),
    price_formatted: Joi.string().max(50),
    bedrooms: Joi.alternatives().try(Joi.number().integer(), Joi.string()).allow(null),
    bathrooms: Joi.alternatives().try(Joi.number(), Joi.string()).allow(null),
    square_feet: Joi.alternatives().try(Joi.number().integer(), Joi.string()).allow(null),
    lot_size: Joi.string().max(50),
    property_type: Joi.string().max(100),
    listing_status: Joi.string().max(50),
    listing_date: Joi.date(),
    days_on_market: Joi.alternatives().try(Joi.number().integer(), Joi.string()),
    mls_number: Joi.string().max(100),
    description: Joi.string(),
    features: Joi.array().items(Joi.string()),
    image_urls: Joi.array().items(Joi.string().uri()),
    property_url: Joi.string().uri(),
    coordinates: Joi.object()
  })),
  extractionData: Joi.object()
});

const validateExtraction = (req, res, next) => {
  const { error } = extractionSchema.validate(req.body, { 
    allowUnknown: true,
    stripUnknown: true 
  });
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }
  
  next();
};

module.exports = {
  validateExtraction
};
