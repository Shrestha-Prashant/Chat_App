import { response } from "express";
import sdk from "matrix-js-sdk";
import dotenv from "dotenv";
dotenv.config();
import axios from "axios";
import crypto from "crypto"

// Initializing a client with the admin user credentials
const MatrixClient = async (req) =>{
    return sdk.createClient({
        baseUrl: 'http://localhost:8008',
        accessToken: req.body.access_token,
        userId: req.body.userId             //request body needs to have userId and accessToken
    })
} 
// const matrixClient = sdk.createClient({
//     baseUrl: "http://localhost:8008",
//     accessToken: "syt_cGFuZGE_EalKVYidIVXEYKjhGeIc_3hF3ck",        //56e44dc5f02c045af1230cb2cb425adfa3f8efdb124e2aa457c68a913ecc8423
//     userId : "@panda:localhost",
// });

function generateMac(nonce, user, password, admin=false, userType=null, sharedSecret){
    console.log("generate mac....")
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
    //Registering a new Matrix user
    static async registerUser(username,password){
        try{
            // console.log(process.env.synapse_admin_access_token)
            // const matrixClient = async() => {
            //     return sdk.createClient({
            //         baseUrl: "http://localhost:8008",
            //         accessToken: process.env.synapse_admin_access_token,
            //         userId: process.env.synapse_admin_user_id
            //     })
            // }
            //const response = await matrixClient.register(username, password);

            const url = "http://localhost:8008/_synapse/admin/v1/register";

            const nonceResponse = await axios.get(
                url,
                {
                    headers: {
                        Authorization: `Bearer ${process.env.synapse_admin_access_token}`,
                    }
                }
            );
            
            const nonce = nonceResponse.data.nonce;
            console.log(process.env.synapse_admin_access_token)
            const mac_id = generateMac(nonce,username,password,false,null,process.env.synapse_admin_access_token)
            console.log(mac_id)
        
            const response = await axios.post(
                url,
                {
                    nonce: nonce,
                    mac: generateMac(nonce,username,password,false,null,process.env.synapse_admin_access_token),
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

            console.log(response)
            console.log(response.data)
            return response.data;
        }catch(error){
            console.error("Failed to register user:", error.response?.data || error.message);
            throw error;
        }
    }

    //Creating a new room (chat session)
    static async createRoom(isGroupChat, roomName = null){
        try{
            const matrixClient = await MatrixClient(req);
            // const matrixClient = sdk.createClient({
            //     baseUrl: "http://localhost:8008",
            //     accessToken: "req.body.access_token",        
            //     userId
            // });
            const options = isGroupChat? {name:roomName, preset:"public_chat"} : {preset:"trusted_private_chat"}

            const room = await matrixClient.createRoom(options);
            res.status(200).json({roomId:room.room_id, room})
        }catch(error){
            console.error("Failed to create room:",error.message);
            throw error;
        }
    }

    //Add user to the room (sending invitation)
    static async addUserToRoom(roomId, userId){
        try{
            const matrixClient = await MatrixClient(req);
            const response = await matrixClient.invite(roomId, userId);
            return response.message;
        }catch(error){
            console.error("Failed to add user to room:",error.message);
        }
    }

    //Accepting the invite to a room
    static async acceptInvite(roomId, userId){
        try{
            const matrixClient = await MatrixClient(req);
            // //Login the user 
            // const userClient = createClient({
            //     baseUrl: "http://localhost:8008",
            //     accessToken: "accepting_user_token_required_here",
            //     userId
            // })
            const reponse = await userClient.joinRoom(roomId);
            return response;
        }catch(error){
            console.error("Failed to accept invite:", error.message)
        }
    }

    //Send a message in a room
    static async sendMessage(roomId, senderId, message){
        try{
            const matrixClient = await MatrixClient(req);
            await matrixClient.sendEvent(roomId, "m.room.message", {
                msgtype: "m.text",
                body: message
            });
        }catch(error){
            console.error("Failed to send message:", error.message);
            throw error;
        }
    }

    //Get message from a room
    static async getMessage(roomId){
        try{
            const matrixClient = await MatrixClient(req);
            const response = await matrixClient.roomInitialSync(roomId);
            return response.messages;
        }catch(error){
            console.error("Failed to retrieve messages:", error.message);
            throw error;
        }
    }

}

export default MatrixService;