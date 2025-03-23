from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
import shutil
import os
import fitz  # PyMuPDF for PDF text extraction
# Update this import
# from langchain_openai import OpenAIEmbeddings  # New import path
from langchain_google_genai import GoogleGenerativeAIEmbeddings,ChatGoogleGenerativeAI
from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter  # Added import
from langchain_community.llms import OpenAI
from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import List
from langchain.chains.question_answering import load_qa_chain
from langchain_core.prompts import PromptTemplate
import logging
import datetime
import getpass
import os
import faiss
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from fastapi import Body
import traceback
load_dotenv()


# print(f"google api key = {os.environ.get("GOOGLE_API_KEY")}")
if "GOOGLE_API_KEY" not in os.environ:
    os.environ["GOOGLE_API_KEY"] = getpass.getpass("Provide your Google API key here")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

db_url = os.environ.get("DB_URL")
# PostgreSQL Database URL
# DATABASE_URL = "postgresql://postgres:12345@localhost:5432/aiplanet"

# Create Engine
engine = create_engine(db_url)

# Create Session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base Class
Base = declarative_base()

# Document Model
class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, unique=True, nullable=False)
    file_path = Column(String, nullable=False)
    upload_date = Column(DateTime,nullable=False,default=datetime.datetime.utcnow)

# Initialize FastAPI
app = FastAPI(debug=True)

origins = ["http://localhost","http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Create table if it doesn't exist
Base.metadata.create_all(engine)

# Create necessary directories
UPLOAD_DIR = "uploads"
FAISS_DIR = "faiss_index"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(FAISS_DIR, exist_ok=True)  # Added this line

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract text from PDF using PyMuPDF."""
    text = ""
    doc = fitz.open(pdf_path)
    for page in doc:
        text += page.get_text("text") + "\n"
    return text

def create_vector_store(text: str):
    """Create FAISS vector store from extracted text."""
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=100,
        length_function=len,
    )
    texts = text_splitter.split_text(text)
    if not texts:
       return JSONResponse(status_code=400, detail="No valid text chunks for embedding.")
    # print("Extracted Chunks:", texts)  # Debugging
    embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004")
    # print("Generated Embeddings:", embeddings)  # Debugging
    vector_store = FAISS.from_texts(texts, embeddings)
    return vector_store

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload a PDF and extract text."""
    try:
        document = db.query(Document).filter(Document.filename == file.filename).first()
        if document :
             return JSONResponse(
                status_code=400,
                content={"detail": "File with this name already exists in the database"}
            )            
        logger.info(f"Received file: {file.filename}")
        # Validate file type
        if not file.filename.lower().endswith('.pdf'):
           return JSONResponse(status_code=400, content={"detail":"Only PDF files are allowed."})
        
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        extracted_text = extract_text_from_pdf(file_path)
        if not extracted_text.strip():
         return JSONResponse(status_code=400, content={"detail":"No text extracted from the PDF."})
        vector_store = create_vector_store(extracted_text)
        vector_store.save_local(f"{FAISS_DIR}/{file.filename}")
            
        document = Document(filename=file.filename, file_path=file_path)
        db.add(document)
        db.commit()
        return JSONResponse(content={"message": "File uploaded and processed successfully."})
    except Exception as e:
        traceback_str = traceback.format_exc()
        print(f"Error processing file: {traceback_str}")
        # Clean up if processing fails
        if os.path.exists(file_path):
            os.remove(file_path)
        db.rollback()
        return JSONResponse(status_code=500, content={"detail":f"Error processing file: {str(e)}"})

@app.post("/ask")
# async def ask_question(filename: str, question: str, db: Session = Depends(get_db)):
async def ask_question(filename:str = Body(...), question: str = Body(...), db: Session = Depends(get_db)):
    """Answer a question based on the uploaded PDF content."""
    if not filename:
        return JSONResponse(status_code=400, content={"detail":"please upload file"})
    if not question:
        return JSONResponse(status_code=400, content={"detail":"Please ask me question!"})
    
    logger.info(f"Received file: ")
    document = db.query(Document).filter(Document.filename == filename).first()
    if not document:
       return JSONResponse(status_code=404, content={"detail":"Document not found."})
    
    vector_store_path = f"{FAISS_DIR}/{filename}"
    if not os.path.exists(vector_store_path):
        return JSONResponse(status_code=404, content={"detail":"Document embeddings not found."})
    
    try:
        embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004")
        vector_store = FAISS.load_local(vector_store_path, embeddings,allow_dangerous_deserialization=True)
        
        # Create a retriever
        retriever = vector_store.as_retriever(search_kwargs={"k": 4})
        
        # Create a QA chain
        template = """Use the following pieces of context to answer the question at the end.
        If you don't know the answer, just say that you don't know, don't try to make up an answer.
        
        {context}
        
        Question: {question}
        Answer:"""
        
        PROMPT = PromptTemplate(template=template, input_variables=["context", "question"])
        
        chain = load_qa_chain(ChatGoogleGenerativeAI(model="gemini-1.5-pro"), chain_type="stuff", prompt=PROMPT)
        
        # Get relevant documents
        docs = retriever.get_relevant_documents(question)
        
        # Run the chain
        response = chain({"input_documents": docs, "question": question}, return_only_outputs=True)
        
        return JSONResponse(content={"answer": response["output_text"]})
    except Exception as e:
        return JSONResponse(status_code=500, content={"detail":f"Error processing question: {str(e)}"})

# Add health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint to verify API is working."""
    return {"status": "healthy", "message": "API is running correctly"}

# Add list documents endpoint
@app.get("/documents")
async def list_documents(db: Session = Depends(get_db)):
    """List all uploaded documents."""
    documents = db.query(Document).all()
    return [{"id": doc.id, "filename": doc.filename} for doc in documents]