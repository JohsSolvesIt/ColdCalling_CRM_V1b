import React, { useState, useEffect } from 'react';
import { 
  X, 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock,
  Database,
  Trash2,
  Users,
  RefreshCw,
  Zap,
  MinusCircle
} from 'lucide-react';

const SidebarProgressPanel = ({ 
  progressOperations = [], 
  onRemoveOperation,
  onClearAll,
  onNotificationComplete 
}) => {
  const [completedOperations, setCompletedOperations] = useState([]);

  // Handle operation completion
  useEffect(() => {
    progressOperations.forEach(operation => {
      if (operation.status === 'completed' && !completedOperations.includes(operation.id)) {
        setCompletedOperations(prev => [...prev, operation.id]);
        
        // Show completion notification
        if (onNotificationComplete) {
          setTimeout(() => {
            onNotificationComplete({
              id: operation.id,
              title: operation.title,
              message: operation.completionMessage || `${operation.title} completed successfully`,
              type: operation.status === 'completed' ? 'success' : 'error'
            });
          }, 500); // Small delay to let UI update
        }
      }
    });
  }, [progressOperations, completedOperations, onNotificationComplete]);

  // Get icon for operation type
  const getOperationIcon = (type) => {
    switch (type) {
      case 'cleanup':
        return Trash2;
      case 'duplicate-removal':
        return MinusCircle;
      case 'database-sync':
        return Database;
      case 'user-management':
        return Users;
      case 'data-migration':
        return RefreshCw;
      case 'bulk-operation':
        return Zap;
      default:
        return Activity;
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'running':
        return 'text-blue-600 dark:text-blue-400';
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'failed':
        return 'text-red-600 dark:text-red-400';
      case 'paused':
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return 'text-slate-600 dark:text-slate-400';
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'running':
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      case 'paused':
        return <Clock className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  // Filter out operations that should be auto-removed
  const visibleOperations = progressOperations.filter(op => {
    // Auto-remove completed operations after 30 seconds
    if (op.status === 'completed' && op.completedAt) {
      const timeSinceCompletion = Date.now() - op.completedAt;
      return timeSinceCompletion < 30000; // 30 seconds
    }
    return true;
  });

  if (visibleOperations.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">
            Operations
          </h3>
          {visibleOperations.length > 0 && (
            <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full">
              {visibleOperations.length}
            </span>
          )}
        </div>
        
        {visibleOperations.length > 1 && (
          <button
            onClick={onClearAll}
            className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            title="Clear all completed operations"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Operations List */}
      <div className="max-h-80 overflow-y-auto">
        {visibleOperations.map((operation) => {
          const OperationIcon = getOperationIcon(operation.type);
          const statusColor = getStatusColor(operation.status);
          
          return (
            <div
              key={operation.id}
              className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 last:border-b-0"
            >
              <div className="flex items-start gap-3">
                {/* Operation Icon */}
                <div className="flex-shrink-0 p-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg">
                  <OperationIcon className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                </div>

                {/* Operation Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {operation.title}
                    </h4>
                    
                    {/* Status Icon & Remove Button */}
                    <div className="flex items-center gap-1">
                      <div className={statusColor}>
                        {getStatusIcon(operation.status)}
                      </div>
                      {(operation.status === 'completed' || operation.status === 'failed') && (
                        <button
                          onClick={() => onRemoveOperation?.(operation.id)}
                          className="p-0.5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                          title="Remove operation"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Operation Description */}
                  {operation.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                      {operation.description}
                    </p>
                  )}

                  {/* Progress Bar */}
                  {operation.status === 'running' && (
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                        <span>
                          {operation.current || 0} / {operation.total || 0}
                        </span>
                        <span>
                          {operation.total ? Math.round(((operation.current || 0) / operation.total) * 100) : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-1.5">
                        <div 
                          className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${operation.total ? ((operation.current || 0) / operation.total) * 100 : 0}%` 
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Current Stage/Step */}
                  {operation.currentStage && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                      {operation.currentStage}
                    </p>
                  )}

                  {/* Status Message */}
                  {operation.status === 'completed' && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      ✅ Completed successfully
                      {operation.result && ` • ${operation.result}`}
                    </p>
                  )}
                  
                  {operation.status === 'failed' && (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      ❌ {operation.error || 'Operation failed'}
                    </p>
                  )}

                  {/* Estimated Time Remaining */}
                  {operation.status === 'running' && operation.estimatedTimeRemaining && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      ~{operation.estimatedTimeRemaining} remaining
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SidebarProgressPanel;
