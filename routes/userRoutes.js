import express from "express"
import User from "../models/user.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import authenticateToken from "../middleware/auth.js";
import axios from 'axios';

const router = express.Router();

//Registering a new user into the system
router.post("/register", async(req,res)=>{
    const {username,password} = req.body;
    try{
        //Adding the user in the user table
        const user = await User.create(username,password);
        if(!user){
          res.status(500).json("User registration could not be achieved");
        } 

        //Creating a profile for user in matrix
        const matrixRegistration = await axios.post('http://localhost:3000/api/chats/register',{username,password});
        if(!matrixRegistration){
          res.status(500).json("User registration into matrix failed")
        }
        const matrix_instance = User.matrix_instance(matrixRegistration.data.user.user_id, matrixRegistration.data.user.access_token, user.user_id)
        if(!matrix_instance){
          res.status(500).json({message:"failed to store user data in database"})
        }  
        res.status(201).json({message:"User registered", user});
    }catch(error){
        res.status(500).json({error: "Registration failed"});
    }
});

//Login a user into the system
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
    try {
      const user = await User.findByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
  
      const passwordMatch = await bcrypt.compare(password, user.password);
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

//Profile details of the user
router.get("/profile", authenticateToken, async(req,res)=>{
  try{
    const user = await User.findByUsername(req.body.username);
    console.log(user)
    if(!user) return res.status(404).json({error:"User not found"});

    res.json({message: "Profile data",user});
  }catch(error){
    res.status(500).json({error: "Failed to retrieve profile"});
  }
});

export default router;
