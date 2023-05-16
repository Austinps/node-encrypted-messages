import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { MongoClient } from "mongodb";
import { program } from "commander";
import inquirer from "inquirer";
import readlineSync from "readline-sync";

const KEY_LENGTH = 4096;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const DB_NAME = process.env.DB_NAME || "key_exchange";
const COLLECTION_NAME = process.env.COLLECTION_NAME || "users";
const MESSAGE_COLLECTION_NAME =
  process.env.MESSAGE_COLLECTION_NAME || "messages";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function connectToDatabase() {
  try {
    const client = new MongoClient(MONGODB_URI, { useUnifiedTopology: true });
    await client.connect();
    return client.db(DB_NAME).collection(COLLECTION_NAME);
  } catch (error) {
    console.error("Failed to connect to the database:", error);
    process.exit(1);
  }
}

async function connectToMessageCollection() {
  try {
    const client = new MongoClient(MONGODB_URI, { useUnifiedTopology: true });
    await client.connect();
    return client.db(DB_NAME).collection(MESSAGE_COLLECTION_NAME);
  } catch (error) {
    console.error("Failed to connect to the message collection:", error);
    process.exit(1);
  }
}

async function generateKeys() {
  try {
    const { passphrase, username } = await inquirer.prompt([
      {
        type: "password",
        name: "passphrase",
        message: "Enter passphrase to protect the private key:",
        mask: "*",
      },
      {
        type: "input",
        name: "username",
        message: "Enter your username:",
        validate: (value) => value.length > 0,
      },
    ]);

    const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: KEY_LENGTH,
      privateKeyEncoding: {
        type: "pkcs1",
        format: "pem",
        cipher: "aes-256-cbc",
        passphrase,
      },
      publicKeyEncoding: {
        type: "pkcs1",
        format: "pem",
      },
    });

    const privateKeyPath = path.join(__dirname, "keys", "private_key.pem");
    const publicKeyPath = path.join(__dirname, "keys", "public_key.pem");

    await fs.mkdir(path.dirname(privateKeyPath), { recursive: true });
    await fs.writeFile(privateKeyPath, privateKey);
    await fs.writeFile(publicKeyPath, publicKey);

    const db = await connectToDatabase();
    await db.insertOne({ username, publicKey });

    console.log("RSA keys generated and saved successfully.");
  } catch (error) {
    console.error("Failed to generate and save RSA keys:", error);
    process.exit(1);
  }
}

async function sharePublicKey() {
  try {
    const publicKeyPath = path.join(__dirname, "keys", "public_key.pem");
    const publicKey = await fs.readFile(publicKeyPath, "utf8");

    const { username } = await inquirer.prompt([
      {
        type: "input",
        name: "username",
        message: "Enter your username:",
        validate: (value) => value.length > 0,
      },
    ]);

    const db = await connectToDatabase();
    await db.insertOne({ username: username, publicKey: publicKey });

    console.log("Your public key has been shared.");
  } catch (error) {
    console.error("Failed to share public key:", error);
    process.exit(1);
  }
}

async function sendMessage() {
  try {
    const db = await connectToDatabase();
    const messageDb = await connectToMessageCollection();

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

    // Get recipient's public key from the database
    const recipient = await db.findOne({ username: recipientUsername });

    if (!recipient) {
      console.log("Recipient not found.");
      return;
    }

    const encryptedMessage = await encryptMessage(message, recipient.publicKey);
    console.log("Encrypted message:", encryptedMessage);

    const senderPublicKeyPath = path.join(__dirname, "keys", "public_key.pem");
    const senderPublicKey = await fs.readFile(senderPublicKeyPath, "utf8");

    const { username } = await inquirer.prompt([
      {
        type: "input",
        name: "username",
        message: "Enter your username:",
        validate: (value) => value.length > 0,
      },
    ]);

    await messageDb.insertOne({
      senderUsername: username,
      recipientUsername: recipient.username,
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

async function readMessage() {
  try {
    const messageDb = await connectToMessageCollection();

    const { senderUsername, encryptedMessage } = await inquirer.prompt([
      {
        type: "input",
        name: "senderUsername",
        message: "Sender's username:",
        validate: (value) => value.length > 0,
      },
      {
        type: "input",
        name: "encryptedMessage",
        message: "Enter the encrypted message:",
        validate: (value) => value.length > 0,
      },
    ]);

    const privateKeyPath = path.join(__dirname, "keys", "private_key.pem");
    const decryptedMessage = await decryptMessage(
      encryptedMessage,
      privateKeyPath
    );
    console.log("Decrypted message:", decryptedMessage);

    // You can perform additional actions with the decrypted message here
  } catch (error) {
    console.error("Failed to read message:", error);
    process.exit(1);
  }
}

async function encryptMessage(message, publicKey) {
  try {
    const buffer = Buffer.from(message, "utf8");
    const encrypted = crypto.publicEncrypt(publicKey, buffer);
    return encrypted.toString("base64");
  } catch (error) {
    console.error("Failed to encrypt message:", error);
    process.exit(1);
  }
}

async function decryptMessage(encryptedMessage, privateKeyPath) {
  try {
    const privateKey = await fs.readFile(privateKeyPath, "utf8");
    const buffer = Buffer.from(encryptedMessage, "base64");
    const passphrase = readlineSync.question(
      "Enter your private key passphrase: ",
      {
        hideEchoBack: true,
        mask: "*",
      }
    );
    const decrypted = crypto.privateDecrypt(
      {
        key: privateKey,
        passphrase: passphrase,
      },
      buffer
    );
    return decrypted.toString("utf8");
  } catch (error) {
    console.error("Failed to decrypt message:", error);
    process.exit(1);
  }
}

// Define the command-line interface
program
  .command("generate-keys")
  .description("Generate RSA key pair")
  .option("-g, --generate", "Generate RSA key pair")
  .action(async () => {
    await generateKeys();
  });

program
  .command("share-public-key")
  .description("Share your public key with others")
  .option("-s, --share", "Share your public key with others")
  .action(async () => {
    await sharePublicKey();
  });

program
  .command("send-message")
  .description("Send an encrypted message")
  .option("-m, --send", "Send an encrypted message")
  .action(async () => {
    await sendMessage();
  });

program
  .command("read-message")
  .description("Read an encrypted message")
  .option("-r, --read", "Read an encrypted message")
  .action(async () => {
    await readMessage();
  });

program
  .command("download-public-key")
  .description("Download a user's public key")
  .option("-d, --download", "Download a user's public key")
  .action(async () => {
    try {
      const { username } = await inquirer.prompt([
        {
          type: "input",
          name: "username",
          message:
            "Enter the username of the user whose public key you want to download:",
          validate: (value) => value.length > 0,
        },
      ]);

      const db = await connectToDatabase();
      const user = await db.findOne({ username });

      if (!user) {
        console.log("User not found.");
        return;
      }

      const publicKeyPath = path.join(
        __dirname,
        "keys",
        `${username}_public_key.pem`
      );
      await fs.writeFile(publicKeyPath, user.publicKey);

      console.log(`Public key of ${username} downloaded successfully.`);
    } catch (error) {
      console.error("Failed to download public key:", error);
      process.exit(1);
    }
  });

// Default action
program.action(() => {
  console.log("Invalid command. Please see usage instructions:");
  program.help();
});
// Parse the command-line arguments
program.parse(process.argv);
