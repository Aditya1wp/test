import main, models, database
from fastapi import HTTPException

# Create an inline test to call the signup function directly and trace the error
def run_debug():
    print("Starting debug run...")
    db = database.SessionLocal()
    req = main.SignupRequest(
        name="Aditya Debug",
        email="adityadebug@gmail.com",
        mobile="1231231235",
        state="Delhi",
        study_place="IIT",
        exam_year=2024,
        password="password123"
    )
    
    try:
        res = main.signup(req, db)
        print("Success:", res)
    except HTTPException as he:
        print("HTTP Exception:", he.detail)
    except Exception as e:
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    run_debug()
