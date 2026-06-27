import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Search, Code } from "lucide-react";

export default function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch("http://localhost:8000/history")
      .then(r => r.json())
      .then(data => setHistory(Array.isArray(data) ? data : []));
  }, []);

  const filtered = history.filter((h) => {
    const matchSearch = h.UserQuestion.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ||
      (filter === "safe" && h.WasSuccessful) ||
      (filter === "unsafe" && !h.WasSuccessful);
    return matchSearch && matchFilter;
  });

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-gray-50">

      {/* Header */}
      <div className="px-6 py-5 bg-white border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-800">Query History</h1>
        <p className="text-sm text-gray-400 mt-1">All queries run in this session</p>

        {/* Search + Filter */}
        <div className="flex gap-3 mt-4">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50 transition"
              placeholder="Search queries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {["all", "safe", "unsafe"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition capitalize ${
                  filter === f
                    ? "bg-white text-gray-700 shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">

        {/* List */}
        <div className="w-96 border-r border-gray-100 overflow-y-auto bg-white">
          {filtered.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-10">No queries found</p>
          )}
          {filtered.map((h) => (
            <div
              key={h.HistoryID}
              onClick={() => setSelected(h)}
              className={`px-4 py-3 border-b border-gray-50 cursor-pointer transition ${
                selected?.HistoryID === h.HistoryID
                  ? "bg-emerald-50 border-l-2 border-l-emerald-400"
                  : "hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {h.WasSuccessful ? (
                  <CheckCircle size={11} className="text-emerald-500 flex-shrink-0" />
                ) : (
                  <XCircle size={11} className="text-red-400 flex-shrink-0" />
                )}
                <span className="text-xs text-gray-400">{h.ExecutedAt}</span>
              </div>
              <p className="text-sm text-gray-700 line-clamp-2">{h.UserQuestion}</p>
            </div>
          ))}
        </div>

        {/* Detail */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selected ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Code size={20} className="text-gray-400" />
                </div>
                <p className="text-sm text-gray-400">Select a query to view details</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-2xl">
              {/* Status */}
              <div className="flex items-center gap-2">
                {selected.WasSuccessful ? (
                  <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-600 border border-emerald-100 px-3 py-1 rounded-full font-medium">
                    <CheckCircle size={11} /> Safe Query
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs bg-red-50 text-red-500 border border-red-100 px-3 py-1 rounded-full font-medium">
                    <XCircle size={11} /> Unsafe Query
                  </span>
                )}
                <span className="text-xs text-gray-400">{selected.ExecutedAt}</span>
              </div>

              {/* Question */}
              <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Question</p>
                <p className="text-sm text-gray-700">{selected.UserQuestion}</p>
              </div>

              {/* SQL */}
              <div className="bg-gray-900 rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500 font-mono mb-2">Generated SQL</p>
                <code className="text-sm text-emerald-400 whitespace-pre-wrap font-mono">
                  {selected.GeneratedSQL}
                </code>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}