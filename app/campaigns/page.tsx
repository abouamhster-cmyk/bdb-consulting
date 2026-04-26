'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface Campaign {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  config: any;
  created_at: string;
  updated_at: string;
}

export default function CampaignsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: '', description: '' });

  useEffect(() => {
    if (user) {
      loadCampaigns();
    }
  }, [user]);

  const loadCampaigns = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    
    if (data) setCampaigns(data);
    setLoading(false);
  };

  const createCampaign = async () => {
    if (!newCampaign.name) {
      toast.error('Veuillez donner un nom à la campagne');
      return;
    }

    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        user_id: user?.id,
        name: newCampaign.name,
        description: newCampaign.description,
        status: 'draft',
        config: {}
      })
      .select()
      .single();

    if (error) {
      toast.error('Erreur: ' + error.message);
    } else {
      toast.success('Campagne créée');
      setShowCreateModal(false);
      setNewCampaign({ name: '', description: '' });
      loadCampaigns();
    }
  };

  const deleteCampaign = async (id: string) => {
    if (!confirm('Supprimer cette campagne ? Tous les posts associés seront supprimés.')) return;

    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erreur: ' + error.message);
    } else {
      toast.success('Campagne supprimée');
      loadCampaigns();
    }
  };

  const duplicateCampaign = async (campaign: Campaign) => {
    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        user_id: user?.id,
        name: `${campaign.name} (copie)`,
        description: campaign.description,
        status: 'draft',
        config: campaign.config
      })
      .select()
      .single();

    if (error) {
      toast.error('Erreur: ' + error.message);
    } else {
      toast.success('Campagne dupliquée');
      loadCampaigns();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft': return <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">Brouillon</span>;
      case 'active': return <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">Active</span>;
      case 'completed': return <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">Terminée</span>;
      case 'archived': return <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">Archivée</span>;
      default: return null;
    }
  };

  if (loading) {
    return <div className="text-center py-12">Chargement...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📁 Mes campagnes</h1>
          <p className="text-gray-500">Gérez vos campagnes marketing</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <span>+</span> Nouvelle campagne
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500 mb-4">Aucune campagne pour le moment</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Créer votre première campagne
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-lg font-semibold text-gray-900">{campaign.name}</h2>
                    {getStatusBadge(campaign.status)}
                  </div>
                  {campaign.description && (
                    <p className="text-sm text-gray-500 mb-3">{campaign.description}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    Créée le {new Date(campaign.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/campaign-vertical?campaignId=${campaign.id}`)}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Ouvrir
                  </button>
                  <button
                    onClick={() => duplicateCampaign(campaign)}
                    className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    title="Dupliquer"
                  >
                    📋
                  </button>
                  <button
                    onClick={() => deleteCampaign(campaign.id)}
                    className="px-3 py-1.5 text-sm bg-gray-100 text-red-600 rounded-lg hover:bg-red-50"
                    title="Supprimer"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal création campagne */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Nouvelle campagne</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input
                  type="text"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2"
                  placeholder="Campagne été 2026"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optionnel)</label>
                <textarea
                  value={newCampaign.description}
                  onChange={(e) => setNewCampaign({...newCampaign, description: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="Objectifs de cette campagne..."
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={createCampaign} className="flex-1 bg-blue-600 text-white py-2 rounded-lg">
                Créer
              </button>
              <button onClick={() => setShowCreateModal(false)} className="flex-1 bg-gray-200 py-2 rounded-lg">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}