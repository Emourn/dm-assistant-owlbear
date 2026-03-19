import pdfplumber
import os
import sys

# Paths to the rulebooks provided by the user
SOURCE_DIR = r"C:\Users\carlo\OneDrive\Desktop\!D&D!\Core Rulebooks (2024)"
PROJECT_ROOT = r"C:\Users\carlo\.gemini\antigravity\scratch\dm-assistant"
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "extracted-2024-rules")

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

BOOKS = [
    "Players Guide (2024).pdf",
    "Dungeon Masters Guide (2024).pdf",
    "Monster Manual (2024).pdf"
]

def extract_book(filename):
    pdf_path = os.path.join(SOURCE_DIR, filename)
    output_filename = filename.replace(".pdf", ".txt")
    output_path = os.path.join(OUTPUT_DIR, output_filename)
    
    print(f"Opening {filename}...")
    try:
        if not os.path.exists(pdf_path):
            print(f"Error: File not found at {pdf_path}")
            return

        with pdfplumber.open(pdf_path) as pdf:
            total_pages = len(pdf.pages)
            print(f"Extracting {total_pages} pages from {filename}...")
            
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(f"OFFICIAL 2024 RULES EXTRACTION: {filename}\n")
                f.write(f"Source: {pdf_path}\n")
                f.write("=" * 60 + "\n\n")
                
                # We extract in chunks to avoid memory overflow for 300MB+ PDFs
                for i, page in enumerate(pdf.pages):
                    text = page.extract_text()
                    if text:
                        f.write(f"\n[PAGE {i+1}]\n")
                        f.write(text)
                        f.write("\n" + "-" * 40 + "\n")
                    
                    if (i + 1) % 50 == 0:
                        print(f"  Processed {i + 1}/{total_pages} pages...")
                        
            print(f"✓ Successfully extracted {filename} to {output_path}")
            
    except Exception as e:
        print(f"X Failed to process {filename}: {str(e)}")

if __name__ == "__main__":
    for book in BOOKS:
        extract_book(book)
