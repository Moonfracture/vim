import { useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { Icon } from '../lib/icons.jsx';
import { CRITERIA_BY_ID } from '../lib/scoring.js';

// Drag-and-drop ranking of criteria. Order = priority (top is most important).
export default function CriteriaRanker({ order, setOrder }) {
  return (
    <div>
      <Reorder.Group axis="y" values={order} onReorder={setOrder} className="space-y-2">
        {order.map((id, i) => (
          <CriteriaItem key={id} id={id} rank={i + 1} />
        ))}
      </Reorder.Group>
      <p className="mt-3 text-xs text-slate-500">
        <Icon.drag size={13} className="mb-0.5 mr-1 inline" />
        Влачи, за да подредиш. Най-горе = най-важно за теб.
      </p>
    </div>
  );
}

function CriteriaItem({ id, rank }) {
  const c = CRITERIA_BY_ID[id];
  const controls = useDragControls();
  const [dragging, setDragging] = useState(false);

  return (
    <Reorder.Item
      value={id}
      dragListener={false}
      dragControls={controls}
      onDragStart={() => setDragging(true)}
      onDragEnd={() => setDragging(false)}
      whileDrag={{ scale: 1.02 }}
      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
        dragging ? 'border-accent/60 bg-accent/10' : 'border-white/10 bg-white/[0.03]'
      }`}
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accent/15 text-xs font-bold text-accent-soft ring-1 ring-accent/30">
        {rank}
      </span>
      <span className="text-slate-400"><c.icon size={18} /></span>
      <span className="flex-1 text-sm font-medium text-slate-200">{c.label}</span>
      <button
        type="button"
        onPointerDown={(e) => controls.start(e)}
        className="cursor-grab touch-none text-slate-500 transition-colors hover:text-slate-300 active:cursor-grabbing"
        aria-label="Влачи"
      >
        <Icon.drag size={18} />
      </button>
    </Reorder.Item>
  );
}
