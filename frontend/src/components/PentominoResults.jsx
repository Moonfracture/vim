import UniversityCard from './UniversityCard.jsx';
import bulgaria from '../data/bulgaria.json';
import { Icon } from '../lib/icons.jsx';

// X-pentomino: BG in the center, four ranked universities in the corners.
export default function PentominoResults({ results, order }) {
  const [tl, tr, bl, br] = [results[0], results[1], results[2], results[3]];

  return (
    <div>
      {/* desktop: true X layout (3x3 grid, corners + center) */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-3">
        <Cell card={tl} order={order} delay={0.05} />
        <div className="flex items-center justify-center">
          <ConnectorDown />
        </div>
        <Cell card={tr} order={order} delay={0.1} />

        <div className="flex items-center justify-center"><ConnectorRight /></div>
        <Cell card={bulgaria} order={order} center delay={0} />
        <div className="flex items-center justify-center"><ConnectorRight flip /></div>

        <Cell card={bl} order={order} delay={0.15} />
        <div className="flex items-center justify-center"><ConnectorDown flip /></div>
        <Cell card={br} order={order} delay={0.2} />
      </div>

      {/* mobile/tablet: center first, then stacked corners */}
      <div className="grid gap-4 sm:grid-cols-2 lg:hidden">
        <div className="sm:col-span-2">
          <UniversityCard data={bulgaria} order={order} center />
        </div>
        {results.map((r, i) => (
          <UniversityCard key={r.name} data={r} order={order} delay={0.05 * i} />
        ))}
      </div>
    </div>
  );
}

function Cell({ card, order, center, delay }) {
  if (!card) return <div className="glass grid place-items-center p-5 text-sm text-slate-500">Няма съвпадение</div>;
  return <UniversityCard data={card} order={order} center={center} delay={delay} />;
}

function ConnectorRight({ flip }) {
  return (
    <span className={`text-accent/40 ${flip ? 'rotate-180' : ''}`}>
      <Icon.arrow size={26} />
    </span>
  );
}
function ConnectorDown({ flip }) {
  return (
    <span className={`text-accent/40 ${flip ? '-rotate-90' : 'rotate-90'}`}>
      <Icon.arrow size={26} />
    </span>
  );
}
