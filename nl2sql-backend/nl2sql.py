from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from dotenv import load_dotenv
import os

load_dotenv()

llm = ChatGroq(
    api_key=os.getenv("GROQ_API_KEY"),
    model="llama-3.3-70b-versatile",
    temperature=0
)

def generate_sql(user_question: str, schema: dict) -> str:
    schema_str = ""
    for table, columns in schema.items():
        cols = ", ".join([f"{col[0]} ({col[1]})" for col in columns])
        schema_str += f"Table {table}: {cols}\n"

    prompt = PromptTemplate(
        input_variables=["schema", "question"],
        template="""
You are an expert SQL Server query generator.
Given this database schema:
{schema}

Generate ONLY a valid SQL Server query for this question, no explanation:
{question}

SQL Query:"""
    )

    chain = prompt | llm
    result = chain.invoke({"schema": schema_str, "question": user_question})
    return result.content.strip()