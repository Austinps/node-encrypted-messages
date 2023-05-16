# App Name: Node Encrypted Chat

## Description:

This command-line application allows users to generate RSA key pairs, share public keys, send encrypted messages, and read encrypted messages.

## Usage:

### Generate RSA Key Pair:

Run node app.js generate-keys to generate an RSA key pair. You will be prompted to enter a passphrase to protect the private key. The generated keys will be saved in the keys directory, and the public key will be stored in a MongoDB database.

### Share Public Key:

Run node app.js share-public-key to share your public key with others. Your public key will be read from the keys directory and inserted into the MongoDB database.

### Send Encrypted Message:

Run node app.js send-message to send an encrypted message. You will be prompted to enter the recipient's public key and the message to encrypt. The encrypted message will be stored in the MongoDB database along with the sender's public key and recipient's public key.

### Read Encrypted Message:

Run node app.js read-message to read an encrypted message. You will be prompted to enter the sender's public key and the encrypted message. The message will be decrypted using the recipient's private key and displayed on the console.

## Dependencies:

#### crypto:

for cryptographic operations

#### fs:

for file system operations

#### path:

for file path manipulation

#### mongodb:

for connecting to a MongoDB database
https://www.npmjs.com/package/mongodb

#### commander:

for creating a command-line interface
https://www.npmjs.com/package/commander

#### inquirer:

for interactive prompts
https://www.npmjs.com/package/inquirer

#### readline-sync:

for synchronous user input
https://www.npmjs.com/package/readline-sync

## Configuration:

#### MongoDB Connection:

Set the environment variable MONGODB_URI to the URI of the MongoDB database you want to use. If not set, it defaults to mongodb://localhost:27017.
