// Utilities
export const isUrl = (v) => typeof v === "string" && /^https?:\/\//i.test(v);
export const isImageUrl = (v) => typeof v === "string" && /\.(png|jpe?g|gif|webp|svg)$/i.test(v);
export const titleCase = (s) => (s || "").replace(/[_-]+/g, " ").replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
export const uid = () => Math.random().toString(36).slice(2, 9);

// Convert ISO timestamp to datetime-local format
export const formatDateTimeLocal = (isoString) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  // Convert to local timezone and format as YYYY-MM-DDTHH:MM
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};
