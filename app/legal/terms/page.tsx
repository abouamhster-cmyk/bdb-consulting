'use client';

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Conditions générales d'utilisation</h1>
      <p className="text-gray-500 mb-8">Dernière mise à jour : {new Date().toLocaleDateString()}</p>
      
      <div className="space-y-6 text-gray-700">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Acceptation des conditions</h2>
          <p>En utilisant BDB Consulting, vous acceptez pleinement les présentes conditions générales.</p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Description du service</h2>
          <p>BDB Consulting est une plateforme SaaS de génération de contenu marketing par IA. Nous fournissons des outils de veille concurrentielle, génération de calendrier, production de textes, images et vidéos.</p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Responsabilités</h2>
          <p>L'utilisateur est responsable du contenu qu'il génère et publie. Nous ne sommes pas responsables de l'utilisation faite des contenus générés.</p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Propriété intellectuelle</h2>
          <p>Les contenus générés par l'IA vous appartiennent. Notre code et notre interface sont notre propriété intellectuelle.</p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Résiliation</h2>
          <p>Vous pouvez résilier votre compte à tout moment. Nous nous réservons le droit de suspendre un compte en cas de violation des conditions.</p>
        </section>
      </div>
    </div>
  );
}