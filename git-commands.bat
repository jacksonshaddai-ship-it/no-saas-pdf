@echo off
cd /d "C:\Users\comer\OneDrive\Desktop\pdf-master-pro"
"C:\Program Files\Git\bin\git.exe" config user.email "jackson@pdfmasterpro.com"
"C:\Program Files\Git\bin\git.exe" config user.name "Jackson"
"C:\Program Files\Git\bin\git.exe" add .
"C:\Program Files\Git\bin\git.exe" commit -m "feat: login social Google e GitHub"
"C:\Program Files\Git\bin\git.exe" branch -M main
"C:\Program Files\Git\bin\git.exe" push -u origin main