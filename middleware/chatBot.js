import moment from "moment-timezone";
import db from "../config/db.js";

class Chatbot {
  static async processCommand(message, userId, userTimeZone) {
    try {
      // Updated regex to allow optional quotes around the title
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

        await Chatbot.storeReminder(userId, title, time.toISOString());
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

        const time = moment().add(duration);

        if (time.isAfter(moment().endOf("day"))) {
          return { error: "Reminders can only be set for the same day." };
        }

        await Chatbot.storeReminder(userId, title, time.toISOString());
        return { time: time.toISOString(), title };
      }

      return { error: "Invalid time format. Provide a valid absolute or relative time." };
    } catch (error) {
      console.error("Error processing command:", error);
      return { error: "An unexpected error occurred." };
    }
  }

  static async storeReminder(userId, title, time) {
    const query = `INSERT INTO reminders (user_id, title, time) VALUES ($1, $2, $3)`;
    await db.query(query, [userId, title, time]);
  }

  static async getReminders(userId){
    const query = `SELECT * FROM reminders WHERE user_id = $1 ORDER BY time ASC`;
    const {rows} = await db.manyOrNone(query, [userId]);
    console.log(rows)
    return rows;
  }
}

export default Chatbot;
