    const dotenv = require("dotenv");
    const User = require("../models/User");
    dotenv.config();
    const crypto = require("crypto");
    const modelRegistry = require("../config/modelRegistry");
    const { Gemini, countGeminiTokens } = require("../controllers/llmCall");
    const calculateCost = require("../utils/calculateCost");

    exports.chatController = async(req, res)=>{
        try
        {
            const {key, llmModel, question} = req.body;

            //Validation
            if(!key || !llmModel || !question)
            {
                return res.status(400).json({
                    success : false,
                    message : "All Fields are required",
                })
            }

            const hashedKey = crypto
                            .createHash("sha256")
                            .update(key)
                            .digest("hex");
            
            // Check if user exist
            const user = await User.findOne({virtualKeyHash: hashedKey});
            if(!user)
            {
                return res.status(403).json({
                    success : false,
                    message : "Unable to find User, Please provide valid key",
                })
            }

            //finding provider
            const modelConfig = modelRegistry[llmModel];

            if (!modelConfig) {
            return res.status(400).json({
                success: false,
                message: "Unsupported model"
            });
            }
            
            const provider = modelConfig.provider;
            const providers = {
                Gemini,
            }

            // calculate estimated input tokens and cost
            const estimatedInputTokens = await countGeminiTokens(llmModel, question);
            const estimatedInputCost = (estimatedInputTokens * modelConfig.inputPricePerMillion) / 1_000_000;

            if(estimatedInputCost > (user.budget - user.spent - user.reserved)) {
                return res.status(402).json({
                    success : false,
                    message : "Insufficient budget to cover the input cost. Please add funds to continue.",
                    estimatedInputCost : estimatedInputCost,
                    remainingBudget : user.budget - user.spent - user.reserved
                })
            }


            // calculate tokens that can be generated based on remaining budget
            const remainingBudget = user.budget - user.spent - user.reserved - estimatedInputCost;
            const maxOutputTokens = Math.floor((remainingBudget * 1_000_000) / modelConfig.outputPricePerMillion);

            const effectiveMaxOutputTokens = Math.min(modelConfig.maxOutputTokens, maxOutputTokens);

            if(effectiveMaxOutputTokens <= 0)
            {
                return res.status(402).json({
                    success : false,
                    message : "Insufficient budget to generate any output tokens. Please add funds to continue.",
                })
            }

            //total request cost
            const totalEstimatedCost = estimatedInputCost + (effectiveMaxOutputTokens * modelConfig.outputPricePerMillion) / 1_000_000;
            
            // reserve budget for the request
            const updateReserved = await User.findOneAndUpdate(
                {
                    virtualKeyHash: hashedKey,
                    $expr : {
                        $gte : [
                        { $subtract : ["$budget", {$add : ["$spent", "$reserved"]}]}, totalEstimatedCost
                        ]
                    }
                },
                {
                    $inc : {reserved : totalEstimatedCost},
                },
                { new: true 
                }
            )

        
            if(!updateReserved)
            {
                return res.status(402).json({
                    success : false,
                    message : "Insufficient budget for this request",
                    totalEstimatedCost : totalEstimatedCost,
                    estimatedInputCost : estimatedInputCost,
                })
            }

            // Call the appropriate provider function
            const result = await providers[provider](llmModel, question, effectiveMaxOutputTokens);

            if(!result || !result.usage)
            {
                // Release the reserved budget
                await User.findOneAndUpdate(
                    {
                        virtualKeyHash: hashedKey
                    },
                    {
                        $inc : {reserved : -totalEstimatedCost},
                    },
                    { new: true }
                )
                return res.status(502).json({
                    success : false,
                    message : "LLM provider returned an invalid response.",
                })
            }

            // Calculate cost
            const usage = result.usage;
            const cost = calculateCost(usage, modelConfig);

            // Update user's spent amount
            const updateUser = await User.findOneAndUpdate(
                {
                    virtualKeyHash: hashedKey
                },
                {
                    $inc : {spent : cost.totalCost, reserved: -totalEstimatedCost},
                    
                },
                { new: true }
            )

            if(!updateUser)
            {
                return res.status(500).json({
                    success : false,
                    message : "Unable to update user budget",
                })
            }

            return res.status(200).json({
                success : true,
                text : result.text,
                inputTokens : cost.inputTokens,
                outputTokens : cost.outputTokens,
                totalTokens : cost.totalTokens,
                inputCost : cost.inputCost,
                outputCost : cost.outputCost,
                totalCost : cost.totalCost,
                totalSpent : updateUser.spent,
                budget : updateUser.budget,
                remainingBudget : updateUser.budget - updateUser.spent,
                model : llmModel,
            })
        }
        catch(error)
        {
            console.log(error.message);
            return res.status(500).json({
                success : false,
                message : "Server error",
            })
        }
    }