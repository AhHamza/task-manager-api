const mongoose = require('mongoose')

// /* This file connects to the db */

// mongoose.set('strictQuery', true); // ✅ keeps current behavior
// mongoose.connect(process.env.MONGODB_URL, {
//     useNewUrlParser: true,
// })



const uri = "mongodb+srv://ahmedhhamza:01068357781@cluster0.cildw9z.mongodb.net/mydb?retryWrites=true&w=majority";

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("✅ Connected to MongoDB Atlas"))
    .catch((err) => console.error("❌ Connection error:", err));


