import { useState, useCallback, useRef } from 'react';

/**
 * Custom hook for managing sidebar progress operations
 * Provides methods to start, update, complete, and manage background operations
 */
export const useProgressOperations = () => {
  const [operations, setOperations] = useState([]);
  const operationRefs = useRef(new Map());

  // Start a new operation
  const startOperation = useCallback((operationConfig) => {
    const operation = {
      id: operationConfig.id || `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: operationConfig.title || 'Operation',
      description: operationConfig.description || '',
      type: operationConfig.type || 'default',
      status: 'running',
      current: operationConfig.current || 0,
      total: operationConfig.total || 100,
      currentStage: operationConfig.currentStage || '',
      startedAt: Date.now(),
      estimatedTimeRemaining: null,
      result: null,
      error: null,
      completionMessage: operationConfig.completionMessage || null
    };

    setOperations(prev => [...prev, operation]);
    
    // Store operation reference for easy updates
    operationRefs.current.set(operation.id, operation);
    
    return operation.id;
  }, []);

  // Update an existing operation
  const updateOperation = useCallback((operationId, updates) => {
    setOperations(prev => 
      prev.map(op => {
        if (op.id === operationId) {
          const updatedOp = { ...op, ...updates };
          
          // Calculate estimated time remaining if we have progress
          if (updatedOp.status === 'running' && updatedOp.current > 0 && updatedOp.total > 0) {
            const elapsed = Date.now() - updatedOp.startedAt;
            const progress = updatedOp.current / updatedOp.total;
            if (progress > 0) {
              const estimatedTotal = elapsed / progress;
              const remaining = estimatedTotal - elapsed;
              if (remaining > 0) {
                const minutes = Math.floor(remaining / 60000);
                const seconds = Math.floor((remaining % 60000) / 1000);
                updatedOp.estimatedTimeRemaining = minutes > 0 
                  ? `${minutes}m ${seconds}s` 
                  : `${seconds}s`;
              }
            }
          }
          
          operationRefs.current.set(operationId, updatedOp);
          return updatedOp;
        }
        return op;
      })
    );
  }, []);

  // Complete an operation
  const completeOperation = useCallback((operationId, result = null, completionMessage = null) => {
    updateOperation(operationId, {
      status: 'completed',
      current: operationRefs.current.get(operationId)?.total || 100,
      result,
      completionMessage,
      completedAt: Date.now(),
      estimatedTimeRemaining: null
    });
  }, [updateOperation]);

  // Fail an operation
  const failOperation = useCallback((operationId, error) => {
    updateOperation(operationId, {
      status: 'failed',
      error: typeof error === 'string' ? error : error?.message || 'Unknown error',
      estimatedTimeRemaining: null
    });
  }, [updateOperation]);

  // Pause an operation
  const pauseOperation = useCallback((operationId) => {
    updateOperation(operationId, {
      status: 'paused',
      estimatedTimeRemaining: null
    });
  }, [updateOperation]);

  // Resume an operation
  const resumeOperation = useCallback((operationId) => {
    updateOperation(operationId, {
      status: 'running'
    });
  }, [updateOperation]);

  // Remove a specific operation
  const removeOperation = useCallback((operationId) => {
    setOperations(prev => prev.filter(op => op.id !== operationId));
    operationRefs.current.delete(operationId);
  }, []);

  // Clear all completed operations
  const clearCompletedOperations = useCallback(() => {
    setOperations(prev => {
      const remaining = prev.filter(op => op.status === 'running' || op.status === 'paused');
      // Clean up refs for removed operations
      prev.forEach(op => {
        if (op.status === 'completed' || op.status === 'failed') {
          operationRefs.current.delete(op.id);
        }
      });
      return remaining;
    });
  }, []);

  // Clear all operations
  const clearAllOperations = useCallback(() => {
    setOperations([]);
    operationRefs.current.clear();
  }, []);

  // Get operation by ID
  const getOperation = useCallback((operationId) => {
    return operationRefs.current.get(operationId);
  }, []);

  // Helper function to create a cleanup operation
  const startCleanupOperation = useCallback((config) => {
    return startOperation({
      type: 'cleanup',
      title: config.title || 'Database Cleanup',
      description: config.description || 'Cleaning up database records',
      total: config.total || 100,
      completionMessage: config.completionMessage || 'Database cleanup completed successfully',
      ...config
    });
  }, [startOperation]);

  // Helper function to create a duplicate removal operation
  const startDuplicateRemovalOperation = useCallback((config) => {
    return startOperation({
      type: 'duplicate-removal',
      title: config.title || 'Removing Duplicates',
      description: config.description || 'Removing duplicate contacts',
      total: config.total || 100,
      completionMessage: config.completionMessage || 'Duplicate removal completed successfully',
      ...config
    });
  }, [startOperation]);

  // Helper function to create a bulk operation
  const startBulkOperation = useCallback((config) => {
    return startOperation({
      type: 'bulk-operation',
      title: config.title || 'Bulk Operation',
      description: config.description || 'Processing multiple records',
      total: config.total || 100,
      completionMessage: config.completionMessage || 'Bulk operation completed successfully',
      ...config
    });
  }, [startOperation]);

  return {
    operations,
    startOperation,
    updateOperation,
    completeOperation,
    failOperation,
    pauseOperation,
    resumeOperation,
    removeOperation,
    clearCompletedOperations,
    clearAllOperations,
    getOperation,
    // Helper methods for common operation types
    startCleanupOperation,
    startDuplicateRemovalOperation,
    startBulkOperation
  };
};
