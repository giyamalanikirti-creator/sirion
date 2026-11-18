import { HydrationGate } from '@/components/shell/Providers';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7f8f8]">
      <HydrationGate>{children}</HydrationGate>
    </div>
  );
}
