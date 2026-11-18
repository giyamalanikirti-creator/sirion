import { DemoGuide } from '@/components/shell/DemoGuide';
import { HydrationGate } from '@/components/shell/Providers';
import { Sidebar } from '@/components/shell/Sidebar';
import { SignInGate } from '@/components/shell/SignInGate';
import { TopBar } from '@/components/shell/TopBar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-page-bg">
      <HydrationGate>
        <SignInGate>
          <TopBar />
          <div className="flex">
            <Sidebar />
            <main className="min-w-0 flex-1 px-4 pb-24 pt-6 md:px-6 md:pb-10">
              <div className="mx-auto max-w-[1400px]">{children}</div>
            </main>
          </div>
          <DemoGuide />
        </SignInGate>
      </HydrationGate>
    </div>
  );
}
