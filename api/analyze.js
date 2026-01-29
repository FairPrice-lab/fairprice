module.exports = async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "POST only" });
    }

    const body = req.body || {};
    const price = Number(body.price);

    // Simple placeholder verdict
    let verdict = "unknown";
    if (!Number.isNaN(price) && price > 0) {
      verdict = price < 1000 ? "likely fair/low" : price < 5000 ? "likely fair" : "possibly high";
    } else {
      verdict = "needs price (or text)";
    }

    return res.status(200).json({
      ok: true,
      verdict,
      note: "Preview only (backend is working).",
      received: {
        mode: body.mode || null,
        hasText: !!body.quoteText,
        hasFile: !!body.fileBase64,
        fileType: body.fileType || null,
        fileName: body.fileName || null
      }
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "Server error", detail: String(e?.message || e) });
  }
};
