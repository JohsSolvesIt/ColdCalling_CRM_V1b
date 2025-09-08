import React from 'react';
import dayjs from 'dayjs';
import { 
  Activity, RefreshCw, X, Database, CheckCircle, XCircle, 
  Users, FileCheck, Clock, Smartphone, Phone, MessageSquare,
  Info, AlertCircle
} from 'lucide-react';

const StatusPanel = ({ 
  showStatusPanel, 
  setShowStatusPanel, 
  systemStatus, 
  statusLoading, 
  refreshStatus 
}) => {
  if (!showStatusPanel) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    try {
      return dayjs(dateString).format('MMM D, YYYY h:mm A');
    } catch {
      return 'Invalid date';
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            System Status
            <span className="text-sm text-slate-500">
              {systemStatus?.timestamp && `Updated ${dayjs(systemStatus.timestamp).format('h:mm A')}`}
            </span>
          </h2>
          <div className="flex gap-2">
            <button 
              onClick={refreshStatus}
              disabled={statusLoading}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-50"
              title="Refresh Status"
            >
              <RefreshCw className={`h-4 w-4 ${statusLoading ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={() => setShowStatusPanel(false)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6">
          {statusLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <span>Loading system status...</span>
              </div>
            </div>
          ) : systemStatus ? (
            <>
              {/* Database Status */}
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Database Status
                  {systemStatus.database.connected ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Connection Status</div>
                    <div className={`font-medium ${systemStatus.database.connected ? 'text-green-600' : 'text-red-600'}`}>
                      {systemStatus.database.connected ? '✅ Connected' : '❌ Disconnected'}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Current Database</div>
                    <div className="font-medium">
                      {systemStatus.database.currentDatabase || 'None selected'}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Contact Records</div>
                    <div className="font-medium flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {systemStatus.database.contactCount.toLocaleString()}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Available Databases</div>
                    <div className="font-medium">
                      {Array.isArray(systemStatus.database.availableDatabases) 
                        ? systemStatus.database.availableDatabases.length 
                        : 0} database(s)
                    </div>
                  </div>
                </div>

                {/* Last Import Info */}
                {systemStatus.database.lastImport && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <FileCheck className="h-4 w-4" />
                      Last Import
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <div className="text-slate-600 dark:text-slate-400">File</div>
                        <div className="font-medium">{systemStatus.database.lastImport.filename}</div>
                      </div>
                      <div>
                        <div className="text-slate-600 dark:text-slate-400">Records</div>
                        <div className="font-medium">{systemStatus.database.lastImport.recordCount?.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-slate-600 dark:text-slate-400">Date</div>
                        <div className="font-medium">{formatDate(systemStatus.database.lastImport.timestamp)}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Import History */}
                {systemStatus.database.importHistory?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Import History ({systemStatus.database.importHistory.length})
                    </h4>
                    <div className="max-h-32 overflow-y-auto space-y-2">
                      {systemStatus.database.importHistory.slice(0, 5).map((importRecord, index) => (
                        <div key={index} className="text-sm bg-white dark:bg-slate-800 rounded p-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium">{importRecord.filename}</div>
                              <div className="text-slate-600 dark:text-slate-400">
                                {importRecord.recordCount?.toLocaleString()} records
                                {importRecord.size && ` • ${formatFileSize(importRecord.size)}`}
                              </div>
                            </div>
                            <div className="text-xs text-slate-500">
                              {formatDate(importRecord.timestamp)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* SMS/ADB Status */}
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  SMS & ADB Status
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* ADB Status */}
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      ADB Connection
                      {systemStatus.adb.connected ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </h4>
                    <div className={`text-sm ${systemStatus.adb.connected ? 'text-green-600' : 'text-red-600'}`}>
                      {systemStatus.adb.connected ? '✅ Connected' : '❌ Disconnected'}
                    </div>
                    {systemStatus.adb.devices?.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs text-slate-600 dark:text-slate-400">Connected Devices:</div>
                        {systemStatus.adb.devices.map((device, index) => (
                          <div key={index} className="text-sm font-mono bg-white dark:bg-slate-800 rounded px-2 py-1 mt-1">
                            {typeof device === 'string' ? device : device.id}
                            {typeof device === 'object' && device.status && (
                              <span className="text-xs text-green-600 ml-2">({device.status})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* SMS Status */}
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      SMS Service
                      {systemStatus.sms.connected ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </h4>
                    <div className={`text-sm ${systemStatus.sms.connected ? 'text-green-600' : 'text-red-600'}`}>
                      {systemStatus.sms.connected ? '✅ Connected' : '❌ Disconnected'}
                    </div>
                    {systemStatus.sms.deviceInfo && (
                      <div className="mt-2 text-sm">
                        <div className="text-slate-600 dark:text-slate-400">Device:</div>
                        <div className="font-medium">{systemStatus.sms.deviceInfo.model || 'Unknown Device'}</div>
                        {systemStatus.sms.deviceInfo.androidVersion && (
                          <div className="text-xs text-slate-500">Android {systemStatus.sms.deviceInfo.androidVersion}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* System Info */}
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  System Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-slate-600 dark:text-slate-400">Status Updated</div>
                    <div className="font-medium">{formatDate(systemStatus.timestamp)}</div>
                  </div>
                  <div>
                    <div className="text-slate-600 dark:text-slate-400">Application</div>
                    <div className="font-medium">ColdCalling CRM v1.0</div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Failed to load system status</p>
              <button 
                onClick={refreshStatus}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatusPanel;
