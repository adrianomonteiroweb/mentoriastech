-- Add mentor_id to mentoring tables for multi-mentor support

-- 1. Add mentor_id columns (nullable initially for backfill)
ALTER TABLE mentoring_slots ADD COLUMN mentor_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE mentoring_topics ADD COLUMN mentor_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE bookings ADD COLUMN mentor_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE paid_mentorships ADD COLUMN mentor_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- 2. Backfill: all existing data belongs to Adriano
UPDATE mentoring_slots SET mentor_id = (SELECT id FROM profiles WHERE email = 'adrianomonteiroweb@gmail.com' LIMIT 1);
UPDATE mentoring_topics SET mentor_id = (SELECT id FROM profiles WHERE email = 'adrianomonteiroweb@gmail.com' LIMIT 1);
UPDATE bookings SET mentor_id = (SELECT id FROM profiles WHERE email = 'adrianomonteiroweb@gmail.com' LIMIT 1);
UPDATE paid_mentorships SET mentor_id = (SELECT id FROM profiles WHERE email = 'adrianomonteiroweb@gmail.com' LIMIT 1) WHERE mentor_id IS NULL;

-- 3. Make NOT NULL where appropriate
ALTER TABLE mentoring_slots ALTER COLUMN mentor_id SET NOT NULL;
ALTER TABLE mentoring_topics ALTER COLUMN mentor_id SET NOT NULL;

-- 4. Create indexes
CREATE INDEX idx_mentoring_slots_mentor ON mentoring_slots(mentor_id);
CREATE INDEX idx_mentoring_topics_mentor ON mentoring_topics(mentor_id);
CREATE INDEX idx_bookings_mentor ON bookings(mentor_id);
CREATE INDEX idx_paid_mentorships_mentor ON paid_mentorships(mentor_id);

-- 5. Set Rebeca as mentor (if profile exists)
UPDATE profiles SET role = 'mentor' WHERE email = 'rebecaaraujo2013@gmail.com';
UPDATE user_roles SET role = 'mentor' WHERE user_id = (SELECT id FROM profiles WHERE email = 'rebecaaraujo2013@gmail.com');

-- 6. Assign Rebeca's paid mentorships to her profile
UPDATE paid_mentorships
SET mentor_id = (SELECT id FROM profiles WHERE email = 'rebecaaraujo2013@gmail.com' LIMIT 1)
WHERE mentor_email = 'rebecaaraujo2013@gmail.com'
  AND (SELECT id FROM profiles WHERE email = 'rebecaaraujo2013@gmail.com') IS NOT NULL;
