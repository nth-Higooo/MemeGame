import {
  Activity,
  ArrowRight,
  BarChart3,
  CirclePause,
  Gamepad2,
  LayoutDashboard,
  MoreHorizontal,
  Radio,
  Settings2,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { CelestialBackground } from "../components/celestial-background";
import { Brand } from "../components/brand";
import { ConnectionIndicator } from "../components/connection-indicator";
import { CountdownTimer } from "../components/countdown-timer";
import { GlassBadge } from "../components/glass-badge";
import { GlassButton } from "../components/glass-button";
import { mockPlayers, mockRound } from "../data/mock-data";

const navigation = [
  { label: "Tổng quan", icon: LayoutDashboard, active: true },
  { label: "Người chơi", icon: Users },
  { label: "Các vòng", icon: Gamepad2 },
  { label: "Kết quả", icon: BarChart3 },
  { label: "Cài đặt", icon: Settings2 },
];

export function AdminPage({ sessionCode }: { sessionCode: string }) {
  const progress = Math.round((mockRound.submitted / mockRound.players) * 100);
  return (
    <main className="admin-canvas">
      <CelestialBackground />
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <Brand />
          <nav aria-label="Điều hướng quản trị" className="admin-nav space-y-1">
            {navigation.map(({ label, icon: Icon, active }) => (
              <a key={label} aria-current={active ? "page" : undefined} href="#">
                <Icon aria-hidden="true" size={16} /> {label}
              </a>
            ))}
          </nav>
          <div className="admin-room">
            <span>Mã phòng</span>
            <strong>{sessionCode}</strong>
            <small className="mt-1 block text-[.66rem] text-[var(--ink-muted)]">
              28 người đã tham gia
            </small>
          </div>
        </aside>

        <section className="admin-main">
          <header className="admin-topbar">
            <div className="lg:hidden">
              <Brand compact />
            </div>
            <div className="hidden lg:block">
              <span className="block text-[.65rem] font-bold text-[var(--ink-muted)]">
                CREATIVE CONTROL STUDIO
              </span>
              <strong className="text-sm text-[var(--midnight)]">MisThy Meme Party</strong>
            </div>
            <div className="flex items-center gap-2">
              <ConnectionIndicator label="Trực tiếp" />
              <GlassButton aria-label="Thêm tùy chọn" size="icon" variant="ghost">
                <MoreHorizontal aria-hidden="true" size={18} />
              </GlassButton>
            </div>
          </header>

          <div className="admin-content">
            <div className="admin-heading">
              <div>
                <GlassBadge tone="violet">Bảng điều phối</GlassBadge>
                <h1>Chào buổi tiệc</h1>
                <p>Vòng {mockRound.number} đang nhận meme · mọi hệ thống ổn định</p>
              </div>
              <div className="admin-actions">
                <GlassButton variant="glass">
                  <CirclePause aria-hidden="true" size={16} /> Tạm dừng
                </GlassButton>
                <GlassButton>
                  Chuyển tiết lộ <ArrowRight aria-hidden="true" size={16} />
                </GlassButton>
              </div>
            </div>

            <div className="admin-summary" aria-label="Tóm tắt phiên chơi">
              <Summary
                icon={<Users size={15} />}
                label="Người chơi"
                value={`${mockRound.players} · 27 online`}
              />
              <Summary
                icon={<Activity size={15} />}
                label="Meme đã gửi"
                value={`${mockRound.submitted} · ${progress}%`}
              />
              <Summary icon={<Gamepad2 size={15} />} label="Chế độ" value="Cộng đồng" />
              <Summary icon={<Radio size={15} />} label="Màn hình" value="Đang trình chiếu" />
            </div>

            <div className="control-workspace">
              <div className="space-y-3">
                <section className="control-panel">
                  <div className="round-control-head">
                    <div>
                      <GlassBadge tone="danger">Đang diễn ra</GlassBadge>
                      <h2 className="round-question">{mockRound.prompt}</h2>
                    </div>
                    <CountdownTimer seconds={mockRound.secondsLeft} />
                  </div>
                  <div className="compact-progress">
                    <span style={{ width: `${progress}%` }} />
                  </div>
                  <div className="panel-meta">
                    <span>{mockRound.submitted} meme đã gửi</span>
                    <span>{progress}% hoàn thành</span>
                  </div>
                </section>

                <section className="control-panel">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2>Người chơi gần đây</h2>
                      <p className="mt-1 text-xs text-[var(--ink-muted)]">
                        Trạng thái gửi trong vòng hiện tại
                      </p>
                    </div>
                    <GlassButton size="small" variant="ghost">
                      Xem tất cả
                    </GlassButton>
                  </div>
                  <div className="player-list">
                    {mockPlayers.map((player, index) => (
                      <div className="player-row" key={player.name}>
                        <span className="player-avatar">{player.initials}</span>
                        <div>
                          <strong>{player.name}</strong>
                          <small>{player.status}</small>
                        </div>
                        <div className="flex items-center gap-2">
                          <ConnectionIndicator connected={player.connected} compact />
                          <span className="text-xs font-black text-[var(--periwinkle-700)]">
                            #{index + 1}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="space-y-3">
                <section className="control-panel">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[var(--ink-muted)]">
                        Tiến độ chương trình
                      </span>
                      <h2 className="mt-1">Vòng 1 / 5</h2>
                    </div>
                    <strong className="text-xl text-[var(--periwinkle-700)]">20%</strong>
                  </div>
                  <div className="round-track">
                    {[1, 2, 3, 4, 5].map((round) => (
                      <span className={round === 1 ? "active" : undefined} key={round} />
                    ))}
                  </div>
                </section>
                <section className="control-panel preview-strip">
                  <div className="flex items-center justify-between">
                    <h2>Preview màn hình</h2>
                    <GlassBadge tone="success">Live</GlassBadge>
                  </div>
                  <div className="preview-frame">
                    <small>Vòng 1 · chọn meme</small>
                    <p>{mockRound.prompt}</p>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Summary({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="summary-item">
      <span className="summary-icon">{icon}</span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
