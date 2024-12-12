import express, { response } from "express";
import authenticateToken from "../middleware/auth.js";
import MatrixService from "../services/matrixService.js";
import Chatbot from "../middleware/chatBot.js";

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
const {roomId, userId, accessToken} = req.body;

    try{
        const response = await MatrixService.addUserToRoom(roomId, userId, accessToken);
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
router.get("/:roomId/messages", async(req,res)=>{
// router.get("/:roomId/messages", authenticateToken, async(req,res)=>{
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

// Process reminder command
router.post("/reminders", async (req, res) => {
    const { message, userId, userTimeZone,roomId } = req.body;
    if (!message || !userId || !userTimeZone) {
      return res.status(400).json({ error: "Missing required fields." });
    }
  
    const result = await Chatbot.processCommand(message, userId, userTimeZone,roomId);
    await MatrixService.scheduleCronJob()
    res.json(result);
  });

// Get all reminders for a user
router.get("/reminders", async (req, res) => {
    const { userId } = req.query;
  
    if (!userId) {
      return res.status(400).json({ error: "User ID is required." });
    }
  
    const reminders = await Chatbot.getReminders(userId);
    res.json(reminders); // time in utc, needs to be converted to local time from frontend
  });

// files upload to matrix
router.post("/uploadFile",async (req,res)=>{
    const {roomId,accessToken, senderId, file, fileType} = req.body;
    try{
        const content_url = await MatrixService.uploadFile(senderId,accessToken,file,fileType)
        return res.status(200).json({
            content_url,
            fileName: file.fileName,
            fileType: filetype,
            fileSize: file.fileSize
        })
    }catch(error){
        console.error("Can not upload file: " + error.message)
    }
})

router.post("/sendFile", async(req,res)=>{
    const {userId,roomId,accessToken,base64Data,fileType,fileName} = req.body;

    if(!userId || !roomId || !accessToken || !base64Data){
        return res.status(400).json({error: "Missing required fields."})
    }
    try{
        const response = await MatrixService.sendFile(userId,accessToken,roomId,base64Data,fileType,fileName)
        if(response)
            return res.status(200).json(response)
    }catch(error){
        console.error("Can not upload file: " + error.message)
    }
})

router.post("/getFile",async (req,res)=>{
    const {contentUri} = req.body;
    try{
        const contents = await MatrixService.getContents(contentUri)
        return res.status(200).json(contents)
    }catch(error){
        console.error("Can not get files: " + error.message)
    }
})

// delete file
router.post("/deleteFile", async(req,res)=>{
    try{

    }catch(error){
        console.error("Can not upload file: " + error.message)
    }
})

// update msg status to seen
//listen to m.seen msg and extract getContent
router.post("/status",async (req,res)=>{
    const {userId,msgId,accessToken,roomId} = req.body;
    try{
        const response = await MatrixService.updateStatus(userId,msgId,accessToken,roomId)
        return res.status(200).json(response)
    }catch(err){
        return res.status(400).json(err)
    }
})

export default router;

