import requests
import json

API_KEY = "AIzaSyBJqPkWUje-396EBfZ3CjNeGSwIh25vFNA"
res = requests.post(f"https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={API_KEY}", json={
    "email": "testdebug3@nimcet.in",
    "password": "Password123!",
    "returnSecureToken": True
})
data = res.json()
token = data.get("idToken")
print("Firebase Signup:", res.status_code)
if not token:
    print(data)
    exit(1)

res2 = requests.post("http://127.0.0.1:8000/api/auth/signup", json={
    "name": "Test Debug",
    "email": "testdebug3@nimcet.in",
    "mobile": "0987654123",
    "state": "UP",
    "college": "Test",
    "study_place": "Home",
    "exam_year": 2024
}, headers={"Authorization": f"Bearer {token}"})
print("Backend Signup:", res2.status_code, res2.text)
