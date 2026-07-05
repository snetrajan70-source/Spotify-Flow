export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    try {

        const { message, listenerFrame, currentStage, remainingJourney } = req.body;

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
  }
}

Rules:

- "reply" is a short, warm, first-person sentence confirming what you're doing
  (or, if the user only asked a question, answering it briefly).
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
  "explanation": true and leave every other action field at 0 / [] / "".
- Never leave "reply" empty.
`
                        },

                        {
                            role: "user",
                            content: JSON.stringify({
                                message,
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
