import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error(
    "The OPENAI_API_KEY environment variable is missing or empty; either provide it, or instantiate the OpenAI client with an apiKey option, like new OpenAI({ apiKey: 'My API Key' })."
  );
}
const openai = new OpenAI({ apiKey });

export async function callOpenAIAudit(
  systemPrompt: string,
  userPrompt: string
) {
  // Call OpenAI API with the prompts and return the result
  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0,
    max_tokens: 4000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
  const analysis = response.choices[0]?.message?.content;
  if (!analysis) {
    throw new Error("Failed to analyze content");
  }
  try {
    const cleanedAnalysis = analysis.trim().replace(/^```json\s*|\s*```$/g, "");
    return JSON.parse(cleanedAnalysis);
  } catch (error) {
    console.error("Failed to parse OpenAI response:", analysis);
    throw new Error("Failed to parse analysis response");
  }
}
