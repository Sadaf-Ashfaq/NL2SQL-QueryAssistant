import { useState, useEffect } from "react";
import { Send, History, Database, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

export default function App() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [schema, setSchema] = useState({});
  const [confirmation, setConfirmation] = useState(null);

  useEffect(() => {
    fetchHistory();
    fetchSchema();
  }, []);

  const fetchHistory = async () => {
    const res = await fetch("http://localhost:8000/history");
    const data = await res.json();
    setHistory(data);
  };

  const fetchSchema = async () => {
    const res = await fetch("http://localhost:8000/schema");
    const data = await res.json();
    setSchema(data);
  };

  const runQuery = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setResult(null);
    setConfirmation(null);

    const res = await fetch("http://localhost:8000/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    const data = await res.json();

    if (data.requires_confirmation) {
      setConfirmation({ question, sql: data.sql });
      setResult(null);
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

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800 font-sans">

      {/* LEFT — History */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm">
        <div className="p-4 border-b border-gray-200 flex items-center gap-2">
          <History size={16} className="text-indigo-500" />
          <span className="font-semibold text-sm text-gray-700">Query History</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {history.length === 0 && (
            <p className="text-gray-400 text-xs p-2">No queries yet</p>
          )}
          {history.map((h) => (
            <div
              key={h.HistoryID}
              onClick={() => setQuestion(h.UserQuestion)}
              className="p-2 rounded-lg border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 cursor-pointer transition"
            >
              <div className="flex items-center gap-1 mb-1">
                {h.WasSuccessful ? (
                  <CheckCircle size={11} className="text-emerald-500" />
                ) : (
                  <XCircle size={11} className="text-red-400" />
                )}
                <span className="text-xs text-gray-400">
                  {new Date(h.ExecutedAt).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-xs text-gray-600 line-clamp-2">{h.UserQuestion}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CENTER — Main */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-white shadow-sm">
          <h1 className="text-lg font-bold text-indigo-600">⚡ RetailMart Query Assistant</h1>
          <p className="text-xs text-gray-400">Ask anything about your database in plain English</p>
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex gap-2">
            <input
              className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition"
              placeholder='e.g. "Show top 5 customers by loyalty points"'
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runQuery()}
            />
            <button
              onClick={runQuery}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-300 text-white px-5 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition"
            >
              <Send size={14} />
              {loading ? "Running..." : "Run"}
            </button>
          </div>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-auto p-6 space-y-4">

          {/* Confirmation Dialog */}
          {confirmation && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
                <AlertTriangle size={16} />
                This query will modify your database. Are you sure?
              </div>
              <div className="bg-white border border-amber-100 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Generated SQL</p>
                <code className="text-sm text-gray-700 whitespace-pre-wrap">{confirmation.sql}</code>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={confirmExecution}
                  className="bg-amber-500 hover:bg-amber-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                >
                  ✅ Yes, Execute
                </button>
                <button
                  onClick={() => setConfirmation(null)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Success Message */}
          {result?.message && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-emerald-700 text-sm">
              <CheckCircle size={16} />
              {result.message}
            </div>
          )}

          {/* Generated SQL */}
          {result?.sql && !result?.message && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-400 font-medium mb-2 uppercase tracking-wide">Generated SQL</p>
              <code className="text-sm text-indigo-700 whitespace-pre-wrap">{result.sql}</code>
            </div>
          )}

          {/* Results Table */}
          {result?.rows?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                  {result.rows.length} row{result.rows.length !== 1 ? "s" : ""} returned
                </p>
                <button
                  onClick={exportCSV}
                  className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-1 rounded-lg transition font-medium"
                >
                  ⬇ Export CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {result.columns.map((col) => (
                        <th key={col} className="px-4 py-2 text-left text-indigo-600 font-semibold text-xs uppercase tracking-wide">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, i) => (
                      <tr key={i} className="border-t border-gray-100 hover:bg-gray-50 transition">
                        {result.columns.map((col) => (
                          <td key={col} className="px-4 py-2 text-gray-700 text-xs">
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

          {result?.rows?.length === 0 && !result?.error && !result?.message && result?.sql && (
            <p className="text-gray-400 text-sm">No results found.</p>
          )}
        </div>
      </div>

      {/* RIGHT — Schema */}
      <div className="w-64 bg-white border-l border-gray-200 flex flex-col shadow-sm">
        <div className="p-4 border-b border-gray-200 flex items-center gap-2">
          <Database size={16} className="text-indigo-500" />
          <span className="font-semibold text-sm text-gray-700">Database Schema</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {Object.entries(schema).map(([table, columns]) => (
            <div key={table} className="bg-gray-50 border border-gray-100 rounded-lg p-2">
              <p className="text-indigo-600 text-xs font-semibold mb-1">📋 {table}</p>
              {columns.map(([col, type]) => (
                <div key={col} className="flex justify-between text-xs py-0.5">
                  <span className="text-gray-600">{col}</span>
                  <span className="text-gray-400">{type}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}