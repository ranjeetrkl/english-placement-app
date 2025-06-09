// script.js
// This file contains all the frontend JavaScript logic for the app.

// --- Configuration for Netlify Hosting ---
const SECURE_API_ENDPOINT = '/.netlify/functions/analyse';

// --- Screen Navigation ---
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.add('hide'));
    document.getElementById(screenId).classList.remove('hide');
}

// --- Writing Analysis ---
async function analyzeWriting() {
    const writingInput = document.getElementById('writing-input').value;
    if (writingInput.trim().length < 10) {
        alert("Please write a bit more before analyzing.");
        return;
    }

    const loader = document.getElementById('writing-loader');
    const feedbackBox = document.getElementById('writing-feedback');
    loader.classList.remove('hide');
    feedbackBox.classList.add('hide');

    // A more strict prompt for the AI
    const prompt = `
        You are an API that ONLY returns valid JSON. Do not include any introductory text, markdown, or explanations.
        Your task is to act as an expert English teacher evaluating a student's writing.
        The student was asked to "describe your future goals".
        Evaluate the following text: "${writingInput}".
        Provide feedback in a JSON object. The JSON object must have these exact keys: "overallScore" (a number out of 10), "grammarMistakes" (an array of strings explaining errors), and "suggestions" (an array of strings with tips for improvement).
        Your response must be ONLY the raw JSON object.`;
    
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
        
        const result = await response.json();
        console.log("Full API Response from serverless function:", result);

        if (result.error) {
            throw new Error(result.error);
        }

        if (result.promptFeedback) {
            throw new Error(`Request was blocked by the API: ${result.promptFeedback.blockReason}`);
        }
        
        // **FIX STARTS HERE: Make parsing more robust**
        if (result.candidates && result.candidates[0]?.content?.parts?.[0]?.text) {
            const rawText = result.candidates[0].content.parts[0].text;
            const jsonStartIndex = rawText.indexOf('{');
            const jsonEndIndex = rawText.lastIndexOf('}');

            if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
                const jsonString = rawText.substring(jsonStartIndex, jsonEndIndex + 1);
                try {
                    const feedback = JSON.parse(jsonString);
                    displayFeedback('writing-feedback', feedback);
                } catch (parseError) {
                    console.error("Failed to parse extracted JSON:", parseError);
                    throw new Error("AI returned malformed JSON data.");
                }
            } else {
                console.error("Could not find JSON object in AI response:", rawText);
                throw new Error("AI did not return a recognizable JSON object.");
            }
        } else {
            console.error("Invalid response structure from API:", result);
            throw new Error("Received an invalid or empty response from the AI server.");
        }
        // **FIX ENDS HERE**

    } catch (error) {
        console.error("Error in analyzeWriting:", error);
        const feedbackContainer = document.getElementById('writing-feedback');
        feedbackContainer.innerHTML = `<p style='color:red;'>Sorry, something went wrong. Please try again later. (${error.message})</p>`;
        feedbackContainer.classList.remove('hide');
    } finally {
        loader.classList.add('hide');
    }
}

// --- Speaking Analysis ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
let isRecording = false;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        document.getElementById('recording-status').textContent = `Processing: "${transcript}"`;
        await analyzeSpokenText(transcript);
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        document.getElementById('recording-status').textContent = "Error during recording. Please try again.";
        stopRecording();
    };

} else {
    document.getElementById('record-btn').disabled = true;
    document.getElementById('recording-status').textContent = "Sorry, your browser doesn't support speech recognition.";
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
    document.getElementById('record-btn').textContent = 'Stop Recording';
    document.getElementById('record-btn').classList.add('button-secondary');
    document.getElementById('recording-status').textContent = 'Listening...';
    document.getElementById('speaking-feedback').classList.add('hide');
    recognition.start();
}

function stopRecording() {
     if (!recognition) return;
    isRecording = false;
    document.getElementById('record-btn').textContent = 'Start Recording';
    document.getElementById('record-btn').classList.remove('button-secondary');
    document.getElementById('speaking-loader').classList.remove('hide');
    recognition.stop();
}

async function analyzeSpokenText(transcript) {
    const loader = document.getElementById('speaking-loader');
    const feedbackBox = document.getElementById('speaking-feedback');

    const prompt = `
        You are an API that ONLY returns valid JSON. Do not include any introductory text, markdown, or explanations.
        Your task is to act as an expert English teacher evaluating a student's spoken response. The student was asked "Why do you want to improve your English?".
        Evaluate the following transcript of their speech: "${transcript}".
        Focus on grammar, clarity, and vocabulary. Provide feedback in a JSON object with these keys: "clarityScore" (a number out of 10), "corrections" (an array of strings with corrections), and "positivePoints" (an array of strings highlighting what they did well).
        Your response must be ONLY the raw JSON object.`;
    
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
        const result = await response.json();
        console.log("Full Speaking API Response from serverless function:", result);

        if (result.error) {
            throw new Error(result.error);
        }
        
        if (result.promptFeedback) {
            throw new Error(`Request was blocked by the API: ${result.promptFeedback.blockReason}`);
        }
        
        // **FIX STARTS HERE: Make parsing more robust**
        if (result.candidates && result.candidates[0]?.content?.parts?.[0]?.text) {
            const rawText = result.candidates[0].content.parts[0].text;
            const jsonStartIndex = rawText.indexOf('{');
            const jsonEndIndex = rawText.lastIndexOf('}');

            if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
                const jsonString = rawText.substring(jsonStartIndex, jsonEndIndex + 1);
                try {
                    const feedback = JSON.parse(jsonString);
                    feedback.transcript = transcript; 
                    displayFeedback('speaking-feedback', feedback);
                } catch (parseError) {
                    console.error("Failed to parse extracted JSON:", parseError);
                    throw new Error("AI returned malformed JSON data.");
                }
            } else {
                console.error("Could not find JSON object in AI response:", rawText);
                throw new Error("AI did not return a recognizable JSON object.");
            }
        } else {
             console.error("Invalid response structure from API:", result);
             throw new Error("Received an invalid or empty response from the AI server.");
        }
        // **FIX ENDS HERE**

    } catch(error) {
        console.error("Error in analyzeSpokenText:", error);
        const feedbackContainer = document.getElementById('speaking-feedback');
        feedbackContainer.innerHTML = `<p style='color:red;'>Sorry, something went wrong. Please try again later. (${error.message})</p>`;
        feedbackContainer.classList.remove('hide');
    } finally {
        loader.classList.add('hide');
        document.getElementById('recording-status').textContent = "";
    }
}


// --- Display Feedback ---
function displayFeedback(elementId, feedback) {
    const container = document.getElementById(elementId);
    let html = '';

    if (elementId === 'writing-feedback') {
        html = `
            <h4>AI Writing Analysis</h4>
            <p>Overall Score: <span class="score">${feedback.overallScore}/10</span></p>
            <p><strong>Grammar Mistakes:</strong></p>
            <ul>${feedback.grammarMistakes.map(item => `<li>${item}</li>`).join('') || '<li>No significant mistakes found. Great job!</li>'}</ul>
            <p><strong>Suggestions for Improvement:</strong></p>
            <ul>${feedback.suggestions.map(item => `<li>${item}</li>`).join('') || '<li>Keep up the good work!</li>'}</ul>
        `;
    } else if (elementId === 'speaking-feedback') {
         html = `
            <h4>AI Speaking Analysis</h4>
            <p><em>Your response: "${feedback.transcript}"</em></p>
            <p>Clarity & Fluency Score: <span class="score">${feedback.clarityScore}/10</span></p>
            <p><strong>Suggested Corrections:</strong></p>
            <ul>${feedback.corrections.map(item => `<li>${item}</li>`).join('') || '<li>Sounded great, no major corrections needed!</li>'}</ul>
            <p><strong>What You Did Well:</strong></p>
            <ul>${feedback.positivePoints.map(item => `<li>${item}</li>`).join('') || '<li>Clear and well-spoken.</li>'}</ul>
        `;
    }

    container.innerHTML = html;
    container.classList.remove('hide');
}
