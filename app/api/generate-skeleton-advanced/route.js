import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export async function POST(request) {
  try {
    const { userId, config, events, postsCount, startDate } =
      await request.json();

    if (!userId || !config || !postsCount) {
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

    // Calculer les dates
    const start = new Date(startDate);
    const dates = [];
    for (let i = 0; i < postsCount; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date.toISOString().split("T")[0]);
    }

    // Génération simplifiée sans OpenAI (pour la stabilité)
    const contentTypes = [
      "éducatif",
      "storytelling",
      "promotionnel",
      "inspirationnel",
    ];
    const skeletonData = [];

    for (let i = 0; i < postsCount; i++) {
      const date = dates[i];
      const matchedEvent = events?.find((e) => e.date === date);

      skeletonData.push({
        day: i + 1,
        date: date,
        title: matchedEvent
          ? `Célébrons ${matchedEvent.name} ensemble !`
          : `Post inspirant - Jour ${i + 1}`,
        hook: matchedEvent
          ? `À l'occasion de ${matchedEvent.name}, découvrez notre vision`
          : `Découvrez comment transformer votre stratégie marketing`,
        cta: `En savoir plus`,
        content_type: contentTypes[i % contentTypes.length],
        event_name: matchedEvent?.name || null,
      });
    }

    // Supprimer l'ancien squelette
    await supabase.from("post_skeleton").delete().eq("user_id", userId);

    // Insérer les nouveaux posts
    const insertedPosts = [];
    for (const item of skeletonData) {
      const { data: inserted, error } = await supabase
        .from("post_skeleton")
        .insert({
          user_id: userId,
          day: item.day,
          date: item.date,
          title: item.title,
          hook: item.hook,
          cta: item.cta,
          content_type: item.content_type,
          event_name: item.event_name,
          status_skeleton: "pending",
          status_text: "pending",
          status_image: "pending",
          status_video: "pending",
          status_scheduled: "pending",
        })
        .select()
        .single();

      if (inserted) insertedPosts.push(inserted);
    }

    logger.info({ count: insertedPosts.length }, "Squelette avancé généré");

    return NextResponse.json({
      success: true,
      posts: insertedPosts,
      count: insertedPosts.length,
    });
  } catch (error) {
    logger.error({ error: error.message }, "Erreur generate-skeleton-advanced");
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
