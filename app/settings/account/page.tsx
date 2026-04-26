'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function AccountPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const updatePassword = async () => {
    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    
    if (password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    
    setLoading(true);
    
    const { error } = await supabase.auth.updateUser({ password });
    
    if (error) {
      toast.error('Erreur: ' + error.message);
    } else {
      toast.success('Mot de passe mis à jour');
      setPassword('');
      setConfirmPassword('');
    }
    
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-2">Mon compte</h1>
      <p className="text-muted-foreground mb-8">Gérez vos informations personnelles</p>

      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Informations</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Email</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="input bg-secondary text-secondary-foreground"
            />
            <p className="text-xs text-muted-foreground mt-1">L'email ne peut pas être modifié</p>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Changer le mot de passe</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Nouveau mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Confirmer le mot de passe</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
            />
          </div>
          <button
            onClick={updatePassword}
            disabled={loading}
            className="btn-primary disabled:opacity-50"
          >
            {loading ? 'Mise à jour...' : 'Mettre à jour'}
          </button>
        </div>
      </div>
    </div>
  );
}