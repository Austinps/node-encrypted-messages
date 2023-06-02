// encryption.js

import { publicEncrypt, privateDecrypt } from "crypto";
import { promises as fs } from "fs";
import inquirer from "inquirer";

export async function encryptMessage(message, publicKey) {
  try {
    const buffer = Buffer.from(message, "utf8");
    const encrypted = publicEncrypt(publicKey, buffer);
    return encrypted.toString("base64");
  } catch (error) {
    console.error("Failed to encrypt message:", error);
    throw error; // Throw the error instead of exiting the process
  }
}

export async function decryptMessage(encryptedMessage, privateKeyPath) {
  try {
    const privateKey = await fs.readFile(privateKeyPath, "utf8");
    const buffer = Buffer.from(encryptedMessage, "base64");

    const passphrasePrompt = await inquirer.prompt([
      {
        type: "password",
        name: "passphrase",
        message: "Enter passphrase to decrypt the private key:",
        mask: "*",
      },
    ]);

    const decrypted = privateDecrypt(
      {
        key: privateKey,
        passphrase: passphrasePrompt.passphrase,
      },
      buffer
    );

    return decrypted.toString("utf8");
  } catch (error) {
    console.error("Failed to decrypt message:", error);
    throw new Error("Failed to decrypt message"); // Throw a new error instead of the original error
  }
}
