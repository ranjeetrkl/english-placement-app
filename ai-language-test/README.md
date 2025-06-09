# 🧠 AI-Powered English Placement Test

This is a web-based application designed to assess a user's English proficiency through automated, AI-powered analysis of their writing and speaking skills. It serves as a modern placement tool for English language training institutes.

🎯 **Live Demo:** [Try it Here](https://funny-belekoy-63f75e.netlify.app/)

---

## 🚀 Features

### ✍️ AI Writing Analysis
- Users submit a short written response to a prompt.
- The application sends the text to the **Google Gemini API** for an instant evaluation of grammar, coherence, and vocabulary.
- Returns a score along with detailed suggestions for improvement.

### 🎤 AI Speaking Analysis
- Users respond to a spoken prompt using their voice in the browser.
- The **Web Speech API** converts speech to text.
- This text is then analyzed by the Gemini API for clarity, fluency, and correctness.

### 🔐 Secure Backend
- Uses a **Netlify serverless function** to securely manage the Google AI API key.
- Ensures the API key is never exposed on the frontend.

### 📱 Responsive Design
- Clean, user-friendly interface that works seamlessly on both desktop and mobile devices.

---

## 🛠️ Technologies Used

### Frontend
- HTML5  
- CSS3 (for styling)  
- JavaScript (ES6+)  
- Web Speech API  

### Backend & Deployment
- Netlify Functions (Node.js)  
- Google Gemini API  
- Git & GitHub (version control and CI/CD)  
- Netlify (hosting & deployment)

---

## 🧑‍💻 Setup and Installation

To run this project locally on your machine, follow the steps below:

### 1. Clone the Repository
```bash
git clone [your-repository-url]
cd [your-repository-folder]
