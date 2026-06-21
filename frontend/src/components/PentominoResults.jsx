import UniversityCard from './UniversityCard.jsx';
import { Icon } from '../lib/icons.jsx';

// X-pentomino: best-match BG university in the center, four ranked unis in the corners.
// `homeControl` pins a pager inside the center (BG) card; `cornerControl` pages the corners.
export default function PentominoResults({ results, order, field, home, homeControl, cornerControl }) {
  const [tl, tr, bl, br] = [results[0], results[1], results[2], results[3]];

  return (
    <div>
      {cornerControl && <div className="mb-4 flex justify-end">{cornerControl}</div>}

      {/* desktop: true X layout (3x3 grid, corners + center) */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-3">
        <Cell card={tl} order={order} field={field} delay={0.05} />
        <div className="flex items-center justify-center">
          <ConnectorDown />
        </div>
        <Cell card={tr} order={order} field={field} delay={0.1} />

        <div className="flex items-center justify-center"><ConnectorRight /></div>
        <Cell card={home} order={order} field={field} center delay={0} control={homeControl} />
        <div className="flex items-center justify-center"><ConnectorRight flip /></div>

        <Cell card={bl} order={order} field={field} delay={0.15} />
        <div className="flex items-center justify-center"><ConnectorDown flip /></div>
        <Cell card={br} order={order} field={field} delay={0.2} />
      </div>

      {/* mobile/tablet: center first, then stacked corners */}
      <div className="grid gap-4 sm:grid-cols-2 lg:hidden">
        {home && (
          <div className="sm:col-span-2">
            <UniversityCard data={home} order={order} field={field} center control={homeControl} />
          </div>
        )}
        {results.map((r, i) => (
          <UniversityCard key={r.name} data={r} order={order} field={field} delay={0.05 * i} />
        ))}
      </div>
    </div>
  );
}

function Cell({ card, order, field, center, delay, control }) {
  if (!card) return <div className="glass grid place-items-center p-5 text-sm text-forest/50">Няма съвпадение</div>;
  return <UniversityCard data={card} order={order} field={field} center={center} delay={delay} control={control} />;
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
