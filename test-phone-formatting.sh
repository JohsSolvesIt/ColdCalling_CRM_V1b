#!/bin/bash

# Phone Number Formatting Test Script

echo "🧪 Testing Phone Number Formatting"
echo "=================================="

# Change directory to crm-app relative to this script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}/crm-app"

# Test the phone utils functionality
node -e "
const { cleanPhoneNumber, isValidPhoneNumber, formatPhoneForSMS, formatPhoneForDisplay } = require('./client/src/utils/phoneUtils.js');

console.log('Testing Phone Number Cleaning:');
console.log('');

const testNumbers = [
  '(207) 355-5760',
  '207-355-5760',
  '207.355.5760',
  '207 355 5760',
  '+1 207 355 5760',
  '1-207-355-5760',
  '12073555760',
  '2073555760',
  '207-355-HELP',
  'invalid',
  ''
];

testNumbers.forEach(testNumber => {
  const cleaned = cleanPhoneNumber(testNumber);
  const isValid = isValidPhoneNumber(testNumber);
  const forSMS = formatPhoneForSMS(testNumber);
  const forDisplay = formatPhoneForDisplay(testNumber);
  
  console.log(\`Input: '\${testNumber}'\`);
  console.log(\`  ➜ Cleaned: '\${cleaned}'\`);
  console.log(\`  ➜ Valid: \${isValid}\`);
  console.log(\`  ➜ For SMS: '\${forSMS}'\`);
  console.log(\`  ➜ For Display: '\${forDisplay}'\`);
  console.log('');
});

console.log('✅ Phone number formatting test completed!');
console.log('');
console.log('Expected behavior:');
console.log('- All valid US phone numbers should be cleaned to 10 digits');
console.log('- Numbers with +1 or 1- prefix should have leading 1 removed');
console.log('- Invalid numbers should return empty string and false validation');
console.log('- SMS format should always be digits only (e.g., 2073555760)');
console.log('- Display format should be (207) 355-5760');
"

echo ""
echo "🚀 Phone number cleaning is now implemented in:"
echo "   ✅ createTextQueue function (validates and cleans before adding to queue)"
echo "   ✅ sendSmsToContact function (uses cleaned number for sending)"
echo "   ✅ QueuePanel display (shows cleaned number with original as reference)"
echo ""
echo "📱 All phone numbers will now be formatted as digits-only before sending!"
echo "   Example: (207) 355-5760 → 2073555760"
