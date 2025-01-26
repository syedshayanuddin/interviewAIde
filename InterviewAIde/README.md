# HOW TO SETUP THE ENV

1. Clone the directory
2. Open the folder in VSCode
3. In the terminal/the cmd prompt of the folders directory, create a virtual env like this:
   python -m venv .venv
4. To enter/activate the environment, type this:
   .venv/Scripts/activate
5. Now type this: pip install groq gradio requests flask
6. Get your own API key of GROQ
7. In the terminal type this: 
   $env:GROQ_API_KEY = "your api key here"
8. First run the file api.py by typing this in terminal: python api.py
9. Then open another terminal on vscode (split screen)
10. Repeat steps 4 and 7 if you are not in virtual environment.
11. Then run file app.py: python app.py
