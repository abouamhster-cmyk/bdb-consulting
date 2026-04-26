'use client';

import ContentWizard from '../components/ContentWizard';
import { useAuth } from '../context/AuthContext';

export default function CreatePage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Veuillez vous connecter</p>
        <a href="/login" className="text-blue-600 hover:underline">Se connecter →</a>
      </div>
    );
  }

  return <ContentWizard />;
}
