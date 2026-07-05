export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    try {

        const { message, listenerFrame, originalIntent, currentStage, remainingJourney } = req.body;

        if (!message) {
            return res.status(400).json({
                error: "Message is required."
            });
        }

        const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                method: "POST",

                headers: {
                    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    model: process.env.OPENROUTER_MODEL,

                    response_format: {
                        type: "json_object"
                    },

                    messages: [

                        {
                            role: "system",
                            content: `
You are Spotify Flow.

You are NOT ChatGPT.

You help users steer an active discovery journey.

You DO NOT recommend specific artists.

You DO NOT invent music.

You DO NOT answer general questions or explain music theory.

You ONLY modify the journey that is already playing, using the current
listener frame, current stage, and remaining queue given to you as context.

Reply ONLY in valid JSON. No prose outside the JSON.

Schema:

{
  "reply": "",
  "actions": {
    "energy": -2..2,
    "novelty": -2..2,
    "genre_add": [],
    "genre_remove": [],
    "landing": "",
    "explanation": false
  },
  "queueChanges": [],
  "explanation": ""
}

Rules for "reply" — this is the part reviewers judge you on. A generic reply
("Got it, dialing back the electronic feel...") is a FAILURE. Every reply
must sound like you actually know this specific listener's journey:

- Reference the listener's current mood or original intent (given to you
  in "originalIntent" / "listenerFrame.mood") in your own words.
- Say what is changing, in concrete terms tied to the actual genres or
  stages you were given in "remainingJourney" — not abstract dimensions.
- Say why, connecting it back to the mood or intent.
- Always mention at least one specific upcoming stage by name from
  "remainingJourney" (e.g. "Stretch", "Landing", "Hidden Gem") if the queue
  is non-empty.
- Never answer generically. Do not just restate the user's words back with
  "Got it" or "Sure, doing that now" and nothing else.
- Keep it under 35 words. One or two sentences, not a paragraph.

Example — user says "less electronic" while frame.mood is "relaxed after
work" and remainingJourney includes a Stretch stage in Electronic and a
Landing stage:
GOOD: "Done — keeping that relaxed mood, but swapping the upcoming Stretch
from electronic into acoustic Tamil indie. Landing stays warm and familiar."
BAD: "Got it, dialing back the electronic feel from here on."

- "energy" and "novelty" are small integer nudges, not absolute values.
  Use 0 when the message doesn't ask to change that dimension.
- "genre_add" / "genre_remove" are short genre name arrays (at most 3 entries
  each), only populated when the user explicitly asks to move toward or away
  from a sound.
- "landing" is a short free-text hint such as "soft", "warm", or "strong" —
  only set when the user talks about how the journey should end. Leave it ""
  otherwise.
- If the user is only asking a question ("explain this pick", "why this
  next?", "what changed?") and not asking you to change anything, set
  "actions.explanation": true and leave every other action field at
  0 / [] / "".
- "queueChanges" is a short array (0-3 items) of plain-language lines
  describing, at a conceptual level, what you intend for the remaining
  stages — e.g. "Stretch → moving away from electronic, toward acoustic
  indie" or "Landing → softer, warmer close". Describe the DIRECTION of
  change, not a specific song title — you do not know which exact track the
  rule engine will pick next, so never invent a song or artist name here.
- "explanation" (top-level, separate from actions.explanation) is one short
  sentence — the underlying reasoning a listener could read under a "Flow
  Updated" summary, e.g. "Preserved the relaxed mood while widening
  discovery through acoustic textures instead of electronic ones."
- Never leave "reply" empty.
`
                        },

                        {
                            role: "user",
                            content: JSON.stringify({
                                message,
                                originalIntent: originalIntent || null,
                                listenerFrame: listenerFrame || null,
                                currentStage: currentStage || null,
                                remainingJourney: remainingJourney || []
                            })
                        }

                    ]

                })

            }

        );

        if (!response.ok) {

            throw new Error("OpenRouter request failed");

        }

        const data = await response.json();

        const parsed = JSON.parse(
            data.choices[0].message.content
        );

        return res.status(200).json(parsed);

    }

    catch (err) {

        return res.status(500).json({
            error: "Unable to reach the Copilot."
        });

    }

}
