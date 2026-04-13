from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from typing import List
from pydantic import BaseModel
import asyncio
import models, database
from services import ai, google_drive


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

# Create the database tables safely
try:
    models.Base.metadata.create_all(bind=database.engine)
except Exception as db_init_err:
    print(f"⚠️ Could not initialize DB tables: {db_init_err}")

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
    try:
        test_result = models.TestResult(user_id=current_user.id)
        db.add(test_result)
        db.commit()
        db.refresh(test_result)

        sections = [
            ("Mathematics", 5),
            ("Logical Reasoning", 5),
            ("Computer", 5),
            ("English", 5)
        ]
        
        all_qs_data = []
        for section_name, count in sections:
            try:
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
                    
                    q_res = models.QuestionResult(test_result_id=test_result.id, question_id=q_model.id)
                    db.add(q_res)
                    all_qs_data.append(q_model)
            except Exception as section_err:
                print(f"Error in section {section_name}: {section_err}")
                continue
        
        db.commit()
        return {"message": "Test generated", "test_id": test_result.id}
    except Exception as e:
        print(f"FATAL ERROR in generate_test: {e}")
        return {"error": str(e), "message": "Failed to generate test. Check server logs."}

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


@app.post("/api/storage/google-drive/upload", response_model=DriveUploadResponse)
async def upload_to_google_drive(
    upload: UploadFile = File(...),
    owner_uid: str = Form(...),
):
    if not owner_uid.strip():
        raise HTTPException(status_code=400, detail="owner_uid is required")

    try:
        uploaded = google_drive.upload_file_to_drive(
            upload.file,
            filename=upload.filename or "uploaded-file",
            mime_type=upload.content_type,
        )
    except google_drive.GoogleDriveConfigError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Google Drive upload failed: {exc}") from exc
    finally:
        await upload.close()

    return DriveUploadResponse(
        drive_file_id=uploaded["id"],
        drive_name=uploaded.get("name", upload.filename or "uploaded-file"),
        mime_type=uploaded.get("mimeType"),
        size=uploaded.get("size"),
        web_view_link=uploaded.get("webViewLink"),
        web_content_link=uploaded.get("webContentLink"),
    )

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
