import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function POST(request) {
  try {
    const body = await request.json();
    logger.info({ body }, "API chat-assistant appelée");

    const { message, context, currentPost, messages } = body;

    if (!message && (!messages || messages.length === 0)) {
      logger.warn("Message manquant");
      return NextResponse.json(
        { success: false, error: "Message manquant" },
        { status: 400 },
      );
    }

    // Utiliser le dernier message de l'historique ou le message direct
    const userMessage = message || (messages && messages[messages.length - 1]?.content);

    // Construire le prompt avec le contexte
    let prompt = userMessage;
    
    if (context) {
      prompt = `Contexte du post marketing :
- Titre : ${context.title || "Non défini"}
- Accroche : ${context.hook || "Non défini"}
- Type : ${context.content_type || "Non défini"}
- Contenu actuel : ${context.content || "Non défini"}

Question de l'utilisateur : ${userMessage}

Réponds de manière concise, professionnelle et utile. Propose des améliorations concrètes si demandé.
Si l'utilisateur demande une modification, suggère un nouveau texte.`;
    }

    let reply = "";

    // Vérifier si la clé OpenAI est présente
    const hasOpenAIKey = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 20;

    if (hasOpenAIKey) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || "Erreur OpenAI");
        }

        const data = await response.json();
        reply = data.choices[0].message.content;
        logger.info("Réponse IA générée");
      } catch (openAiError) {
        logger.error({ error: openAiError.message }, "Erreur OpenAI, fallback");
        reply = getFallbackResponse(userMessage, context);
      }
    } else {
      logger.warn("Pas de clé OpenAI, utilisation du fallback");
      reply = getFallbackResponse(userMessage, context);
    }

    return NextResponse.json({
      success: true,
      reply,
    });
  } catch (error) {
    logger.error({ error: error.message }, "Erreur chat-assistant");
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

function getFallbackResponse(message, context) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes("améliorer") || lowerMessage.includes("mieux") || lowerMessage.includes("modifier")) {
    if (context && context.type === "texte") {
      return `Voici une suggestion d'amélioration pour votre texte :

📝 **Version améliorée :**
${context.content ? context.content.substring(0, 300) : "Votre texte"}

💡 **Suggestions :**
1. Ajoutez une accroche plus forte dès les premiers mots
2. Utilisez des émojis pertinents pour capter l'attention
3. Terminez par une question ouverte pour engager la conversation
4. Ajoutez 2-3 hashtags pertinents

Souhaitez-vous que je réécrive complètement le texte avec ces suggestions ?`;
    }
    return "Pour améliorer votre contenu, je vous suggère de :\n\n1. Ajouter une accroche plus forte\n2. Utiliser des émojis pertinents\n3. Terminer par une question ouverte\n4. Ajouter des hashtags\n\nSouhaitez-vous que je vous aide à appliquer ces modifications ?";
  }
  
  if (lowerMessage.includes("prompt") || lowerMessage.includes("image")) {
    return "Pour un bon prompt d'image DALL-E, je vous conseille de :\n\n- Décrire le sujet principal (produit, personne, concept)\n- Préciser le style (professionnel, moderne, minimaliste)\n- Donner des indications de couleurs\n- Indiquer l'ambiance (positive, dynamique, sereine)\n\nExemple : 'Une personne souriante travaillant sur un ordinateur, style moderne, couleurs bleues, ambiance positive et productive.'";
  }
  
  if (lowerMessage.includes("script") || lowerMessage.includes("vidéo")) {
    return "Pour un script vidéo court (4 secondes) :\n\n1. Accroche : 1-2 secondes\n2. Message principal : 2 secondes\n3. CTA : 1 seconde\n\nExemple : 'Vous voulez gagner du temps ? (1s) Découvrez notre solution IA ! (2s) Lien en bio (1s)'";
  }
  
  return "Je suis votre assistant IA. Posez-moi des questions sur :\n- L'amélioration de vos textes\n- La création de prompts pour images\n- L'écriture de scripts vidéo\n- Les meilleures pratiques marketing\n\nComment puis-je vous aider ?";
}