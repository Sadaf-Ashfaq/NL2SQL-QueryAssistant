// Connect.jsx
import { useState } from "react";
import { Zap, ChevronDown } from "lucide-react";

const DB_TEMPLATES = {
  "SQL Server (Windows Auth)": "mssql+pyodbc://localhost\\SQLEXPRESS/{database}?driver=ODBC+Driver+17+for+SQL+Server&trusted_connection=yes",
  "SQL Server (SQL Auth)": "mssql+pyodbc://{username}:{password}@localhost\\SQLEXPRESS/{database}?driver=ODBC+Driver+17+for+SQL+Server",
  "PostgreSQL": "postgresql://{username}:{password}@localhost/{database}",
  "MySQL": "mysql+pymysql://{username}:{password}@localhost/{database}",
  "SQLite": "sqlite:///{path_to_file}.db",
};

export default function Connect({ onConnect }) {
  const [connStr, setConnStr] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);

  const handleConnect = async () => {
    if (!connStr.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("http://localhost:8000/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection_string: connStr }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Connection failed!");
      } else {
        onConnect(connStr);
      }
    } catch {
      setError("Backend not reachable");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Zap size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">QueryCraft</h1>
          
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">

          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-500 font-medium mb-3 transition"
          >
            <ChevronDown size={13} className={`transition-transform ${showTemplates ? "rotate-180" : ""}`} />
            Templates
          </button>

          {showTemplates && (
            <div className="mb-3 space-y-1">
              {Object.entries(DB_TEMPLATES).map(([label, template]) => (
                <button
                  key={label}
                  onClick={() => { setConnStr(template); setShowTemplates(false); }}
                  className="w-full text-left px-3 py-1.5 rounded text-xs bg-gray-50 hover:bg-emerald-50 hover:text-emerald-600 text-gray-600 border border-gray-200 hover:border-emerald-200 transition"
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <label className="text-xs font-medium text-gray-600">Connection String</label>
            <textarea
              rows={3}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50 transition resize-none"
              placeholder="mssql+pyodbc://localhost\SQLEXPRESS/MyDB?driver=ODBC+Driver+17+for+SQL+Server&trusted_connection=yes"
              value={connStr}
              onChange={(e) => setConnStr(e.target.value)}
            />
            {error && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <button
              onClick={handleConnect}
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-200 text-white py-2.5 rounded-lg text-sm font-medium transition"
            >
              {loading ? "Connecting..." : "Connect"}
            </button>
          </div>
        </div>

        
      </div>
    </div>
  );
}