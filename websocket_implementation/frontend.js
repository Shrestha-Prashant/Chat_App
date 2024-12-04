const ws = new WebSocket("ws://localhost:8080");

ws.onopen = () => {
  console.log("Connected to WebSocket server");
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.eventType === "message") {
    console.log(`New message in room ${data.roomId}: ${data.message}`);
    // Display the message on the frontend
  }

  if (data.eventType === "reminder") {
    console.log(`Reminder for user ${data.userId}: ${data.title} at ${data.time}`);
    // Display the reminder on the frontend
  }
};

ws.onerror = (error) => {
  console.error("WebSocket error:", error);
};

ws.onclose = () => {
  console.log("WebSocket connection closed");
};
