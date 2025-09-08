const cleanPhoneNumber = (phoneNumber) => {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return '';
  }
  const cleaned = phoneNumber.replace(/\D/g, '');
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return cleaned.substring(1);
  }
  return cleaned;
};

const isValidPhoneNumber = (phoneNumber) => {
  const cleaned = cleanPhoneNumber(phoneNumber);
  return cleaned.length === 10 && /^\d{10}$/.test(cleaned);
};

// Test the specific problematic phone number
const testPhone = '\t + (207) 355-5760';
console.log('🧪 Testing phone number from logs:');
console.log('Input phone:', JSON.stringify(testPhone));
console.log('Cleaned:', cleanPhoneNumber(testPhone));
console.log('Valid:', isValidPhoneNumber(testPhone));
console.log('');

// Test other formats
const testNumbers = [
  '\t + (207) 355-5760',
  '(207) 355-5760',
  '207-355-5760',
  '+1 207 355 5760'
];

testNumbers.forEach(phone => {
  console.log(`Input: ${JSON.stringify(phone)} -> Cleaned: "${cleanPhoneNumber(phone)}" -> Valid: ${isValidPhoneNumber(phone)}`);
});

console.log('✅ Phone cleaning test complete!');
