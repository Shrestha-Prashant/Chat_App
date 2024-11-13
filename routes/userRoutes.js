const express = require("express");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs")

const router = express.Router();

router.post("/register", async(req,res)=>{
    const {username,password} = req.body;
    try{
        const user = await User.create(username,password);
        res.status(201).json({message:"User registered", user});
    }catch(error){
        res.status(500).json({error: "Registration failed"});
    }
});

router.post("/login", async (req, res) => {
    const { username, password } = req.body;
    try {
      const user = await User.findByUsername(username);
      if (!user) {
        console.log("User not found");
        return res.status(401).json({ error: "Invalid credentials" });
      }
  
      const passwordMatch = await bcrypt.compare(password, user.password);
      console.log(passwordMatch)
      if (!passwordMatch) {
        console.log("Password does not match");
        return res.status(401).json({ error: "Invalid credentials" });
      }
  
      const token = jwt.sign({ userId: user.user_id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });
      res.json({ message: "Login successful", token });
    } catch (error) {
      console.error("Login error:", error.message);
      res.status(500).json({ error: "Login failed" });
    }
  });

module.exports = router;
