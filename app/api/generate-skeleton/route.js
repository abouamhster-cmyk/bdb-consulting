import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export async function POST(request) {
  try {
    const {
      strategyId,
      userId,
      selectedPlatforms = ["linkedin", "instagram", "facebook", "twitter"],
    } = await request.json();

    logger.info(
      { strategyId, userId, selectedPlatforms },
      "API generate-skeleton appelée",
    );

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Utilisateur non authentifié" },
        { status: 401 },
      );
    }

    // 1. Récupérer la configuration entreprise
    const { data: strategy, error: strategyError } = await supabase
      .from("company_config")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (strategyError || !strategy) {
      logger.error({ error: strategyError }, "Configuration entreprise non trouvée");
      return NextResponse.json(
        { success: false, error: "Configuration entreprise non trouvée" },
        { status: 404 },
      );
    }

    // 2. Récupérer les paramètres
    const { data: params } = await supabase
      .from("generation_params")
      .select("*")
      .eq("user_id", userId)
      .single();

    // 3. Récupérer les INSIGHTS VALIDÉS
    const { data: validInsights } = await supabase
      .from("competitive_insights")
      .select("insight, category, suggested_actions")
      .eq("user_id", userId)
      .eq("status", "validated");

    const insightsText =
      validInsights?.length > 0
        ? `\n\n📊 INSIGHTS CONCURRENTIELS VALIDÉS :\n${validInsights.map((i) => `- ${i.insight} (${i.category})`).join("\n")}`
        : "";

    // 4. Détecter les ÉVÉNEMENTS
    const startDate =
      params?.start_date || new Date().toISOString().split("T")[0];
    const endDate =
      params?.end_date ||
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

    const eventsResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/detect-events`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, endDate, country: "FR" }),
      },
    );

    const eventsResult = await eventsResponse.json();
    const events = eventsResult.success ? eventsResult.events : [];

    const eventsText =
      events.length > 0
        ? `\n\n📅 ÉVÉNEMENTS DU MOIS :\n${events.map((e) => `- ${e.date} : ${e.name} (${e.type})`).join("\n")}`
        : "";

    const postsCount = params?.posts_count || 30;
    const start = new Date(startDate);

    // Calculer les dates
    const dates = [];
    for (let i = 0; i < postsCount; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date.toISOString().split("T")[0]);
    }

    // Construction du prompt
    const prompt = `Tu es un expert en content marketing. Génère un planning éditorial de ${postsCount} posts.

🏢 STRATÉGIE DE L'ENTREPRISE :
- Positionnement : ${strategy.brand_positioning || "Non défini"}
- Persona : ${strategy.persona || "Non défini"}
- Charte éditoriale : ${strategy.editorial_charter || "Non défini"}

🎯 PARAMÈTRES DE LA CAMPAGNE :
- Objectifs : ${params?.objectives || "Non spécifiés"}
- Ton : ${params?.brand_tone || "professionnel"}
${insightsText}
${eventsText}

📝 RÈGLES :
1. Adapte le contenu aux événements détectés
2. Varie les types de contenu
3. Sois créatif et professionnel

Retourne UNIQUEMENT un tableau JSON avec :
- day (numéro du jour)
- title (titre accrocheur, max 60 caractères)
- hook (phrase d'accroche, max 100 caractères)
- cta (call to action, max 50 caractères)
- content_type (éducatif, storytelling, promotionnel, inspirationnel)
- event_name (nom de l'événement ou null)

NE GÉNÈRE PAS DE TEXTES. Seulement le squelette.`;

    let skeletonData = [];

    // Vérifier si la clé OpenAI est présente
    const hasOpenAIKey =
      process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 20;

    if (hasOpenAIKey) {
      try {
        logger.info("Appel OpenAI pour génération du squelette");

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

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
            { error: error.error?.message, status: response.status },
            "Erreur OpenAI",
          );
          throw new Error(
            error.error?.message || `Erreur HTTP ${response.status}`,
          );
        }

        const data = await response.json();
        skeletonData = JSON.parse(data.choices[0].message.content);
        logger.info(
          { count: skeletonData.length },
          "Squelette généré par IA avec succès",
        );
      } catch (openAiError) {
        logger.error(
          { error: openAiError.message },
          "Erreur OpenAI, utilisation du fallback",
        );

        const contentTypes = [
          "éducatif",
          "storytelling",
          "promotionnel",
          "inspirationnel",
        ];
        for (let i = 0; i < postsCount; i++) {
          const currentDate = dates[i];
          const matchedEvent = events.find((e) => e.date === currentDate);
          skeletonData.push({
            day: i + 1,
            title: matchedEvent
              ? `✨ ${matchedEvent.name} : notre vision`
              : `💡 Post inspirant - Jour ${i + 1}`,
            hook: matchedEvent
              ? `À l'occasion de ${matchedEvent.name}, découvrez notre offre exclusive`
              : `Découvrez comment nous pouvons vous aider`,
            cta: `En savoir plus sur nos solutions`,
            content_type: contentTypes[i % contentTypes.length],
            event_name: matchedEvent?.name || null,
          });
        }
      }
    } else {
      logger.warn("Clé OpenAI manquante, utilisation du fallback");
      const contentTypes = [
        "éducatif",
        "storytelling",
        "promotionnel",
        "inspirationnel",
      ];
      for (let i = 0; i < postsCount; i++) {
        const currentDate = dates[i];
        const matchedEvent = events.find((e) => e.date === currentDate);
        skeletonData.push({
          day: i + 1,
          title: matchedEvent
            ? `✨ ${matchedEvent.name} : notre vision`
            : `💡 Post inspirant - Jour ${i + 1}`,
          hook: matchedEvent
            ? `À l'occasion de ${matchedEvent.name}, découvrez notre offre exclusive`
            : `Découvrez comment nous pouvons vous aider`,
          cta: `En savoir plus sur nos solutions`,
          content_type: contentTypes[i % contentTypes.length],
          event_name: matchedEvent?.name || null,
        });
      }
    }

    // Supprimer l'ancien squelette
    const { error: deleteError } = await supabase
      .from("post_skeleton")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      logger.error({ error: deleteError }, "Erreur lors de la suppression");
    }

    // Insérer le nouveau squelette
    const inserted = [];
    for (let i = 0; i < skeletonData.length; i++) {
      const item = skeletonData[i];
      
      const insertData = {
        user_id: userId,
        day: i + 1,
        date: dates[i],
        title: item.title,
        hook: item.hook,
        cta: item.cta,
        content_type: item.content_type,
        event_name: item.event_name || null,
        selected_platforms: selectedPlatforms,
        status_skeleton: "pending",
        status_text: "pending",
        status_image: "pending",
        status_video: "pending",
        status_scheduled: "pending",
      };

      const { data: insertedItem, error: insertError } = await supabase
        .from("post_skeleton")
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        logger.error({ error: insertError, data: insertData }, "Erreur insertion");
      } else if (insertedItem) {
        inserted.push(insertedItem);
      }
    }

    logger.info(
      {
        postsCount: inserted.length,
        expectedCount: skeletonData.length,
        eventsCount: events.length,
        insightsCount: validInsights?.length || 0,
        platformsSelected: selectedPlatforms,
        openaiUsed: hasOpenAIKey,
      },
      "Génération du squelette terminée",
    );

    return NextResponse.json({
      success: true,
      calendar: inserted,
      count: inserted.length,
      eventsUsed: events.length,
      insightsUsed: validInsights?.length || 0,
      platformsSelected: selectedPlatforms,
    });
  } catch (error) {
    logger.error({ error: error.message }, "Erreur generate-skeleton");
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}