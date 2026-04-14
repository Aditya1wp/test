from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.orm import sessionmaker, relationship, Session
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from typing import List, Optional
from pydantic import BaseModel
import asyncio
import os
import sys
import json
import random

# --- DATABASE SETUP ---
# Relocated to /tmp for Vercel Writable Filesystem Persistence
# Use a local database file for reliability
SQLALCHEMY_DATABASE_URL = "sqlite:///./nimcet.db"
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
    {"content": "The value of sin(15°) is:", "option_a": "(√3 - 1)/2√2", "option_b": "(√3 + 1)/2√2", "option_c": "√3/2", "option_d": "1/√2", "correct_option": "A", "explanation": "sin(15°) = (√3 - 1)/2√2."},
    {"content": "If log(x+1) + log(x-1) = log 3, then x is:", "option_a": "2", "option_b": "√2", "option_c": "3", "option_d": "√3", "correct_option": "A", "explanation": "log((x+1)(x-1)) = log 3 => x^2-1 = 3 => x^2=4 => x=2."},
    {"content": "The derivative of sin(x^2) is:", "option_a": "2x cos(x^2)", "option_b": "cos(x^2)", "option_c": "2 sin x cos x", "option_d": "x^2 cos x", "correct_option": "A", "explanation": "Chain rule: d/dx(sin u) * du/dx = cos(x^2) * 2x."},
    {"content": "Limit (sin x)/x as x -> 0 is:", "option_a": "0", "option_b": "1", "option_c": "Infinity", "option_d": "Undefined", "correct_option": "B", "explanation": "Standard result."},
    {"content": "The area under y = x^2 from x=0 to x=1 is:", "option_a": "1/2", "option_b": "1/3", "option_c": "1/4", "option_d": "1", "correct_option": "B", "explanation": "Integral of x^2 is x^3/3. [1/3 - 0] = 1/3."},
    {"content": "How many 3-digit numbers can be formed using 1, 2, 3 without repetition?", "option_a": "3", "option_b": "6", "option_c": "9", "option_d": "27", "correct_option": "B", "explanation": "3! = 6."},
    {"content": "The eccentricity of the ellipse 9x^2 + 5y^2 = 45 is:", "option_a": "2/3", "option_b": "3/2", "option_c": "1/3", "option_d": "4/5", "correct_option": "A", "explanation": "e = sqrt(1 - b^2/a^2). For 9x^2+5y^2=45 => x^2/5 + y^2/9 = 1. a^2=9, b^2=5. e = sqrt(1-5/9) = 2/3."},
    {"content": "The sum of roots of x^2 - 5x + 6 = 0 is:", "option_a": "5", "option_b": "6", "option_c": "-5", "option_d": "1", "correct_option": "A", "explanation": "-b/a = 5/1 = 5."},
    {"content": "In a triangle ABC, if a=2, b=3, c=4, then cos A is:", "option_a": "7/8", "option_b": "5/8", "option_c": "1/2", "option_d": "1/4", "correct_option": "A", "explanation": "cos A = (b^2+c^2-a^2)/(2bc) = (9+16-4)/(24) = 21/24 = 7/8."},
    {"content": "The constant term in expansion of (x + 1/x)^10 is:", "option_a": "252", "option_b": "120", "option_c": "10", "option_d": "1", "correct_option": "A", "explanation": "middle term 10C5 = 252."},
    {"content": "If y = log(sec x + tan x), then dy/dx is:", "option_a": "sec x", "option_b": "tan x", "option_c": "sec^2 x", "option_d": "1", "correct_option": "A", "explanation": "Standard derivative."},
    {"content": "The radius of the circle x^2 + y^2 - 4x - 6y - 12 = 0 is:", "option_a": "5", "option_b": "4", "option_c": "6", "option_d": "7", "correct_option": "A", "explanation": "r = sqrt(g^2+f^2-c) = sqrt(4+9+12) = 5."},
    {"content": "Value of i^100 is:", "option_a": "1", "option_b": "-1", "option_c": "i", "option_d": "-i", "correct_option": "A", "explanation": "Divisible by 4."},
    {"content": "The number of subsets of a set containing 5 elements is:", "option_a": "32", "option_b": "25", "option_c": "10", "option_d": "16", "correct_option": "A", "explanation": "2^5 = 32."},
    {"content": "The angle between planes x+y+z=1 and x-y+z=1 is:", "option_a": "cos^-1(1/3)", "option_b": "cos^-1(1/2)", "option_c": "90°", "option_d": "0°", "correct_option": "A", "explanation": "cos theta = |n1.n2|/(|n1||n2|) = (1-1+1) / (sqrt(3)*sqrt(3)) = 1/3."},
    {"content": "Derivative of cos^-1 x is:", "option_a": "-1/sqrt(1-x^2)", "option_b": "1/sqrt(1-x^2)", "option_c": "sec^2 x", "option_d": "-sin x", "correct_option": "A", "explanation": "Standard result."}
]

LR_QUESTIONS = [
    {"content": "Series: 2, 6, 18, 54, ... What comes next?", "option_a": "108", "option_b": "148", "option_c": "162", "option_d": "216", "correct_option": "C", "explanation": "Multiply by 3. 54 * 3 = 162."},
    {"content": "Boy in photo: 'He is son of the only son of my mother.' Relation to Suresh?", "option_a": "Brother", "option_b": "Uncle", "option_c": "Cousin", "option_d": "Father", "correct_option": "D", "explanation": "Only son is Suresh himself."},
    {"content": "Which does NOT belong?", "option_a": "Leopard", "option_b": "Cougar", "option_c": "Elephant", "option_d": "Lion", "correct_option": "C", "explanation": "Elephant is not a feline."},
    {"content": "Odometer is to mileage as compass is to:", "option_a": "Speed", "option_b": "Hiking", "option_c": "Needle", "option_d": "Direction", "correct_option": "D", "explanation": "Compass indicates direction."},
    {"content": "COMPUTER = RFUVQNPC. MEDICINE = ?", "option_a": "EOJDJEFM", "option_b": "EOJDEJFM", "option_c": "MFEJDJOE", "option_d": "MFEDJJOE", "correct_option": "A", "explanation": "Shifted alphabet pattern."},
    {"content": "If Tuesday is the 4th, what is the 18th?", "option_a": "Tuesday", "option_b": "Wednesday", "option_c": "Monday", "option_d": "Thursday", "correct_option": "A", "explanation": "18 - 4 = 14 days = exactly 2 weeks. So it is the same day."},
    {"content": "Point A is 5m North of B. B is 12m East of C. Distance A to C?", "option_a": "13m", "option_b": "17m", "option_c": "15m", "option_d": "10m", "correct_option": "A", "explanation": "Pythagoras: sqrt(5^2 + 12^2) = 13."},
    {"content": "A, B, C, D are in a row. A is not next to B. C is next to D. Who is at ends?", "option_a": "A, B", "option_b": "C, D", "option_c": "A, C", "option_d": "B, D", "correct_option": "A", "explanation": "Possible arrangement: A, C, D, B."},
    {"content": "Which word cannot be formed from 'CELEBRATION'?", "option_a": "TAILOR", "option_b": "ACTION", "option_c": "CREATE", "option_d": "BREATH", "correct_option": "D", "explanation": "No 'H' in CELEBRATION."},
    {"content": "If 1=3, 2=5, 3=7, then 4=?", "option_a": "8", "option_b": "9", "option_c": "10", "option_d": "11", "correct_option": "B", "explanation": "Pattern: 2n + 1."},
    {"content": "If 'ORANGE' is 'PSBOHF', then 'APPLE' is:", "option_a": "BQQMF", "option_b": "BQQNF", "option_c": "BQRMF", "option_d": "BQPLF", "correct_option": "A", "explanation": "Each letter is shifted by +1."},
    {"content": "Introducing a girl, Vipin said 'Her mother is the only daughter of my mother-in-law'. Relation?", "option_a": "Uncle", "option_b": "Father", "option_c": "Brother", "option_d": "Husband", "correct_option": "B", "explanation": "Wife's daughter is Vipin's daughter."},
    {"content": "A starts at X and walks 2km South, then 3km West, then 2km North. Position relative to X?", "option_a": "3km West", "option_b": "3km East", "option_c": "2km South", "option_d": "At X", "correct_option": "A", "explanation": "Path forms 3 sides of a rectangle."},
    {"content": "Which number replaces '?' in 4, 9, 16, 25, ?", "option_a": "36", "option_b": "35", "option_c": "30", "option_d": "49", "correct_option": "A", "explanation": "Squares of 2,3,4,5,6."},
    {"content": "Find odd one out: 27, 64, 125, 144", "option_a": "144", "option_b": "27", "option_c": "64", "option_d": "125", "correct_option": "A", "explanation": "144 is a square, others are cubes."},
    {"content": "Clock shows 4:30. Minute hand points South. Where does Hour hand point?", "option_a": "North-East", "option_b": "South-East", "option_c": "South-West", "option_d": "North-West", "correct_option": "B", "explanation": "At 4:30, hour hand is between 4 and 5."}
]

COMPUTER_QUESTIONS = [
    {"content": "What is the binary equivalent of decimal 10?", "option_a": "1010", "option_b": "1100", "option_c": "1001", "option_d": "1111", "correct_option": "A", "explanation": "8 + 2 = 1010."},
    {"content": "Which of the following is an volatile memory?", "option_a": "RAM", "option_b": "ROM", "option_c": "HDD", "option_d": "SSD", "correct_option": "A", "explanation": "RAM loses data when power is off."},
    {"content": "What does HTTP stand for?", "option_a": "HyperText Transfer Protocol", "option_b": "High Tech Text Process", "option_c": "Hyper Terminal Text Port", "option_d": "High Transfer Text Program", "correct_option": "A", "explanation": "Standard networking term."},
    {"content": "1 Gigabyte (GB) is equal to:", "option_a": "1024 MB", "option_b": "1000 MB", "option_c": "1024 KB", "option_d": "512 MB", "correct_option": "A", "explanation": "2^10 MB."},
    {"content": "Which is the base of Hexadecimal system?", "option_a": "2", "option_b": "8", "option_c": "10", "option_d": "16", "correct_option": "D", "explanation": "Hex means 16."},
    {"content": "What is the result of (1011)2 + (1101)2?", "option_a": "(11000)2", "option_b": "(11001)2", "option_c": "(10111)2", "option_d": "(10000)2", "correct_option": "A", "explanation": "11 + 13 = 24."},
    {"content": "Which logic gate outputs 1 only when all inputs are 1?", "option_a": "AND", "option_b": "OR", "option_c": "NAND", "option_d": "XOR", "correct_option": "A", "explanation": "Multiplication logic."},
    {"content": "What is the function of the ALU?", "option_a": "Perform arithmetic/logic", "option_b": "Store data", "option_c": "Control timing", "option_d": "User interface", "correct_option": "A", "explanation": "Arithmetic Logic Unit."},
    {"content": "A nibble consists of how many bits?", "option_a": "4", "option_b": "8", "option_c": "16", "option_d": "2", "correct_option": "A", "explanation": "Half a byte."},
    {"content": "Which is not an Operating System?", "option_a": "Oracle", "option_b": "Windows", "option_c": "Linux", "option_d": "macOS", "correct_option": "A", "explanation": "Oracle is a DBMS/Company."}
]

ENGLISH_QUESTIONS = [
    {"content": "Select the synonym of 'ABANDON':", "option_a": "Keep", "option_b": "Forsake", "option_c": "Cherish", "option_d": "Adopt", "correct_option": "B", "explanation": "Abandon means to leave or forsake."},
    {"content": "Choose the correct spelling:", "option_a": "Occurrence", "option_b": "Occurence", "option_c": "Ocurrence", "option_d": "Occurrance", "correct_option": "A", "explanation": "Double c and double r."},
    {"content": "Fill in: She is ____ university student.", "option_a": "a", "option_b": "an", "option_c": "the", "option_d": "some", "correct_option": "A", "explanation": "'University' starts with a consonant 'y' sound."},
    {"content": "Antonym of 'OPTIMIST' is:", "option_a": "Pessimist", "option_b": "Idealist", "option_c": "Realist", "option_d": "Activist", "correct_option": "A", "explanation": "Opposite of hope is pessimism."},
    {"content": "The study of birds is called:", "option_a": "Ornithology", "option_b": "Entomology", "option_c": "Zoology", "option_d": "Biology", "correct_option": "A", "explanation": "Scientific term."},
    {"content": "Select the antonym of 'VAGUE':", "option_a": "Clear", "option_b": "Dull", "option_c": "Dark", "option_d": "Unknown", "correct_option": "A", "explanation": "Vague means unclear; opposite is clear."},
    {"content": "Choose the correct idiom: 'A piece of ____'.", "option_a": "cake", "option_b": "bread", "option_c": "toy", "option_d": "work", "correct_option": "A", "explanation": "Means something very easy."},
    {"content": "Fill in: The book is ____ the table.", "option_a": "on", "option_b": "in", "option_c": "with", "option_d": "to", "correct_option": "A", "explanation": "Preposition of place."},
    {"content": "Person who writes the life of another person:", "option_a": "Biographer", "option_b": "Autobiographer", "option_c": "Author", "option_d": "Editor", "correct_option": "A", "explanation": "Bio (life) + Graph (write)."},
    {"content": "Select the synonym of 'ZEAL':", "option_a": "Enthusiasm", "option_b": "Hatred", "option_c": "Apathy", "option_d": "Fear", "correct_option": "A", "explanation": "Zeal means great energy or enthusiasm."}
]

# --- MODELS ---
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    mobile = Column(String)
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
    computer_score = Column(Float, default=0.0)
    english_score = Column(Float, default=0.0)
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

# --- SCHEMAS ---
class AnswerSubmit(BaseModel):
    question_id: int
    selected_option: Optional[str] = None
    time_spent_seconds: int

class TestSubmit(BaseModel):
    answers: List[AnswerSubmit]

class FeedbackRequest(BaseModel):
    subject: str
    comment: str
    email: Optional[str] = None

# --- UTILITIES ---
def get_fallback_questions(section: str, count: int) -> list:
    if section == "Mathematics":
        bank = MATH_QUESTIONS
    elif section == "Logical Reasoning":
        bank = LR_QUESTIONS
    elif section == "Computer Awareness":
        bank = COMPUTER_QUESTIONS
    else:
        bank = ENGLISH_QUESTIONS
    return [bank[i % len(bank)].copy() for i in range(count)]

# --- DEPENDENCIES ---
def get_db():
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"⚠️ Database Init Warning: {e}")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == "guest@nimcet.in").first()
    if not user:
        user = User(
            name="Guest Aspirant",
            email="guest@nimcet.in",
            mobile="0000000000",
            exam_year=2024,
            hashed_password=""
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

# --- STARTUP LOG ---
print("* NIMCET Mock Engine (LITE) is booting up...")

# --- APP & ROUTES ---
app = FastAPI(title="NIMCET Mock Engine Lite", version="3.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/api/ping")
def ping():
    return {"status": "alive", "msg": "NIMCET Engine is finally ready!"}

@app.post("/api/tests/generate")
async def generate_test(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        test_result = TestResult(user_id=current_user.id)
        db.add(test_result)
        db.commit()
        db.refresh(test_result)
        
        sections = [
            ("Mathematics", 50),
            ("Logical Reasoning", 40),
            ("Computer Awareness", 10),
            ("General English", 20)
        ]
        
        for section_name, count in sections:
            questions = get_fallback_questions(section_name, count)
            for q in questions:
                q_model = Question(
                    section=section_name,
                    content=q.get("content", ""),
                    option_a=q.get("option_a", ""),
                    option_b=q.get("option_b", ""),
                    option_c=q.get("option_c", ""),
                    option_d=q.get("option_d", ""),
                    correct_option=q.get("correct_option", "A"),
                    explanation=q.get("explanation", "")
                )
                db.add(q_model)
                db.commit()
                db.refresh(q_model)
                
                q_res = QuestionResult(
                    test_result_id=test_result.id,
                    question_id=q_model.id
                )
                db.add(q_res)
        
        db.commit()
        return {"test_id": test_result.id}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/tests/{test_id}")
def get_test(test_id: int, db: Session = Depends(get_db)):
    results = db.query(QuestionResult).filter(QuestionResult.test_result_id == test_id).all()
    if not results:
        raise HTTPException(status_code=404)
    
    questions_data = []
    for r in results:
        questions_data.append({
            "id": r.question.id,
            "section": r.question.section,
            "content": r.question.content,
            "options": [
                r.question.option_a,
                r.question.option_b,
                r.question.option_c,
                r.question.option_d
            ]
        })
    
    return {"test_id": test_id, "questions": questions_data}

@app.post("/api/tests/{test_id}/submit")
def submit_test(test_id: int, submission: TestSubmit, db: Session = Depends(get_db)):
    test = db.query(TestResult).filter(TestResult.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404)
    total_score = 0.0
    math_score = 0.0
    reasoning_score = 0.0
    computer_score = 0.0
    english_score = 0.0
 
    for ans in submission.answers:
        q_res = db.query(QuestionResult).filter(
            QuestionResult.test_result_id == test_id,
            QuestionResult.question_id == ans.question_id
        ).first()
        
        if q_res:
            q_res.selected_option = ans.selected_option
            q_res.is_correct = str(ans.selected_option).upper() == str(q_res.question.correct_option).upper()
            
            # Weighted Scoring (NIMCET)
            if q_res.question.section == "Mathematics":
                score = 12 if q_res.is_correct else (-3 if ans.selected_option else 0)
                math_score += score
            elif q_res.question.section == "Logical Reasoning":
                score = 6 if q_res.is_correct else (-1.5 if ans.selected_option else 0)
                reasoning_score += score
            elif q_res.question.section == "Computer Awareness":
                score = 8 if q_res.is_correct else (-2 if ans.selected_option else 0)
                computer_score += score
            else: # General English
                score = 4 if q_res.is_correct else (-1 if ans.selected_option else 0)
                english_score += score
            
            total_score += score
            
    test.total_score = total_score
    test.math_score = math_score
    test.reasoning_score = reasoning_score
    test.computer_score = computer_score
    test.english_score = english_score
    test.completed_at = func.now()
    db.commit()
    return {"total_score": total_score}

@app.get("/api/tests/{test_id}/analysis")
def get_analysis(test_id: int, db: Session = Depends(get_db)):
    test = db.query(TestResult).filter(TestResult.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    questions = []
    for r in test.question_results:
        questions.append({
            "section": r.question.section,
            "content": r.question.content,
            "options": {
                "A": r.question.option_a,
                "B": r.question.option_b,
                "C": r.question.option_c,
                "D": r.question.option_d
            },
            "correct_option": r.question.correct_option,
            "selected_option": r.selected_option,
            "is_correct": r.is_correct,
            "explanation": r.question.explanation
        })
    
    return {
        "test_id": test_id,
        "total_score": test.total_score,
        "math_score": test.math_score,
        "reasoning_score": test.reasoning_score,
        "computer_score": test.computer_score,
        "english_score": test.english_score,
        "started_at": test.started_at,
        "questions": questions
    }

@app.get("/api/history")
def get_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    results = db.query(TestResult).filter(TestResult.user_id == current_user.id).all()
    return [
        {
            "id": r.id,
            "total_score": r.total_score,
            "started_at": r.started_at,
            "completed_at": r.completed_at
        } for r in results
    ]

@app.get("/")
def read_root():
    return {"status": "ok", "mode": "Final Production"}
