import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  User,
  Patient,
  Conversation,
  Checkin,
  Flag,
  Report,
  EscalationEvent,
} from './models/index.js';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/companio';

async function seedDatabase() {
  console.log('==================================================');
  console.log('🌱 Starting Companio Healthcare Database Seeding...');
  console.log(`📡 Connecting to MongoDB at: ${MONGODB_URI}`);
  console.log('==================================================');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✔ Connected to MongoDB successfully.');

    // 1. Clear existing collection data
    console.log('\n🧹 Clearing existing records...');
    await Promise.all([
      User.deleteMany({}),
      Patient.deleteMany({}),
      Conversation.deleteMany({}),
      Checkin.deleteMany({}),
      Flag.deleteMany({}),
      Report.deleteMany({}),
      EscalationEvent.deleteMany({}),
    ]);
    console.log('✔ Collections cleared.');

    // 2. Create Clinician User
    const defaultPasswordHash = await bcrypt.hash('password123', 10);

    console.log('\n👨‍⚕️ Creating Clinician Account...');
    const clinicianUser = await User.create({
      name: 'Dr. Sarah Jenkins, MD',
      email: 'sjenkins@healthclinic.org',
      passwordHash: defaultPasswordHash,
      role: 'CLINICIAN',
    });
    console.log(`✔ Created Clinician: ${clinicianUser.name} (${clinicianUser._id})`);

    // 3. Create 3 Synthetic Patients
    console.log('\n👥 Creating 3 Synthetic Patients (55+ age bracket)...');
    
    // Patient 1 User & Profile: Robert Miller (67 yo - Post-cardiac observation)
    const robertUser = await User.create({
      name: 'Robert Miller',
      email: 'robert.miller@example.com',
      passwordHash: defaultPasswordHash,
      role: 'PATIENT',
    });
    const robertPatient = await Patient.create({
      userId: robertUser._id,
      name: 'Robert Miller',
      age: 67,
      contact: { phone: '+1-555-019-2834', email: 'robert.miller@example.com' },
      emergencyContact: { name: 'Mary Miller', relationship: 'Spouse', phone: '+1-555-019-2835' },
      assignedClinicianId: clinicianUser._id,
      medications: [
        { name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily (morning)' },
        { name: 'Metoprolol Succinate', dosage: '25mg', frequency: 'Once daily' },
        { name: 'Atorvastatin', dosage: '20mg', frequency: 'Once daily at bedtime' },
      ],
      baselineMetrics: { weight: 182, sleepHoursTarget: 8, activityGoal: 30, hydrationGoalMl: 2200 },
    });

    // Patient 2 Profile: Eleanor Vance (72 yo - Hypertension & Arthritis)
    const eleanorUser = await User.create({
      name: 'Eleanor Vance',
      email: 'eleanor.vance@example.com',
      passwordHash: defaultPasswordHash,
      role: 'PATIENT',
    });
    const eleanorPatient = await Patient.create({
      userId: eleanorUser._id,
      name: 'Eleanor Vance',
      age: 72,
      contact: { phone: '+1-555-014-9982', email: 'eleanor.vance@example.com' },
      emergencyContact: { name: 'David Vance', relationship: 'Son', phone: '+1-555-014-9983' },
      assignedClinicianId: clinicianUser._id,
      medications: [
        { name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily' },
        { name: 'Acetaminophen ER', dosage: '650mg', frequency: 'As needed for joint stiffness' },
      ],
      baselineMetrics: { weight: 148, sleepHoursTarget: 7.5, activityGoal: 25, hydrationGoalMl: 1800 },
    });

    // Patient 3 Profile: Arthur Pendelton (81 yo - Diabetes & Mild Cognitive Wellness)
    const arthurUser = await User.create({
      name: 'Arthur Pendelton',
      email: 'arthur.p@example.com',
      passwordHash: defaultPasswordHash,
      role: 'PATIENT',
    });
    const arthurPatient = await Patient.create({
      userId: arthurUser._id,
      name: 'Arthur Pendelton',
      age: 81,
      contact: { phone: '+1-555-018-4421', email: 'arthur.p@example.com' },
      emergencyContact: { name: 'Clara Pendelton', relationship: 'Daughter', phone: '+1-555-018-4422' },
      assignedClinicianId: clinicianUser._id,
      medications: [
        { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily with meals' },
      ],
      baselineMetrics: { weight: 165, sleepHoursTarget: 8, activityGoal: 20, hydrationGoalMl: 2000 },
    });

    console.log('✔ Synthetic Patients Created.');

    // 4. Generate 10 Days of Synthetic Check-in History
    console.log('\n📅 Generating 10 days of synthetic health check-ins, conversations, and flags...');
    
    let totalConversations = 0;
    let totalCheckins = 0;
    let totalFlags = 0;
    let redFlagsCreated = [];
    let yellowFlagsCreated = [];

    const now = new Date();

    // Helper to generate dates relative to today
    const daysAgo = (d, hour = 9) => {
      const date = new Date(now);
      date.setDate(date.getDate() - d);
      date.setHours(hour, Math.floor(Math.random() * 30), 0, 0);
      return date;
    };

    // --- Generate Robert Miller's 10-day timeline ---
    for (let day = 10; day >= 1; day--) {
      const startTime = daysAgo(day, 9);
      const endTime = new Date(startTime.getTime() + 6 * 60 * 1000); // 6 min voice session

      const conversation = await Conversation.create({
        patientId: robertPatient._id,
        startedAt: startTime,
        endedAt: endTime,
        status: 'completed',
        type: day === 7 ? 'weekly' : 'daily',
        summary: `Daily voice check-in for Day -${day}. Patient discussed medication adherence, sleep, and physical activity.`,
      });
      totalConversations++;

      // Baseline normal check-in data with subtle daily fluctuations
      const isRedFlagDay = day === 2; // Day 2: Acute chest tightness (RED FLAG)
      const isYellowFlagDay = day === 6; // Day 6: Missed evening dose & mild dizziness (YELLOW FLAG)

      const checkin = await Checkin.create({
        patientId: robertPatient._id,
        conversationId: conversation._id,
        type: day === 7 ? 'weekly' : 'daily',
        adherence: {
          taken: !isYellowFlagDay,
          missedDoses: isYellowFlagDay ? 1 : 0,
          sideEffectsReported: isYellowFlagDay ? ['Mild lightheadedness upon standing'] : [],
          notes: isYellowFlagDay ? 'Forgot evening statin dose after dinner with family.' : 'Took morning Lisinopril and Metoprolol on time.',
        },
        symptoms: isRedFlagDay
          ? [{ name: 'Chest tightness & shortness of breath', severity: 'severe', notes: 'Began 30 mins ago after stairs.' }]
          : isYellowFlagDay
          ? [{ name: 'Mild dizziness', severity: 'mild', notes: 'Short duration in afternoon.' }]
          : [],
        sleep: {
          hours: isRedFlagDay ? 5.0 : isYellowFlagDay ? 6.2 : 7.5 + (Math.random() * 0.8 - 0.4),
          quality: isRedFlagDay ? 'poor' : isYellowFlagDay ? 'fair' : 'good',
        },
        hydration: {
          estimatedMl: isRedFlagDay ? 1200 : 2100 + (Math.floor(Math.random() * 300) - 150),
          glasses: isRedFlagDay ? 5 : 8,
        },
        activity: {
          minutesActive: isRedFlagDay ? 10 : 35 + Math.floor(Math.random() * 15),
          type: 'Morning neighborhood walk',
        },
        nutrition: {
          quality: 'Balanced low-sodium diet',
          notes: 'Oatmeal for breakfast, grilled chicken salad for lunch.',
        },
        wellbeingScore: isRedFlagDay ? 3 : isYellowFlagDay ? 6 : 8,
        sentimentScore: isRedFlagDay ? -0.8 : isYellowFlagDay ? -0.3 : 0.7,
        patientConcerns: isRedFlagDay
          ? ['Tight feeling in chest when climbing stairs']
          : isYellowFlagDay
          ? ['Felt slightly lightheaded around 2 PM']
          : ['Curious about when next prescription refill is due'],
        timestamp: startTime,
      });
      totalCheckins++;

      // Create RED FLAG on Day 2
      if (isRedFlagDay) {
        const redFlag = await Flag.create({
          patientId: robertPatient._id,
          conversationId: conversation._id,
          severity: 'red',
          category: 'chest_pain',
          description: 'Patient reported acute chest tightness and shortness of breath after climbing stairs.',
          ruleId: 'RULE_RED_CHEST_PAIN_01',
          sourceText: 'I felt a heavy tightness in my chest and had trouble catching my breath after coming upstairs.',
          status: 'escalated',
          escalatedAt: new Date(startTime.getTime() + 2 * 60 * 1000),
          notifiedVia: 'SMS & Email alert to Dr. Sarah Jenkins',
          createdAt: startTime,
        });
        totalFlags++;
        redFlagsCreated.push(redFlag);

        // Also create Escalation Event record
        await EscalationEvent.create({
          flagId: redFlag._id,
          patientId: robertPatient._id,
          clinicianId: clinicianUser._id,
          channel: 'SMS',
          status: 'SENT',
          attempts: 1,
          providerMessageId: 'SM_MOCK_MSG_99214A',
          sentAt: new Date(startTime.getTime() + 2 * 60 * 1000),
        });
      }

      // Create YELLOW FLAG on Day 6
      if (isYellowFlagDay) {
        const yellowFlag = await Flag.create({
          patientId: robertPatient._id,
          conversationId: conversation._id,
          severity: 'yellow',
          category: 'medication_lapse',
          description: 'Patient missed 1 dose of Atorvastatin and reported mild postural lightheadedness.',
          ruleId: 'RULE_YELLOW_MED_LAPSE_02',
          sourceText: 'I accidentally missed my evening cholesterol pill and felt a bit dizzy later.',
          status: 'reviewed',
          reviewedAt: new Date(startTime.getTime() + 120 * 60 * 1000),
          createdAt: startTime,
        });
        totalFlags++;
        yellowFlagsCreated.push(yellowFlag);
      }
    }

    // --- Generate Eleanor Vance's 10-day timeline ---
    for (let day = 10; day >= 1; day--) {
      const startTime = daysAgo(day, 10);
      const conversation = await Conversation.create({
        patientId: eleanorPatient._id,
        startedAt: startTime,
        endedAt: new Date(startTime.getTime() + 5 * 60 * 1000),
        status: 'completed',
        type: 'daily',
        summary: `Daily check-in for Eleanor Vance. Monitoring arthritis stiffness and fluid intake.`,
      });
      totalConversations++;

      const isKneeStiffnessDay = day === 4;

      await Checkin.create({
        patientId: eleanorPatient._id,
        conversationId: conversation._id,
        type: 'daily',
        adherence: { taken: true, missedDoses: 0, sideEffectsReported: [] },
        symptoms: isKneeStiffnessDay
          ? [{ name: 'Right knee stiffness & ache', severity: 'moderate', notes: 'Worse due to humid rain.' }]
          : [],
        sleep: { hours: 7.2, quality: 'good' },
        hydration: { estimatedMl: 1750, glasses: 7 },
        activity: { minutesActive: 25, type: 'Gentle garden walk' },
        nutrition: { quality: 'Good', notes: 'Home cooked soup and vegetables' },
        wellbeingScore: isKneeStiffnessDay ? 5 : 8,
        sentimentScore: isKneeStiffnessDay ? -0.2 : 0.6,
        patientConcerns: isKneeStiffnessDay ? ['Right knee feeling stiffer than usual'] : [],
        timestamp: startTime,
      });
      totalCheckins++;

      if (isKneeStiffnessDay) {
        const yellowFlag = await Flag.create({
          patientId: eleanorPatient._id,
          conversationId: conversation._id,
          severity: 'yellow',
          category: 'symptom_worsening',
          description: 'Patient reported moderate right knee joint stiffness impacting morning mobility.',
          ruleId: 'RULE_YELLOW_SYMPTOM_03',
          sourceText: 'My right knee has been quite stiff and aching this morning.',
          status: 'open',
          createdAt: startTime,
        });
        totalFlags++;
        yellowFlagsCreated.push(yellowFlag);
      }
    }

    // --- Generate Arthur Pendelton's 10-day timeline ---
    for (let day = 10; day >= 1; day--) {
      const startTime = daysAgo(day, 11);
      const conversation = await Conversation.create({
        patientId: arthurPatient._id,
        startedAt: startTime,
        endedAt: new Date(startTime.getTime() + 4 * 60 * 1000),
        status: 'completed',
        type: 'daily',
        summary: `Daily check-in for Arthur Pendelton. Consistent blood sugar management and daily strolls.`,
      });
      totalConversations++;

      await Checkin.create({
        patientId: arthurPatient._id,
        conversationId: conversation._id,
        type: 'daily',
        adherence: { taken: true, missedDoses: 0, sideEffectsReported: [] },
        symptoms: [],
        sleep: { hours: 7.8, quality: 'good' },
        hydration: { estimatedMl: 2000, glasses: 8 },
        activity: { minutesActive: 30, type: 'Park walk' },
        nutrition: { quality: 'Diabetic-friendly meal plan', notes: 'Low sugar diet' },
        wellbeingScore: 9,
        sentimentScore: 0.85,
        patientConcerns: [],
        timestamp: startTime,
      });
      totalCheckins++;
    }

    // 5. Generate a Sample Clinician Report for Robert Miller
    console.log('\n📄 Generating Sample Clinical Summary Report for Robert Miller...');
    const report = await Report.create({
      patientId: robertPatient._id,
      periodStart: daysAgo(10),
      periodEnd: now,
      overview: 'Robert Miller has completed 10 daily voice check-ins over the past week. Medication adherence is generally strong at 90%, but 1 red flag (acute chest tightness) and 1 yellow flag (missed dose with dizziness) were detected and escalated.',
      redFlags: redFlagsCreated.map((f) => ({
        description: f.description,
        category: f.category,
        flagId: f._id,
      })),
      yellowFlags: yellowFlagsCreated
        .filter((f) => f.patientId.toString() === robertPatient._id.toString())
        .map((f) => ({
          description: f.description,
          category: f.category,
          flagId: f._id,
        })),
      positiveProgress: [
        'Maintained active daily neighborhood walks averaging 32 minutes.',
        'Hydration levels consistently met 2,000 mL target on 8 out of 10 days.',
        'Overall positive mood and high engagement during daily voice interactions.',
      ],
      trends: {
        weight: [
          { date: 'Day -10', value: 182 },
          { date: 'Day -5', value: 181.5 },
          { date: 'Day -1', value: 181.2 },
        ],
        adherencePct: 90,
        sleepAvg: 7.2,
        activityAvg: 31,
        hydrationAvg: 2050,
      },
      patientConcerns: [
        'Tight feeling in chest when climbing stairs (Escalated to clinician)',
        'Inquired about prescription refill timeline',
      ],
      followUp: [
        'Schedule follow-up cardiology consult regarding exertion-related chest tightness.',
        'Confirm Metoprolol dosage timing to prevent postural lightheadedness.',
      ],
      generatedAt: now,
    });
    console.log(`✔ Report Created (${report._id}).`);

    // 6. Output Summary Table & Count Confirmation
    const counts = {
      Users: await User.countDocuments(),
      Patients: await Patient.countDocuments(),
      Conversations: await Conversation.countDocuments(),
      Checkins: await Checkin.countDocuments(),
      Flags: await Flag.countDocuments(),
      Reports: await Report.countDocuments(),
      EscalationEvents: await EscalationEvent.countDocuments(),
    };

    console.log('\n==================================================');
    console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('==================================================');
    console.table(counts);

    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed gracefully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed with error:', error);
    process.exit(1);
  }
}

seedDatabase();
