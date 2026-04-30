import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import DashboardLayout from './components/DashboardLayout';
import { AuthProvider } from './context/AuthContext';
import ToasterProvider from './components/ToasterProvider';
import CookieBanner from './components/CookieBanner';
import RouteGuard from './components/RouteGuard';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BDB Consulting - Marketing Intelligence',
  description: 'Plateforme marketing IA professionnelle',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <AuthProvider>
          <ToasterProvider />
          // <RouteGuard>
            <DashboardLayout>
              {children}
            </DashboardLayout>
          // </RouteGuard>
          <CookieBanner />
        </AuthProvider>
      </body>
    </html>
  );
}
