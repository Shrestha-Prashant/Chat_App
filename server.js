import dotenv from "dotenv";
dotenv.config();
import express from "express";
import bodyParser from "body-parser";

const app = express();
const port = process.env.PORT || 5000;

app.use(bodyParser.json());

import userRoutes from "./routes/userRoutes.js"
import chatRoutes from "./routes/chatRoutes.js"

app.use('/api/users',userRoutes)
app.use('/api/chats',chatRoutes)

app.get("/", (req,res)=>{
    res.send("Chat application is running");
});

app.listen(port, ()=>{
    console.log(`Server is running on http://localhost:${port}`);
});

