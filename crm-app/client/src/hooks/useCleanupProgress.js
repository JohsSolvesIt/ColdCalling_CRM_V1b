import React from 'react';
import { useProgress } from '../contexts/ProgressContext';

/**
 * Hook to enhance cleanup operations with progress tracking
 * This can be used by CleanupModal to track cleanup progress
 */
export const useCleanupProgress = () => {
  const { 
    startCleanupProgress,
    updateOperation,
    completeOperation,
    failOperation
  } = useProgress();

  // Enhanced cleanup function with progress tracking
  const performCleanupWithProgress = async (cleanupConfig, cleanupFunction) => {
    const operationId = startCleanupProgress({
      title: cleanupConfig.title || 'Database Cleanup',
      description: cleanupConfig.description || 'Processing cleanup operations',
      total: cleanupConfig.total || 100,
      currentStage: 'Initializing cleanup...'
    });

    try {
      // Create a progress updater function
      const updateProgress = (current, stage, total = cleanupConfig.total) => {
        updateOperation(operationId, {
          current,
          total,
          currentStage: stage
        });
      };

      // Execute the cleanup function with progress tracking
      const result = await cleanupFunction(updateProgress);

      // Complete the operation
      completeOperation(operationId, result, cleanupConfig.completionMessage);
      
      return { success: true, result, operationId };
    } catch (error) {
      failOperation(operationId, error.message);
      return { success: false, error: error.message, operationId };
    }
  };

  // Specific cleanup operation types
  const performDuplicateRemoval = async (duplicateGroups, deleteFunction) => {
    const total = duplicateGroups.reduce((sum, group) => sum + group.length, 0);
    
    return performCleanupWithProgress(
      {
        title: 'Removing Duplicates',
        description: `Removing ${duplicateGroups.length} duplicate groups (${total} contacts)`,
        total,
        completionMessage: `Successfully removed ${total} duplicate contacts`
      },
      async (updateProgress) => {
        let processed = 0;
        let deletedCount = 0;

        for (const [index, group] of duplicateGroups.entries()) {
          updateProgress(processed, `Processing duplicate group ${index + 1}/${duplicateGroups.length}`);
          
          for (const contact of group) {
            try {
              await deleteFunction(contact.id);
              deletedCount++;
            } catch (error) {
              console.error(`Failed to delete duplicate contact ${contact.id}:`, error);
            }
            processed++;
            updateProgress(processed, `Deleting contact ${processed}/${total}`);
          }
        }

        return `Deleted ${deletedCount} duplicate contacts`;
      }
    );
  };

  const performContactCleanup = async (contactsToDelete, deleteFunction, cleanupType) => {
    const total = contactsToDelete.length;
    
    return performCleanupWithProgress(
      {
        title: `Removing ${cleanupType}`,
        description: `Removing ${total} contacts ${cleanupType}`,
        total,
        completionMessage: `Successfully removed ${total} contacts ${cleanupType}`
      },
      async (updateProgress) => {
        let deletedCount = 0;

        for (const [index, contact] of contactsToDelete.entries()) {
          updateProgress(index, `Deleting contact ${index + 1}/${total}: ${contact.name || contact.id}`);
          
          try {
            await deleteFunction(contact.id);
            deletedCount++;
          } catch (error) {
            console.error(`Failed to delete contact ${contact.id}:`, error);
          }
        }

        return `Deleted ${deletedCount} contacts`;
      }
    );
  };

  const performSlugCleanup = async (contacts, updateFunction) => {
    const contactsWithSlugs = contacts.filter(c => c.slug);
    const total = contactsWithSlugs.length;
    
    if (total === 0) {
      return { success: true, result: 'No contacts with slugs found' };
    }

    return performCleanupWithProgress(
      {
        title: 'Removing Slugs',
        description: `Removing slugs from ${total} contacts`,
        total,
        completionMessage: `Successfully removed slugs from ${total} contacts`
      },
      async (updateProgress) => {
        let processedCount = 0;

        for (const [index, contact] of contactsWithSlugs.entries()) {
          updateProgress(index, `Updating contact ${index + 1}/${total}: ${contact.name || contact.id}`);
          
          try {
            await updateFunction(contact.id, { slug: null });
            processedCount++;
          } catch (error) {
            console.error(`Failed to remove slug from contact ${contact.id}:`, error);
          }
        }

        return `Updated ${processedCount} contacts`;
      }
    );
  };

  return {
    performCleanupWithProgress,
    performDuplicateRemoval,
    performContactCleanup,
    performSlugCleanup
  };
};
