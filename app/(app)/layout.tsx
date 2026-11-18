import { DemoGuide } from '@/components/shell/DemoGuide';
import { HydrationGate } from '@/components/shell/Providers';
import { SignInGate } from '@/components/shell/SignInGate';
import { Sidebar } from '@/components/shell/Sidebar';
import { TopBar } from '@/components/shell/TopBar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white md:pl-16">
      <Sidebar />
      <TopBar />
      <main className="min-h-[calc(100vh-4rem)] bg-page-bg px-4 pb-24 pt-6 md:rounded-tl-[28px] md:px-8 md:pb-10">
        <HydrationGate>
          <SignInGate>{children}</SignInGate>
        </HydrationGate>
      </main>
      <DemoGuide />
    </div>
  );
}
