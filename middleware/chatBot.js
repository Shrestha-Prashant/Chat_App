import moment from "moment-timezone";
import db from "../config/db.js";

class Chatbot {
  static async processCommand(message, userId, userTimeZone,roomId) {
    console.log("Running chatBot:processCommand")
    try {
      const match = message.match(
        /^#remind\s+(?:"([^"]+)"|([^\s]+))\s+(at\s+([\d-:\s]+)|in\s+([\dhms]+))$/i
      );

      if (!match) {
        return {
          error: "Invalid command format. Use #remind <title> at <time> or in <relative-time>",
        };
      }

      const [_, quotedTitle, simpleTitle, timeType, absoluteTime, relativeTime] = match;

      // Determine the title
      const title = quotedTitle || simpleTitle;

      if (!title) {
        return { error: "Reminder title is required." };
      }

      // Handle absolute time
      if (absoluteTime) {
        const time = moment.tz(absoluteTime.trim(), "YYYY-MM-DD HH:mm", userTimeZone);
        if (!time.isValid()) {
          return { error: "Invalid date format. Use YYYY-MM-DD HH:mm." };
        }
        if (time.isBefore(moment())) {
          return { error: "Cannot set a reminder for the past." };
        }
        console.log(time.toISOString())
        await Chatbot.storeReminder(userId, title, time.toISOString(),roomId);
        return { time: time.toISOString(), title };
      }

      // Handle relative time
      if (relativeTime) {
        const regex = /^(\d+h)?(\d+m)?(\d+s)?$/;
        if (!regex.test(relativeTime)) {
          return { error: "Invalid relative time format. Use formats like 1h30m." };
        }

        const duration = moment.duration(
          relativeTime.match(/(\d+h)?/g)[0]?.replace("h", "") || 0,
          "hours"
        )
          .add(
            relativeTime.match(/(\d+m)?/g)[0]?.replace("m", "") || 0,
            "minutes"
          )
          .add(
            relativeTime.match(/(\d+s)?/g)[0]?.replace("s", "") || 0,
            "seconds"
          );

        const time = moment.utc().add(duration);

        if (time.isAfter(moment().endOf("day"))) {
          return { error: "Reminders can only be set for the same day." };
        }

        await Chatbot.storeReminder(userId, title, time.toISOString(),roomId);
        // await Chatbot.storeReminder(userId, title, time,roomId);
        return { time: time.toISOString(), title };
      }

      return { error: "Invalid time format. Provide a valid absolute or relative time." };
    } catch (error) {
      console.error("Error processing command:", error);
      return { error: "An unexpected error occurred." };
    }
  }

  //stores reminder
  static async storeReminder(userId, title, time,roomId) {
    console.log("Running chatBot:storeReminder")
    const query = `INSERT INTO reminders (user_id, title, time,roomid) VALUES ($1, $2, $3, $4)`;
    await db.query(query, [userId, title, time,roomId]);
  }

  //pull user's reminder
  static async getReminders(userId){
    console.log("Running chatBot:getReminder")
    const query = `SELECT * FROM reminders WHERE user_id = $1 ORDER BY time ASC`;
    const response = await db.manyOrNone(query, [userId]);
    return response;
  }

  //get reminder which needs to be displayed now
  static async getEarliestReminder(){
    console.log("Running chatBot:getCurrentReminder")
    const query = `SELECT * FROM reminders WHERE time = (
      SELECT MIN(time) FROM reminders
    ) `;
    try{
      const reminder = await db.oneOrNone(query)
      console.log(reminder)
      return reminder;
    }catch(error){
      console.error("Error getting current reminder:", error)
    }
  }

  static async getParticularReminder(time){
    console.log("Running chatBot:getParticularReminder")
    const query = `SELECT * FROM reminders WHERE time = $1`;
    try{
      const reminder = db.one(query,[time])
      return reminder
    }catch(error){
      console.error("Can not retrieve particular reminder",error.message)
    }
  }

  static async deleteReminder(id){
    console.log("Running chatBot:deleteReminder")
    const query = `DELETE FROM reminders WHERE id = $1`
  try{
    const response = db.oneOrNone(query,[id])
    return response
  }catch(error){
    error.message('Can not delete reminder',error.message)
  }
  }

}

export default Chatbot;