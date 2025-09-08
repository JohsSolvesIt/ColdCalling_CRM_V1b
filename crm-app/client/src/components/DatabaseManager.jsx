import React, { useState } from "react";
import { 
  Database, X, Check, Edit2, Trash2, Plus, Chrome, HardDrive, Globe
} from "lucide-react";

const DatabaseManager = ({ 
  databases, 
  currentDatabase, 
  newDatabaseName, 
  loading, 
  setLoading,
  setNewDatabaseName, 
  setShowDatabaseManager, 
  switchToDatabase, 
  api,
  loadDatabases,
  showToast,
  clearDatabaseStorage
}) => {
  // Local state for various operations
  const [localNewDbName, setLocalNewDbName] = useState(newDatabaseName);
  const [editingDatabase, setEditingDatabase] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [deletingDatabase, setDeletingDatabase] = useState(null);
  const [activeTab, setActiveTab] = useState('sqlite'); // 'sqlite' or 'chrome_extension'
  
  // Check if there's locally stored database info
  const hasStoredDatabase = () => {
    try {
      const stored = localStorage.getItem('crm_current_database');
      return !!stored;
    } catch {
      return false;
    }
  };
  
  const handleCreate = async () => {
    if (!localNewDbName.trim()) {
      showToast('⚠️ Please enter a database name', 'warning');
      return;
    }
    
    // Check for duplicates
    if (currentDatabases.includes(localNewDbName.trim())) {
      showToast('⚠️ Database with this name already exists', 'warning');
      return;
    }
    
    try {
      setLoading(true);
      await api.createDatabase(localNewDbName.trim());
      await loadDatabases();
      await switchToDatabase(localNewDbName.trim());
      setLocalNewDbName("");
      setNewDatabaseName("");
      showToast(`✅ Database "${localNewDbName.trim()}" created successfully!`, 'success');
      setShowDatabaseManager(false);
    } catch (error) {
      console.error('Failed to create database:', error);
      showToast(`❌ Failed to create database: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async (oldName, newName) => {
    if (!newName.trim() || newName === oldName) {
      cancelEditing();
      return;
    }
    
    if (currentDatabases.includes(newName.trim())) {
      showToast('⚠️ Database with this name already exists', 'warning');
      return;
    }
    
    try {
      setLoading(true);
      await api.renameDatabase(oldName, newName.trim());
      await loadDatabases();
      setEditingDatabase(null);
      setEditingName('');
      showToast(`✅ Database renamed to "${newName.trim()}"`, 'success');
    } catch (error) {
      console.error('Failed to rename database:', error);
      showToast(`❌ Failed to rename database: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (dbName) => {
    try {
      setLoading(true);
      await api.deleteDatabase(dbName);
      await loadDatabases();
      setDeletingDatabase(null);
      showToast(`✅ Database "${dbName}" deleted successfully`, 'success');
    } catch (error) {
      console.error('Failed to delete database:', error);
      showToast(`❌ Failed to delete database: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (dbName) => {
    setEditingDatabase(dbName);
    setEditingName(dbName);
  };

  const cancelEditing = () => {
    setEditingDatabase(null);
    setEditingName('');
  };

  const confirmDelete = (dbName) => {
    setDeletingDatabase(dbName);
  };

  const cancelDelete = () => {
    setDeletingDatabase(null);
  };

  const switchToChromeExtension = async () => {
    try {
      setLoading(true);
      await switchToDatabase('Realtor Database', 'chrome_extension');
      showToast('✅ Switched to Chrome Extension Database', 'success');
      setShowDatabaseManager(false);
    } catch (error) {
      console.error('Failed to switch to Chrome Extension:', error);
      showToast(`❌ Failed to switch to Chrome Extension: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Get databases based on current structure
  // Handle both old format (databases.sqlite, databases.chrome_extension) and new format (databases array + chrome_extension array)
  let sqliteDatabases = [];
  let chromeExtensionDatabases = [];
  
  console.log('DatabaseManager - Raw databases data:', databases);
  
  if (Array.isArray(databases)) {
    // New format: databases is an array of database objects
    sqliteDatabases = databases.filter(db => db.type === 'sqlite');
    chromeExtensionDatabases = databases.filter(db => db.type === 'chrome_extension');
  } else if (databases && typeof databases === 'object') {
    // Handle both old and new object formats
    if (databases.databases && Array.isArray(databases.databases)) {
      // New format: { databases: [...], chrome_extension: [...] }
      sqliteDatabases = databases.databases.filter(db => db.type === 'sqlite');
      chromeExtensionDatabases = databases.databases.filter(db => db.type === 'chrome_extension');
      
      // Also check separate chrome_extension array
      if (databases.chrome_extension && Array.isArray(databases.chrome_extension)) {
        chromeExtensionDatabases.push(...databases.chrome_extension);
      }
    } else {
      // Old format: { sqlite: [...], chrome_extension: [...] }
      sqliteDatabases = databases.sqlite || [];
      chromeExtensionDatabases = databases.chrome_extension || [];
    }
  }
  
  console.log('DatabaseManager - Chrome Extension databases:', chromeExtensionDatabases);
  
  // Normalize databases to strings for compatibility
  const currentDatabases = sqliteDatabases.map(db => typeof db === 'string' ? db : (db.name || db));
  const chromeExtensionAvailable = chromeExtensionDatabases.length > 0 && chromeExtensionDatabases.some(db => db.isConnected !== false);
  
  console.log('DatabaseManager - Chrome Extension available:', chromeExtensionAvailable);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Database className="h-6 w-6" />
              Database Manager
              <span className="text-sm text-slate-500">
                ({currentDatabases.length} SQLite{currentDatabases.length !== 1 ? 's' : ''}{chromeExtensionAvailable ? ' + Chrome Extension' : ''})
              </span>
            </h2>
            <button 
              onClick={() => setShowDatabaseManager(false)} 
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              disabled={loading}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex space-x-1 mt-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('sqlite')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'sqlite'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <HardDrive className="h-4 w-4" />
              SQLite Databases
            </button>
            <button
              onClick={() => setActiveTab('chrome_extension')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'chrome_extension'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Chrome className="h-4 w-4" />
              Chrome Extension
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {activeTab === 'sqlite' ? (
            <div className="space-y-6">
              {/* SQLite Databases */}
              {currentDatabases.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                    <HardDrive className="h-5 w-5" />
                    SQLite Databases
                  </h3>
                  <div className="space-y-3">
                    {currentDatabases.map(db => (
                      <div
                        key={db}
                        className={`p-4 rounded-lg border transition-colors ${
                          currentDatabase === db 
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' 
                            : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        {editingDatabase === db ? (
                          // Edit Mode
                          <div className="flex items-center gap-3">
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-sm"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') handleRename(db, editingName);
                                if (e.key === 'Escape') cancelEditing();
                              }}
                              autoFocus
                              disabled={loading}
                            />
                            <button
                              onClick={() => handleRename(db, editingName)}
                              disabled={loading || !editingName.trim()}
                              className="px-3 py-2 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700 disabled:opacity-50"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={cancelEditing}
                              disabled={loading}
                              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          // View Mode
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <span className="font-medium text-slate-900 dark:text-slate-100">
                                {db}
                              </span>
                              {currentDatabase === db && (
                                <span className="px-2 py-1 text-xs bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-full">
                                  Current
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {currentDatabase !== db && (
                                <button
                                  onClick={() => {
                                    switchToDatabase(db);
                                    setShowDatabaseManager(false);
                                  }}
                                  disabled={loading}
                                  className="px-3 py-1 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                                >
                                  Select
                                </button>
                              )}
                              
                              <button
                                onClick={() => startEditing(db)}
                                disabled={loading}
                                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                                title="Rename database"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              
                              <button
                                onClick={() => confirmDelete(db)}
                                disabled={loading || currentDatabase === db}
                                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title={currentDatabase === db ? "Cannot delete active database" : "Delete database"}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Create New Database */}
              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Create New Database
                </h3>
                <div className="p-4 border border-slate-300 dark:border-slate-700 rounded-lg">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={localNewDbName}
                      onChange={(e) => setLocalNewDbName(e.target.value)}
                      placeholder="Enter database name..."
                      className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800"
                      onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
                      disabled={loading}
                    />
                    <button
                      onClick={handleCreate}
                      disabled={!localNewDbName.trim() || loading}
                      className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Create
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Database names should be descriptive and unique
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Chrome Extension Tab */
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <Chrome className="h-5 w-5" />
                  Chrome Extension Database
                </h3>
                
                {chromeExtensionAvailable ? (
                  <div className="p-6 border border-slate-200 dark:border-slate-700 rounded-lg bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-blue-900/20 dark:to-emerald-900/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <Globe className="h-5 w-5 text-emerald-600" />
                          Realtor Database
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          Access extracted realtor data from Chrome Extension
                        </p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                            Connected
                          </span>
                          <span>Real-time data extraction</span>
                          <span>Read-only access</span>
                        </div>
                      </div>
                      
                      <button
                        onClick={switchToChromeExtension}
                        disabled={loading}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                      >
                        Connect
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className="text-center">
                      <Chrome className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                      <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                        Chrome Extension Not Available
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                        The Chrome Extension backend is not running or not connected.
                      </p>
                      <div className="text-xs text-slate-500 space-y-1">
                        <p>• Make sure the Chrome Extension backend is running on port 5001</p>
                        <p>• Check that all services are properly started</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer with Storage Management */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <span>Database selection is automatically saved for your next visit</span>
              {hasStoredDatabase() && (
                <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded text-xs">
                  Stored ✓
                </span>
              )}
            </div>
            <button
              onClick={() => {
                clearDatabaseStorage();
                showToast('🗑️ Local storage cleared. Database selection will reset on next refresh.', 'info');
              }}
              disabled={loading}
              className="px-3 py-1.5 text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
              title="Clear locally stored database preferences"
            >
              Clear Storage
            </button>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {deletingDatabase && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-sm mx-4 shadow-xl">
              <h3 className="text-lg font-semibold mb-3">Delete Database</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Are you sure you want to delete "<strong>{deletingDatabase}</strong>"? 
                This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={cancelDelete}
                  disabled={loading}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deletingDatabase)}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseManager;
