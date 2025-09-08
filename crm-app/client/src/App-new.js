import React, { useEffect, useMemo, useState, useCallback } from "react";
import { 
  Download, Upload, Search, Plus, Calendar,
  Database, Settings, MessageSquare, Activity, 
  Globe, FileText, Users, X
} from "lucide-react";
import DatabaseManager from "./components/DatabaseManager";
import MoveToDbModal from "./components/MoveToDbModal";
import BatchTextPanel from "./components/BatchTextPanel";
import TemplateManager from "./components/TemplateManager";
import StatusPanel from "./components/StatusPanel";
import CleanupModal from "./components/CleanupModal";
import ColumnMapper from "./components/ColumnMapper";
import SmsPanel from "./components/SmsPanel";
import QueuePanel from "./components/QueuePanel";
import { DataTable, Pagination } from "./components/DataTable";
import ContactDetailPanel from "./components/ContactDetailPanel";
import ToastNotification from "./components/ToastNotification";
import { isUrl, isImageUrl, titleCase, uid, formatDateTimeLocal } from "./utils/helpers";
import { DEFAULT_STATUS, DEFAULT_COLUMNS, STATUS_OPTIONS } from "./constants";
import { api } from "./services/api";
import { useDatabase } from "./hooks/useDatabase";
import { useContacts } from "./hooks/useContacts";
import { useSMS } from "./hooks/useSMS";
import { useBatchTexting } from "./hooks/useBatchTexting";
import { 
  getCurrentDatabaseType, 
  getNormalizedHeaders, 
  findPhoneField,
  findNameField,
  formatPropertyValue,
  getFilteredRows,
  getFollowUpRows,
  getSortedRows
} from "./utils/dataProcessing";

/**
 * CSV‑to‑CRM — Local Database Edition
 * Features:
 * - SQLite local database storage
 * - Multiple database support with easy switching
 * - CSV import/export with database persistence
 * - All original CRM features with database backing
 */

export default function App() {
  // Use custom hooks
  const { 
    databases, 
    setDatabases, 
    currentDatabase, 
    loading,
    setLoading,
    loadDatabases,
    switchToDatabase,
    mountedRef
  } = useDatabase();

  const {
    rows,
    headers,
    saveStatus,
    loadData,
    addRow,
    patchRow
  } = useContacts();

  const {
    smsDevices,
    smsConnected,
    smsDeviceInfo,
    smsTemplates,
    smsHistory,
    smsLoading,
    loadSmsDevices,
    loadSmsTemplates,
    connectSmsDevice,
    sendSmsToContact,
    addCustomTemplate,
    getFirstName
  } = useSMS();

  const {
    selectedContacts,
    textQueue,
    queueStatus,
    currentQueueIndex,
    completionReport,
    toggleContactSelection,
    selectAllContacts: selectAllContactsHook,
    selectAllContactsAllPages: selectAllContactsAllPagesHook,
    clearAllSelections,
    createTextQueue,
    executeQueue,
    pauseQueue,
    resumeQueue,
    clearQueue
  } = useBatchTexting();

  // Basic UI state
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState({ key: null, dir: "asc" });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [dark, setDark] = useState(true);
  
  // Modal states
  const [showDatabaseManager, setShowDatabaseManager] = useState(false);
  const [newDatabaseName, setNewDatabaseName] = useState("");
  const [websiteGenerating, setWebsiteGenerating] = useState(false);
  const [showSmsPanel, setShowSmsPanel] = useState(false);
  const [smsMessage, setSmsMessage] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [customTemplate, setCustomTemplate] = useState("");
  const [showSmsHistory, setShowSmsHistory] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showBatchTextPanel, setShowBatchTextPanel] = useState(false);
  const [batchMessage, setBatchMessage] = useState("");
  const [showQueuePanel, setShowQueuePanel] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [showFollowUpQueue, setShowFollowUpQueue] = useState(false);
  const [followUpFilter, setFollowUpFilter] = useState('all');
  const [showMoveToDbModal, setShowMoveToDbModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpContact, setFollowUpContact] = useState(null);
  const [manualFollowUpDate, setManualFollowUpDate] = useState('');
  const [manualFollowUpPriority, setManualFollowUpPriority] = useState('Medium');
  const [systemStatus, setSystemStatus] = useState(null);
  const [showStatusPanel, setShowStatusPanel] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [showColumnMapper, setShowColumnMapper] = useState(false);
  const [csvData, setCsvData] = useState(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, [mountedRef]);

  // System status functions
  const loadSystemStatus = useCallback(async () => {
    if (!mountedRef.current) return;
    
    try {
      setStatusLoading(true);
      const status = await api.getStatus();
      
      if (!mountedRef.current) return;
      
      setSystemStatus(status);
    } catch (error) {
      console.error('Failed to load system status:', error);
    } finally {
      if (mountedRef.current) {
        setStatusLoading(false);
      }
    }
  }, [mountedRef]);

  const refreshStatus = () => {
    loadSystemStatus();
  };

  // Get current database type using utility function
  const getCurrentDatabaseTypeFn = useCallback(() => {
    return getCurrentDatabaseType(systemStatus, rows);
  }, [systemStatus, rows]);

  // Derived data using utility functions
  const normalizedHeaders = useMemo(() => {
    return getNormalizedHeaders(headers, rows, getCurrentDatabaseTypeFn);
  }, [headers, rows, getCurrentDatabaseTypeFn]);

  // Use memoized data processing functions
  const filteredRowsData = useMemo(() => {
    return getFilteredRows(rows, search, statusFilter, normalizedHeaders, (contact) => findPhoneField(contact, headers, getCurrentDatabaseTypeFn));
  }, [rows, search, statusFilter, normalizedHeaders, headers, getCurrentDatabaseTypeFn]);

  const followUpRowsData = useMemo(() => {
    return getFollowUpRows(rows, showFollowUpQueue, followUpFilter);
  }, [rows, showFollowUpQueue, followUpFilter]);

  const sortedRowsData = useMemo(() => {
    const sourceRows = showFollowUpQueue ? followUpRowsData : filteredRowsData;
    return getSortedRows(sourceRows, sortBy);
  }, [filteredRowsData, followUpRowsData, showFollowUpQueue, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedRowsData.length / perPage));
  const pageRows = useMemo(() => sortedRowsData.slice((page - 1) * perPage, page * perPage), [sortedRowsData, page, perPage]);

  // Load databases on mount
  useEffect(() => {
    loadDatabases();
  }, [loadDatabases]);

  // Load data when database changes
  useEffect(() => {
    if (currentDatabase) {
      loadData();
    }
  }, [currentDatabase, loadData]);

  // Load status on mount and when database changes
  useEffect(() => {
    loadSystemStatus();
  }, [loadSystemStatus]);

  useEffect(() => {
    if (currentDatabase) {
      loadSystemStatus();
    }
  }, [currentDatabase, loadSystemStatus]);

  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages);
    }
  }, [totalPages, page]);

  // Export CSV
  const exportCsv = () => {
    if (!currentDatabase || rows.length === 0) return;
    
    const headers = normalizedHeaders.join(",");
    const csvContent = [headers]
      .concat(
        rows.map((r) =>
          normalizedHeaders.map((h) => `"${String(r[h] || "").replace(/"/g, '""')}"`).join(",")
        )
      )
      .join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${currentDatabase}_export.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import CSV
  const onFiles = async (files) => {
    if (!files?.length || !currentDatabase) return;
    
    try {
      setLoading(true);
      const result = await api.uploadCSV(files[0]);
      showToast(`✅ Successfully imported ${result.imported} records`, 'success');
      await loadData();
    } catch (error) {
      console.error('CSV import failed:', error);
      showToast(`❌ CSV import failed: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Website generation handler
  const handleGenerateWebsites = useCallback(async () => {
    if (websiteGenerating) return;
    
    setWebsiteGenerating(true);
    try {
      console.log('Starting website generation...');
      
      const response = await fetch('http://localhost:3031/api/generate-realtor-websites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generateAll: true })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`Website generation started successfully! ${data.message || ''}`);
      } else {
        throw new Error(data.error || 'Website generation failed');
      }
    } catch (error) {
      console.error('Website generation error:', error);
      alert(`Website generation failed: ${error.message}`);
    } finally {
      setWebsiteGenerating(false);
    }
  }, [websiteGenerating]);

  // Toast notification function
  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setToastVisible(true);
  };

  // Navigation and selection helpers
  const selected = rows.find((r) => r.id === selectedId) || null;
  
  const nav = (delta) => {
    const idx = rows.findIndex((r) => r.id === selectedId);
    if (idx === -1) return;
    const newIdx = Math.max(0, Math.min(rows.length - 1, idx + delta));
    setSelectedId(rows[newIdx]?.id);
  };

  const setStatus = (status) => {
    if (selected) {
      patchRow(selected.id, { Status: status, LastContacted: new Date().toISOString() });
    }
  };

  const onFollowUp = (dt) => {
    if (selected) {
      patchRow(selected.id, { FollowUpAt: dt ? new Date(dt).toISOString() : null });
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
  };

  // Contact selection handlers
  const selectAllContacts = () => {
    selectAllContactsHook(pageRows);
  };

  const selectAllContactsAllPages = () => {
    selectAllContactsAllPagesHook(sortedRowsData);
  };

  // SMS handlers
  const openSmsForContact = (contact) => {
    setSelectedContact(contact);
    setShowSmsPanel(true);
  };

  // Data table handlers
  const handleSort = (header) => {
    setSortBy((s) => ({ 
      key: header, 
      dir: s.key === header && s.dir === "asc" ? "desc" : "asc" 
    }));
  };

  const handleRowClick = (id) => {
    setSelectedId(id);
  };

  const handleCellEdit = (id, patch) => {
    patchRow(id, patch);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
      
      switch (e.key) {
        case "ArrowLeft": nav(-1); break;
        case "ArrowRight": nav(1); break;
        case "s": case "S": e.preventDefault(); exportCsv(); break;
        case "1": setStatus("No Answer"); break;
        case "2": setStatus("Left Voicemail"); break;
        case "3": setStatus("Interested"); break;
        case "4": setStatus("Not Interested"); break;
        case "5": setStatus("SENT TEXT"); break;
      }
    };
    
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  return (
    <div className={"min-h-screen " + (dark ? "dark" : "")}>
      <div className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 min-h-screen">
        {/* Modals */}
        {showDatabaseManager && (
          <DatabaseManager 
            databases={databases}
            currentDatabase={currentDatabase}
            newDatabaseName={newDatabaseName}
            loading={loading}
            setLoading={setLoading}
            setNewDatabaseName={setNewDatabaseName}
            setShowDatabaseManager={setShowDatabaseManager}
            switchToDatabase={switchToDatabase}
            api={api}
            loadDatabases={loadDatabases}
            showToast={showToast}
          />
        )}
        
        <SmsPanel 
          showSmsPanel={showSmsPanel}
          setShowSmsPanel={setShowSmsPanel}
          smsConnected={smsConnected}
          smsDeviceInfo={smsDeviceInfo}
          smsDevices={smsDevices}
          selectedContact={selectedContact}
          setSelectedContact={setSelectedContact}
          smsMessage={smsMessage}
          setSmsMessage={setSmsMessage}
          smsTemplates={smsTemplates}
          selectedTemplate={selectedTemplate}
          setSelectedTemplate={setSelectedTemplate}
          customTemplate={customTemplate}
          setCustomTemplate={setCustomTemplate}
          showSmsHistory={showSmsHistory}
          setShowSmsHistory={setShowSmsHistory}
          smsHistory={smsHistory}
          smsLoading={smsLoading}
          onConnectDevice={connectSmsDevice}
          onSendSms={sendSmsToContact}
          onAddTemplate={addCustomTemplate}
          findNameField={(contact) => findNameField(contact, headers, getCurrentDatabaseTypeFn)}
          findPhoneField={(contact) => findPhoneField(contact, headers, getCurrentDatabaseTypeFn)}
          getFirstName={getFirstName}
        />

        {showBatchTextPanel && (
          <BatchTextPanel 
            selectedContacts={selectedContacts}
            setShowBatchTextPanel={setShowBatchTextPanel}
            rows={rows}
            findNameField={(contact) => findNameField(contact, headers, getCurrentDatabaseTypeFn)}
            selectedTemplate={selectedTemplate}
            setSelectedTemplate={setSelectedTemplate}
            setBatchMessage={setBatchMessage}
            smsTemplates={smsTemplates}
            batchMessage={batchMessage}
            createTextQueue={createTextQueue}
          />
        )}

        <QueuePanel 
          showQueuePanel={showQueuePanel}
          setShowQueuePanel={setShowQueuePanel}
          textQueue={textQueue}
          queueStatus={queueStatus}
          currentQueueIndex={currentQueueIndex}
          onExecuteQueue={executeQueue}
          onPauseQueue={pauseQueue}
          onResumeQueue={resumeQueue}
          onClearQueue={clearQueue}
          findNameField={(contact) => findNameField(contact, headers, getCurrentDatabaseTypeFn)}
          findPhoneField={(contact) => findPhoneField(contact, headers, getCurrentDatabaseTypeFn)}
        />

        {showMoveToDbModal && (
          <MoveToDbModal 
            showMoveToDbModal={showMoveToDbModal}
            setShowMoveToDbModal={setShowMoveToDbModal}
            databases={databases}
            currentDatabase={currentDatabase}
            selectedContacts={selectedContacts}
            handleMoveContacts={() => {}}
            loading={loading}
          />
        )}

        {showTemplateManager && (
          <TemplateManager 
            showTemplateManager={showTemplateManager}
            setShowTemplateManager={setShowTemplateManager}
            smsTemplates={smsTemplates}
            setSmsTemplates={() => {}}
            api={api}
            showToast={showToast}
            onClose={async () => {
              await loadSmsTemplates();
            }}
          />
        )}
        
        <StatusPanel 
          showStatusPanel={showStatusPanel}
          setShowStatusPanel={setShowStatusPanel}
          systemStatus={systemStatus}
          statusLoading={statusLoading}
          refreshStatus={refreshStatus}
        />

        <CleanupModal
          showCleanupModal={showCleanupModal}
          setShowCleanupModal={setShowCleanupModal}
          databases={databases}
          currentDatabase={currentDatabase}
          rows={rows}
          findPhoneField={(contact) => findPhoneField(contact, headers, getCurrentDatabaseTypeFn)}
          findNameField={(contact) => findNameField(contact, headers, getCurrentDatabaseTypeFn)}
          api={api}
          loadData={loadData}
          setLoading={setLoading}
          showToast={showToast}
        />
        
        {showColumnMapper && (
          <ColumnMapper 
            csvHeaders={csvHeaders}
            csvData={csvData}
            columnMapping={columnMapping}
            setColumnMapping={setColumnMapping}
            onConfirm={() => {}}
            onCancel={() => {
              setShowColumnMapper(false);
              setCsvData(null);
              setCsvHeaders([]);
              setColumnMapping({});
            }}
            normalizedHeaders={normalizedHeaders}
          />
        )}
        
        <ToastNotification 
          message={toastMessage?.message}
          type={toastMessage?.type}
          visible={toastVisible}
          onClose={() => {
            setToastVisible(false);
            setTimeout(() => setToastMessage(null), 300);
          }}
        />
        
        {/* Header */}
        <header className="sticky top-0 z-30 backdrop-blur bg-white/70 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">CSV‑to‑CRM</h1>
              <span className="text-xs opacity-60">Local Database Edition</span>
              
              {currentDatabase && (
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-sm">
                  <Database className="h-4 w-4" />
                  <span className="font-medium">{currentDatabase}</span>
                  <span className="text-xs text-slate-500">
                    {systemStatus?.database?.contactCount ? `${systemStatus.database.contactCount} contacts` : ''}
                  </span>
                </div>
              )}
              
              <div className="flex items-center gap-1" title="System Status: Database | ADB | SMS">
                <div className={`h-2 w-2 rounded-full ${systemStatus?.database?.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <div className={`h-2 w-2 rounded-full ${systemStatus?.adb?.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <div className={`h-2 w-2 rounded-full ${systemStatus?.sms?.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              </div>
            </div>
            
            {selectedContacts.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">{selectedContacts.size} selected:</span>
                
                {selectedContacts.size < sortedRowsData.length && (
                  <button 
                    onClick={selectAllContactsAllPages}
                    className="px-2 py-1 text-xs rounded border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 inline-flex items-center gap-1"
                    title={`Select all ${sortedRowsData.length} contacts across all pages`}
                  >
                    <Users className="h-3 w-3"/> All Pages ({sortedRowsData.length})
                  </button>
                )}
                
                <button 
                  onClick={() => setShowBatchTextPanel(true)}
                  className="px-3 py-1 text-sm rounded border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 inline-flex items-center gap-2"
                  disabled={!smsConnected}
                >
                  <MessageSquare className="h-3 w-3"/> Text
                </button>
                
                <button 
                  onClick={() => setShowMoveToDbModal(true)}
                  className="px-3 py-1 text-sm rounded border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 inline-flex items-center gap-2"
                  title={`Move ${selectedContacts.size} selected contact${selectedContacts.size > 1 ? 's' : ''} to another database`}
                  disabled={databases.length <= 1}
                >
                  <Database className="h-3 w-3"/> Move ({selectedContacts.size})
                </button>
                
                <button 
                  onClick={() => setSelectedContacts(new Set())}
                  className="px-2 py-1 text-sm rounded border border-slate-300 text-slate-600 hover:bg-slate-100 inline-flex items-center gap-1"
                >
                  <X className="h-3 w-3"/> Clear
                </button>
              </div>
            )}
            
            <div className="ml-auto flex items-center gap-2">
              <button 
                onClick={() => setShowSmsPanel(true)}
                className={`px-3 py-2 rounded-lg border inline-flex items-center gap-2 ${smsConnected ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100' : 'border-slate-300 hover:bg-slate-100'}`}
              >
                <MessageSquare className="h-4 w-4"/> SMS
                {smsConnected && <span className="text-xs">●</span>}
              </button>
              
              <button 
                onClick={() => setShowFollowUpQueue(!showFollowUpQueue)}
                className={`px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 inline-flex items-center gap-2 ${showFollowUpQueue ? 'bg-orange-100 text-orange-700' : ''}`}
                disabled={!currentDatabase || rows.length === 0}
              >
                <Calendar className="h-4 w-4"/> Follow-Ups
                {followUpRowsData.length > 0 && <span className="text-xs bg-orange-600 text-white rounded-full px-1">{followUpRowsData.length}</span>}
              </button>
              
              <button 
                onClick={() => setShowDatabaseManager(true)}
                className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 inline-flex items-center gap-2"
                title="Database & Settings"
              >
                <Settings className="h-4 w-4"/>
              </button>
              
              <label className={`px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 cursor-pointer inline-flex items-center gap-2 ${!currentDatabase ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <Upload className="h-4 w-4"/>
                <input 
                  type="file" 
                  accept=".csv,text/csv" 
                  className="hidden" 
                  onChange={(e) => onFiles(e.target.files)}
                  disabled={!currentDatabase}
                />
              </label>
              
              <button 
                onClick={exportCsv} 
                disabled={!currentDatabase || rows.length === 0}
                className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 inline-flex items-center gap-2 disabled:opacity-50"
              >
                <Download className="h-4 w-4"/>
              </button>
              
              <button 
                onClick={() => setShowTemplateManager(true)}
                className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 inline-flex items-center gap-2"
                title={`${smsTemplates.length} SMS Templates`}
              >
                <FileText className="h-4 w-4"/>
                <span className="text-xs text-slate-500">{smsTemplates.length}</span>
              </button>
              
              <button 
                onClick={handleGenerateWebsites}
                disabled={websiteGenerating || !currentDatabase || rows.length === 0}
                className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 inline-flex items-center gap-2 disabled:opacity-50"
                title="Generate Realtor Websites"
              >
                <Globe className="h-4 w-4"/>
                {websiteGenerating ? 'Generating...' : 'Websites'}
              </button>
              
              <button 
                onClick={() => setShowStatusPanel(true)} 
                className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 inline-flex items-center gap-2"
                title="System Status"
              >
                <Activity className="h-4 w-4"/>
              </button>
              
              <button 
                onClick={() => setDark((d) => !d)} 
                className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-100"
                title={`Switch to ${dark ? 'Light' : 'Dark'} Mode`}
              >
                {dark ? "☀️" : "🌙"}
              </button>
            </div>
          </div>
        </header>

        {loading && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-40">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 flex items-center gap-3">
              <div className="animate-spin h-5 w-5 border-2 border-blue-600 rounded-full border-t-transparent"></div>
              Loading...
            </div>
          </div>
        )}

        <main className="max-w-7xl mx-auto px-4 py-4 grid grid-cols-12 gap-4">
          {/* Data Table Section */}
          <section className="col-span-12 lg:col-span-7 xl:col-span-8">
            <div className="mb-3 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-60"/>
                  <input 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)} 
                    placeholder="Search any field or phone number…" 
                    className="w-full pl-9 pr-10 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" 
                  />
                  {(search || statusFilter) && (
                    <button
                      onClick={clearFilters}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                      title="Clear all filters"
                    >
                      <X className="h-4 w-4 opacity-60" />
                    </button>
                  )}
                </div>
                <button 
                  onClick={addRow} 
                  disabled={!currentDatabase}
                  className="px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center gap-2 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4"/> Add Row
                </button>
                <button 
                  onClick={() => setShowCleanupModal(true)} 
                  disabled={!currentDatabase || rows.length === 0}
                  className="px-3 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 inline-flex items-center gap-2 disabled:opacity-50"
                  title="Open cleanup options - remove duplicates and clean data"
                >
                  🧹 Cleanup
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Quick Filters:</span>
                <button
                  onClick={() => setStatusFilter("")}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    !statusFilter 
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600'
                  }`}
                >
                  All ({rows.length})
                </button>
                {STATUS_OPTIONS.map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(statusFilter === status ? "" : status)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      statusFilter === status
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600'
                    }`}
                  >
                    {status} ({rows.filter(r => r.Status === status).length})
                  </button>
                ))}
              </div>
            </div>

            <DataTable 
              normalizedHeaders={normalizedHeaders}
              pageRows={pageRows}
              selectedContacts={selectedContacts}
              selectedId={selectedId}
              sortBy={sortBy}
              onSort={handleSort}
              onSelectContact={toggleContactSelection}
              onSelectAll={selectAllContacts}
              onClearSelections={clearAllSelections}
              onRowClick={handleRowClick}
              onCellEdit={handleCellEdit}
              formatPropertyValue={(contact, field) => formatPropertyValue(contact, field)}
            />

            <Pagination 
              page={page}
              totalPages={totalPages}
              perPage={perPage}
              sortedRowsLength={sortedRowsData.length}
              onPageChange={setPage}
              onPerPageChange={(e) => {
                setPerPage(parseInt(e.target.value));
                setPage(1);
              }}
            />
          </section>

          {/* Contact Detail Panel */}
          <aside className="col-span-12 lg:col-span-5 xl:col-span-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sticky top-16">
              <ContactDetailPanel 
                selected={selected}
                normalizedHeaders={normalizedHeaders}
                saveStatus={saveStatus}
                onNavigate={nav}
                onUpdateContact={patchRow}
                onSetStatus={setStatus}
                onSetFollowUp={onFollowUp}
                onOpenSmsForContact={openSmsForContact}
                findPhoneField={(contact) => findPhoneField(contact, headers, getCurrentDatabaseTypeFn)}
                findNameField={(contact) => findNameField(contact, headers, getCurrentDatabaseTypeFn)}
              />
            </div>
          </aside>
        </main>

        {/* Help footer */}
        <footer className="max-w-7xl mx-auto px-4 py-8 text-sm opacity-70">
          <details>
            <summary className="cursor-pointer">Help & Shortcuts</summary>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li><b>Database:</b> Create multiple databases for different campaigns or clients. Switch between them easily.</li>
              <li><b>Import:</b> Click <i>Import CSV</i> and select your file. Data is automatically saved to the current database.</li>
              <li><b>Images & Links:</b> Any cell with an <code>http://</code> or <code>https://</code> URL is clickable; image URLs show thumbnails.</li>
              <li><b>Call Cockpit:</b> Use the right panel to update Status, Notes, Last Contacted, and Follow‑Up. Changes save automatically.</li>
              <li><b>Export:</b> Click <i>Export CSV</i> to download your data with all updates and notes.</li>
              <li><b>Keyboard:</b> ←/→ navigate; <b>S</b> export CSV; 1/2/3/4 set common statuses.</li>
              <li><b>Storage:</b> All data is stored locally in SQLite databases in the `databases/` folder.</li>
            </ul>
          </details>
        </footer>
      </div>
    </div>
  );
}
