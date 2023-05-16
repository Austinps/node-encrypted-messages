const crypto = require("crypto");
const fs = require("fs").promises;
const path = require("path");
const { MongoClient } = require("mongodb");
const { program } = require("commander");
const inquirer = require("inquirer");

const KEY_LENGTH = 4096;
const MONGO_URI = "mongodb://localhost:27017";
const DB_NAME = "key_exchange";
const COLLECTION_NAME = "users";

async function connectToDatabase() {
  try {
    const client = new MongoClient(MONGO_URI, { useUnifiedTopology: true });
    await client.connect();
    return client.db(DB_NAME).collection(COLLECTION_NAME);
  } catch (error) {
    console.error("Failed to connect to the database:", error);
    process.exit(1);
  }
}

async function generateKeys() {
  try {
    const passphrase = await inquirer.prompt([
      {
        type: "password",
        name: "passphrase",
        message: "Enter passphrase to protect the private key:",
        mask: "*",
      },
    ]);

    const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: KEY_LENGTH,
      privateKeyEncoding: {
        type: "pkcs1",
        format: "pem",
        cipher: "aes-256-cbc",
        passphrase: passphrase,
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
    await db.insertOne({ publicKey: publicKey });

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

    const db = await connectToDatabase();
    await db.insertOne({ publicKey: publicKey });

    console.log("Your public key has been shared.");
  } catch (error) {
    console.error("Failed to share public key:", error);
    process.exit(1);
  }
}

async function sendMessage() {
  try {
    const db = await connectToDatabase();

    const { recipientPublicKey, message } = await inquirer.prompt([
      {
        type: "input",
        name: "recipientPublicKey",
        message: "Recipient public key:",
        validate: (value) => value.length > 0,
      },
      {
        type: "input",
        name: "message",
        message: "Enter the message to encrypt:",
        validate: (value) => value.length > 0,
      },
    ]);

    const encryptedMessage = await encryptMessage(message, recipientPublicKey);
    console.log("Encrypted message:", encryptedMessage);

    const senderPublicKeyPath = path.join(__dirname, "keys", "public_key.pem");
    const senderPublicKey = await fs.readFile(senderPublicKeyPath, "utf8");

    await db.insertOne({
      senderPublicKey: senderPublicKey,
      recipientPublicKey: recipientPublicKey,
      encryptedMessage: encrypted
      Message: encryptedMessage,
    });

    console.log("Message sent successfully.");
  } catch (error) {
    console.error("Failed to send message:", error);
    process.exit(1);
  }
}

async function readMessage() {
  try {
    const db = await connectToDatabase();

    const { senderPublicKey, encryptedMessage } = await inquirer.prompt([
      {
        type: "input",
        name: "senderPublicKey",
        message: "Sender's public key:",
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
    const decrypted = crypto.privateDecrypt(
      {
        key: privateKey,
        passphrase: readlineSync.question("Enter your private key passphrase: ", {
          hideEchoBack: true,
          mask: "*",
        }),
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
  .action(async () => {
    await generateKeys();
  });

program
  .command("share-public-key")
  .description("Share your public key with others")
  .action(async () => {
    await sharePublicKey();
  });

program
  .command("send-message")
  .description("Send an encrypted message")
  .action(async () => {
    await sendMessage();
  });

program
  .command("read-message")
  .description("Read an encrypted message")
  .action(async () => {
    await readMessage();
  });

program.parse(process.argv);

