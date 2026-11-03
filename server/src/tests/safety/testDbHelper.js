import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export async function ensureDbConnected() {
  if (mongoose.connection.readyState === 1) {
    return;
  }
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/companio';
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
  });
}

export async function closeDbConnection() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

export default {
  ensureDbConnected,
  closeDbConnection,
};
