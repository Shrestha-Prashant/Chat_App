import express from "express";
import authenticateToken from "../middleware/auth.js";
import MatrixService from "../services/matrixService.js";
import User from "../models/user.js";

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

//Listing user's invitation
// router.get("/listInvitations",authenticateToken, async(req,res)=>{
router.get("/listInvitations", async(req,res)=>{
    const {userId,accessToken}= req.body;
    try{
        let invitations = await MatrixService.listInvitations(userId,accessToken);

        const updatedInvitations = await Promise.all(
            invitations.map(async(invitation) => {
                try{
                    const inviterDetails = await User.findByMatrixId(invitation.inviter)

                    return {
                        ...invitation,
                        inviter: inviterDetails ? inviterDetails.username : "Unknown User"
                    }
                }catch(error){
                    console.log(`Failed to lookup inviter ${invitation.inviter}`, error.message)
                    return invitation;
                }
                
            })
        );

        res.status(200).json(updatedInvitations)
    }catch(error){
        console.error("Failed to load invitations", error.message);
        res.status(500).json({error: "Failed to load invitations", details: error.message})
    }
})

//Accepting the invitation
// router.post("/acceptInvite", authenticateToken, async(req,res)=>{
router.post("/acceptInvite", async(req,res)=>{    
    const {roomId, userId, accessToken} = req.body;

    try{
        const response = await MatrixService.acceptInvite(roomId, userId, accessToken);
        res.status(200).json({message: "Invitation accepted"})
    }catch(error){
        res.status(500).json({error: "Failed to accept the invitation.", details: error.message})
    }
})

//Sending a message in a room
// router.post("/sendMessage",authenticateToken, async(req,res)=>{
router.post("/:roomId/sendMessage", async(req,res)=>{
    const {senderId, message, accessToken} = req.body;

    try{
        await MatrixService.sendMessage(req.params.roomId,senderId, message,accessToken);
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