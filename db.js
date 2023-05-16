// db.js

import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const DB_NAME = process.env.DB_NAME || "key_exchange";
const COLLECTION_NAME = process.env.COLLECTION_NAME || "users";
const MESSAGE_COLLECTION_NAME =
  process.env.MESSAGE_COLLECTION_NAME || "messages";

export async function connectToDatabase() {
  try {
    const client = new MongoClient(MONGODB_URI, { useUnifiedTopology: true });
    await client.connect();
    return client.db(DB_NAME).collection(COLLECTION_NAME);
  } catch (error) {
    console.error("Failed to connect to the database:", error);
    process.exit(1);
  }
}

export async function connectToMessageCollection() {
  try {
    const client = new MongoClient(MONGODB_URI, { useUnifiedTopology: true });
    await client.connect();
    return client.db(DB_NAME).collection(MESSAGE_COLLECTION_NAME);
  } catch (error) {
    console.error("Failed to connect to the message collection:", error);
    process.exit(1);
  }
}
