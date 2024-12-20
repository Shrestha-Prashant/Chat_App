import db from "../config/db.js";
import bcrypt from "bcryptjs";

class User{
    static async create(username,password){
        const hashedPassword = await bcrypt.hash(password,10);
        const query =
        `INSERT INTO users(username,password) VALUES($1,$2) RETURNING *`;
        const values = [username, hashedPassword];

        try{
            const user = await db.one(query,values);
            return user;
        }catch(error){
            throw new Error("User creation failed: "+ error.message);
        }
    }

    static async matrix_instance(userId, accesstoken,systemId){
        const matrix_user_creation_query = `INSERT INTO matrixInfo(userId, accesstoken, systemId) VALUES($1,$2,$3) RETURNING *`
        const values_for_matrix = [userId,accesstoken,systemId]

        try{
            const matrix_instance = await db.one(matrix_user_creation_query,values_for_matrix);
            return matrix_instance;
        }catch(error){
            throw new Error("Matrix instance creation failed: " + error.message)
        }
    }

    static async matrixInformation(matrixId){
        const query = `SELECT * FROM matrixInfo WHERE userid ilike $1`
        try{
            const matrixInfo = await db.one(query,matrixId)
            return matrixInfo;
        }catch(error){
            console.error("Could not find matrix user: " + error)
        }
    }

    static async findByUsername(username){
        const query = `SELECT * FROM users WHERE username = $1`;
        try{
            const user = await db.oneOrNone(query,[username]);
            return user;
        }catch(error){
            throw new Error("User lookup failed: " + error.message);
        }
    }

    static async findByMatrixId(userId){
        const query = `SELECT * FROM users WHERE user_id = (
            SELECT systemId FROM matrixInfo WHERE userId = $1
        )`;

        try{
            const user = await db.oneOrNone(query,[userId]);
            return user;
        }catch(error){
            throw new Error("User lookup failed: " + error.message)
        }
    }

    static async getAccessToken(userId){
        const username = userId.split(":")[0].replace("@", "");
        const query= `SELECT * FROM matrixInfo WHERE systemid = (
                SELECT user_id FROM users WHERE username = $1
        )`;

        try{
            const token = await db.one(query,[username]);
            return token.accesstoken;
        }catch(error){
            throw new Error("Failed to retrieve access token: " + error.message)
        }
    }

    static async storeContentInfo(userId,roomId,contentUri,fileType){
        try{
            const query = `INSERT INTO roomfiles(roomid,senderid,contenturi,filetype) VALUES($1,$2,$3,$4)`;
            await db.oneOrNone(query,[roomId,userId,contentUri,fileType])
        }catch(error){
            console.error("Error in saving content information: " + error.message)
        }
    }

    static async storeUsersRoom(user1,user2,roomId){
        try{
            console.log("inside store info in room")
            console.log(user1,user2)
            const query = `INSERT INTO room(user1,user2,room_id) VALUES($1,$2,$3)`
            await db.none(query,[user1,user2,roomId])
        }catch(err){
            console.Error(err)
        }
    }

    static async getUsersRoom(user1,user2){
        try{
            const query = `SELECT room_id FROM room WHERE (user1 ilike $1 OR user1 ilike $2) AND (user2 ilike $3 OR user2 ilike $4)`
            const roomId = await db.oneOrNone(query,[user1,user2,user1,user2])
            console.log(roomId)
            return roomId
        }catch(err){
            console.Error(err)
        }
    }
}

export default User;