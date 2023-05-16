// db.js

import { MongoClient } from "mongodb";

let dbClient;

export async function connectToDatabase() {
  try {
    if (!dbClient) {
      dbClient = new MongoClient(process.env.MONGODB_URI, {
        useUnifiedTopology: true,
      });
      await dbClient.connect();
    }
    return dbClient.db(process.env.DB_NAME);
  } catch (error) {
    console.error("Failed to connect to the database:", error);
    process.exit(1);
  }
}

// controller.js

export async function getUserCollection() {
  const db = await connectToDatabase();
  return db.collection("users");
}

export async function getMessageCollection() {
  const db = await connectToDatabase();
  return db.collection("messages");
}
