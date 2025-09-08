import React, { useState, useEffect } from 'react';
import { 
  X, Tag, Plus, Minus, Search, Check, Save, RefreshCw, Users, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';
import { STATUS_OPTIONS } from '../constants';

const TagsModal = ({
  showTagsModal,
  setShowTagsModal,
  selectedContacts = [],
  rows,
  loadData,
  showToast
}) => {
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagSearchFilter, setTagSearchFilter] = useState('');
  const [newTag, setNewTag] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [operation, setOperation] = useState('add'); // 'add' or 'remove'
  const [activeTab, setActiveTab] = useState('tags'); // 'tags' or 'status'
  const [selectedStatus, setSelectedStatus] = useState('');

  // Get all unique tags from contacts (reading from dedicated tags field)
  const getAllAvailableTags = () => {
    const tagMap = new Map();
    let contactsWithTags = 0;
    
    console.log('🏷️ Scanning', rows.length, 'contacts for user-defined tags...');
    
    rows.forEach((contact, index) => {
      // Read from dedicated 'tags' field for user-defined tags
      const contactTags = contact.tags;
      
      if (contactTags && contactTags.trim() !== '') {
        contactsWithTags++;
        const tagList = contactTags.toString().split(',').map(tag => tag.trim()).filter(tag => tag);
        
        if (index < 3) { // Log first few contacts for debugging
          console.log(`Contact ${contact.id || contact.name} has tags:`, contactTags, '→', tagList);
        }
        
        tagList.forEach(tag => {
          const count = tagMap.get(tag) || 0;
          tagMap.set(tag, count + 1);
        });
      }
    });
    
    console.log(`Found ${contactsWithTags} contacts with user tags out of ${rows.length} total`);
    
    const result = Array.from(tagMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([tag, count]) => ({ tag, count }));
    
    console.log('Final user tags extraction result:', result);
    return result;
  };

  // Extract available tags when modal opens or rows change
  useEffect(() => {
    if (showTagsModal && rows && rows.length > 0) {
      console.log('🏷️ Refreshing available tags...');
      const tags = getAllAvailableTags();
      console.log('🏷️ Found tags:', tags);
      setAvailableTags(tags);
    }
  }, [showTagsModal, rows]);

  // Reset state when modal opens
  useEffect(() => {
    if (showTagsModal) {
      setSelectedTags([]);
      setTagSearchFilter('');
      setNewTag('');
      setSelectedStatus('');
      setActiveTab('tags');
    }
  }, [showTagsModal]);

  // Filter tags based on search
  const filteredTags = availableTags.filter(({ tag }) => 
    tag.toLowerCase().includes(tagSearchFilter.toLowerCase())
  );

  if (!showTagsModal) return null;

  // Get tags that are currently applied to selected contacts
  const getCommonTags = () => {
    if (selectedContacts.length === 0) return [];
    
    const tagSets = selectedContacts.map(contact => {
      // Read from dedicated 'tags' field for user-defined tags
      const contactTags = contact.tags;
      return contactTags ? 
        contactTags.toString().split(',').map(tag => tag.trim()).filter(tag => tag) : 
        [];
    });
    
    // Find tags that appear in all selected contacts
    if (tagSets.length === 0) return [];
    
    return tagSets[0].filter(tag => 
      tagSets.every(tagSet => tagSet.includes(tag))
    );
  };

  const commonTags = getCommonTags();

  // Helper functions for tag selection
  const toggleTag = (tag) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
  };

  const addNewTag = () => {
    if (newTag.trim() && !availableTags.some(({ tag }) => tag === newTag.trim())) {
      const trimmedTag = newTag.trim();
      setAvailableTags(prev => [...prev, { tag: trimmedTag, count: 0 }]);
      setSelectedTags(prev => [...prev, trimmedTag]);
      setNewTag('');
    }
  };

  const selectAllFilteredTags = () => {
    const allFilteredTags = filteredTags.map(({ tag }) => tag);
    setSelectedTags(prev => {
      const newTags = allFilteredTags.filter(tag => !prev.includes(tag));
      return [...prev, ...newTags];
    });
  };

  const clearSelectedTags = () => {
    setSelectedTags([]);
  };

  // Apply tags to selected contacts
  const applyTags = async () => {
    if (selectedContacts.length === 0) {
      showToast('⚠️ No contacts selected.', 'warning');
      return;
    }

    if (selectedTags.length === 0) {
      showToast('⚠️ No tags selected.', 'warning');
      return;
    }

    setIsLoading(true);

    try {
      let successCount = 0;
      let errorCount = 0;

      console.log(`🏷️ ${operation === 'add' ? 'Adding' : 'Removing'} tags [${selectedTags.join(', ')}] ${operation === 'add' ? 'to' : 'from'} ${selectedContacts.length} contacts...`);

      for (const contact of selectedContacts) {
        try {
          // Read existing tags from dedicated 'tags' field
          const currentTags = contact.tags || '';
          let currentTagsList = currentTags ? 
            currentTags.split(',').map(tag => tag.trim()).filter(tag => tag) : 
            [];

          let newTagsList = [...currentTagsList];

          if (operation === 'add') {
            // Add selected tags (avoid duplicates)
            selectedTags.forEach(tag => {
              if (!newTagsList.includes(tag)) {
                newTagsList.push(tag);
              }
            });
          } else if (operation === 'remove') {
            // Remove selected tags
            newTagsList = newTagsList.filter(tag => !selectedTags.includes(tag));
          }

          const newTagsString = newTagsList.join(', ');

          console.log(`📝 Updating contact ${contact.id}: tags "${currentTags}" → "${newTagsString}"`);

          // Save to dedicated 'tags' field for user-defined tags
          await api.saveContact({
            ...contact,
            tags: newTagsString  // Always use 'tags' field for user tags
          });
          
          console.log(`✅ Contact ${contact.id} updated successfully. New tags: "${newTagsString}"`);

          successCount++;
        } catch (error) {
          console.error(`Failed to update tags for contact ${contact.id}:`, error);
          errorCount++;
        }
      }

      // Reload data to reflect changes
      await loadData();
      
      // Wait for the component to re-render with new data before refreshing tags
      setTimeout(() => {
        const updatedTags = getAllAvailableTags();
        setAvailableTags(updatedTags);
        console.log('🔄 Refreshed available tags after save:', updatedTags);
      }, 1000);

      let message = `✅ Tags ${operation}ed successfully!`;
      if (successCount > 0) {
        message += ` Updated ${successCount} contacts.`;
      }
      if (errorCount > 0) {
        message += ` Failed to update ${errorCount} contacts.`;
      }

      showToast(message, errorCount > 0 ? 'warning' : 'success');
      setShowTagsModal(false);
      
    } catch (error) {
      console.error('Failed to apply tags:', error);
      showToast(`❌ Failed to apply tags: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // STATUS MANAGEMENT FUNCTIONS
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
      setShowTagsModal(false);
      
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
              {activeTab === 'tags' ? (
                <>
                  <Tag className="h-5 w-5" />
                  Bulk Tag Management
                </>
              ) : (
                <>
                  <Users className="h-5 w-5" />
                  Bulk Status Management
                </>
              )}
            </h2>
            <button 
              onClick={() => setShowTagsModal(false)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            Manage {activeTab} for {selectedContacts.length} selected contacts
          </p>
          
          {/* Tab Navigation */}
          <div className="flex mt-4 space-x-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('tags')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'tags'
                  ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Tag className="h-4 w-4" />
              Tags
            </button>
            <button
              onClick={() => setActiveTab('status')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'status'
                  ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="h-4 w-4" />
              Status
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {activeTab === 'tags' ? (
            /* TAG MANAGEMENT CONTENT */
            <div className="space-y-6">
              {/* Operation Selection */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500">
                <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-3">Operation</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="operation"
                      value="add"
                      checked={operation === 'add'}
                      onChange={(e) => setOperation(e.target.value)}
                    />
                    <Plus className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Add tags to selected contacts</span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="operation"
                      value="remove"
                      checked={operation === 'remove'}
                      onChange={(e) => setOperation(e.target.value)}
                    />
                    <Minus className="h-4 w-4 text-red-600" />
                    <span className="text-sm">Remove tags from selected contacts</span>
                  </label>
                </div>
              </div>

              {/* Common Tags Display */}
              {commonTags.length > 0 && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-l-4 border-yellow-500">
                  <h3 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                    Common Tags (present in all selected contacts)
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {commonTags.map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Add New Tag */}
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-l-4 border-green-500">
                <h3 className="font-medium text-green-800 dark:text-green-200 mb-3">Create New Tag</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Enter new tag name..."
                    className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
                    onKeyDown={(e) => e.key === 'Enter' && addNewTag()}
                  />
                  <button
                    onClick={addNewTag}
                    disabled={!newTag.trim()}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Tag Search */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={tagSearchFilter}
                      onChange={(e) => setTagSearchFilter(e.target.value)}
                      placeholder="Search tags..."
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
                    />
                  </div>
                  <button
                    onClick={selectAllFilteredTags}
                    className="px-3 py-2 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50"
                  >
                    Select All
                  </button>
                  <button
                    onClick={clearSelectedTags}
                    className="px-3 py-2 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600"
                  >
                    Clear
                  </button>
                </div>

                {/* Available Tags */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Available Tags ({filteredTags.length})</h3>
                    {selectedTags.length > 0 && (
                      <span className="text-sm text-blue-600 dark:text-blue-400">
                        {selectedTags.length} selected
                      </span>
                    )}
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-600 rounded-lg">
                    {filteredTags.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                        {tagSearchFilter ? 'No tags match your search' : 'No tags available'}
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-200 dark:divide-slate-600">
                        {filteredTags.map(({ tag, count }) => (
                          <label
                            key={tag}
                            className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={selectedTags.includes(tag)}
                                onChange={() => toggleTag(tag)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="font-medium">{tag}</span>
                            </div>
                            <span className="text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-600 px-2 py-1 rounded">
                              {count}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected Tags Preview */}
                {selectedTags.length > 0 && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                      Selected Tags ({selectedTags.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedTags.map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded text-sm"
                        >
                          {tag}
                          <button
                            onClick={() => toggleTag(tag)}
                            className="hover:bg-blue-300 dark:hover:bg-blue-700 rounded-full p-1"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* STATUS MANAGEMENT CONTENT */
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
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {activeTab === 'tags' ? (
                selectedTags.length > 0 ? (
                  <span>
                    Ready to {operation} {selectedTags.length} tag(s) {operation === 'add' ? 'to' : 'from'} {selectedContacts.length} contacts
                  </span>
                ) : (
                  <span>Select tags to continue</span>
                )
              ) : (
                selectedStatus ? (
                  <span>
                    Ready to update {selectedContacts.length} contacts to "{selectedStatus}"
                  </span>
                ) : (
                  <span>Select a status to continue</span>
                )
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowTagsModal(false)}
                className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={activeTab === 'tags' ? applyTags : applyStatus}
                disabled={
                  selectedContacts.length === 0 || isLoading ||
                  (activeTab === 'tags' ? selectedTags.length === 0 : !selectedStatus)
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                title={
                  activeTab === 'tags' 
                    ? (!selectedTags.length ? "Please select tags" : selectedContacts.length === 0 ? "Please select contacts" : `${operation === 'add' ? 'Add' : 'Remove'} selected tags`)
                    : (!selectedStatus ? "Please select a status" : selectedContacts.length === 0 ? "Please select contacts" : "Apply the selected status to all selected contacts")
                }
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    {activeTab === 'tags' ? 'Updating...' : 'Updating Status...'}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {activeTab === 'tags' 
                      ? `${operation === 'add' ? 'Add' : 'Remove'} Tags (${selectedContacts.length})`
                      : `Update Status (${selectedContacts.length})`
                    }
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

export default TagsModal;
