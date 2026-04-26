import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    // Récupérer le token depuis l'en-tête Authorization
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Token manquant" }, { status: 401 });
    }

    // Appeler l'API Buffer pour récupérer les profils
    const response = await fetch("https://api.bufferapp.com/1/profiles.json", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.message || "Erreur API Buffer" },
        { status: response.status },
      );
    }

    const profiles = await response.json();

    // Formater les profils pour l'affichage
    const formattedProfiles = profiles.map((profile) => ({
      id: profile.id,
      service: profile.service,
      service_icon:
        profile.service === "twitter"
          ? "🐦"
          : profile.service === "facebook"
            ? "📘"
            : profile.service === "linkedin"
              ? "🔗"
              : "📷",
      username: profile.formatted_username || profile.service_username,
    }));

    return NextResponse.json({ profiles: formattedProfiles });
  } catch (error) {
    console.error("Erreur Buffer profiles:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
