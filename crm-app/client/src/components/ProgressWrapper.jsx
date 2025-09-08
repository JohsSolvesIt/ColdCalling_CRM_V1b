import React from 'react';
import { ProgressProvider } from '../contexts/ProgressContext';
import ProgressNotifications from './ProgressNotifications';

/**
 * Wrapper component that provides progress tracking functionality
 * to any part of the application without cluttering the main App component
 */
const ProgressWrapper = ({ children }) => {
  return (
    <ProgressProvider>
      {children}
      <ProgressNotifications />
    </ProgressProvider>
  );
};

export default ProgressWrapper;
