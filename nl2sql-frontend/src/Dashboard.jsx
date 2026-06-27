import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Database, Zap, TrendingUp, Clock } from "lucide-react";

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [schema, setSchema] = useState({});

  useEffect(() => {
    fetch("http://localhost:8000/stats").then(r => r.json()).then(setStats);
    fetch("http://localhost:8000/schema").then(r => r.json()).then(setSchema);
  }, []);

  const successRate = stats?.total > 0
    ? Math.round((stats.success / stats.total) * 100)
    : 0;

  return (
    <div className="flex-1 overflow-auto bg-gray-50 p-6">

      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-1">Overview of your database activity</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Total Queries</span>
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <Zap size={15} className="text-gray-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-800">{stats?.total ?? "—"}</p>
          <p className="text-xs text-gray-400 mt-1">All time</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Safe Queries</span>
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
              <CheckCircle size={15} className="text-emerald-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-emerald-600">{stats?.success ?? "—"}</p>
          <p className="text-xs text-gray-400 mt-1">Queries executed</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Unsafe Queries</span>
            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
              <XCircle size={15} className="text-red-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-red-500">{stats?.failed ?? "—"}</p>
          <p className="text-xs text-gray-400 mt-1">Blocked or errored</p>
        </div>
      </div>

      {/* Success Rate + Schema */}
      <div className="grid grid-cols-2 gap-4 mb-6">

        {/* Success Rate */}
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={15} className="text-emerald-500" />
            <span className="text-sm font-semibold text-gray-700">Success Rate</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20">
              <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke="#10b981" strokeWidth="3"
                  strokeDasharray={`${successRate} ${100 - successRate}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-gray-800">{successRate}%</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
                <span className="text-xs text-gray-500">Safe: {stats?.success ?? 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                <span className="text-xs text-gray-500">Unsafe: {stats?.failed ?? 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tables Overview */}
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Database size={15} className="text-emerald-500" />
            <span className="text-sm font-semibold text-gray-700">Tables in Database</span>
          </div>
          <div className="space-y-2">
            {Object.entries(schema)
              .filter(([t]) => t !== "query_history")
              .map(([table, columns]) => (
                <div key={table} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                    <span className="text-xs font-medium text-gray-700">{table}</span>
                  </div>
                  <span className="text-xs text-gray-400">{columns.length} columns</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <Clock size={14} className="text-emerald-500" />
          <span className="text-sm font-semibold text-gray-700">Recent Activity</span>
        </div>
        <div className="divide-y divide-gray-50">
          {stats?.recent?.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-8">No activity yet</p>
          )}
          {stats?.recent?.map((r, i) => (
            <div key={i} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition">
              {r.success ? (
                <div className="w-6 h-6 bg-emerald-50 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle size={12} className="text-emerald-500" />
                </div>
              ) : (
                <div className="w-6 h-6 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0">
                  <XCircle size={12} className="text-red-400" />
                </div>
              )}
              <p className="text-sm text-gray-600 flex-1 line-clamp-1">{r.question}</p>
              <span className="text-xs text-gray-400 flex-shrink-0">{r.time}</span>
            </div>
          ))}
        </div>
        {stats?.total > 5 && (
          <div className="px-5 py-3 border-t border-gray-100">
            <button
              onClick={() => onNavigate("history")}
              className="text-xs text-emerald-600 hover:text-emerald-500 font-medium transition"
            >
              View all {stats.total} queries →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}