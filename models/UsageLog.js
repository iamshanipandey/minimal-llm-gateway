const mongoose = require("mongoose");

const usageLogSchema = new mongoose.Schema({
    userId : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",
        default : null,
    },
    requestId : {
        type : String,
        required : true,
        unique : true,
    },
    model : {
        type : String,
        required : true,   
        default : "unknown" 
    },
    provider : {
        type : String,   
        default : null,
    },
    inputTokens : {
        type : Number,
        required : true,
    },
    outputTokens : {
        type : Number,
        required : true,    
    },
    totalTokens : {
        type : Number,
        required : true,
    },
    inputCost : {
        type : Number,
        required : true,
    },
    outputCost : {
        type : Number,
        required : true,
    },
    totalCost : {
        type : Number,
        required : true,
    },
    status : {
        type : String,
        enum : ["success", "failure"],
        required: true
    },
    errorMessage : {
        type : String,
    },
}, {timestamps: true})

module.exports = mongoose.model("UsageLog", usageLogSchema);