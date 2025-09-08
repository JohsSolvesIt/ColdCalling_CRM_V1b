import React from 'react';
import { ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { titleCase, isUrl, isImageUrl } from '../utils/helpers';

const DataTable = ({
  normalizedHeaders,
  pageRows,
  selectedContacts,
  selectedId,
  sortBy,
  onSort,
  onSelectContact,
  onSelectAll,
  onClearSelections,
  onRowClick,
  onCellEdit,
  formatPropertyValue,
  onManageReviews
}) => {
  const Cell = ({ h, v, contact }) => {
    const formatted = formatPropertyValue(contact, h);
    
    if (isUrl(v)) {
      return (
        <a 
          href={v} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-blue-600 hover:underline inline-flex items-center gap-1"
        >
          {isImageUrl(v) ? (
            <img src={v} alt="" className="h-8 w-8 object-cover rounded" />
          ) : (
            formatted || v
          )}
        </a>
      );
    }
    
    if (isImageUrl(v)) {
      return <img src={v} alt="" className="h-8 w-8 object-cover rounded" />;
    }
    
    return formatted || v || '';
  };

  return (
    <div className="overflow-auto border border-slate-200 dark:border-slate-800 rounded-xl">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0">
          <tr>
            <th className="px-3 py-2 text-left w-16">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={pageRows.length > 0 && pageRows.every(row => selectedContacts instanceof Set ? selectedContacts.has(row.id) : false)}
                  onChange={(e) => e.target.checked ? onSelectAll() : onClearSelections()}
                  className="rounded border-slate-300 dark:border-slate-600"
                />
                <span className="text-xs">All</span>
              </div>
            </th>
            <th className="px-3 py-2 text-left">Actions</th>
            {normalizedHeaders.map((h) => (
              <th 
                key={h} 
                className="px-3 py-2 text-left whitespace-nowrap select-none cursor-pointer" 
                onClick={() => onSort(h)}
              >
                <div className="flex items-center gap-1">
                  <span>{titleCase(h)}</span>
                  {sortBy.key === h && (
                    <span className="opacity-60">
                      {sortBy.dir === "asc" ? "▲" : "▼"}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pageRows.map((row) => (
            <tr 
              key={row.id} 
              className={`hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-200 dark:border-slate-800 ${
                selectedId === row.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
              onClick={() => onRowClick(row.id)}
            >
              <td className="px-3 py-2">
                <input 
                  type="checkbox" 
                  checked={selectedContacts instanceof Set ? selectedContacts.has(row.id) : false}
                  onChange={(e) => {
                    e.stopPropagation();
                    onSelectContact(row.id);
                  }}
                  className="rounded border-slate-300 dark:border-slate-600"
                />
              </td>
              <td className="px-3 py-2">
                <div className="flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onManageReviews?.(row);
                    }}
                    className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 rounded transition-colors"
                    title="Manage Reviews"
                  >
                    <MessageSquare size={16} />
                  </button>
                </div>
              </td>
              {normalizedHeaders.map((h) => (
                <td key={h} className="px-3 py-2">
                  {h === 'Notes' || h === 'Status' ? (
                    <input
                      type={h === 'Status' ? 'text' : 'text'}
                      value={row[h] || ''}
                      onChange={(e) => {
                        e.stopPropagation();
                        onCellEdit(row.id, { [h]: e.target.value });
                      }}
                      className="w-full bg-transparent border-none outline-none"
                    />
                  ) : (
                    <Cell h={h} v={row[h]} contact={row} />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const Pagination = ({ 
  page, 
  totalPages, 
  perPage, 
  sortedRowsLength,
  onPageChange, 
  onPerPageChange 
}) => {
  return (
    <div className="mt-3 flex items-center justify-between">
      <div className="text-sm opacity-70">{sortedRowsLength} records</div>
      <div className="flex items-center gap-2">
        <button 
          disabled={page <= 1} 
          onClick={() => onPageChange(Math.max(1, page - 1))} 
          className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4"/>
        </button>
        <span className="text-sm">Page {page} / {totalPages}</span>
        <button 
          disabled={page >= totalPages} 
          onClick={() => onPageChange(Math.min(totalPages, page + 1))} 
          className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-50"
        >
          <ChevronRight className="h-4 w-4"/>
        </button>
        <select 
          value={perPage} 
          onChange={onPerPageChange} 
          className="ml-2 px-2 py-1 rounded border border-slate-300 dark:border-slate-700"
        >
          {[10, 25, 50, 100, 250].map(n => (
            <option key={n} value={n}>{n}/page</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export { DataTable, Pagination };
