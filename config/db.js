const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

exports.connect = ()=>{
    mongoose.connect(process.env.MONGODB_URI)
    .then(()=>{
        console.log("DB Connected.");
    })
    .catch((error)=>{
        console.log("Unable to connect DB");
        console.log("Error", error);
        process.exit(1);
    })
}