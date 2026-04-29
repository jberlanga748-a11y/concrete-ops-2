export class EmailConfigurationError extends Error {
  constructor(message = "Email sending is not configured yet.") {
    super(message);
    this.name = "EmailConfigurationError";
    this.status = 503;
  }
}

export class EmailDeliveryError extends Error {
  constructor(message = "Estimate email could not be sent. Please try again.") {
    super(message);
    this.name = "EmailDeliveryError";
    this.status = 502;
  }
}

function envText(env, key) {
  return String(env?.[key] || "").trim();
}

export function getEmailConfig(env = process.env) {
  const provider = envText(env, "EMAIL_PROVIDER").toLowerCase();
  const from = envText(env, "EMAIL_FROM");
  const replyTo = envText(env, "EMAIL_REPLY_TO_DEFAULT");
  const apiKey = envText(env, "EMAIL_API_KEY");
  const apiUrl = envText(env, "EMAIL_API_URL") || "https://api.resend.com/emails";
  const configured = provider === "resend" && Boolean(from && apiKey);

  return {
    provider,
    from,
    replyTo,
    apiKey,
    apiUrl,
    configured,
  };
}

export function isEstimateEmailConfigured(env = process.env) {
  return getEmailConfig(env).configured;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function textToHtml(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => (line.trim() ? escapeHtml(line) : "&nbsp;"))
    .map((line) => `<p>${line}</p>`)
    .join("");
}

export async function sendEstimateEmail({
  to,
  subject,
  text,
  replyTo = "",
} = {}, env = process.env) {
  const config = getEmailConfig(env);
  if (!config.configured) {
    throw new EmailConfigurationError();
  }

  if (!to || !subject || !text) {
    throw new EmailDeliveryError("Estimate email is missing a recipient, subject, or message.");
  }

  const payload = {
    from: config.from,
    to: [to],
    subject,
    text,
    html: textToHtml(text),
    ...(replyTo || config.replyTo ? { reply_to: replyTo || config.replyTo } : {}),
  };

  let response;
  try {
    response = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new EmailDeliveryError();
  }

  const responsePayload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new EmailDeliveryError(responsePayload?.message || responsePayload?.error || undefined);
  }

  return {
    provider: config.provider,
    providerMessageId: String(responsePayload?.id || responsePayload?.messageId || "").trim(),
  };
}
