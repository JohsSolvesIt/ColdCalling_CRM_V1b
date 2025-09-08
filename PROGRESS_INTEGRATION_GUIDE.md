# Progress System Integration Guide

## Overview
The progress system provides a non-intrusive way to track long-running operations in the sidebar without interrupting the user's workflow.

## Quick Integration

### 1. Wrap your App component with ProgressWrapper

```jsx
// In App.js or your main component
import ProgressWrapper from './components/ProgressWrapper';

function App() {
  return (
    <ProgressWrapper>
      <UserProvider>
        {/* Your existing app content */}
        <LeftSidebar 
          isOpen={leftSidebarOpen}
          setIsOpen={setLeftSidebarOpen}
          currentTab={currentSidebarTab}
          onTabChange={handleSidebarTabChange}
        />
        {/* Rest of your app */}
      </UserProvider>
    </ProgressWrapper>
  );
}
```

### 2. Use progress tracking in cleanup operations

```jsx
// In any component that needs progress tracking
import { useProgress } from '../contexts/ProgressContext';
import { useCleanupProgress } from '../hooks/useCleanupProgress';

function MyComponent() {
  const { startCleanupProgress, updateOperation, completeOperation } = useProgress();
  const { performDuplicateRemoval, performContactCleanup } = useCleanupProgress();

  const handleCleanup = async () => {
    // Example: Track a simple operation
    const operationId = startCleanupProgress({
      title: 'Database Cleanup',
      description: 'Cleaning up duplicate contacts',
      total: 100
    });

    // Update progress
    updateOperation(operationId, {
      current: 50,
      currentStage: 'Processing duplicates...'
    });

    // Complete operation
    completeOperation(operationId, 'Cleanup completed successfully');
  };

  // Or use the enhanced cleanup functions
  const handleDuplicateRemoval = async () => {
    const result = await performDuplicateRemoval(duplicateGroups, api.deleteContact);
    if (result.success) {
      console.log('Duplicate removal completed:', result.result);
    }
  };

  return (
    // Your component JSX
  );
}
```

### 3. Import the progress context at the top level

```jsx
// Add this import to App.js
import ProgressWrapper from './components/ProgressWrapper';

// Wrap your entire app
export default function App() {
  return (
    <ProgressWrapper>
      {/* All your existing app content goes here */}
    </ProgressWrapper>
  );
}
```

## Features

- **Sidebar Progress Panel**: Shows active operations in the expanded sidebar
- **Toast Notifications**: Automatic completion notifications
- **Non-intrusive**: Operations run in background without blocking UI
- **Auto-cleanup**: Completed operations auto-remove after 30 seconds
- **Progress Tracking**: Real-time progress updates with estimated time remaining
- **Error Handling**: Failed operations are clearly marked and can be dismissed

## Operation Types

- `cleanup`: General database cleanup operations
- `duplicate-removal`: Removing duplicate contacts
- `bulk-operation`: Bulk data operations
- `database-sync`: Database synchronization
- `user-management`: User-related operations
- `data-migration`: Data migration tasks

## Benefits

1. **Modular**: Completely separate from main app logic
2. **Reusable**: Can be used by any component
3. **Type-safe**: Full TypeScript support
4. **Performant**: Uses React Context efficiently
5. **User-friendly**: Clear progress indication and completion notifications

## Usage Examples

### Basic Operation Tracking
```jsx
const operationId = startOperation({
  title: 'Processing Data',
  type: 'bulk-operation',
  total: 1000
});

// Update progress
updateOperation(operationId, { current: 500, currentStage: 'Halfway done...' });

// Complete
completeOperation(operationId, 'All data processed successfully');
```

### Enhanced Cleanup with Progress
```jsx
const { performCleanupWithProgress } = useCleanupProgress();

const result = await performCleanupWithProgress(
  {
    title: 'Custom Cleanup',
    total: contactsToProcess.length
  },
  async (updateProgress) => {
    for (let i = 0; i < contactsToProcess.length; i++) {
      updateProgress(i, `Processing contact ${i + 1}`);
      await processContact(contactsToProcess[i]);
    }
    return `Processed ${contactsToProcess.length} contacts`;
  }
);
```
