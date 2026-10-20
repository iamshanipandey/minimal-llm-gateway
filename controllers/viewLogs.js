const crypto = require("crypto");
const UsageLog = require("../models/UsageLog");
const User = require("../models/User");

exports.requestHistory = async (req, res)=>{
    try
    {
        const {key} = req.body;
        
        // Pagination parameters
        const {page = 1, limit = 10} = req.query;if (
            !Number.isInteger(page) || page < 1 ||
            !Number.isInteger(limit) || limit < 1 || limit > 100
        )
        {
            return res.status(400).json({
             success: false,
             message: "Page must be positive and limit must be between 1 and 100"
            });
        }
        
        if(!key)
        {
            return res.status(400).json({
                success : false,
                message : "Missing key in request body"
            });
        }

        const hashedKey = crypto.createHash("sha256")
            .update(key)
            .digest("hex");
        
        // check if user exist
        const user = await User.findOne({virtualKeyHash: hashedKey});
        if(!user)
        {
            return res.status(404).json({
                success : false,
                message : "User not found"
            });
        }

        // Implement pagination
        const skip = (page - 1) * limit;

        // Fetch logs for the user with pagination

        const [logs, totalLogs] = await Promise.all([
            UsageLog.find({userId : user._id})
            .sort({createdAt: -1})
            .skip(skip)
            .limit(parseInt(limit)),

            UsageLog.countDocuments({userId : user._id})
        ]) 

        return res.status(200).json({
            success : true,
            data : logs,
            pagination : {
                currentPage : parseInt(page),
                totalPages : Math.ceil(totalLogs / limit),
                totalLogs : totalLogs,
                limit : parseInt(limit)
            }
        });
    }
    catch(err)
    {
        console.error("Error fetching request history:", err);
        return res.status(500).json({
            success : false,
            message : "Server error"
        });
    }
}

exports.usageSummary = async (req, res)=>{
    try
    {
        const {key} = req.body;
        
        if(!key)
        {
            return res.status(400).json({
                success : false,
                message : "Missing key in request body"
            });
        }

        const hashedKey = crypto.createHash("sha256")
            .update(key)
            .digest("hex"); 
        
        const user = await User.findOne({virtualKeyHash: hashedKey});
        if(!user)
        {
            return res.status(404).json({
                success : false,
                message : "User not found"
            });
        }

        const totalUsage = await UsageLog.aggregate([
            { $match: { userId: user._id } },
            {
                $group: {
                    _id: null,
                    totalRequests: { $sum: 1 },
                    successfulRequests: { $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] } },
                    failedRequests: { $sum: { $cond: [{ $eq: ["$status", "failure"] }, 1, 0] } },
                    totalInputTokens: { $sum: "$inputTokens" },
                    totalOutputTokens: { $sum: "$outputTokens" },
                    totalCost: { $sum: "$totalCost" },
                    totalTokenCount: { $sum: "$totalTokens" }
                }
            }
        ]);

        return res.status(200).json({
            success: true,
            data: totalUsage[0] || {
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                totalInputTokens: 0,
                totalOutputTokens: 0,
                totalCost: 0,
                totalTokenCount: 0
            }
        });
    }
    catch(err)
    {
        console.error("Error fetching usage summary:", err);
        return res.status(500).json({
            success : false,
            message : "Server error"
        });
    }
}

exports.requestDetails = async (req, res)=>{
    try
    {
        const {requestId, key} = req.params;

        if(!requestId || !key)
        {
            return res.status(400).json({
                success : false,
                message : "Missing requestId or key in request parameters"
            });
        }

        const hashedKey = crypto.createHash("sha256")
            .update(key)
            .digest("hex");
        
        const user = await User.findOne({virtualKeyHash: hashedKey});
        if(!user)
        {
            return res.status(404).json({
                success : false,
                message : "User not found"
            });
        }

        const log = await UsageLog.findOne({requestId: requestId, userId: user._id});
        if(!log)
        {
            return res.status(404).json({
                success : false,
                message : "Request log not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: log
        });
        

    }
    catch(err)
    {
        console.error("Error fetching request details:", err);
        return res.status(500).json({
            success : false,
            message : "Server error"
        });
    }
}
