// analyse.js
// This code runs on Netlify's server. It now cleans the AI response itself.

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
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    // Check for API errors first
    if (!data.candidates || data.candidates.length === 0) {
      console.error("AI response was empty or blocked:", data);
      throw new Error("The AI could not process this request, possibly due to safety filters.");
    }

    const rawText = data.candidates[0].content.parts[0].text;
    
    // Find and parse the JSON within the raw text on the SERVER
    const jsonStartIndex = rawText.indexOf('{');
    const jsonEndIndex = rawText.lastIndexOf('}');
    if (jsonStartIndex === -1 || jsonEndIndex === -1) {
        throw new Error("AI did not return a recognizable JSON object.");
    }

    const jsonString = rawText.substring(jsonStartIndex, jsonEndIndex + 1);
    
    // Try to parse it to ensure it's valid before sending
    const feedbackObject = JSON.parse(jsonString);

    // If successful, send the CLEAN, PARSED JSON back to the frontend
    return {
      statusCode: 200,
      body: JSON.stringify(feedbackObject) // Sending the parsed object back as a string
    };
    
  } catch (error) {
    console.error("Serverless function error:", error);
    // Send a structured error message back to the frontend
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
