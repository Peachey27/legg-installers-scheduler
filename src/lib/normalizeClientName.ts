export function normalizeClientName(name: string | null | undefined) {
  const raw = typeof name === "string" ? name.trim().replace(/\s+/g, " ") : "";
  if (!raw) return "";
  if (!raw.includes(" ")) return raw.toUpperCase();
  return raw;
}

