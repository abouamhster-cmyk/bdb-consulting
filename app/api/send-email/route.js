import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "@/lib/supabase";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  try {
    const { to, subject, html, userId } = await request.json();

    // Envoi réel
    const { data, error } = await resend.emails.send({
      from: "BDB Consulting <noreply@ton-domaine.com>",
      to,
      subject,
      html,
    });

    if (error) throw error;

    // Log en base
    await supabase.from("email_logs").insert({
      user_id: userId,
      to,
      subject,
      status: "sent",
      message_id: data?.id,
      sent_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, messageId: data?.id });
  } catch (error) {
    console.error("Erreur email:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
