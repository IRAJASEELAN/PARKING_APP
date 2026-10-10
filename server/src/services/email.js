export function getEmailConfiguration() {
  return { provider: process.env.RESEND_API_KEY && process.env.EMAIL_FROM ? "resend" : "disabled" };
}

export async function sendPasswordResetEmail(email, token) {
  const { provider } = getEmailConfiguration();
  if (provider !== "resend") throw new Error("Password reset email is not configured");
  const origin = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");
  const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(token)}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [email],
      subject: "Reset your ParkFlow password",
      text: `Use this link to reset your ParkFlow password. It expires in one hour: ${resetUrl}`,
      html: `<p>Use the link below to reset your ParkFlow password. It expires in one hour.</p><p><a href="${resetUrl}">Reset password</a></p><p>If you did not request this, you can ignore this message.</p>`,
    }),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`Email delivery failed with ${response.status}`);
  return true;
}
