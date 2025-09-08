import React, { useState } from 'react';
import { X, Database, ArrowRight } from 'lucide-react';

const MoveToDbModal = ({
  showMoveToDbModal,
  setShowMoveToDbModal,
  databases,
  currentDatabase,
  selectedContacts,
  handleMoveContacts,
  loading
}) => {
  const [selectedTargetDb, setSelectedTargetDb] = useState('');

  if (!showMoveToDbModal) return null;

  // Ensure databases is an array and filter out current database
  // Add debugging and extra safety checks
  console.log('MoveToDbModal - databases:', databases, 'type:', typeof databases);
  
  let availableDatabases = [];
  if (Array.isArray(databases)) {
    // Handle both string arrays and object arrays
    availableDatabases = databases
      .map(db => typeof db === 'string' ? db : (db.name || db.currentDatabase || db))
      .filter(dbName => dbName !== currentDatabase);
  } else if (databases && typeof databases === 'object') {
    // Handle case where databases might be an object with sqlite/postgres arrays
    const sqliteDbs = Array.isArray(databases.sqlite) ? databases.sqlite : [];
    const postgresDbs = Array.isArray(databases.postgres) ? databases.postgres : [];
    const allDbs = [...sqliteDbs, ...postgresDbs];
    availableDatabases = allDbs
      .map(db => typeof db === 'string' ? db : (db.name || db.currentDatabase || db))
      .filter(dbName => dbName !== currentDatabase);
  } else {
    console.warn('MoveToDbModal - databases is not an array or object:', databases);
    availableDatabases = [];
  }

  const handleMove = async () => {
    if (!selectedTargetDb) return;
    
    await handleMoveContacts(selectedTargetDb);
    setShowMoveToDbModal(false);
    setSelectedTargetDb('');
  };

  const selectedContactsArray = Array.from(selectedContacts || []);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <ArrowRight className="h-5 w-5" />
              Move Contacts
            </h2>
            <button 
              onClick={() => setShowMoveToDbModal(false)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              Move <strong>{selectedContactsArray.length}</strong> selected contact{selectedContactsArray.length !== 1 ? 's' : ''} from:
            </p>
            <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg mb-4">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-slate-500" />
                <span className="font-medium">{typeof currentDatabase === 'object' ? currentDatabase?.name : currentDatabase}</span>
              </div>
            </div>
            
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              To database:
            </p>
            
            {availableDatabases.length > 0 ? (
              <select
                value={selectedTargetDb}
                onChange={(e) => setSelectedTargetDb(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
              >
                <option value="">Select target database...</option>
                {availableDatabases.map(db => (
                  <option key={db} value={db}>{db}</option>
                ))}
              </select>
            ) : (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  No other databases available. Create a new database first.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700">
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowMoveToDbModal(false)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleMove}
              disabled={!selectedTargetDb || loading || availableDatabases.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <ArrowRight className="h-4 w-4" />
              Move {selectedContactsArray.length} Contact{selectedContactsArray.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MoveToDbModal;
