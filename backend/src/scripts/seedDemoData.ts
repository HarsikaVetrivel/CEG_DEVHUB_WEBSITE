/**
 * seedDemoData.ts
 *
 * Seeds realistic sample hackathons (all PUBLISHED) and one demo student
 * so the landing page shows real statistics on a fresh install.
 *
 * Run with:  npm run seed:demo
 *
 * Safe to re-run — uses upsert logic so existing records are not duplicated.
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import { connectDatabase, disconnectDatabase } from '../config/database.js';
import Hackathon from '../models/Hackathon.js';
import User from '../models/User.js';

// ── helpers ──────────────────────────────────────────────────────────────────
const daysFromNow = (n: number) => new Date(Date.now() + n * 86_400_000);

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

// ── demo student ─────────────────────────────────────────────────────────────
const DEMO_STUDENT = {
  fullName: 'Demo Student',
  email: 'demo@student.annauniv.edu',
  password: 'Demo@1234',
  yearOfStudy: 3,
  course: 'B.E. Computer Science',
  interestedDomains: ['AI/ML', 'Web Development'],
};

// ── sample hackathons ─────────────────────────────────────────────────────────
type HackathonSeed = {
  name: string;
  organizer: string;
  description: string;
  registrationUrl: string;
  startDate: Date;
  endDate: Date;
  registrationDeadline: Date;
  location: string;
  mode: 'ONLINE' | 'OFFLINE' | 'HYBRID';
  domains: (typeof import('../models/Hackathon.js').HACKATHON_DOMAINS)[number][];
  eligibility: string;
  minimumTeamSize: number;
  maximumTeamSize: number;
  prizeDetails: string;
  requiredSkills: string[];
  lifecycleStatus: 'UPCOMING' | 'ONGOING' | 'REGISTRATION_OPEN' | 'REGISTRATION_CLOSED';
};

const HACKATHONS: HackathonSeed[] = [
  {
    name: 'HackCEG 2026',
    organizer: 'CEG Tech Forum',
    description:
      'HackCEG is the flagship 36-hour hackathon of College of Engineering, Guindy. ' +
      'Build solutions in AI/ML, Web Dev, IoT, and more. Top teams win cash prizes and fast-track internship interviews.',
    registrationUrl: 'https://hackceg.example.com/register',
    startDate: daysFromNow(20),
    endDate: daysFromNow(22),
    registrationDeadline: daysFromNow(14),
    location: 'CEG Campus, Chennai',
    mode: 'OFFLINE',
    domains: ['AI/ML', 'Web Development', 'IoT'],
    eligibility: 'Open to all CEG students across all departments and years.',
    minimumTeamSize: 2,
    maximumTeamSize: 4,
    prizeDetails: '🥇 ₹50,000  🥈 ₹25,000  🥉 ₹10,000 + goodies & internship fast-tracks',
    requiredSkills: ['Python', 'React', 'Machine Learning', 'Node.js'],
    lifecycleStatus: 'REGISTRATION_OPEN',
  },
  {
    name: 'Smart India Hackathon 2026',
    organizer: 'Ministry of Education, Govt. of India',
    description:
      'SIH is a nationwide initiative to provide students with a platform to solve pressing problems ' +
      'faced by industries and government sectors. Problems span agriculture, health, education, smart cities and more.',
    registrationUrl: 'https://sih.gov.in/register',
    startDate: daysFromNow(35),
    endDate: daysFromNow(37),
    registrationDeadline: daysFromNow(21),
    location: 'Multiple Nodal Centres, India',
    mode: 'OFFLINE',
    domains: ['AI/ML', 'Data Science', 'Cloud', 'Open Innovation'],
    eligibility: 'Open to all Indian engineering and technology students.',
    minimumTeamSize: 6,
    maximumTeamSize: 6,
    prizeDetails: '₹1,00,000 per winning team + certificates + national recognition',
    requiredSkills: ['Python', 'Data Analysis', 'Cloud Computing', 'IoT', 'Embedded Systems'],
    lifecycleStatus: 'UPCOMING',
  },
  {
    name: 'CodeStorm — Web Dev Sprint',
    organizer: 'CSEA CEG',
    description:
      'A 24-hour online web development hackathon focused on building accessible, responsive, ' +
      'and performant web applications. Open theme — bring your creativity!',
    registrationUrl: 'https://codestorm.example.com/apply',
    startDate: daysFromNow(10),
    endDate: daysFromNow(11),
    registrationDeadline: daysFromNow(7),
    location: 'Online',
    mode: 'ONLINE',
    domains: ['Web Development', 'Open Innovation'],
    eligibility: 'CEG students of any year or department. Solo or team.',
    minimumTeamSize: 1,
    maximumTeamSize: 3,
    prizeDetails: '₹10,000 first prize · ₹5,000 runner-up · Best UI award ₹2,500',
    requiredSkills: ['HTML', 'CSS', 'JavaScript', 'React', 'TypeScript'],
    lifecycleStatus: 'REGISTRATION_OPEN',
  },
  {
    name: 'DataQuest 2026',
    organizer: 'IEEE CEG Student Branch',
    description:
      'Compete to build the best data-driven solution using real-world datasets. ' +
      'Tasks include data cleaning, feature engineering, model building, and a compelling visual story.',
    registrationUrl: 'https://dataquest-ceg.example.com',
    startDate: daysFromNow(45),
    endDate: daysFromNow(46),
    registrationDeadline: daysFromNow(30),
    location: 'CEG Campus, Chennai',
    mode: 'HYBRID',
    domains: ['Data Science', 'AI/ML'],
    eligibility: 'All CEG students. Prior experience with Python or R recommended.',
    minimumTeamSize: 1,
    maximumTeamSize: 3,
    prizeDetails: '₹15,000 + trophies + LinkedIn featured winners post',
    requiredSkills: ['Python', 'Pandas', 'scikit-learn', 'Tableau', 'SQL'],
    lifecycleStatus: 'UPCOMING',
  },
  {
    name: 'BlockBuild: Blockchain Hackathon',
    organizer: 'Blockchain Club CEG',
    description:
      'Build decentralised applications on Ethereum or Solana. Problem statements cover DeFi, ' +
      'supply-chain transparency, digital identity, and NFT utility. Mentors from leading Web3 firms.',
    registrationUrl: 'https://blockbuild.example.com',
    startDate: daysFromNow(28),
    endDate: daysFromNow(30),
    registrationDeadline: daysFromNow(18),
    location: 'Online',
    mode: 'ONLINE',
    domains: ['Blockchain', 'Web Development'],
    eligibility: 'Open to all students with interest in Web3. Beginner-friendly tracks available.',
    minimumTeamSize: 1,
    maximumTeamSize: 4,
    prizeDetails: '0.5 ETH for winner · 0.2 ETH runner-up · Best beginner project prize',
    requiredSkills: ['Solidity', 'Hardhat', 'ethers.js', 'React'],
    lifecycleStatus: 'REGISTRATION_OPEN',
  },
];

// ── main ─────────────────────────────────────────────────────────────────────
async function seedDemoData() {
  try {
    console.log('🌱 Connecting to MongoDB…');
    await connectDatabase();

    // ── 1. Upsert admin (needed as createdBy reference) ──────────────────────
    const adminDoc = await User.findOne({ role: 'ADMIN' }).select('_id');
    if (!adminDoc) {
      console.error(
        '❌  No admin user found. Run `npm run seed:admin` first, then re-run this script.',
      );
      process.exit(1);
    }
    const adminId = adminDoc._id;

    // ── 2. Upsert demo student ────────────────────────────────────────────────
    const existingStudent = await User.findOne({ email: DEMO_STUDENT.email });
    if (existingStudent) {
      console.log(`ℹ️  Demo student "${DEMO_STUDENT.email}" already exists — skipping.`);
    } else {
      const passwordHash = await bcrypt.hash(DEMO_STUDENT.password, 12);
      await User.create({
        fullName: DEMO_STUDENT.fullName,
        email: DEMO_STUDENT.email,
        passwordHash,
        role: 'STUDENT',
        isActive: true,
        emailVerified: true,
        yearOfStudy: DEMO_STUDENT.yearOfStudy,
        course: DEMO_STUDENT.course,
        interestedDomains: DEMO_STUDENT.interestedDomains,
      });
      console.log(`✅  Demo student "${DEMO_STUDENT.email}" created.`);
    }

    // ── 3. Upsert hackathons ──────────────────────────────────────────────────
    let created = 0;
    let skipped = 0;

    for (const h of HACKATHONS) {
      const hackathonSlug = slug(h.name);
      const existing = await Hackathon.exists({ slug: hackathonSlug });

      if (existing) {
        console.log(`ℹ️  "${h.name}" already exists — skipping.`);
        skipped++;
        continue;
      }

      await Hackathon.create({
        ...h,
        slug: hackathonSlug,
        normalizedName: h.name.trim().toLowerCase(),
        normalizedOrganizer: h.organizer.trim().toLowerCase(),
        listingStatus: 'PUBLISHED',
        sourceType: 'ADMIN',
        verificationStatus: 'VERIFIED',
        createdBy: adminId,
        approvedBy: adminId,
        approvedAt: new Date(),
      });

      console.log(`✅  "${h.name}" published.`);
      created++;
    }

    // ── 4. Summary ────────────────────────────────────────────────────────────
    const totalHackathons = await Hackathon.countDocuments({ listingStatus: 'PUBLISHED' });
    const totalStudents   = await User.countDocuments({ role: 'STUDENT', isActive: true });

    console.log('\n── Seed complete ──────────────────────────────');
    console.log(`   Hackathons created : ${created}  (skipped: ${skipped})`);
    console.log(`   Published total    : ${totalHackathons}`);
    console.log(`   Students total     : ${totalStudents}`);
    console.log('───────────────────────────────────────────────');
    console.log('\nDemo student login:');
    console.log(`  Email    : ${DEMO_STUDENT.email}`);
    console.log(`  Password : ${DEMO_STUDENT.password}`);

    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    console.error('❌  Seed failed:', error);
    process.exit(1);
  }
}

seedDemoData();
