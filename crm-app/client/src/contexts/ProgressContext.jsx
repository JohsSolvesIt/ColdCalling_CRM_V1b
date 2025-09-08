import React, { createContext, useContext, useState, useCallback } from 'react';
import { useProgressOperations } from '../hooks/useProgressOperations';

const ProgressContext = createContext();

export const useProgress = () => {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return context;
};

export const ProgressProvider = ({ children }) => {
  const progressOps = useProgressOperations();
  const [notifications, setNotifications] = useState([]);

  // Handle completion notifications
  const handleNotificationComplete = useCallback((notification) => {
    setNotifications(prev => [...prev, {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      timestamp: Date.now(),
      visible: true
    }]);

    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  }, []);

  // Remove notification manually
  const removeNotification = useCallback((notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  // Enhanced operation starters with better defaults
  const startCleanupProgress = useCallback((config) => {
    return progressOps.startCleanupOperation({
      title: 'Database Cleanup',
      description: `Cleaning up ${config.target || 'all'} contacts`,
      ...config
    });
  }, [progressOps]);

  const startDuplicateRemovalProgress = useCallback((config) => {
    return progressOps.startDuplicateRemovalOperation({
      title: 'Removing Duplicates',
      description: `Processing ${config.total || 0} duplicate groups`,
      ...config
    });
  }, [progressOps]);

  const startBulkOperationProgress = useCallback((config) => {
    return progressOps.startBulkOperation({
      title: config.operationType || 'Bulk Operation',
      description: `Processing ${config.total || 0} items`,
      ...config
    });
  }, [progressOps]);

  const value = {
    // Core operations
    ...progressOps,
    
    // Enhanced starters
    startCleanupProgress,
    startDuplicateRemovalProgress,
    startBulkOperationProgress,
    
    // Notifications
    notifications,
    handleNotificationComplete,
    removeNotification,
    
    // Quick access to common patterns
    hasActiveOperations: progressOps.operations.some(op => op.status === 'running'),
    hasCompletedOperations: progressOps.operations.some(op => op.status === 'completed'),
    activeOperationsCount: progressOps.operations.filter(op => op.status === 'running').length,
    completedOperationsCount: progressOps.operations.filter(op => op.status === 'completed').length
  };

  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  );
};
