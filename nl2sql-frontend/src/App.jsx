import { useState, useEffect } from "react";
import { Send, History, Database, AlertTriangle, CheckCircle, XCircle, LogOut, Zap, Bot, LayoutDashboard } from "lucide-react";
import Connect from "./Connect";
import Dashboard from "./Dashboard";
import HistoryPage from "./HistoryPage";
import SchemaPage from "./SchemaPage";
import ReactMarkdown from "react-markdown";

export default function App() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [schema, setSchema] = useState({});
  const [confirmation, setConfirmation] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [useAgent, setUseAgent] = useState(false);
  const [page, setPage] = useState("query");

  useEffect(() => {
    const saved = localStorage.getItem("nl2sql_conn");
    if (saved) {
      fetch("http://localhost:8000/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection_string: saved }),
      }).then((res) => {
        if (res.ok) {
          setConnected(true);
          fetchHistory();
          fetchSchema();
        } else {
          localStorage.removeItem("nl2sql_conn");
        }
        setConnecting(false);
      }).catch(() => setConnecting(false));
    } else {
      setConnecting(false);
    }
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch("http://localhost:8000/history");
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch { setHistory([]); }
  };

  const fetchSchema = async () => {
    try {
      const res = await fetch("http://localhost:8000/schema");
      const data = await res.json();
      setSchema(data);
    } catch { setSchema({}); }
  };

  const handleConnect = (connStr) => {
    localStorage.setItem("nl2sql_conn", connStr);
    setConnected(true);
    fetchHistory();
    fetchSchema();
  };

  const handleDisconnect = () => {
    localStorage.removeItem("nl2sql_conn");
    setConnected(false);
    setResult(null);
    setHistory([]);
    setSchema({});
    setQuestion("");
    setConfirmation(null);
    setPage("query");
  };

  const runQuery = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setResult(null);
    setConfirmation(null);

    const endpoint = useAgent
      ? "http://localhost:8000/agent"
      : "http://localhost:8000/query";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    const data = await res.json();

    if (data.requires_confirmation) {
      setConfirmation({ question, sql: data.sql });
    } else {
      setResult(data);
    }

    setLoading(false);
    fetchHistory();
  };

  const confirmExecution = async () => {
    setLoading(true);
    const res = await fetch("http://localhost:8000/query/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: confirmation.question }),
    });
    const data = await res.json();
    setResult({ ...data, rows: [], columns: [] });
    setConfirmation(null);
    setLoading(false);
    fetchHistory();
  };

  const exportCSV = () => {
    if (!result?.rows?.length) return;
    const headers = result.columns.join(",");
    const rows = result.rows.map((row) =>
      result.columns.map((col) => `"${String(row[col])}"`).join(",")
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "query_results.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (connecting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
          <span className="text-gray-400 text-sm ml-2">Connecting...</span>
        </div>
      </div>
    );
  }

  if (!connected) return <Connect onConnect={handleConnect} />;

  const navItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "query", icon: Zap, label: "Query" },
    { id: "history", icon: History, label: "History" },
    { id: "schema", icon: Database, label: "Schema & ERD" },
  ];

  return (
    <div className="flex h-screen bg-gray-50 font-sans">

      {/* SIDEBAR — Navigation */}
      <div className="w-56 bg-white border-r border-gray-100 flex flex-col">

        {/* Logo */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">QueryCraft</p>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setPage(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                page === id
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              }`}
            >
              <Icon size={16} className={page === id ? "text-emerald-500" : "text-gray-400"} />
              {label}
            </button>
          ))}
        </nav>

        {/* Connection Status + Disconnect */}
<div className="p-4 border-t border-gray-100">
  <div className="flex items-center gap-2 mb-3">
    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
    <span className="text-xs text-gray-500">Connected</span>
  </div>
  <button
    onClick={handleDisconnect}
    className="w-full flex items-center gap-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition"
  >
    <LogOut size={13} />
    Disconnect
  </button>
</div>
      </div>

      {/* MAIN CONTENT */}
      {page === "schema" && <SchemaPage />}
      {page === "dashboard" && (
        <Dashboard onNavigate={setPage} />
      )}

      {page === "history" && (
        <HistoryPage />
      )}

      {page === "query" && (
        <div className="flex-1 flex min-w-0">

          {/* Center — Query */}
          <div className="flex-1 flex flex-col min-w-0">

            {/* Header */}
            <div className="px-6 py-5 bg-white border-b border-gray-100">
              <h1 className="text-2xl font-bold text-gray-800">Ask your database</h1>
              <p className="text-sm text-gray-400 mt-1">Write in plain English and runs the SQL</p>

              <div className="flex gap-2 mt-4">
                <input
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50 transition"
                  placeholder='e.g. "Show top 5 customers by loyalty points"'
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runQuery()}
                />
                <button
                  onClick={() => setUseAgent(!useAgent)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition border ${
                    useAgent
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  <Bot size={15} />
                  {useAgent ? "Agent ON" : "Agent OFF"}
                </button>
                <button
                  onClick={runQuery}
                  disabled={loading}
                  className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-200 text-white px-6 py-3 rounded-xl flex items-center gap-2 text-sm font-semibold transition"
                >
                  <Send size={14} />
                  {loading ? "Running..." : "Run"}
                </button>
              </div>

            <div className="mt-3">
  {useAgent }
</div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-auto p-6 space-y-4">

              {loading && (
                <div className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-xl">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  </div>
                  <span className="text-sm text-gray-400">{useAgent ? "Agent thinking..." : "Generating SQL..."}</span>
                </div>
              )}

              {confirmation && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
                    <AlertTriangle size={16} />
                    This query will modify your database
                  </div>
                  <div className="bg-white border border-amber-100 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Generated SQL</p>
                    <code className="text-sm text-gray-700 whitespace-pre-wrap">{confirmation.sql}</code>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={confirmExecution} className="bg-amber-500 hover:bg-amber-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                      ✅ Yes, Execute
                    </button>
                    <button onClick={() => setConfirmation(null)} className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium transition">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {result?.message && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-emerald-700 text-sm">
                  <CheckCircle size={16} />
                  {result.message}
                </div>
              )}

              {result?.answer && (
                <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-emerald-500 rounded-lg flex items-center justify-center">
                      <Bot size={13} className="text-white" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700">Agent Answer</span>

                  </div>
                  <div className="text-sm text-gray-700 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_li]:text-gray-600 [&_strong]:font-semibold [&_p]:mb-2">
                    <ReactMarkdown>{result.answer}</ReactMarkdown>
                  </div>
                </div>
              )}

              {result?.sql && !result?.message && (
                <div className="bg-gray-900 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-red-400"></div>
                    <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    <span className="text-xs text-gray-500 ml-2 font-mono">query.sql</span>
                  </div>
                  <code className="text-sm text-emerald-400 whitespace-pre-wrap font-mono">{result.sql}</code>
                </div>
              )}

              {result?.rows?.length > 0 && (
                <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Database size={14} className="text-emerald-500" />
                      <span className="text-sm font-medium text-gray-700">
                        {result.rows.length} row{result.rows.length !== 1 ? "s" : ""} returned
                      </span>
                    </div>
                    <button onClick={exportCSV} className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-3 py-1.5 rounded-lg transition font-medium">
                      ⬇ Export CSV
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          {result.columns.map((col) => (
                            <th key={col} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.rows.map((row, i) => (
                          <tr key={i} className="border-t border-gray-50 hover:bg-gray-50 transition">
                            {result.columns.map((col) => (
                              <td key={col} className="px-5 py-3 text-gray-700 text-xs">
                                {String(row[col])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {result?.rows?.length === 0 && !result?.error && !result?.message && result?.sql && !result?.answer && (
                <div className="text-center py-8 text-gray-400 text-sm">No results found.</div>
              )}
            </div>
          </div>

          {/* RIGHT — Affected Tables */}
<div className="w-56 bg-white border-l border-gray-200 flex flex-col">
  <div className="px-4 py-2 border-b border-gray-200">
    <span className="text-xs font-semibold text-gray-500 uppercase">
      {result?.sql ? "Affected Tables" : "Schema"}
    </span>
  </div>
  <div className="flex-1 overflow-y-auto p-3 space-y-2">
    {result?.sql ? (
      // Show affected tables
      Object.keys(schema)
        .filter(t => t !== "query_history" && result.sql.toUpperCase().includes(t.toUpperCase()))
        .map(table => (
          <div key={table} className="rounded-lg border border-emerald-200 bg-emerald-50 overflow-hidden">
            <div className="px-3 py-1.5 bg-emerald-500 flex items-center gap-2">
              <div className="w-3 h-3 bg-white rounded-sm opacity-80"></div>
              <span className="text-xs font-bold text-white">{table}</span>
            </div>
            <div className="px-3 py-1">
              {schema[table].map(([col, type]) => (
                <div key={col} className="flex justify-between items-center py-0.5 border-b border-emerald-100 last:border-0">
                  <span className="text-xs text-gray-600">{col}</span>
                  <span className="text-[10px] text-gray-300 font-mono">{type}</span>
                </div>
              ))}
            </div>
          </div>
        ))
    ) : (
      // Show all schema when no query
      Object.entries(schema)
        .filter(([t]) => t !== "query_history")
        .map(([table, columns]) => (
          <div key={table} className="rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-3 py-1.5 bg-gray-50">
              <span className="text-xs font-semibold text-gray-700">{table}</span>
            </div>
            <div className="px-3 py-1">
              {columns.map(([col, type]) => (
                <div key={col} className="flex justify-between items-center py-0.5 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-600">{col}</span>
                  <span className="text-[10px] text-gray-300 font-mono">{type}</span>
                </div>
              ))}
            </div>
          </div>
        ))
    )}
  </div>
</div>
        </div>
      )}
    </div>
  );
}