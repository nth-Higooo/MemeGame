import { ArrowRight, CirclePause, Radio, Users } from "lucide-react";
import { AppShell } from "../components/app-shell";
import { GlassCard } from "../components/glass-card";
import { Button } from "../components/ui/button";

export function AdminPage({ sessionCode }: { sessionCode: string }) {
  return (
    <AppShell action={<span className="status-pill"><Radio size={13} /> Trực tiếp · {sessionCode}</span>}>
      <section className="py-8 sm:py-12">
        <div className="flex flex-wrap items-end justify-between gap-5"><div><span className="eyebrow">Bảng điều phối</span><h1 className="mt-3 text-4xl font-black tracking-[-.045em] text-violet-950">Chào buổi tiệc 👋</h1><p className="mt-2 text-violet-950/55">Mọi thứ đang chạy mượt. Vòng 1 đang nhận meme.</p></div><div className="flex gap-2"><Button variant="glass"><CirclePause size={17} /> Tạm dừng</Button><Button>Chuyển tiết lộ <ArrowRight size={17} /></Button></div></div>
        <div className="mt-8 grid gap-5 lg:grid-cols-[1.45fr_.55fr]">
          <GlassCard className="p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4"><div><span className="text-xs font-extrabold uppercase tracking-[.18em] text-fuchsia-600">Đang diễn ra</span><h2 className="mt-3 text-2xl font-extrabold text-violet-950">Khi admin bảo “chương trình hôm nay đơn giản lắm”...</h2></div><div className="countdown">24</div></div>
            <div className="mt-8 h-3 overflow-hidden rounded-full bg-violet-100"><div className="h-full w-3/4 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" /></div>
            <div className="mt-3 flex justify-between text-sm text-violet-950/55"><span>21 meme đã gửi</span><span>75%</span></div>
          </GlassCard>
          <GlassCard className="p-5 sm:p-7"><Users className="text-fuchsia-600" /><span className="mt-6 block text-5xl font-black tracking-[-.06em] text-violet-950">28</span><span className="text-sm text-violet-950/55">người chơi · 27 online</span></GlassCard>
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          {[["Chế độ", "Cộng đồng"], ["Vòng hiện tại", "1 / 5"], ["Trạng thái", "Đang nhận meme"]].map(([label, value]) => <GlassCard key={label} className="p-5"><span className="text-sm text-violet-950/50">{label}</span><strong className="mt-2 block text-xl text-violet-950">{value}</strong></GlassCard>)}
        </div>
      </section>
    </AppShell>
  );
}
