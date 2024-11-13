require("dotenv").config();
const express = express();
const bodyParser = require("body-parser");

const app = express();
const port = process.env.PORT || 5000;

app.use(bodyParser.json());

const userRoutes = require("./routes/userRoutes")

app.get("/", (req,res)=>{
    res.send("Chat application is running");
});

app.listen(PORT, ()=>{
    console.log(`Server is running on http://localhost:${PORT}`);
});

