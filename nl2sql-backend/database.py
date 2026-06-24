from sqlalchemy import create_engine, text

engine = create_engine(
    "mssql+pyodbc://localhost\\SQLEXPRESS/RetailMart?driver=ODBC+Driver+17+for+SQL+Server&trusted_connection=yes"
)

def test_connection():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
        print("✅ Database connected successfully!")

def get_schema():
    schema = {}
    with engine.connect() as conn:
        tables = conn.execute(text(
            "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'"
        )).fetchall()

    for row in tables:
        table = row[0]
        with engine.connect() as conn:
            columns = conn.execute(text(
                f"SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='{table}'"
            )).fetchall()
            schema[table] = [(col[0], col[1]) for col in columns]
    return schema

if __name__ == "__main__":
    test_connection()
    print(get_schema())
    
