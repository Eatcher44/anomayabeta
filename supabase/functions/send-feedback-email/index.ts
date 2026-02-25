import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface FeedbackRequest {
  type: "feedback" | "bug";
  subject: string;
  message: string;
  steps?: string;
  userId?: string;
  userEmail?: string;
  route?: string;
  screenshotUrl?: string;
}

// Simple in-memory rate limiting (per function instance)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(userId) || []).filter(t => now - t < RATE_WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT) return true;
  timestamps.push(now);
  rateLimitMap.set(userId, timestamps);
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const { type, subject, message, steps, userId, userEmail, route, screenshotUrl }: FeedbackRequest = await req.json();

    // Rate limit check
    if (userId && isRateLimited(userId)) {
      return new Response(JSON.stringify({ error: "Trop de messages envoyés. Réessayez dans une heure." }), {
        status: 429,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const prefix = type === "bug" ? "BUG" : "Feedback";
    const emailSubject = `[ANOMAYA BETA] ${prefix} – ${subject || "Sans sujet"}`;
    const timestamp = new Date().toISOString();

    const body = `
Type: ${type}
User ID: ${userId || "N/A"}
User email: ${userEmail || "N/A"}
Route: ${route || "N/A"}
Timestamp: ${timestamp}

Message:
${message}

${steps ? `Steps:\n${steps}` : ""}

${screenshotUrl ? `Screenshot:\n${screenshotUrl}` : ""}
    `.trim();

    const htmlBody = body.replace(/\n/g, "<br>").replace(
      screenshotUrl || "",
      screenshotUrl ? `<a href="${screenshotUrl}">${screenshotUrl}</a>` : ""
    );

    const { error } = await resend.emails.send({
      from: "support@anomaya.app",
      to: ["support@anomaya.app"],
      subject: emailSubject,
      text: body,
      html: htmlBody,
    });

    if (error) {
      console.error("Resend error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
