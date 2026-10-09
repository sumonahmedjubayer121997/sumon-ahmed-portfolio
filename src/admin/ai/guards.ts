/**
 * Checks on what the AI wrote, against the notes it was given — code, not
 * prompt instructions, so they hold even when the model ignores the rules.
 * A portfolio lives or dies on its numbers: any figure or link the notes don't
 * contain is flagged (in text) or removed (from results and URL fields).
 */

/** Numbers worth checking: "92.5%", "49,417", "0.925", "3x", "2025". Single digits are list counts and steps. */
export function numbersIn(text: string): string[] {
  const out = new Set<string>();
  // Leave out list markers ("1. ") and the numbers inside code, links and image addresses.
  const prose = text
    .replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/\]\([^)]*\)/g, ']')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/^\s*\d+\.\s/gm, ' ');
  for (const m of prose.matchAll(/(?<![\w.])\d[\d,]*(?:\.\d+)?/g)) {
    const n = m[0].replace(/,/g, '').replace(/\.$/, '');
    if (/^\d$/.test(n)) continue;
    out.add(n);
  }
  return [...out];
}

/** The same number written differently still counts: "92.5" ~ "0.925" ~ "92.50". */
function variants(n: string): string[] {
  const v = Number(n);
  if (!Number.isFinite(v)) return [n];
  const forms = new Set([n, String(v)]);
  if (v <= 1) forms.add(String(+(v * 100).toFixed(4)));
  if (v > 1 && v <= 100) forms.add(String(+(v / 100).toFixed(6)));
  return [...forms];
}

export function unsupportedNumbers(output: string, notes: string): string[] {
  const known = new Set(numbersIn(notes).flatMap(variants));
  return numbersIn(output).filter((n) => !variants(n).some((f) => known.has(f)));
}

export const urlsIn = (text: string) => [...new Set(text.match(/https?:\/\/[^\s)"'<>\]]+/g) ?? [])];

/** Links the notes never mentioned. */
export function unsupportedUrls(output: string, notes: string): string[] {
  const known = new Set(urlsIn(notes).map((u) => u.replace(/[.,;]+$/, '').replace(/\/$/, '')));
  return urlsIn(output).filter((u) => !known.has(u.replace(/[.,;]+$/, '').replace(/\/$/, '')));
}

/** Keeps a URL only if it appears in the notes. */
export const keepUrlFromNotes = (url: string, notes: string) =>
  url && unsupportedUrls(url, notes).length === 0 ? url : '';

/** The next free "Number" (01, 02 …) after the existing ones. */
export function nextIndex(existing: string[]): string {
  const max = existing.reduce((m, s) => Math.max(m, Number.parseInt(s, 10) || 0), 0);
  return String(max + 1).padStart(2, '0');
}
