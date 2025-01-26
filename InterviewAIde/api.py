from flask import Flask, request, jsonify, render_template, session
from groq import Groq
import os
import re
import PyPDF2
from docx import Document
import io

app = Flask(__name__)
app.secret_key = os.urandom(24)  
client = Groq(api_key=os.getenv('GROQ_API_KEY'))
MODEL = 'llama3-70b-8192'

def validate_and_extract_domains(input_text):
    """Use the Groq model to validate the input and extract relevant domains"""
    system_message = """You are an AI assistant tasked with analyzing a user's input about their professional background or interests. 
    Your job is to:
    1. Determine if the input is a valid description of professional domains, fields of study, or job titles.
    2. Extract relevant domains or fields mentioned in the input.
    3. Ignore any irrelevant or personal information.
    
    Respond with:
    - 'Invalid: [reason]' if the input is gibberish or completely unrelated to professional domains.
    - 'Valid: [extracted domains]' if the input contains valid professional information."""
    
    user_message = f"Analyze this input and extract relevant professional domains or fields: '{input_text}'"

    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": user_message}
    ]

    response = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        max_tokens=200,
        temperature=0.3
    )

    result = response.choices[0].message.content.strip()
    is_valid = result.lower().startswith('valid')
    return is_valid, result

def generate_interview_questions(domains):
    """Generate interview questions based on the given domains using Groq API"""
    system_message = """You are an expert interviewer tasked with generating relevant and insightful interview questions for any job position in any field. 
    Focus on questions that can be answered verbally and demonstrate understanding of concepts, problem-solving approaches, and best practices in the specified domains."""
    
    user_message = f"""Generate 5 interview questions for a position related to the following domains: {domains}. Each question should:
    1. Be directly related to one or more of the specified domains
    2. Be suitable for verbal answers in an interview setting
    3. Focus on relevant skills, experiences, or scenarios in the fields
    4. Be clear and concise
    5. Be appropriate for assessing a candidate's suitability for roles in these domains
    Provide only the questions, one per line, without any additional text or numbering."""

    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": user_message}
    ]

    response = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        max_tokens=1000,
        temperature=0.7
    )

    generated_content = response.choices[0].message.content
    questions = [q.strip() for q in generated_content.split('\n') if q.strip()][:5]
    return questions

def generate_final_feedback(questions, answers):
    """Generate cumulative feedback for all answers"""
    system_message = "You are an AI assistant providing cumulative feedback on a developer interview focusing on their knowledge in their domain."
    user_message = "Here are the questions and answers from the interview:\n\n"
    for q, a in zip(questions, answers):
        user_message += f"Q: {q}\nA: {a}\n\n"
    user_message += "Provide concise, constructive feedback on the overall performance. Highlight strengths and areas for improvement."

    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": user_message}
    ]

    response = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        max_tokens=300,
        temperature=0.7
    )

    return response.choices[0].message.content

@app.route('/')
def index():
    return render_template('index.html')

# @app.route('/start_interview', methods=['POST'])
# def start_interview():
#     user_input = request.json.get('domain')
#     if not user_input:
#         return jsonify({'error': 'Missing input'}), 400
    
#     is_valid, validation_message = validate_and_extract_domains(user_input)
#     if not is_valid:
#         return jsonify({'error': validation_message}), 400
    
#     # Extract domains from the validation message
#     domains = validation_message.split(':', 1)[1].strip()
    
#     questions = generate_interview_questions(domains)
#     session['questions'] = questions
#     session['current_question'] = 0
#     session['answers'] = []
#     return jsonify({"question": questions[0]})

@app.route('/answer_question', methods=['POST'])
def answer_question():
    answer = request.json.get('answer')
    if 'questions' not in session:
        return jsonify({'error': 'No active interview'}), 400

    current_question = session['current_question']
    questions = session['questions']
    
    session['answers'].append(answer)

    session['current_question'] += 1
    if session['current_question'] < len(questions):
        next_question = questions[session['current_question']]
        return jsonify({"next_question": next_question})
    else:
        final_feedback = generate_final_feedback(questions, session['answers'])
        session.clear()
        return jsonify({"final_feedback": final_feedback})


# @app.route('/get_practice_question', methods=['GET'])
# def get_practice_question():
#     # This should return the next question in the practice interview
#     # You might want to keep track of the current question index in the session
#     if 'practice_questions' not in session:
#         session['practice_questions'] = generate_interview_questions("general")  # Or use a specific domain
#         session['current_question'] = 0
    
#     if session['current_question'] < len(session['practice_questions']):
#         question = session['practice_questions'][session['current_question']]
#         session['current_question'] += 1
#         return jsonify({"question": question})
#     else:
#         return jsonify({"question": None})  # No more questions

@app.route('/start_interview', methods=['POST'])
def start_interview():
    user_input = request.json.get('domain')
    if not user_input:
        return jsonify({'error': 'Missing input'}), 400
    
    is_valid, validation_message = validate_and_extract_domains(user_input)
    if not is_valid:
        return jsonify({'error': validation_message}), 400
    
    # Extract domains from the validation message
    domains = validation_message.split(':', 1)[1].strip()
    
    questions = generate_interview_questions(domains)
    return jsonify({"questions": questions})

# Remove or comment out the /get_practice_question route as it's no longer needed


# @app.route('/generate_feedback', methods=['POST'])
# def generate_feedback():
#     data = request.json
#     questions = data.get('questions', [])
#     answers = data.get('answers', [])
    
#     if len(questions) != len(answers):
#         return jsonify({'error': 'Mismatch in number of questions and answers'}), 400
    
#     # Prepare the input for the AI model
#     interview_summary = "Interview Summary:\n"
#     for q, a in zip(questions, answers):
#         interview_summary += f"Q: {q}\nA: {a}\n\n"
    
#     prompt = f"""As an AI interview assistant, analyze the following interview and provide constructive feedback:

# {interview_summary}

# Please provide feedback on:
# 1. Overall performance
# 2. Strengths demonstrated
# 3. Areas for improvement
# 4. Specific advice for future interviews

# Feedback:"""

#     response = client.chat.completions.create(
#         model=MODEL,
#         messages=[
#             {"role": "system", "content": "You are an AI interview assistant providing feedback on practice interviews."},
#             {"role": "user", "content": prompt}
#         ],
#         max_tokens=500,
#         temperature=0.7
#     )

#     feedback = response.choices[0].message.content.strip()
#     return jsonify({"feedback": feedback})


@app.route('/generate_feedback', methods=['POST'])
def generate_feedback():
    try:
        data = request.json
        mode = data.get('mode', '')
        questions = data.get('questions', [])
        answers = data.get('answers', [])
        
        print(f"Generating feedback for {mode} mode")
        print("Received questions:", questions)
        print("Received answers:", answers)
        
        if len(questions) != len(answers):
            print(f"Mismatch in number of questions ({len(questions)}) and answers ({len(answers)})")
            return jsonify({'error': 'Mismatch in number of questions and answers'}), 400
        
        # Prepare the input for the AI model
        interview_summary = "Interview Summary:\n"
        for q, a in zip(questions, answers):
            interview_summary += f"Q: {q}\nA: {a}\n\n"
        
        print("Interview summary:", interview_summary)
        
        prompt = f"""As an AI interview assistant, analyze the following {mode} interview and provide constructive feedback:

{interview_summary}

Please provide feedback on:
1. Overall performance
2. Strengths demonstrated
3. Areas for improvement
4. Specific advice for future interviews

Address the interviewee directly using "you" and "your" instead of "the candidate" or "they". Provide encouraging and constructive feedback that feels personal and tailored to the individual.

Feedback:"""

        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": f"You are an AI interview assistant providing feedback on {mode} interviews."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500,
            temperature=0.7
        )

        feedback = response.choices[0].message.content.strip()
        print("Generated feedback:", feedback)
        return jsonify({"feedback": feedback})
    except Exception as e:
        print("Error in generate_feedback:", str(e))
        return jsonify({'error': str(e)}), 500

# --------    CV START -----------------

@app.route('/upload_cv', methods=['POST'])
def upload_cv():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file:
        try:
            content = extract_text_from_file(file)
            session['cv_content'] = content
            analysis = analyze_cv(content)
            return jsonify({'message': 'CV uploaded and analyzed successfully', 'analysis': analysis})
        except Exception as e:
            return jsonify({'error': f'Error processing file: {str(e)}'}), 500

def extract_text_from_file(file):
    filename = file.filename.lower()
    if filename.endswith('.pdf'):
        return extract_text_from_pdf(file)
    elif filename.endswith('.docx'):
        return extract_text_from_docx(file)
    elif filename.endswith('.txt'):
        return file.read().decode('utf-8', errors='ignore')
    else:
        raise ValueError("Unsupported file type")

def extract_text_from_pdf(file):
    pdf_reader = PyPDF2.PdfReader(io.BytesIO(file.read()))
    text = ""
    for page in pdf_reader.pages:
        text += page.extract_text() + "\n"
    return text

def extract_text_from_docx(file):
    doc = Document(io.BytesIO(file.read()))
    text = ""
    for para in doc.paragraphs:
        text += para.text + "\n"
    return text

def analyze_cv(content):
    system_message = """You are an AI assistant tasked with analyzing a CV/resume. 
    Extract key information such as work experience, skills, education, and notable projects.
    Also, provide a brief summary of the CV."""
    
    user_message = f"Analyze this CV and extract key information:\n\n{content}"

    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": user_message}
    ]

    response = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        max_tokens=500,
        temperature=0.3
    )

    analysis = response.choices[0].message.content
    
    # Extract summary from the analysis
    summary_start = analysis.find("Summary:")
    summary = analysis[summary_start:] if summary_start != -1 else "Summary not available."

    return {"full_analysis": analysis, "summary": summary}

@app.route('/generate_cv_questions', methods=['POST'])
def generate_cv_questions():
    cv_content = session.get('cv_content')
    if not cv_content:
        return jsonify({'error': 'No CV found in session'}), 400
    
    num_questions = request.json.get('num_questions', 5)
    
    system_message = """You are an AI assistant tasked with generating interview questions based on a CV/resume. 
    Generate relevant and insightful questions that will help assess the candidate's experience and skills."""
    
    user_message = f"""Generate {num_questions} interview questions based on this CV:

    {cv_content}

    Each question should be directly related to the information in the CV and help assess the candidate's suitability for roles matching their experience.
    Provide only the questions, one per line, without any additional text, numbering, or formatting."""

    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": user_message}
    ]

    response = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        max_tokens=1000,
        temperature=0.7
    )

    questions = response.choices[0].message.content.strip().split('\n')
    questions = [q.strip() for q in questions if q.strip()]
    return jsonify({'questions': questions[:num_questions]})

@app.route('/generate_cv_feedback', methods=['POST'])
def generate_cv_feedback():
    cv_content = session.get('cv_content')
    if not cv_content:
        return jsonify({'error': 'No CV found in session'}), 400
    
    questions = request.json.get('questions', [])
    answers = request.json.get('answers', [])
    
    if len(questions) != len(answers):
        return jsonify({'error': 'Mismatch in number of questions and answers'}), 400
    
    system_message = """You are an AI assistant providing feedback on a CV-based interview. 
    Analyze the CV content, interview questions, and candidate's answers to provide constructive feedback."""
    
    user_message = f"""Analyze this CV-based interview and provide feedback:

    CV Content:
    {cv_content}

    Interview:
    """
    for q, a in zip(questions, answers):
        user_message += f"Q: {q}\nA: {a}\n\n"
    
    user_message += """Provide feedback on:
    1. Overall performance
    2. Strengths demonstrated
    3. Areas for improvement
    4. Alignment of responses with CV content
    5. Specific advice for future interviews
    
    Address the interviewee directly using "you" and "your" instead of "the candidate" or "they". Provide encouraging and constructive feedback that feels personal and tailored to the individual.
    """

    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": user_message}
    ]

    response = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        max_tokens=1000,
        temperature=0.7
    )

    feedback = response.choices[0].message.content
    return jsonify({'feedback': feedback})

# --------    CV END -----------------

if __name__ == '__main__':
    app.run(debug=True)