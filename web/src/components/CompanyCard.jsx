import { Pill, SectionLabel } from './primitives'
import { IconBuilding, IconPeople } from './Icons'
import { cx } from '../lib/ui'

/**
 * A company, as a trainee would want to read it before applying.
 *
 * What it does, how big it is, what it earns, how it hires and what is open.
 * The openings are labelled as simulated every time, because a figure that looks
 * like a live job listing and is not would send someone to prepare for a job
 * that does not exist.
 */

const Stat = ({ icon: Icon, label, value, sub }) => (
  <div className="min-w-0 rounded-tile border-2 border-hair bg-black/20 px-3 py-2.5">
    <p className="flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-faint">
      {Icon && <Icon size={13} />} {label}
    </p>
    <p className="stat mt-1 text-[17px] font-bold leading-tight">{value}</p>
    {sub && <p className="mt-0.5 truncate text-[11.5px] text-faint">{sub}</p>}
  </div>
)

const DEMAND_TONE = { High: 'text-ember-hi', Steady: 'text-dim', Selective: 'text-faint' }

export function CompanyCard({ profile, roleId = null, className }) {
  if (!profile) return null
  const p = profile

  return (
    <div className={cx('space-y-4', className)}>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-[24px] font-bold leading-tight">{p.full ?? p.name}</h3>
          <Pill active={p.real} dot={false}>
            {p.real ? 'Real company' : 'Invented'}
          </Pill>
        </div>
        <p className="mt-1 text-[13.5px] leading-relaxed text-dim">{p.blurb}</p>
        <p className="mt-1 text-[12px] text-faint">
          {p.hq}
          {p.founded ? ` · founded ${p.founded}` : ''}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <Stat icon={IconPeople} label="Employees" value={`~${p.employeesLabel}`} sub="approximate headcount" />
        <Stat
          icon={IconBuilding}
          label="Turnover"
          value={p.revenue.label}
          sub={[p.revenue.usd, p.revenue.year].filter(Boolean).join(' · ')}
        />
      </div>
      {p.attrition && (
        <p className="-mt-1.5 text-[12px] text-faint">Staff turnover about {p.attrition} a year.</p>
      )}

      <p className="text-[13.5px] leading-relaxed text-dim">{p.description}</p>
      {p.culture && (
        <p className="text-[13.5px] leading-relaxed text-dim">
          <span className="font-bold text-text">Feel of the place. </span>
          {p.culture}
        </p>
      )}

      {p.hiring && (
        <div>
          <SectionLabel>How they usually hire graduates</SectionLabel>
          <ol className="space-y-1.5">
            {p.hiring.process.map((step, i) => (
              <li key={step} className="flex gap-2.5 text-[13px] leading-snug text-dim">
                <span className="stat grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ember text-[11px] font-bold text-[#160c05]">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {p.hiring.focus.map((f) => (
              <Pill key={f} dot={false}>
                {f}
              </Pill>
            ))}
          </div>
          {p.hiring.tips?.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {p.hiring.tips.map((t) => (
                <li key={t} className="text-[12.5px] leading-snug text-faint">
                  Tip: {t}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {p.openings && (
        <div>
          <SectionLabel>What is open (simulated)</SectionLabel>
          <div className="well divide-y divide-hair">
            {p.openings.map((o) => (
              <div
                key={o.roleId}
                className={cx(
                  'flex items-center gap-3 px-3.5 py-2.5',
                  roleId === o.roleId && 'bg-ember/10'
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-bold leading-snug">
                    {o.title}
                    {roleId === o.roleId && <span className="ml-2 text-[11px] text-ember-hi">your target</span>}
                  </p>
                  <p className={cx('text-[11.5px] font-semibold', DEMAND_TONE[o.demand])}>{o.demand} demand</p>
                </div>
                <p className="stat text-right text-[18px] font-bold leading-none">
                  {o.openings.toLocaleString('en-IN')}
                  <span className="block text-[10px] font-semibold text-faint">openings</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[11.5px] leading-relaxed text-faint">{p.disclaimer}</p>
    </div>
  )
}
