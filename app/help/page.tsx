'use client';

import { useState } from 'react';

const faqItems = [
  {
    question: "Comment configurer mon entreprise ?",
    answer: "Rendez-vous dans la section 'Configuration' (icône ⚙️). Remplissez les 7 étapes. Vous pouvez aussi importer un document PDF/DOCX, l'IA préremplira automatiquement les champs."
  },
  {
    question: "Comment générer mon premier calendrier ?",
    answer: "Après avoir configuré votre entreprise et vos paramètres, allez dans 'Squelette' → 'Générer le squelette'. L'IA créera un planning personnalisé."
  },
  {
    question: "Comment modifier un post après génération ?",
    answer: "Dans 'Textes', 'Images' ou 'Vidéos', cliquez sur '✏️ Modifier' sur le bloc concerné. Modifiez le contenu et sauvegardez."
  },
  {
    question: "Comment programmer sur les réseaux sociaux ?",
    answer: "1. Configurez votre clé API Buffer dans 'Paramètres' → 'Intégrations'. 2. Allez dans 'Programmation'. 3. Sélectionnez vos plateformes. 4. Cliquez sur 'Programmer'."
  },
  {
    question: "Que faire en cas d'erreur ?",
    answer: "Vérifiez vos clés API dans .env.local. Consultez les logs dans le terminal. Contactez-nous à support@bdb-consulting.com."
  },
  {
    question: "Comment exporter mes données ?",
    answer: "Dans 'Programmation', cliquez sur 'Exporter en PDF' pour générer un rapport complet de votre campagne."
  }
];

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">Centre d'aide</h1>
        <p className="text-muted-foreground">Tout ce que vous devez savoir pour utiliser la plateforme</p>
      </div>

      {/* Support rapide */}
      <div className="bg-gradient-to-r from-primary to-purple-600 rounded-2xl p-6 text-white mb-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold mb-1">Besoin d'aide immédiate ?</h2>
            <p className="text-blue-100">Notre équipe vous répond sous 24h</p>
          </div>
          <a
            href="mailto:support@bdb-consulting.com"
            className="bg-white text-primary px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-all"
          >
            📧 Contacter le support
          </a>
        </div>
      </div>

      {/* Tutoriel pas à pas */}
      <div className="card p-6 mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-4">📚 Tutoriel pas à pas</h2>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-bold">1</span>
            </div>
            <div>
              <h3 className="font-medium text-foreground">Configurez votre entreprise</h3>
              <p className="text-sm text-muted-foreground">Allez dans Configuration → remplissez les 7 étapes ou importez un document</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-bold">2</span>
            </div>
            <div>
              <h3 className="font-medium text-foreground">Définissez vos paramètres</h3>
              <p className="text-sm text-muted-foreground">Choisissez le nombre de posts, la période et les objectifs</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-bold">3</span>
            </div>
            <div>
              <h3 className="font-medium text-foreground">Analysez la concurrence</h3>
              <p className="text-sm text-muted-foreground">Ajoutez des sources et lancez l'analyse IA</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-bold">4</span>
            </div>
            <div>
              <h3 className="font-medium text-foreground">Générez votre contenu</h3>
              <p className="text-sm text-muted-foreground">Suivez le workflow : Squelette → Textes → Images → Vidéos</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-bold">5</span>
            </div>
            <div>
              <h3 className="font-medium text-foreground">Programmez et publiez</h3>
              <p className="text-sm text-muted-foreground">Connectez Buffer et programmez vos posts</p>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="card p-6 mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-4">❓ Foire aux questions</h2>
        <div className="space-y-3">
          {faqItems.map((item, idx) => (
            <div key={idx} className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full text-left px-4 py-3 bg-secondary hover:bg-secondary/80 transition-colors flex justify-between items-center"
              >
                <span className="font-medium text-foreground">{item.question}</span>
                <span className="text-muted-foreground">{openFaq === idx ? '▲' : '▼'}</span>
              </button>
              {openFaq === idx && (
                <div className="px-4 py-3 text-muted-foreground text-sm border-t border-border">
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Liens utiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a href="/legal/privacy" className="card p-4 text-center hover:shadow-md transition-all">
          <span className="text-2xl block mb-1">🔒</span>
          <span className="text-sm text-foreground">Politique de confidentialité</span>
        </a>
        <a href="/legal/terms" className="card p-4 text-center hover:shadow-md transition-all">
          <span className="text-2xl block mb-1">📜</span>
          <span className="text-sm text-foreground">Conditions générales</span>
        </a>
        <a href="mailto:support@bdb-consulting.com" className="card p-4 text-center hover:shadow-md transition-all">
          <span className="text-2xl block mb-1">✉️</span>
          <span className="text-sm text-foreground">Nous contacter</span>
        </a>
      </div>
    </div>
  );
}