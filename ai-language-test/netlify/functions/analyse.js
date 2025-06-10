// analyse.js
// This code runs on Netlify's server. Its job is to clean the AI response.

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
      throw new Error("The AI could not process this request.");
    }
    
    // The AI's actual content is a JSON string inside another object. We must parse it.
    const rawText = data.candidates[0].content.parts[0].text;
    
    // Find and parse the JSON within the raw text on the SERVER
    const jsonStartIndex = rawText.indexOf('{');
    const jsonEndIndex = rawText.lastIndexOf('}');
    const arrayStartIndex = rawText.indexOf('[');
    const arrayEndIndex = rawText.lastIndexOf(']');
    
    let cleanData;

    // Check if the response is an object or an array and parse accordingly
    if (arrayStartIndex !== -1 && arrayEndIndex !== -1) {
        const jsonString = rawText.substring(arrayStartIndex, arrayEndIndex + 1);
        cleanData = JSON.parse(jsonString);
    } else if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
        const jsonString = rawText.substring(jsonStartIndex, jsonEndIndex + 1);
        cleanData = JSON.parse(jsonString);
    } else {
        throw new Error("AI did not return a recognizable JSON object or array.");
    }

    // If successful, send the CLEAN, PARSED DATA back to the frontend
    return {
      statusCode: 200,
      body: JSON.stringify(cleanData) // Sending the clean object/array back as a string
    };
    
  } catch (error) {
    console.error("Serverless function error:", error);
    // Send a structured error message back to the frontend
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
