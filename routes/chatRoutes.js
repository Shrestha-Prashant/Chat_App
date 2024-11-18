import express from "express";
import authenticateToken from "../middleware/auth.js";
import MatrixService from "../services/matrixService.js";

const router = express.Router();

//Registering a new matrix user 
router.post("/register", async(req,res)=> {
    const {username, password} = req.body;
    try{
        const user = await MatrixService.registerUser(username, password);
        res.status(201).json({message:"Matrix user registered", user});
    }catch(error){
        res.status(400).json({error:"Failed to register Matrix user"});
    }
});

//Creating a chat room
// router.post("/createRoom", authenticateToken, async(req,res)=>{
router.post("/createRoom", async(req,res)=>{
    //send isGroupChat from frontend as true or false
    // userId -> matrix user id, accessToken -> matrix access token, inviteUserId -> request receiver userI
    const {userId, accessToken, inviteUserId, isGroupChat,roomName=null} = req.body
    try{
        const room = await MatrixService.createRoom(userId,accessToken,inviteUserId,isGroupChat, roomName);
        res.status(201).json({message:"Room created", room});
    }catch(error){
        res.status(500).json({error:"Failed to create room"});
    }
});

//Adding user to rooms
router.post("/addUserToRoom", authenticateToken, async(req,res)=> {
    const {roomId, userId} = req.body;

    try{
        const response = await MatrixService.addUserToRoom(roomId, userId);
        res.status(200).json({message: "User invited sucessfully"})
    }catch(error){
        res.status(500).json({error:"Failed ot invite user", details: error.message});
    }
});

//Accepting the invitation
router.post("/acceptInvite", authenticateToken, async(req,res)=>{
    const {roomId, userId} = req.body;

    try{
        const reponse = await MatrixService.acceptInvite(roomId, userId);
        res.status(200).json({message: "Invitation accepted"})
    }catch(error){
        res.status(500).json({error: "Failed to accept the invitation.", details: error.message})
    }
})

//Sending a message in a room
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