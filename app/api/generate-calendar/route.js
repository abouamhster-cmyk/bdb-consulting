import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export async function POST(request) {
  try {
    const { strategyId, userId } = await request.json();

    logger.info({ strategyId, userId }, "API generate-calendar appelée");

    if (!userId) {
      logger.warn("Tentative sans userId");
      return NextResponse.json(
        { success: false, error: "Utilisateur non authentifié" },
        { status: 401 },
      );
    }

    if (!strategyId) {
      logger.warn("Tentative sans strategyId");
      return NextResponse.json(
        { success: false, error: "ID de stratégie manquant" },
        { status: 400 },
      );
    }

    // Récupérer la stratégie
    const { data: strategy, error: strategyError } = await supabase
      .from("company_config")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (strategyError || !strategy) {
      logger.error({ error: strategyError }, "Configuration non trouvée");
      return NextResponse.json(
        { success: false, error: "Configuration entreprise non trouvée" },
        { status: 404 },
      );
    }

    // Récupérer les paramètres
    const { data: params } = await supabase
      .from("generation_params")
      .select("*")
      .eq("user_id", userId)
      .single();

    // Récupérer les insights validés
    const { data: insights } = await supabase
      .from("competitive_insights")
      .select("insight, category")
      .eq("user_id", userId)
      .eq("status", "validated");

    const insightsText =
      insights?.map((i) => `- ${i.insight} (${i.category})`).join("\n") ||
      "Aucun insight spécifique";

    const prompt = `Génère un planning éditorial de ${params?.posts_count || 30} posts basé sur :
    
    STRATÉGIE DE L'ENTREPRISE :
    - Positionnement : ${strategy.brand_positioning}
    - Persona : ${strategy.persona}
    - Charte éditoriale : ${strategy.editorial_charter}
    
    PARAMÈTRES :
    - Période : du ${params?.start_date} au ${params?.end_date}
    - Objectifs : ${params?.objectives || "Non spécifiés"}
    
    INSIGHTS CONCURRENTIELS VALIDÉS :
    ${insightsText}
    
    RÉPARTITION DES TYPES DE CONTENU :
    - Éducatif : ${params?.content_types?.educatif || 40}%
    - Storytelling : ${params?.content_types?.storytelling || 30}%
    - Promotionnel : ${params?.content_types?.promotionnel || 20}%
    - Inspirationnel : ${params?.content_types?.inspirationnel || 10}%
    
    Retourne UNIQUEMENT un tableau JSON avec ${params?.posts_count || 30} objets, chacun avec :
    - day (numéro du jour)
    - title (titre accrocheur)
    - hook (phrase d'accroche)
    - cta (call to action)
    - content_type (éducatif, storytelling, promotionnel, inspirationnel)`;

    logger.info("Appel OpenAI pour génération calendrier");

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
      logger.error({ error: error.error?.message }, "Erreur OpenAI");
      throw new Error(error.error?.message || "Erreur OpenAI");
    }

    const data = await response.json();
    const calendarContent = JSON.parse(data.choices[0].message.content);

    logger.info(
      { count: calendarContent.length },
      "Calendrier généré avec succès",
    );

    // Supprimer l'ancien calendrier
    await supabase.from("post_skeleton").delete().eq("user_id", userId);

    // Insérer le nouveau
    const inserted = [];
    for (const item of calendarContent) {
      const { data: insertedItem, error } = await supabase
        .from("post_skeleton")
        .insert({
          user_id: userId,
          day: item.day,
          title: item.title,
          hook: item.hook,
          cta: item.cta,
          content_type: item.content_type,
          status: "draft",
        })
        .select()
        .single();

      if (insertedItem) inserted.push(insertedItem);
    }

    logger.info({ count: inserted.length }, "Squelette sauvegardé");

    return NextResponse.json({
      success: true,
      calendar: inserted,
      count: inserted.length,
    });
  } catch (error) {
    logger.error({ error: error.message }, "Erreur generate-calendar");
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
