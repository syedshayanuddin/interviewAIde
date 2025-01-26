let cvContent = '';
let cvQuestions = [];
let cvAnswers = [];
let cvQuestionCount = 0;

function handleCVUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            cvContent = e.target.result;
            displayMessage("CV uploaded successfully. Analyzing...", 'ai-message');
            analyzeCVContent();
        };
        reader.readAsText(file);
    }
}

function analyzeCVContent() {
    // This function would typically make an API call to your backend
    // For now, we'll simulate the analysis with a timeout
    setTimeout(() => {
        displayMessage("CV analysis complete. Would you like to start the interview? (Yes/No)", 'ai-message');
    }, 2000);
}

function handleCVUserInput(input) {
    if (!cvQuestions.length) {
        if (input.toLowerCase() === 'yes') {
            displayMessage("Great! How many questions would you like to answer? (1-10)", 'ai-message');
        } else {
            displayMessage("Okay, let me know when you're ready to start the interview.", 'ai-message');
        }
    } else if (cvQuestions.length && cvAnswers.length < cvQuestionCount) {
        cvAnswers.push(input);
        askNextCVQuestion();
    } else if (input >= 1 && input <= 10) {
        cvQuestionCount = parseInt(input);
        generateCVQuestions();
    } else {
        displayMessage("I didn't understand that. Please provide a valid input.", 'ai-message');
    }
}

function generateCVQuestions() {
    // In a real implementation, this would make an API call to generate questions based on the CV
    // For now, we'll simulate it with placeholder questions
    cvQuestions = [
        "Tell me about your experience in [Role from CV].",
        "How did you contribute to [Project from CV]?",
        "What skills did you gain from [Education/Training from CV]?",
        "Can you elaborate on your responsibilities at [Company from CV]?",
        "How have you applied [Skill from CV] in your previous roles?",
    ];
    askNextCVQuestion();
}

function askNextCVQuestion() {
    if (cvAnswers.length < cvQuestionCount) {
        const question = cvQuestions[cvAnswers.length];
        displayMessage(question, 'ai-message');
    } else {
        endCVInterview();
    }
}

function endCVInterview() {
    displayMessage("Thank you for completing the CV-based interview. Generating feedback...", 'ai-message');
    generateCVFeedback();
}

function generateCVFeedback() {
    // In a real implementation, this would make an API call to generate feedback
    // For now, we'll simulate it with a placeholder message
    setTimeout(() => {
        const feedback = "Based on your CV and interview responses, you have a strong background in [Field]. Your experience with [Project/Skill] is particularly noteworthy. To improve, consider elaborating more on [Area] in future interviews.";
        displayMessage(feedback, 'ai-message');
    }, 2000);
}