import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/shell/Providers';
import './globals.css';

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Cost of Yes · negotiation prototype',
  description: 'Prices every money line in a supplier redline before you say yes. Concept prototype; all data fictional.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
