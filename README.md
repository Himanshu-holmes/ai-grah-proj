frontend setup
cd frontend
npm i
 backend setup
 cd backend 

# FastAPI PDF Processing and QA System

## Overview
This FastAPI application allows users to:
- Upload PDF files
- Extract text from PDFs using PyMuPDF
- Store the extracted text as vector embeddings in FAISS
- Query the uploaded documents using Google's Gemini AI for question-answering

## Features
- FastAPI-based API
- PostgreSQL for document metadata storage
- FAISS for vector storage and retrieval
- Google Generative AI (Gemini) for question answering
- CORS support for frontend integration

---

## Setup Instructions

### 1. Clone the Repository
```sh
git clone <your-repo-url>
cd <your-repo-folder>
cd backend/
```

### 2. Create a Virtual Environment
```sh
python -m venv venv
source venv/bin/activate  # On Mac/Linux
venv\Scripts\activate  # On Windows
```

### 3. Install Dependencies
```sh
pip install -r requirements.txt
```

### 4. Set Up Environment Variables
Create a `.env` file and add the following:
```env
GOOGLE_API_KEY=your_google_api_key
<!-- well you can pass your local db url directly -->
DATABASE_URL=postgresql://postgres:12345@localhost:5432/aiplanet
```
Alternatively, you will be prompted to enter the Google API Key when running the app.



### 5. Run the FastAPI Server
```sh
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
### 6. Go To client Directory In New Terminal
```sh
 npm i
 npm run dev
```

---

## API Documentation
For a full list of API endpoints and details, visit:
```
http://localhost:8000/docs
```

---

## Dependencies
- **FastAPI**: Web framework
- **FAISS**: Vector database for efficient search
- **PyMuPDF (fitz)**: PDF text extraction
- **SQLAlchemy**: ORM for PostgreSQL
- **Google Generative AI**: Embeddings & QA model
- **Python-dotenv**: Environment variable management

---

## Notes
- Ensure PostgreSQL is running before starting the API.
- If FAISS indexing fails, check that `GOOGLE_API_KEY` is set correctly.
- Debug logs are enabled to help troubleshoot errors.

---

## License
This project is open-source. Modify and use it as needed!

