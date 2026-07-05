export default async function handler(req, res) {
    console.log("BODY:", req.body);

    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    try {

        const { intent } = req.body;

        if (!intent) {
            return res.status(400).json({
                error: "Intent is required."
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
You are an AI Listener Intent Interpreter.

You DO NOT recommend music.

You ONLY interpret the user's intent into a Listener Frame.

Return ONLY valid JSON.

Energy, Tempo, Novelty and Warmth MUST be integers between 1 and 10.

Region must be one of:

Tamil
Telugu
Hindi
Malayalam
or null.

Genre Lean should contain at most 3 genres.

Available genres:

Kollywood melody
Tamil indie
Tamil folk
Telugu melody
Telugu dance
Telugu folk
Malayalam soul
Malayalam indie
Malayalam lo-fi
Hindi indie
Hindi lo-fi
Bollywood
Ambient raga
Carnatic fusion
Hindustani fusion
Ghazal

Return EXACTLY this schema:

{
  "mood":"",
  "activity":"",
  "energyNum":5,
  "tempoNum":5,
  "noveltyNum":5,
  "warmthNum":5,
  "genreLean":[],
  "region":null,
  "goal":"",
  "reasoning":""
}
`
                        },

                        {
                            role: "user",
                            content: intent
                        }

                    ]

                })

            }

        );

        if (!response.ok) {

            throw new Error("OpenRouter request failed");

        }

        const data = await response.json();

        const frame = JSON.parse(
            data.choices[0].message.content
        );

        return res.status(200).json(frame);

    }

    catch (err) {

        return res.status(500).json({
            error: "Unable to interpret intent."
        });

    }

}
