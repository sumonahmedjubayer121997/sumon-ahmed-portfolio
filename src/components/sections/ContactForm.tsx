import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { site } from '@/content';
import { contactAvailable, markSent, prepareContact, recentlySent } from '@/lib/contact';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { cn } from '@/lib/cn';

type Field = 'name' | 'email' | 'message';
type Status = 'idle' | 'sending' | 'sent' | 'failed' | 'too-soon';

const MIN_FILL_MS = 3000;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const LINKS = /https?:\/\//g;

function validate(v: Record<Field, string>): Partial<Record<Field, string>> {
  const e: Partial<Record<Field, string>> = {};
  if (!v.name.trim()) e.name = 'Tell me your name.';
  else if (v.name.trim().length > 80) e.name = 'That name is longer than 80 characters.';
  if (!EMAIL.test(v.email.trim())) e.email = 'Enter an email address I can reply to.';
  const m = v.message.trim();
  if (m.length < 10) e.message = 'Write at least a sentence (10 characters).';
  else if (m.length > 4000) e.message = `Keep it under 4,000 characters (now ${m.length.toLocaleString('en-GB')}).`;
  else if ((m.match(LINKS) ?? []).length > 3) e.message = 'Please include at most three links.';
  return e;
}

const inputClass =
  'w-full border-0 border-b border-[var(--line-strong)] bg-transparent px-0 py-3 text-[1.05rem] text-bone outline-none transition-colors placeholder:text-ash/70 focus:border-accent aria-[invalid=true]:border-accent';

/**
 * Contact form. Messages are written to Firestore (create-only for visitors,
 * see firestore.rules) and read in /admin → Messages. Spam checks: a hidden
 * honeypot field, a minimum time on the form, length/email/link limits — all
 * enforced again by the rules — and one message per browser per minute.
 */
export function ContactForm({ className }: { className?: string }) {
  const id = useId();
  const [values, setValues] = useState<Record<Field, string>>({ name: '', email: '', message: '' });
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [status, setStatus] = useState<Status>('idle');
  const startedAt = useRef<number | null>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const fieldRefs = useRef<Partial<Record<Field, HTMLInputElement | HTMLTextAreaElement | null>>>({});

  // Move focus to the confirmation once it has rendered, so screen readers announce it.
  useEffect(() => {
    if (status === 'sent') doneRef.current?.focus();
  }, [status]);

  if (!contactAvailable) return null;

  const begin = () => {
    startedAt.current ??= Date.now();
    void prepareContact().catch(() => undefined); // warm the SDK while they type
  };

  const set = (f: Field) => (v: string) => {
    begin();
    setValues((s) => ({ ...s, [f]: v }));
    if (errors[f]) setErrors((e) => ({ ...e, [f]: undefined }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (status === 'sending') return;
    const problems = validate(values);
    setErrors(problems);
    const first = (['name', 'email', 'message'] as Field[]).find((f) => problems[f]);
    if (first) {
      fieldRefs.current[first]?.focus();
      return;
    }
    if (recentlySent()) {
      setStatus('too-soon');
      return;
    }
    setStatus('sending');
    try {
      const send = await prepareContact();
      // People who paste and send at once wait out the remaining seconds instead of being refused.
      const elapsed = Date.now() - (startedAt.current ?? Date.now());
      if (elapsed < MIN_FILL_MS) await new Promise((r) => setTimeout(r, MIN_FILL_MS - elapsed));
      await send({
        name: values.name.trim(),
        email: values.email.trim(),
        message: values.message.trim(),
        website: honeypot,
        fillMs: Math.round(Date.now() - (startedAt.current ?? Date.now())),
        page: location.pathname,
      });
      markSent();
      setStatus('sent');
    } catch {
      setStatus('failed');
    }
  };

  if (status === 'sent') {
    return (
      <div ref={doneRef} tabIndex={-1} className={cn('outline-none', className)} role="status">
        <p className="t-label text-accent">Message sent</p>
        <p className="mt-4 max-w-[40ch] text-[1.4rem] leading-snug tracking-[-0.02em]">
          Thanks, {values.name.trim().split(/\s+/)[0]} — it’s with me. I reply within two working days, to{' '}
          {values.email.trim()}.
        </p>
        <button
          type="button"
          onClick={() => {
            setValues({ name: values.name, email: values.email, message: '' });
            setStatus('idle');
            startedAt.current = null;
          }}
          className="t-label link-draw mt-8 text-ash hover:text-bone"
        >
          Write another message
        </button>
      </div>
    );
  }

  const field = (f: Field, label: string, input: (props: Record<string, unknown>) => ReactNode) => (
    <div className="grid gap-1">
      <label htmlFor={`${id}-${f}`} className="t-label text-ash">
        {label}
      </label>
      {input({
        id: `${id}-${f}`,
        name: f,
        value: values[f],
        onFocus: begin,
        'aria-invalid': !!errors[f] || undefined,
        'aria-describedby': errors[f] ? `${id}-${f}-error` : undefined,
        ref: (el: HTMLInputElement | HTMLTextAreaElement | null) => {
          fieldRefs.current[f] = el;
        },
      })}
      {errors[f] && (
        <p id={`${id}-${f}-error`} className="text-[0.85rem] text-accent">
          {errors[f]}
        </p>
      )}
    </div>
  );

  return (
    <form
      noValidate
      onSubmit={(e) => void submit(e)}
      className={cn('grid gap-7', className)}
      aria-label="Send a message"
    >
      <div className="grid gap-7 sm:grid-cols-2">
        {field('name', 'Name', (p) => (
          <input
            {...p}
            type="text"
            autoComplete="name"
            maxLength={80}
            onChange={(e) => set('name')(e.target.value)}
            className={inputClass}
          />
        ))}
        {field('email', 'Email', (p) => (
          <input
            {...p}
            type="email"
            autoComplete="email"
            inputMode="email"
            maxLength={200}
            onChange={(e) => set('email')(e.target.value)}
            className={inputClass}
          />
        ))}
      </div>
      {field('message', 'Message', (p) => (
        <textarea
          {...p}
          rows={5}
          maxLength={4000}
          onChange={(e) => set('message')(e.target.value)}
          className={cn(inputClass, 'resize-y leading-relaxed')}
          placeholder="A dataset, a model, a role, a hard question…"
        />
      ))}

      {/* Honeypot: invisible to people (and screen readers); bots that fill every field give themselves away. */}
      <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
        <label>
          Website
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <MagneticButton type="submit" variant="solid" arrow="right" cursor="Send">
          {status === 'sending' ? 'Sending…' : 'Send message'}
        </MagneticButton>
        <p className="t-label text-[10px] text-ash" aria-live="polite">
          {status === 'too-soon'
            ? 'Your last message just went through — please wait a minute before sending another.'
            : status === 'failed'
              ? ''
              : 'Goes straight to me. No newsletter, no tracking.'}
        </p>
      </div>
      {status === 'failed' && (
        <p role="alert" className="text-[0.95rem] text-bone">
          Sorry — that didn’t send. Please email me instead at{' '}
          <a href={`mailto:${site.email}`} className="link-draw text-accent">
            {site.email}
          </a>
          .
        </p>
      )}
    </form>
  );
}
