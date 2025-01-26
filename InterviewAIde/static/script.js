let recognition;
let currentQuestions = [];
let currentQuestionIndex = 0;
let currentMode = 'chat';
let isInterviewStarted = false;
let isPracticeStarted = false;
let userPreferredQuestionCount = 0;
let cvQuestions = [];
let cvAnswers = [];
let cvQuestionCount = 0;
let cvSummary = '';


document.addEventListener('DOMContentLoaded', function() {
    const sidebarItems = document.querySelectorAll('.sidebar ul li');
    const sendButton = document.getElementById('send-button');
    const startSpeakingButton = document.getElementById('start-speaking');
    const stopSpeakingButton = document.getElementById('stop-speaking');
    const userInput = document.getElementById('user-input');
    const cvUploadButton = document.getElementById('cv-upload-button');
    const cvFileInput = document.getElementById('cv-file');

    sidebarItems.forEach(item => {
        item.addEventListener('click', function() {
            sidebarItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            switchMode(this.dataset.mode);
        });
    });

    sendButton.addEventListener('click', handleUserInput);
    startSpeakingButton.addEventListener('click', startSpeechRecognition);
    stopSpeakingButton.addEventListener('click', stopSpeechRecognition);
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleUserInput();
        }
    });

    cvUploadButton.addEventListener('click', function() {
        cvFileInput.click();
    });

    cvFileInput.addEventListener('change', handleCVUpload);

    setupSpeechRecognition();

    // Initialize with chat mode
    switchMode('chat');
});

function switchMode(mode) {
    currentMode = mode;
    isInterviewStarted = false;
    isPracticeStarted = false;
    currentQuestions = [];
    currentQuestionIndex = 0;
    
    const chatWindow = document.getElementById('chat-window');
    chatWindow.innerHTML = '';

    document.getElementById('start-speaking').style.display = 'none';
    document.getElementById('stop-speaking').style.display = 'none';
    document.getElementById('cv-mode-section').style.display = 'none';

    switch(mode) {
        case 'chat':
            displayMessage("Let's begin your interview preparation. Please enter your target job role or industry to start.", 'ai-message');
            break;
        case 'cv':
            displayMessage("We're ready to tailor your interview experience. Please upload your Resume/CV to proceed.", 'ai-message');
            document.getElementById('cv-mode-section').style.display = 'block';
            break;
        case 'practice':
            displayMessage("Lets begin your vebral interview preparation. Please enter your domain/profession to begin.", 'ai-message');
            break;
        case 'about':
            displayMessage("ChatterCareer is an AI-powered interview assistant designed to help you prepare for job interviews.", 'ai-message');
            break;
        case 'contact':
            displayMessage("For support or inquiries, please email us at support@chattercareer.com", 'ai-message');
            break;
    }
}

function handleUserInput() {
    const userInput = document.getElementById('user-input').value.trim();
    if (userInput) {
        // displayMessage(userInput, 'user-message');
        if (currentMode === 'practice') {
            handlePracticeMode(userInput);
        } else if (currentMode === 'chat') {
            handleChatMode(userInput);
        } else if (currentMode === 'cv') {
            handleCVMode(userInput);
        } else {
            // Process the input and generate a response for other modes
            // You might want to add a default handling method here
        }
        document.getElementById('user-input').value = '';
    }
}

function handleChatMode(input) {
    if (!isInterviewStarted) {
        displayMessage(input, 'user-message');
        startInterview(input);
    } else if (window.waitingForQuestionCount) {
        handleQuestionCountInput(input);
    } else {
        submitAnswer(input);
    }
}
function handlePracticeMode(input) {
    console.log("Handling practice mode input:", input);
    
    if (!isInterviewStarted) {
        console.log("Starting interview with domain:", input);
        displayMessage(input, 'user-message');
        startInterview(input);
    } else if (!isPracticeStarted && input.toLowerCase() === 'yes') {
        console.log("Starting practice interview");
        displayMessage(input, 'user-message');
        isPracticeStarted = true;
        askForQuestionCount();
    } else if (window.waitingForQuestionCount) {
        handleQuestionCountInput(input);
    } else if (isPracticeStarted) {
        console.log("Submitting answer:", input);
        submitAnswer(input);
    } else {
        displayMessage(input, 'user-message');
        displayMessage("Please type 'yes' when you're ready to start the verbal interview.", 'ai-message');
    }
}

// START CV

let cvInterviewState = 'initial'; // Can be 'initial', 'ready', 'counting', 'interviewing', 'completed'

function handleCVMode(input) {
    displayMessage(input, 'user-message');
    
    switch(cvInterviewState) {
        case 'initial':
            if (input.toLowerCase() === 'yes') {
                cvInterviewState = 'counting';
                askForCVQuestionCount();
            } else {
                displayMessage("Okay. When you're ready to start the interview, just type 'yes'.", 'ai-message');
            }
            break;
        
        case 'counting':
            handleCVQuestionCountInput(input);
            break;
        
        case 'ready':
            if (input.toLowerCase() === 'yes') {
                cvInterviewState = 'interviewing';
                generateCVQuestions();
            } else {
                displayMessage("Okay. When you're ready to start the interview, just type 'yes'.", 'ai-message');
            }
            break;
        
        case 'interviewing':
            submitCVAnswer(input);
            break;
        
        case 'completed':
            displayMessage("The interview is already completed. Please choose another mode if you'd like to start a new interview.", 'ai-message');
            break;
    }
}

function askForCVQuestionCount() {
    displayMessage("How many questions would you like to answer in this interview? (Enter a number between 1 and 10)", 'ai-message');
    window.waitingForCVQuestionCount = true;
}

function handleCVQuestionCountInput(input) {
    const count = parseInt(input);
    if (isNaN(count) || count < 1 || count > 10) {
        displayMessage("Please enter a valid number between 1 and 10.", 'ai-message');
    } else {
        cvQuestionCount = count;
        cvInterviewState = 'ready';
        displayMessage(`Great! You've chosen to answer ${count} questions. Type 'yes' when you're ready to begin the interview.`, 'ai-message');
    }
}

function startCVInterview() {
    if (cvQuestions.length === 0) {
        generateCVQuestions();
    } else {
        askNextCVQuestion();
    }
}

function handleCVUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const formData = new FormData();
        formData.append('file', file);

        fetch('/upload_cv', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                displayMessage(data.error, 'ai-message');
            } else {
                displayMessage(data.message, 'ai-message');
                cvSummary = data.analysis.summary;
                cvInterviewState = 'initial';
                displayMessage("Would you like to start the interview? (Yes/No)", 'ai-message');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            displayMessage("An error occurred while uploading the CV. Please try again.", 'ai-message');
        });
    }
}

function generateCVQuestions() {
    fetch('/generate_cv_questions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ num_questions: cvQuestionCount }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            displayMessage(data.error, 'ai-message');
            cvInterviewState = 'initial';
        } else {
            cvQuestions = data.questions;
            displayMessage("Great! Let's begin the interview.", 'ai-message');
            currentQuestionIndex = 0;
            askNextCVQuestion();
        }
    })
    .catch(error => {
        console.error('Error:', error);
        displayMessage("An error occurred while generating questions. Please try again.", 'ai-message');
        cvInterviewState = 'initial';
    });
}

function askNextCVQuestion() {
    if (currentQuestionIndex < cvQuestionCount && currentQuestionIndex < cvQuestions.length) {
        const question = cvQuestions[currentQuestionIndex];
        displayMessage(question, 'ai-message');
    } else {
        endCVInterview();
    }
}

function submitCVAnswer(answer) {
    cvAnswers.push(answer);
    currentQuestionIndex++;
    if (currentQuestionIndex < cvQuestionCount && currentQuestionIndex < cvQuestions.length) {
        askNextCVQuestion();
    } else {
        endCVInterview();
    }
}

function endCVInterview() {
    cvInterviewState = 'completed';
    // displayMessage("Thank you for completing the CV-based interview. Here's a summary of your CV:", 'ai-message');
    // displayMessage(cvSummary, 'ai-message');
    displayMessage("Generating feedback...", 'ai-message');
    generateCVFeedback();
}

function generateCVFeedback() {
    fetch('/generate_cv_feedback', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            questions: cvQuestions,
            answers: cvAnswers
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            displayMessage(data.error, 'ai-message');
        } else {
            displayMessage(data.feedback, 'ai-message');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        displayMessage("An error occurred while generating feedback. Please try again.", 'ai-message');
    });
}

// END OF CV

function startInterview(domain) {
    userAnswers = []; // Reset answers at the start of a new interview
    fetch('/start_interview', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domain: domain }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            displayMessage(data.error, 'ai-message');
        } else {
            currentQuestions = data.questions;
            isInterviewStarted = true;
            if (currentMode === 'chat') {
                displayMessage(`Great! Let's start the interview for ${domain}.`, 'ai-message');
                askForQuestionCount();
            } else if (currentMode === 'practice') {
                displayMessage(`Domain submitted: ${domain}. Type 'yes' when you're ready to begin the verbal interview.`, 'ai-message');
            }
        }
    })
    .catch(error => {
        console.error('Error:', error);
        displayMessage("An error occurred while starting the interview. Please try again.", 'ai-message');
    });
}

function startPracticeInterview() {
    console.log("Inside startPracticeInterview");
    isPracticeStarted = true;
    currentQuestionIndex = 0;
    askNextQuestion();
}

function askForQuestionCount() {
    displayMessage("How many questions would you like to answer in this interview? (Enter a number between 1 and 10)", 'ai-message');
    window.waitingForQuestionCount = true;
}

function handleQuestionCountInput(input) {
    displayMessage(input, 'user-message');
    const count = parseInt(input);
    if (isNaN(count) || count < 1 || count > 10) {
        displayMessage("Please enter a valid number between 1 and 10.", 'ai-message');
    } else {
        userPreferredQuestionCount = count;
        window.waitingForQuestionCount = false;
        displayMessage(`You've chosen to answer ${count} questions. Let's begin!`, 'ai-message');
        currentQuestionIndex = 0;
        askNextQuestion();
    }
}



function askNextQuestion() {
    console.log("Asking next question, index:", currentQuestionIndex);
    if (currentQuestionIndex < userPreferredQuestionCount && currentQuestionIndex < currentQuestions.length) {
        const question = currentQuestions[currentQuestionIndex];
        displayMessage(question, 'ai-message');
        if (currentMode === 'practice') {
            const utterance = new SpeechSynthesisUtterance(question);
            utterance.onend = function() {
                setTimeout(startSpeechRecognition, 500);
            };
            window.speechSynthesis.speak(utterance);
        }
    } else {
        endInterview();
    }
}

function endInterview() {
    let completionMessage = currentMode === 'practice'
        ? "Thank you for completing the practice interview."
        : "Thank you for completing the interview.";
    
    if (currentMode === 'practice') {
        speakText(completionMessage);
    }
    
    displayMessage(completionMessage, 'ai-message');
    
    // Add a slight delay before showing the "Generating feedback" message
    setTimeout(() => {
        displayMessage("Generating feedback...", 'ai-message');
        generateFinalFeedback();
    }, 2000);
}

function speakText(text) {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
}

function setupSpeechRecognition() {
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        
        recognition.onresult = function(event) {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    document.getElementById('user-input').value += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            document.getElementById('user-input').placeholder = interimTranscript;
        };

        recognition.onstart = function() {
            document.getElementById('listening-animation').style.display = 'inline-block';
        };

        recognition.onend = function() {
            document.getElementById('listening-animation').style.display = 'none';
        };
    } else {
        console.log('Speech recognition not supported');
    }
}

function startSpeechRecognition() {
    if (recognition) {
        recognition.start();
        document.getElementById('start-speaking').style.display = 'none';
        document.getElementById('stop-speaking').style.display = 'inline-block';
    }
}

function stopSpeechRecognition() {
    if (recognition) {
        recognition.stop();
        document.getElementById('start-speaking').style.display = 'inline-block';
        document.getElementById('stop-speaking').style.display = 'none';
        handleUserInput();  // Automatically submit the answer
    }
}

let userAnswers = [];

function submitAnswer(answer) {
    console.log("Submitting answer:", answer);
    displayMessage(answer, 'user-message');
    
    userAnswers.push(answer);
    currentQuestionIndex++;
    
    if (currentQuestionIndex >= userPreferredQuestionCount || currentQuestionIndex >= currentQuestions.length) {
        isInterviewStarted = false;
        isPracticeStarted = false;
        setTimeout(endInterview, 1500);
    } else {
        if (currentMode === 'practice') {
            setTimeout(askNextQuestion, 1000);
        } else if (currentMode === 'chat') {
            askNextQuestion();
        }
    }
}

function generateFinalFeedback() {
    const answeredQuestions = currentQuestions.slice(0, userPreferredQuestionCount);
    
    console.log("Current mode:", currentMode);
    console.log("Questions:", answeredQuestions);
    console.log("Answers:", userAnswers);

    fetch('/generate_feedback', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            mode: currentMode,
            questions: answeredQuestions,
            answers: userAnswers
        }),
    })
    .then(response => {
        console.log("Response status:", response.status);
        return response.json();
    })
    .then(data => {
        console.log("Response data:", data);
        if (data.error) {
            displayMessage("An error occurred while generating feedback. Please try again.", 'ai-message');
        } else {
            displayMessage(data.feedback, 'ai-message');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        displayMessage("An error occurred while generating feedback. Please try again.", 'ai-message');
    });

    // Reset the answers array for the next interview
    userAnswers = [];
}

function displayMessage(message, className) {
    const chatWindow = document.getElementById('chat-window');
    const messageElement = document.createElement('div');
    messageElement.className = 'message ' + className;
    messageElement.innerText = message;
    chatWindow.appendChild(messageElement);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}