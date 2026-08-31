# RGU Drive Master 🎓

A comprehensive placement and recruitment drive management system built for Rathinam Global University (RGU). The application streamlines the placement workflow, manages student profiles, handles recruiter pipelines, and leverages AI for automated Resume-to-Job-Description ATS scoring.

## 🌟 Key Features

* **Role-Based Access Control (RBAC):** Tailored dashboards and permissions for Admins, Placement Leads, and Managers.
* **Student Directory & Master Database:** 
  * Add students manually or via bulk Excel/CSV uploads.
  * Store and preview essential documents directly in the browser (Resumes, Portfolios, GitHub, LinkedIn, Intro Videos).
* **AI-Powered ATS Analysis:**
  * Uses advanced NLP (SentenceTransformers) to automatically match student resumes against uploaded Company Job Descriptions (JDs).
  * Provides actionable "Match Status" (Excellent, Strong, Average) and precise ATS percentage scores.
* **Recruiter Pipeline Management:** Track company statuses (Interested, Ongoing, Completed, Passed) and manage respective CTC details.
* **Dynamic Dashboard:** Real-time metrics tracking placements, average CTCs, and student registrations.

## 🛠 Tech Stack

### Frontend
* **Framework:** React 19 + TypeScript + Vite
* **Styling:** Tailwind CSS v4
* **UI Components:** Radix UI Primitives, Lucide React (Icons)
* **Routing:** React Router v7
* **Data Visualization:** Recharts
* **State Management/Fetching:** Axios + React Query

### Backend
* **Framework:** Python FastAPI
* **Database:** MongoDB (via Motor/PyMongo)
* **Machine Learning / AI:** 
  * `sentence-transformers` for Resume/JD semantic similarity and ATS scoring.
  * `google-genai` / `openai` integrations.
* **Data Processing:** `pandas`, `openpyxl`, `PyPDF2` for robust document and spreadsheet parsing.

## 🚀 Getting Started (Local Development)

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher)
* [Python](https://www.python.org/) (3.11 or higher)
* [MongoDB](https://www.mongodb.com/) (Local instance or MongoDB Atlas)

### 1. Clone the repository
```bash
git clone https://github.com/vimalkumar-GVK/Drive-Master.git
cd Drive-Master
```

### 2. Backend Setup
```bash
cd backend

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
python main.py
```
The backend will run at `http://localhost:8000`.

### 3. Frontend Setup
Open a new terminal window:
```bash
cd frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```
The frontend will run at `http://localhost:5173`.

## 🐳 Docker Deployment

The application includes a `docker-compose.yml` for seamless deployment of both the frontend and backend services.

```bash
# Build and start all containers in detached mode
docker-compose up -d --build
```

## 🔐 Environment Variables

You will need to configure `.env` files for both the frontend and backend containing secrets like MongoDB URI, API Keys, and JWT Secrets. (Please refer to `.env.example` if available or contact the administrator for required keys).

## 🤝 Contributing
1. Fork the project.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.
