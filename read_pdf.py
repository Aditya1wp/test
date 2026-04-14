import sys
import PyPDF2

try:
    path = 'PINNACLE REASONING BOOK FREE.pdf'
    reader = PyPDF2.PdfReader(path)
    
    with open('pdf_extract.txt', 'w', encoding='utf-8') as f:
        f.write(f"Total Pages: {len(reader.pages)}\n\n")
        
        # Extract pages 15 to 25 to get a good sample of questions
        for i in range(15, 25): 
            if i < len(reader.pages):
                f.write(f"--- PAGE {i} ---\n")
                f.write(reader.pages[i].extract_text() + "\n\n")
                
    print("Done writing to pdf_extract.txt")
except Exception as e:
    print("Error:", e)
