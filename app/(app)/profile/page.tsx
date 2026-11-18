'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Lock } from 'lucide-react';
import { Button, PageHeader } from '@/components/ui';
import { initials, PERMISSION_ROLE, type Profile, WORKSPACE } from '@/lib/account';
import { useDemo } from '@/lib/store';
import { cn } from '@/lib/utils';

const FIELDS: { key: keyof Profile; label: string; hint?: string; required?: boolean }[] = [
  { key: 'fullName', label: 'Full name', required: true },
  { key: 'preferredName', label: 'Preferred name', hint: 'Used in greetings and messages. Leave blank to use your first name.' },
  { key: 'jobTitle', label: 'Job title', hint: 'Shown to colleagues. Changing it does not change what you can approve.' },
];

export default function ProfilePage() {
  const saved = useDemo((s) => s.profile);
  const updateProfile = useDemo((s) => s.updateProfile);
  const [form, setForm] = useState<Profile>(saved);
  const [touched, setTouched] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  const dirty = (Object.keys(form) as (keyof Profile)[]).some((k) => form[k].trim() !== saved[k]);
  const nameError = !form.fullName.trim() ? 'Enter your full name.' : '';

  useEffect(() => {
    if (!confirm) return;
    const t = setTimeout(() => setConfirm(false), 4000);
    return () => clearTimeout(t);
  }, [confirm]);

  const onSave = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (nameError || !dirty) return;
    updateProfile(form);
    setForm({ fullName: form.fullName.trim(), preferredName: form.preferredName.trim(), jobTitle: form.jobTitle.trim() });
    setTouched(false);
    setConfirm(true);
    statusRef.current?.focus();
  };
  const onCancel = () => {
    setForm(saved);
    setTouched(false);
  };

  return (
    <>
      <PageHeader title="My profile" subtitle="How you appear across Cost of Yes. Access and approval rights are managed by your workspace admin." />
      <div className="grid gap-6 lg:grid-cols-12">
        <form onSubmit={onSave} noValidate className="rounded-lg border border-line bg-white lg:col-span-8">
          <div className="flex items-center gap-4 border-b border-line px-6 py-5">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-900 text-[20px] font-semibold text-white" aria-hidden>
              {initials(form.fullName || saved.fullName)}
            </span>
            <div className="min-w-0">
              <div className="truncate text-[18px] font-semibold text-ink">{saved.fullName}</div>
              <div className="text-[13px] text-muted">{saved.jobTitle} · {WORKSPACE.name}</div>
            </div>
          </div>

          <div className="space-y-5 px-6 py-5">
            {FIELDS.map((f) => {
              const error = f.key === 'fullName' && touched ? nameError : '';
              return (
                <div key={f.key} className="grid gap-1.5 sm:grid-cols-[180px_1fr] sm:items-start sm:gap-4">
                  <label htmlFor={`f-${f.key}`} className="pt-2 text-[14px] font-medium text-ink">
                    {f.label}
                    {f.required && <span className="text-danger" aria-hidden> *</span>}
                  </label>
                  <div>
                    <input
                      id={`f-${f.key}`}
                      value={form[f.key]}
                      required={f.required}
                      aria-invalid={!!error}
                      aria-describedby={error ? `e-${f.key}` : f.hint ? `h-${f.key}` : undefined}
                      maxLength={80}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      onBlur={() => f.key === 'fullName' && setTouched(true)}
                      className={cn(
                        'h-10 w-full max-w-md rounded-md border bg-white px-3 text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-teal-900/25',
                        error ? 'border-danger' : 'border-line focus:border-teal-900',
                      )}
                    />
                    {error ? (
                      <p id={`e-${f.key}`} className="mt-1 text-[13px] text-danger">{error}</p>
                    ) : (
                      f.hint && <p id={`h-${f.key}`} className="mt-1 text-[13px] text-muted">{f.hint}</p>
                    )}
                  </div>
                </div>
              );
            })}

            <div className="border-t border-line pt-5">
              {[
                { label: 'Workspace', value: `${WORKSPACE.name} · ${WORKSPACE.team}` },
                { label: 'Permission role', value: PERMISSION_ROLE },
              ].map((r) => (
                <div key={r.label} className="grid gap-1 py-1.5 sm:grid-cols-[180px_1fr] sm:gap-4">
                  <div className="flex items-center gap-1.5 text-[14px] font-medium text-ink">
                    {r.label} <Lock className="h-3.5 w-3.5 text-muted" aria-label="Read-only" />
                  </div>
                  <div className="text-[14px] text-ink">{r.value}</div>
                </div>
              ))}
              <p className="mt-2 text-[13px] text-muted sm:ml-[196px]">Your workspace admin manages access. Editing your profile never changes permissions.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-4">
            <div ref={statusRef} tabIndex={-1} role="status" aria-live="polite" className="text-[14px] outline-none">
              {confirm && (
                <span className="inline-flex items-center gap-1.5 text-positive">
                  <CheckCircle2 className="h-4 w-4" /> Profile updated
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onCancel} disabled={!dirty}>Cancel</Button>
              <Button type="submit" disabled={!dirty}>Save changes</Button>
            </div>
          </div>
        </form>

        <aside className="rounded-lg border border-line bg-white p-5 lg:col-span-4">
          <h2 className="text-[16px] font-semibold text-ink">Workspace data access</h2>
          <p className="mt-1 text-[14px] text-muted">Which records Cost of Yes can read and whether estimates use peer benchmarks are workspace settings, separate from your profile.</p>
          <Link href="/workspace" className="mt-3 inline-flex text-[14px] font-medium text-teal-900 hover:underline">Open workspace data access</Link>
        </aside>
      </div>
    </>
  );
}
