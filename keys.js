// keys.js

import path from "path";
import { fileURLToPath } from "url";
import { generateKeyPairSync } from "crypto";
import { promises as fs } from "fs";
import inquirer from "inquirer";
import { connectToDatabase } from "./db.js";
import { hashPassword, comparePassword } from "./hash.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const KEY_LENGTH = 4096;

export async function generateKeys() {
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

    const db = await connectToDatabase();

    // Check if the user already exists in the database
    const existingUser = await db.findOne({ username });
    if (existingUser) {
      // User already exists, verify the password
      const passwordMatch = await comparePassword(
        passphrase,
        existingUser.password
      );
      if (!passwordMatch) {
        console.log("Incorrect password.");
        return;
      }

      console.log("User already exists. RSA keys will not be generated again.");
      return;
    }

    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
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

    const hashedPassword = await hashPassword(passphrase);
    await db.insertOne({ username, publicKey, password: hashedPassword });

    console.log("RSA keys generated and saved successfully.");
  } catch (error) {
    console.error("Failed to generate and save RSA keys:", error);
    process.exit(1);
  }
}

export async function sharePublicKey() {
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
