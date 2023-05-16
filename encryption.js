// encryption.js

import { publicEncrypt, privateDecrypt } from "crypto";
import { promises as fs } from "fs";
import readlineSync from "readline-sync";

export async function encryptMessage(message, publicKey) {
  try {
    const buffer = Buffer.from(message, "utf8");
    const encrypted = publicEncrypt(publicKey, buffer);
    return encrypted.toString("base64");
  } catch (error) {
    console.error("Failed to encrypt message:", error);
    process.exit(1);
  }
}

export async function decryptMessage(encryptedMessage, privateKeyPath) {
  try {
    const privateKey = await fs.readFile(privateKeyPath, "utf8");
    const buffer = Buffer.from(encryptedMessage, "base64");
    const decrypted = privateDecrypt(
      {
        key: privateKey,
        passphrase: readlineSync.question(
          "Enter passphrase to decrypt the private key: ",
          {
            hideEchoBack: true,
          }
        ),
      },
      buffer
    );
    return decrypted.toString("utf8");
  } catch (error) {
    console.error("Failed to decrypt message:", error);
    process.exit(1);
  }
}
