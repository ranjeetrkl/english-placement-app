// analyse.js
// This code runs on Netlify's server. Its job is to clean the AI response.

// Import Firebase Admin SDK (if you have it set up)
// This part is for saving data and can be ignored if not set up yet.
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

try {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    })
  });
} catch (error) {
  if (!/already exists/u.test(error.message)) {
    console.error('Firebase admin initialization error', error.stack);
  }
}


// Main handler function
exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const requestBody = JSON.parse(event.body);

  if (requestBody.type === 'analyze') {
    return handleAnalysis(requestBody);
  } else if (requestBody.type === 'saveResults') {
    return saveResultsToFirestore(requestBody.data);
  } else {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request type' }) };
  }
};


// Function to handle AI analysis requests
async function handleAnalysis(requestBody) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Google AI API key is not configured.' }) };
  }
  
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  
  const payload = {
      contents: [{ role: "user", parts: [{ text: requestBody.prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: requestBody.schema
      }
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      console.error("AI response was empty or blocked:", data);
      throw new Error("The AI could not process this request, possibly due to safety filters.");
    }

    let rawText = data.candidates[0].content.parts[0].text;
    
    // **NEW, MORE ROBUST PARSING LOGIC**
    // Remove markdown code fences if they exist
    rawText = rawText.replace(/```json\n/g, '').replace(/```/g, '');
    
    // Find the first '{' and the last '}'
    const jsonStartIndex = rawText.indexOf('{');
    const jsonEndIndex = rawText.lastIndexOf('}');
        
    if (jsonStartIndex === -1 || jsonEndIndex === -1) {
        throw new Error("AI did not return a recognizable JSON object.");
    }

    const jsonString = rawText.substring(jsonStartIndex, jsonEndIndex + 1);
    const cleanData = JSON.parse(jsonString);

    return { statusCode: 200, body: JSON.stringify(cleanData) };

  } catch (error) {
    console.error("AI Analysis function error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
}

// Function to save results to Firestore
async function saveResultsToFirestore(data) {
    const appId = process.env.CONTEXT === 'dev' ? 'default-app-id' : process.env.APP_ID;
    const db = getFirestore();
    
    const resultsCollectionPath = `/artifacts/${appId}/public/data/student_results`;
    
    try {
        const docRef = await db.collection(resultsCollectionPath).add(data);
        console.log("Document written with ID: ", docRef.id);
        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, id: docRef.id })
        };
    } catch (error) {
        console.error("Error adding document to Firestore: ", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to save results to database." })
        };
    }
}
