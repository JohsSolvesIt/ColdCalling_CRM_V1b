// Phone number formatting utilities

/**
 * Cleans a phone number by removing all non-digit characters
 * @param {string} phoneNumber - The phone number to clean
 * @returns {string} - The cleaned phone number with only digits
 */
export const cleanPhoneNumber = (phoneNumber) => {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return '';
  }
  
  // Remove all non-digit characters (spaces, dashes, parentheses, plus signs, tabs, etc.)
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // If the number starts with 1 and is 11 digits, remove the leading 1 (US country code)
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return cleaned.substring(1);
  }
  
  return cleaned;
};

/**
 * Validates that a phone number is in the correct format for SMS (10 digits)
 * @param {string} phoneNumber - The phone number to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidPhoneNumber = (phoneNumber) => {
  const cleaned = cleanPhoneNumber(phoneNumber);
  return cleaned.length === 10 && /^\d{10}$/.test(cleaned);
};

/**
 * Formats a phone number for display (with parentheses and dashes)
 * @param {string} phoneNumber - The phone number to format
 * @returns {string} - The formatted phone number like (207) 355-5760
 */
export const formatPhoneForDisplay = (phoneNumber) => {
  const cleaned = cleanPhoneNumber(phoneNumber);
  
  if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
  }
  
  return phoneNumber; // Return original if not 10 digits
};

/**
 * Formats a phone number for SMS sending (digits only)
 * @param {string} phoneNumber - The phone number to format
 * @returns {string} - The cleaned phone number ready for SMS
 */
export const formatPhoneForSMS = (phoneNumber) => {
  return cleanPhoneNumber(phoneNumber);
};

/**
 * Formats a phone number for calling (digits only, no formatting)
 * @param {string} phoneNumber - The phone number to format
 * @returns {string} - The cleaned phone number ready for tel: links
 */
export const formatPhoneForCalling = (phoneNumber) => {
  return cleanPhoneNumber(phoneNumber);
};
