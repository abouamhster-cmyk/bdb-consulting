import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request) {
  try {
    const { userId, post, imageUrl, text, customScript } = await request.json();

    if (!userId || !post) {
      return NextResponse.json(
        { success: false, error: "Données manquantes" },
        { status: 400 },
      );
    }

    // Générer un script si non fourni
    let script = customScript;

    if (!script) {
      const prompt = `Génère un script court et percutant pour une vidéo marketing de 4 secondes basée sur :
      
      TITRE : "${post.title}"
      ACCROCHE : "${post.hook}"
      CTA : "${post.cta}"
      TYPE : ${post.content_type}
      
      CONTEXTE TEXTUEL :
      ${text?.substring(0, 300) || post.title}
      
      CONSIGNES :
      - 30 mots maximum
      - Style : engageant, dynamique, professionnel
      - Inclure le CTA naturellement
      - Adapté pour une voix off courte
      
      Retourne UNIQUEMENT le script, sans commentaires.`;

      if (!process.env.OPENAI_API_KEY) {
        // Mode simulation
        script = `${post.hook} ${post.title}. ${post.cta} Découvrez comment dès maintenant !`;
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
              temperature: 0.8,
            }),
          },
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || "Erreur OpenAI");
        }

        const data = await response.json();
        script = data.choices[0].message.content;
      }
    }

    let videoUrl = "";

    // Appel à Runway ML (ou simulateur)
    if (!process.env.RUNWAY_API_KEY) {
      // Mode simulation - vidéo placeholder
      videoUrl =
        "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
    } else {
      try {
        const runwayResponse = await fetch(
          "https://api.runwayml.com/v1/generate",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.RUNWAY_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              prompt: script,
              image: imageUrl || null,
              duration: 4,
              fps: 24,
              aspect_ratio: "1:1",
            }),
          },
        );

        if (!runwayResponse.ok) {
          const error = await runwayResponse.json();
          throw new Error(error.message || "Erreur Runway ML");
        }

        const runwayData = await runwayResponse.json();
        videoUrl = runwayData.output?.url;

        if (!videoUrl) {
          throw new Error("Aucune vidéo générée");
        }
      } catch (runwayError) {
        console.error("Erreur Runway:", runwayError);
        videoUrl =
          "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
      }
    }

    // Sauvegarder dans la base
    const { data: existing } = await supabase
      .from("post_skeleton")
      .select("video_url, video_script")
      .eq("id", post.id)
      .single();

    if (existing) {
      await supabase
        .from("post_skeleton")
        .update({
          video_url: videoUrl,
          video_script: script,
          status_video: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", post.id);
    } else {
      await supabase
        .from("post_skeleton")
        .update({
          video_url: videoUrl,
          video_script: script,
          status_video: "completed",
        })
        .eq("id", post.id);
    }

    return NextResponse.json({
      success: true,
      videoUrl,
      script,
      duration: 4,
    });
  } catch (error) {
    console.error("Erreur generate-video-advanced:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
