// index.js
import dotenv from "dotenv";
import { program } from "commander";
import { generateKeys, sharePublicKey } from "./src/utils/keys.js";
import { sendMessage, readMessage } from "./src/utils/messages.js";

dotenv.config();

async function main() {
  program
    .command("generate-keys")
    .description("Generate RSA key pair")
    .action(generateKeys);

  program
    .command("share-public-key")
    .description("Share your public key")
    .action(sharePublicKey);

  program
    .command("send-message")
    .description("Send an encrypted message")
    .action(sendMessage);

  program
    .command("read-message")
    .description("Read and decrypt a message")
    .action(readMessage);

  program.parse(process.argv);
}

main().catch((error) => console.error(error));
