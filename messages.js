// messages.js
import path from "path";
import { fileURLToPath } from "url";
import { promises as fs } from "fs";
import inquirer from "inquirer";
import { getMessageCollection, getUserCollection } from "./db.js";
import { encryptMessage, decryptMessage } from "./encryption.js";
import { comparePassword } from "./hash.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Prompts
async function promptRecipientDetails() {
  return inquirer.prompt([
    {
      type: "input",
      name: "recipientUsername",
      message: "Recipient username:",
      validate: (value) => value.length > 0,
    },
    {
      type: "input",
      name: "message",
      message: "Enter the message to encrypt:",
      validate: (value) => value.length > 0,
    },
  ]);
}

async function promptUserCredentials() {
  return inquirer.prompt([
    {
      type: "input",
      name: "username",
      message: "Enter your username:",
      validate: (value) => value.length > 0,
    },
    {
      type: "password",
      name: "password",
      message: "Enter your password:",
      mask: "*",
    },
  ]);
}

// Helper functions
function resolveFilePath(...paths) {
  return path.resolve(__dirname, ...paths);
}

// Error handling functions
function logAndExit(message) {
  console.error(message);
  process.exit(1);
}

// Main functions
export async function sendMessage() {
  try {
    const userCollection = await getUserCollection();
    const messageCollection = await getMessageCollection();

    const { recipientUsername, message } = await promptRecipientDetails();

    const recipient = await userCollection.findOne({
      username: recipientUsername,
    });
    if (!recipient) {
      logAndExit("Recipient not found.");
    }

    const encryptedMessage = await encryptMessage(message, recipient.publicKey);
    console.log("Encrypted message:", encryptedMessage);

    const senderPublicKeyPath = resolveFilePath("keys", "public_key.pem");
    const senderPublicKey = await fs.readFile(senderPublicKeyPath, "utf8");

    const { username, password } = await promptUserCredentials();

    const sender = await userCollection.findOne({ username });
    if (!sender) {
      logAndExit("Sender not found.");
    }

    const passwordMatch = await comparePassword(password, sender.password);
    if (!passwordMatch) {
      logAndExit("Incorrect password.");
    }

    await messageCollection.insertOne({
      sender: sender._id,
      recipient: recipient._id,
      senderPublicKey,
      recipientPublicKey: recipient.publicKey,
      encryptedMessage,
    });

    console.log("Message sent successfully.");
  } catch (error) {
    console.error("Failed to send message:", error);
    process.exit(1);
  }
}

export async function readMessage() {
  try {
    const userCollection = await getUserCollection();
    const messageCollection = await getMessageCollection();

    const { username, password } = await promptUserCredentials();

    const user = await userCollection.findOne({ username });
    if (!user) {
      logAndExit("User not found.");
    }

    const passwordMatch = await comparePassword(password, user.password);
    if (!passwordMatch) {
      logAndExit("Incorrect password.");
    }

    const messages = await messageCollection
      .aggregate([
        {
          $match: { recipient: user._id },
        },
        {
          $lookup: {
            from: "users",
            localField: "sender",
            foreignField: "_id",
            as: "senderDetails",
          },
        },
        {
          $unwind: "$senderDetails",
        },
        {
          $lookup: {
            from: "users",
            localField: "senderDetails._id",
            foreignField: "_id",
            as: "senderUsername",
          },
        },
        {
          $unwind: "$senderUsername",
        },
        {
          $project: {
            _id: 0,
            sender: "$senderUsername.username",
            sentTime: 1,
            encryptedMessage: 1,
          },
        },
      ])
      .toArray();

    if (messages.length === 0) {
      console.log("You have no messages.");
      return;
    }

    console.log("Your messages:");
    messages.forEach((message, index) => {
      console.log(
        `${index + 1}. Sender: ${message.sender}, Sent Time: ${
          message.sentTime
        }`
      );
    });

    const { messageIndex } = await inquirer.prompt([
      {
        type: "number",
        name: "messageIndex",
        message: "Enter the number of the message you want to read:",
        validate: (value) =>
          value >= 1 && value <= messages.length
            ? true
            : "Invalid message number",
      },
    ]);

    const selectedMessage = messages[messageIndex - 1];
    const privateKeyPath = resolveFilePath("keys", "private_key.pem");
    const decryptedMessage = await decryptMessage(
      selectedMessage.encryptedMessage,
      privateKeyPath
    );

    console.log("Decrypted message:");
    console.log(decryptedMessage);
  } catch (error) {
    console.error("Failed to read message:", error);
    process.exit(1);
  }
}
