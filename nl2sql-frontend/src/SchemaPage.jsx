import { useEffect, useState, useRef } from "react";

export default function SchemaPage() {
  const [schema, setSchema] = useState({});
  const [relationships, setRelationships] = useState([]);
  const [positions, setPositions] = useState({});
  const [dragging, setDragging] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);

  useEffect(() => {
    fetch("http://localhost:8000/schema").then(r => r.json()).then(data => {
      setSchema(data);
      // Auto position tables in grid
      const tables = Object.keys(data).filter(t => t !== "query_history");
      const pos = {};
      tables.forEach((t, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        pos[t] = { x: 40 + col * 280, y: 40 + row * 280 };
      });
      setPositions(pos);
    });
    fetch("http://localhost:8000/relationships").then(r => r.json()).then(setRelationships);
  }, []);

  const handleMouseDown = (e, table) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setDragging(table);
    setOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    const canvas = canvasRef.current.getBoundingClientRect();
    setPositions(prev => ({
      ...prev,
      [dragging]: {
        x: Math.max(0, e.clientX - canvas.left - offset.x),
        y: Math.max(0, e.clientY - canvas.top - offset.y),
      }
    }));
  };

  const handleMouseUp = () => setDragging(null);

  const getTableHeight = (table) => {
    const cols = schema[table] || [];
    return 40 + cols.length * 28;
  };

  const getConnectionPoints = (from, to) => {
    const f = positions[from];
    const t = positions[to];
    if (!f || !t) return null;
    const fw = 220, fh = getTableHeight(from);
    const tw = 220;

    const fx = f.x + fw / 2;
    const fy = f.y + fh / 2;
    const tx = t.x + tw / 2;
    const ty = t.y + getTableHeight(to) / 2;

    // Start/end at table edges
    const startX = f.x + (tx > fx ? fw : 0);
    const startY = f.y + fh / 2;
    const endX = t.x + (fx > tx ? tw : 0);
    const endY = t.y + getTableHeight(to) / 2;

    return { startX, startY, endX, endY };
  };

  const tables = Object.keys(schema).filter(t => t !== "query_history");

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">

      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-800">Schema & ERD</h1>
        <p className="text-sm text-gray-400 mt-1">Drag tables to rearrange. Lines show foreign key relationships.</p>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 overflow-auto relative bg-gray-50"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Grid background */}
        <svg className="absolute inset-0 w-full h-full" style={{ minWidth: 900, minHeight: 700 }}>
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" strokeWidth="1" />
            </pattern>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="8" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#10b981" />
            </marker>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Relationship Lines */}
          {relationships.map((rel, i) => {
            const pts = getConnectionPoints(rel.from, rel.to);
            if (!pts) return null;
            const { startX, startY, endX, endY } = pts;
            const midX = (startX + endX) / 2;
            return (
              <g key={i}>
                <path
                  d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="1.5"
                  strokeDasharray="5,3"
                  markerEnd="url(#arrow)"
                  opacity="0.7"
                />
                {/* Label */}
                <text
                  x={midX}
                  y={(startY + endY) / 2 - 5}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#6b7280"
                  className="select-none"
                >
                  {rel.fromColumn} → {rel.toColumn}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Table Cards */}
        {tables.map((table) => {
          const pos = positions[table];
          if (!pos) return null;
          const columns = schema[table] || [];

          return (
            <div
              key={table}
              className="absolute bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden select-none"
              style={{ left: pos.x, top: pos.y, width: 220, cursor: dragging === table ? "grabbing" : "grab" }}
              onMouseDown={(e) => handleMouseDown(e, table)}
            >
              {/* Table Header */}
              <div className="px-3 py-2 bg-emerald-500 flex items-center gap-2">
                <div className="w-3 h-3 bg-white rounded-sm opacity-80"></div>
                <span className="text-xs font-bold text-white">{table}</span>
                <span className="ml-auto text-xs text-emerald-100">{columns.length} cols</span>
              </div>

              {/* Columns */}
              <div className="divide-y divide-gray-50">
                {columns.map(([col, type]) => (
                  <div key={col} className="flex items-center justify-between px-3 py-1.5">
                    <div className="flex items-center gap-1.5">
                      {col.toLowerCase().includes("id") && col !== "CategoryID" && !col.includes("Customer") && !col.includes("Product") && !col.includes("Order") && !col.includes("Employee") ? (
                        <div className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" title="Primary Key"></div>
                      ) : col.toLowerCase().includes("id") ? (
                        <div className="w-2 h-2 rounded-full bg-blue-300 flex-shrink-0" title="Foreign Key"></div>
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-gray-200 flex-shrink-0"></div>
                      )}
                      <span className="text-xs text-gray-700">{col}</span>
                    </div>
                    <span className="text-xs text-gray-300 font-mono">{type}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="px-6 py-3 bg-white border-t border-gray-100 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
          <span className="text-xs text-gray-500">Primary Key</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-300"></div>
          <span className="text-xs text-gray-500">Foreign Key</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="30" height="10">
            <line x1="0" y1="5" x2="25" y2="5" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4,2" />
          </svg>
          <span className="text-xs text-gray-500">Relationship</span>
        </div>
        <span className="text-xs text-gray-400 ml-auto">💡 Drag tables to rearrange</span>
      </div>
    </div>
  );
}