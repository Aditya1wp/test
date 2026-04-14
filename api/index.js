import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// --- DATABASE SETUP ---
const dbPath = process.env.VERCEL ? '/tmp/nimcet.db' : path.join(__dirname, 'nimcet.db');
const db = new sqlite3.Database(dbPath);

const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) {
    if (err) reject(err);
    else resolve(this);
  });
});

const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) reject(err);
    else resolve(row);
  });
});

const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) reject(err);
    else resolve(rows);
  });
});

// Initialize Tables
const initDb = async () => {
  await dbRun(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    mobile TEXT,
    exam_year INTEGER
  )`);

  await dbRun(`CREATE TABLE IF NOT EXISTS test_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    total_score REAL DEFAULT 0.0,
    math_score REAL DEFAULT 0.0,
    reasoning_score REAL DEFAULT 0.0,
    computer_score REAL DEFAULT 0.0,
    english_score REAL DEFAULT 0.0,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  await dbRun(`CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section TEXT,
    content TEXT,
    option_a TEXT,
    option_b TEXT,
    option_c TEXT,
    option_d TEXT,
    correct_option TEXT,
    explanation TEXT
  )`);

  await dbRun(`CREATE TABLE IF NOT EXISTS question_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_result_id INTEGER,
    question_id INTEGER,
    selected_option TEXT,
    is_correct BOOLEAN,
    time_spent_seconds INTEGER DEFAULT 0,
    FOREIGN KEY(test_result_id) REFERENCES test_results(id),
    FOREIGN KEY(question_id) REFERENCES questions(id)
  )`);
};

initDb().catch(err => console.error("DB Init Error:", err));

// --- HELPER: GET GUEST USER ---
const getGuestUser = async () => {
  let user = await dbGet("SELECT * FROM users WHERE email = ?", ["guest@nimcet.in"]);
  if (!user) {
    const res = await dbRun("INSERT INTO users (name, email, mobile, exam_year) VALUES (?, ?, ?, ?)",
      ["Guest Aspirant", "guest@nimcet.in", "0000000000", 2024]);
    user = { id: res.lastID };
  }
  return user;
};

// --- DATA: LOAD QUESTIONS ---
let questionsData = { "Mathematics": [], "Logical Reasoning": [], "Computer Awareness": [], "General English": [] };
try {
  const jsonPath = path.join(__dirname, 'questions.json');
  if (fs.existsSync(jsonPath)) {
    questionsData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log("Loaded questions keys:", Object.keys(questionsData));
  } else {
    console.error("questions.json NOT FOUND at", jsonPath);
  }
} catch (e) {
  console.error("Failed to load questions.json", e);
}

// --- ROUTES ---
app.get('/api/ping', (req, res) => {
  const status = {
    status: "alive",
    db: dbPath,
    questions_loaded: Object.values(questionsData).some(q => q.length > 0)
  };
  res.json(status);
});

app.post('/api/tests/generate', async (req, res) => {
  try {
    const user = await getGuestUser();
    const result = await dbRun("INSERT INTO test_results (user_id) VALUES (?)", [user.id]);
    const testId = result.lastID;

    const sections = [
      ["Mathematics", 50],
      ["Logical Reasoning", 40],
      ["Computer Awareness", 10],
      ["General English", 20]
    ];

    for (const [section, count] of sections) {
      const bank = questionsData[section] || [];
      if (bank.length === 0) {
        console.warn(`No questions found for section: ${section}`);
        continue;
      }
      
      for (let i = 0; i < count; i++) {
        const q = bank[i % bank.length];
        // Correcting mapping to match questions.json schema
        const optA = q.options ? q.options[0] : (q.option_a || '');
        const optB = q.options ? q.options[1] : (q.option_b || '');
        const optC = q.options ? q.options[2] : (q.option_c || '');
        const optD = q.options ? q.options[3] : (q.option_d || '');
        const correctOpt = q.answer || q.correct_option || 'A';

        const qInsert = await dbRun(
          "INSERT INTO questions (section, content, option_a, option_b, option_c, option_d, correct_option, explanation) VALUES (?,?,?,?,?,?,?,?)",
          [section, q.content, optA, optB, optC, optD, correctOpt, q.explanation || '']
        );
        await dbRun(
          "INSERT INTO question_results (test_result_id, question_id) VALUES (?,?)",
          [testId, qInsert.lastID]
        );
      }
    }

    res.json({ test_id: testId });
  } catch (err) {
    console.error("Generate Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tests/:test_id', async (req, res) => {
  try {
    const testId = req.params.test_id;
    if (testId === 'generate') return res.status(404).json({ error: "Invalid ID" });

    const sql = `
      SELECT qr.question_id as id, q.section, q.content, 
             q.option_a, q.option_b, q.option_c, q.option_d
      FROM question_results qr
      JOIN questions q ON qr.question_id = q.id
      WHERE qr.test_result_id = ?
    `;
    const rows = await dbAll(sql, [testId]);
    
    // Safety check for empty results
    if (rows.length === 0) {
       return res.json({ test_id: testId, questions: [] });
    }

    const questions = rows.map(r => ({
      id: r.id,
      section: r.section,
      content: r.content,
      options: [
        r.option_a.startsWith('A.') ? r.option_a : `A. ${r.option_a}`,
        r.option_b.startsWith('B.') ? r.option_b : `B. ${r.option_b}`,
        r.option_c.startsWith('C.') ? r.option_c : `C. ${r.option_c}`,
        r.option_d.startsWith('D.') ? r.option_d : `D. ${r.option_d}`
      ]
    }));
    res.json({ test_id: testId, questions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tests/:test_id/submit', async (req, res) => {
  try {
    const { answers } = req.body;
    const testId = req.params.test_id;
    let totals = { math: 0, lr: 0, comp: 0, eng: 0, total: 0 };

    const rows = await dbAll("SELECT qr.*, q.section, q.correct_option FROM question_results qr JOIN questions q ON qr.question_id = q.id WHERE test_result_id = ?", [testId]);

    for (const q_res of rows) {
      const ans = answers.find(a => a.question_id === q_res.question_id);
      if (ans) {
        const isCorrect = String(ans.selected_option).toUpperCase() === String(q_res.correct_option).toUpperCase();
        let score = 0;

        if (q_res.section === "Mathematics") score = isCorrect ? 12 : (ans.selected_option ? -3 : 0);
        else if (q_res.section === "Logical Reasoning") score = isCorrect ? 6 : (ans.selected_option ? -1.5 : 0);
        else if (q_res.section === "Computer Awareness") score = isCorrect ? 8 : (ans.selected_option ? -2 : 0);
        else score = isCorrect ? 4 : (ans.selected_option ? -1 : 0);

        totals.total += score;
        if (q_res.section === "Mathematics") totals.math += score;
        else if (q_res.section === "Logical Reasoning") totals.lr += score;
        else if (q_res.section === "Computer Awareness") totals.comp += score;
        else totals.eng += score;

        await dbRun("UPDATE question_results SET selected_option = ?, is_correct = ?, time_spent_seconds = ? WHERE id = ?",
          [ans.selected_option, isCorrect, ans.time_spent_seconds, q_res.id]);
      }
    }

    await dbRun("UPDATE test_results SET total_score = ?, math_score = ?, reasoning_score = ?, computer_score = ?, english_score = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?",
      [totals.total, totals.math, totals.lr, totals.comp, totals.eng, testId]);
    
    res.json({ total_score: totals.total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tests/:test_id/analysis', async (req, res) => {
  try {
    const test = await dbGet("SELECT * FROM test_results WHERE id = ?", [req.params.test_id]);
    if (!test) return res.status(404).json({ error: "Not found" });
    
    const rows = await dbAll("SELECT qr.*, q.content, q.section, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.explanation FROM question_results qr JOIN questions q ON qr.question_id = q.id WHERE test_result_id = ?", [req.params.test_id]);
    
    res.json({
      ...test,
      questions: rows.map(r => ({
        section: r.section,
        content: r.content,
        options: { A: r.option_a, B: r.option_b, C: r.option_c, D: r.option_d },
        correct_option: r.correct_option,
        selected_option: r.selected_option,
        is_correct: r.is_correct,
        explanation: r.explanation
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/history', async (req, res) => {
  try {
    const user = await getGuestUser();
    const rows = await dbAll("SELECT * FROM test_results WHERE user_id = ? ORDER BY started_at DESC", [user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`NIMCET Node Backend running on port ${PORT}`));

export default app;
