import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import Papa from "papaparse";
import dayjs from "dayjs";
import { Download, Upload, FileUp, FileDown, Search, ChevronLeft, ChevronRight, Phone, Trash2, Save, Filter, X, Check, Link as LinkIcon, Image as ImageIcon, NotebookText, Plus, Calendar, Star, RefreshCw } from "lucide-react";

/**
 * CSV‑to‑CRM — a lightweight, web‑based CRM for cold calling, powered by CSV.
 * Features:
 * - Drag & drop CSV import (UTF‑8), automatic header detection
 * - Beautiful table with sticky header, search, sort, pagination
 * - Smart rendering: clickable links; inline image thumbnails for image URLs
 * - Row inspector (right panel) for focused calling workflow
 * - Notes, Status, Last Contacted, Follow‑Up (date/time) tracked per row
 * - Inline editing for any field; add/remove rows
 * - Quick actions: "No Answer", "Left VM", "Interested", etc. (customizable)
 * - Keyboard shortcuts (listed in Help)
 * - Autosave to localStorage + Export back to CSV (adds new columns)
 * - Dark mode toggle
 */

// Utilities
const isUrl = (v) => typeof v === "string" && /^https?:\/\//i.test(v);
const isImageUrl = (v) => typeof v === "string" && /\.(png|jpe?g|gif|webp|svg)$/i.test(v);
const titleCase = (s) => (s || "").replace(/[_-]+/g, " ").replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
const uid = () => Math.random().toString(36).slice(2, 9);
const DEFAULT_STATUS = "New";

const DEFAULT_COLUMNS = ["id","Notes","Status","LastContacted","FollowUpAt"]; // Always ensured

const STATUS_OPTIONS = [
  "New",
  "No Answer",
  "Left Voicemail",
  "Callback Requested",
  "Interested",
  "Not Interested",
  "Wrong Number",
  "Do Not Call",
];

export default function App() {
  const [selectedContacts, setSelectedContacts] = useState(new Set()); // Array of objects
  const [headers, setHeaders] = useState(new Set()); // Ordered header names
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState({ key: null, dir: "asc" });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [dark, setDark] = useState(true);

  // Load from localStorage on first mount
  useEffect(() => {
    const saved = localStorage.getItem("csv_crm_state_v1");
    if (saved) {
      try {
        const { rows: r, headers: h, page: p, perPage: pp, dark: d } = JSON.parse(saved);
        setRows(r || []);
        setHeaders(h || []);
        setPage(p || 1);
        setPerPage(pp || 25);
        setDark(d ?? true);
      } catch {}
    }
  }, []);

  // Autosave
  useEffect(() => {
    const data = { rows, headers, page, perPage, dark };
    localStorage.setItem("csv_crm_state_v1", JSON.stringify(data));
  }, [rows, headers, page, perPage, dark]);

  // Derived
  const normalizedHeaders = useMemo(() => {
    const base = [...new Set([...(headers || [])])];
    DEFAULT_COLUMNS.forEach((c) => {
      if (!base.includes(c)) base.push(c);
    });
    return base;
  }, [headers]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => normalizedHeaders.some((h) => String(r[h] ?? "").toLowerCase().includes(q)));
  }, [rows, search, normalizedHeaders]);

  const sortedRows = useMemo(() => {
    const arr = [...filteredRows];
    if (!sortBy.key) return arr;
    arr.sort((a, b) => {
      const va = (a[sortBy.key] ?? "").toString().toLowerCase();
      const vb = (b[sortBy.key] ?? "").toString().toLowerCase();
      if (va < vb) return sortBy.dir === "asc" ? -1 : 1;
      if (va > vb) return sortBy.dir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filteredRows, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / perPage));
  const pageRows = useMemo(() => sortedRows.slice((page - 1) * perPage, page * perPage), [sortedRows, page, perPage]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  // Import CSV
  const onFiles = (files) => {
    if (!files?.length) return;
    const file = files[0];
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const incomingHeaders = res.meta.fields || [];
        const enrichedRows = res.data.map((r) => ({
          id: r.id || uid(),
          Status: r.Status || DEFAULT_STATUS,
          Notes: r.Notes || "",
          LastContacted: r.LastContacted || "",
          FollowUpAt: r.FollowUpAt || "",
          ...r,
        }));
        setHeaders(incomingHeaders.filter(Boolean));
        setRows(enrichedRows);
        setPage(1);
        if (enrichedRows[0]) setSelectedId(enrichedRows[0].id);
      },
      error: (err) => alert("CSV parse error: " + err.message),
    });
  };

  // Export CSV
  const exportCsv = () => {
    const exportHeaders = normalizedHeaders;
    const csv = Papa.unparse({
      fields: exportHeaders,
      data: rows.map((r) => exportHeaders.map((h) => r[h] ?? "")),
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crm_export_${dayjs().format("YYYY-MM-DD_HH-mm")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Add/Remove rows
  const addRow = () => {
    const obj = { id: uid(), Status: DEFAULT_STATUS, Notes: "" };
    normalizedHeaders.forEach((h) => (obj[h] = obj[h] ?? ""));
    setRows((r) => [obj, ...r]);
    setSelectedId(obj.id);
  };
  const deleteRow = (id) => setRows((r) => r.filter((x) => x.id !== id));

  // Update helpers
  const patchRow = (id, patch) => setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest("input,textarea")) return; // ignore while typing
      if (e.key === "ArrowRight") {
        e.preventDefault();
        nav(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        nav(-1);
      } else if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        exportCsv();
      } else if (e.key === "1") setStatus("No Answer");
      else if (e.key === "2") setStatus("Left Voicemail");
      else if (e.key === "3") setStatus("Interested");
      else if (e.key === "4") setStatus("Not Interested");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const selected = rows.find((r) => r.id === selectedId) || null;
  const nav = (delta) => {
    if (!selected) return;
    const idx = sortedRows.findIndex((r) => r.id === selected.id);
    const next = sortedRows[Math.min(sortedRows.length - 1, Math.max(0, idx + delta))];
    if (next) setSelectedId(next.id);
  };

  const setStatus = (status) => {
    if (!selected) return;
    patchRow(selected.id, { Status: status, LastContacted: dayjs().format("YYYY-MM-DD HH:mm") });
  };

  const onFollowUp = (dt) => {
    if (!selected) return;
    patchRow(selected.id, { FollowUpAt: dt });
  };

  // Renderers
  const Cell = ({ h, v }) => {
    if (isUrl(v)) {
      if (isImageUrl(v)) {
        return (
          <a href={v} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2">
            <img src={v} alt="img" className="h-10 w-10 object-cover rounded" />
            <span className="underline truncate max-w-[240px]">{v}</span>
          </a>
        );
      }
      return (
        <a href={v} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-300 underline inline-flex items-center gap-1">
          <LinkIcon className="h-4 w-4" /> <span className="truncate max-w-[280px]">{v}</span>
        </a>
      );
    }
    return <span className="truncate block max-w-[320px]" title={String(v ?? "")}>{String(v ?? "")}</span>;
  };

  return (
    <div className={"min-h-screen " + (dark ? "dark" : "") }>
      <div className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 min-h-screen">
        <header className="sticky top-0 z-30 backdrop-blur bg-white/70 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
            <h1 className="text-xl font-semibold">CSV‑to‑CRM</h1>
            <span className="text-xs opacity-60">Cold‑calling cockpit</span>
            <div className="ml-auto flex items-center gap-2">
              <label className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer inline-flex items-center gap-2">
                <Upload className="h-4 w-4"/> Import CSV
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e)=>onFiles(e.target.files)} />
              </label>
              <button onClick={exportCsv} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-2"><Download className="h-4 w-4"/> Export CSV</button>
              <button onClick={() => setDark((d) => !d)} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">{dark ? "Light" : "Dark"}</button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-4 grid grid-cols-12 gap-4">
          {/* Left: Table */}
          <section className="col-span-12 lg:col-span-7 xl:col-span-8">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex-1 relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-60"/>
                <input value={search} onChange={(e)=>{ setSearch(e.target.value); setPage(1); }} placeholder="Search any field…" className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
              </div>
              <button onClick={addRow} className="px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center gap-2"><Plus className="h-4 w-4"/> Add Row</button>
            </div>

            <div className="overflow-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0">
                  <tr>
                    {normalizedHeaders.map((h) => (
                      <th key={h} className="px-3 py-2 text-left whitespace-nowrap select-none cursor-pointer" onClick={()=> setSortBy((s)=> ({ key: h, dir: s.key===h && s.dir==="asc"?"desc":"asc" }))}>
                        <div className="flex items-center gap-1">
                          <span>{titleCase(h)}</span>
                          {sortBy.key===h && <span className="opacity-60">{sortBy.dir==="asc"?"▲":"▼"}</span>}
                        </div>
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r) => (
                    <tr key={r.id} className={(selectedId===r.id?"bg-emerald-50/60 dark:bg-emerald-900/20":"") + " border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"}>
                      {normalizedHeaders.map((h) => (
                        <td key={h} className="px-3 py-2 align-top max-w-[360px]">
                          <Cell h={h} v={r[h]} />
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <button className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 mr-2" onClick={()=> setSelectedId(r.id)}>Open</button>
                        <button className="px-2 py-1 rounded border border-rose-300 text-rose-600 dark:border-rose-700" onClick={()=> deleteRow(r.id)}><Trash2 className="inline h-4 w-4 mr-1"/>Delete</button>
                      </td>
                    </tr>
                  ))}
                  {pageRows.length===0 && (
                    <tr>
                      <td colSpan={normalizedHeaders.length+1} className="px-3 py-6 text-center opacity-70">
                        {rows.length?"No results match your search.":"Import a CSV to get started."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-3 flex items-center justify-between">
              <div className="text-sm opacity-70">{sortedRows.length} records</div>
              <div className="flex items-center gap-2">
                <button disabled={page<=1} onClick={()=> setPage((p)=> Math.max(1, p-1))} className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-50"><ChevronLeft className="h-4 w-4"/></button>
                <span className="text-sm">Page {page} / {totalPages}</span>
                <button disabled={page>=totalPages} onClick={()=> setPage((p)=> Math.min(totalPages, p+1))} className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-50"><ChevronRight className="h-4 w-4"/></button>
                <select value={perPage} onChange={(e)=>{ setPerPage(Number(e.target.value)); setPage(1); }} className="ml-2 px-2 py-1 rounded border border-slate-300 dark:border-slate-700">
                  {[10,25,50,100,250].map(n=> <option key={n} value={n}>{n}/page</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* Right: Inspector / Call cockpit */}
          <aside className="col-span-12 lg:col-span-5 xl:col-span-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sticky top-16">
              {!selected ? (
                <div className="text-center opacity-70 py-12">Select a record to begin calling.</div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">Record</div>
                    <div className="flex items-center gap-2">
                      <button className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700" onClick={()=> nav(-1)}><ChevronLeft className="h-4 w-4"/></button>
                      <button className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700" onClick={()=> nav(1)}><ChevronRight className="h-4 w-4"/></button>
                    </div>
                  </div>

                  {/* Hero area: image + name + phone if detected */}
                  <div className="flex items-start gap-3">
                    <div className="h-20 w-20 bg-slate-200 dark:bg-slate-800 rounded-xl overflow-hidden flex items-center justify-center">
                      {Object.values(selected).some(isImageUrl) ? (
                        <img src={(Object.values(selected).find(isImageUrl))} className="h-full w-full object-cover"/>
                      ) : (
                        <ImageIcon className="h-8 w-8 opacity-50"/>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-lg font-semibold truncate">{selected.Name || selected.NAME || selected.Agent || selected.id}</div>
                      <div className="text-sm opacity-70 truncate">{selected.AGENCY || selected.Company || selected.Brokerage || ""}</div>
                      <div className="mt-1">
                        {Object.entries(selected).map(([k,v])=> /phone|mobile|tel/i.test(k) && v ? (
                          <a key={k} href={`tel:${String(v).replace(/[^\d+]/g,"")}`} className="inline-flex items-center gap-2 px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 mr-2"><Phone className="h-4 w-4"/> {String(v)}</a>
                        ) : null)}
                      </div>
                    </div>
                  </div>

                  {/* Quick fields */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs opacity-70">Status</label>
                      <select value={selected.Status || ""} onChange={(e)=> patchRow(selected.id, { Status: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
                        {STATUS_OPTIONS.map(s=> <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs opacity-70">Follow‑Up</label>
                      <input type="datetime-local" value={selected.FollowUpAt || ""} onChange={(e)=> onFollowUp(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"/>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs opacity-70">Notes</label>
                    <textarea value={selected.Notes || ""} onChange={(e)=> patchRow(selected.id, { Notes: e.target.value })} placeholder="Free‑form call notes…" rows={6} className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"/>
                  </div>

                  {/* All fields editable */}
                  <details className="group">
                    <summary className="cursor-pointer select-none text-sm font-semibold">All Fields</summary>
                    <div className="mt-2 grid grid-cols-1 gap-2">
                      {normalizedHeaders.filter(h=>h!=="id").map((h)=> (
                        <div key={h}>
                          <label className="text-xs opacity-70">{titleCase(h)}</label>
                          <input value={selected[h] ?? ""} onChange={(e)=> patchRow(selected.id, { [h]: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"/>
                        </div>
                      ))}
                    </div>
                  </details>

                  {/* Quick actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={()=> setStatus("No Answer")} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">No Answer (1)</button>
                    <button onClick={()=> setStatus("Left Voicemail")} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">Left VM (2)</button>
                    <button onClick={()=> setStatus("Interested")} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">Interested (3)</button>
                    <button onClick={()=> setStatus("Not Interested")} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">Not Interested (4)</button>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="text-xs opacity-70">Last Contacted: {selected.LastContacted || "—"}</div>
                    <button onClick={exportCsv} className="px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center gap-2"><Save className="h-4 w-4"/> Save CSV</button>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </main>

        {/* Help footer */}
        <footer className="max-w-7xl mx-auto px-4 py-8 text-sm opacity-70">
          <details>
            <summary className="cursor-pointer">Help & Shortcuts</summary>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li><b>Import:</b> Click <i>Import CSV</i> and select your file. The app autodetects headers and keeps your data on this device (no server).</li>
              <li><b>Images & Links:</b> Any cell with an <code>http://</code> or <code>https://</code> URL is clickable; image URLs show thumbnails.</li>
              <li><b>Call Cockpit:</b> Use the right panel to update Status, Notes, Last Contacted, and Follow‑Up. Phone fields become click‑to‑call.</li>
              <li><b>Export:</b> Click <i>Export CSV</i> or <i>Save CSV</i>. Added columns: <code>Notes</code>, <code>Status</code>, <code>LastContacted</code>, <code>FollowUpAt</code>.</li>
              <li><b>Keyboard:</b> ←/→ navigate; <b>S</b> export CSV; 1/2/3/4 set common statuses.</li>
              <li><b>Privacy:</b> All data stays in your browser/localStorage. Clear site data to reset.</li>
            </ul>
          </details>
        </footer>
      </div>
    </div>
  );
}
