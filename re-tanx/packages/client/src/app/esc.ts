/** Escape text for innerHTML templates (names, map titles, server messages). */
export const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
