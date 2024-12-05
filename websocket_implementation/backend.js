import WebSocket from "ws";
import sdk from "matrix-js-sdk";
import moment from "moment-timezone";
import Chatbot from "./Chatbot"; // Import your chatbot logic

const startMatrixSyncWithWebSocket = async (userId, accessToken, port = 8080) => {
  // WebSocket Server
  const wss = new WebSocket.Server({ port });
  console.log(`WebSocket server started on port ${port}`);

  // Matrix Client
  const client = sdk.createClient({
    baseUrl: "http://localhost:8008",
    accessToken,
    userId,
  });

  client.startClient();

  //check for types, files, messages, reminders
  wss.on("connection", (ws) => {
    console.log("Frontend connected to WebSocket");

    // Send initial message to frontend
    ws.send(JSON.stringify({ message: "Connection established" }));

    // Event Listener for Matrix messages
    client.on("Room.timeline", async (event, room) => {
      if (event.getType() === "m.room.message") {
        const content = event.getContent();
        const body = content.body;

        if (body) {
          // Check if chatbot activation is needed
          if (body.startsWith("#remind")) {
            const sender = event.getSender();
            const userTimeZone = "UTC"; // Replace with the actual user's timezone

            const response = await Chatbot.processCommand(body, sender, userTimeZone);

            if (response.error) {
              await client.sendEvent(event.getRoomId(), "m.room.message", {
                msgtype: "m.notice",
                body: response.error,
              });
            } else {
              await client.sendEvent(event.getRoomId(), "m.room.message", {
                msgtype: "m.notice",
                body: `Reminder set: "${response.title}" at ${response.time}`,
              });

              // Schedule the reminder
              scheduleReminder(response.time, response.title, sender, ws);
            }
          }

          // Send regular messages to frontend
          ws.send(
            JSON.stringify({
              eventType: "message",
              roomId: room.roomId,
              sender: event.getSender(),
              message: body,
              msgtype: content.msgtype,
            })
          );
        }
      }
    });
  });

  // Schedule Reminder
  const scheduleReminder = (time, title, userId, ws) => {
    const reminderTime = moment(time);
    const delay = reminderTime.diff(moment());

    setTimeout(() => {
      console.log(`Reminder for ${userId}: "${title}"`);
      ws.send(
        JSON.stringify({
          eventType: "reminder",
          userId,
          title,
          time: reminderTime.toISOString(),
        })
      );
    }, delay);
  };
};

export default startMatrixSyncWithWebSocket;
