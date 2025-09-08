import React, { useState, useEffect } from 'react';
import { useDatabase } from '../hooks/useDatabase';

// Simple debug component to test database loading
export const DatabaseDebug = () => {
  const { databases, rawDatabases, currentDatabase, loadDatabases } = useDatabase();
  const [debugInfo, setDebugInfo] = useState('Not loaded');

  useEffect(() => {
    console.log('DatabaseDebug mounted, calling loadDatabases...');
    loadDatabases();
  }, [loadDatabases]);

  useEffect(() => {
    console.log('DatabaseDebug - databases changed:', databases);
    console.log('DatabaseDebug - rawDatabases changed:', rawDatabases);
    console.log('DatabaseDebug - currentDatabase changed:', currentDatabase);
    
    setDebugInfo(JSON.stringify({
      databases: databases,
      rawDatabases: rawDatabases,
      currentDatabase: currentDatabase
    }, null, 2));
  }, [databases, rawDatabases, currentDatabase]);

  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0', margin: '10px' }}>
      <h3>Database Debug Info</h3>
      <pre style={{ fontSize: '12px', maxHeight: '400px', overflow: 'auto' }}>
        {debugInfo}
      </pre>
    </div>
  );
};

export default DatabaseDebug;
