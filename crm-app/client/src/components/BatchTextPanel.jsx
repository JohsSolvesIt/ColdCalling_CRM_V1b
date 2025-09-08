import React, { useState, useEffect } from "react";
import { 
  MessageSquare, X, Smartphone, RefreshCw, Search
} from "lucide-react";

const BatchTextPanel = ({ 
  selectedContacts, 
  setShowBatchTextPanel, 
  rows, 
  findNameField, 
  selectedTemplate, 
  setSelectedTemplate, 
  setBatchMessage, 
  smsTemplates, 
  batchMessage, 
  createTextQueue,
  findPhoneField, // Add this prop
  setShowQueuePanel, // Add this prop
  // SMS Device Integration
  smsConnected,
  smsDeviceInfo,
  smsDevices,
  onConnectDevice,
  onSearchDevices,
  smsLoading,
  // Template processing
  getFirstName
}) => {
  // Local state to prevent re-renders from affecting input focus
  const [localBatchMessage, setLocalBatchMessage] = useState(batchMessage);
  
  // Sync with parent state
  useEffect(() => {
    setLocalBatchMessage(batchMessage);
  }, [batchMessage]);
  
  const handleMessageChange = (e) => {
    const value = e.target.value;
    console.log('Message changed to:', value);
    setLocalBatchMessage(value);
    setBatchMessage(value);
  };
  
  const handleTemplateChange = (e) => {
    const template = e.target.value;
    console.log('Template selected:', template);
    setSelectedTemplate(template);
    setLocalBatchMessage(template);
    setBatchMessage(template);
    console.log('Local batch message after template change:', template);
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-2xl w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Batch Text Message
          </h2>
          <button 
            onClick={() => setShowBatchTextPanel(false)}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>{selectedContacts.size} contacts selected</strong> for batch texting
          </p>
          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            {Array.from(selectedContacts).slice(0, 3).map(id => {
              const contact = rows.find(r => r.id === id);
              if (!contact) return id; // Safety check for undefined contacts
              const nameField = findNameField(contact);
              return contact[nameField] || contact.id;
            }).join(', ')}
            {selectedContacts.size > 3 && ` and ${selectedContacts.size - 3} more...`}
          </div>
        </div>

        {/* ADB Device Status - Integrated from SMS Management */}
        <div className={`mb-4 p-3 rounded-lg border ${
          smsConnected 
            ? 'border-green-300 bg-green-50 dark:bg-green-900/20' 
            : 'border-red-300 bg-red-50 dark:bg-red-900/20'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <Smartphone className={`h-4 w-4 ${smsConnected ? 'text-green-600' : 'text-red-600'}`} />
            <span className="font-medium">
              ADB Device Status: {smsConnected ? 'Connected' : 'Disconnected'}
            </span>
            {smsDeviceInfo && (
              <span className="text-sm text-slate-600 dark:text-slate-400">
                - {smsDeviceInfo.model || smsDeviceInfo.device || smsDeviceInfo.id}
              </span>
            )}
          </div>
          
          {!smsConnected && (
            <div className="space-y-2">
              {smsDevices.length === 0 ? (
                <div>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    No ADB devices found. Please:
                  </p>
                  <ul className="text-sm text-red-700 dark:text-red-300 mt-1 ml-4 list-disc">
                    <li>Connect your Android phone via USB</li>
                    <li>Enable USB Debugging in Developer Options</li>
                    <li>Accept the ADB authorization prompt</li>
                  </ul>
                  <div className="mt-3">
                    <button
                      onClick={() => onSearchDevices && onSearchDevices()}
                      disabled={smsLoading}
                      className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {smsLoading ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Searching...
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4" />
                          Search for Devices
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">
                    Found {smsDevices.length} device(s). Select one to connect:
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {smsDevices.map(device => (
                      <button
                        key={device.id}
                        onClick={() => onConnectDevice(device.id)}
                        disabled={smsLoading}
                        className="px-3 py-1 text-sm rounded border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 flex items-center gap-1"
                      >
                        <Smartphone className="h-3 w-3" />
                        {smsLoading ? 'Connecting...' : `Connect ${device.model || device.device || device.id}`}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2">
                    <button
                      onClick={() => onSearchDevices && onSearchDevices()}
                      disabled={smsLoading}
                      className="px-3 py-1 text-xs rounded border border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-50 flex items-center gap-1"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Refresh Devices
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {smsConnected && (
            <p className="text-sm text-green-700 dark:text-green-300">
              ✓ Ready for batch text messaging via ADB
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Message Template</label>
            <select 
              value={selectedTemplate}
              onChange={handleTemplateChange}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm mb-2"
            >
              <option value="">Select a template...</option>
              {smsTemplates.map((template, index) => {
                // Handle both string templates (old format) and object templates (new format)
                const templateContent = typeof template === 'string' ? template : template.content;
                const templateName = typeof template === 'string' ? null : template.name;
                const displayText = templateName 
                  ? `${templateName}: ${templateContent.substring(0, 30)}${templateContent.length > 30 ? '...' : ''}`
                  : `${templateContent.substring(0, 50)}${templateContent.length > 50 ? '...' : ''}`;
                
                return (
                  <option key={index} value={templateContent}>
                    {displayText}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Batch Message</label>
            <textarea
              value={localBatchMessage}
              onChange={handleMessageChange}
              placeholder="Enter your batch message... Use {name}, {firstName}, {company} for personalization"
              className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
              rows={6}
              autoFocus
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-slate-500">
                {localBatchMessage.length} characters per message
              </span>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button 
              onClick={() => setShowBatchTextPanel(false)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button 
              onClick={() => {
                console.log('Create Queue button clicked!');
                console.log('Local batch message:', localBatchMessage);
                console.log('Local batch message trimmed:', localBatchMessage.trim());
                console.log('Selected contacts size:', selectedContacts.size);
                console.log('SMS Connected:', smsConnected);
                
                const queue = createTextQueue(rows, localBatchMessage, findPhoneField, getFirstName, findNameField, selectedContacts);
                console.log('Queue creation result:', queue);
                
                if (queue && queue.length > 0) {
                  console.log('Queue created successfully, closing modal and showing queue panel');
                  setShowBatchTextPanel(false);
                  setShowQueuePanel(true);
                } else {
                  console.log('Queue creation failed or resulted in empty queue');
                }
              }}
              disabled={!localBatchMessage.trim() || selectedContacts.size === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              title={
                !localBatchMessage.trim() ? "Please enter a message" : 
                selectedContacts.size === 0 ? "Please select contacts" : 
                "Create the text queue"
              }
            >
              Create Queue ({selectedContacts.size} texts)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchTextPanel;
