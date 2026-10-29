import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod: MongoMemoryServer;

/**
 * Start an in-memory MongoDB instance and connect Mongoose before all tests.
 */
export async function connectTestDb() {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
}

/**
 * Drop all collections between tests so each test starts with a clean state.
 */
export async function clearTestDb() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key]!.deleteMany({});
  }
}

/**
 * Disconnect and stop the in-memory server after all tests.
 */
export async function disconnectTestDb() {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
}

