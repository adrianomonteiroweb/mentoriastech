import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

const mentorships = await sql`SELECT id, title, mentor_id, mentor_email, is_active FROM paid_mentorships`;
console.log("Paid mentorships:", JSON.stringify(mentorships, null, 2));

const admins = await sql`SELECT id, email, role FROM profiles WHERE role IN ('admin', 'mentor')`;
console.log("\nAdmin/mentor profiles:", JSON.stringify(admins, null, 2));
