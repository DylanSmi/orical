import Anthropic from "@anthropic-ai/sdk";

// The API key is read from the ANTHROPIC_API_KEY environment variable,
// which you set in Vercel → Settings → Environment Variables. It never
// reaches the browser.
const client = new Anthropic();

const SYSTEM_PROMPT = `You are the Oracle: an ancient, cryptic source of divination.
The user asks you a question. You answer with EXACTLY ONE English word — no
punctuation, no explanation, no quotation marks, nothing else.

The word should feel like a genuine oracular response to their question: it may
be a direct answer (yes, no, soon, never) or an evocative, symbolic word they
must interpret (raven, ember, threshold, patience). Favour single, resonant
words. Never refuse; never say more than one word.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const question =
    req.body && typeof req.body.question === "string" ? req.body.question.trim() : "";

  if (!question) {
    res.status(400).json({ error: "Ask the Oracle a question first." });
    return;
  }

  try {
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 64,
      // A one-word answer needs no deliberation — disabling thinking keeps
      // the Oracle fast. (Allowed on Opus 5 at the default 'high' effort.)
      thinking: { type: "disabled" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: question }],
    });

    // Collect the text and reduce it to a single clean word.
    let text = "";
    for (const block of response.content) {
      if (block.type === "text") text += block.text;
    }
    const word =
      (text.trim().split(/\s+/)[0] || "").replace(/[^A-Za-z'’-]/g, "") || "silence";

    res.status(200).json({ word });
  } catch (err) {
    // Don't leak internals to the browser; the page falls back gracefully.
    res.status(500).json({ error: "The Oracle is silent." });
  }
}
