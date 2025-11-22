import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import connectDB from "./config/db.js";

const PORT = process.env.PORT || 3000;

const startserver = async () => {
  try {
    await connectDB();  

    await import("./utils/mqttClient.js");

    app.listen(PORT, () => {
      console.log(`Server running on port: ${PORT}`);
    });
  } catch (error) {
    console.error("Server connection failed", error);
    process.exit(1);
  }
};
startserver();