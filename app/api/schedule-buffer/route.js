import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export async function POST(request) {
  try {
    const { userId, videoId, post, platform, scheduledDate } =
      await request.json();

    logger.info(
      { userId, videoId, platform, postTitle: post?.title },
      "API schedule-buffer appelée",
    );

    if (!userId || !videoId || !post || !platform) {
      logger.warn("Données manquantes", {
        userId,
        hasVideoId: !!videoId,
        hasPost: !!post,
        hasPlatform: !!platform,
      });
      return NextResponse.json(
        { success: false, error: "Données manquantes" },
        { status: 400 },
      );
    }

    // Récupérer la clé API Buffer de l'utilisateur
    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("buffer_api_key")
      .eq("user_id", userId)
      .single();

    if (settingsError || !settings?.buffer_api_key) {
      logger.error(
        { userId, error: settingsError?.message },
        "Clé Buffer non configurée",
      );
      return NextResponse.json(
        { success: false, error: "Clé Buffer non configurée" },
        { status: 401 },
      );
    }

    // Construction du message
    const message = `${post.title}\n\n${post.hook}\n\n${post.content?.substring(0, 500) || ""}\n\n${post.cta}`;

    logger.info(
      { platform, scheduledDate, messageLength: message.length },
      "Appel API Buffer",
    );

    const bufferResponse = await fetch(
      "https://api.bufferapp.com/1/updates/create.json",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${settings.buffer_api_key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: message,
          profile_ids: [platform],
          scheduled_at: scheduledDate,
          media: post.imageUrl ? { photo: post.imageUrl } : undefined,
        }),
      },
    );

    if (!bufferResponse.ok) {
      const error = await bufferResponse.json();
      logger.error(
        { error: error.message, status: bufferResponse.status, platform },
        "Erreur Buffer",
      );
      throw new Error(error.message || "Erreur Buffer");
    }

    const bufferData = await bufferResponse.json();

    logger.info(
      { bufferId: bufferData.id, platform },
      "Post programmé sur Buffer",
    );

    // Sauvegarder dans Supabase
    const { data: scheduled, error: saveError } = await supabase
      .from("scheduled_posts")
      .insert({
        user_id: userId,
        video_id: videoId,
        platform,
        scheduled_date: scheduledDate,
        buffer_post_id: bufferData.id,
        status: "scheduled",
      })
      .select()
      .single();

    if (saveError) {
      logger.error(
        { error: saveError.message },
        "Erreur sauvegarde programmation",
      );
    } else {
      logger.info(
        { scheduledId: scheduled.id, bufferId: bufferData.id },
        "Programmation sauvegardée",
      );
    }

    return NextResponse.json({
      success: true,
      scheduledId: scheduled?.id,
      bufferId: bufferData.id,
    });
  } catch (error) {
    logger.error({ error: error.message }, "Erreur schedule-buffer");
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
