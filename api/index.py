from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.orm import sessionmaker, relationship, Session
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from typing import List
from pydantic import BaseModel
import asyncio
import os
import sys
import json
import random

# Relocated to /tmp for Vercel Writable Filesystem Persistence
SQLALCHEMY_DATABASE_URL = "sqlite:////tmp/nimcet.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- MOCK DATA (Hardcoded for total stability) ---
MATH_QUESTIONS = [
    {"content": "If A and B are sets with n(A)=115, n(B)=326, n(A-B)=47, then n(A U B) is:", "option_a": "373", "option_b": "394", "option_c": "47", "option_d": "441", "correct_option": "A", "explanation": "n(AUB) = n(A-B) + n(B) = 47 + 326 = 373."},
    {"content": "If vectors a = 2i + j + k and b = 3i - 4j + 2k, the dot product is:", "option_a": "4", "option_b": "5", "option_c": "6", "option_d": "7", "correct_option": "A", "explanation": "a.b = (2*3) + (1*-4) + (1*2) = 6 - 4 + 2 = 4."},
    {"content": "Integration of xe^x dx is:", "option_a": "(x-1)e^x + c", "option_b": "(x+1)e^x + c", "option_c": "xe^x - 1", "option_d": "e^x + c", "correct_option": "A", "explanation": "Using integration by parts: (x-1)e^x + c."},
    {"content": "The probability of getting a sum of 9 from two throws of a dice is:", "option_a": "1/6", "option_b": "1/8", "option_c": "1/9", "option_d": "1/12", "correct_option": "C", "explanation": "Favorable outcomes (3,6), (4,5), (5,4), (6,3). Total outcomes = 36. Probability = 4/36 = 1/9."},
    {"content": "The value of sin(15°) is:", "option_a": "(√3 - 1)/2√2", "option_b": "(√3 + 1)/2√2", "option_c": "√3/2", "option_d": "1/√2", "correct_option": "A", "explanation": "sin(15°) = (√3 - 1)/2√2."}
]
LR_QUESTIONS = [
    {"content": "Series: 2, 6, 18, 54, ... What comes next?", "option_a": "108", "option_b": "148", "option_c": "162", "option_d": "216", "correct_option": "C", "explanation": "Multiply by 3. 54 * 3 = 162."},
    {"content": "Boy in photo: 'He is son of the only son of my mother.' Relation to Suresh?", "option_a": "Brother", "option_b": "Uncle", "option_c": "Cousin", "option_d": "Father", "correct_option": "D", "explanation": "Only son is Suresh himself."},
    {"content": "Which does NOT belong?", "option_a": "Leopard", "option_b": "Cougar", "option_c": "Elephant", "option_d": "Lion", "correct_option": "C", "explanation": "Elephant is not a feline."},
    {"content": "Odometer is to mileage as compass is to:", "option_a": "Speed", "option_b": "Hiking", "option_c": "Needle", "option_d": "Direction", "correct_option": "D", "explanation": "Compass indicates direction."},
    {"content": "COMPUTER = RFUVQNPC. MEDICINE = ?", "option_a": "EOJDJEFM", "option_b": "EOJDEJFM", "option_c": "MFEJDJOE", "option_d": "MFEDJJOE", "correct_option": "A", "explanation": "Shifted alphabet pattern."}
]

# --- MODELS ---
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String); email = Column(String, unique=True, index=True); mobile = Column(String)
    state = Column(String); study_place = Column(String); exam_year = Column(Integer); hashed_password = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    tests = relationship("TestResult", back_populates="user")

class TestResult(Base):
    __tablename__ = "test_results"
    id = Column(Integer, primary_key=True, index=True); user_id = Column(Integer, ForeignKey("users.id"))
    total_score = Column(Float, default=0.0); math_score = Column(Float, default=0.0)
    reasoning_score = Column(Float, default=0.0); computer_english_score = Column(Float, default=0.0)
    started_at = Column(DateTime(timezone=True), server_default=func.now()); completed_at = Column(DateTime(timezone=True), nullable=True)
    user = relationship("User", back_populates="tests"); question_results = relationship("QuestionResult", back_populates="test_result")

class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True, index=True); section = Column(String, index=True); content = Column(Text, nullable=False)
    option_a = Column(String, nullable=False); option_b = Column(String, nullable=False)
    option_c = Column(String, nullable=False); option_d = Column(String, nullable=False)
    correct_option = Column(String, nullable=False); explanation = Column(Text, nullable=True)

class QuestionResult(Base):
    __tablename__ = "question_results"
    id = Column(Integer, primary_key=True, index=True); test_result_id = Column(Integer, ForeignKey("test_results.id"))
    question_id = Column(Integer, ForeignKey("questions.id")); selected_option = Column(String, nullable=True)
    is_correct = Column(Boolean, nullable=True); time_spent_seconds = Column(Integer, default=0)
    test_result = relationship("TestResult", back_populates="question_results"); question = relationship("Question")

class Feedback(Base):
    __tablename__ = "feedbacks"
    id = Column(Integer, primary_key=True, index=True); user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    email = Column(String); subject = Column(String); comment = Column(Text); created_at = Column(DateTime(timezone=True), server_default=func.now())

# --- SCHEMAS ---
class AnswerSubmit(BaseModel): question_id: int; selected_option: str | None; time_spent_seconds: int
class TestSubmit(BaseModel): answers: List[AnswerSubmit]
class FeedbackRequest(BaseModel): subject: str; comment: str; email: str | None = None

# --- UTILITIES ---
def get_fallback_questions(section: str, count: int) -> list:
    bank = MATH_QUESTIONS if section == "Mathematics" else LR_QUESTIONS
    return [bank[i % len(bank)].copy() for i in range(count)]

# --- DEPENDENCIES ---
def get_db():
    try: Base.metadata.create_all(bind=engine)
    except: pass
    db = SessionLocal()
    try: yield db
    finally: db.close()

def get_current_user(db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == "guest@nimcet.in").first()
    if not user:
        user = User(name="Guest Aspirant", email="guest@nimcet.in", mobile="0000000000", exam_year=2024, hashed_password="")
        db.add(user); db.commit(); db.refresh(user)
    return user

# --- STARTUP LOG ---
print("🚀 NIMCET Mock Engine (Lite) is starting up on Vercel...")

# --- APP & ROUTES ---
app = FastAPI(title="NIMCET Mock Engine Lite", version="3.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.get("/api/ping")
def ping():
    return {"status": "alive", "msg": "NIMCET Engine is ready!"}

@app.post("/api/tests/generate")
async def generate_test(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        test_result = TestResult(user_id=current_user.id)
        db.add(test_result); db.commit(); db.refresh(test_result)
        sections = [("Mathematics", 5), ("Logical Reasoning", 5), ("Computer", 5), ("English", 5)]
        for section_name, count in sections:
            questions = get_fallback_questions(section_name, count)
            for q in questions:
                q_model = Question(section=section_name, content=q.get("content", ""), option_a=q.get("option_a", ""), option_b=q.get("option_b", ""), option_c=q.get("option_c", ""), option_d=q.get("option_d", ""), correct_option=q.get("correct_option", "A"), explanation=q.get("explanation", ""))
                db.add(q_model); db.commit(); db.refresh(q_model)
                q_res = QuestionResult(test_result_id=test_result.id, question_id=q_model.id)
                db.add(q_res)
        db.commit()
        return {"test_id": test_result.id}
    except Exception as e: return {"error": str(e)}

@app.get("/api/tests/{test_id}")
def get_test(test_id: int, db: Session = Depends(get_db)):
    results = db.query(QuestionResult).filter(QuestionResult.test_result_id == test_id).all()
    if not results: raise HTTPException(status_code=404)
    return {"test_id": test_id, "questions": [{"id": r.question.id, "section": r.question.section, "content": r.question.content, "options": [r.question.option_a, r.question.option_b, r.question.option_c, r.question.option_d]} for r in results]}

@app.post("/api/tests/{test_id}/submit")
def submit_test(test_id: int, submission: TestSubmit, db: Session = Depends(get_db)):
    test = db.query(TestResult).filter(TestResult.id == test_id).first()
    if not test: raise HTTPException(status_code=404)
    total_score = 0
    for ans in submission.answers:
        q_res = db.query(QuestionResult).filter(QuestionResult.test_result_id == test_id, QuestionResult.question_id == ans.question_id).first()
        if q_res:
            q_res.selected_option = ans.selected_option
            q_res.is_correct = str(ans.selected_option).upper() == str(q_res.question.correct_option).upper()
            total_score += 12 if q_res.is_correct else -3
    test.total_score = total_score; test.completed_at = func.now(); db.commit()
    return {"total_score": total_score}

@app.get("/api/history")
def get_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    results = db.query(TestResult).filter(TestResult.user_id == current_user.id).all()
    return [{"id":r.id, "total_score":r.total_score, "started_at":r.started_at, "completed_at":r.completed_at} for r in results]

@app.get("/")
def read_root(): return {"status": "ok", "mode": "Lite"}
