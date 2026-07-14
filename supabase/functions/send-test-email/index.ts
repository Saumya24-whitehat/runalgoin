import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, message } = await req.json();
    if (!to) throw new Error("Missing 'to'");

    const emailResponse = await resend.emails.send({
      from: "OptionWorld <noreplay@mail.optionworld.tech>",
      to: [to],
      subject: subject || "Test email from OptionWorld",
      html: `
        <h2>Hello from OptionWorld 👋</h2>
        <p>${(message || "This is a test email confirming that mail.optionworld.tech is sending correctly.").replace(/\n/g, "<br />")}</p>
        <hr />
        <p style="color:#666;font-size:12px;">Sent from mail.optionworld.tech via Resend.</p>
      `,
    });

    console.log("Test email sent:", emailResponse);
    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("send-test-email error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
