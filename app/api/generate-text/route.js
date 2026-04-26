import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export async function POST(request) {
  try {
    const { userId, post, config } = await request.json();

    logger.info(
      { userId, postId: post?.id, postTitle: post?.title },
      "API generate-text appelée",
    );

    if (!userId || !post || !config) {
      logger.warn("Données manquantes", {
        userId,
        hasPost: !!post,
        hasConfig: !!config,
      });
      return NextResponse.json(
        { success: false, error: "Données manquantes" },
        { status: 400 },
      );
    }

    const prompt = `Rédige un post pour les réseaux sociaux (LinkedIn, Instagram, Facebook) basé sur :
    
    TITRE : "${post.title}"
    ACCROCHE : "${post.hook}"
    CTA : "${post.cta}"
    TYPE : ${post.content_type}
    
    STRATÉGIE DE L'ENTREPRISE :
    - Positionnement : ${config.brand_positioning}
    - Persona : ${config.persona}
    - Charte éditoriale : ${config.editorial_charter}
    
    Consignes :
    - Longueur : 150-250 mots
    - Style : engageant, professionnel
    - Inclure des émojis pertinents
    - Terminer par une question ouverte
    - Inclure le CTA naturellement
    
    Retourne UNIQUEMENT le texte du post.`;

    logger.info({ postId: post.id }, "Appel OpenAI pour génération texte");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      logger.error(
        { error: error.error?.message, postId: post.id },
        "Erreur OpenAI",
      );
      throw new Error(error.error?.message || "Erreur OpenAI");
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const wordCount = content.split(/\s+/).length;

    logger.info({ postId: post.id, wordCount }, "Texte généré avec succès");

    // Vérifier si un texte existe déjà
    const { data: existing } = await supabase
      .from("generated_texts")
      .select("id")
      .eq("skeleton_id", post.id)
      .single();

    let textId;

    if (existing) {
      await supabase
        .from("generated_texts")
        .update({
          content,
          word_count: wordCount,
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      textId = existing.id;
      logger.info({ textId, postId: post.id }, "Texte mis à jour");
    } else {
      const { data: inserted } = await supabase
        .from("generated_texts")
        .insert({
          user_id: userId,
          skeleton_id: post.id,
          content,
          word_count: wordCount,
          status: "completed",
        })
        .select()
        .single();
      textId = inserted.id;
      logger.info({ textId, postId: post.id }, "Nouveau texte créé");
    }

    return NextResponse.json({
      success: true,
      content,
      word_count: wordCount,
      textId,
    });
  } catch (error) {
    logger.error({ error: error.message }, "Erreur generate-text");
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
