'use client';

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Politique de confidentialité</h1>
      <p className="text-gray-500 mb-8">Dernière mise à jour : {new Date().toLocaleDateString()}</p>
      
      <div className="space-y-6 text-gray-700">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Collecte des informations</h2>
          <p>Nous collectons les informations que vous nous fournissez directement, notamment lorsque vous créez un compte, configurez votre stratégie marketing ou utilisez nos services d'IA.</p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Utilisation des données</h2>
          <p>Vos données sont utilisées exclusivement pour générer vos contenus marketing, analyser vos performances et améliorer nos services. Nous ne vendons jamais vos données personnelles.</p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Services tiers</h2>
          <p>Nous utilisons OpenAI, Buffer et Runway ML pour traiter vos demandes. Ces services peuvent avoir accès à vos données dans le cadre de l'exécution de nos services.</p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Vos droits (RGPD)</h2>
          <p>Conformément au RGPD, vous avez le droit d'accéder, de rectifier ou de supprimer vos données. Pour toute demande, contactez-nous à privacy@bdb-consulting.com</p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Cookies</h2>
          <p>Nous utilisons des cookies essentiels au fonctionnement de l'application. Vous pouvez les désactiver dans les paramètres de votre navigateur.</p>
        </section>
      </div>
    </div>
  );
}