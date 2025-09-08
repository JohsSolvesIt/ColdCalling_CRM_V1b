import React, { useState } from "react";
import { 
  Database, X, AlertCircle, RefreshCw
} from "lucide-react";

const MoveToDbModal = ({ 
  showMoveToDbModal, 
  setShowMoveToDbModal, 
  databases, 
  currentDatabase, 
  selectedContacts, 
  handleMoveContacts, 
  loading 
}) => {
  const [targetDatabase, setTargetDatabase] = useState('');
  
  // Robust database handling - fix for "databases.filter is not a function" error
  let availableDatabases = [];
  
  if (Array.isArray(databases)) {
    // Normal case: databases is an array
    // Handle both string arrays and object arrays
    availableDatabases = databases
      .map(db => typeof db === 'string' ? db : (db.name || db))
      .filter(dbName => dbName !== currentDatabase);
  } else if (databases && typeof databases === 'object') {
    // Handle case where databases might be an object with sqlite/postgres arrays
    const sqliteDbs = Array.isArray(databases.sqlite) ? databases.sqlite : [];
    const postgresDbs = Array.isArray(databases.postgres) ? databases.postgres : [];
    const allDbs = [...sqliteDbs, ...postgresDbs];
    availableDatabases = allDbs
      .map(db => typeof db === 'string' ? db : (db.name || db))
      .filter(dbName => dbName !== currentDatabase);
  } else {
    // Fallback: databases is neither array nor object
    console.warn('MoveToDbModal - databases is not an array or valid object:', databases);
    availableDatabases = [];
  }
  
  const handleMove = () => {
    if (targetDatabase) {
      handleMoveContacts(targetDatabase);
    }
  };
  
  if (!showMoveToDbModal) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Database className="h-5 w-5" />
              Move Contacts to Database
            </h2>
            <button 
              onClick={() => setShowMoveToDbModal(false)} 
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              disabled={loading}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6">
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>{selectedContacts.size} contact{selectedContacts.size > 1 ? 's' : ''} selected</strong> from database "{currentDatabase}"
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Target Database</label>
              {availableDatabases.length === 0 ? (
                <div className="p-4 border border-slate-300 dark:border-slate-600 rounded-lg text-center">
                  <Database className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    No other databases available
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Create another database to move contacts
                  </p>
                </div>
              ) : (
                <select
                  value={targetDatabase}
                  onChange={(e) => setTargetDatabase(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
                  disabled={loading}
                >
                  <option value="">Select target database...</option>
                  {availableDatabases.map(db => (
                    <option key={db} value={db}>{db}</option>
                  ))}
                </select>
              )}
            </div>
            
            {availableDatabases.length > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <div className="flex">
                  <AlertCircle className="h-4 w-4 text-amber-600 mr-2 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-700 dark:text-amber-300">
                    <p className="font-medium">Moving contacts will:</p>
                    <ul className="mt-1 list-disc list-inside space-y-1">
                      <li>Remove them from the current database</li>
                      <li>Add them to the target database</li>
                      <li>Preserve all contact data and history</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700">
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowMoveToDbModal(false)}
              disabled={loading}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            {availableDatabases.length > 0 && (
              <button
                onClick={handleMove}
                disabled={loading || !targetDatabase}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Moving...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4" />
                    Move {selectedContacts.size} Contact{selectedContacts.size > 1 ? 's' : ''}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MoveToDbModal;
