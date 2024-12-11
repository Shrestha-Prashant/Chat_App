import sdk from "matrix-js-sdk";
import dotenv from "dotenv";
dotenv.config();
import axios from "axios";
import crypto from "crypto"
import Chatbot from "../middleware/chatBot.js";
import moment from "moment-timezone";
import cron from 'node-cron'
import queryMembershipSnapshots from "../models/synapse.js";
import User from "../models/user.js";
import zlib from "zlib";
import {promisify} from "util" 


// to store cron job
let currentTask = null;

// maximum file size
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

//Compression of file 
const compress = promisify(zlib.gzip)
const decompress = promisify(zlib.gunzip)

// Initializing a client with the admin user credentials
const MatrixClient = async (userId,accessToken) =>{
    return sdk.createClient({
        baseUrl: 'http://localhost:8008',
        accessToken: accessToken,
        userId: userId,     
    })
} 

function generateMac(nonce, user, password, admin=false, userType=null, sharedSecret){
    const hmac = crypto.createHmac('sha1', sharedSecret);

    hmac.update(Buffer.from(nonce,'utf8')); //Encoding nonce as UTF-8
    hmac.update(Buffer.from("\x00"));   //Appending null byte
    hmac.update(Buffer.from(user,'utf8'));  // Encoding user as UTF-8
    hmac.update(Buffer.from("\x00"));   // Appending null byte
    hmac.update(Buffer.from(password,'utf8'));  // Encoding password as UTF-8
    hmac.update(Buffer.from("\x00"));   // Appending null byte
    hmac.update(Buffer.from(admin? "admin" : "notadmin", "utf8"));  // Adding 'admin' or 'notadmin'

    if (userType){
        hmac.update(Buffer.from("\x00"));   //Appending null byte
        hmac.update(Buffer.from(userType, "utf8")); // Encoding userType if provided
    }

    return hmac.digest('hex');
}

class MatrixService {
    // to check if user exists already
    static async userExists(username){
        try{
            console.log("userExists")
            const userId = "@" + username + ":localhost"
            const url = `http://localhost:8008/_synapse/admin/v2/users/${userId}`
            const user = await axios.get(url,{
                headers: {
                    Authorization: `Bearer ${process.env.synapse_admin_access_token}`
                }
            })
            return true
        }catch(error){
            if(error.response.status===404){
                return false
            }
        }
    }

    //Registering a new Matrix users
    static async registerUser(username,password){
        try{
            const url = "http://localhost:8008/_synapse/admin/v1/register";

            // Acquiring nonce (random code generated by synapse) using a get request to the synapse server
            const nonceResponse = await axios.get(
                url,
                {
                    headers: {
                        Authorization: `Bearer ${process.env.synapse_admin_access_token}`,
                    }
                }
            );
             
            const nonce = nonceResponse.data.nonce;
            const response = await axios.post(
                url,
                {
                    nonce: nonce,
                    mac: generateMac(nonce,username,password,false,null,process.env.synapse_secret_key),
                    username: username,
                    password: password,
                    admin: false
                },
                {
                    headers: {
                        Authorization: `Bearer ${process.env.synapse_admin_access_token}`,
                        "Content-Type": "application/json"
                    }
                }
            )
            return response.data;
        }catch(error){
            console.error("Failed to register user:", error.response?.data || error.message);
            throw error;
        }
    }

    //Getting token for the user
    static async getLoginCredentials(username,password){
        try{
            let userId = "@" + username + ":localhost"
            const response = await axios.post('http://localhost:8008/_matrix/client/v3/login',{
                type: "m.login.password",
                user: userId,
                password: password
            })
            // console.log(response)
            console.log("response data : " + response.data)
            return response.data
        }catch(err){
            console.error("Error in getting user token: " + err)
        }
    }

    static async createRoom(userId, accessToken, inviteUserId, isGroupChat = false, roomName = null) {
        try {
            const matrixClient = await MatrixClient(userId, accessToken);

            const options = {
                name: roomName,
                preset: "trusted_private_chat",
                visibility: "private",
                initial_state: [{
                    type: "m.room.encryption",
                    state_key: "",
                    content: {
                        algorithm: "m.megolm.v1.aes-sha2"
                    }
                }],
                initial_state: [
                    {
                        type: 'm.room.history_visibility',
                        content: {
                            history_visibility: 'world-readable'  // Allows message history to be viewed by anyone
                        },
                        state_key: ''
                    },
                    {
                        type: 'm.room.guest_access',
                        content: {
                            guest_access: 'can_join'  // Allows guests to join
                        },
                        state_key: ''
                    },
                    {
                        type: 'm.room.join_rules',
                        content: {
                            join_rule: isGroupChat ? 'public' : 'public'
                        },
                        state_key: ''
                    },
                    {
                        type: 'm.room.preview_urls',
                        content: {
                            allow: true,
                            allow_domains: ['*']
                        },
                        state_key: ''
                    }
                ]
            };

            if (isGroupChat) {
                options.preset = "private_chat";
                options.power_level_content_override = {
                    users_default: 0,
                    events_default: 0,
                    state_default: 50,
                    ban: 50,
                    kick: 50,
                    redact: 50,
                    invite: 0,
                    events: {
                        "m.room.name": 50,
                        "m.room.avatar": 50,
                        "m.room.canonical_alias": 50,
                        "m.room.history_visibility": 100,
                        "m.room.power_levels": 100
                    }
                };
            }

            const room = await matrixClient.createRoom(options);
            const invitedUserIds = Array.isArray(inviteUserId) ? inviteUserId : [inviteUserId];

            const invitePromises = invitedUserIds.map(async (id) => {
                try {
                    await matrixClient.invite(room.room_id, id);
                    return { userId: id, status: 'invited' };
                } catch (inviteError) {
                    console.error(`Failed to invite user ${id}:`, inviteError);
                    return { userId: id, status: 'failed', error: inviteError.message };
                }
            });

            const inviteResults = await Promise.all(invitePromises);
            
            // Stop the client after operations are complete
            matrixClient.stopClient();

            return {
                room,
                inviteResults
            };
        } catch (error) {
            console.error("Failed to create room:", error.response?.data || error.message || error);
            throw error;
        }
    }

    //Add user to the room (sending invitation)
    static async addUserToRoom(roomId, userId, accessToken){
        try{
            const matrixClient = await MatrixClient(userId,accessToken);
            const response = await matrixClient.invite(roomId, userId);
            return response.message;
        }catch(error){
            console.error("Failed to add user to room:",error.message);
        }
    }

    static async listInvitations(userId,accessToken) {
        try {
            const user_exists = await MatrixClient(userId,accessToken);
            if(user_exists){
                const response = await queryMembershipSnapshots(userId);
                console.log(`Results of userId ${userId}:`, response)
                return response;
            }
        } catch (error) {
            console.error("Error fetching room invitations:", error.message);
            throw error;
        }
    }
    
    //List joined rooms
    static async loadRooms(userId, accessToken) {
        try {
            const matrixClient = await MatrixClient(userId,accessToken)
            await matrixClient.startClient({ initialSyncLimit: 0 });
    
            // Wait for the client to sync
            await new Promise((resolve) => matrixClient.once("sync", resolve));
    
            const joinedRooms = matrixClient.getRooms();

            const roomDetails = {};
            for (const room of joinedRooms) {
                const members_id = room.currentState.userIdsToDisplayNames
                const roomId = room.roomId;
                const usernames = Object.entries(members_id).map(([userId,displayName]) => {
                    if(!displayName){
                        return userId.replace(/^@/,'').split(":")[0]
                    }
                    return displayName
                })
    
                roomDetails[roomId] = usernames;
            }

            // Stop the client to clean up resources
            matrixClient.stopClient();
            return roomDetails;
        } catch (error) {
            console.error("Failed to load rooms:", error.message);
        }
    }

    //Accepting the invite to a room
    static async acceptInvite(roomId, userId, accessToken){
        try{
            const matrixClient = await MatrixClient(userId, accessToken);            
            const response = await matrixClient.joinRoom(roomId);
            return response.roomId;
        }catch(error){
            console.error("Failed to accept invite:", error.message)
        }
    }

    //Send a message in a room
    // addition of a file in message
    static async sendMessage(roomId,senderId, message, accessToken){
        try{
            const matrixClient = await MatrixClient(senderId,accessToken);
            await matrixClient.sendEvent(roomId, "m.room.message", {
                msgtype: "m.text",
                body: message
            });
        }catch(error){
            console.error("Failed to send message:", error.message);
            throw error;
        }
    }

    static async sendFile(senderId,accessToken,roomId,base64Data,fileType,fileName){
        const matrixClient = await MatrixClient(senderId,accessToken)
        try{
            const base64Content = base64Data.split(",")[1]

            if(!base64Content||!base64Data){
                return res.status(400).json({error: " Invalid base64 data format."})
            }

            //decoding base64 to binary
            const binaryData = Buffer.from(base64Content,"base64")

            //compressing data
            const compressedData = await compress(binaryData)
            console.log(binaryData)
            
            //uploading file to matrix
            const uploadResponse = await matrixClient.uploadContent(compressedData,{
                type: "application/gzip",
                rawResponse: false,
            })
            console.log(uploadResponse)
            const contentUri = uploadResponse.content_uri
            console.log(contentUri)

            //sending File in the message
            const fileMessage = {
                msgtype: "m.file",
                url: contentUri,
                body: fileName,
                info: {
                    mimetype: fileType
                }
            }

            const messageSent = await matrixClient.sendEvent(roomId, "m.room.message",fileMessage)
            if(messageSent){
                await User.storeContentInfo(senderId,roomId,contentUri,fileType)
                return fileMessage
            }
        }catch(error){
            console.error("Error in sendFile: " + error)
            return false
        }
    }

    //Get message from a room
    static async getMessage(roomId,userId,accessToken){
        try{
            const matrixClient = await MatrixClient(userId,accessToken);
            const response = await matrixClient.roomInitialSync(roomId);
            console.log(response)
            return response.messages;
        }catch(error){
            console.error("Failed to retrieve messages:", error.message);
            throw error;
        }
    }

    // send reminder
    static async sendReminder(notice) {
        const user = await User.matrixInformation(notice.user_id)
        const matrixClient = await MatrixClient(user.userId, user.accesstoken);
        try { 
            await matrixClient.sendEvent(notice.roomid, "m.room.message", {
                msgtype: "m.notice",
                body: notice.title, 
            });
            await Chatbot.deleteReminder(notice.id); 
            await this.scheduleCronJob(true); 
        } catch (error) {
            console.error("Error in sendReminder:", error.message);
        }
    }

    // reminder
    static async scheduleCronJob(update = false) {
    const earliest_reminder = await Chatbot.getEarliestReminder();
    if(!earliest_reminder){
        return 
    }

    const time = moment.utc(earliest_reminder.time); // Ensuring time is in UTC
    console.log("Scheduling reminder at (UTC):", time.format("YYYY-MM-DD HH:mm:ss"));
    console.log(`Cron pattern: ${time.minute()} ${time.hour()} ${time.date()} ${time.month() + 1} *`);

    // Stopping the existing task if this is an update
    if (update && currentTask) {
        currentTask.stop();
    }

    // Scheduling the new task
    currentTask = cron.schedule(
        `${time.minute()} ${time.hour()} ${time.date()} ${time.month() + 1} *`,
        async () => {
            await this.sendReminder(earliest_reminder);
        },
        { timezone: "Etc/UTC" } 
    );
    return currentTask;
   }

   static async getContents(contentUri){
    try{
            // const contents = matrixClient.getContent(contentUri)
            const [_, serverName, mediaId] = contentUri.match(/^mxc:\/\/([^/]+)\/(.+)$/);
            // Construct the download URL
            const downloadUrl = `http://localhost:8008/_matrix/media/v3/download/${serverName}/${mediaId}`;

            // Fetch the file
            const content = await axios.get(downloadUrl, { responseType: "arraybuffer" });
            const compressedData = Buffer.from(content.data)
            const decompress_data = await decompress(compressedData)
            const actual_data = decompress_data.toString('base64')
            return actual_data 
    }catch(error){
        console.error("Error in getContents:", error.message);
    }
   }

   //update the status of the message
   static async updateStatus(userId,msgId,accessToken,roomId){
    const matrixClient = await MatrixClient(userId,accessToken)
    try{
        const content = {
            eventType: "m.seen",
            seenBy: userId,
            timestamp: new Date().toISOString(),
            eventId: msgId
        }
        const response = await matrixClient.sendEvent(roomId,"m.seen", content)
        console.log(response)
    }catch(error){
        console.error("Could not add event: " + error)
    }
  }
}

export default MatrixService;