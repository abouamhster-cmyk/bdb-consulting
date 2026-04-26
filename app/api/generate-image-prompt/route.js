import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export async function POST(request) {
  try {
    const { userId, post, brandTone, referenceImageDescription } = await request.json();

    logger.info({ userId, postTitle: post?.title }, "API generate-image-prompt appelée");

    if (!userId || !post || !post.title) {
      return NextResponse.json(
        { success: false, error: "Données manquantes" },
        { status: 400 },
      );
    }

    // Récupérer la configuration entreprise pour le contexte
    const { data: companyConfig } = await supabase
      .from('company_config')
      .select('brand_positioning, graphic_charter, editorial_charter')
      .eq('user_id', userId)
      .single();

    // Construction du prompt pour l'IA (pour générer le prompt DALL-E)
    const promptBuilder = `Tu es un expert en génération de prompts pour DALL-E 3. 
Crée un prompt d'image professionnel, détaillé et précis pour illustrer le post suivant.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTENU DU POST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TITRE : "${post.title}"
ACCROCHE : "${post.hook || 'Non spécifiée'}"
TYPE DE CONTENU : ${post.content_type || 'générique'}
${post.event_name ? `ÉVÉNEMENT SPÉCIAL : ${post.event_name} - Adapte l'image à cet événement.` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTEXTE DE LA MARQUE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Positionnement : ${companyConfig?.brand_positioning || 'Non défini'}
Charte graphique : ${companyConfig?.graphic_charter || 'Style moderne et professionnel'}
Ton éditorial : ${companyConfig?.editorial_charter || 'Professionnel et engageant'}
Ton demandé pour cette image : ${brandTone || 'professionnel'}

${referenceImageDescription ? `IMAGE DE RÉFÉRENCE FOURNIE PAR L'UTILISATEUR : "${referenceImageDescription}" - Inspire-toi de cette référence pour le style et la composition.` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONSIGNES POUR LE PROMPT DALL-E
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. L'image doit être DIRECTEMENT liée au titre et au thème du post
2. Style visuel : ${companyConfig?.graphic_charter || 'Moderne, épuré, professionnel'}
3. Format : carré 1024x1024
4. Ambiance : Positive, inspirante, professionnelle
5. Éviter le texte sur l'image
6. Photographie réaliste ou illustration haut de gamme

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FORMAT DE RÉPONSE ATTENDU
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Retourne UNIQUEMENT un prompt détaillé (150-200 mots) pour DALL-E 3, structuré ainsi :

1. Sujet principal : [description précise de ce qui doit être montré]
2. Contexte : [environnement, situation, décor]
3. Style visuel : [type d'image, ambiance, couleurs]
4. Composition : [angle, lumière, détails techniques]
5. Éléments à inclure : [objets, personnes, symboles]

Le prompt doit être suffisamment détaillé pour que DALL-E génère une image parfaitement adaptée au post.`;

    let generatedPrompt = "";

    const hasOpenAIKey = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 20;

    if (hasOpenAIKey) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: promptBuilder }],
            temperature: 0.7,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || "Erreur OpenAI");
        }

        const data = await response.json();
        generatedPrompt = data.choices[0].message.content;
        logger.info("Prompt image généré avec succès");
      } catch (error) {
        logger.error({ error: error.message }, "Erreur OpenAI, fallback");
        generatedPrompt = getFallbackPrompt(post, companyConfig);
      }
    } else {
      logger.warn("Pas de clé OpenAI, fallback");
      generatedPrompt = getFallbackPrompt(post, companyConfig);
    }

    return NextResponse.json({
      success: true,
      prompt: generatedPrompt,
    });
  } catch (error) {
    logger.error({ error: error.message }, "Erreur generate-image-prompt");
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

function getFallbackPrompt(post, companyConfig) {
  const style = companyConfig?.graphic_charter || "moderne, épuré, professionnel";
  
  return `Sujet principal : Une illustration représentant le concept "${post.title}".

Contexte : ${post.hook || "Environnement professionnel dynamique"}.

Style visuel : ${style}, couleurs harmonieuses, ambiance positive et inspirante.

Composition : Cadrage large, lumière naturelle, image haute résolution.

Éléments à inclure : Éléments visuels liés au thème, personnes souriantes si pertinent, espaces de travail modernes.

Format : 1024x1024.`;
}