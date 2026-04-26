import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export async function POST(request) {
  try {
    const { userId, sources } = await request.json();

    logger.info(
      { userId, sourcesCount: sources?.length },
      "API scrape-competitors appelée",
    );

    if (!userId || !sources || sources.length === 0) {
      logger.warn("Données manquantes");
      return NextResponse.json(
        { success: false, error: "Données manquantes" },
        { status: 400 },
      );
    }

    const allInsights = [];

    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      logger.info(
        { sourceName: source.name, index: i + 1, total: sources.length },
        "Analyse source en cours",
      );

      const insightsFromAI = await generateInsightsFromAI(source);

      for (const insight of insightsFromAI) {
        const { data: inserted, error: insertError } = await supabase
          .from("competitive_insights")
          .insert({
            user_id: userId,
            source_id: source.id,
            insight: insight.insight,
            category: insight.category,
            sentiment: insight.sentiment,
            suggested_actions: insight.suggested_actions,
            status: "pending",
          })
          .select();

        if (insertError) {
          logger.error(
            { error: insertError.message, source: source.name },
            "Erreur insertion",
          );
        } else if (inserted) {
          allInsights.push(inserted[0]);
        }
      }

      await supabase
        .from("competitive_sources")
        .update({ last_scraped: new Date().toISOString() })
        .eq("id", source.id);

      logger.info(
        { sourceName: source.name, insightsCount: insightsFromAI.length },
        "Source analysée",
      );
    }

    logger.info({ totalInsights: allInsights.length }, "Scraping terminé");

    return NextResponse.json({
      success: true,
      insightsCount: allInsights.length,
      insights: allInsights,
    });
  } catch (error) {
    logger.error({ error: error.message }, "Erreur scrape-competitors");
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

async function generateInsightsFromAI(source) {
  const prompt = `Tu es un expert en veille concurrentielle et stratégie marketing. Analyse ce concurrent de manière TRÈS APPROFONDIE.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INFORMATIONS DU CONCURRENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Nom : ${source.name}
Site web : ${source.url || "Non fourni"}
Type : ${source.type || "website"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GÉNÈRE 3 INSIGHTS MARKETING COMPLETS (1 insight = 4-5 lignes minimum)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Chaque insight doit contenir ces informations précises :

1. **OBSERVATION** : Décris EXACTEMENT ce que fait le concurrent (format, fréquence, plateforme)
2. **CE QUI MARCHE** : Pourquoi cette approche est efficace (données, résultats observés)
3. **NOTRE OPPORTUNITÉ** : Comment on peut s'inspirer ou faire mieux
4. **ACTIONS CONCRÈTES** : 3 actions précises, chiffrées, avec échéances

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FORMAT DE RÉPONSE (JSON UNIQUEMENT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[
  {
    "category": "stratégie de contenu|format visuel|ton éditorial|offre commerciale|engagement audience",
    "sentiment": "positive|negative|neutral",
    "observation": "Description précise de ce qu'ils font...",
    "what_works": "Pourquoi c'est efficace, résultats observés...",
    "opportunity": "Comment on peut s'inspirer ou faire mieux...",
    "suggested_actions": [
      "Action 1 avec chiffre et date (ex: Publier 3 études de cas d'ici le 15 juin)",
      "Action 2 avec chiffre et date",
      "Action 3 avec chiffre et date"
    ]
  }
]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXEMPLE DE RÉPONSE ATTENDUE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[
  {
    "category": "format visuel",
    "sentiment": "positive",
    "observation": "Ils publient des vidéos courtes de 30-45 secondes sur LinkedIn tous les mardis et jeudis, avec des sous-titres et des visuels dynamiques. Leurs vidéos génèrent entre 5000 et 10000 vues chacune.",
    "what_works": "Le format court capte l'attention (taux de rétention >70%), les sous-titres permettent le visionnage sans son, et la régularité crée une habitude chez l'audience.",
    "opportunity": "Nous pouvons produire des vidéos similaires mais en ajoutant une valeur ajoutée exclusive (template téléchargeable, checklist).",
    "suggested_actions": [
      "Produire 4 vidéos courtes de 30 secondes d'ici le 25 mai sur les thèmes : [à définir]",
      "Ajouter des sous-titres automatiques via CapCut ou Descript",
      "Programmer les vidéos les mardis et jeudis à 10h sur LinkedIn"
    ]
  }
]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RÈGLES STRICTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Génère EXACTEMENT 3 insights (pas plus, pas moins)
2. Chaque insight doit avoir observation, what_works, opportunity, suggested_actions
3. Sois PRÉCIS, CHIFFRÉ et ACTIONNABLE
4. Évite les généralités ("ils font du bon contenu" est interdit)
5. Retourne UNIQUEMENT le JSON, rien d'autre

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      logger.error(
        { error: error.error?.message, source: source.name },
        "Erreur OpenAI",
      );
      return getFallbackInsights(source);
    }

    const data = await response.json();
    let content = data.choices[0]?.message?.content || "";

    content = content.replace(/```json\n?/g, "");
    content = content.replace(/```\n?/g, "");
    content = content.trim();

    let insights = [];
    try {
      insights = JSON.parse(content);
    } catch (parseError) {
      logger.error(
        { content: content.substring(0, 200), source: source.name },
        "Erreur parsing JSON",
      );
      return getFallbackInsights(source);
    }

    if (!Array.isArray(insights)) {
      insights = [insights];
    }

    // Transformer en format standard et valider
    const validInsights = insights.slice(0, 3).map((insight, idx) => ({
      insight: formatInsightText(insight),
      category: validateCategory(insight.category),
      sentiment: validateSentiment(insight.sentiment),
      suggested_actions: formatSuggestedActions(
        insight.suggested_actions,
        source.name,
      ),
    }));

    while (validInsights.length < 3) {
      validInsights.push(getDefaultInsight(source.name));
    }

    return validInsights;
  } catch (error) {
    logger.error(
      { error: error.message, source: source.name },
      "Erreur génération insights",
    );
    return getFallbackInsights(source);
  }
}

function formatInsightText(insight) {
  if (insight.insight) return insight.insight;

  let text = "";
  if (insight.observation) text += `OBSERVATION : ${insight.observation}\n`;
  if (insight.what_works) text += `CE QUI MARCHE : ${insight.what_works}\n`;
  if (insight.opportunity) text += `OPPORTUNITÉ : ${insight.opportunity}\n`;

  return text || "Insight marketing à approfondir";
}

function formatSuggestedActions(actions, sourceName) {
  if (Array.isArray(actions) && actions.length > 0) {
    return actions.slice(0, 3);
  }
  return [
    `Analyser ${sourceName} en détail`,
    `Surveiller leurs publications pendant 1 mois`,
    `Identifier 3 axes d'amélioration pour notre stratégie`,
  ];
}

function getDefaultInsight(sourceName) {
  return {
    insight: `Poursuivre la veille sur ${sourceName} pour identifier les tendances émergentes.`,
    category: "topic",
    sentiment: "neutral",
    suggested_actions: [
      `Ajouter ${sourceName} à la liste de veille mensuelle`,
      `Analyser leurs meilleures performances du mois`,
      `Comparer leurs offres avec les nôtres`,
    ],
  };
}

function getFallbackInsights(source) {
  return [
    {
      insight: `${source.name} est un concurrent actif dans notre secteur. Une veille régulière est nécessaire.`,
      category: "topic",
      sentiment: "neutral",
      suggested_actions: [
        `Visiter ${source.url || "leur site web"} au moins 1x/semaine`,
        "Configurer des alertes Google",
      ],
    },
    {
      insight: `La stratégie de contenu de ${source.name} peut nous inspirer pour nos prochaines campagnes.`,
      category: "stratégie de contenu",
      sentiment: "neutral",
      suggested_actions: [
        "Analyser 5 de leurs meilleurs contenus",
        "Identifier leurs formats les plus engageants",
      ],
    },
    {
      insight: `Une analyse plus approfondie de ${source.name} est recommandée pour affiner notre positionnement.`,
      category: "offre commerciale",
      sentiment: "neutral",
      suggested_actions: [
        "Comparer leurs prix et services",
        "Réaliser une analyse SWOT complète",
      ],
    },
  ];
}

function validateCategory(category) {
  const valid = [
    "stratégie de contenu",
    "format visuel",
    "ton éditorial",
    "offre commerciale",
    "engagement audience",
    "topic",
  ];
  return valid.includes(category) ? category : "topic";
}

function validateSentiment(sentiment) {
  const valid = ["positive", "negative", "neutral"];
  return valid.includes(sentiment) ? sentiment : "neutral";
}
