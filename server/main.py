from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from typing import List
from pydantic import BaseModel
import asyncio
import models, database
from services import ai


class FeedbackRequest(BaseModel):
    subject: str
    comment: str
    email: str | None = None

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(db: Session = Depends(get_db)):
    # Hardcoded Guest User for a system without Auth
    user = db.query(models.User).filter(models.User.email == "guest@nimcet.in").first()
    if not user:
        user = models.User(
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

# Create the database tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="NIMCET Mock Engine API", version="1.0.0")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnswerSubmit(BaseModel):
    question_id: int
    selected_option: str | None
    time_spent_seconds: int

class TestSubmit(BaseModel):
    answers: List[AnswerSubmit]



@app.post("/api/tests/generate")
async def generate_test(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    test_result = models.TestResult(user_id=current_user.id)
    db.add(test_result)
    db.commit()
    db.refresh(test_result)

    sections = [
        ("Mathematics", 50),
        ("Logical Reasoning", 40),
        ("Computer", 15),
        ("English", 15)
    ]
    
    # We'll generate a smaller set for quick test purposes if needed, but going with full spec here might timeout or hit rate limits on normal tier.
    # To prevent rate-limit crashes, we'll fetch them sequentially with sleep or use a subset.
    # For robust mock engine, we do a subset and scale up as required by the generator.
    all_qs_data = []
    for section_name, count in sections:
        # In a real scenario we'd use 'count', but to mock we can request 'count'
        questions = ai.generate_questions(section_name, count)
        for q in questions:
            q_model = models.Question(
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
            
            # Create question result
            q_res = models.QuestionResult(test_result_id=test_result.id, question_id=q_model.id)
            db.add(q_res)
            all_qs_data.append(q_model)
    
    db.commit()
    return {"message": "Test generated", "test_id": test_result.id}

@app.get("/api/tests/{test_id}")
def get_test(test_id: int, db: Session = Depends(database.get_db)):
    """Fetch the questions for a generated test."""
    results = db.query(models.QuestionResult).filter(models.QuestionResult.test_result_id == test_id).all()
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
def submit_test(test_id: int, submission: TestSubmit, db: Session = Depends(database.get_db)):
    """Calculates the score based on NIMCET marking schema."""
    test = db.query(models.TestResult).filter(models.TestResult.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
        
    SCORING: dict[str, dict[str, float]] = {
        "Mathematics": {"correct": 12.0, "incorrect": -3.0},
        "Logical Reasoning": {"correct": 6.0, "incorrect": -1.5},
        "Computer": {"correct": 6.0, "incorrect": -1.5},
        "English": {"correct": 4.0, "incorrect": -1.0}
    }
    
    math_score: float = 0.0
    reasoning_score: float = 0.0
    comp_eng_score: float = 0.0
    
    for ans in submission.answers:
        q_res = db.query(models.QuestionResult).filter(
            models.QuestionResult.test_result_id == test_id,
            models.QuestionResult.question_id == ans.question_id
        ).first()
        
        if not q_res:
            continue
            
        q_res.selected_option = ans.selected_option
        q_res.time_spent_seconds = ans.time_spent_seconds
        
        q = q_res.question
        if ans.selected_option and q.correct_option:
            # Reconstruct option letter
            is_correct = False
            # Option selection from frontend might be full text or index, assume 'A', 'B', 'C', 'D' is sent
            if str(ans.selected_option).upper() == str(q.correct_option).upper():
                is_correct = True
                
            q_res.is_correct = is_correct
            section_key = str(q.section)
            scheme = SCORING.get(section_key, {"correct": 0.0, "incorrect": 0.0})
            
            points = float(scheme["correct"]) if is_correct else float(scheme["incorrect"])
            
            if section_key == "Mathematics":
                math_score += points
            elif section_key == "Logical Reasoning":
                reasoning_score += points
            else:
                comp_eng_score += points
                
    test.math_score = math_score
    test.reasoning_score = reasoning_score
    test.computer_english_score = comp_eng_score
    test.total_score = math_score + reasoning_score + comp_eng_score
    test.completed_at = func.now()
    db.commit()
    
    return {"message": "Test evaluated", "total_score": test.total_score}

@app.get("/api/history")
def get_history(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    """Fetch all test results for the authenticated user."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    results = db.query(models.TestResult).filter(models.TestResult.user_id == current_user.id).order_by(models.TestResult.started_at.desc()).all()
    history = []
    for r in results:
        history.append({
            "id": r.id,
            "total_score": r.total_score,
            "math_score": r.math_score,
            "reasoning_score": r.reasoning_score,
            "computer_english_score": r.computer_english_score,
            "started_at": r.started_at,
            "completed_at": r.completed_at
        })
    return history

@app.get("/api/tests/{test_id}/analysis")
def get_test_analysis(test_id: int, db: Session = Depends(database.get_db)):
    """Fetch detailed question-by-question analysis for a test."""
    test = db.query(models.TestResult).filter(models.TestResult.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
        
    results = db.query(models.QuestionResult).filter(models.QuestionResult.test_result_id == test_id).all()
    analysis = []
    for r in results:
        q = r.question
        analysis.append({
            "question_id": q.id,
            "section": q.section,
            "content": q.content,
            "options": {
                "A": q.option_a,
                "B": q.option_b,
                "C": q.option_c,
                "D": q.option_d
            },
            "selected_option": r.selected_option,
            "correct_option": q.correct_option,
            "is_correct": r.is_correct,
            "explanation": q.explanation,
            "time_spent": r.time_spent_seconds
        })
    
    return {
        "test_id": test_id,
        "total_score": test.total_score,
        "math_score": test.math_score,
        "reasoning_score": test.reasoning_score,
        "computer_english_score": test.computer_english_score,
        "started_at": test.started_at,
        "completed_at": test.completed_at,
        "questions": analysis
    }

@app.get("/")
def read_root():
    return {"message": "Welcome to the NIMCET Mock Engine API"}

@app.post("/api/feedback")
def submit_feedback(req: FeedbackRequest, db: Session = Depends(get_db)):
    # If email provided in request use it, otherwise use a default
    target_email = req.email or "adityastudy003@gmail.com"
    new_feedback = models.Feedback(
        email=target_email,
        subject=req.subject,
        comment=req.comment
    )
    db.add(new_feedback)
    db.commit()
    return {"message": "Feedback stored successfully", "recipient": target_email}

@app.get("/api/admin/feedbacks")
def get_feedbacks(db: Session = Depends(get_db)):
    return db.query(models.Feedback).all()
