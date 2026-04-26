import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export async function POST(request) {
  try {
    const { userId, image, post, customScript } = await request.json();

    logger.info(
      { userId, imageId: image?.id, postTitle: post?.title },
      "API generate-video appelée",
    );

    if (!userId || !image || !post) {
      logger.warn("Données manquantes", {
        userId,
        hasImage: !!image,
        hasPost: !!post,
      });
      return NextResponse.json(
        { success: false, error: "Données manquantes" },
        { status: 400 },
      );
    }

    // Générer un script si non fourni
    let script = customScript;
    if (!script) {
      logger.info({ imageId: image.id }, "Génération du script via OpenAI");

      const scriptResponse = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4-turbo",
            messages: [
              {
                role: "user",
                content: `Génère un script court (30 mots max) pour une vidéo marketing de 4 secondes sur: ${post.title}`,
              },
            ],
            temperature: 0.8,
          }),
        },
      );

      if (!scriptResponse.ok) {
        const error = await scriptResponse.json();
        logger.error(
          { error: error.error?.message },
          "Erreur génération script",
        );
        throw new Error(error.error?.message || "Erreur génération script");
      }

      const scriptData = await scriptResponse.json();
      script = scriptData.choices[0].message.content;
      logger.info({ imageId: image.id, script }, "Script généré");
    } else {
      logger.info(
        { imageId: image.id, isCustomScript: true },
        "Script personnalisé fourni",
      );
    }

    // Appel à Runway ML
    logger.info({ imageId: image.id }, "Appel Runway ML pour génération vidéo");

    const runwayResponse = await fetch("https://api.runwayml.com/v1/generate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RUNWAY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: script,
        image: image.image_url,
        duration: 4,
        fps: 24,
        aspect_ratio: "1:1",
      }),
    });

    if (!runwayResponse.ok) {
      const error = await runwayResponse.json();
      logger.error(
        { error: error.message, status: runwayResponse.status },
        "Erreur Runway ML",
      );
      throw new Error(error.message || "Erreur Runway ML");
    }

    const runwayData = await runwayResponse.json();
    const videoUrl = runwayData.output?.url;

    if (!videoUrl) {
      logger.error({ imageId: image.id }, "Aucune vidéo générée par Runway");
      throw new Error("Aucune vidéo générée");
    }

    logger.info(
      { imageId: image.id, videoUrl: videoUrl.substring(0, 50) + "..." },
      "Vidéo générée avec succès",
    );

    // Vérifier si une vidéo existe déjà
    const { data: existing } = await supabase
      .from("generated_videos")
      .select("id, version")
      .eq("image_id", image.id)
      .single();

    let videoId;

    if (existing) {
      await supabase
        .from("generated_videos")
        .update({
          video_url: videoUrl,
          script,
          status: "completed",
          updated_at: new Date().toISOString(),
          version: (existing.version || 1) + 1,
        })
        .eq("id", existing.id);
      videoId = existing.id;
      logger.info({ videoId, imageId: image.id }, "Vidéo mise à jour");
    } else {
      const { data: inserted } = await supabase
        .from("generated_videos")
        .insert({
          user_id: userId,
          image_id: image.id,
          video_url: videoUrl,
          script,
          duration: 4,
          status: "completed",
        })
        .select()
        .single();
      videoId = inserted.id;
      logger.info({ videoId, imageId: image.id }, "Nouvelle vidéo créée");
    }

    return NextResponse.json({
      success: true,
      videoUrl,
      script,
      duration: 4,
      videoId,
    });
  } catch (error) {
    logger.error({ error: error.message }, "Erreur generate-video");
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
