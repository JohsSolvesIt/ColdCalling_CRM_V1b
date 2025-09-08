import React, { useState, useEffect } from 'react';
import { 
  X, Tag, Plus, Minus, Search, Check, Save, RefreshCw
} from 'lucide-react';
import { api } from '../services/api';

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

  // Get all unique tags from contacts (reading from dedicated tags field)
  const getAllAvailableTags = () => {
    const tagMap = new Map();
    let contactsWithTags = 0;
    
    console.log('🏷️ Scanning', rows.length, 'contacts for user-defined tags...');
    
    rows.forEach((contact, index) => {
      // Debug: Show all fields for first few contacts
      if (index < 3) {
        console.log(`Contact ${index} fields:`, Object.keys(contact));
        console.log(`Contact ${index} tags field:`, contact.tags);
        console.log(`Contact ${index} all tag-related fields:`, {
          tags: contact.tags,
          tag: contact.tag,
          Tag: contact.Tag,
          Tags: contact.Tags
        });
      }
      
      // Try multiple possible tag field names
      const possibleTagFields = ['tags', 'tag', 'Tag', 'Tags'];
      let contactTags = null;
      
      for (const field of possibleTagFields) {
        if (contact[field] && contact[field].toString().trim() !== '') {
          contactTags = contact[field];
          if (index < 3) {
            console.log(`Found tags in field '${field}':`, contactTags);
          }
          break;
        }
      }
      
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

  // Reset selected tags when modal opens
  useEffect(() => {
    if (showTagsModal) {
      setSelectedTags([]);
      setTagSearchFilter('');
      setNewTag('');
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

  // Apply tags to selected contacts (PROPER TAGS SYSTEM)
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
      
      // Wait a moment for React state to update, then refresh available tags
      setTimeout(() => {
        const updatedTags = getAllAvailableTags();
        setAvailableTags(updatedTags);
        console.log('🔄 Refreshed available tags after save:', updatedTags);
      }, 500);

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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Bulk Tag Management
            </h2>
            <button 
              onClick={() => setShowTagsModal(false)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            Manage tags for {selectedContacts.length} selected contacts
          </p>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
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
              <h3 className="font-medium text-green-800 dark:text-green-200 mb-3">Add New Tag</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter new tag name..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addNewTag()}
                  className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                />
                <button
                  onClick={addNewTag}
                  disabled={!newTag.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>
            </div>

            {/* Tag Selection */}
            <div className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Select Tags</h3>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllFilteredTags}
                    className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 rounded"
                  >
                    Select All
                  </button>
                  <button
                    onClick={clearSelectedTags}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded"
                  >
                    Clear All
                  </button>
                  <span className="text-xs text-slate-500 flex items-center">
                    {selectedTags.length} selected
                  </span>
                </div>
              </div>

              {/* Tag Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search tags..."
                  value={tagSearchFilter}
                  onChange={(e) => setTagSearchFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                />
              </div>

              {/* Tags Grid */}
              <div className="max-h-64 overflow-y-auto">
                {filteredTags.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {filteredTags.map(({ tag, count }) => (
                      <div
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedTags.includes(tag)
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                              selectedTags.includes(tag)
                                ? 'bg-blue-500 border-blue-500'
                                : 'border-slate-300 dark:border-slate-600'
                            }`}>
                              {selectedTags.includes(tag) && (
                                <Check className="h-3 w-3 text-white" />
                              )}
                            </div>
                            <span className="font-medium">{tag}</span>
                          </div>
                          <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-600 px-2 py-1 rounded">
                            {count}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    {tagSearchFilter ? 'No tags match your search' : 'No tags found. Add some tags to get started!'}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setShowTagsModal(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={applyTags}
                disabled={isLoading || selectedTags.length === 0 || selectedContacts.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {operation === 'add' ? 'Add Tags' : 'Remove Tags'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TagsModal;
