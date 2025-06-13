// analyse.js
// This simplified version focuses ONLY on AI analysis to ensure it works.

exports.handler = async function (event) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Get the Google AI API Key securely from Netlify's environment variables
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API key is not configured on the server.' }) };
  }

  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  
  try {
    const requestBody = JSON.parse(event.body);

    // Make the secure call to the Google AI API
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody) // Pass the payload from the frontend directly
    });

    const data = await response.json();

    // Check for API errors first
    if (!data.candidates || data.candidates.length === 0) {
      console.error("AI response was empty or blocked:", data);
      throw new Error("The AI could not process this request, possibly due to safety filters.");
    }
    
    // The AI's actual content is a JSON string inside another object. We must parse it.
    const rawText = data.candidates[0].content.parts[0].text;
    
    // More robustly find and parse the JSON
    const jsonStartIndex = rawText.indexOf('{');
    const jsonEndIndex = rawText.lastIndexOf('}');
    if (jsonStartIndex === -1 || jsonEndIndex === -1) {
        throw new Error("AI did not return a recognizable JSON object.");
    }

    const jsonString = rawText.substring(jsonStartIndex, jsonEndIndex + 1);
    const cleanData = JSON.parse(jsonString);

    // If successful, send the CLEAN, PARSED DATA back to the frontend
    return {
      statusCode: 200,
      body: JSON.stringify(cleanData) 
    };
    
  } catch (error) {
    console.error("Serverless function error:", error);
    // Send a structured error message back to the frontend
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
