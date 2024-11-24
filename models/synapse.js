import sqlite3 from 'sqlite3';

const queryMembershipSnapshots = async (userId) => {
    const db_path = './synapse-data/homeserver.db'
    
    const db = new sqlite3.Database(db_path, (err)=> {
        if(err){
            console.error("Failed to connect to database:",err.message);
            return;
        }
        console.log('Connected to SQLite database');
    });

const query = `SELECT * FROM sliding_sync_membership_snapshots WHERE user_id = ? `
db.serialize(() => {
    db.all(query, [userId], (err,rows) => {
        if(err){
            console.error("Failed to execute query:",err.message);
        } 
        else{
            console.log(`Results of userId ${userId}:`, rows)
        }
    })
})

db.close((err)=> {
    if(err){
        console.error("Error closing database:",err.message)
    }else{
        console.log('Database connection closed.')
    }
})
}

export default queryMembershipSnapshots;