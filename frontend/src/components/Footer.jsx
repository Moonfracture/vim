import { Icon } from '../lib/icons.jsx';

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-forest/10">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 font-display font-bold text-forest-ink">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/15 text-accent-soft ring-1 ring-accent/30">
              <Icon.compass size={18} />
            </span>
            УниКомпас
          </div>
          <p className="max-w-md text-xs leading-relaxed text-forest/50">
            Данни: World University Rankings 2026 (QS / THE / ARWU), Tuition Fees 50 Countries,
            Scimago Institutions Rankings (BG). Критериите „нощен живот, паркове, молове, тихо
            място“ са примерни — реалните академични и финансови данни идват от датасетите.
          </p>
        </div>

        <div className="mt-8 border-t border-forest/10 pt-6">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-forest/50">
            Източници за българските университети — РСВУ 2025 (МОН)
          </p>
          <ul className="mt-2 space-y-1 text-xs text-forest/50">
            <li>· Списък на специалностите по професионални направления и висши училища, РСВУ 2025</li>
            <li>· Активни съвместни програми с чужди висши училища, РСВУ 2025</li>
            <li>· Нагласи на работодателите към висшите училища, РСВУ 2025</li>
          </ul>
          <a
            href="https://rsvu.mon.bg"
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-accent-soft hover:underline"
          >
            <Icon.globe size={13} /> Рейтингова система на висшите училища — rsvu.mon.bg
          </a>
        </div>

        <p className="mt-6 text-xs text-forest/40">© {new Date().getFullYear()} УниКомпас · Хакатон проект „Избор на университет“</p>
      </div>
    </footer>
  );
}
