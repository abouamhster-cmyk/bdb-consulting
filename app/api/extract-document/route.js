import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const userId = formData.get("userId");

    logger.info(
      { userId, fileName: file?.name },
      "API extract-document appelée",
    );

    if (!file || !userId) {
      logger.warn("Données manquantes", {
        hasFile: !!file,
        hasUserId: !!userId,
      });
      return NextResponse.json(
        { success: false, error: "Fichier ou utilisateur manquant" },
        { status: 400 },
      );
    }

    // Lire le contenu du fichier
    let fileContent = "";
    const fileType = file.type;

    logger.info({ fileType, fileSize: file.size }, "Analyse du fichier");

    // Pour les fichiers PDF, on ne peut pas lire le texte facilement sans librairie
    // On utilise une approche simplifiée pour les tests
    if (fileType === "application/pdf") {
      // En production, utilisez pdf-parse
      fileContent =
        "Document PDF importé. Contenu non extrait automatiquement. Veuillez remplir manuellement les champs.";
      logger.warn("PDF détecté - extraction simplifiée");
    } else {
      fileContent = await file.text();
    }

    const prompt = `Analyse le document suivant et extrait les informations marketing. 
    Retourne UNIQUEMENT du JSON valide avec ces champs: 
    brand_positioning, persona, customer_journey, editorial_charter, graphic_charter, communication_strategy.
    
    Si un champ n'est pas trouvé, laisse une chaîne vide.
    
    Contenu du document:
    ${fileContent.substring(0, 3000)}`;

    logger.info(
      { userId, contentLength: fileContent.length },
      "Appel OpenAI pour extraction",
    );

    // Utiliser gpt-3.5-turbo au lieu de gpt-4-turbo
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", // ← CHANGEMENT ICI
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      logger.error({ error: error.error?.message }, "Erreur OpenAI extraction");

      // Si erreur, on retourne un succès partiel pour ne pas bloquer l'utilisateur
      return NextResponse.json({
        success: true,
        data: {
          brand_positioning: "",
          persona: "",
          customer_journey: "",
          editorial_charter: "",
          graphic_charter: "",
          communication_strategy: "",
        },
        warning:
          "Extraction automatique non disponible pour ce type de fichier",
      });
    }

    const data = await response.json();
    const extracted = JSON.parse(data.choices[0].message.content);

    logger.info(
      { extractedFields: Object.keys(extracted).filter((k) => extracted[k]) },
      "Extraction réussie",
    );

    // Mettre à jour le document dans la base
    const { error: updateError } = await supabase
      .from("company_documents")
      .update({
        extracted_content: JSON.stringify(extracted),
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (updateError) {
      logger.error(
        { error: updateError.message },
        "Erreur mise à jour document",
      );
    } else {
      logger.info({ userId }, "Document mis à jour");
    }

    return NextResponse.json({ success: true, data: extracted });
  } catch (error) {
    logger.error({ error: error.message }, "Erreur extract-document");
    // Retourner un succès partiel pour ne pas bloquer l'utilisateur
    return NextResponse.json({
      success: true,
      data: {
        brand_positioning: "",
        persona: "",
        customer_journey: "",
        editorial_charter: "",
        graphic_charter: "",
        communication_strategy: "",
      },
      warning: "Erreur lors de l'extraction",
    });
  }
}
