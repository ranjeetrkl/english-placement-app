// This code runs on Netlify's server, not in the user's browser.
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
      body: JSON.stringify(requestBody) // Pass along the payload from the frontend
    });

    const data = await response.json();

    // **FIX STARTS HERE: Check for a valid response before sending it back**
    if (data.candidates && data.candidates.length > 0) {
        // If the response is valid, send it back to the frontend app
        return {
          statusCode: 200,
          body: JSON.stringify(data)
        };
    } else {
        // If the AI response was empty or blocked, create our own error message.
        // This ensures the frontend always receives valid JSON.
        console.error("AI response was empty or blocked:", data);
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "The AI could not process this request, possibly due to safety filters or an invalid prompt." })
        };
    }
    // **FIX ENDS HERE**

  } catch (error) {
    console.error("Serverless function error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
