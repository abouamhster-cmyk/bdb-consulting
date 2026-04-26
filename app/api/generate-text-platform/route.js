import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export async function POST(request) {
  try {
    const { userId, post, platform, event, tone } = await request.json();

    logger.info(
      { userId, postId: post?.id, platform },
      "API generate-text-platform appelée",
    );

    if (!userId || !post || !platform) {
      logger.warn("Données manquantes", {
        hasUserId: !!userId,
        hasPost: !!post,
        hasPlatform: !!platform,
      });
      return NextResponse.json(
        { success: false, error: "Données manquantes" },
        { status: 400 },
      );
    }

    // Récupérer la configuration entreprise
    const { data: companyConfig } = await supabase
      .from("company_config")
      .select("*")
      .eq("user_id", userId)
      .single();

    // Spécificités par plateforme
    const platformSpecs = {
      linkedin: {
        maxLength: 3000,
        style: "professionnel, B2B, valeur ajoutée",
        hashtags: "2-3 hashtags pertinents",
        structure: "Accroche impactante → Développement → Conclusion avec CTA",
      },
      instagram: {
        maxLength: 2200,
        style: "visuel, engageant, émotionnel",
        hashtags: "5-10 hashtags",
        structure: "Hook fort → Corps du texte → Émojis → Hashtags",
      },
      facebook: {
        maxLength: 5000,
        style: "conversationnel, communautaire",
        hashtags: "1-2 hashtags",
        structure: "Question ouverte → Développement → Appel à commentaire",
      },
      twitter: {
        maxLength: 280,
        style: "concis, punchy, viral",
        hashtags: "1-2 hashtags",
        structure: "Accroche percutante → Message court → CTA",
      },
    };

    const specs = platformSpecs[platform] || platformSpecs.linkedin;

    // Construire le prompt
    const eventText = event
      ? `\nÉVÉNEMENT SPÉCIAL : ${event} - Adapte le contenu à cet événement.`
      : "";

    const prompt = `Génère un post pour ${platform.toUpperCase()} basé sur :
    
    TITRE : "${post.title}"
    ACCROCHE : "${post.hook}"
    CTA : "${post.cta}"
    TYPE : ${post.content_type}
    ${eventText}
    
    STRATÉGIE DE L'ENTREPRISE :
    - Positionnement : ${companyConfig?.brand_positioning || "Non défini"}
    - Persona : ${companyConfig?.persona || "Non défini"}
    - Charte éditoriale : ${companyConfig?.editorial_charter || "Non défini"}
    - Ton demandé : ${tone || "professionnel"}
    
    SPÉCIFICITÉS ${platform.toUpperCase()} :
    - Longueur max : ${specs.maxLength} caractères
    - Style : ${specs.style}
    - Structure recommandée : ${specs.structure}
    - Hashtags : ${specs.hashtags}
    
    Consignes supplémentaires :
    - Utilise des émojis pertinents (sauf pour LinkedIn si trop formel)
    - Termine par une question ouverte ou un appel à l'action
    - Sois authentique et engageant
    - Respecte la limite de caractères
    
    Retourne UNIQUEMENT le texte du post, sans commentaires.`;

    let content = "";

    // Appel à OpenAI avec timeout
    if (!process.env.OPENAI_API_KEY) {
      // Mode simulation
      logger.warn("Mode démo - Pas de clé OpenAI");
      const demoTexts = {
        linkedin: `📢 ${post.hook}\n\n${post.title}\n\nDans un monde professionnel en constante évolution, nous croyons fermement que l'innovation et la formation continue sont les clés du succès.\n\n💡 Ce que nous avons appris :\n✅ L'importance de l'adaptabilité\n✅ La valeur de la collaboration\n✅ La puissance des données\n\n👉 ${post.cta}\n\nQuelle est votre expérience sur ce sujet ? Partagez en commentaire ! 👇\n\n#Marketing #Innovation #Business`,

        instagram: `${post.hook} ✨\n\n${post.title}\n\n${post.cta} 🎯\n\n_____________________\n\n💬 Dites-nous en commentaire ce que vous en pensez !\n\n#Marketing #Inspiration #Croissance #Tips #Business #Stratégie #Réussite #Motivation #Objectifs #Productivité`,

        facebook: `${post.hook} 🤔\n\n${post.title}\n\nEt vous, qu'en pensez-vous ? On en discute en commentaire ! 💬\n\n${post.cta}\n\n#Marketing #Community`,

        twitter: `${post.hook} ${post.title} ${post.cta} #Marketing #Business`,
      };
      content = demoTexts[platform] || demoTexts.linkedin;
    } else {
      try {
        // Timeout de 30 secondes
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        logger.info({ platform }, "Appel OpenAI pour génération texte");

        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: "gpt-3.5-turbo",
              messages: [{ role: "user", content: prompt }],
              temperature: 0.8,
            }),
            signal: controller.signal,
          },
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error = await response.json();
          logger.error(
            { error: error.error?.message, platform },
            "Erreur OpenAI",
          );
          throw new Error(error.error?.message || "Erreur OpenAI");
        }

        const data = await response.json();
        content = data.choices[0].message.content;

        logger.info(
          { platform, contentLength: content.length },
          "Texte généré avec succès",
        );
      } catch (fetchError) {
        logger.error(
          { error: fetchError.message, platform },
          "Erreur fetch OpenAI",
        );
        // Fallback en mode démo
        const demoTexts = {
          linkedin: `📢 ${post.hook}\n\n${post.title}\n\nDécouvrez comment nous pouvons vous aider à atteindre vos objectifs.\n\n👉 ${post.cta}`,
          instagram: `${post.hook} ✨\n\n${post.title}\n\n${post.cta} 🎯`,
          facebook: `${post.hook} 🤔\n\n${post.title}\n\n${post.cta}`,
          twitter: `${post.hook} ${post.title} ${post.cta}`,
        };
        content = demoTexts[platform] || demoTexts.linkedin;
      }
    }

    // Sauvegarder dans la base
    const fieldName = `text_${platform}`;

    const { data: existing } = await supabase
      .from("post_skeleton")
      .select(fieldName)
      .eq("id", post.id)
      .single();

    if (existing) {
      await supabase
        .from("post_skeleton")
        .update({
          [fieldName]: content,
          status_text: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", post.id);
      logger.info({ postId: post.id, platform }, "Texte mis à jour");
    } else {
      // Créer l'entrée si elle n'existe pas
      await supabase
        .from("post_skeleton")
        .update({
          [fieldName]: content,
          status_text: "completed",
        })
        .eq("id", post.id);
      logger.info({ postId: post.id, platform }, "Nouveau texte créé");
    }

    return NextResponse.json({
      success: true,
      content,
      platform,
    });
  } catch (error) {
    logger.error({ error: error.message }, "Erreur generate-text-platform");
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
