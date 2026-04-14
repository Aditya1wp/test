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

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    mobile TEXT,
    exam_year INTEGER
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS test_results (
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

  db.run(`CREATE TABLE IF NOT EXISTS questions (
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

  db.run(`CREATE TABLE IF NOT EXISTS question_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_result_id INTEGER,
    question_id INTEGER,
    selected_option TEXT,
    is_correct BOOLEAN,
    time_spent_seconds INTEGER DEFAULT 0,
    FOREIGN KEY(test_result_id) REFERENCES test_results(id),
    FOREIGN KEY(question_id) REFERENCES questions(id)
  )`);
});

// --- HELPER: GET GUEST USER ---
const getGuestUser = () => {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM users WHERE email = ?", ["guest@nimcet.in"], (err, row) => {
      if (err) return reject(err);
      if (row) return resolve(row);
      db.run("INSERT INTO users (name, email, mobile, exam_year) VALUES (?, ?, ?, ?)",
        ["Guest Aspirant", "guest@nimcet.in", "0000000000", 2024],
        function(err) {
          if (err) return reject(err);
          resolve({ id: this.lastID });
        }
      );
    });
  });
};

// --- DATA: LOAD QUESTIONS ---
let questionsData = {};
try {
  questionsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'questions.json'), 'utf8'));
} catch (e) {
  console.error("Failed to load questions.json", e);
}

// --- ROUTES ---
app.get('/api/ping', (req, res) => res.json({ status: "alive" }));

app.post('/api/tests/generate', async (req, res) => {
  try {
    const user = await getGuestUser();
    db.run("INSERT INTO test_results (user_id) VALUES (?)", [user.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      const testId = this.lastID;
      
      const sections = [
        ["Mathematics", 50],
        ["Logical Reasoning", 40],
        ["Computer Awareness", 10],
        ["General English", 20]
      ];

      const stmt = db.prepare("INSERT INTO questions (section, content, option_a, option_b, option_c, option_d, correct_option, explanation) VALUES (?,?,?,?,?,?,?,?)");
      const resStmt = db.prepare("INSERT INTO question_results (test_result_id, question_id) VALUES (?,?)");

      sections.forEach(([section, count]) => {
        const bank = questionsData[section] || [];
        if (bank.length === 0) return;
        for (let i = 0; i < count; i++) {
          const q = bank[i % bank.length];
          stmt.run([section, q.content, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.explanation], function(err) {
            if (!err) resStmt.run([testId, this.lastID]);
          });
        }
      });

      stmt.finalize();
      resStmt.finalize(() => res.json({ test_id: testId }));
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tests/:test_id', (req, res) => {
  const sql = `
    SELECT qr.question_id as id, q.section, q.content, 
           q.option_a, q.option_b, q.option_c, q.option_d
    FROM question_results qr
    JOIN questions q ON qr.question_id = q.id
    WHERE qr.test_result_id = ?
  `;
  db.all(sql, [req.params.test_id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const questions = rows.map(r => ({
      id: r.id,
      section: r.section,
      content: r.content,
      options: [r.option_a, r.option_b, r.option_c, r.option_d]
    }));
    res.json({ test_id: req.params.test_id, questions });
  });
});

app.post('/api/tests/:test_id/submit', (req, res) => {
  const { answers } = req.body;
  const testId = req.params.test_id;

  let totals = { math: 0, lr: 0, comp: 0, eng: 0, total: 0 };

  db.all("SELECT qr.*, q.section, q.correct_option FROM question_results qr JOIN questions q ON qr.question_id = q.id WHERE test_result_id = ?", [testId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    rows.forEach(q_res => {
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

        db.run("UPDATE question_results SET selected_option = ?, is_correct = ?, time_spent_seconds = ? WHERE id = ?",
          [ans.selected_option, isCorrect, ans.time_spent_seconds, q_res.id]);
      }
    });

    db.run("UPDATE test_results SET total_score = ?, math_score = ?, reasoning_score = ?, computer_score = ?, english_score = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?",
      [totals.total, totals.math, totals.lr, totals.comp, totals.eng, testId], () => {
        res.json({ total_score: totals.total });
      });
  });
});

app.get('/api/tests/:test_id/analysis', (req, res) => {
  db.get("SELECT * FROM test_results WHERE id = ?", [req.params.test_id], (err, test) => {
    if (err || !test) return res.status(404).json({ error: "Not found" });
    
    db.all("SELECT qr.*, q.content, q.section, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.explanation FROM question_results qr JOIN questions q ON qr.question_id = q.id WHERE test_result_id = ?", [req.params.test_id], (err, rows) => {
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
    });
  });
});

app.get('/api/history', async (req, res) => {
  const user = await getGuestUser();
  db.all("SELECT * FROM test_results WHERE user_id = ? ORDER BY started_at DESC", [user.id], (err, rows) => {
    res.json(rows);
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`NIMCET Node Backend running on port ${PORT}`));

export default app;
