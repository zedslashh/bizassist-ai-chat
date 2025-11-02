# app.py
import os
import tempfile
from typing import List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import chromadb
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
# from langchain_community.embeddings import OpenAIEmbeddings
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.chat_models import ChatOpenAI
import time
from fastapi import Query
from datetime import datetime
from langchain.prompts import ChatPromptTemplate
import aiofiles
import pandas as pd
import docx
from PyPDF2 import PdfReader  
from dotenv import load_dotenv

load_dotenv()

# CONFIG
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")
MODEL_GEN = os.getenv("GEN_MODEL", "gpt-4o")
EMBED_MODEL = os.getenv("EMBED_MODEL", "text-embedding-3-small")
os.environ["TOKENIZERS_PARALLELISM"] = "false" 

if not OPENAI_API_KEY:
    raise Exception("Set OPENAI_API_KEY in environment.")

# FastAPI setup
app = FastAPI(title="BizAssistAI")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Chroma setup
chroma_client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)

embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2", model_kwargs={"device": "cpu"})

# --- File text extractor ---
async def extract_text_from_file(upload: UploadFile) -> str:
    name = upload.filename.lower()
    suffix = name.split(".")[-1]
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=f".{suffix}")
    async with aiofiles.open(tmp.name, "wb") as out:
        content = await upload.read()
        await out.write(content)

    text = ""
    try:
        if suffix == "pdf":
            reader = PdfReader(tmp.name)
            text = "\n".join([page.extract_text() or "" for page in reader.pages])
        elif suffix in ("docx", "doc"):
            doc = docx.Document(tmp.name)
            text = "\n".join(p.text for p in doc.paragraphs)
        elif suffix == "csv":
            df = pd.read_csv(tmp.name)
            text = df.to_csv(index=False)
        else:
            async with aiofiles.open(tmp.name, "r", encoding="utf-8", errors="ignore") as f:
                text = await f.read()
    except Exception as e:
        print("extract error:", e)
    finally:
        try:
            os.unlink(tmp.name)
        except:
            pass
    return text or ""

def translate_text(text: str, target_lang: str = "tamil") -> str:
    chat = ChatOpenAI(openai_api_key=OPENAI_API_KEY, model_name=MODEL_GEN, temperature=0.3)
    prompt = ChatPromptTemplate.from_messages([
        {"role": "system", "content": f"You are a translation assistant. Translate the following text into {target_lang}, making it natural and conversational."}
    ])
    messages = prompt.format_messages()
    response = chat.invoke(messages)
    return response.content


# --- Ingest Endpoint ---
@app.post("/ingest")
async def ingest_files(org_id: str = Form(...), files: List[UploadFile] = File(...)):
    try:
        col_name = f"bizassist_{sanitize_org_id(org_id)}"

        # Delete existing collection if present
        try:
            chroma_client.delete_collection(name=col_name)
            print(f"Deleted existing collection: {col_name}")
        except Exception as e:
            print(f"No existing collection to delete or error: {e}")

        all_texts, metadatas = [], []

        for f in files:
            text = await extract_text_from_file(f)
            if not text.strip():
                continue
            splitter = RecursiveCharacterTextSplitter(chunk_size=1500, chunk_overlap=100)
            chunks = splitter.split_text(text)
            for i, c in enumerate(chunks):
                if c.strip():
                    all_texts.append(c)
                    metadatas.append({"source": f.filename, "chunk_index": i})

        print(f"Total chunks to process: {len(all_texts)}")

        if not all_texts:
            raise HTTPException(status_code=400, detail="No text extracted from files.")

        # For debugging: process only the first chunk
        # all_texts = all_texts[:1]
        # metadatas = metadatas[:1]

        batch_size = 5
        delay_between_batches = 10

        for i in range(0, len(all_texts), batch_size):
            batch_texts = all_texts[i:i+batch_size]
            batch_metadata = metadatas[i:i+batch_size]

            print(f"Processing batch {i // batch_size + 1}: {len(batch_texts)} chunks")

            try:
                Chroma.from_texts(
                    texts=batch_texts,
                    embedding=embeddings,
                    metadatas=batch_metadata,
                    collection_name=col_name,
                    persist_directory=CHROMA_PERSIST_DIR,
                )
            except Exception as e:
                print(f"Batch failed: {e}")
                raise HTTPException(status_code=429, detail=f"Embedding quota exceeded or error: {e}")

            time.sleep(delay_between_batches)

        return {
            "status": "ok",
            "indexed_chunks": len(all_texts),
            "collection": col_name
        }
    except Exception as e:
        print("Unexpected error:", e)
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")


def sanitize_org_id(org_id: str) -> str:
    import re
    return re.sub(r"[^a-zA-Z0-9._-]", "_", org_id)

# --- Query Endpoint ---
class QueryRequest(BaseModel):
    org_id: str
    query: str
    top_k: int = 4
    lang: str = "english"


from openai import OpenAI

openai_client = OpenAI(api_key=OPENAI_API_KEY)

@app.post("/query")
def query_model(req: QueryRequest):
    col_name = f"bizassist_{req.org_id}"

    try:
        vectordb = Chroma(
            collection_name=col_name,
            persist_directory=CHROMA_PERSIST_DIR,
            embedding_function=embeddings,
        )
    except Exception:
        raise HTTPException(status_code=404, detail="No collection found for org_id")

    docs = vectordb.similarity_search(req.query, k=req.top_k)
    context = "\n\n".join([d.page_content for d in docs]) if docs else ""

    prompt = ChatPromptTemplate.from_messages([
        {"role": "system", "content": "You are BizAssistAI. Answer concisely using the provided documents.If you are unable to answer the queston or answer to that particular question is not present in the document ,Instead of saying that answer to that particular question is not present in the document,Apologize and politely say that the question is out your scope can I help you in some other way"},
        {"role": "user", "content": f"DOCUMENTS:\n{context}\n\nQUESTION:\n{req.query}"}
    ])

    chat = ChatOpenAI(openai_api_key=OPENAI_API_KEY, model_name=MODEL_GEN, temperature=0.7)
    messages = prompt.format_messages()
    response = chat.invoke(messages)

    answer_text = response.content

    # ✅ Translate if required
    if req.lang == "tamil":
        translation_response = openai_client.chat.completions.create(
            model="gpt-4o",  # Or another translation model if available
            messages=[
                {"role": "system", "content": "You are a helpful assistant that translates text to Tamil."},
                {"role": "user", "content": f"Translate the following text to Tamil:\n{answer_text}"}
            ],
            temperature=0.3,
        )
        answer_text = translation_response.choices[0].message.content

    return {
        "answer": answer_text,
        "retrieved_docs": [{"doc": d.page_content, "meta": d.metadata} for d in docs],
    }

#Generate greeting message

def generate_greeting(org_id: str) -> str:
    hour = datetime.now().hour
    if 5 <= hour < 12:
        time_of_day = "Good morning"
    elif 12 <= hour < 18:
        time_of_day = "Good afternoon"
    else:
        time_of_day = "Good evening"
    
    return f"{time_of_day}! \nWelcome to {org_id}👋.How can I assist you today?"

@app.get("/greet/{org_id}")
def greet(org_id: str, lang: str = Query("english")):
    greeting = generate_greeting(org_id)
    if lang.lower() == "tamil":
        greeting = translate_text(greeting, target_lang="tamil")
    return {"greeting": greeting}

# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)


print("Existing collections:", chroma_client.list_collections())
# print(f"Total chunks to process: {len(all_texts)}")
# print(f"Processing batch {i // batch_size + 1}: {len(batch_texts)} chunks")
