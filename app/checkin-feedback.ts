import {db} from '../db/raw';

export async function ensureFeedbackTable(){
  await db().prepare(`CREATE TABLE IF NOT EXISTS checkin_feedback (
    person TEXT NOT NULL REFERENCES people(id),
    day TEXT NOT NULL,
    prayer_requested INTEGER NOT NULL DEFAULT 0,
    prayer_text TEXT NOT NULL DEFAULT '',
    testimony_requested INTEGER NOT NULL DEFAULT 0,
    testimony_text TEXT NOT NULL DEFAULT '',
    created TEXT NOT NULL,
    PRIMARY KEY(person,day)
  )`).run();
}
