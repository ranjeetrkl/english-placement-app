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
    
    let rawText = data.candidates[0].content.parts[0].text;
    
    // **NEW, MORE ROBUST PARSING LOGIC**
    // Remove markdown code fences if they exist
    rawText = rawText.replace(/```json\n/g, '').replace(/```/g, '');
    
    // Find the first '{' or '[' and the last '}' or ']'
    const firstBrace = rawText.indexOf('{');
    const firstBracket = rawText.indexOf('[');
    
    let startIndex;
    if (firstBrace === -1) startIndex = firstBracket;
    else if (firstBracket === -1) startIndex = firstBrace;
    else startIndex = Math.min(firstBrace, firstBracket);

    const lastBrace = rawText.lastIndexOf('}');
    const lastBracket = rawText.lastIndexOf(']');

    let endIndex;
    if (lastBrace === -1) endIndex = lastBracket;
    else if (lastBracket === -1) endIndex = lastBrace;
    else endIndex = Math.max(lastBrace, lastBracket);
    
    if (startIndex === -1 || endIndex === -1) {
        throw new Error("AI did not return a recognizable JSON object or array.");
    }

    const jsonString = rawText.substring(startIndex, endIndex + 1);
    
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
