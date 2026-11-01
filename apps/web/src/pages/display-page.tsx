import { CelestialBackground } from "../components/celestial-background";
import { Brand } from "../components/brand";
import { CountdownTimer } from "../components/countdown-timer";
import { MemeCard } from "../components/meme-card";
import { mockMemes, mockRound } from "../data/mock-data";

export function DisplayPage({ sessionCode }: { sessionCode: string }) {
  const progress = Math.round((mockRound.submitted / mockRound.players) * 100);
  return (
    <main className="stage-shell">
      <CelestialBackground tone="stage" />
      <header className="stage-header">
        <Brand />
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-[#c9cde5] sm:text-sm">
            {mockRound.players} người chơi
          </span>
          <span className="stage-code">{sessionCode}</span>
        </div>
      </header>

      <section className="stage-layout">
        <div>
          <div className="stage-kicker">Vòng {mockRound.number} · Hãy chọn cú chốt</div>
          <h1 className="stage-title">{mockRound.prompt}</h1>
          <div className="stage-progress">
            <div className="stage-progress-row">
              <div className="stage-count">
                <span>Đã nhận meme</span>
                <strong>
                  {mockRound.submitted} <span>/ {mockRound.players}</span>
                </strong>
              </div>
              <CountdownTimer seconds={mockRound.secondsLeft} size="stage" dark />
            </div>
            <div className="stage-bar" aria-label={`${progress}% người chơi đã gửi meme`}>
              <span style={{ width: `${progress}%` }} />
            </div>
            <p className="stage-note">
              Mỗi lựa chọn đã gửi đều được giữ an toàn · còn{" "}
              {mockRound.players - mockRound.submitted} người đang chọn
            </p>
          </div>
        </div>

        <div className="stage-memes" aria-label="Các meme đã gửi ẩn danh">
          {mockMemes.slice(0, 4).map((meme, index) => (
            <MemeCard
              key={meme.id}
              aria-label={`Meme ẩn danh số ${index + 1}`}
              className="pointer-events-none"
              compact
              anonymous
              meme={meme}
            />
          ))}
        </div>
      </section>

      <footer className="stage-footer">
        <span>MisThy Meme Party</span>
        <span>Chọn meme · Chốt khoảnh khắc</span>
      </footer>
    </main>
  );
}
