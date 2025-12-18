export function formatClientName(name: string | null | undefined) {
  const raw = (name ?? "").trim().replace(/\s+/g, " ");
  if (!raw) return "";

  const parts = raw.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].toUpperCase();

  const last = parts[parts.length - 1].toUpperCase();
  const firsts = parts.slice(0, -1).map(toTitleish);
  return [...firsts, last].join(" ");
}

function toTitleish(token: string) {
  // Keep existing mixed-case tokens (e.g. "McDonald") as typed.
  if (/[a-z]/.test(token) && /[A-Z]/.test(token)) return token;

  return token
    .split("-")
    .map((seg) =>
      seg
        .split("'")
        .map((s) => (s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s))
        .join("'")
    )
    .join("-");
}

