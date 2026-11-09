import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CHTR // C-Suite Infidelity & Governance Terminal (2021–2026)',
  description:
    'Bloomberg-style financial terminal tracking corporate executive relationship scandals, Unfaithfulness Scores, T-30 to T+90 stock alpha, clawbacks, and SEC governance correlations.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased selection:bg-amber-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
