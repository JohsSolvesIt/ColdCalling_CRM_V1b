import React, { useState, useEffect } from 'react';
import { 
  X, Users, Check, Save, RefreshCw, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';
import { STATUS_OPTIONS } from '../constants';

const StatusModal = ({
  showStatusModal,
  setShowStatusModal,
  selectedContacts = [],
  rows,
  loadData,
  showToast
}) => {
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [operation, setOperation] = useState('set'); // 'set' only for now, could add 'clear' later

  // Reset state when modal opens
  useEffect(() => {
    if (showStatusModal) {
      setSelectedStatus('');
    }
  }, [showStatusModal]);

  if (!showStatusModal) return null;

  // Get current status distribution of selected contacts
  const getStatusDistribution = () => {
    const statusMap = new Map();
    
    selectedContacts.forEach(contact => {
      const status = contact.Status || 'New';
      const count = statusMap.get(status) || 0;
      statusMap.set(status, count + 1);
    });
    
    return Array.from(statusMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([status, count]) => ({ status, count }));
  };

  const statusDistribution = getStatusDistribution();

  // Check if all selected contacts have the same status
  const commonStatus = statusDistribution.length === 1 ? statusDistribution[0].status : null;

  // Apply status to selected contacts
  const applyStatus = async () => {
    if (selectedContacts.length === 0) {
      showToast('⚠️ No contacts selected.', 'warning');
      return;
    }

    if (!selectedStatus) {
      showToast('⚠️ Please select a status.', 'warning');
      return;
    }

    setIsLoading(true);

    try {
      let successCount = 0;
      let errorCount = 0;

      console.log(`📋 Setting status "${selectedStatus}" for ${selectedContacts.length} contacts...`);

      for (const contact of selectedContacts) {
        try {
          const currentStatus = contact.Status;
          
          console.log(`📝 Updating contact ${contact.id}: status "${currentStatus}" → "${selectedStatus}"`);

          // Update the contact with new status and timestamp
          await api.saveContact({
            ...contact,
            Status: selectedStatus,
            LastContacted: new Date().toISOString()
          });
          
          console.log(`✅ Contact ${contact.id} status updated successfully to "${selectedStatus}"`);

          successCount++;
        } catch (error) {
          console.error(`Failed to update status for contact ${contact.id}:`, error);
          errorCount++;
        }
      }

      // Reload data to reflect changes
      await loadData();

      let message = `✅ Status updated successfully!`;
      if (successCount > 0) {
        message += ` Updated ${successCount} contacts to "${selectedStatus}".`;
      }
      if (errorCount > 0) {
        message += ` Failed to update ${errorCount} contacts.`;
      }

      showToast(message, errorCount > 0 ? 'warning' : 'success');
      setShowStatusModal(false);
      
    } catch (error) {
      console.error('Failed to apply status:', error);
      showToast(`❌ Failed to apply status: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'New': 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300',
      'No Answer': 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300',
      'Left Voicemail': 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300',
      'Callback Requested': 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300',
      'Initial Followup': 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30 dark:text-cyan-300',
      'Interested': 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-300',
      'Not Interested': 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-300',
      'Wrong Number': 'text-gray-600 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-300',
      'Do Not Call': 'text-red-800 bg-red-200 dark:bg-red-900/50 dark:text-red-200',
      'SENT TEXT': 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300',
      'Texted and Called': 'text-pink-600 bg-pink-100 dark:bg-pink-900/30 dark:text-pink-300',
      'SOLD!': 'text-emerald-800 bg-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-200',
    };
    
    return statusColors[status] || 'text-slate-600 bg-slate-100 dark:bg-slate-900/30 dark:text-slate-300';
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Bulk Status Management
            </h2>
            <button 
              onClick={() => setShowStatusModal(false)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            Update status for {selectedContacts.length} selected contacts
          </p>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="space-y-6">
            
            {/* Current Status Distribution */}
            {statusDistribution.length > 0 && (
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <h3 className="font-medium text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Current Status Distribution
                </h3>
                {commonStatus ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      All selected contacts have status:
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(commonStatus)}`}>
                      {commonStatus}
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {statusDistribution.map(({ status, count }) => (
                      <div key={status} className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-600">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(status)}`}>
                          {status}
                        </span>
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Status Selection */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500">
              <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-3">
                Select New Status
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                Choose the status to apply to all selected contacts:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {STATUS_OPTIONS.map(status => (
                  <label
                    key={status}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedStatus === status
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={status}
                      checked={selectedStatus === status}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="text-blue-600"
                    />
                    <span className={`flex-1 px-2 py-1 rounded text-sm font-medium ${getStatusColor(status)}`}>
                      {status}
                    </span>
                    {commonStatus === status && (
                      <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded">
                        Current
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Warning for status conflicts */}
            {selectedStatus && !commonStatus && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border-l-4 border-amber-500">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <h3 className="font-medium text-amber-800 dark:text-amber-200">
                    Mixed Status Warning
                  </h3>
                </div>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Selected contacts currently have different statuses. Setting to "{selectedStatus}" will overwrite all existing statuses.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {selectedStatus ? (
                <span>
                  Ready to update {selectedContacts.length} contacts to "{selectedStatus}"
                </span>
              ) : (
                <span>Select a status to continue</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={applyStatus}
                disabled={!selectedStatus || selectedContacts.length === 0 || isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                title={
                  !selectedStatus ? "Please select a status" : 
                  selectedContacts.length === 0 ? "Please select contacts" : 
                  "Apply the selected status to all selected contacts"
                }
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Update Status ({selectedContacts.length})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusModal;
