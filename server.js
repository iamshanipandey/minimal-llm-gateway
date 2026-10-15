const express = require("express");
const app = express();
const dotenv = require("dotenv");
dotenv.config();
const database = require("./config/db");
const chatRoutes = require("./routes/chatRoutes");

const PORT = process.env.PORT || 5000;

//DB Connection
database.connect();

app.use(express.json());

//apis

app.use("/api/v1", chatRoutes);

app.get("/", (req, res)=>{
    return res.status(200).json({
        success :true,
        message : "Server is up and running.",
    })
})

app.listen(PORT, ()=>{
    console.log(`App is running at PORT ${PORT}`)
})