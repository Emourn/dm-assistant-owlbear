import pdfplumber
import os

input_dir = os.path.join(os.path.dirname(__file__), 'campaign-material')
output_dir = os.path.join(input_dir, 'extracted-text')

files_to_extract = ['Fixing Vecna.pdf', 'Death House.pdf']

for filename in files_to_extract:
    pdf_path = os.path.join(input_dir, filename)
    out_path = os.path.join(output_dir, filename.replace('.pdf', '-plumber.txt'))
    
    print(f"Processing {filename}...")
    try:
        with pdfplumber.open(pdf_path) as pdf:
            total_pages = len(pdf.pages)
            print(f"  - Total pages: {total_pages}")
            
            output_text = f"{filename.upper()} — TEXT EXTRACTION (pdfplumber)\nTotal Pages: {total_pages}\n{'=' * 60}\n\n"
            
            for i, page in enumerate(pdf.pages):
                text = page.extract_text()
                if text:
                    output_text += f"\n--- PAGE {i + 1} ---\n{text}\n"
            
            with open(out_path, 'w', encoding='utf-8') as f:
                f.write(output_text)
                
            print(f"  ✓ Finished {filename} - Saved to {out_path}")
            
    except Exception as e:
        print(f"  x Error processing {filename}: {str(e)}")
