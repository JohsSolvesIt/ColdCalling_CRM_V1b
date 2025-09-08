import { useState, useCallback, useRef, useEffect } from 'react';
import { api } from '../services/api';
import axios from 'axios';

// localStorage keys for persistence
const STORAGE_KEYS = {
  CURRENT_DATABASE: 'crm_current_database',
  LAST_DATABASES: 'crm_last_databases'
};

/**
 * Custom hook for database operations with localStorage persistence
 */
export const useDatabase = () => {
  const [databases, setDatabases] = useState([]);
  const [rawDatabases, setRawDatabases] = useState({}); // For DatabaseManager component
  const [currentDatabase, setCurrentDatabase] = useState(() => {
    // Initialize from localStorage if available
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_DATABASE);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to load database from localStorage:', error);
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  // Persist current database to localStorage whenever it changes
  useEffect(() => {
    if (currentDatabase) {
      try {
        localStorage.setItem(STORAGE_KEYS.CURRENT_DATABASE, JSON.stringify(currentDatabase));
      } catch (error) {
        console.warn('Failed to save database to localStorage:', error);
      }
    }
  }, [currentDatabase]);

  // Persist databases list to localStorage when it changes
  useEffect(() => {
    if (databases.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEYS.LAST_DATABASES, JSON.stringify(databases));
      } catch (error) {
        console.warn('Failed to save databases list to localStorage:', error);
      }
    }
  }, [databases]);

  const loadDatabases = useCallback(async () => {
    if (!mountedRef.current) return;
    
    let fallbackUsed = false;
    
    try {
      setLoading(true);
      const result = await api.getDatabases();
      if (!mountedRef.current) return;
      
      setDatabases(result.databases || []);
      
      // Only update currentDatabase if we got a response from server
      // This preserves localStorage value until server responds
      if (result.current !== undefined) {
        setCurrentDatabase(result.current);
      }
      
      // Also get raw data for DatabaseManager using axios
      const rawResponse = await axios.get('/api/databases');
      setRawDatabases(rawResponse.data);
      
      return { fallbackUsed: false, databases: result.databases, current: result.current };
    } catch (error) {
      console.error('Failed to load databases:', error);
      
      // If server request fails, try to load from localStorage as fallback
      try {
        const storedDatabases = localStorage.getItem(STORAGE_KEYS.LAST_DATABASES);
        if (storedDatabases && databases.length === 0) {
          const parsedDatabases = JSON.parse(storedDatabases);
          setDatabases(parsedDatabases);
          fallbackUsed = true;
        }
      } catch (storageError) {
        console.warn('Failed to load databases from localStorage:', storageError);
      }
      
      return { fallbackUsed, error: error.message };
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [databases.length]);

  const switchToDatabase = async (nameOrDatabase, type = 'sqlite') => {
    try {
      setLoading(true);
      
      // Handle both switchToDatabase(database) and switchToDatabase(name, type)
      let name, dbType;
      if (typeof nameOrDatabase === 'object' && nameOrDatabase.name) {
        name = nameOrDatabase.name;
        dbType = nameOrDatabase.type || 'sqlite';
      } else {
        name = nameOrDatabase;
        dbType = type;
      }
      
      console.log('[useDatabase] Switching to database:', { name, type: dbType });
      
      const result = await api.switchDatabase(name, dbType);
      
      // Create proper database object with name and type
      const databaseObject = {
        name: result.database,  // server returns database name as string
        type: result.type || dbType || 'sqlite'
      };
      
      console.log('[useDatabase] Setting currentDatabase to:', databaseObject);
      setCurrentDatabase(databaseObject);
      
      // Store in localStorage
      localStorage.setItem(STORAGE_KEYS.CURRENT_DATABASE, JSON.stringify(databaseObject));
      
      return result;
    } catch (error) {
      console.error('Failed to switch database:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Function to clear localStorage (useful for debugging or reset)
  const clearDatabaseStorage = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_DATABASE);
      localStorage.removeItem(STORAGE_KEYS.LAST_DATABASES);
    } catch (error) {
      console.warn('Failed to clear database storage:', error);
    }
  }, []);

  return {
    databases,
    setDatabases,
    rawDatabases,
    setRawDatabases,
    currentDatabase,
    setCurrentDatabase,
    loading,
    setLoading,
    loadDatabases,
    switchToDatabase,
    clearDatabaseStorage,
    mountedRef
  };
};
