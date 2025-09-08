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
  const [selectedContactTags, setSelectedContactTags] = useState(new Map());

  // Get current tags for selected contacts
  const getSelectedContactsTags = () => {
    const contactTagsMap = new Map();
    const allTagsSet = new Set();
    
    console.log('🏷️ Getting tags for', selectedContacts.length, 'selected contacts...');
    
    selectedContacts.forEach(contact => {
      // Try multiple possible tag field names
      const possibleTagFields = ['tags', 'tag', 'Tag', 'Tags'];
      let contactTags = '';
      
      for (const field of possibleTagFields) {
        if (contact[field] && contact[field].toString().trim() !== '') {
          contactTags = contact[field].toString().trim();
          break;
        }
      }
      
      const tagList = contactTags ? contactTags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
      contactTagsMap.set(contact.id, tagList);
      
      // Add to global tags set
      tagList.forEach(tag => allTagsSet.add(tag));
      
      console.log(`Contact ${contact.name}: tags = [${tagList.join(', ')}]`);
    });
    
    setSelectedContactTags(contactTagsMap);
    
    // Convert to tag objects with counts
    const tagCounts = new Map();
    contactTagsMap.forEach(tagList => {
      tagList.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });
    
    const tagObjects = Array.from(tagCounts.entries()).map(([tag, count]) => ({
      tag,
      count,
      percentage: Math.round((count / selectedContacts.length) * 100)
    }));
    
    console.log('🏷️ Selected contacts tags summary:', tagObjects);
    return tagObjects;
  };

  // Get all unique tags from all contacts for suggestions
  const getAllAvailableTags = () => {
    const tagMap = new Map();
    
    rows.forEach(contact => {
      const possibleTagFields = ['tags', 'tag', 'Tag', 'Tags'];
      let contactTags = '';
      
      for (const field of possibleTagFields) {
        if (contact[field] && contact[field].toString().trim() !== '') {
          contactTags = contact[field].toString().trim();
          break;
        }
      }
      
      if (contactTags) {
        const tagList = contactTags.split(',').map(tag => tag.trim()).filter(tag => tag);
        tagList.forEach(tag => {
          const count = tagMap.get(tag) || 0;
          tagMap.set(tag, count + 1);
        });
      }
    });
    
    return Array.from(tagMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([tag, count]) => ({ tag, count }));
  };

  // Load tags when modal opens or selected contacts change
  useEffect(() => {
    if (showTagsModal && selectedContacts.length > 0) {
      console.log('🏷️ TagsModal opened, loading tags for selected contacts...');
      const selectedTags = getSelectedContactsTags();
      const allTags = getAllAvailableTags();
      setAvailableTags(allTags);
      
      // Show current tags of selected contacts
      console.log('🏷️ Current tags for selected contacts:', selectedTags);
    }
  }, [showTagsModal, selectedContacts, rows]);

  // Reset state when modal opens
  useEffect(() => {
    if (showTagsModal) {
      setSelectedTags([]);
      setTagSearchFilter('');
      setNewTag('');
    }
  }, [showTagsModal]);

  // Add new tag
  const handleAddNewTag = () => {
    if (newTag.trim() && !availableTags.some(t => t.tag === newTag.trim())) {
      const newTagObj = { tag: newTag.trim(), count: 0 };
      setAvailableTags(prev => [...prev, newTagObj].sort((a, b) => a.tag.localeCompare(b.tag)));
      setSelectedTags(prev => [...prev, newTag.trim()]);
      setNewTag('');
      console.log('Added new tag:', newTag.trim());
    }
  };

  // Toggle tag selection
  const toggleTagSelection = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  // Select all tags
  const selectAllTags = () => {
    const filteredTags = getFilteredTags();
    setSelectedTags(filteredTags.map(t => t.tag));
  };

  // Clear all tag selections
  const clearAllTags = () => {
    setSelectedTags([]);
  };

  // Filter tags based on search
  const getFilteredTags = () => {
    return availableTags.filter(tagObj => 
      tagObj.tag.toLowerCase().includes(tagSearchFilter.toLowerCase())
    );
  };

  // Apply tags to selected contacts
  const applyTags = async () => {
    if (selectedTags.length === 0) {
      showToast('⚠️ Please select at least one tag', 'warning');
      return;
    }

    setIsLoading(true);
    
    try {
      console.log(`🏷️ ${operation === 'add' ? 'Adding' : 'Removing'} tags [${selectedTags.join(', ')}] to ${selectedContacts.length} contacts...`);
      
      let successCount = 0;
      let errorCount = 0;

      for (const contact of selectedContacts) {
        try {
          // Get current tags
          const possibleTagFields = ['tags', 'tag', 'Tag', 'Tags'];
          let currentTags = '';
          
          for (const field of possibleTagFields) {
            if (contact[field] && contact[field].toString().trim() !== '') {
              currentTags = contact[field].toString().trim();
              break;
            }
          }

          let currentTagsList = currentTags ? currentTags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
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
      
      // Wait a moment for React state to update, then refresh
      setTimeout(() => {
        console.log('🔄 Refreshing TagsModal after save...');
        const updatedSelectedTags = getSelectedContactsTags();
        const updatedAllTags = getAllAvailableTags();
        setAvailableTags(updatedAllTags);
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

  if (!showTagsModal) return null;

  const filteredTags = getFilteredTags();

  // Get summary of current tags for selected contacts
  const currentTagsSummary = getSelectedContactsTags();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Tag className="w-5 h-5 mr-2" />
              Bulk Tag Management
            </h3>
            <button
              onClick={() => setShowTagsModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Manage tags for {selectedContacts.length} selected contacts
          </p>
        </div>

        <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          {/* Current Tags Summary */}
          {currentTagsSummary.length > 0 && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Current Tags on Selected Contacts:</h4>
              <div className="flex flex-wrap gap-2">
                {currentTagsSummary.map(({ tag, count, percentage }) => (
                  <span 
                    key={tag}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {tag} ({count}/{selectedContacts.length} - {percentage}%)
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Operation Selection */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">Operation</h4>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="operation"
                  value="add"
                  checked={operation === 'add'}
                  onChange={(e) => setOperation(e.target.value)}
                  className="mr-2"
                />
                <Plus className="w-4 h-4 mr-1" />
                Add tags to selected contacts
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="operation"
                  value="remove"
                  checked={operation === 'remove'}
                  onChange={(e) => setOperation(e.target.value)}
                  className="mr-2"
                />
                <Minus className="w-4 h-4 mr-1" />
                Remove tags from selected contacts
              </label>
            </div>
          </div>

          {/* Add New Tag */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">Add New Tag</h4>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddNewTag()}
                placeholder="Enter new tag name..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddNewTag}
                disabled={!newTag.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </button>
            </div>
          </div>

          {/* Tag Selection */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">Select Tags</h4>
              <div className="flex space-x-2">
                <button
                  onClick={selectAllTags}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Select All
                </button>
                <button
                  onClick={clearAllTags}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Clear All
                </button>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-3">
              {selectedTags.length} selected
            </p>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={tagSearchFilter}
                onChange={(e) => setTagSearchFilter(e.target.value)}
                placeholder="Search tags..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Tags List */}
            <div className="border border-gray-300 rounded-md max-h-64 overflow-y-auto">
              {filteredTags.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {availableTags.length === 0 
                    ? "No tags found. Add some tags to get started!"
                    : "No tags match your search."
                  }
                </div>
              ) : (
                <div className="p-2">
                  {filteredTags.map(({ tag, count }) => (
                    <label
                      key={tag}
                      className="flex items-center p-2 hover:bg-gray-50 cursor-pointer rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTags.includes(tag)}
                        onChange={() => toggleTagSelection(tag)}
                        className="mr-3"
                      />
                      <span className="flex-1">{tag}</span>
                      <span className="text-sm text-gray-500">({count} contacts)</span>
                      {selectedTags.includes(tag) && (
                        <Check className="w-4 h-4 text-green-500 ml-2" />
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowTagsModal(false)}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={applyTags}
              disabled={selectedTags.length === 0 || isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isLoading ? 'Applying...' : `${operation === 'add' ? 'Add' : 'Remove'} Tags`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TagsModal;
