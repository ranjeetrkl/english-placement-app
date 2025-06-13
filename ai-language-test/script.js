// script.js
// This file contains all the frontend JavaScript logic for the app.

// --- Configuration ---
const SECURE_API_ENDPOINT = '/.netlify/functions/analyse';
let mcqScore = 0;
let writingFeedback = null;
let speakingFeedback = null;
let dynamicMcqData = []; 
let studentDetails = {}; // To store student info

// --- Initial Setup ---
document.addEventListener('DOMContentLoaded', () => {
    const detailsForm = document.getElementById('details-form');
    if (detailsForm) {
        detailsForm.addEventListener('submit', handleDetailsSubmit);
    }
    
    if (typeof questionBank !== 'undefined' && Array.isArray(questionBank)) {
        dynamicMcqData = questionBank.sort(() => 0.5 - Math.random()).slice(0, 5);
        loadMCQs(dynamicMcqData);
    } else {
        console.error("Question bank not found or is not an array. Make sure questions.js is loaded correctly.");
    }
});

function handleDetailsSubmit(event) {
    event.preventDefault(); 
    studentDetails = {
        name: document.getElementById('student-name').value,
        mobile: document.getElementById('student-mobile').value,
        email: document.getElementById('student-email').value,
        address: document.getElementById('student-address').value,
        qualification: document.getElementById('student-qualification').value,
    };
    const resultsHeading = document.getElementById('results-heading');
    if (resultsHeading) {
        resultsHeading.textContent = `${studentDetails.name}'s Placement Test Results`;
    }
    showScreen('test-screen');
}

function loadMCQs(questions) {
    const mcqForm = document.getElementById('mcq-form');
    if(!mcqForm) return;

    let mcqHTML = "";
    questions.forEach((item, index) => {
        mcqHTML += `
            <div class="mcq-question" style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
                <p><strong>${index + 1}. ${item.question}</strong></p>
                <div class="options">
        `;
        item.options.forEach((option, optionIndex) => {
            mcqHTML += `
                <div style="margin-bottom: 5px;">
                    <input type="radio" name="question${index}" id="q${index}o${optionIndex}" value="${optionIndex}">
                    <label for="q${index}o${optionIndex}" style="margin-left: 8px;">${option}</label>
                </div>
            `;
        });
        mcqHTML += `</div></div>`;
    });
    mcqForm.innerHTML = mcqHTML;
}


// --- Screen Navigation ---
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.add('hide'));
    const screenToShow = document.getElementById(screenId);
    if(screenToShow) screenToShow.classList.remove('hide');
}

// --- Writing Analysis ---
async function analyzeWriting() {
    const writingInput = document.getElementById('writing-input');
    if (!writingInput || writingInput.value.trim().length < 10) {
        alert("Please write a bit more before analyzing.");
        return;
    }

    const loader = document.getElementById('writing-loader');
    const feedbackBox = document.getElementById('writing-feedback');
    if(loader) loader.classList.remove('hide');
    if(feedbackBox) feedbackBox.classList.add('hide');

    const prompt = `
        You are an API that ONLY returns valid JSON. Your task is to act as an expert English teacher evaluating a student's writing. Evaluate the following text: "${writingInput.value}".
        Provide feedback in a JSON object. The JSON object must have these exact keys: "overallScore" (a number out of 10), "grammarMistakes" (an array of strings explaining errors), and "suggestions" (an array of strings).
        The "overallScore" is mandatory. If the text is too short or simple to evaluate properly, assign a low score like 1 or 2, but always provide a score.
        Your response must be ONLY the raw JSON object.`;
    
    // **CORRECTED PAYLOAD**
    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            "overallScore": { "type": "NUMBER" },
            "grammarMistakes": { "type": "ARRAY", "items": { "type": "STRING" } },
            "suggestions": { "type": "ARRAY", "items": { "type": "STRING" } }
          },
        }
      }
    };

    try {
        const response = await fetch(SECURE_API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const feedback = await response.json();
        if (feedback.error) throw new Error(feedback.error);

        writingFeedback = feedback; 
        displayFeedback('writing-feedback', writingFeedback);

    } catch (error) {
        console.error("Error in analyzeWriting:", error);
        const feedbackContainer = document.getElementById('writing-feedback');
        if(feedbackContainer) feedbackContainer.innerHTML = `<p style='color:red;'>Sorry, something went wrong. Please try again later. (${error.message})</p>`;
        if(feedbackContainer) feedbackContainer.classList.remove('hide');
    } finally {
        if(loader) loader.classList.add('hide');
    }
}

// --- Speaking Analysis ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
let isRecording = false;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = true; 
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onresult = async (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript.trim();
        if (transcript) {
            stopRecording(); 
            const statusEl = document.getElementById('recording-status');
            if(statusEl) statusEl.textContent = `Processing: "${transcript}"`;
            await analyzeSpokenText(transcript);
        }
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        let errorMessage = "An unknown error occurred. Please try again.";
        switch (event.error) {
            case 'not-allowed':
                errorMessage = "Microphone permission was denied. Please allow microphone access in your browser settings and refresh the page.";
                break;
            case 'no-speech':
                errorMessage = "No speech was detected. Please make sure your microphone is working and try again.";
                break;
            case 'network':
                errorMessage = "A network error occurred. Please check your internet connection and try again.";
                break;
        }
        const statusEl = document.getElementById('recording-status');
        if(statusEl) statusEl.textContent = errorMessage;
        stopRecording(true); 
    };

    recognition.onend = () => {
        if (isRecording) {
            isRecording = false;
            const recordBtn = document.getElementById('record-btn');
            if(recordBtn) {
                recordBtn.textContent = 'Start Recording';
                recordBtn.classList.remove('button-secondary');
            }
        }
    };

} else {
    const recordBtn = document.getElementById('record-btn');
    const statusEl = document.getElementById('recording-status');
    if(recordBtn) recordBtn.disabled = true;
    if(statusEl) statusEl.textContent = "Sorry, your browser doesn't support speech recognition.";
}

function toggleRecording() {
    if (!isRecording) {
        startRecording();
    } else {
        stopRecording();
    }
}

function startRecording() {
    if (!recognition) return;
    isRecording = true;
    const recordBtn = document.getElementById('record-btn');
    const statusEl = document.getElementById('recording-status');
    const feedbackBox = document.getElementById('speaking-feedback');

    if(recordBtn) {
        recordBtn.textContent = 'Stop Recording';
        recordBtn.classList.add('button-secondary');
    }
    if(statusEl) statusEl.textContent = 'Listening... Please allow microphone access if prompted.';
    if(feedbackBox) feedbackBox.classList.add('hide');
    
    try {
        recognition.start();
    } catch (e) {
        isRecording = false;
        if(statusEl) statusEl.textContent = "Could not start recording.";
    }
}

function stopRecording(isError = false) {
     if (!recognition) return;
    if (isRecording) {
        isRecording = false;
        recognition.stop();
    }
    const recordBtn = document.getElementById('record-btn');
    const loader = document.getElementById('speaking-loader');
    if(recordBtn){
        recordBtn.textContent = 'Start Recording';
        recordBtn.classList.remove('button-secondary');
    }
    if (!isError && loader) { 
        loader.classList.remove('hide');
    }
}

async function analyzeSpokenText(transcript) {
    const loader = document.getElementById('speaking-loader');
    const feedbackBox = document.getElementById('speaking-feedback');

    const prompt = `
        You are an API that ONLY returns valid JSON. Do not include any introductory text, markdown, or explanations.
        Your task is to act as an expert English teacher evaluating a student's spoken response. The student was asked "Why do you want to improve your English?".
        Evaluate the following transcript of their speech: "${transcript}".
        Provide feedback in a JSON object with these keys: "clarityScore" (a number out of 10), "corrections" (an array of strings), and "positivePoints" (an array of strings).
        The "clarityScore" is mandatory. If the text is too short or simple to evaluate properly, please assign a low score like 1 or 2, but always provide a score.
        Your response must be ONLY the raw JSON object.`;
    
    // **CORRECTED PAYLOAD**
    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            "clarityScore": { "type": "NUMBER" },
            "corrections": { "type": "ARRAY", "items": { "type": "STRING" } },
            "positivePoints": { "type": "ARRAY", "items": { "type": "STRING" } }
          }
        }
      }
    };
    
    try {
        const response = await fetch(SECURE_API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const feedback = await response.json();
        if (feedback.error) throw new Error(feedback.error);
        
        feedback.transcript = transcript; 
        speakingFeedback = feedback;
        displayFeedback('speaking-feedback', speakingFeedback);

    } catch(error) {
        console.error("Error in analyzeSpokenText:", error);
        const feedbackContainer = document.getElementById('speaking-feedback');
        if(feedbackContainer) {
            feedbackContainer.innerHTML = `<p style='color:red;'>Sorry, something went wrong. Please try again later. (${error.message})</p>`;
            feedbackContainer.classList.remove('hide');
        }
    } finally {
        if(loader) loader.classList.add('hide');
        const statusEl = document.getElementById('recording-status');
        if(statusEl) statusEl.textContent = "";
    }
}

// --- Display Inline Feedback ---
function displayFeedback(elementId, feedback) {
    const container = document.getElementById(elementId);
    if(!container) return;
    
    let html = '';

    if (elementId === 'writing-feedback') {
        const score = feedback.overallScore !== undefined ? `${feedback.overallScore}/10` : 'Not available';
        html = `
            <h4>AI Writing Analysis</h4>
            <p>Overall Score: <span class="score">${score}</span></p>
            <p><strong>Grammar Mistakes:</strong></p>
            <ul>${feedback.grammarMistakes?.map(item => `<li>${item}</li>`).join('') || '<li>No significant mistakes found. Great job!</li>'}</ul>
            <p><strong>Suggestions for Improvement:</strong></p>
            <ul>${feedback.suggestions?.map(item => `<li>${item}</li>`).join('') || '<li>Keep up the good work!</li>'}</ul>
        `;
    } else if (elementId === 'speaking-feedback') {
         const score = feedback.clarityScore !== undefined ? `${feedback.clarityScore}/10` : 'Not available';
         html = `
            <h4>AI Speaking Analysis</h4>
            <p><em>Your response: "${feedback.transcript}"</em></p>
            <p>Clarity & Fluency Score: <span class="score">${score}</span></p>
            <p><strong>Suggested Corrections:</strong></p>
            <ul>${feedback.corrections?.map(item => `<li>${item}</li>`).join('') || '<li>Sounded great!</li>'}</ul>
            <p><strong>What You Did Well:</strong></p>
            <ul>${feedback.positivePoints?.map(item => `<li>${item}</li>`).join('') || '<li>Clear and well-spoken.</li>'}</ul>
        `;
    }

    container.innerHTML = html;
    container.classList.remove('hide');
}

// --- Final Results Logic ---
function calculateMCQScore() {
    let score = 0;
    dynamicMcqData.forEach((item, index) => {
        const selectedOption = document.querySelector(`input[name="question${index}"]:checked`);
        if (selectedOption && parseInt(selectedOption.value) === item.correct) {
            score++;
        }
    });
    mcqScore = score;
}

// Temporarily disabled saving to isolate the analysis bug
function showFinalResults() {
    calculateMCQScore();
    
    const resultsContainer = document.getElementById('final-results-container');
    if(!resultsContainer) return;

    let resultsHTML = `
        <h4>Summary of Your Assessment</h4>
        <p><strong>Grammar & Vocabulary Score:</strong> <span class="score">${mcqScore} / ${dynamicMcqData.length}</span></p>
    `;

    if (writingFeedback) {
        const score = writingFeedback.overallScore !== undefined ? `${writingFeedback.overallScore}/10` : 'Not available';
        resultsHTML += `<p><strong>AI Writing Score:</strong> <span class="score">${score}</span></p>`;
    } else {
        resultsHTML += `<p><strong>AI Writing Score:</strong> Not attempted.</p>`;
    }

    if (speakingFeedback) {
        const score = speakingFeedback.clarityScore !== undefined ? `${speakingFeedback.clarityScore}/10` : 'Not attempted';
        resultsHTML += `<p><strong>AI Speaking Score:</strong> <span class="score">${score}</span></p>`;
    } else {
        resultsHTML += `<p><strong>AI Speaking Score:</strong> Not attempted.</p>`;
    }
    
    resultsHTML += `<hr><p>Based on these results, a teacher will contact you to confirm your placement. Thank you!</p>`;

    resultsContainer.innerHTML = resultsHTML;
    showScreen('results-screen');
}
