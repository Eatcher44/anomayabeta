import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
  // Storage path inside the bug-screenshots bucket (preferred).
  screenshotPath?: string;
  // Backward-compatible: older clients may still send a public URL.
  screenshotUrl?: string;
}

const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;

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
    // Require a valid authenticated user (verify_jwt defaults to false on Lovable functions).
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const authedUserId = userData.user.id;

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const { type, subject, message, steps, userId, userEmail, route, screenshotPath, screenshotUrl }: FeedbackRequest = await req.json();

    if (isRateLimited(authedUserId)) {
      return new Response(JSON.stringify({ error: "Trop de messages envoyés. Réessayez dans une heure." }), {
        status: 429,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Generate a short-lived signed URL for the screenshot (private bucket).
    let signedScreenshotUrl: string | null = null;
    if (screenshotPath) {
      // Only allow paths owned by the authenticated user (path prefix is userId/...).
      const ownerSegment = screenshotPath.split("/")[0];
      if (ownerSegment === authedUserId) {
        const admin = createClient(supabaseUrl, serviceKey);
        const { data: signed } = await admin
          .storage
          .from("bug-screenshots")
          .createSignedUrl(screenshotPath, 60 * 60 * 24 * 7); // 7 days
        signedScreenshotUrl = signed?.signedUrl ?? null;
      }
    } else if (screenshotUrl) {
      signedScreenshotUrl = screenshotUrl;
    }

    const prefix = type === "bug" ? "BUG" : "Feedback";
    const emailSubject = `[ANOMAYA BETA] ${prefix} – ${subject || "Sans sujet"}`;
    const timestamp = new Date().toISOString();

    const body = `
Type: ${type}
User ID: ${userId || authedUserId}
User email: ${userEmail || "N/A"}
Route: ${route || "N/A"}
Timestamp: ${timestamp}

Message:
${message}

${steps ? `Steps:\n${steps}` : ""}

${signedScreenshotUrl ? `Screenshot:\n${signedScreenshotUrl}` : ""}
    `.trim();

    const htmlBody = body.replace(/\n/g, "<br>").replace(
      signedScreenshotUrl || "",
      signedScreenshotUrl ? `<a href="${signedScreenshotUrl}">${signedScreenshotUrl}</a>` : ""
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
      return new Response(JSON.stringify({ error: "Email send failed" }), {
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
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
