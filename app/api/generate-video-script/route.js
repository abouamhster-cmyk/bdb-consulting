import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function POST(request) {
  try {
    const { post } = await request.json();

    logger.info({ postTitle: post?.title }, "API generate-video-script appelée");

    if (!post) {
      return NextResponse.json(
        { success: false, error: "Données manquantes" },
        { status: 400 },
      );
    }

    const prompt = `Génère un script court et percutant pour une vidéo marketing de 120 secondes.

INFORMATIONS :
- Titre : ${post.title}
- Accroche : ${post.hook || "Non spécifiée"}
- CTA : ${post.cta || "Non spécifié"}
- Type : ${post.content_type || "générique"}

CONSIGNES :
- 100-200 mots maximum
- Style : engageant, dynamique, professionnel
- Inclure le CTA naturellement
- Adapté pour une voix off courte

Retourne UNIQUEMENT le script, sans commentaires.`;

    let script = "";

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
            messages: [{ role: "user", content: prompt }],
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
        script = data.choices[0].message.content;
        logger.info("Script vidéo généré avec succès");
      } catch (error) {
        logger.error({ error: error.message }, "Erreur OpenAI, fallback");
        script = getFallbackScript(post);
      }
    } else {
      logger.warn("Pas de clé OpenAI, fallback");
      script = getFallbackScript(post);
    }

    return NextResponse.json({
      success: true,
      script,
    });
  } catch (error) {
    logger.error({ error: error.message }, "Erreur generate-video-script");
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

function getFallbackScript(post) {
  return `${post.hook || "Découvrez notre solution"} ${post.title}. ${post.cta || "En savoir plus"} !`;
}