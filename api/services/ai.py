import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini AI
genai.configure(api_key=os.environ.get("GEMINI_API_KEY", "your-api-key"))

# Model configuration
# Using gemini-1.5-flash for fast text generation
model = genai.GenerativeModel('gemini-1.5-flash')

def generate_questions(section: str, count: int) -> list:
    """
    Generates Nimcet mock test questions using Gemini.
    """
    prompt = f"""
    You are an expert examiner for the NIMCET (NIT MCA Common Entrance Test) exam.
    Generate {count} distinct multiple-choice questions for the '{section}' section.
    
    The sections and their typical content are:
    - Mathematics (Set Theory, Probability, Algebra, Calculus, Vectors, Trigonometry)
    - Logical Reasoning (Puzzles, Analytical Reasoning, Logical deductions)
    - Computer (Computer Basics, Data Representation, Computer Architecture)
    - English (Vocabulary, Grammar, Comprehension)
    
    Return pure JSON in this exact structure without any markdown formatting or backticks:
    [
      {{
        "content": "Question text here?",
        "option_a": "Option A text",
        "option_b": "Option B text",
        "option_c": "Option C text",
        "option_d": "Option D text",
        "correct_option": "A", // Or B, C, D
        "explanation": "Step-by-step logic on why this is correct."
      }}
    ]
    """
    
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        
        # Remove markdown if the model added it despite instructions
        if text.startswith("```json"):
            text = text[7:]
        if text.endswith("```"):
            text = text[:-3]
            
        return json.loads(text.strip())
    except Exception as e:
        print(f"Error generating questions via Gemini: {e}")
        print("Falling back to realistic mock NIMCET questions.")
        import services.mock_data as mock_data
        return mock_data.get_fallback_questions(section, count)
