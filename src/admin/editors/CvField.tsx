import { useEffect, useState } from 'react';
import { loadCvInfo, removeCv, uploadCv, type CvInfo } from '../data';
import { slugify } from '../useEditors';
import { Button, Field, TextInput } from '../ui';

/**
 * The CV: upload a PDF (stored in Firestore, published at /cv/<name> by the next
 * build) or paste a link to one. Changes the profile's `cvUrl`; the profile's
 * Save button applies it.
 */
export function CvField({
  ownerName,
  value,
  onChange,
}: {
  ownerName: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const [info, setInfo] = useState<CvInfo | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const uploaded = value.startsWith('/cv/');

  useEffect(() => {
    loadCvInfo().then(setInfo, (e: Error) => setError(e.message));
  }, []);

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const url = await uploadCv(file, `${slugify(ownerName) || 'cv'}-cv.pdf`);
      setInfo(await loadCvInfo());
      onChange(url);
      setNote('Uploaded. Save the profile, then publish — the CV goes live with the next build.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Remove the uploaded CV? Visitors will no longer see the Download CV button.')) return;
    setBusy(true);
    setError(null);
    try {
      await removeCv();
      setInfo(null);
      if (uploaded) onChange('');
      setNote('Removed. Save the profile to apply.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4">
      <Field
        label="CV (PDF)"
        hint={busy ? 'Working…' : (error ?? note ?? 'PDF up to 700 KB. Shown as “Download CV” across the site.')}
      >
        {(id) => (
          <div className="grid gap-3">
            {info && (
              <p className="text-[0.92rem] text-ink-2">
                <span className="font-mono text-[0.85rem]">{info.name}</span> · {Math.round(info.size / 1024)} KB
                {info.uploadedAt && ` · uploaded ${info.uploadedAt.toLocaleDateString('en-GB')}`}
                {!uploaded && ' · not in use (the profile links elsewhere)'}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <input
                id={id}
                type="file"
                accept="application/pdf"
                disabled={busy}
                className="text-[0.85rem] file:mr-3 file:rounded-full file:border file:border-[var(--line-strong)] file:bg-transparent file:px-3 file:py-1.5 file:text-[0.8rem]"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) void upload(file);
                }}
              />
              {info && (
                <Button variant="danger" onClick={() => void remove()} disabled={busy}>
                  Remove uploaded CV
                </Button>
              )}
            </div>
          </div>
        )}
      </Field>
      <Field label="…or a link to your CV" hint="e.g. a Google Drive or LinkedIn link. Leave empty to use the upload.">
        {(id) => (
          <TextInput
            id={id}
            type="url"
            value={uploaded ? '' : value}
            placeholder="https://"
            onChange={(v) => onChange(v.trim() ? v.trim() : info ? `/cv/${info.name}` : '')}
          />
        )}
      </Field>
    </div>
  );
}
