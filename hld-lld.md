**High-Level Design (HLD) & Low-Level Design (LLD) for the Assignment**

---

# **High-Level Design (HLD)**

## **1. Overview**
The application is a FastAPI-based backend that enables users to upload PDF files, extract text from them, create embeddings, store them in a FAISS vector store, and answer user queries based on the document content using an AI-powered question-answering system.

## **2. System Components**
### **2.1 API Layer (FastAPI)**
- Exposes RESTful endpoints for PDF upload, document retrieval, and question-answering.
- Implements middleware for CORS handling.
- Handles user requests and interacts with the database and vector store.

### **2.2 Database Layer (PostgreSQL)**
- Stores metadata of uploaded documents, including filenames, file paths, and upload timestamps.
- Uses SQLAlchemy ORM for database interaction.

### **2.3 File Storage**
- Uploaded PDF files are stored in a designated folder (`uploads/`).
- FAISS vector store files are stored in `faiss_index/`.

### **2.4 Text Processing & Embedding**
- Uses PyMuPDF (fitz) to extract text from PDFs.
- Splits extracted text into manageable chunks using `RecursiveCharacterTextSplitter`.
- Generates embeddings via `GoogleGenerativeAIEmbeddings` and stores them in FAISS.

### **2.5 Question-Answering System**
- Retrieves relevant document chunks from FAISS vector store.
- Uses `ChatGoogleGenerativeAI` model to generate answers based on retrieved text.
- Employs a prompt template to structure the AI responses.

## **3. Workflow**
1. User uploads a PDF via `/upload` endpoint.
2. Server extracts text, splits it into chunks, generates embeddings, and stores them in FAISS.
3. User submits a question related to an uploaded document via `/ask`.
4. Server retrieves relevant text chunks and returns an AI-generated answer.

---

# **Low-Level Design (LLD)**

## **1. API Endpoints**
### **1.1 File Upload (`/upload`)**
**Request:**
- `POST /upload`
- Payload: PDF file (multipart form-data)

**Processing:**
- Checks if the file already exists in the database.
- Saves the file to `uploads/`.
- Extracts text using PyMuPDF.
- Splits text into chunks and generates embeddings.
- Saves embeddings in FAISS vector store.
- Stores metadata in the database.

**Response:**
- Success: `200 OK` with confirmation message.
- Failure: `400 Bad Request` or `500 Internal Server Error` with an error message.

### **1.2 Question Answering (`/ask`)**
**Request:**
- `POST /ask`
- Payload: JSON containing `filename` and `question`.

**Processing:**
- Retrieves the requested document from the database.
- Loads embeddings from FAISS vector store.
- Retrieves the most relevant text chunks.
- Uses AI model to generate an answer.

**Response:**
- Success: `200 OK` with generated answer.
- Failure: `400 Bad Request` or `500 Internal Server Error` with an error message.

### **1.3 List Documents (`/documents`)**
**Request:**
- `GET /documents`

**Processing:**
- Fetches all stored document metadata from the database.

**Response:**
- Success: `200 OK` with a list of documents.

### **1.4 Health Check (`/health`)**
**Request:**
- `GET /health`

**Processing:**
- Returns the API's health status.

**Response:**
- Success: `200 OK` with health status message.

---

## **2. Database Schema**
**Table: `documents`**
| Column      | Type      | Constraints        |
|------------|----------|--------------------|
| id         | Integer  | Primary Key, Auto Increment |
| filename   | String   | Unique, Not Null  |
| file_path  | String   | Not Null          |
| upload_date | DateTime | Default to Current Timestamp |

---

## **3. Error Handling**
- **File Upload Errors:** Handles file format validation and duplicate uploads.
- **Database Errors:** Rolls back transactions in case of failures.
- **FAISS Errors:** Ensures the FAISS index exists before retrieval.
- **AI Model Errors:** Returns a meaningful response if the AI fails to generate an answer.

---

## **4. Security Considerations**
- **Environment Variables:** Sensitive credentials (API keys, database URLs) are stored in `.env`.
- **CORS Policy:** Restricts API access to trusted domains.
- **Sanitization:** Ensures only PDFs are uploaded and prevents SQL injection by using ORM.

---

## **5. Future Enhancements**
- Implement authentication for file uploads and question-answering.
- Enhance logging and monitoring.
- Support multiple file formats (e.g., DOCX, TXT).
- Deploy using containerization (Docker, Kubernetes).

This document provides a detailed HLD and LLD for the assignment, outlining the architecture, components, workflows, API details, and future improvements.

