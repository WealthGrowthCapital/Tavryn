import type { Metadata } from 'next';
import './globals.css';
import { SiteHeader } from '@/components/site-header';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tavryn.forum';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Tavryn — Find useful things',
    template: '%s — Tavryn',
  },
  description: 'Search useful tools, answers, and community knowledge in one place.',
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
