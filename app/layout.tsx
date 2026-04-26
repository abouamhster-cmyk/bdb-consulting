import type { Metadata } from 'next';
import './globals.css';
import DashboardLayout from './components/DashboardLayout';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ToasterProvider from './components/ToasterProvider';
import CookieBanner from './components/CookieBanner';

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
      <body>
           <AuthProvider>
            <ToasterProvider />
            <DashboardLayout>
              {children}
            </DashboardLayout>
            <CookieBanner />
          </AuthProvider>
       </body>
    </html>
  );
}