from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from database import get_schema, engine
from nl2sql import generate_sql
from sqlalchemy import text
import re

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    question: str

DANGEROUS_KEYWORDS = ["DROP", "DELETE", "TRUNCATE", "ALTER", "UPDATE", "INSERT", "EXEC", "EXECUTE"]

def is_dangerous(sql: str) -> bool:
    sql_upper = sql.upper()
    return any(keyword in sql_upper for keyword in DANGEROUS_KEYWORDS)

def clean_sql(sql: str) -> str:
    sql = re.sub(r"```sql|```", "", sql).strip()
    return sql

def save_history(question: str, sql: str, success: bool):
    with engine.connect() as conn:
        conn.execute(text(
            "INSERT INTO query_history (UserQuestion, GeneratedSQL, WasSuccessful) VALUES (:q, :s, :w)"
        ), {"q": question, "s": sql, "w": 1 if success else 0})
        conn.commit()

@app.get("/")
def root():
    return {"message": "NL2SQL Backend is running!"}

@app.get("/schema")
def schema():
    return get_schema()

@app.get("/history")
def get_history():
    with engine.connect() as conn:
        result = conn.execute(text(
            "SELECT HistoryID, UserQuestion, GeneratedSQL, ExecutedAt, WasSuccessful FROM query_history ORDER BY ExecutedAt DESC"
        ))
        columns = list(result.keys())
        rows = [dict(zip(columns, row)) for row in result.fetchall()]
    return rows

@app.post("/query")
def run_query(request: QueryRequest):
    schema = get_schema()
    sql = clean_sql(generate_sql(request.question, schema))
    dangerous = is_dangerous(sql)

    save_history(request.question, sql, not dangerous)

    if dangerous:
        return {
            "error": "⚠️ Dangerous query detected! Only SELECT queries are allowed.",
            "sql": sql,
            "columns": [],
            "rows": [],
            "requires_confirmation": True
        }

    with engine.connect() as conn:
        result = conn.execute(text(sql))
        columns = list(result.keys())
        rows = [dict(zip(columns, row)) for row in result.fetchall()]

    return {"sql": sql, "columns": columns, "rows": rows, "requires_confirmation": False}

@app.post("/query/confirm")
def confirm_query(request: QueryRequest):
    schema = get_schema()
    sql = clean_sql(generate_sql(request.question, schema))

    with engine.connect() as conn:
        conn.execute(text(sql))
        conn.commit()

    save_history(request.question, sql, True)

    return {"sql": sql, "message": "✅ Query executed successfully!", "columns": [], "rows": []}