// messages.js
import path from "path";
import { fileURLToPath } from "url";
import { promises as fs } from "fs";
import inquirer from "inquirer";
import { getMessageCollection } from "./db.js";
import { getUserCollection } from "./db.js";
import { encryptMessage, decryptMessage } from "./encryption.js";
import { comparePassword } from "./hash.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function sendMessage() {
  try {
    const db = await getUserCollection();
    const messageDb = await getMessageCollection();

    const { recipientUsername, message } = await inquirer.prompt([
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

    // Get recipient's user from the database
    const recipient = await db.findOne({ username: recipientUsername });

    if (!recipient) {
      console.log("Recipient not found.");
      return;
    }

    const encryptedMessage = await encryptMessage(message, recipient.publicKey);
    console.log("Encrypted message:", encryptedMessage);

    const senderPublicKeyPath = path.join(__dirname, "keys", "public_key.pem");
    const senderPublicKey = await fs.readFile(senderPublicKeyPath, "utf8");

    const { username, password } = await inquirer.prompt([
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

    const sender = await db.findOne({ username });
    const passwordMatch = await comparePassword(password, sender.password);
    if (!passwordMatch) {
      console.log("Incorrect password.");
      return;
    }

    await messageDb.insertOne({
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
    const db = await getUserCollection();
    const messageDb = await getMessageCollection();

    const { username, password } = await inquirer.prompt([
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

    const user = await db.findOne({ username });
    if (!user) {
      console.log("User not found.");
      return;
    }

    const passwordMatch = await comparePassword(password, user.password);
    if (!passwordMatch) {
      console.log("Incorrect password.");
      return;
    }

    const messages = await messageDb
      .find({ recipientUsername: username })
      .toArray();
    if (messages.length === 0) {
      console.log("You have no messages.");
      return;
    }

    console.log("Your messages:");
    messages.forEach((message, index) => {
      console.log(`${index + 1}. Sender: ${message.senderUsername}`);
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
    const privateKeyPath = path.join(__dirname, "keys", "private_key.pem");
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
