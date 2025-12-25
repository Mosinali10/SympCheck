# 🏥 SympCheck AI Health Ecosystem

SympCheck is a high-fidelity health intelligence platform powered by Google Gemini. It features an interactive anatomic synthesizer, an AI-driven clinical triage chat, a personalized health planner, and a real-time clinical news feed.

## ✨ Features
- **Anatomic Synthesizer**: Interactive 3D-style medical visualization of skeletal, muscular, and nervous systems.
- **AI Triage Concierge**: Natural language symptom assessment with clinical risk stratification.
- **Medical Health Planner**: Button-driven interface for generating personalized 7-day diet and workout matrices.
- **Clinical Intelligence Feed**: Real-time health news filtered for medical breakthroughs and clinical trial breakthroughs.

## 🚀 Quick Start (Local)

1. **Clone the repository**
2. **Install Backend Dependencies**
   ```bash
   cd Project/backend
   npm install
   ```
3. **Configure Environment**
   Create a `.env` file in `Project/backend/`:
   ```env
   GEMINI_API_KEY=your_api_key_here
   PORT=3001
   ```
4. **Launch Ecosystem**
   ```bash
   npm start
   ```
   Access the app at `http://localhost:3001`.

## 🌐 Deployment (Render / Railway)

1. **GitHub**: Push this `Project` folder to a new GitHub repository.
2. **Platform**: Link your GitHub repo to Render.com or Railway.app.
3. **Settings**:
   - **Root Directory**: `Project/backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Environment Variables**: Add `GEMINI_API_KEY` in the host's dashboard.

## ⚖️ Clinical Disclaimer
This software is for educational and informational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.
