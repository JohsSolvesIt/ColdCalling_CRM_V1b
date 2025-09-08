import React from 'react';
import { useProgress } from '../contexts/ProgressContext';
import { ProgressProvider } from '../contexts/ProgressContext';

// Import the original App component but rename it to avoid confusion
const AppCore = React.lazy(() => import('../App'));

// Component that uses the progress context
const AppInner = () => {
  const { progressOperations, showNotification, clearNotifications } = useProgress();

  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <AppCore 
        progressOperations={progressOperations}
        showNotification={showNotification}
        clearNotifications={clearNotifications}
      />
    </React.Suspense>
  );
};

// Main component that provides the progress context
const AppWithProgress = () => {
  return (
    <ProgressProvider>
      <AppInner />
    </ProgressProvider>
  );
};

export default AppWithProgress;
