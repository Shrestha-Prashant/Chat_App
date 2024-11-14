import sdk from "matrix-js-sdk"

// Initializing a client with the admin user credentials
const matrixClient = sdk.createClient({
    baseUrl: "http://localhost:8008",
    accessToken: "6bf0bb983be6416e3e810d5c04417192863656a98f60f03986b1d8d18af07ac8syt_cGFuZGE_EalKVYidIVXEYKjhGeIc_3hF3ck",        //56e44dc5f02c045af1230cb2cb425adfa3f8efdb124e2aa457c68a913ecc8423
    userId : "@panda:localhost",
});

class MatrixService {
    //Registering a new Matrix user
    static async registerUser(username,password){
        try{
            const response = await matrixClient.register(username, password);
            return response;
        }catch(error){
            console.error("Failed to register user:", error.message);
            throw error;
        }
    }

    //Creating a new room (chat session)
    static async createRoom(isGroupChat, roomName = null){
        try{
            const options = isGroupChat? {name:roomName, preset:"public_chat"} : {preset:"trusted_private_chat"}

            const room = await matrixClient.createRoom(options);
            return room;
        }catch(error){
            console.error("Failed to create room:",error.message);
            throw error;
        }
    }

    //send a message in a room
    static async sendMessage(roomId, senderId, message){
        try{
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
            const response = await matrixClient.roomInitialSync(roomId);
            return response.messages;
        }catch(error){
            console.error("Failed to retrieve messages:", error.message);
            throw error;
        }
    }
}

export default MatrixService;