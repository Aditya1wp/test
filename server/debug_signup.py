import traceback
from fastapi.testclient import TestClient
from main import app, get_db
from database import SessionLocal

client = TestClient(app)

data = {
    "name": "Aditya Gaurav",
    "email": "testdebug@gmail.com",
    "mobile": "1231231234",
    "state": "Delhi",
    "study_place": "IIT Kanpur",
    "exam_year": 2024,
    "password": "password123"
}

try:
    response = client.post("/api/auth/signup", json=data)
    print("STATUS:", response.status_code)
    print("BODY:", response.text)
except Exception as e:
    traceback.print_exc()

