import React from 'react';
import { 
  ChevronLeft, ChevronRight, Phone, MessageSquare, 
  Image as ImageIcon, Check, RefreshCw, X
} from 'lucide-react';
import { isImageUrl, titleCase, formatDateTimeLocal } from '../utils/helpers';
import { STATUS_OPTIONS } from '../constants';

const ContactDetailPanel = ({
  selected,
  normalizedHeaders,
  saveStatus,
  onNavigate,
  onUpdateContact,
  onSetStatus,
  onSetFollowUp,
  onOpenSmsForContact,
  findPhoneField,
  findNameField
}) => {
  // Debug: Log render to detect duplicate renders
  console.log('ContactDetailPanel rendering with contact:', selected?.id);
  
  if (!selected) {
    return (
      <div className="text-center opacity-70 py-12">
        Select a record to begin calling.
      </div>
    );
  }

  const phoneField = findPhoneField(selected);
  const nameField = findNameField(selected);
  const phoneNumber = phoneField ? selected[phoneField] : null;
  
  // Debug: Log the contact data to understand the structure
  console.log('ContactDetailPanel - selected contact:', selected);
  console.log('ContactDetailPanel - nameField found:', nameField);
  console.log('ContactDetailPanel - available keys:', Object.keys(selected));
  
  // Try to find name more intelligently
  let contactName = null;
  if (nameField && selected[nameField]) {
    contactName = selected[nameField];
  } else {
    // Fallback: look for common name fields directly
    const possibleNameFields = ['name', 'Name', 'NAME', 'agent_name', 'Agent_Name', 'first_name', 'firstName', 'FirstName'];
    for (const field of possibleNameFields) {
      if (selected[field] && selected[field] !== 'Agent Name Not Found') {
        contactName = selected[field];
        break;
      }
    }
  }
  
  // Final fallback: use a truncated version of the ID instead of full UUID
  if (!contactName) {
    contactName = `Contact-${selected.id.substring(0, 8)}...`;
  }

  return (
    <div className="space-y-4">
      {/* Header with navigation */}
      <div className="flex items-center justify-between">
        <div className="font-semibold">Record</div>
        <div className="flex items-center gap-2">
          <button 
            className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700" 
            onClick={() => onNavigate(-1)}
          >
            <ChevronLeft className="h-4 w-4"/>
          </button>
          <button 
            className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700" 
            onClick={() => onNavigate(1)}
          >
            <ChevronRight className="h-4 w-4"/>
          </button>
        </div>
      </div>

      {/* Contact Info */}
      <div className="flex items-start gap-3">
        <div className="h-20 w-20 bg-slate-200 dark:bg-slate-800 rounded-xl overflow-hidden flex items-center justify-center">
          {Object.values(selected).some(isImageUrl) ? (
            <img 
              src={Object.values(selected).find(isImageUrl)} 
              className="h-full w-full object-cover"
              alt="Contact"
            />
          ) : (
            <ImageIcon className="h-8 w-8 opacity-50"/>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-lg font-semibold truncate">
              {contactName}
            </div>
            {selected.LastTextSent && (
              <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                <MessageSquare className="h-3 w-3" />
                <span>
                  {(() => {
                    const date = new Date(selected.LastTextSent);
                    const now = new Date();
                    const diffHours = Math.floor((now - date) / (1000 * 60 * 60));
                    
                    if (diffHours < 1) return 'Just sent';
                    if (diffHours < 24) return `${diffHours}h ago`;
                    return `${Math.floor(diffHours / 24)}d ago`;
                  })()}
                </span>
              </div>
            )}
          </div>
          <div className="text-sm opacity-70 truncate">
            {selected.AGENCY || selected.Company || selected.Brokerage || ""}
          </div>
          <div className="mt-1 flex flex-wrap gap-2">
            {phoneNumber && (
              <>
                <div className="flex gap-1">
                  <a 
                    href={`tel:${phoneNumber.replace(/[^\d+]/g, "")}`} 
                    className="inline-flex items-center gap-2 px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    <Phone className="h-4 w-4"/> Call
                  </a>
                  <button 
                    onClick={() => onOpenSmsForContact(selected)}
                    className="inline-flex items-center gap-2 px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <MessageSquare className="h-4 w-4"/> Text
                  </button>
                </div>
                <div className="text-lg font-semibold text-slate-800 dark:text-slate-200 self-center bg-slate-100 dark:bg-slate-700 px-3 py-2 rounded-lg border-2 border-slate-200 dark:border-slate-600">
                  {phoneNumber}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Status and Follow-up */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs opacity-70">Status</label>
          <select 
            value={selected.Status || ""} 
            onChange={(e) => onUpdateContact(selected.id, { Status: e.target.value })} 
            className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs opacity-70">Follow‑Up</label>
          <input 
            type="datetime-local" 
            value={formatDateTimeLocal(selected.FollowUpAt)} 
            onChange={(e) => onSetFollowUp(e.target.value)} 
            className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs opacity-70">Notes</label>
        <textarea 
          value={selected.Notes || ""} 
          onChange={(e) => onUpdateContact(selected.id, { Notes: e.target.value })} 
          placeholder="Free‑form call notes…" 
          rows={6} 
          className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
        />
      </div>

      {/* All Fields */}
      <details className="group">
        <summary className="cursor-pointer select-none text-sm font-semibold">All Fields</summary>
        <div className="mt-2 max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50 dark:bg-slate-800/50">
          <div className="grid grid-cols-1 gap-2">
            {normalizedHeaders.filter(h => h !== "id").map((h) => (
              <div key={h}>
                <label className="text-xs opacity-70">{titleCase(h)}</label>
                <input 
                  value={selected[h] ?? ""} 
                  onChange={(e) => onUpdateContact(selected.id, { [h]: e.target.value })} 
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            ))}
          </div>
        </div>
      </details>

      {/* Quick Status Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button 
          onClick={() => onSetStatus("No Answer")} 
          className="px-3 py-2 rounded-lg border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:bg-orange-900/20 dark:text-orange-300 dark:hover:bg-orange-900/40"
        >
          No Answer (1)
        </button>
        <button 
          onClick={() => onSetStatus("Left Voicemail")} 
          className="px-3 py-2 rounded-lg border border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300 dark:hover:bg-yellow-900/40"
        >
          Left VM (2)
        </button>
        <button 
          onClick={() => onSetStatus("Interested")} 
          className="px-3 py-2 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
        >
          Interested (3)
        </button>
        <button 
          onClick={() => onSetStatus("Not Interested")} 
          className="px-3 py-2 rounded-lg border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/40"
        >
          Not Interested (4)
        </button>
        <button 
          onClick={() => onSetStatus("SENT TEXT")} 
          className="px-3 py-2 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/40"
        >
          📱 Sent Text (5)
        </button>
      </div>

      {/* SOLD Button */}
      <div className="mt-2">
        <button 
          onClick={() => onSetStatus("SOLD!")} 
          className="w-full px-4 py-3 rounded-lg border-2 border-green-500 bg-green-500 text-white font-bold text-lg hover:bg-green-600 hover:border-green-600 dark:border-green-400 dark:bg-green-500 dark:hover:bg-green-600 shadow-lg transform hover:scale-105 transition-all duration-200"
        >
          💰 SOLD! 💰
        </button>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex flex-col gap-1">
          <div className="text-xs opacity-70">
            Last Contacted: {selected.LastContacted || "—"}
          </div>
          {selected.LastTextSent && (
            <div className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              <span>
                Last Text: {new Date(selected.LastTextSent).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          )}
        </div>
        <div className="text-xs flex items-center gap-1">
          {saveStatus === 'saving' && (
            <>
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span className="text-blue-600">Saving...</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <Check className="h-3 w-3" />
              <span className="text-emerald-600">Saved to database</span>
            </>
          )}
          {saveStatus === 'error' && (
            <>
              <X className="h-3 w-3" />
              <span className="text-red-600">Save failed</span>
            </>
          )}
          {!saveStatus && (
            <span className="text-slate-500">Auto-save enabled</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactDetailPanel;
