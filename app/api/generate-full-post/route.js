import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase"; // ← alias

export async function POST(request) {
  try {
    const { calendarItem, contentMode, strategyId, userId } =
      await request.json();

    // Validation des paramètres
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Utilisateur non authentifié" },
        { status: 401 },
      );
    }

    if (!strategyId) {
      return NextResponse.json(
        { success: false, error: "ID de stratégie manquant" },
        { status: 400 },
      );
    }

    if (!calendarItem || !calendarItem.title) {
      return NextResponse.json(
        { success: false, error: "Données du calendrier invalides" },
        { status: 400 },
      );
    }

    // 1. Récupérer la stratégie complète (vérifier qu'elle appartient à l'utilisateur)
    const { data: strategy, error: strategyError } = await supabase
      .from("strategies")
      .select("*")
      .eq("id", strategyId)
      .eq("user_id", userId)
      .single();

    if (strategyError || !strategy) {
      console.error("Erreur récupération stratégie:", strategyError);
      return NextResponse.json(
        { success: false, error: "Stratégie non trouvée" },
        { status: 404 },
      );
    }

    let postText = null;
    let imageUrl = null;
    let videoUrl = null;

    // 2. Générer le texte avec OpenAI (avec mode démo)
    const hasOpenAIKey =
      process.env.OPENAI_API_KEY &&
      process.env.OPENAI_API_KEY.startsWith("sk-");

    if (!hasOpenAIKey) {
      console.log("🔧 Mode démo - Pas de clé OpenAI");
      postText = `📢 ${calendarItem.hook}\n\n${calendarItem.title}\n\nDécouvrez comment transformer votre stratégie marketing avec notre solution innovante.\n\n💡 ${calendarItem.cta}\n\n#Marketing #Innovation #Croissance`;
    } else {
      try {
        const textPrompt = `Tu es un expert en copywriting pour les réseaux sociaux.
        
        Stratégie de la marque :
        - Positionnement : ${strategy.brand_positioning || "Non défini"}
        - Persona : ${strategy.persona || "Non défini"}
        - Charte éditoriale : ${strategy.editorial_charter || "Non défini"}
        
        Génère un post pour ${calendarItem.content_type || "éducatif"} avec :
        - Titre : ${calendarItem.title}
        - Accroche : ${calendarItem.hook}
        - CTA : ${calendarItem.cta}
        
        Le post doit faire 150-250 mots, avec des emojis, adapté à LinkedIn, Instagram et Facebook.
        Style : engageant, professionnel, authentique.
        
        Retourne UNIQUEMENT le texte du post.`;

        const textResponse = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: "gpt-3.5-turbo",
              messages: [{ role: "user", content: textPrompt }],
              temperature: 0.8,
            }),
            signal: AbortSignal.timeout(30000),
          },
        );

        if (!textResponse.ok) {
          const errorData = await textResponse.json();
          throw new Error(
            `OpenAI API error: ${errorData.error?.message || textResponse.status}`,
          );
        }

        const textData = await textResponse.json();
        postText = textData.choices?.[0]?.message?.content;

        if (!postText) {
          throw new Error("Pas de réponse texte d'OpenAI");
        }
      } catch (openAiError) {
        console.error("Erreur OpenAI texte:", openAiError);
        postText = `📢 ${calendarItem.hook}\n\n${calendarItem.title}\n\nDécouvrez comment nous pouvons vous aider à atteindre vos objectifs.\n\n👉 ${calendarItem.cta}`;
      }
    }

    // 3. Générer l'image avec DALL·E 3 (si demandé)
    if (contentMode === "image" || contentMode === "video") {
      if (!hasOpenAIKey) {
        imageUrl = `https://picsum.photos/id/${Math.floor(Math.random() * 100)}/1024/1024`;
      } else {
        try {
          const imagePrompt = `Crée une image professionnelle pour illustrer un post marketing.
          
          SUJET DU POST : "${calendarItem.title}"
          ACCROCHE : "${calendarItem.hook}"
          
          STYLE VISUEL DE LA MARQUE :
          - Charte graphique : ${strategy.graphic_charter || "Professionnel, moderne, épuré"}
          - Positionnement : ${strategy.brand_positioning?.substring(0, 100) || "Marque professionnelle"}
          
          CONSIGNES POUR L'IMAGE :
          - Format carré 1024x1024 pour les réseaux sociaux
          - Style : moderne, professionnel, attrayant
          - Ambiance : positive, inspirante
          - Éviter le texte sur l'image
          - Photographie ou illustration haut de gamme
          
          Génère une image unique et mémorable qui attire l'attention.`;

          const imageResponse = await fetch(
            "https://api.openai.com/v1/images/generations",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              },
              body: JSON.stringify({
                model: "dall-e-3",
                prompt: imagePrompt,
                n: 1,
                size: "1024x1024",
                quality: "standard",
                style: "natural",
              }),
              signal: AbortSignal.timeout(60000),
            },
          );

          if (imageResponse.ok) {
            const imageData = await imageResponse.json();
            if (imageData.data && imageData.data[0]) {
              imageUrl = imageData.data[0].url;
            }
          } else {
            console.error(
              "Erreur génération image:",
              await imageResponse.text(),
            );
            imageUrl = `https://picsum.photos/id/100/1024/1024`;
          }
        } catch (imageError) {
          console.error("Erreur DALL-E:", imageError);
          imageUrl = `https://picsum.photos/id/100/1024/1024`;
        }
      }
    }

    // 4. Générer la vidéo (si demandé)
    if (contentMode === "video") {
      try {
        const videoPrompt = `Crée une courte vidéo marketing professionnelle pour :
        - Thème : ${calendarItem.title}
        - Message clé : ${calendarItem.hook}
        - Style : Dynamique, engageant, moderne
        - Public : Professionnels et cadres
        - Durée : 4 secondes
        - Format : carré pour réseaux sociaux`;

        const videoResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/generate-video`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: videoPrompt,
              imageUrl: imageUrl,
              duration: 4,
            }),
            signal: AbortSignal.timeout(60000),
          },
        );

        if (videoResponse.ok) {
          const videoData = await videoResponse.json();
          if (videoData.success && videoData.videoUrl) {
            videoUrl = videoData.videoUrl;
          }
        }
      } catch (videoError) {
        console.error("Erreur génération vidéo:", videoError);
      }
    }

    // 5. Sauvegarder dans Supabase avec user_id
    try {
      await supabase.from("generated_content").insert([
        {
          strategy_id: strategyId,
          user_id: userId,
          calendar_item: calendarItem,
          content_mode: contentMode,
          text: postText,
          image_url: imageUrl,
          video_url: videoUrl,
          status: "completed",
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (dbError) {
      console.error("Erreur sauvegarde DB:", dbError);
    }

    return NextResponse.json({
      success: true,
      content: postText,
      imageUrl: imageUrl,
      videoUrl: videoUrl,
      demoMode: !hasOpenAIKey,
    });
  } catch (error) {
    console.error("Erreur générale:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erreur interne du serveur",
      },
      { status: 500 },
    );
  }
}
