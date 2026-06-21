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
        <p className="mt-6 text-xs text-forest/40">© {new Date().getFullYear()} УниКомпас · Хакатон проект „Избор на университет“</p>
      </div>
    </footer>
  );
}
