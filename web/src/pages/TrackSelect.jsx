import { useKnack } from '../store/useKnack'
import { Page, PageHead } from '../components/primitives'
import { TrackCard } from '../components/TrackCard'

export function TrackSelect() {
  const user = useKnack((s) => s.user)
  if (!user) return null

  const weakest = user.weakestTrack

  return (
    <Page>
      <PageHead eyebrow="Practice" title="Pick a track">
        {weakest
          ? `Difficulty adapts to your score in each one. ${
              user.tracks.find((t) => t.id === weakest)?.name
            } is your weakest right now.`
          : 'Difficulty adapts to your score. Start anywhere — they all count the same.'}
      </PageHead>

      <div className="space-y-3.5">
        {user.tracks.map((track, i) => (
          <TrackCard key={track.id} track={track} index={i} />
        ))}
      </div>

      <p className="mt-6 text-center text-[12px] leading-relaxed text-faint">
        A level is four judgement calls and one written response — about five minutes. The
        written stage is worth as much as all four choices together.
      </p>
    </Page>
  )
}
