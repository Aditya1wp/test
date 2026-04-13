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

# Ensure local services are importable
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

from services import ai, google_drive

# --- DATABASE SETUP (Original database.py) ---
SQLALCHEMY_DATABASE_URL = "sqlite:///./nimcet.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- MODELS (Original models.py) ---
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    mobile = Column(String, unique=True, index=True)
    state = Column(String)
    study_place = Column(String)
    exam_year = Column(Integer)
    hashed_password = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    tests = relationship("TestResult", back_populates="user")

class TestResult(Base):
    __tablename__ = "test_results"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    total_score = Column(Float, default=0.0)
    math_score = Column(Float, default=0.0)
    reasoning_score = Column(Float, default=0.0)
    computer_english_score = Column(Float, default=0.0)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    user = relationship("User", back_populates="tests")
    question_results = relationship("QuestionResult", back_populates="test_result")

class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True, index=True)
    section = Column(String, index=True)
    content = Column(Text, nullable=False)
    option_a = Column(String, nullable=False)
    option_b = Column(String, nullable=False)
    option_c = Column(String, nullable=False)
    option_d = Column(String, nullable=False)
    correct_option = Column(String, nullable=False)
    explanation = Column(Text, nullable=True)

class QuestionResult(Base):
    __tablename__ = "question_results"
    id = Column(Integer, primary_key=True, index=True)
    test_result_id = Column(Integer, ForeignKey("test_results.id"))
    question_id = Column(Integer, ForeignKey("questions.id"))
    selected_option = Column(String, nullable=True)
    is_correct = Column(Boolean, nullable=True)
    time_spent_seconds = Column(Integer, default=0)
    test_result = relationship("TestResult", back_populates="question_results")
    question = relationship("Question")

class Feedback(Base):
    __tablename__ = "feedbacks"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    email = Column(String)
    subject = Column(String)
    comment = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# --- SCHEMAS & DEPENDENCIES (Original main.py) ---
class AnswerSubmit(BaseModel):
    question_id: int
    selected_option: str | None
    time_spent_seconds: int

class TestSubmit(BaseModel):
    answers: List[AnswerSubmit]

class FeedbackRequest(BaseModel):
    subject: str
    comment: str
    email: str | None = None

class DriveUploadResponse(BaseModel):
    drive_file_id: str
    drive_name: str
    mime_type: str | None = None
    size: str | None = None
    web_view_link: str | None = None
    web_content_link: str | None = None

def get_db():
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"⚠️ DB Setup Error: {e}")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(db: Session = Depends(get_db)):
    try:
        user = db.query(User).filter(User.email == "guest@nimcet.in").first()
        if not user:
            user = User(
                name="Guest Aspirant",
                email="guest@nimcet.in",
                mobile="0000000000",
                state="N/A",
                study_place="N/A",
                exam_year=2024,
                hashed_password=""
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        return user
    except Exception as e:
        print(f"⚠️ User lookup error: {e}")
        return User(id=0, name="Guest Aspirant", email="guest@nimcet.in")

# --- APP SETUP ---
app = FastAPI(title="NIMCET Mock Engine API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ROUTES ---
@app.get("/")
def read_root():
    return {"message": "Welcome to the NIMCET Mock Engine API (Consolidated)"}

@app.post("/api/tests/generate")
async def generate_test(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        test_result = TestResult(user_id=current_user.id)
        db.add(test_result)
        db.commit()
        db.refresh(test_result)

        sections = [("Mathematics", 5), ("Logical Reasoning", 5), ("Computer", 5), ("English", 5)]
        
        for section_name, count in sections:
            try:
                questions = ai.generate_questions(section_name, count)
                for q in questions:
                    q_model = Question(
                        section=section_name,
                        content=q.get("content", "Generated Question"),
                        option_a=q.get("option_a", "A"),
                        option_b=q.get("option_b", "B"),
                        option_c=q.get("option_c", "C"),
                        option_d=q.get("option_d", "D"),
                        correct_option=q.get("correct_option", "A"),
                        explanation=q.get("explanation", "")
                    )
                    db.add(q_model)
                    db.commit()
                    db.refresh(q_model)
                    q_res = QuestionResult(test_result_id=test_result.id, question_id=q_model.id)
                    db.add(q_res)
            except Exception as section_err:
                print(f"Error in section {section_name}: {section_err}")
                continue
        
        db.commit()
        return {"message": "Test generated", "test_id": test_result.id}
    except Exception as e:
        print(f"FATAL ERROR: {e}")
        return {"error": str(e), "message": "Failed to generate test"}

@app.get("/api/tests/{test_id}")
def get_test(test_id: int, db: Session = Depends(get_db)):
    results = db.query(QuestionResult).filter(QuestionResult.test_result_id == test_id).all()
    if not results:
        raise HTTPException(status_code=404, detail="Test not found")
    questions = []
    for r in results:
        questions.append({
            "id": r.question.id,
            "section": r.question.section,
            "content": r.question.content,
            "options": [r.question.option_a, r.question.option_b, r.question.option_c, r.question.option_d]
        })
    return {"test_id": test_id, "questions": questions}

@app.post("/api/tests/{test_id}/submit")
def submit_test(test_id: int, submission: TestSubmit, db: Session = Depends(get_db)):
    test = db.query(TestResult).filter(TestResult.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    SCORING = {
        "Mathematics": {"correct": 12.0, "incorrect": -3.0},
        "Logical Reasoning": {"correct": 6.0, "incorrect": -1.5},
        "Computer": {"correct": 6.0, "incorrect": -1.5},
        "English": {"correct": 4.0, "incorrect": -1.0}
    }
    math_score = 0.0
    reasoning_score = 0.0
    comp_eng_score = 0.0
    for ans in submission.answers:
        q_res = db.query(QuestionResult).filter(QuestionResult.test_result_id == test_id, QuestionResult.question_id == ans.question_id).first()
        if not q_res: continue
        q_res.selected_option = ans.selected_option
        q_res.time_spent_seconds = ans.time_spent_seconds
        q = q_res.question
        if ans.selected_option and q.correct_option:
            is_correct = str(ans.selected_option).upper() == str(q.correct_option).upper()
            q_res.is_correct = is_correct
            scheme = SCORING.get(q.section, {"correct": 0.0, "incorrect": 0.0})
            points = float(scheme["correct"]) if is_correct else float(scheme["incorrect"])
            if q.section == "Mathematics": math_score += points
            elif q.section == "Logical Reasoning": reasoning_score += points
            else: comp_eng_score += points
    test.math_score = math_score
    test.reasoning_score = reasoning_score
    test.computer_english_score = comp_eng_score
    test.total_score = math_score + reasoning_score + comp_eng_score
    test.completed_at = func.now()
    db.commit()
    return {"message": "Test evaluated", "total_score": test.total_score}

@app.get("/api/history")
def get_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    results = db.query(TestResult).filter(TestResult.user_id == current_user.id).order_by(TestResult.started_at.desc()).all()
    return [{"id":r.id, "total_score":r.total_score, "started_at":r.started_at, "completed_at":r.completed_at} for r in results]

@app.get("/api/tests/{test_id}/analysis")
def get_test_analysis(test_id: int, db: Session = Depends(get_db)):
    test = db.query(TestResult).filter(TestResult.id == test_id).first()
    if not test: raise HTTPException(status_code=404, detail="Test not found")
    results = db.query(QuestionResult).filter(QuestionResult.test_result_id == test_id).all()
    analysis = []
    for r in results:
        q = r.question
        analysis.append({
            "question_id": q.id, "section": q.section, "content": q.content,
            "options": {"A": q.option_a, "B": q.option_b, "C": q.option_c, "D": q.option_d},
            "selected_option": r.selected_option, "correct_option": q.correct_option,
            "is_correct": r.is_correct, "explanation": q.explanation, "time_spent": r.time_spent_seconds
        })
    return {"test_id": test_id, "total_score": test.total_score, "questions": analysis}

@app.post("/api/feedback")
def submit_feedback(req: FeedbackRequest, db: Session = Depends(get_db)):
    new_feedback = Feedback(email=req.email or "adityastudy003@gmail.com", subject=req.subject, comment=req.comment)
    db.add(new_feedback)
    db.commit()
    return {"message": "Feedback stored successfully"}

@app.get("/api/admin/feedbacks")
def get_feedbacks(db: Session = Depends(get_db)):
    return db.query(Feedback).all()
