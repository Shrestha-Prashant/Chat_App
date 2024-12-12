import sqlite3 from 'sqlite3';


const dbConnect = async () => {
    const db_path = './synapse-data/homeserver.db';
    const db = new sqlite3.Database(db_path, (err) => {
        if (err) {
            console.error("Failed to connect to database:", err.message);
            return reject(err);
        }
        console.log('Connected to SQLite database');
    });
    return db;
}

class synapseDB{
    static async queryMembershipSnapshots(userId){
        const db = await dbConnect();
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM sliding_sync_membership_snapshots WHERE user_id = ?`;
    
            db.all(query, [userId], (err, rows) => {
                if (err) {
                    console.error("Failed to execute query:", err.message);
                    db.close(() => console.log('Database connection closed due to error.'));
                    return reject(err);
                }
                db.close((closeErr) => {
                    if (closeErr) {
                        console.error("Error closing database:", closeErr.message);
                    } else {
                        console.log('Database connection closed.');
                    }
                });
                resolve(rows); // Resolve the promise with the query results
            });
        });
    }

    static async getAccessToken(userId){
        const db = await dbConnect();
        const query = `SELECT token FROM access_tokens WHERE user_id = ?`
        return new Promise((resolve, reject) => {    
            db.all(query, [userId], (err, rows) => {
                if (err) {
                    console.error("Failed to execute query:", err.message);
                    db.close(() => console.log('Database connection closed due to error.'));
                    return reject(err);
                }
                db.close((closeErr) => {
                    if (closeErr) {
                        console.error("Error closing database:", closeErr.message);
                    } else {
                        console.log('Database connection closed.');
                    }
                });
                console.log("rows: ", rows)
                console.log("token",rows[1])
                console.log(rows[1].token)
                resolve(rows[1].token); // Resolve the promise with the query results
            });
        }); 
    }
}

export default synapseDB;
