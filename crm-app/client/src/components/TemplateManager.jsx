import React, { useState, useEffect } from "react";
import { 
  MessageSquare, X, Plus, Edit2, Trash2, Copy
} from "lucide-react";

const TemplateManager = ({ 
  showTemplateManager, 
  setShowTemplateManager, 
  smsTemplates, 
  setSmsTemplates,
  api,
  showToast,
  onClose
}) => {
  // Local state to prevent re-renders from affecting input focus
  const [localTemplates, setLocalTemplates] = useState([]);
  const [newTemplate, setNewTemplate] = useState('');
  const [newTemplateName, setNewTemplateName] = useState('');
  const [editingIndex, setEditingIndex] = useState(-1);
  const [editingText, setEditingText] = useState('');
  const [editingName, setEditingName] = useState('');
  const [loading, setLoading] = useState(false);

  // Helper function to handle closing the modal
  const handleClose = () => {
    setShowTemplateManager(false);
    if (onClose) {
      onClose(); // Callback to reload templates in main app
    }
  };

  // Initialize local templates when modal opens
  useEffect(() => {
    if (showTemplateManager) {
      setLocalTemplates([...smsTemplates]);
    }
  }, [showTemplateManager, smsTemplates]);

  const handleAddTemplate = async () => {
    if (!newTemplate.trim()) {
      alert('Please enter a template message');
      return;
    }

    // Check for duplicates - handle both string and object templates
    const templateContent = newTemplate.trim();
    const existingContents = localTemplates.map(t => 
      typeof t === 'string' ? t : t.content
    );
    
    if (existingContents.includes(templateContent)) {
      alert('This template already exists');
      return;
    }

    try {
      setLoading(true);
      
      // Create template object with name and content
      const templateData = {
        name: newTemplateName.trim() || `Template ${localTemplates.length + 1}`,
        content: templateContent,
        category: 'custom'
      };
      
      await api.addSmsTemplate(templateData);
      
      // Reload templates from server to ensure persistence
      const freshTemplates = await api.getSmsTemplates();
      setLocalTemplates(freshTemplates);
      setSmsTemplates(freshTemplates);
      
      setNewTemplate('');
      setNewTemplateName('');
      showToast('✅ Template added successfully!', 'success');
    } catch (error) {
      console.error('Failed to add template:', error);
      alert('Failed to add template: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (index) => {
    const templateToDelete = localTemplates[index];
    const templateContent = typeof templateToDelete === 'string' 
      ? templateToDelete 
      : templateToDelete.content;
    
    // Show confirmation
    const confirmed = window.confirm(
      `Are you sure you want to delete this template?\n\n"${templateContent.substring(0, 100)}${templateContent.length > 100 ? '...' : ''}"\n\nThis action cannot be undone.`
    );
    
    if (!confirmed) return;

    try {
      setLoading(true);
      await api.deleteSmsTemplate(templateToDelete);
      
      // Reload templates from server to ensure persistence
      const freshTemplates = await api.getSmsTemplates();
      setLocalTemplates(freshTemplates);
      setSmsTemplates(freshTemplates);
      
      showToast('🗑️ Template deleted successfully!', 'success');
    } catch (error) {
      console.error('Failed to delete template:', error);
      alert('Failed to delete template: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (index) => {
    setEditingIndex(index);
    const template = localTemplates[index];
    const templateContent = typeof template === 'string' ? template : template.content;
    const templateName = typeof template === 'string' ? '' : (template.name || '');
    setEditingText(templateContent);
    setEditingName(templateName);
  };

  const cancelEditing = () => {
    setEditingIndex(-1);
    setEditingText('');
    setEditingName('');
  };

  const saveEdit = async (index) => {
    if (!editingText.trim()) {
      alert('Template content cannot be empty');
      return;
    }

    if (!editingName.trim()) {
      alert('Template name cannot be empty');
      return;
    }

    // Check for duplicates (excluding the current template)
    const existingContents = localTemplates
      .map(template => typeof template === 'string' ? template : template.content)
      .filter((_, i) => i !== index);
    
    if (existingContents.includes(editingText.trim())) {
      alert('A template with this content already exists');
      return;
    }

    const oldTemplate = localTemplates[index];
    
    try {
      setLoading(true);
      
      // Create updated template data
      const updatedTemplateData = {
        name: editingName.trim(),
        content: editingText.trim(),
        category: (typeof oldTemplate === 'object' && oldTemplate.category) ? oldTemplate.category : 'custom'
      };
      
      await api.updateSmsTemplate(oldTemplate, updatedTemplateData);
      
      // Reload templates from server to ensure persistence
      const freshTemplates = await api.getSmsTemplates();
      setLocalTemplates(freshTemplates);
      setSmsTemplates(freshTemplates);
      
      setEditingIndex(-1);
      setEditingText('');
      setEditingName('');
      showToast('✅ Template updated successfully!', 'success');
    } catch (error) {
      console.error('Failed to update template:', error);
      alert('Failed to update template: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const duplicateTemplate = (template) => {
    const templateContent = typeof template === 'string' ? template : template.content;
    const templateName = typeof template === 'string' ? 'Template Copy' : (template.name + ' (Copy)');
    setNewTemplate(templateContent);
    setNewTemplateName(templateName);
  };

  if (!showTemplateManager) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Template Manager
            <span className="text-sm text-slate-500">({localTemplates.length} templates)</span>
          </h2>
          <button 
            onClick={handleClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
            disabled={loading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Add New Template Section */}
          <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <label className="block text-sm font-medium mb-2">Add New Template</label>
            
            {/* Variable Insertion Buttons */}
            <div className="mb-3">
              <label className="block text-xs font-medium mb-2 text-slate-600 dark:text-slate-400">Quick Insert Variables:</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'First Name', value: '{firstName}' },
                  { label: 'Full Name', value: '{name}' },
                  { label: 'Last Name', value: '{lastName}' },
                  { label: 'Company', value: '{company}' },
                  { label: 'Current Date', value: '{date}' },
                  { label: 'Current Time', value: '{time}' }
                ].map((variable) => (
                  <button
                    key={variable.value}
                    onClick={() => {
                      const textarea = document.querySelector('#new-template-textarea');
                      if (textarea) {
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const text = newTemplate;
                        const newText = text.substring(0, start) + variable.value + text.substring(end);
                        setNewTemplate(newText);
                        // Set cursor position after the inserted variable
                        setTimeout(() => {
                          textarea.focus();
                          textarea.setSelectionRange(start + variable.value.length, start + variable.value.length);
                        }, 0);
                      }
                    }}
                    disabled={loading}
                    className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 disabled:opacity-50 transition-colors"
                  >
                    {variable.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Template Name Input */}
            <div className="mb-3">
              <label htmlFor="new-template-name" className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-400">
                Template Name:
              </label>
              <input
                id="new-template-name"
                type="text"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="Enter a name for this template (e.g., 'Follow Up - General')"
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm"
                disabled={loading}
              />
            </div>
            
            <div className="flex gap-2">
              <div className="flex-1">
                <label htmlFor="new-template-textarea" className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-400">
                  Template Content:
                </label>
                <textarea
                  id="new-template-textarea"
                  value={newTemplate}
                  onChange={(e) => setNewTemplate(e.target.value)}
                  placeholder="Enter your new SMS template... Use the buttons above to insert variables"
                  className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 resize-none"
                  rows={3}
                  disabled={loading}
                />
              </div>
              <button
                onClick={handleAddTemplate}
                disabled={!newTemplate.trim() || !newTemplateName.trim() || loading}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 self-start"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {newTemplate.length} characters {newTemplate.length > 160 ? `(${Math.ceil(newTemplate.length / 160)} SMS segments)` : ''}
            </div>
          </div>

          {/* Templates List */}
          <div className="flex-1 overflow-y-auto">
            <h3 className="text-sm font-medium mb-3">Existing Templates</h3>
            {localTemplates.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No templates found</p>
                <p className="text-sm">Add your first template above to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {localTemplates.map((template, index) => (
                  <div key={index} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                    {editingIndex === index ? (
                      // Edit Mode
                      <div className="space-y-3">
                        {/* Variable Insertion Buttons */}
                        <div>
                          <label className="block text-xs font-medium mb-2 text-slate-600 dark:text-slate-400">Quick Insert Variables:</label>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {[
                              { label: 'First Name', value: '{firstName}' },
                              { label: 'Full Name', value: '{name}' },
                              { label: 'Last Name', value: '{lastName}' },
                              { label: 'Company', value: '{company}' },
                              { label: 'Current Date', value: '{date}' },
                              { label: 'Current Time', value: '{time}' }
                            ].map((variable) => (
                              <button
                                key={variable.value}
                                onClick={() => {
                                  const textarea = document.querySelector(`#edit-template-textarea-${index}`);
                                  if (textarea) {
                                    const start = textarea.selectionStart;
                                    const end = textarea.selectionEnd;
                                    const text = editingText;
                                    const newText = text.substring(0, start) + variable.value + text.substring(end);
                                    setEditingText(newText);
                                    // Set cursor position after the inserted variable
                                    setTimeout(() => {
                                      textarea.focus();
                                      textarea.setSelectionRange(start + variable.value.length, start + variable.value.length);
                                    }, 0);
                                  }
                                }}
                                disabled={loading}
                                className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 disabled:opacity-50 transition-colors"
                              >
                                {variable.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        {/* Template Name Input */}
                        <div className="mb-3">
                          <label htmlFor={`edit-template-name-${index}`} className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-400">
                            Template Name:
                          </label>
                          <input
                            id={`edit-template-name-${index}`}
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            placeholder="Enter a name for this template"
                            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm"
                            disabled={loading}
                          />
                        </div>
                        
                        {/* Template Content */}
                        <div className="mb-3">
                          <label htmlFor={`edit-template-textarea-${index}`} className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-400">
                            Template Content:
                          </label>
                          <textarea
                            id={`edit-template-textarea-${index}`}
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 resize-none"
                            rows={4}
                            disabled={loading}
                            autoFocus
                          />
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">
                            {editingText.length} characters {editingText.length > 160 ? `(${Math.ceil(editingText.length / 160)} SMS segments)` : ''}
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={cancelEditing}
                              className="px-3 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                              disabled={loading}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => saveEdit(index)}
                              className="px-3 py-1 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
                              disabled={loading || !editingText.trim() || !editingName.trim()}
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div>
                        {/* Template Name (if it's an object) */}
                        {typeof template === 'object' && template.name && (
                          <div className="mb-2">
                            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              {template.name}
                            </h4>
                            {template.category && (
                              <span className="inline-block px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                                {template.category}
                              </span>
                            )}
                          </div>
                        )}
                        
                        <div className="mb-3">
                          <div className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                            {typeof template === 'string' ? template : template.content}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {(typeof template === 'string' ? template : template.content).length} characters {(typeof template === 'string' ? template : template.content).length > 160 ? `(${Math.ceil((typeof template === 'string' ? template : template.content).length / 160)} SMS segments)` : ''}
                            {typeof template === 'object' && template.usage_count > 0 && (
                              <span className="ml-2">• Used {template.usage_count} times</span>
                            )}
                          </div>
                          
                          {/* Show variables if available */}
                          {typeof template === 'object' && template.variables && template.variables.length > 0 && (
                            <div className="mt-2">
                              <span className="text-xs text-slate-600 dark:text-slate-400">Variables: </span>
                              {template.variables.map((variable, i) => (
                                <span key={variable} className="inline-block px-1 py-0.5 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded mr-1">
                                  {variable}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => duplicateTemplate(template)}
                            className="p-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            title="Duplicate template"
                            disabled={loading}
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => startEditing(index)}
                            className="p-1 text-blue-500 hover:text-blue-700"
                            title="Edit template"
                            disabled={loading}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(index)}
                            className="p-1 text-red-500 hover:text-red-700"
                            title="Delete template"
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center">
            <div className="text-sm text-slate-500">
              💡 Use variables like {"{name}"}, {"{firstName}"}, {"{company}"} for personalization
            </div>
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
              disabled={loading}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateManager;
