AI-Powered English Placement Test
This is a web-based application designed to assess a user's English proficiency through automated, AI-powered analysis of their writing and speaking skills. It serves as a modern placement tool for English language training institutes.

Live Demo: https://funny-belekoy-63f75e.netlify.app/

Features
AI Writing Analysis: Users submit a short written response to a prompt. The application sends this text to the Google Gemini API for an instant evaluation of grammar, coherence, and vocabulary, returning a score and detailed suggestions for improvement.
AI Speaking Analysis: Users record their voice in the browser responding to a spoken prompt. The app uses the Web Speech API to convert the speech to text, which is then sent to the Gemini API for an analysis of clarity, fluency, and correctness.
Secure Backend: The application uses a Netlify serverless function to securely manage the Google AI API key, ensuring it is never exposed on the frontend.
Responsive Design: The interface is clean, user-friendly, and works well on both desktop and mobile devices.
Technologies Used
Frontend:

HTML5
CSS3 (for styling)
JavaScript (ES6+)
Web Speech API (for voice recognition)
Backend & Deployment:

Netlify: For hosting the static site and deploying the serverless function.
Serverless Functions (Node.js): To securely handle API requests to the Google AI service.
Google Gemini API: The core AI engine used for text and speech analysis.
Git & GitHub: For version control and continuous deployment.
Setup and Installation
To run this project locally on your own machine, follow these steps:

Clone the repository:

Bash

git clone [your-repository-url]
Get a Google AI API Key:

Visit Google AI Studio to generate a free API key.
Install the Netlify CLI:

To test the serverless function locally, you need to install the Netlify Command Line Interface.
<!-- end list -->

Bash

npm install netlify-cli -g
Create an Environment Variable File:

In the root of the project, create a file named .env.
Add your API key to this file:
<!-- end list -->

GOOGLE_API_KEY=Your_Secret_API_Key_Here
Run the development server:

Use the Netlify CLI to start the local server, which will also run your serverless function.
<!-- end list -->

Bash

netlify dev
This will start a local server, usually at http://localhost:8888.

Project Structure
/
├── index.html              # The main application page
├── styles.css              # All CSS styles
├── script.js               # Frontend JavaScript logic
├── netlify.toml            # Netlify configuration file
└── netlify/
    └── functions/
        └── analyse.js      # The secure serverless function (backend)
