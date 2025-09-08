const SMSService = require('./crm-app/server/smsService');

async function testSMS() {
  const smsService = new SMSService();
  
  try {
    console.log('🔍 Testing SMS service...');
    
    // First test getting devices
    console.log('📱 Getting devices...');
    const devices = await smsService.getDevices();
    console.log('Devices:', devices);
    
    if (devices.length === 0) {
      console.log('❌ No devices found');
      return;
    }
    
    // Connect to first device
    console.log('🔌 Connecting to device...');
    const connectResult = await smsService.connectDevice(devices[0].id);
    console.log('Connect result:', connectResult);
    
    // Test send SMS
    console.log('📱 Testing SMS send...');
    const sendResult = await smsService.sendSMS('5551234567', 'Test message from debug script');
    console.log('Send result:', sendResult);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testSMS();
