const User = require("../models/User");
const crypto = require("crypto");
const database = require("../config/db");



const createKey = async ()=>{
    try
    {
        await database.connect();
        const randomValue = crypto.randomBytes(32);
        const key = randomValue.toString("hex");
        
        const hashedKey = await crypto.createHash("sha256").update(key).digest("hex");
      
        const newUser = await User.create({
            name : "dummy_user",
            virtualKeyHash : hashedKey,
            budget : 100,
        });

        if(!newUser)
        {
            console.log("Unable to create user");
            return;
        }
        console.log("User Created Successfully: ")
        console.log(newUser);
        console.log("Virtual Key : ", key);
        return;
    }
    catch(err)
    {
        console.log(err.message);
    }
}

createKey();