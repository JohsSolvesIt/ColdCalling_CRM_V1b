import { useState, useRef } from 'react';
import { v4 as uid } from 'uuid';
import { formatPhoneForSMS, isValidPhoneNumber } from '../utils/phoneUtils';

/**
 * Custom hook for batch texting operations
 */
export const useBatchTexting = () => {
  const [selectedContacts, setSelectedContacts] = useState(new Set());
  const [textQueue, setTextQueue] = useState([]);
  const [queueStatus, setQueueStatus] = useState('idle'); // 'idle', 'running', 'paused', 'completed'
  const queueStatusRef = useRef('idle');
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const [queueResults, setQueueResults] = useState([]);
  const [completionReport, setCompletionReport] = useState(null);

  // Template processing function
  const processTemplate = (template, contact, getFirstName, findNameField) => {
    let processedMessage = template;
    
    // Get contact's full name
    const nameField = findNameField ? findNameField(contact) : null;
    const fullName = nameField ? contact[nameField] : (contact.name || contact.Name || contact.Agent || contact.FirstName || contact.first_name || 'there');
    
    // Get first name using the getFirstName function
    const firstName = getFirstName ? getFirstName(contact) : (fullName ? fullName.split(' ')[0] : 'there');
    
    // Get company name
    const company = contact.company || contact.Company || contact.COMPANY || contact.Agency || contact.AGENCY || contact.Brokerage || '';
    
    // Replace template variables
    processedMessage = processedMessage
      .replace(/\{name\}/g, fullName)
      .replace(/\{firstName\}/g, firstName)
      .replace(/\{company\}/g, company);
    
    console.log('Template processing:', {
      original: template,
      processed: processedMessage,
      fullName,
      firstName,
      company
    });
    
    return processedMessage;
  };

  // Play individual notification sound for each SMS sent
  const playIndividualNotificationSound = () => {
    try {
      const audio = new Audio('/Notification2.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Fallback to Web Audio API generated sound if file fails
        console.log('Individual notification sound file failed, using fallback');
      });
    } catch (error) {
      console.warn('Could not load individual notification sound:', error);
    }
  };

  const toggleContactSelection = (contactId) => {
    setSelectedContacts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  };

  const selectAllContacts = (contacts) => {
    if (!contacts || !Array.isArray(contacts)) {
      console.warn('selectAllContacts called without valid contacts array:', contacts);
      return;
    }
    setSelectedContacts(new Set(contacts.map(contact => contact.id)));
  };

  const selectAllContactsAllPages = (allContacts) => {
    if (!allContacts || !Array.isArray(allContacts)) {
      console.warn('selectAllContactsAllPages called without valid contacts array:', allContacts);
      return;
    }
    setSelectedContacts(new Set(allContacts.map(contact => contact.id)));
  };

  const clearAllSelections = () => {
    setSelectedContacts(new Set());
  };

  const createTextQueue = (contacts, message, findPhoneField, getFirstName, findNameField, selectedContactsOverride = null) => {
    console.log('createTextQueue called with:');
    console.log('- contacts:', contacts);
    console.log('- message:', message);
    console.log('- findPhoneField:', findPhoneField);
    console.log('- getFirstName:', getFirstName);
    console.log('- findNameField:', findNameField);
    console.log('- selectedContactsOverride:', selectedContactsOverride);
    console.log('- hook selectedContacts:', selectedContacts);
    
    // Use override if provided, otherwise use hook's selectedContacts
    const contactsToUse = selectedContactsOverride || selectedContacts;
    
    if (!contacts || !Array.isArray(contacts)) {
      console.warn('createTextQueue called without valid contacts array:', contacts);
      return [];
    }
    
    if (!message || !message.trim()) {
      console.warn('createTextQueue called without valid message:', message);
      return [];
    }
    
    if (typeof findPhoneField !== 'function') {
      console.warn('createTextQueue called without valid findPhoneField function:', findPhoneField);
      return [];
    }

    const queue = Array.from(contactsToUse)
      .map(contactId => {
        console.log('Processing contactId:', contactId);
        const contact = contacts.find(c => c.id === contactId);
        console.log('Found contact:', contact);
        return contact;
      })
      .filter(contact => {
        if (!contact) {
          console.log('Filtered out null contact');
          return false;
        }
        const phoneField = findPhoneField(contact);
        const rawPhone = phoneField ? contact[phoneField] : null;
        const cleanedPhone = formatPhoneForSMS(rawPhone);
        const isValid = isValidPhoneNumber(rawPhone);
        
        console.log('Contact phone validation:');
        console.log('- Contact:', contact);
        console.log('- Phone field:', phoneField);
        console.log('- Raw phone:', rawPhone);
        console.log('- Cleaned phone:', cleanedPhone);
        console.log('- Is valid:', isValid);
        
        if (!isValid) {
          console.warn(`Invalid phone number for contact ${contact.id}: ${rawPhone} -> ${cleanedPhone}`);
        }
        
        return contact && phoneField && rawPhone && isValid;
      })
      .map(contact => {
        // Process template for each individual contact
        const personalizedMessage = processTemplate(message, contact, getFirstName, findNameField);
        
        // Clean the phone number for SMS sending
        const phoneField = findPhoneField(contact);
        const rawPhone = phoneField ? contact[phoneField] : null;
        const cleanedPhone = formatPhoneForSMS(rawPhone);
        
        // Create a new contact object with the cleaned phone number
        const contactWithCleanedPhone = {
          ...contact,
          // Store both original and cleaned phone numbers
          originalPhone: rawPhone,
          cleanedPhone: cleanedPhone
        };
        
        console.log(`Phone number cleaned: ${rawPhone} -> ${cleanedPhone}`);
        
        return {
          id: uid(),
          contact: contactWithCleanedPhone,
          message: personalizedMessage, // Use the personalized message
          status: 'pending',
          timestamp: null,
          result: null
        };
      });

    console.log('Created queue:', queue);
    setTextQueue(queue);
    setCurrentQueueIndex(0);
    setQueueStatus('idle');
    setQueueResults([]);
    return queue;
  };

  const executeQueue = async (sendSmsFunction, updateContactFunction, onProgress, playQueueCompletionSound) => {
    console.log('executeQueue called with:');
    console.log('- sendSmsFunction:', sendSmsFunction);
    console.log('- sendSmsFunction type:', typeof sendSmsFunction);
    console.log('- updateContactFunction:', updateContactFunction);
    console.log('- onProgress:', onProgress);
    console.log('- playQueueCompletionSound:', playQueueCompletionSound);
    
    if (textQueue.length === 0) return;
    
    setQueueStatus('running');
    queueStatusRef.current = 'running';
    
    const results = [];
    
    for (let i = 0; i < textQueue.length; i++) {
      if (queueStatusRef.current !== 'running') {
        console.log('Queue execution stopped, status:', queueStatusRef.current);
        break; // Paused or stopped
      }
      
      setCurrentQueueIndex(i);
      const item = textQueue[i];
      
      // Update status to sending
      setTextQueue(prev => prev.map((qItem, index) => 
        index === i ? { ...qItem, status: 'sending', timestamp: new Date().toISOString() } : qItem
      ));
      
      try {
        const result = await sendSmsFunction(item.contact, item.message);
        
        // Check if we should stop after sending (before updating records)
        if (queueStatusRef.current !== 'running') {
          console.log('Queue stopped after SMS send, status:', queueStatusRef.current);
          // Mark this item as cancelled since we're stopping
          setTextQueue(prev => prev.map((qItem, index) => 
            index === i ? { ...qItem, status: 'cancelled', result: { success: false, error: 'Queue stopped by user' } } : qItem
          ));
          break;
        }
        
        // Update contact record
        if (updateContactFunction) {
          await updateContactFunction(item.contact.id, {
            LastTextSent: new Date().toISOString(),
            TextsSent: (item.contact.TextsSent || 0) + 1,
            Status: 'SENT TEXT'
          });
        }
        
        // Update queue item
        setTextQueue(prev => prev.map((qItem, index) => 
          index === i ? { 
            ...qItem, 
            status: result.success ? 'sent' : 'failed',
            result: result
          } : qItem
        ));
        
        results.push({ ...item, status: result.success ? 'sent' : 'failed', result });
        
        // Play individual message notification sound (Notification2.mp3)
        playIndividualNotificationSound();
        
      } catch (error) {
        console.error('Failed to send SMS:', error);
        
        setTextQueue(prev => prev.map((qItem, index) => 
          index === i ? { 
            ...qItem, 
            status: 'failed',
            result: { success: false, error: error.message }
          } : qItem
        ));
        
        results.push({ ...item, status: 'failed', result: { success: false, error: error.message } });
      }
      
      if (onProgress) {
        onProgress(i + 1, textQueue.length);
      }
      
      // Check status again before delay to exit quickly if stopped
      if (queueStatusRef.current !== 'running') {
        console.log('Queue stopped before delay, status:', queueStatusRef.current);
        break;
      }
      
      // Add interruptible delay between messages
      if (i < textQueue.length - 1) {
        // Break the 2-second delay into smaller chunks so we can exit faster
        for (let delayChunk = 0; delayChunk < 10; delayChunk++) {
          if (queueStatusRef.current !== 'running') {
            console.log('Queue stopped during delay, status:', queueStatusRef.current);
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 200)); // 200ms chunks
        }
      }
    }
    
    setQueueResults(results);
    setQueueStatus('completed');
    queueStatusRef.current = 'completed';
    setCurrentQueueIndex(textQueue.length);
    
    // Generate completion report
    const successful = results.filter(r => r.status === 'sent').length;
    const failed = results.filter(r => r.status === 'failed').length;
    
    setCompletionReport({
      total: results.length,
      successful,
      failed,
      results
    });

    // Play queue completion sound (sting_econsuc2.mp3)
    if (playQueueCompletionSound) {
      playQueueCompletionSound();
    }
    
    return results;
  };

  const pauseQueue = () => {
    setQueueStatus('paused');
    queueStatusRef.current = 'paused';
  };

  const resumeQueue = async (sendSmsFunction, updateContactFunction, onProgress, playQueueCompletionSound) => {
    if (queueStatus !== 'paused') return;
    
    setQueueStatus('running');
    queueStatusRef.current = 'running';
    
    // Continue from current index
    const results = [...queueResults];
    
    for (let i = currentQueueIndex; i < textQueue.length; i++) {
      if (queueStatusRef.current !== 'running') {
        break;
      }
      
      setCurrentQueueIndex(i);
      const item = textQueue[i];
      
      if (item.status !== 'pending') continue; // Skip already processed items
      
      setTextQueue(prev => prev.map((qItem, index) => 
        index === i ? { ...qItem, status: 'sending', timestamp: new Date().toISOString() } : qItem
      ));
      
      try {
        const result = await sendSmsFunction(item.contact, item.message);
        
        if (updateContactFunction) {
          await updateContactFunction(item.contact.id, {
            LastTextSent: new Date().toISOString(),
            TextsSent: (item.contact.TextsSent || 0) + 1,
            Status: 'SENT TEXT'
          });
        }
        
        setTextQueue(prev => prev.map((qItem, index) => 
          index === i ? { 
            ...qItem, 
            status: result.success ? 'sent' : 'failed',
            result: result
          } : qItem
        ));
        
        results.push({ ...item, status: result.success ? 'sent' : 'failed', result });
        
        // Play individual message notification sound (Notification2.mp3)
        playIndividualNotificationSound();
        
      } catch (error) {
        console.error('Failed to send SMS:', error);
        
        setTextQueue(prev => prev.map((qItem, index) => 
          index === i ? { 
            ...qItem, 
            status: 'failed',
            result: { success: false, error: error.message }
          } : qItem
        ));
        
        results.push({ ...item, status: 'failed', result: { success: false, error: error.message } });
      }
      
      if (onProgress) {
        onProgress(i + 1, textQueue.length);
      }
      
      if (i < textQueue.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    setQueueResults(results);
    setQueueStatus('completed');
    queueStatusRef.current = 'completed';
    setCurrentQueueIndex(textQueue.length);
    
    const successful = results.filter(r => r.status === 'sent').length;
    const failed = results.filter(r => r.status === 'failed').length;
    
    setCompletionReport({
      total: results.length,
      successful,
      failed,
      results
    });

    // Play queue completion sound (sting_econsuc2.mp3)
    if (playQueueCompletionSound) {
      playQueueCompletionSound();
    }
    
    return results;
  };

  const clearQueue = () => {
    // First, stop any ongoing execution
    const wasRunning = queueStatusRef.current === 'running';
    console.log('Clear Queue called, was running:', wasRunning);
    
    // Immediately set status to stopped to halt execution
    setQueueStatus('stopped');
    queueStatusRef.current = 'stopped';
    
    // If we were running, update any items that were in "sending" or "pending" status to "cancelled"
    if (wasRunning) {
      setTextQueue(prev => prev.map(item => {
        if (item.status === 'sending' || item.status === 'pending') {
          return { ...item, status: 'cancelled', result: { success: false, error: 'Queue stopped by user' } };
        }
        return item;
      }));
      
      // Give a brief moment for the status update to be visible, then clear
      setTimeout(() => {
        // Reset to idle and clear all queue data
        setQueueStatus('idle');
        queueStatusRef.current = 'idle';
        setTextQueue([]);
        setCurrentQueueIndex(0);
        setQueueResults([]);
        setCompletionReport(null);
        console.log('Queue stopped and cleared');
      }, 500);
    } else {
      // If not running, clear immediately and set to idle
      setQueueStatus('idle');
      queueStatusRef.current = 'idle';
      setTextQueue([]);
      setCurrentQueueIndex(0);
      setQueueResults([]);
      setCompletionReport(null);
      console.log('Queue cleared');
    }
  };

  return {
    selectedContacts,
    setSelectedContacts,
    textQueue,
    setTextQueue,
    queueStatus,
    setQueueStatus,
    queueStatusRef,
    currentQueueIndex,
    setCurrentQueueIndex,
    queueResults,
    setQueueResults,
    completionReport,
    setCompletionReport,
    toggleContactSelection,
    selectAllContacts,
    selectAllContactsAllPages,
    clearAllSelections,
    createTextQueue,
    executeQueue,
    pauseQueue,
    resumeQueue,
    clearQueue
  };
};
