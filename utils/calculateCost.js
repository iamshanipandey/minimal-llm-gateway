const calculateCost = (usage, modelConfig)=>{
    const inputTokens = usage.promptTokenCount || 0;
    const outputTokens = usage.candidatesTokenCount || 0;

    const inputCost = (inputTokens * modelConfig.inputPricePerMillion) / 1_000_000;
    const outputCost = (outputTokens * modelConfig.outputPricePerMillion) / 1_000_000;

    return{
        inputTokens,
        outputTokens,
        totalTokens: usage.totalTokenCount || 0,
        inputCost,
        outputCost,
        totalCost: inputCost + outputCost
    };

}

module.exports = calculateCost;