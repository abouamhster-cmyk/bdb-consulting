'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function TeamPage() {
  const { user } = useAuth();
  const [team, setTeam] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadTeam();
  }, [user]);

  const loadTeam = async () => {
    const { data: teamData } = await supabase
      .from('teams')
      .select('*')
      .eq('owner_id', user?.id)
      .single();
    
    if (teamData) {
      setTeam(teamData);
      const { data: membersData } = await supabase
        .from('team_members')
        .select('*, auth.users(email)')
        .eq('team_id', teamData.id);
      setMembers(membersData || []);
    }
    setLoading(false);
  };

  const createTeam = async () => {
    const { data, error } = await supabase
      .from('teams')
      .insert({ name: `Équipe de ${user?.email?.split('@')[0]}`, owner_id: user?.id })
      .select()
      .single();
    
    if (error) {
      toast.error('Erreur: ' + error.message);
    } else {
      setTeam(data);
      toast.success('Équipe créée');
    }
  };

  const inviteMember = async () => {
    if (!inviteEmail) return;
    
    const { error } = await supabase
      .from('team_members')
      .insert({ team_id: team.id, user_id: inviteEmail, role: 'viewer' });
    
    if (error) {
      toast.error('Erreur: ' + error.message);
    } else {
      toast.success('Invitation envoyée');
      setInviteEmail('');
      loadTeam();
    }
  };

  const updateRole = async (memberId: string, role: string) => {
    const { error } = await supabase
      .from('team_members')
      .update({ role })
      .eq('id', memberId);
    
    if (error) {
      toast.error('Erreur: ' + error.message);
    } else {
      toast.success('Rôle mis à jour');
      loadTeam();
    }
  };

  const removeMember = async (memberId: string) => {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', memberId);
    
    if (error) {
      toast.error('Erreur: ' + error.message);
    } else {
      toast.success('Membre retiré');
      loadTeam();
    }
  };

  if (loading) return <div className="text-center py-12">Chargement...</div>;

  if (!team) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="card p-12">
          <p className="text-muted-foreground mb-4">Vous n'avez pas encore d'équipe</p>
          <button
            onClick={createTeam}
            className="btn-primary"
          >
            Créer une équipe
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-2">Gestion d'équipe</h1>
      <p className="text-muted-foreground mb-8">{team.name}</p>

      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Inviter un membre</h2>
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="Email du collaborateur"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="flex-1 input"
          />
          <button
            onClick={inviteMember}
            className="btn-primary"
          >
            Inviter
          </button>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Membres ({members.length})</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-secondary rounded-lg">
            <div>
              <p className="font-medium text-foreground">{user?.email}</p>
              <p className="text-xs text-muted-foreground">Propriétaire</p>
            </div>
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">admin</span>
          </div>

          {members.map((member) => (
            <div key={member.id} className="flex justify-between items-center p-3 bg-secondary rounded-lg">
              <div>
                <p className="font-medium text-foreground">{member.user_id}</p>
                <p className="text-xs text-muted-foreground">Invité le {new Date(member.invited_at).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-2">
                <select
                  value={member.role}
                  onChange={(e) => updateRole(member.id, e.target.value)}
                  className="text-sm border border-border rounded-lg px-2 py-1 bg-background text-foreground"
                >
                  <option value="viewer">Visualisateur</option>
                  <option value="editor">Éditeur</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  onClick={() => removeMember(member.id)}
                  className="text-red-500 text-sm hover:underline"
                >
                  Retirer
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}