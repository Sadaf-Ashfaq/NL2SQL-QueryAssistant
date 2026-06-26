from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from dotenv import load_dotenv
import os
import re

load_dotenv()

llm = ChatGroq(
    api_key=os.getenv("GROQ_API_KEY"),
    model="llama-3.3-70b-versatile",
    temperature=0
)

_agent_engine = None

def set_agent_engine(engine):
    global _agent_engine
    _agent_engine = engine

def get_schema_string():
    from sqlalchemy import text
    schema_str = ""
    with _agent_engine.connect() as conn:
        tables = conn.execute(text(
            "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'"
        )).fetchall()

    for row in tables:
        table = row[0]
        if table == "query_history":
            continue
        with _agent_engine.connect() as conn:
            columns = conn.execute(text(
                f"SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='{table}'"
            )).fetchall()
        cols = ", ".join([f"{c[0]} ({c[1]})" for c in columns])
        schema_str += f"Table {table}: {cols}\n"
    return schema_str

def execute_query(sql: str) -> str:
    from sqlalchemy import text
    try:
        sql = re.sub(r"```sql|```", "", sql).strip()
        with _agent_engine.connect() as conn:
            result = conn.execute(text(sql))
            rows = result.fetchall()
            columns = list(result.keys())
            if not rows:
                return "Query executed. No rows returned."
            output = ", ".join(columns) + "\n"
            for row in rows[:20]:
                output += ", ".join([str(v) for v in row]) + "\n"
            return output
    except Exception as e:
        return f"SQL_ERROR: {str(e)}"

def generate_sql(user_question: str, schema: dict) -> str:
    schema_str = ""
    for table, columns in schema.items():
        if table == "query_history":
            continue
        cols = ", ".join([f"{col[0]} ({col[1]})" for col in columns])
        schema_str += f"Table {table}: {cols}\n"

    prompt = PromptTemplate(
        input_variables=["schema", "question"],
        template="""
You are an expert SQL Server query generator.
Given this database schema:
{schema}

Generate ONLY a valid SQL Server query, no explanation:
{question}

SQL Query:"""
    )
    chain = prompt | llm
    result = chain.invoke({"schema": schema_str, "question": user_question})
    return result.content.strip()

def run_agent(user_question: str, engine) -> dict:
    set_agent_engine(engine)
    
    schema_str = get_schema_string()
    
    # Step 1: Generate SQL
    prompt = f"""You are an expert SQL Server query generator.
Database schema:
{schema_str}

Generate ONLY a valid SQL Server query for this question, no explanation:
{user_question}

SQL Query:"""
    
    response = llm.invoke(prompt)
    sql = re.sub(r"```sql|```", "", response.content).strip()
    
    # Step 2: Execute
    result = execute_query(sql)
    
    # Step 3: If error, try to fix once
    if result.startswith("SQL_ERROR"):
        fix_prompt = f"""This SQL query failed:
{sql}

Error: {result}

Schema:
{schema_str}

Fix the SQL Server query. Return ONLY the corrected SQL, no explanation:"""
        
        fixed_response = llm.invoke(fix_prompt)
        fixed_sql = re.sub(r"```sql|```", "", fixed_response.content).strip()
        result = execute_query(fixed_sql)
        sql = fixed_sql
    
    # Step 4: Format answer
    format_prompt = f"""The user asked: {user_question}

SQL used: {sql}

Raw results:
{result}

Present these results in plain English only. Do NOT use markdown tables, do NOT use | characters.
Just describe the results clearly in simple bullet points or sentences.
Keep it concise and easy to read."""

    final = llm.invoke(format_prompt)
    
    return {
        "answer": final.content,
        "sql": sql,
        "raw": result,
        "success": not result.startswith("SQL_ERROR")
    }