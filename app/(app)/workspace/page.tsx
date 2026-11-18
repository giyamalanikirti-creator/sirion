'use client';

import { DataUsePanel } from '@/components/dashboard/DataUsePanel';
import { PageHeader } from '@/components/ui';
import { WORKSPACE } from '@/lib/account';

export default function WorkspacePage() {
  return (
    <>
      <PageHeader
        eyebrow={`${WORKSPACE.name} · ${WORKSPACE.team}`}
        title="Workspace data access"
        subtitle="What Cost of Yes may read to estimate costs, and how it uses aggregate peer benchmarks. These are workspace settings, separate from anyone’s profile."
      />
      <div className="max-w-2xl">
        <DataUsePanel />
      </div>
    </>
  );
}
