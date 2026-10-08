import { useCallback, useEffect, useState } from 'react';
import { deleteMessage, loadMessages, setMessageStatus, type Message, type MessageStatus } from '../data';
import { Badge, Button } from '../ui';
import { cn } from '@/lib/cn';
import { PageHeader } from './common';

/** Tells the studio's sidebar to refresh its unread count. */
export const MESSAGES_CHANGED = 'admin:messages-changed';
const changed = () => window.dispatchEvent(new Event(MESSAGES_CHANGED));

const when = (d: Date | null) =>
  d
    ? d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

/**
 * Messages from the contact form, newest first. Mark as read, reply by email,
 * move to spam, or delete. (Email alerts for new messages need Cloud Functions,
 * i.e. the Blaze plan; until then the sidebar shows the unread count.)
 */
export default function MessagesPage() {
  const [items, setItems] = useState<Message[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [box, setBox] = useState<'inbox' | 'spam'>('inbox');
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(() => {
    loadMessages().then(setItems, (e: Error) => setError(e.message));
  }, []);
  useEffect(refresh, [refresh]);

  const act = async (m: Message, fn: () => Promise<void>, next?: MessageStatus | 'deleted') => {
    setBusy(m.id);
    setError(null);
    try {
      await fn();
      setItems((list) =>
        (list ?? []).flatMap((x) =>
          x.id !== m.id ? [x] : next === 'deleted' ? [] : [{ ...x, status: next ?? x.status }],
        ),
      );
      changed();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const shown = (items ?? []).filter((m) => (box === 'spam' ? m.status === 'spam' : m.status !== 'spam'));
  const unread = (items ?? []).filter((m) => m.status === 'new').length;
  const spam = (items ?? []).filter((m) => m.status === 'spam').length;

  return (
    <>
      <PageHeader
        title="Messages"
        description="From the contact form on the site. Visitors can send but never read them; only admins see this list."
      />
      <div role="group" aria-label="Folder" className="mb-6 flex gap-2">
        {(['inbox', 'spam'] as const).map((b) => (
          <button
            key={b}
            type="button"
            aria-pressed={box === b}
            onClick={() => setBox(b)}
            className={cn(
              't-label rounded-full border px-3.5 py-1.5 text-[10px]',
              box === b ? 'border-ink bg-ink text-ivory' : 'border-[var(--line-strong)] text-ink-2',
            )}
          >
            {b === 'inbox' ? `Inbox${unread ? ` · ${unread} new` : ''}` : `Spam${spam ? ` · ${spam}` : ''}`}
          </button>
        ))}
      </div>

      {error && (
        <p className="mb-4 text-[0.9rem] text-[#8f1d17]" role="alert">
          {error}
        </p>
      )}
      {!items && !error && <p className="t-label text-muted">Loading…</p>}
      {items && shown.length === 0 && (
        <p className="text-[0.95rem] text-ink-2">
          {box === 'spam' ? 'Nothing in spam.' : 'No messages yet. They appear here as soon as someone uses the form.'}
        </p>
      )}

      <ul className="grid gap-4">
        {shown.map((m) => (
          <li
            key={m.id}
            className={cn('border bg-ivory p-5', m.status === 'new' ? 'border-ink' : 'border-[var(--line)]')}
            aria-label={`Message from ${m.name}`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="flex flex-wrap items-center gap-2">
                <span className="text-[1.05rem] font-medium">{m.name}</span>
                <a href={`mailto:${m.email}`} className="text-[0.9rem] text-muted underline">
                  {m.email}
                </a>
                {m.status === 'new' && <Badge tone="warn">New</Badge>}
              </p>
              <p className="t-label text-[10px] text-muted">
                {when(m.createdAt)}
                {m.page && m.page !== '/' && ` · from ${m.page}`}
              </p>
            </div>
            <p className="mt-3 whitespace-pre-wrap break-words text-[0.95rem] leading-relaxed text-ink-2">
              {m.message}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={`mailto:${m.email}?subject=${encodeURIComponent('Re: your message on my portfolio')}`}
                onClick={() => m.status === 'new' && void act(m, () => setMessageStatus(m.id, 'read'), 'read')}
                className="t-label inline-flex h-9 items-center rounded-full bg-ink px-4 text-[10px] text-ivory hover:bg-ink-2"
              >
                Reply by email
              </a>
              {m.status !== 'spam' && (
                <Button
                  variant="ghost"
                  disabled={busy === m.id}
                  onClick={() =>
                    void act(
                      m,
                      () => setMessageStatus(m.id, m.status === 'new' ? 'read' : 'new'),
                      m.status === 'new' ? 'read' : 'new',
                    )
                  }
                >
                  {m.status === 'new' ? 'Mark as read' : 'Mark as unread'}
                </Button>
              )}
              <Button
                variant="ghost"
                disabled={busy === m.id}
                onClick={() =>
                  void act(
                    m,
                    () => setMessageStatus(m.id, m.status === 'spam' ? 'read' : 'spam'),
                    m.status === 'spam' ? 'read' : 'spam',
                  )
                }
              >
                {m.status === 'spam' ? 'Not spam' : 'Spam'}
              </Button>
              <Button
                variant="danger"
                disabled={busy === m.id}
                onClick={() =>
                  window.confirm(`Delete the message from ${m.name}? This can't be undone.`) &&
                  void act(m, () => deleteMessage(m.id), 'deleted')
                }
              >
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
