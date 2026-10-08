import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { formatDate, postsByDate, projects, site } from '@/content';
import { cv } from '@/components/ui/Availability';
import { useTransitionNavigate } from '@/hooks/useTransitionNavigate';
import { toggleLabMode } from '@/hooks/useShortcuts';
import { copyText } from '@/lib/clipboard';
import { announce } from '@/lib/announce';
import { ui } from '@/lib/store';
import { cn } from '@/lib/cn';

type Group = 'Projects' | 'Writing' | 'Sections' | 'Actions';
const GROUPS: Group[] = ['Projects', 'Writing', 'Sections', 'Actions'];

interface Item {
  id: string;
  group: Group;
  label: string;
  hint?: string;
  /** Extra words that match (stack, tags, summary). */
  keywords?: string;
  run: (go: (to: string) => void) => void;
}

const SECTIONS: Array<[string, string, string]> = [
  ['work', 'Selected work', 'projects case studies'],
  ['method', 'Method — from raw data to a decision', 'pipeline machine learning'],
  ['ai-lab', 'AI Lab', 'llm rag agents embeddings tools mcp'],
  ['about', 'About', 'bio background'],
  ['research', 'Research — MSc dissertation', 'mental health sentiment nlp thesis'],
  ['skills', 'Skills', 'capabilities stack tools'],
  ['experience', 'Experience', 'timeline path career'],
  ['contact', 'Contact', 'email hire availability'],
];

function buildItems(): Item[] {
  const open = (href: string) => () => void window.open(href, '_blank', 'noopener,noreferrer');
  const items: Item[] = [
    ...projects.map((p): Item => ({
      id: `p-${p.slug}`,
      group: 'Projects',
      label: p.title,
      hint: p.discipline,
      keywords: `${p.stack.join(' ')} ${p.summary} ${p.type}`,
      run: (go) => go(`/work/${p.slug}`),
    })),
    {
      id: 'blog',
      group: 'Writing',
      label: 'All notes',
      hint: `${postsByDate.length} posts`,
      keywords: 'blog writing articles',
      run: (go) => go('/blog'),
    },
    ...postsByDate.map((p): Item => ({
      id: `b-${p.slug}`,
      group: 'Writing',
      label: p.title,
      hint: formatDate(p.date),
      keywords: `${p.tags.join(' ')} ${p.excerpt}`,
      run: (go) => go(`/blog/${p.slug}`),
    })),
    { id: 's-home', group: 'Sections', label: 'Home', keywords: 'top start', run: (go) => go('/') },
    ...SECTIONS.map(([id, label, keywords]): Item => ({
      id: `s-${id}`,
      group: 'Sections',
      label,
      keywords,
      run: (go) => go(`/#${id}`),
    })),
    {
      id: 'a-copy-email',
      group: 'Actions',
      label: 'Copy email address',
      hint: site.email,
      keywords: 'contact mail',
      run: () =>
        void copyText(site.email).then((ok) =>
          announce(ok ? 'Email address copied.' : `Couldn’t copy. The address is ${site.email}`),
        ),
    },
    {
      id: 'a-email',
      group: 'Actions',
      label: 'Send an email',
      keywords: 'contact mail hire',
      run: () => void (window.location.href = `mailto:${site.email}`),
    },
    ...(cv.url
      ? [
          {
            id: 'a-cv',
            group: 'Actions' as const,
            label: 'Download CV',
            keywords: 'resume curriculum vitae pdf',
            run: () => {
              const a = document.createElement('a');
              a.href = cv.url;
              if (cv.download) a.download = cv.download;
              else a.target = '_blank';
              a.rel = 'noreferrer';
              a.click();
            },
          },
        ]
      : []),
    {
      id: 'a-lab',
      group: 'Actions',
      label: ui().labMode ? 'Turn Lab mode off' : 'Turn Lab mode on',
      hint: 'D',
      keywords: 'physics debug fps vectors',
      run: () => toggleLabMode(),
    },
    ...site.socials
      .filter((s) => /^https?:\/\/[^/]+\/.+/.test(s.href))
      .map((s): Item => ({
        id: `a-${s.label}`,
        group: 'Actions',
        label: `Open ${s.label}`,
        hint: '↗',
        run: open(s.href),
      })),
    {
      id: 'a-rss',
      group: 'Actions',
      label: 'RSS feed',
      hint: '↗',
      keywords: 'subscribe follow',
      run: open('/rss.xml'),
    },
  ];
  return items;
}

/** Higher is better; null = no match. */
function score(query: string, item: Item): number | null {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const label = item.label.toLowerCase();
  if (label.startsWith(q)) return 100;
  const at = label.indexOf(q);
  if (at >= 0) return 80 - Math.min(at, 30);
  const words = `${label} ${item.keywords ?? ''} ${item.group}`.toLowerCase().split(/[^a-z0-9+#.]+/);
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.every((t) => words.some((w) => w.startsWith(t)))) return 50;
  // Letters in order ("tfidf" → "How TF-IDF Actually Works").
  let i = 0;
  for (const ch of label) if (ch === q[i]) i++;
  return i === q.length ? 20 : null;
}

/**
 * ⌘K / Ctrl+K: jump to any project, note or section, or run an action. A modal
 * combobox: typing filters, arrows move, Enter runs, Escape closes, and focus
 * returns to where it was.
 */
export default function CommandPalette({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const baseId = useId();
  const go = useTransitionNavigate();
  const items = useMemo(buildItems, []);

  const groups = useMemo(() => {
    const ranked = items
      .map((item) => ({ item, s: score(query, item) }))
      .filter((r): r is { item: Item; s: number } => r.s !== null);
    return GROUPS.map((g) => ({
      group: g,
      items: ranked
        .filter((r) => r.item.group === g)
        .sort((a, b) => b.s - a.s)
        .map((r) => r.item),
    }))
      .filter((g) => g.items.length)
      .sort((a, b) => (query ? score(query, b.items[0])! - score(query, a.items[0])! : 0));
  }, [items, query]);
  const flat = groups.flatMap((g) => g.items);
  const current = flat[Math.min(active, flat.length - 1)];
  const optionId = (item: Item) => `${baseId}-${item.id}`;

  useEffect(() => setActive(0), [query]);

  // Focus the field; lock page scroll; restore focus on close.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    const html = document.documentElement;
    const overflow = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => {
      html.style.overflow = overflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (!current) return;
    document.getElementById(optionId(current))?.scrollIntoView({ block: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ids are stable
  }, [current]);

  const run = (item: Item) => {
    onClose();
    // Let the dialog unmount (and focus return) before navigating.
    window.setTimeout(() => item.run(go), 0);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || (e.key === 'n' && e.ctrlKey)) {
      e.preventDefault();
      setActive((i) => (flat.length ? (i + 1) % flat.length : 0));
    } else if (e.key === 'ArrowUp' || (e.key === 'p' && e.ctrlKey)) {
      e.preventDefault();
      setActive((i) => (flat.length ? (i - 1 + flat.length) % flat.length : 0));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActive(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActive(Math.max(0, flat.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (current) run(current);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Tab') {
      e.preventDefault(); // the field is the dialog's only stop
    }
  };

  return (
    <div className="fixed inset-0 z-[100]" role="presentation">
      <div className="absolute inset-0 bg-night/35 backdrop-blur-[3px]" onMouseDown={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative mx-auto mt-[12vh] w-[min(640px,calc(100vw-32px))] overflow-hidden rounded-[10px] border border-[var(--line-strong)] bg-ivory text-ink shadow-[0_30px_80px_-20px_rgba(21,20,19,0.45)]"
      >
        <div className="flex items-center gap-3 border-b border-[var(--line)] px-5">
          <svg
            viewBox="0 0 16 16"
            className="h-4 w-4 shrink-0 text-muted"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          >
            <circle cx="7" cy="7" r="4.6" />
            <path d="m10.5 10.5 3.5 3.5" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-controls={`${baseId}-list`}
            aria-activedescendant={current ? optionId(current) : undefined}
            aria-autocomplete="list"
            aria-label="Search projects, notes, sections and actions"
            placeholder="Search projects, notes, sections…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            autoComplete="off"
            spellCheck={false}
            className="h-14 min-w-0 flex-1 bg-transparent text-[1.02rem] outline-none placeholder:text-muted"
          />
          <kbd className="t-label rounded border border-[var(--line-strong)] px-1.5 py-0.5 text-[9px] text-muted">
            Esc
          </kbd>
        </div>

        <ul
          ref={listRef}
          id={`${baseId}-list`}
          role="listbox"
          aria-label="Results"
          className="max-h-[min(58vh,440px)] overflow-y-auto p-2"
        >
          {groups.map((g) => (
            <li key={g.group} role="presentation">
              <p className="t-label px-3 pb-1.5 pt-3 text-[9.5px] text-muted" aria-hidden="true">
                {g.group}
              </p>
              <ul role="group" aria-label={g.group}>
                {g.items.map((item) => {
                  const selected = item === current;
                  return (
                    <li
                      key={item.id}
                      id={optionId(item)}
                      role="option"
                      aria-selected={selected}
                      onMouseMove={() => setActive(flat.indexOf(item))}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => run(item)}
                      className={cn(
                        'flex cursor-pointer items-center justify-between gap-4 rounded-[6px] px-3 py-2.5 text-[0.95rem]',
                        selected ? 'bg-ink text-ivory' : 'text-ink-2',
                      )}
                    >
                      <span className="min-w-0 truncate">{item.label}</span>
                      {item.hint && (
                        <span
                          className={cn('t-label shrink-0 text-[9.5px]', selected ? 'text-ivory/70' : 'text-muted')}
                        >
                          {item.hint}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
          {flat.length === 0 && (
            <li className="px-3 py-8 text-center text-[0.95rem] text-muted">Nothing matches “{query}”.</li>
          )}
        </ul>
        <p className="sr-only" aria-live="polite">
          {query ? `${flat.length} ${flat.length === 1 ? 'result' : 'results'}` : ''}
        </p>
        <div
          className="t-label flex gap-5 border-t border-[var(--line)] px-5 py-2.5 text-[9.5px] text-muted"
          aria-hidden="true"
        >
          <span>↑↓ move</span>
          <span>↵ open</span>
          <span>Esc close</span>
          <span className="ml-auto hidden sm:inline">D lab mode</span>
        </div>
      </div>
    </div>
  );
}
