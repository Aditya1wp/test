from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

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
    section = Column(String, index=True) # "Mathematics", "Logical Reasoning", "Computer", "English"
    content = Column(Text, nullable=False)
    option_a = Column(String, nullable=False)
    option_b = Column(String, nullable=False)
    option_c = Column(String, nullable=False)
    option_d = Column(String, nullable=False)
    correct_option = Column(String, nullable=False) # "A", "B", "C", "D"
    explanation = Column(Text, nullable=True)

class QuestionResult(Base):
    __tablename__ = "question_results"
    id = Column(Integer, primary_key=True, index=True)
    test_result_id = Column(Integer, ForeignKey("test_results.id"))
    question_id = Column(Integer, ForeignKey("questions.id"))
    selected_option = Column(String, nullable=True) # "A", "B", "C", "D", or None if skipped
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
