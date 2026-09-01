import os, glob

frontend_dir = r'c:\Users\Vimal Kumar G\Desktop\Drive master\Drive-Master\frontend\src'
files = glob.glob(os.path.join(frontend_dir, '**', '*.tsx'), recursive=True)

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Standard string concatenations
    content = content.replace('"http://localhost:8000/api/v1', '(import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1") + "')
    content = content.replace("'http://localhost:8000/api/v1", "(import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1') + '")
    
    # Template literals
    content = content.replace('`http://localhost:8000/api/v1/', '`${import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1"}/')
    
    # Uploads/Media paths (e.g. `http://localhost:8000${company.jd_url}`)
    content = content.replace('`http://localhost:8000${', '`${window.location.origin === "http://localhost:5173" ? "http://localhost:8000" : ""}${')
    
    if original != content:
        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Updated {file}')
