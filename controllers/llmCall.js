const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

async function Gemini(model, message, maxOutputTokens) {
  const response = await ai.models.generateContent({
    model,
    contents: message,
    config: {
      maxOutputTokens
    }
  });

  return {
    text: response.text,
    usage: response.usageMetadata
  };
}

async function countGeminiTokens(model, message) {
    const response = await ai.models.countTokens({
        model: model,
        contents: message
    });

    return response.totalTokens;
}

module.exports = { Gemini, countGeminiTokens };
