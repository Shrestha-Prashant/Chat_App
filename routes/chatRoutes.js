import express, { response } from "express";
import authenticateToken from "../middleware/auth.js";
import MatrixService from "../services/matrixService.js";
import Chatbot from "../middleware/chatBot.js";
import axios from "axios";
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
router.post("/createRoom", async(req,res)=>{
    //send isGroupChat from frontend as true or false
    const {userId, accessToken, inviteUserId, isGroupChat,roomName=null} = req.body
    try{
        const username = userId.split(':')[0].substring(1)
        // const url = `http://localhost:3000/api/chats/loadrooms`
        // const roomsInvovlingUsers = await axios.get(url,{
        //     params: {
        //         userId: userId,
        //         accessToken: accessToken
        //     }
        // })
        // const usersPresentRoomId = Object.entries(roomsInvovlingUsers.data).find(([key,users]) => {
        //     return users.includes(username) && users.includes(inviteUserId)
        // })?.[0]
        let usersPresentRoomId = await User.getUsersRoom(userId,"@"+inviteUserId+":localhost")
        console.log("usersPresentRoomId: ", usersPresentRoomId)
        usersPresentRoomId = usersPresentRoomId.room_id
        if(usersPresentRoomId){
            const _url = `http://localhost:3000/api/chats/${encodeURIComponent(usersPresentRoomId)}/messages`
            const chatHistory = await axios.get(_url,{
                params: {
                    userId: userId,
                    accessToken: accessToken
                }
            })
            res.status(200).json({
                room: {
                        room_id: usersPresentRoomId
                },
                message_history: chatHistory.data
            });
        }
        else{
            console.log(userId, accessToken)
            const room = await MatrixService.createRoom(userId,accessToken,inviteUserId,isGroupChat, roomName);
            console.log("room: ", room)
            console.log(room.room.room_id)
            if(room){
                // const roomStored = await User.storeUsersRoom(userId,inviteUserId)
                // if(roomStored){

                // }
                User.storeUsersRoom(userId,"@"+inviteUserId+":localhost",room.room.room_id).then(()=>{
                    console.log("inside then")
                    res.status(201).json({message:"Room created", room});
                }).catch((err)=>{
                    //delete users room
                    console.log("inside error")
                    res.status(500).json(err);
                })
            }
            else{
                res.status(500).json("Room not created");
            }
        }
    }catch(error){
        console.log(error)
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
    console.log("loadrooms")
    const {userId,accessToken} = req.query;
    try{
        console.log("loadrooms")
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
router.get("/:roomId/messages", async(req,res)=>{
    console.log("get message")
    const {roomId} = req.params;
    const {userId, accessToken} = req.query;
    console.log(roomId,userId,accessToken)

    try{
        const response = await MatrixService.getMessage(roomId,userId,accessToken);   
        const messages = response.chunk
            .filter(obj => obj.type == 'm.room.message')  
            .map(obj=> ({
                    msgId: obj.event_id,
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

// Receive files
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
        const statusEvent = await MatrixService.updateStatus(userId,msgId,accessToken,roomId)
        res.status(200).json("Message status update to seen.")
    }catch(err){
        return res.status(400).json(err)
    }
})


router.get('/status',async (req,res)=>{
    try{
        const {eventId,accessToken} = req.query;
        const statusEvent = await MatrixService.getUpdatedStatus(eventId,accessToken) 
        res.status(200).json({
            type: statusEvent.type,
            roomId: statusEvent.room_id,
            seenBy: statusEvent.content.seenBy,
            timestamp: statusEvent.content.timestamp,
            seenMsgId: statusEvent.content.eventId
        })
    }catch(err){
        res.status(400).json(err)
    }
})

export default router;

