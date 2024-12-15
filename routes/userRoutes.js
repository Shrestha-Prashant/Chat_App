import express from "express"
import User from "../models/user.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import authenticateToken from "../middleware/auth.js";
import axios from 'axios';
import MatrixService from "../services/matrixService.js";

const router = express.Router();

//Login a user into the system
router.post("/login",async(req, res) => {
  const {username,password} = req.body;
  console.log(username,password)
  try{
    const user = await MatrixService.userExists(username)
    console.log("user:",user)
    if(user){
      console.log("In login credentials")
      const token = await MatrixService.getLoginCredentials(username,password)
      res.status(200).json(token)
    }
    else{
    const matrixRegistration = await MatrixService.registerUser(username,password)
    if(!matrixRegistration){
      res.status(500).json("User registration into matrix failed")
    }
    const token = await MatrixService.getLoginCredentials(username,password)
    res.status(200).json(token)
    }
  }catch(error){
    res.status(error.status).json(error)
  }
  });

//Profile details of the user
router.get("/profile", authenticateToken, async(req,res)=>{
  try{
    const user = await User.findByUsername(req.body.username);
    if(!user) return res.status(404).json({error:"User not found"});
    res.json({message: "Profile data",user});
  }catch(error){
    res.status(500).json({error: "Failed to retrieve profile"});
  }
});

export default router;
