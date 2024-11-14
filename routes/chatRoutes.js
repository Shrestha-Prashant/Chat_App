import express from "express";
import authenticateToken from "../middleware/auth.js";
import MatrixService from "../services/matrixService.js";

const router = express.Router();

//registering a new matrix user and create a chat room
router.post("/register", authenticateToken, async(req,res)=> {
    const {username, password} = req.body;

    try{
        const user = await MatrixService.registerUser(username, password);
        res.status(201).json({message:"Matrix user registered", user});
    }catch(error){
        res.status(400).json({error:"Failed to register Matrix user"});
    }
});

//Creating a chat room
router.post("/createRoom", authenticateToken, async(req,res)=>{
    const {isGroupChat, roomName} = req.body;

    try{
        const room = await MatrixService.createRoom(isGroupChat, roomName);
        res.status(201).json({message:"Room created", room});
    }catch(error){
        res.status(500).json({error:"Failed to create room"});
    }
});

//sending a message in a room
router.post("/sendMessage",authenticateToken, async(req,res)=>{
    const {roomId, message} = req.body;

    try{
        await MatrixService.sendMessage(roomId, req.user.userId, message);
        res.status(201).json({message:"Message sent"});
    }catch(error){
        res.status(500).json({error:"Failed to send message"});
    }
});

//Getting message from a room
router.get("/:roomId/messages", authenticateToken, async(req,res)=>{
    const {roomId} = req.params;

    try{
        const messages = await MatrixService.getMessage(roomId);
        res.json({messages});
    }catch(error){
        res.status(500).json({error:"Failed to retrieve messages"});
    }
});

export default router;