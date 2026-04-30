// lib/mock-data.js
export const generateSmartCalendar = (strategy) => {
  const brandTheme =
    strategy?.brand_positioning?.substring(0, 30) || "Marketing";
  const personaName = strategy?.persona?.substring(0, 20) || "clients";

  return [
    {
      day: 1,
      title: `Comment ${personaName} peut optimiser ${brandTheme}`,
      hook: "La méthode qui change tout",
      cta: "Téléchargez le guide",
      content_type: "éducatif",
    },
    {
      day: 3,
      title: `Témoignage : transformation réussie`,
      hook: "Une histoire inspirante",
      cta: "Réservez un appel",
      content_type: "storytelling",
    },
    {
      day: 5,
      title: `Les 3 piliers de ${brandTheme}`,
      hook: "Ce que les experts ne disent pas",
      cta: "Accédez à la masterclass",
      content_type: "éducatif",
    },
    {
      day: 8,
      title: `Offre exclusive -30%`,
      hook: "valable 48h",
      cta: "Profitez-en",
      content_type: "promotionnel",
    },
    {
      day: 10,
      title: `Pourquoi ${personaName} va adorer cette approche`,
      hook: "La révélation",
      cta: "Découvrez",
      content_type: "inspirationnel",
    },
    {
      day: 12,
      title: `L'outil secret des experts`,
      hook: "Gratuit et efficace",
      cta: "Téléchargez",
      content_type: "éducatif",
    },
    {
      day: 15,
      title: `De zéro à héros : le parcours`,
      hook: "Un exemple à suivre",
      cta: "Inscrivez-vous",
      content_type: "storytelling",
    },
    {
      day: 17,
      title: `L'erreur à éviter absolument`,
      hook: "90% des gens la font",
      cta: "Recevez la checklist",
      content_type: "éducatif",
    },
    {
      day: 20,
      title: `Les coulisses de notre mission`,
      hook: "Notre histoire",
      cta: "Rejoignez-nous",
      content_type: "storytelling",
    },
    {
      day: 22,
      title: `La routine des leaders`,
      hook: "2 minutes suffisent",
      cta: "Abonnez-vous",
      content_type: "inspirationnel",
    },
    {
      day: 25,
      title: `Comment gagner 10h/semaine`,
      hook: "Le témoignage choc",
      cta: "Demandez votre audit",
      content_type: "storytelling",
    },
    {
      day: 28,
      title: `Bilan mensuel : nos tops contenus`,
      hook: "À ne pas manquer",
      cta: "Partagez",
      content_type: "inspirationnel",
    },
    {
      day: 30,
      title: `Préparez votre mois prochain`,
      hook: "La méthode pas à pas",
      cta: "Recevez le template",
      content_type: "éducatif",
    },
  ];
};
