require("dotenv").config();
const pgp = require("pg-promise")();
const url ="postgresql://postgres:englandchelsea@localhost:5433/chat_app"
// const db = pgp(process.env.DATABASE_URL);
const db = pgp(url);
db.connect()
    .then((obj)=>{
        obj.done();
        console.log("connected to PostgreSQL using pg-promise")
    })
    .catch((error)=>{
        console.log("Database connection error:", error.message || error);
    })

module.exports = db;