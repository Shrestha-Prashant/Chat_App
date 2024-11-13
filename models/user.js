const db = require("../config/db");
const bcrypt = require("bcryptjs");

class User{
    static async create(username,password){
        const hashedPassword = await bcrypt.hash(password,10);
        const query =
        ` INSERT INTO users(username,password) VALUES($1,$2) RETURNING *`;
        const values = [username, hashedPassword];

        try{
            const user = await db.one(query,values);
            return user;
        }catch(error){
            throw new Error("User creation failed: "+ error.message);
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
}

module.exports = User;