// masterKey.js

import crypto from "crypto";

function generateMasterKey() {
  const key = crypto.randomBytes(32);
  const keyString = key.toString("hex");

  return keyString;
}

const masterKey = generateMasterKey();
console.log(masterKey);
