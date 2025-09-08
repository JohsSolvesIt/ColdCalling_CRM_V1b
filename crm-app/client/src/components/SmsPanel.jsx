import React from 'react';
import { X, MessageSquare, Send, History, Settings, Smartphone } from 'lucide-react';

const SmsPanel = ({
  showSmsPanel,
  setShowSmsPanel,
  smsConnected,
  smsDeviceInfo,
  smsDevices,
  selectedContact,
  setSelectedContact,
  smsMessage,
  setSmsMessage,
  smsTemplates,
  selectedTemplate,
  setSelectedTemplate,
  customTemplate,
  setCustomTemplate,
  showSmsHistory,
  setShowSmsHistory,
  smsHistory,
  smsLoading,
  onConnectDevice,
  onSendSms,
  onAddTemplate,
  findNameField,
  findPhoneField,
  getFirstName
}) => {
  if (!showSmsPanel) return null;

  const handleSendSms = async () => {
    if (!selectedContact || !smsMessage.trim()) return;
    
    try {
      await onSendSms(selectedContact, smsMessage);
      setSmsMessage('');
      setShowSmsPanel(false);
    } catch (error) {
      console.error('Failed to send SMS:', error);
    }
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setSmsMessage(template);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            SMS Center
          </h2>
          <button 
            onClick={() => setShowSmsPanel(false)}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Connection Status */}
        <div className={`mb-4 p-3 rounded-lg border ${
          smsConnected 
            ? 'border-green-300 bg-green-50 dark:bg-green-900/20' 
            : 'border-red-300 bg-red-50 dark:bg-red-900/20'
        }`}>
          <div className="flex items-center gap-2">
            <Smartphone className={`h-4 w-4 ${smsConnected ? 'text-green-600' : 'text-red-600'}`} />
            <span className="font-medium">
              {smsConnected ? 'Connected' : 'Disconnected'}
            </span>
            {smsDeviceInfo && (
              <span className="text-sm text-slate-600 dark:text-slate-400">
                - {smsDeviceInfo.model || smsDeviceInfo.device || 'Unknown Device'}
              </span>
            )}
          </div>
          
          {!smsConnected && smsDevices.length > 0 && (
            <div className="mt-2">
              <label className="text-sm font-medium">Available Devices:</label>
              <div className="flex gap-2 mt-1">
                {smsDevices.map(device => (
                  <button
                    key={device.id}
                    onClick={() => onConnectDevice(device.id)}
                    className="px-3 py-1 text-sm rounded border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                  >
                    Connect {device.model || device.device || 'Unknown Device'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Contact Selection */}
        {selectedContact && (
          <div className="mb-4 p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
            <div className="font-medium">
              {findNameField(selectedContact) ? selectedContact[findNameField(selectedContact)] : selectedContact.id}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {findPhoneField(selectedContact) && selectedContact[findPhoneField(selectedContact)]}
            </div>
          </div>
        )}

        {/* Templates */}
        {smsTemplates.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Quick Templates:</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {smsTemplates.map((template, index) => {
                const templateContent = typeof template === 'string' ? template : template.content;
                const templateName = typeof template === 'object' && template.name ? template.name : null;
                
                return (
                  <button
                    key={index}
                    onClick={() => handleTemplateSelect(templateContent)}
                    className="px-3 py-1 text-sm rounded border border-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600"
                    title={templateName || templateContent}
                  >
                    {templateName || templateContent.substring(0, 30)}{(templateName ? '' : templateContent.length > 30 ? '...' : '')}
                  </button>
                );
              })}
            </div>
            
            {/* Custom Template */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customTemplate}
                onChange={(e) => setCustomTemplate(e.target.value)}
                placeholder="Create custom template..."
                className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700"
              />
              <button
                onClick={() => onAddTemplate(customTemplate)}
                disabled={!customTemplate.trim()}
                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Add Template
              </button>
            </div>
          </div>
        )}

        {/* Message Composer */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Message:</label>
          <textarea
            value={smsMessage}
            onChange={(e) => setSmsMessage(e.target.value)}
            placeholder={`Hi ${selectedContact ? getFirstName(selectedContact) : 'there'}, this is a message from your CRM...`}
            rows={4}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700"
          />
          <div className="text-xs text-slate-500 mt-1">
            {smsMessage.length}/160 characters
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setShowSmsHistory(!showSmsHistory)}
              className="px-3 py-2 rounded border border-slate-300 hover:bg-slate-100 inline-flex items-center gap-2"
            >
              <History className="h-4 w-4" />
              History
            </button>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowSmsPanel(false)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSendSms}
              disabled={!smsConnected || !selectedContact || !smsMessage.trim() || smsLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              {smsLoading ? 'Sending...' : 'Send SMS'}
            </button>
          </div>
        </div>

        {/* SMS History */}
        {showSmsHistory && (
          <div className="mt-4 border-t border-slate-200 dark:border-slate-700 pt-4">
            <h3 className="font-medium mb-2">
              {selectedContact ? 
                `SMS History for ${selectedContact[findNameField(selectedContact)] || selectedContact.id}` : 
                'Recent SMS History'
              }
            </h3>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {(() => {
                // Filter SMS history for selected contact if available
                let filteredHistory = smsHistory;
                if (selectedContact) {
                  const phoneField = findPhoneField(selectedContact);
                  const contactPhone = phoneField ? selectedContact[phoneField] : null;
                  
                  if (contactPhone) {
                    filteredHistory = smsHistory.filter(sms => 
                      sms.phoneNumber === contactPhone || 
                      sms.phone_number === contactPhone ||
                      (sms.contactData && sms.contactData.id === selectedContact.id)
                    );
                  }
                }
                
                return filteredHistory.length > 0 ? (
                  filteredHistory.map((item, index) => (
                    <div key={index} className="p-2 bg-slate-50 dark:bg-slate-700 rounded text-sm">
                      <div className="font-medium">{item.contact_name || 'Unknown Contact'}</div>
                      <div className="text-slate-600 dark:text-slate-400">{item.phone_number || item.phoneNumber}</div>
                      <div className="mt-1">{item.message}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {new Date(item.sent_at || item.timestamp || item.created_at).toLocaleString()}
                      </div>
                      {item.status && (
                        <div className={`text-xs mt-1 ${
                          item.status === 'sent' ? 'text-green-600' : 
                          item.status === 'failed' ? 'text-red-600' : 
                          'text-yellow-600'
                        }`}>
                          Status: {item.status}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500 text-center py-4">
                    {selectedContact ? 
                      'No SMS history for this contact' : 
                      'No SMS history available'
                    }
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmsPanel;
