import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export async function POST(request) {
  try {
    const { userId, text, post, config, customPrompt } = await request.json();

    logger.info(
      { userId, textId: text?.id, postTitle: post?.title },
      "API generate-image appelée",
    );

    if (!userId || !text || !post) {
      logger.warn("Données manquantes", {
        userId,
        hasText: !!text,
        hasPost: !!post,
      });
      return NextResponse.json(
        { success: false, error: "Données manquantes" },
        { status: 400 },
      );
    }

    const prompt =
      customPrompt ||
      `Crée une image professionnelle pour illustrer un post marketing sur "${post.title}".
    
    STYLE VISUEL DE LA MARQUE :
    - Charte graphique : ${config?.graphic_charter || "Professionnel, moderne, épuré"}
    - Positionnement : ${config?.brand_positioning?.substring(0, 100) || "Marque professionnelle"}
    
    CONTEXTE DU POST :
    ${text.content?.substring(0, 300)}
    
    CONSIGNES :
    - Format carré 1024x1024
    - Style moderne, professionnel, attrayant
    - Ambiance positive, inspirante
    - Éviter le texte sur l'image
    - Photographie ou illustration haut de gamme`;

    logger.info(
      { textId: text.id, isCustomPrompt: !!customPrompt },
      "Appel DALL-E pour génération image",
    );

    const response = await fetch(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt,
          n: 1,
          size: "1024x1024",
          quality: "standard",
          style: "natural",
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      logger.error(
        { error: error.error?.message, textId: text.id },
        "Erreur DALL-E",
      );
      throw new Error(error.error?.message || "Erreur DALL-E");
    }

    const data = await response.json();
    const imageUrl = data.data[0].url;

    logger.info(
      { textId: text.id, imageUrl: imageUrl.substring(0, 50) + "..." },
      "Image générée avec succès",
    );

    // Vérifier si une image existe déjà
    const { data: existing } = await supabase
      .from("generated_images")
      .select("id")
      .eq("text_id", text.id)
      .single();

    let imageId;

    if (existing) {
      await supabase
        .from("generated_images")
        .update({
          image_url: imageUrl,
          prompt,
          status: "completed",
          updated_at: new Date().toISOString(),
          version: existing.version ? existing.version + 1 : 2,
        })
        .eq("id", existing.id);
      imageId = existing.id;
      logger.info({ imageId, textId: text.id }, "Image mise à jour");
    } else {
      const { data: inserted } = await supabase
        .from("generated_images")
        .insert({
          user_id: userId,
          text_id: text.id,
          image_url: imageUrl,
          prompt,
          status: "completed",
        })
        .select()
        .single();
      imageId = inserted.id;
      logger.info({ imageId, textId: text.id }, "Nouvelle image créée");
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      prompt,
      imageId,
    });
  } catch (error) {
    logger.error({ error: error.message }, "Erreur generate-image");
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
