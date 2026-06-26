from sqlalchemy import create_engine, text

_engine = None
_connection_string = None

def set_engine(connection_string: str):
    global _engine, _connection_string
    _engine = None  # pehle reset karo
    _connection_string = connection_string
    _engine = create_engine(connection_string)

def get_engine():
    if _engine is None:
        raise Exception("No database connected!")
    return _engine

def test_connection(connection_string: str) -> bool:
    try:
        engine = create_engine(connection_string)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        set_engine(connection_string)
        return True
    except Exception as e:
        print(f"Connection error: {e}")
        return False

def get_schema():
    schema = {}
    engine = get_engine()
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