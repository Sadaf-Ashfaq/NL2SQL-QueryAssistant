from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from database import get_schema, get_engine, test_connection
from nl2sql import generate_sql, run_agent
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

class ConnectRequest(BaseModel):
    connection_string: str

DANGEROUS_KEYWORDS = ["DROP", "DELETE", "TRUNCATE", "ALTER", "UPDATE", "INSERT", "EXEC", "EXECUTE"]

def is_dangerous(sql: str) -> bool:
    sql_upper = sql.upper()
    return any(keyword in sql_upper for keyword in DANGEROUS_KEYWORDS)

def clean_sql(sql: str) -> str:
    sql = re.sub(r"```sql|```", "", sql).strip()
    return sql

def save_history(question: str, sql: str, success: bool):
    try:
        engine = get_engine()
        with engine.connect() as conn:
            conn.execute(text(
                "INSERT INTO query_history (UserQuestion, GeneratedSQL, WasSuccessful) VALUES (:q, :s, :w)"
            ), {"q": question, "s": sql, "w": 1 if success else 0})
            conn.commit()
    except:
        pass  # query_history table na ho toh skip karo

@app.get("/")
def root():
    return {"message": "NL2SQL Backend is running!"}

@app.post("/connect")
def connect_db(request: ConnectRequest):
    success = test_connection(request.connection_string)
    if not success:
        raise HTTPException(status_code=400, detail="❌ Connection failed! Check your connection string.")
    
    # Auto create query_history table
    try:
        engine = get_engine()
        with engine.connect() as conn:
            conn.execute(text("""
                IF NOT EXISTS (
                    SELECT * FROM INFORMATION_SCHEMA.TABLES 
                    WHERE TABLE_NAME = 'query_history'
                )
                BEGIN
                    CREATE TABLE query_history (
                        HistoryID INT PRIMARY KEY IDENTITY,
                        UserQuestion NVARCHAR(500),
                        GeneratedSQL NVARCHAR(2000),
                        ExecutedAt DATETIME DEFAULT GETDATE(),
                        WasSuccessful BIT
                    )
                END
            """))
            conn.commit()
    except Exception as e:
        print(f"History table error: {e}")
    
    return {"message": "✅ Database connected successfully!"}

@app.get("/schema")
def schema():
    try:
        return get_schema()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/history")
def get_history():
    try:
        engine = get_engine()
        with engine.connect() as conn:
            result = conn.execute(text(
                "SELECT HistoryID, UserQuestion, GeneratedSQL, ExecutedAt, WasSuccessful FROM query_history ORDER BY ExecutedAt DESC"
            ))
            columns = list(result.keys())
            rows = []
            for row in result.fetchall():
                d = dict(zip(columns, row))
                d["ExecutedAt"] = d["ExecutedAt"].strftime("%d %b %Y, %I:%M %p") if d["ExecutedAt"] else ""
                rows.append(d)
        return rows
    except:
        return []

@app.get("/stats")
def get_stats():
    try:
        engine = get_engine()
        with engine.connect() as conn:
            total = conn.execute(text(
                "SELECT COUNT(*) FROM query_history"
            )).scalar()

            success = conn.execute(text(
                "SELECT COUNT(*) FROM query_history WHERE WasSuccessful = 1"
            )).scalar()

            failed = conn.execute(text(
                "SELECT COUNT(*) FROM query_history WHERE WasSuccessful = 0"
            )).scalar()

            recent = conn.execute(text(
                "SELECT TOP 5 UserQuestion, WasSuccessful, ExecutedAt FROM query_history ORDER BY ExecutedAt DESC"
            )).fetchall()

        return {
            "total": total,
            "success": success,
            "failed": failed,
            "recent": [
                {
                    "question": r[0],
                    "success": r[1],
                    "time": r[2].strftime("%d %b %Y, %I:%M %p") if r[2] else ""
                }
                for r in recent
            ]
        }
    except:
        return {"total": 0, "success": 0, "failed": 0, "recent": []}

@app.post("/query")
def run_query(request: QueryRequest):
    try:
        schema = get_schema()
    except:
        raise HTTPException(status_code=400, detail="No database connected!")

    sql = clean_sql(generate_sql(request.question, schema))
    dangerous = is_dangerous(sql)

    save_history(request.question, sql, not dangerous)

    if dangerous:
        return {
            "error": "⚠️ Dangerous query detected!",
            "sql": sql,
            "columns": [],
            "rows": [],
            "requires_confirmation": True
        }

    engine = get_engine()
    with engine.connect() as conn:
        result = conn.execute(text(sql))
        columns = list(result.keys())
        rows = [dict(zip(columns, row)) for row in result.fetchall()]

    return {"sql": sql, "columns": columns, "rows": rows, "requires_confirmation": False}

@app.post("/query/confirm")
def confirm_query(request: QueryRequest):
    schema = get_schema()
    sql = clean_sql(generate_sql(request.question, schema))

    engine = get_engine()
    with engine.connect() as conn:
        conn.execute(text(sql))
        conn.commit()

    save_history(request.question, sql, True)
    return {"sql": sql, "message": "✅ Query executed successfully!", "columns": [], "rows": []}

@app.get("/relationships")
def get_relationships():
    try:
        engine = get_engine()
        rels = []

        # Proper FK relationships
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT 
                    tp.name AS ParentTable,
                    cp.name AS ParentColumn,
                    tr.name AS ReferencedTable,
                    cr.name AS ReferencedColumn
                FROM sys.foreign_keys fk
                JOIN sys.tables tp ON fk.parent_object_id = tp.object_id
                JOIN sys.tables tr ON fk.referenced_object_id = tr.object_id
                JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
                JOIN sys.columns cp ON fkc.parent_column_id = cp.column_id AND cp.object_id = tp.object_id
                JOIN sys.columns cr ON fkc.referenced_column_id = cr.column_id AND cr.object_id = tr.object_id
            """)).fetchall()
            proper_rels = [{"from": r[0], "fromColumn": r[1], "to": r[2], "toColumn": r[3]} for r in result]
            rels.extend(proper_rels)

        # Smart column name matching
        with engine.connect() as conn:
            tables = conn.execute(text(
                "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'"
            )).fetchall()
            table_names = [t[0] for t in tables]

        for table in table_names:
            with engine.connect() as conn:
                columns = conn.execute(text(
                    f"SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='{table}'"
                )).fetchall()
            for col in columns:
                col_name = col[0]
                for other_table in table_names:
                    if other_table == table:
                        continue
                    if (col_name.lower() == other_table.lower() or 
                        col_name.lower() == other_table.lower().rstrip('s') or
                        col_name.lower() == other_table.lower() + "id"):
                        already_exists = any(
                            r["from"] == table and r["to"] == other_table
                            for r in rels
                        )
                        if not already_exists:
                            rels.append({
                                "from": table,
                                "fromColumn": col_name,
                                "to": other_table,
                                "toColumn": "Id"
                            })

        return rels
    except Exception as e:
        return []
    
@app.post("/agent")
def agent_query(request: QueryRequest):
    try:
        engine = get_engine()
        result = run_agent(request.question, engine)
        save_history(request.question, "agent", result["success"])
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))