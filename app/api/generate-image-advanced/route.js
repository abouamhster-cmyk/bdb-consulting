import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export async function POST(request) {
  try {
    const { userId, post, customPrompt, referenceImage, format, size } = await request.json();

    logger.info({ userId, postId: post?.id, hasCustomPrompt: !!customPrompt }, "API generate-image-advanced appelée");

    if (!userId || !post) {
      return NextResponse.json({ success: false, error: 'Données manquantes' }, { status: 400 });
    }

    // UTILISER LE PROMPT EXISTANT (pas en créer un nouveau)
    const imagePrompt = customPrompt || post.image_prompt;

    if (!imagePrompt) {
      return NextResponse.json({ 
        success: false, 
        error: 'Aucun prompt défini. Veuillez d\'abord écrire ou générer un prompt.' 
      }, { status: 400 });
    }

    // Récupérer la charte graphique pour enrichir (optionnel)
    const { data: companyConfig } = await supabase
      .from('company_config')
      .select('graphic_charter')
      .eq('user_id', userId)
      .single();

    // Enrichir le prompt avec la charte graphique si disponible
    let finalPrompt = imagePrompt;
    if (companyConfig?.graphic_charter) {
      finalPrompt = `${imagePrompt}\n\nStyle visuel à respecter : ${companyConfig.graphic_charter}`;
    }

    // Conversion format vers taille DALL-E
    const sizeMap = {
      square: '1024x1024',
      portrait: '1024x1792',
      landscape: '1792x1024'
    };
    const dalleSize = sizeMap[format] || size || '1024x1024';

    logger.info({ prompt: finalPrompt.substring(0, 200) }, "Appel DALL-E avec prompt existant");

    let imageUrl = '';

    try {
      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: finalPrompt,
          n: 1,
          size: dalleSize,
          quality: "standard",
          style: "natural",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        logger.error({ error: error.error?.message }, "Erreur DALL-E");
        throw new Error(error.error?.message || "Erreur DALL-E");
      }

      const data = await response.json();
      imageUrl = data.data[0].url;
      logger.info("Image générée avec succès");
    } catch (error) {
      logger.error({ error: error.message }, "Erreur génération image");
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Sauvegarde en base
    await supabase
      .from('post_skeleton')
      .update({
        image_url: imageUrl,
        status_image: 'completed'
      })
      .eq('id', post.id);

    return NextResponse.json({
      success: true,
      imageUrl,
      prompt: imagePrompt
    });

  } catch (error) {
    logger.error({ error: error.message }, "Erreur generate-image-advanced");
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}