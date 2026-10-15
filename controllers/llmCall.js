const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

async function Gemini(model, message) {
  const response = await ai.models.generateContent({
    model,
    contents: message
  });

  return {
    text: response.text,
    usage: response.usageMetadata
  };
}

module.exports = { Gemini };
