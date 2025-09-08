import { useState, useCallback } from 'react';
import { api } from '../services/api';
import { formatPhoneForSMS, isValidPhoneNumber } from '../utils/phoneUtils';

/**
 * Custom hook for SMS operations
 */
export const useSMS = () => {
  const [smsDevices, setSmsDevices] = useState([]);
  const [smsConnected, setSmsConnected] = useState(false);
  const [smsDeviceInfo, setSmsDeviceInfo] = useState(null);
  const [smsTemplates, setSmsTemplates] = useState([]);
  const [smsHistory, setSmsHistory] = useState([]);
  const [smsLoading, setSmsLoading] = useState(false);

  const loadSmsDevices = async () => {
    try {
      const devices = await api.getSmsDevices();
      setSmsDevices(devices);
    } catch (error) {
      console.error('Failed to load SMS devices:', error);
    }
  };

  const loadSmsTemplates = async () => {
    try {
      const templates = await api.getSmsTemplates();
      setSmsTemplates(templates);
    } catch (error) {
      console.error('Failed to load SMS templates:', error);
    }
  };

  const loadSmsHistory = async () => {
    try {
      const history = await api.getSmsHistory();
      setSmsHistory(history);
    } catch (error) {
      console.error('Failed to load SMS history:', error);
    }
  };

  const connectSmsDevice = async (deviceId) => {
    try {
      setSmsLoading(true);
      const result = await api.connectSmsDevice(deviceId);
      setSmsConnected(result.connected);
      setSmsDeviceInfo(result.device);
      return result;
    } catch (error) {
      console.error('Failed to connect SMS device:', error);
      throw error;
    } finally {
      setSmsLoading(false);
    }
  };

  const sendSmsToContact = async (contact, customMessage = null, updateContact = null) => {
    if (!smsConnected) {
      throw new Error('No SMS device connected');
    }

    const phoneField = findPhoneField(contact);
    if (!phoneField || !contact[phoneField]) {
      throw new Error('No phone number found for contact');
    }

    try {
      setSmsLoading(true);
      
      // Use cleaned phone number if available (from batch processing), otherwise clean the original
      let phoneNumber;
      if (contact.cleanedPhone) {
        phoneNumber = contact.cleanedPhone;
        console.log(`Using pre-cleaned phone number: ${contact.originalPhone} -> ${phoneNumber}`);
      } else {
        const rawPhone = contact[phoneField];
        phoneNumber = formatPhoneForSMS(rawPhone);
        console.log(`Cleaning phone number: ${rawPhone} -> ${phoneNumber}`);
      }
      
      // Validate the phone number format
      if (!isValidPhoneNumber(phoneNumber)) {
        throw new Error(`Invalid phone number format: ${phoneNumber}. Must be 10 digits.`);
      }
      
      const message = customMessage || getDefaultMessage(contact);
      
      console.log(`Sending SMS to: ${phoneNumber} with message: ${message}`);
      const result = await api.sendSms(phoneNumber, message, contact);
      
      // Update contact with SMS info
      if (updateContact) {
        await updateContact(contact.id, {
          LastTextSent: new Date().toISOString(),
          TextsSent: (contact.TextsSent || 0) + 1,
          Status: 'SENT TEXT'
        });
      }
      
      return result;
    } catch (error) {
      console.error('Failed to send SMS:', error);
      throw error;
    } finally {
      setSmsLoading(false);
    }
  };

  const addCustomTemplate = async (template) => {
    try {
      await api.addSmsTemplate(template);
      setSmsTemplates(prev => [...prev, template]);
    } catch (error) {
      console.error('Failed to add template:', error);
      throw error;
    }
  };

  // Helper functions
  const findPhoneField = (contact) => {
    const phoneFields = ['phone', 'mobile', 'tel', 'Phone', 'Mobile', 'Tel', 'PHONE', 'MOBILE'];
    return phoneFields.find(field => contact[field]);
  };

  const getDefaultMessage = (contact) => {
    const firstName = getFirstName(contact);
    return `Hi ${firstName}, this is a test message from your CRM system.`;
  };

  const getFirstName = (contact) => {
    const nameField = contact.Name || contact.name || contact.Agent || contact.FirstName || contact.first_name;
    if (nameField) {
      return nameField.split(' ')[0];
    }
    return 'there';
  };

  return {
    smsDevices,
    setSmsDevices,
    smsConnected,
    setSmsConnected,
    smsDeviceInfo,
    setSmsDeviceInfo,
    smsTemplates,
    setSmsTemplates,
    smsHistory,
    setSmsHistory,
    smsLoading,
    setSmsLoading,
    loadSmsDevices,
    loadSmsTemplates,
    loadSmsHistory,
    connectSmsDevice,
    sendSmsToContact,
    addCustomTemplate,
    findPhoneField,
    getFirstName
  };
};
