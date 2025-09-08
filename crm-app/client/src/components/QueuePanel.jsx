import React from 'react';
import { X, RefreshCw, Smartphone } from 'lucide-react';

const QueuePanel = ({
  showQueuePanel,
  setShowQueuePanel,
  textQueue,
  queueStatus,
  currentQueueIndex,
  onExecuteQueue,
  onPauseQueue,
  onResumeQueue,
  onClearQueue,
  findNameField,
  findPhoneField,
  // SMS Device Integration
  smsConnected,
  smsDeviceInfo,
  smsDevices,
  onConnectDevice,
  smsLoading
}) => {
  if (!showQueuePanel) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <RefreshCw className={`h-5 w-5 ${queueStatus === 'running' ? 'animate-spin' : ''}`} />
            Text Message Queue
          </h2>
          <div className="flex gap-2">
            {queueStatus === 'idle' && (
              <button 
                onClick={onExecuteQueue}
                disabled={!smsConnected}
                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title={smsConnected ? "Start executing the text queue" : "Connect an ADB device first"}
              >
                Start Queue
              </button>
            )}
            {queueStatus === 'running' && (
              <button 
                onClick={onPauseQueue}
                className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                Pause
              </button>
            )}
            {queueStatus === 'paused' && (
              <button 
                onClick={onResumeQueue}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Resume
              </button>
            )}
            <button 
              onClick={() => {
                if (queueStatus === 'running') {
                  // Confirm before stopping active queue
                  if (window.confirm('Are you sure you want to stop sending and clear the queue? This cannot be undone.')) {
                    onClearQueue();
                  }
                } else {
                  // Clear inactive queue without confirmation
                  onClearQueue();
                }
              }}
              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
              title={
                queueStatus === 'running' ? "Stop sending and clear queue" :
                queueStatus === 'paused' ? "Clear queue" :
                "Clear queue"
              }
            >
              {queueStatus === 'running' ? 'Stop & Clear' : 'Clear Queue'}
            </button>
            <button 
              onClick={() => setShowQueuePanel(false)}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mb-4 p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">Queue Status: </span>
              <span className={`px-2 py-1 rounded text-sm ${
                queueStatus === 'idle' ? 'bg-gray-200 text-gray-700' :
                queueStatus === 'running' ? 'bg-blue-200 text-blue-700' :
                queueStatus === 'paused' ? 'bg-yellow-200 text-yellow-700' :
                'bg-green-200 text-green-700'
              }`}>
                {queueStatus.toUpperCase()}
              </span>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Progress: {currentQueueIndex} / {textQueue.length}
            </div>
          </div>
          {queueStatus === 'running' && (
            <div className="mt-2">
              <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentQueueIndex / textQueue.length) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* ADB Device Status */}
        <div className={`mb-4 p-3 rounded-lg border ${
          smsConnected 
            ? 'border-green-300 bg-green-50 dark:bg-green-900/20' 
            : 'border-orange-300 bg-orange-50 dark:bg-orange-900/20'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium">
              ADB Device Status: {smsConnected ? 'Connected' : 'Not Connected'}
            </span>
            {smsDeviceInfo && (
              <span className="text-sm text-slate-600 dark:text-slate-400">
                - {smsDeviceInfo.model || smsDeviceInfo.device || smsDeviceInfo.id}
              </span>
            )}
          </div>
          
          {!smsConnected && (
            <div className="space-y-2">
              <p className="text-sm text-orange-700 dark:text-orange-300">
                ⚠️ ADB device connection required to execute queue
              </p>
              {smsDevices.length === 0 ? (
                <div>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    No ADB devices found. Please:
                  </p>
                  <ul className="text-sm text-orange-700 dark:text-orange-300 mt-1 ml-4 list-disc">
                    <li>Connect your Android phone via USB</li>
                    <li>Enable USB Debugging in Developer Options</li>
                    <li>Accept the ADB authorization prompt</li>
                  </ul>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mb-2">
                    Connect to an ADB device to proceed:
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {smsDevices.map(device => (
                      <button
                        key={device.id}
                        onClick={() => onConnectDevice(device.id)}
                        disabled={smsLoading}
                        className="px-3 py-1 text-sm rounded border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                      >
                        {smsLoading ? 'Connecting...' : `Connect ${device.model || device.device || device.id}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {smsConnected && (
            <p className="text-sm text-green-700 dark:text-green-300">
              ✓ Ready to execute queue via ADB
            </p>
          )}
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {textQueue.map((item, index) => (
            <div key={item.id} className={`p-3 border rounded-lg ${
              index === currentQueueIndex && queueStatus === 'running' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' :
              ['sent', 'sent_automatically', 'opened_auto_click_attempted'].includes(item.status) ? 'border-green-300 bg-green-50 dark:bg-green-900/20' :
              ['failed', 'cancelled'].includes(item.status) ? 'border-red-300 bg-red-50 dark:bg-red-900/20' :
              item.status === 'sending' ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20' :
              'border-slate-300 dark:border-slate-600'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium">
                    {item.contact[findNameField(item.contact)] || item.contact.id}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    {item.contact.cleanedPhone ? (
                      <div>
                        <span className="font-medium text-green-700 dark:text-green-400">
                          📱 {item.contact.cleanedPhone}
                        </span>
                        {item.contact.originalPhone && item.contact.originalPhone !== item.contact.cleanedPhone && (
                          <span className="text-xs text-slate-500 ml-2">
                            (was: {item.contact.originalPhone})
                          </span>
                        )}
                      </div>
                    ) : (
                      item.contact[findPhoneField(item.contact)]
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {item.message.substring(0, 100)}{item.message.length > 100 ? '...' : ''}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`px-2 py-1 rounded text-xs ${
                    item.status === 'pending' ? 'bg-gray-200 text-gray-700' :
                    item.status === 'sending' ? 'bg-yellow-200 text-yellow-700' :
                    ['sent', 'sent_automatically', 'opened_auto_click_attempted'].includes(item.status) ? 'bg-green-200 text-green-700' :
                    item.status === 'cancelled' ? 'bg-orange-200 text-orange-700' :
                    'bg-red-200 text-red-700'
                  }`}>
                    {item.status.toUpperCase()}
                  </div>
                  {item.timestamp && (
                    <div className="text-xs text-slate-500 mt-1">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>
              {(item.status === 'failed' || item.status === 'cancelled') && item.result?.error && (
                <div className={`mt-2 text-xs ${
                  item.status === 'cancelled' ? 'text-orange-600 dark:text-orange-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {item.status === 'cancelled' ? 'Cancelled: ' : 'Error: '}{item.result.error}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QueuePanel;
