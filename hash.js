// hash.js

import bcrypt from "bcrypt";

export async function hashPassword(password) {
  try {
    const saltRounds = parseInt(process.env.SALT_ROUNDS, 10);
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
  } catch (error) {
    console.error("Failed to hash password:", error);
    throw error; // Throw the error instead of exiting the process
  }
}

export async function comparePassword(password, hashedPassword) {
  try {
    const isMatch = await bcrypt.compare(password, hashedPassword);
    return isMatch;
  } catch (error) {
    console.error("Failed to compare passwords:", error);
    throw error; // Throw the error instead of exiting the process
  }
}
