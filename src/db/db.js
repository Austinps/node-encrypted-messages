import { MongoClient } from "mongodb";
import logger from "../utils/logger.js";

let dbClient;

export async function connectToDatabase() {
  try {
    if (!dbClient) {
      const client = new MongoClient(process.env.MONGODB_URI, {
        useUnifiedTopology: true,
      });

      await client.connect();

      dbClient = client;
    }

    return dbClient.db(process.env.DB_NAME);
  } catch (error) {
    logger.error("Failed to connect to the database:", error);
    throw error;
  }
}

let cachedDb;

export async function getDatabase() {
  if (!cachedDb) {
    cachedDb = await connectToDatabase();
  }
  return cachedDb;
}

export async function getUserCollection() {
  const db = await getDatabase();
  return db.collection("users");
}

export async function getMessageCollection() {
  const db = await getDatabase();
  return db.collection("messages");
}
