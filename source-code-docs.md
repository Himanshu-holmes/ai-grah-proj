# FastAPI PDF Question-Answering System Documentation

## Overview

This application is a FastAPI-based web service that allows users to upload PDF documents, process them for text extraction, create embeddings for semantic search, and ask questions about the documents' content. The system leverages Google's Generative AI models for creating embeddings and answering questions based on the document's content.

## Architecture

### Key Components

1. **FastAPI Application**: The core web service framework.
2. **Database Integration**: PostgreSQL database for storing document metadata.
3. **PDF Processing**: Text extraction from PDF documents.
4. **Vector Store**: FAISS (Facebook AI Similarity Search) for efficient similarity search.
5. **LLM Integration**: Google Generative AI for embeddings and question answering.

### Detailed Flow

1. **Document Upload and Processing**:
   - User submits PDF through API endpoint
   - System validates file format and checks for duplicates
   - PDF is saved to filesystem (`uploads/` directory)
   - Text is extracted page by page from the PDF using PyMuPDF
   - Text is split into manageable chunks using RecursiveCharacterTextSplitter
   - Each chunk is converted to embeddings using Google's text-embedding-004 model
   - Embeddings are stored in a FAISS index for efficient retrieval (`faiss_index/` directory)
   - Document metadata is stored in PostgreSQL database

2. **Question Answering Process**:
   - User submits question and filename through API endpoint
   - System validates document exists in database and has associated embeddings
   - FAISS index is loaded from disk
   - Question is processed to find semantically similar text chunks (top 4 by default)
   - Retrieved context chunks are combined with the question in a prompt template
   - Complete prompt is sent to Google's Gemini-1.5-Pro model
   - Response from the model is returned to the user

## Dependencies

- `fastapi`: Web framework for building APIs
- `PyMuPDF` (imported as `fitz`): PDF text extraction
- `langchain_google_genai`: Integration with Google Generative AI
- `langchain_community`: Components for document loading and vector stores
- `FAISS`: Vector similarity search implementation
- `SQLAlchemy`: ORM for database interactions
- Other utility libraries: logging, dotenv, etc.

## Database Setup and Model

### Database Configuration

The application connects to a PostgreSQL database using SQLAlchemy:

```python
db_url = os.environ.get("DB_URL")
engine = create_engine(db_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
```

### Document Model

```python
class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, unique=True, nullable=False)
    file_path = Column(String, nullable=False)
    upload_date = Column(DateTime, nullable=False, default=datetime.datetime.utcnow)
```

## API Endpoints

### 1. Upload Endpoint (`/upload`)

**Method**: POST  
**Purpose**: Upload and process a PDF document

**Detailed Steps**:
1. **File Reception**:
   ```python
   async def upload_pdf(file: UploadFile = File(...), db: Session = Depends(get_db))
   ```
   
2. **Duplicate Check**:
   ```python
   document = db.query(Document).filter(Document.filename == file.filename).first()
   if document:
       return JSONResponse(
           status_code=400,
           content={"detail": "File with this name already exists in the database"}
       )
   ```
   
3. **File Type Validation**:
   ```python
   if not file.filename.lower().endswith('.pdf'):
      return JSONResponse(status_code=400, content={"detail":"Only PDF files are allowed."})
   ```
   
4. **File Storage**:
   ```python
   file_path = os.path.join(UPLOAD_DIR, file.filename)
   with open(file_path, "wb") as buffer:
       shutil.copyfileobj(file.file, buffer)
   ```
   
5. **Text Extraction**:
   ```python
   extracted_text = extract_text_from_pdf(file_path)
   if not extracted_text.strip():
    return JSONResponse(status_code=400, content={"detail":"No text extracted from the PDF."})
   ```
   
6. **Vector Store Creation**:
   ```python
   vector_store = create_vector_store(extracted_text)
   vector_store.save_local(f"{FAISS_DIR}/{file.filename}")
   ```
   
7. **Database Record Creation**:
   ```python
   document = Document(filename=file.filename, file_path=file_path)
   db.add(document)
   db.commit()
   ```

### 2. Question Answering Endpoint (`/ask`)

**Method**: POST  
**Purpose**: Answer questions about a specific document

**Detailed Steps**:
1. **Input Validation**:
   ```python
   if not filename:
       return JSONResponse(status_code=400, content={"detail":"please upload file"})
   if not question:
       return JSONResponse(status_code=400, content={"detail":"Please ask me question!"})
   ```
   
2. **Document Verification**:
   ```python
   document = db.query(Document).filter(Document.filename == filename).first()
   if not document:
      return JSONResponse(status_code=404, content={"detail":"Document not found."})
   ```
   
3. **Vector Store Loading**:
   ```python
   vector_store_path = f"{FAISS_DIR}/{filename}"
   if not os.path.exists(vector_store_path):
       return JSONResponse(status_code=404, content={"detail":"Document embeddings not found."})
   
   embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004")
   vector_store = FAISS.load_local(vector_store_path, embeddings, allow_dangerous_deserialization=True)
   ```
   
4. **Retriever Creation**:
   ```python
   retriever = vector_store.as_retriever(search_kwargs={"k": 4})
   ```
   
5. **Prompt Template Setup**:
   ```python
   template = """Use the following pieces of context to answer the question at the end.
   If you don't know the answer, just say that you don't know, don't try to make up an answer.
   
   {context}
   
   Question: {question}
   Answer:"""
   
   PROMPT = PromptTemplate(template=template, input_variables=["context", "question"])
   ```
   
6. **QA Chain Creation**:
   ```python
   chain = load_qa_chain(ChatGoogleGenerativeAI(model="gemini-1.5-pro"), 
                         chain_type="stuff", 
                         prompt=PROMPT)
   ```
   
7. **Document Retrieval**:
   ```python
   docs = retriever.get_relevant_documents(question)
   ```
   
8. **Answer Generation**:
   ```python
   response = chain({"input_documents": docs, "question": question}, return_only_outputs=True)
   ```
   
9. **Response Return**:
   ```python
   return JSONResponse(content={"answer": response["output_text"]})
   ```

### 3. Health Check Endpoint (`/health`)

**Method**: GET  
**Purpose**: Verify API status  
**Returns**: Status information indicating the API is running

```python
@app.get("/health")
async def health_check():
    """Health check endpoint to verify API is working."""
    return {"status": "healthy", "message": "API is running correctly"}
```

### 4. Document List Endpoint (`/documents`)

**Method**: GET  
**Purpose**: List all uploaded documents  
**Returns**: Array of document IDs and filenames

```python
@app.get("/documents")
async def list_documents(db: Session = Depends(get_db)):
    """List all uploaded documents."""
    documents = db.query(Document).all()
    return [{"id": doc.id, "filename": doc.filename} for doc in documents]
```

## Core Functions

### 1. PDF Text Extraction

```python
def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract text from PDF using PyMuPDF."""
    text = ""
    doc = fitz.open(pdf_path)
    for page in doc:
        text += page.get_text("text") + "\n"
    return text
```

**Process**:
1. Open PDF document using PyMuPDF (fitz)
2. Iterate through each page
3. Extract text content from each page
4. Concatenate text with newlines between pages
5. Return the complete extracted text

### 2. Vector Store Creation

```python
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
    embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004")
    vector_store = FAISS.from_texts(texts, embeddings)
    return vector_store
```

**Process**:
1. Initialize text splitter with 1000-character chunks and 100-character overlap
2. Split the extracted text into manageable chunks
3. Validate that text chunks were created
4. Initialize Google's text embedding model
5. Generate embeddings for each text chunk
6. Create and return a FAISS vector store from the text and embeddings

### 3. Database Session Management

```python
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**Process**:
1. Create new database session
2. Yield the session for use in the endpoint
3. Ensure the session is closed after use, even if an exception occurs

## Error Handling

The application implements comprehensive error handling:

### Upload Endpoint Error Handling

```python
try:
    # Upload processing code
except Exception as e:
    traceback_str = traceback.format_exc()
    print(f"Error processing file: {traceback_str}")
    # Clean up if processing fails
    if os.path.exists(file_path):
        os.remove(file_path)
    db.rollback()
    return JSONResponse(status_code=500, content={"detail":f"Error processing file: {str(e)}"})
```

### Question Answering Error Handling

```python
try:
    # Question answering code
except Exception as e:
    return JSONResponse(status_code=500, content={"detail":f"Error processing question: {str(e)}"})
```

## Configuration

### Environment Variables

The application uses environment variables loaded via `dotenv`:

```python
load_dotenv()

# Google API key handling
if "GOOGLE_API_KEY" not in os.environ:
    os.environ["GOOGLE_API_KEY"] = getpass.getpass("Provide your Google API key here")

# Database URL
db_url = os.environ.get("DB_URL")
```

### Directory Configuration

```python
UPLOAD_DIR = "uploads"
FAISS_DIR = "faiss_index"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(FAISS_DIR, exist_ok=True)
```

### CORS Configuration

```python
origins = ["http://localhost","http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Technical Implementation Notes

### Retrieval-Augmented Generation (RAG)

The application implements a RAG architecture:
1. **Retrieval**: Using FAISS to find semantically similar text chunks to the question
2. **Augmentation**: Inserting retrieved context into a prompt template
3. **Generation**: Using Gemini-1.5-Pro to generate an answer based on the context and question

### LLM Chain Configuration

The application uses LangChain's QA chain with "stuff" chain type:
- "Stuff" chain type combines all retrieved documents into a single prompt
- Alternative chain types like "map_reduce" could be used for larger document sets
- The prompt template instructs the model to use the provided context and avoid hallucinations

### Error Prevention

1. **Duplicate Check**: Prevents duplicate document uploads
2. **Empty Content Check**: Ensures extracted PDF text isn't empty
3. **File Type Validation**: Ensures only PDFs are processed
4. **Missing Document Handling**: Checks document existence before answering
5. **Database Rollback**: Reverts database changes if an error occurs during upload

## Deployment Considerations

1. **Production Database**: Ensure proper PostgreSQL setup with appropriate credentials
2. **API Key Security**: Store the Google API key securely
3. **Storage Management**: Implement file retention policies for uploads and indices
4. **Error Logging**: Enhance logging for production troubleshooting
5. **Rate Limiting**: Consider adding rate limiting for production deployments
6. **CORS Configuration**: Update CORS settings for production domains