const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name : {
        type : String,
        required : true,
        trim : true,
    },
    virtualKeyHash : {
        type : String,
        required : true,
        unique : true, 
    },
    budget : {
        type : Number,
        required : true,
        min : 0
    },
    spent : {
        type : Number,
        default : 0,
        min : 0,
    },
    isActive : {
        type : Boolean,
        default : true,
    }

}, {timestamps: true})

module.exports = mongoose.model("User", userSchema);