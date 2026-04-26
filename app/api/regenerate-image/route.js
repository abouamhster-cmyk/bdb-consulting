import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase"; // ← alias

export async function POST(request) {
  try {
    const { calendarItem, strategyId } = await request.json();

    const { data: strategy } = await supabase
      .from("strategies")
      .select("graphic_charter, brand_positioning")
      .eq("id", strategyId)
      .single();

    // Prompt amélioré avec plus de contexte
    const imagePrompt = `Génère une image professionnelle pour illustrer ce post marketing :
    
    Sujet : ${calendarItem.title}
    Contexte : ${calendarItem.hook}
    
    Identité de la marque :
    - Positionnement : ${strategy?.brand_positioning?.substring(0, 100) || "Marque professionnelle"}
    - Style visuel : ${strategy?.graphic_charter || "Moderne, épuré, professionnel"}
    
    Format : 1024x1024, style social media.
    Qualité : haute résolution.
    Style : naturel et authentique.
    
    L'image doit être attrayante et cohérente avec l'identité de marque.`;

    const response = await fetch(
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
      },
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error?.message || "Erreur API" },
        { status: response.status },
      );
    }

    return NextResponse.json({
      success: true,
      imageUrl: data.data[0].url,
    });
  } catch (error) {
    console.error("Erreur regénération:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
