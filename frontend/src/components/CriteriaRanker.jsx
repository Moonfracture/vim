import { useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { Icon } from '../lib/icons.jsx';
import { CRITERIA, CRITERIA_BY_ID } from '../lib/scoring.js';

// Pick the criteria you care about, then drag to rank them (top = most important).
export default function CriteriaRanker({ order, setOrder }) {
  const unused = CRITERIA.filter((c) => !order.includes(c.id));
  const remove = (id) => setOrder(order.filter((x) => x !== id));
  const add = (id) => setOrder([...order, id]);

  return (
    <div>
      {order.length > 0 ? (
        <Reorder.Group axis="y" values={order} onReorder={setOrder} className="space-y-2">
          {order.map((id, i) => (
            <CriteriaItem key={id} id={id} rank={i + 1} onRemove={() => remove(id)} />
          ))}
        </Reorder.Group>
      ) : (
        <div className="rounded-xl border border-dashed border-white/15 px-4 py-5 text-center text-sm text-slate-500">
          Добави поне един критерий, по който да сравняваме.
        </div>
      )}

      {unused.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 text-[11px] uppercase tracking-wider text-slate-500">Добави критерий</p>
          <div className="flex flex-wrap gap-2">
            {unused.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => add(c.id)}
                className="chip transition-colors hover:border-accent/40 hover:text-white"
              >
                <c.icon size={14} /> {c.label}
                <span className="ml-0.5 text-accent-soft">+</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-slate-500">
        <Icon.drag size={13} className="mb-0.5 mr-1 inline" />
        Влачи, за да подредиш. Най-горе = най-важно. Махни тези, които не те интересуват.
      </p>
    </div>
  );
}

function CriteriaItem({ id, rank, onRemove }) {
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
        onClick={onRemove}
        className="text-slate-500 transition-colors hover:text-red-400"
        aria-label={`Махни ${c.label}`}
      >
        <Icon.close size={16} />
      </button>
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
