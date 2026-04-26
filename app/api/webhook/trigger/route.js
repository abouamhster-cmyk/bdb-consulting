import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request) {
  try {
    const { userId, event, payload } = await request.json();

    // Récupérer les webhooks actifs pour cet événement
    const { data: webhooks } = await supabase
      .from("webhooks")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .contains("events", [event]);

    const results = [];

    for (const webhook of webhooks) {
      try {
        const response = await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Secret": webhook.secret,
          },
          body: JSON.stringify({
            event,
            timestamp: new Date().toISOString(),
            data: payload,
          }),
        });

        results.push({
          webhook: webhook.name,
          status: response.status,
          success: response.ok,
        });
      } catch (err) {
        results.push({
          webhook: webhook.name,
          error: err.message,
          success: false,
        });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
