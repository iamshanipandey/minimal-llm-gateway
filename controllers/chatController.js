    const dotenv = require("dotenv");
    const User = require("../models/User");
    dotenv.config();
    const crypto = require("crypto");
    const modelRegistry = require("../config/modelRegistry");
    const { Gemini, countGeminiTokens } = require("../controllers/llmCall");
    const calculateCost = require("../utils/calculateCost");
    const UsageLog = require("../models/UsageLog");

    exports.chatController = async(req, res)=>{
        let hashedKey = null;
        let totalEstimatedCost = null;
        let reserved = false;
        let user;

        // Generate a unique request ID for tracking
        let requestId = crypto.randomUUID();

        try
        {
            const {key, llmModel, question} = req.body;

            

            //Validation
            if(!key || !llmModel || !question)
            {
                await UsageLog.create({
                    userId : null,
                    requestId : requestId,
                    model : llmModel,
                    provider : null,
                    inputTokens : 0,
                    outputTokens : 0,
                    totalTokens : 0,
                    inputCost : 0,
                    outputCost : 0,
                    totalCost : 0,
                    status : "failure",
                    errorMessage : "All Fields are required",
                })
                return res.status(400).json({
                    success : false,
                    message : "All Fields are required",
                    requestId : requestId
                })
            }

            hashedKey = crypto
                            .createHash("sha256")
                            .update(key)
                            .digest("hex");
            
            // Check if user exist
            user = await User.findOne({virtualKeyHash: hashedKey});
            if(!user)
            {
                await UsageLog.create({
                    userId : null,
                    requestId : requestId,
                    model : llmModel,
                    provider : null,
                    inputTokens : 0,
                    outputTokens : 0,
                    totalTokens : 0,
                    inputCost : 0,
                    outputCost : 0,
                    totalCost : 0,
                    status : "failure",
                    errorMessage : "Invalid Key, User not found",
                })
                return res.status(403).json({
                    success : false,
                    message : "Unable to find User, Please provide valid key",
                    requestId : requestId
                })
            }

            //finding provider
            const modelConfig = modelRegistry[llmModel];

            if (!modelConfig) {

                await UsageLog.create({
                    userId : user._id,
                    requestId : requestId,
                    model : llmModel,
                    provider : null,
                    inputTokens : 0,
                    outputTokens : 0,
                    totalTokens : 0,
                    inputCost : 0,
                    outputCost : 0,
                    totalCost : 0,
                    status : "failure",
                    errorMessage : "Unsupported model",
                })
                return res.status(400).json({
                success: false,
                message: "Unsupported model",
                requestId : requestId
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
                await UsageLog.create({
                    userId : user._id,
                    requestId : requestId,
                    model : llmModel,
                    provider : provider,
                    inputTokens : 0,
                    outputTokens : 0,
                    totalTokens : 0,
                    inputCost : 0,
                    outputCost : 0,
                    totalCost : 0,
                    status : "failure",
                    errorMessage : "Insufficient budget to cover the input cost. Please add funds to continue.",
                })
                return res.status(402).json({
                    success : false,
                    message : "Insufficient budget to cover the input cost. Please add funds to continue.",
                    requestId : requestId,
                })
            }


            // calculate tokens that can be generated based on remaining budget
            const remainingBudget = user.budget - user.spent - user.reserved - estimatedInputCost;
            const maxOutputTokens = Math.floor((remainingBudget * 1_000_000) / modelConfig.outputPricePerMillion);

            const effectiveMaxOutputTokens = Math.min(modelConfig.maxOutputTokens, maxOutputTokens);

            if(effectiveMaxOutputTokens <= 0)
            {
                await UsageLog.create({
                    userId : user._id,
                    requestId : requestId,
                    model : llmModel,
                    provider : provider,
                    inputTokens : 0,
                    outputTokens : 0,
                    totalTokens : 0,
                    inputCost : 0,
                    outputCost : 0,
                    totalCost : 0,
                    status : "failure",
                    errorMessage : "Insufficient budget to generate any output tokens. Please add funds to continue.",
                })
                return res.status(402).json({
                    success : false,
                    message : "Insufficient budget to generate any output tokens. Please add funds to continue.",
                    requestId : requestId
                })
            }

            //total request cost
            totalEstimatedCost = estimatedInputCost + (effectiveMaxOutputTokens * modelConfig.outputPricePerMillion) / 1_000_000;
            
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
                await UsageLog.create({
                    userId : user._id,
                    requestId : requestId,
                    model : llmModel,
                    provider : provider,
                    inputTokens : 0,
                    outputTokens : 0,
                    totalTokens : 0,
                    inputCost : 0,
                    outputCost : 0,
                    totalCost : 0,
                    status : "failure",
                    errorMessage : "Insufficient budget for this request",
                })
                return res.status(402).json({
                    success : false,
                    message : "Insufficient budget for this request",
                    totalEstimatedCost : totalEstimatedCost,
                    estimatedInputCost : estimatedInputCost,
                    requestId : requestId,
                })
            }
            reserved = true;

            // Call the appropriate provider function
            const result = await providers[provider](llmModel, question, effectiveMaxOutputTokens);

            if(!result || !result.usage)
            {
                await UsageLog.create({
                    userId : user._id,
                    requestId : requestId,
                    model : llmModel,
                    provider : provider,
                    inputTokens : 0,
                    outputTokens : 0,
                    totalTokens : 0,
                    inputCost : 0,
                    outputCost : 0,
                    totalCost : 0,
                    status : "failure",
                    errorMessage : "LLM provider returned an invalid response.",
                })
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
                reserved = false;
                return res.status(502).json({
                    success : false,
                    message : "LLM provider returned an invalid response.",
                    requestId : requestId
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
                await UsageLog.create({
                    userId : user._id,
                    requestId : requestId,
                    model : llmModel,
                    provider : provider,
                    inputTokens : cost.inputTokens,
                    outputTokens : cost.outputTokens,
                    totalTokens : cost.totalTokens,
                    inputCost : cost.inputCost,
                    outputCost : cost.outputCost,
                    totalCost : cost.totalCost,
                    status : "failure",
                    errorMessage : "Unable to update user budget",
                })
                return res.status(500).json({
                    success : false,
                    message : "Unable to update user budget",
                    requestId : requestId
                })
            }
            reserved = false;


            await UsageLog.create({
                userId : user._id,
                requestId : requestId,
                model : llmModel,
                provider : provider,
                inputTokens : cost.inputTokens,
                outputTokens : cost.outputTokens,
                totalTokens : cost.totalTokens,
                inputCost : cost.inputCost,
                outputCost : cost.outputCost,
                totalCost : cost.totalCost,
                status : "success",
                errorMessage : null,
            })
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
                requestId : requestId
            })
        }
        catch(error)
        {
            // Release the reserved budget
            if(reserved && hashedKey && totalEstimatedCost)
            await User.findOneAndUpdate(
                {
                    virtualKeyHash: hashedKey
                },
                {
                    $inc : {reserved : -totalEstimatedCost},
            },
                { new: true }
            )

            await UsageLog.create({
                userId : user ? user._id : null,
                requestId : requestId,
                model : req.body.llmModel || "unknown",
                provider : null,
                inputTokens : 0,
                outputTokens : 0,
                totalTokens : 0,
                inputCost : 0,
                outputCost : 0,
                totalCost : 0,
                status : "failure",
                errorMessage : "Server error",
            })
            console.log(error.message);
            return res.status(500).json({
                success : false,
                message : "Server error",
                requestId : requestId,
            })
        }
    }