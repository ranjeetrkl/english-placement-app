// analyse.js
// This code now handles both AI analysis AND saving results to Firestore.

// Import Firebase Admin SDK
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase App
// IMPORTANT: You will need to get these credentials from your Firebase project settings
// and add them as Environment Variables in Netlify.
try {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Fix for newline characters
    })
  });
} catch (error) {
  // This might happen if the app is already initialized, which is fine.
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
      throw new Error("The AI could not process this request.");
    }

    const rawText = data.candidates[0].content.parts[0].text;
    const cleanData = JSON.parse(rawText);

    return { statusCode: 200, body: JSON.stringify(cleanData) };

  } catch (error) {
    console.error("AI Analysis function error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
}

// Function to save results to Firestore
async function saveResultsToFirestore(data) {
    const appId = process.env.APP_ID || 'default-app-id'; // Use Netlify's APP_ID or a default
    const db = getFirestore();
    
    // The collection path for public data
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
