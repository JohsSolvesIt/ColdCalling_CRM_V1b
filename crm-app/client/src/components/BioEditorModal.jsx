import React, { useState, useEffect } from 'react';

const BioEditorModal = ({ isOpen, onClose, contact, onBioUpdated }) => {
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [originalBio, setOriginalBio] = useState('');

  // Clear message after 3 seconds
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Initialize bio when modal opens
  useEffect(() => {
    if (isOpen && contact) {
      const currentBio = getContactProperty(contact, 'bio') || '';
      setBio(currentBio);
      setOriginalBio(currentBio);
    }
  }, [isOpen, contact]);

  const getContactProperty = (contact, field) => {
    if (!contact) return '';
    
    // Direct property access
    if (contact[field] !== undefined) {
      return contact[field];
    }
    
    // Common bio field variations
    const bioFields = ['bio', 'description', 'about', 'summary'];
    for (const bioField of bioFields) {
      if (contact[bioField] !== undefined) {
        return contact[bioField];
      }
    }
    
    return '';
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
  };

  const handleSave = async () => {
    if (!contact?.id) {
      showMessage('error', 'No contact selected');
      return;
    }

    try {
      setLoading(true);
      
      console.log(`📝 Updating bio for contact ${contact.id}...`);
      
      const response = await fetch(`http://localhost:5001/api/agents/${contact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bio: bio.trim()
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Bio updated successfully');
        setOriginalBio(bio.trim());
        showMessage('success', 'Bio updated successfully');
        if (onBioUpdated) onBioUpdated(contact.id, bio.trim());
        
        // Close modal after a short delay
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        console.error('❌ Failed to update bio:', data.error);
        showMessage('error', data.error || 'Failed to update bio');
      }
    } catch (error) {
      console.error('❌ Error updating bio:', error);
      showMessage('error', 'Error updating bio');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setBio(originalBio);
    setMessage({ type: '', text: '' });
    onClose();
  };

  const hasChanges = bio.trim() !== originalBio;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Edit Bio - {contact?.name || 'Unknown Contact'}
            </h2>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Message display */}
          {message.text && (
            <div className={`mb-4 p-3 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-100 text-green-700 border border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700' 
                : 'bg-red-100 text-red-700 border border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700'
            }`}>
              {message.text}
            </div>
          )}

          {/* Contact info */}
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p><strong>Name:</strong> {contact?.name || 'N/A'}</p>
              <p><strong>Company:</strong> {contact?.company || 'N/A'}</p>
              <p><strong>Email:</strong> {contact?.email || 'N/A'}</p>
            </div>
          </div>

          {/* Bio editor */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Bio / Description
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              placeholder="Enter bio or description for this contact..."
            />
            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Characters: {bio.length}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !hasChanges}
              className={`px-4 py-2 rounded-lg transition-colors ${
                loading || !hasChanges
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
                  : 'bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600'
              }`}
            >
              {loading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </div>
              ) : (
                'Save Bio'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BioEditorModal;
