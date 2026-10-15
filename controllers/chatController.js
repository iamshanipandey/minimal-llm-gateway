const dotenv = require("dotenv");
const User = require("../models/User");
dotenv.config();
const crypto = require("crypto");
const modelRegistry = require("../config/modelRegistry");
const { Gemini } = require("../controllers/llmCall");

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

        //check if user have balance to make request
        if(user.spent >= user.budget)
        {
            return res.status(402).json({
                success : false,
                message : "Your budget has been exhausted. Please add funds to continue.",
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

        const result = await providers[provider](llmModel, question);

        if(!result)
        {
            return res.status(500).json({
                success : false,
                message : "Something went wrong, unable to generate response",
            })
        }
        return res.status(200).json({
            success : true,
            text : result,
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