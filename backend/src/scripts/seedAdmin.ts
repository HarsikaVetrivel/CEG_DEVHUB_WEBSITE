import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import { connectDatabase, disconnectDatabase } from '../config/database.js';
import User from '../models/User.js';

async function seedAdmin() {
  try {
    const username = process.env.ADMIN_EMAIL?.trim();
    const plainPassword = process.env.ADMIN_PASSWORD;
    if (!username || !plainPassword) {
      throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD before running the admin seed script.');
    }
    if (plainPassword.length < 12) {
      throw new Error('ADMIN_PASSWORD must be at least 12 characters long.');
    }

    console.log('Connecting to MongoDB...');
    await connectDatabase();

    const passwordHash = await bcrypt.hash(plainPassword, 12);

    // Upsert admin user
    const existingUser = await User.findOne({ email: username });

    if (existingUser) {
      console.log(`Found existing user with email/username "${username}". Updating role and password...`);
      existingUser.fullName = 'DevHub Administrator';
      existingUser.passwordHash = passwordHash;
      existingUser.role = 'ADMIN';
      existingUser.isActive = true;
      existingUser.emailVerified = true;
      await existingUser.save();
      console.log(`✅ Admin user "${username}" updated successfully!`);
    } else {
      console.log(`Creating new admin user "${username}"...`);
      await User.create({
        fullName: 'DevHub Administrator',
        email: username,
        passwordHash,
        role: 'ADMIN',
        isActive: true,
        emailVerified: true,
      });
      console.log(`✅ Admin user "${username}" created successfully!`);
    }

    const adminInDb = await User.findOne({ email: username }).select('+passwordHash');
    console.log('Verification:');
    console.log(`- ID: ${adminInDb?._id}`);
    console.log(`- Email/Username: ${adminInDb?.email}`);
    console.log(`- Full Name: ${adminInDb?.fullName}`);
    console.log(`- Role: ${adminInDb?.role}`);
    console.log(`- Active: ${adminInDb?.isActive}`);
    console.log(`- Password Matches: ${await adminInDb?.comparePassword(plainPassword)}`);

    await disconnectDatabase();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin user:', error);
    process.exit(1);
  }
}

seedAdmin();
