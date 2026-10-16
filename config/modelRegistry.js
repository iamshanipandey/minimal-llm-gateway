const modelRegistry = {
    "gemini-3.5-flash-lite": {
        provider: "Gemini",
        inputPricePerMillion: 100,
        outputPricePerMillion: 200,
        maxOutputTokens: 4096
    },
    "gpt-4.1": {
        provider: "OpenAI",
        inputPricePerMillion: 0.03,
        outputPricePerMillion: 0.06,
        maxOutputTokens: 4096
    },
    "claude-sonnet-4-5": {
        provider: "Claude",
        inputPricePerMillion: 0.03,
        outputPricePerMillion: 0.06,
        maxOutputTokens: 4096
    }
};

module.exports = modelRegistry;