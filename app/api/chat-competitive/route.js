import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request) {
  try {
    const { messages, events } = await request.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: "Messages manquants" },
        { status: 400 },
      );
    }

    // Récupérer les insights de veille concurrentielle existants
    const { data: insights } = await supabase
      .from("competitive_insights")
      .select("insight, category")
      .eq("status", "validated")
      .limit(10);

    const eventsText =
      events && events.length > 0
        ? `\n\nÉvénements du mois validés :\n${events.map((e) => `- ${e.name} (${e.date})`).join("\n")}`
        : "";

    const insightsText =
      insights && insights.length > 0
        ? `\n\nInsights concurrentiels disponibles :\n${insights.map((i) => `- ${i.insight} (${i.category})`).join("\n")}`
        : "\n\nAucun insight concurrentiel disponible pour le moment.";

    // Historique des messages formaté
    const conversationHistory = messages
      .map(
        (m) =>
          `${m.role === "user" ? "Utilisateur" : "Assistant"}: ${m.content}`,
      )
      .join("\n");

    const prompt = `Tu es un expert en veille concurrentielle et marketing. Tu aides l'utilisateur à affiner sa stratégie.
    
    Contexte :
    - L'utilisateur prépare une campagne marketing.
    ${insightsText}
    ${eventsText}
    
    Historique de la conversation :
    ${conversationHistory}
    
    Réponds de manière concise, professionnelle et actionable. Propose des suggestions concrètes basées sur les insights et événements disponibles.
    Si l'utilisateur demande des informations sur un concurrent spécifique, suggère des actions précises.
    Si l'utilisateur demande des idées de contenu pour un événement, propose 2-3 exemples.
    
    Réponds en français.`;

    let reply = "";

    // Appel à OpenAI
    if (!process.env.OPENAI_API_KEY) {
      // Mode simulation (car tu auras la clé en prod)
      reply = `Voici quelques suggestions basées sur les événements du mois :
      
${events && events.length > 0 ? events.map((e) => `📅 **${e.name}** (${new Date(e.date).toLocaleDateString()}) : Proposez un contenu en lien avec cette célébration. Par exemple, pour ${e.name}, vous pourriez partager un post inspirant ou une offre spéciale.`).join("\n\n") : "Aucun événement détecté pour le moment."}

Pour la veille concurrentielle, analysez régulièrement les publications de vos concurrents et identifiez les formats qui fonctionnent bien. N'hésitez pas à me poser des questions plus précises sur un secteur ou un concurrent spécifique.`;
    } else {
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
            temperature: 0.7,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Erreur OpenAI");
      }

      const data = await response.json();
      reply = data.choices[0].message.content;
    }

    return NextResponse.json({
      success: true,
      reply,
    });
  } catch (error) {
    console.error("Erreur chat-competitive:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
