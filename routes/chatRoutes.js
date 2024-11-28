import express, { response } from "express";
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
router.post("/createRoom", authenticateToken, async(req,res)=>{
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
const {roomId, userId, accessToken} = req.body;

    try{
        const response = await MatrixService.addUserToRoom(roomId, userId, accessToken);
        console.log(response)
        res.status(200).json({message: "User invited sucessfully"})
    }catch(error){
        res.status(500).json({error:"Failed ot invite user", details: error.message});
    }
});

//Listing user's invitation
router.get("/listInvitations",authenticateToken, async(req,res)=>{
    const {userId,accessToken} = req.query;
    try{
        let invitations = await MatrixService.listInvitations(userId,accessToken);
        // console.log(invitations)
        res.status(200).json(invitations)
    }catch(error){
        console.error("Failed to load invitations", error.message);
        res.status(500).json({error: "Failed to load invitations", details: error.message})
    }
})

//Load the rooms joined by user
router.get("/loadrooms",async (req,res) => {
    const {userId,accessToken} = req.query;
    try{
        const rooms = await MatrixService.loadRooms(userId,accessToken)
        res.status(200).json(rooms)
    }catch(error){
        console.error("Failed to load rooms", error.message)
    }
})

//Accepting the invitation
router.post("/acceptInvite", authenticateToken, async(req,res)=>{ 
    const {roomId, userId, accessToken} = req.body;

    try{
        const response = await MatrixService.acceptInvite(roomId, userId, accessToken);
        console.log(response)
        res.status(200).json({message: "Invitation accepted"})
    }catch(error){
        res.status(500).json({error: "Failed to accept the invitation.", details: error.message})
    }
})

//Sending a message in a room
router.post("/:roomId/sendMessage",authenticateToken, async(req,res)=>{
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
    const {userId, accessToken} = req.query;

    try{
        const response = await MatrixService.getMessage(roomId,userId,accessToken);   
        const messages = response.chunk
            .filter(obj => obj.type == 'm.room.message')  
            .map(obj=> ({
                    senderId: obj.sender,
                    message: obj.content.msgtype === "m.text" ? obj.content.body : obj.content.file
            }))
        res.json({messages})
    }catch(error){
        res.status(500).json({error:"Failed to retrieve messages"});
    }
});


export default router;