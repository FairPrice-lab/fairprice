const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function computeVerdict({ price, quoteText }) {
  const p = Number(price);
  if (!Number.isNaN(p) && p > 0) {
    if (p < 1000) return "likely fair/low";
    if (p < 5000) return "likely fair";
    return "possibly high";
  }
  if (quoteText && quoteText.trim().length > 10) return "needs price confirmation";
  return "needs price or quote text";
}

async function verifyAccess(sessionId) {
  if (!sessionId) return { ok: false };

  const s = await stripe.checkout.sessions.retrieve(sessionId);

  // One-time payment
  if (s.mode === "payment" && s.payment_status === "paid") {
    return { ok: true, access: "once" };
  }

  // Subscription checkout completed → verify subscription status
  if (s.mode === "subscription" && s.status === "complete" && s.subscription) {
    const sub = await stripe.subscriptions.retrieve(String(s.subscription));
    if (sub && (sub.status === "active" || sub.status === "trialing")) {
      return { ok: true, access: "sub" };
    }
  }

  return { ok: false };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const body = req.body || {};
    const { mode, session_id, category, zip, price, quoteText } = body;

    const verdict = computeVerdict({ price, quoteText });

    // FREE preview
    if (mode !== "full") {
      return res.status(200).json({
        preview: true,
        verdict,
        note: "Preview only. Pay $6.99 for the full report or subscribe for unlimited.",
        inputs: { category, zip, price, hasText: !!quoteText, hasFile: !!body.fileBase64 }
      });
    }

    // FULL report requires payment verification
    const access = await verifyAccess(session_id);
    if (!access.ok) return res.status(403).json({ error: "Payment required." });

    // Full report (placeholders — you can upgrade later)
    return res.status(200).json({
      preview: false,
      access: access.access, // "once" | "sub"
      verdict,
      full_report: {
        market_range: "TODO",
        percentile: "TODO",
        negotiation_tips: "TODO"
      }
    });
  } catch (e) {
    return res.status(500).json({ error: "Server error", detail: String(e?.message || e) });
  }
};
