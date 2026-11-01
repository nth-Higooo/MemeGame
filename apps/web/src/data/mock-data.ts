export type MockMeme = {
  id: string;
  title: string;
  alt: string;
  emoji: string;
  gradient: string;
  tag: string;
};

export const mockRound = {
  number: 1,
  totalRounds: 5,
  secondsLeft: 24,
  prompt: "Khi admin bảo “chương trình hôm nay đơn giản lắm”...",
  submitted: 21,
  players: 28,
} as const;

export const mockMemes: MockMeme[] = [
  {
    id: "alo",
    title: "Ủa alo?",
    alt: "Gương mặt bất ngờ với ánh sáng tím hồng",
    emoji: "😳",
    gradient: "from-violet-300 via-fuchsia-300 to-orange-200",
    tag: "Bất ngờ",
  },
  {
    id: "het-cuu",
    title: "Hết cứu",
    alt: "Biểu cảm tan chảy trên nền cam đào",
    emoji: "😵",
    gradient: "from-orange-200 via-rose-300 to-fuchsia-300",
    tag: "Bất lực",
  },
  {
    id: "qua-du",
    title: "Quá dữ",
    alt: "Biểu cảm tự tin trên nền xanh bạc hà",
    emoji: "💅",
    gradient: "from-emerald-200 via-cyan-200 to-violet-300",
    tag: "Slay",
  },
  {
    id: "tinh-tao",
    title: "Tỉnh táo lên",
    alt: "Ánh mắt dò xét trên nền xanh tím",
    emoji: "👀",
    gradient: "from-sky-200 via-indigo-300 to-violet-400",
    tag: "Quan sát",
  },
  {
    id: "xin-loi",
    title: "Xin lỗi được chưa?",
    alt: "Biểu cảm cầu hòa trên nền hồng kem",
    emoji: "😭",
    gradient: "from-amber-100 via-pink-200 to-rose-300",
    tag: "Năn nỉ",
  },
  {
    id: "khong-biet",
    title: "Không biết gì hết",
    alt: "Biểu cảm vô tội trên nền bạc hà tím",
    emoji: "🤭",
    gradient: "from-teal-200 via-purple-200 to-pink-200",
    tag: "Vô tội",
  },
];

export const mockPlayers = [
  { name: "Mèo Cam", initials: "MC", status: "Đã gửi", score: 240 },
  { name: "Bánh Mì", initials: "BM", status: "Đã gửi", score: 190 },
  { name: "Mây Tím", initials: "MT", status: "Đang chọn", score: 160 },
  { name: "Cá Con", initials: "CC", status: "Đã gửi", score: 120 },
] as const;
