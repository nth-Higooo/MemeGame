export type MemeArt = "side-eye" | "meltdown" | "spotlight" | "detective" | "apology" | "innocent";

export type MockMeme = {
  id: string;
  title: string;
  alt: string;
  art: MemeArt;
  palette: readonly [string, string, string];
  tag: string;
  reactions: number;
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
    alt: "Nhân vật tròn mắt nhìn nghiêng trong khung cảnh tím hồng",
    art: "side-eye",
    palette: ["var(--accent-blossom)", "var(--accent-pink)", "var(--accent-jasmine)"],
    tag: "Bất ngờ",
    reactions: 42,
  },
  {
    id: "het-cuu",
    title: "Hết cứu",
    alt: "Nhân vật tan chảy giữa hoàng hôn màu đào",
    art: "meltdown",
    palette: ["var(--accent-peach)", "var(--accent-pink)", "var(--accent-lavender)"],
    tag: "Bất lực",
    reactions: 31,
  },
  {
    id: "qua-du",
    title: "Quá dữ",
    alt: "Nhân vật đứng dưới ánh đèn sân khấu xanh bạc hà",
    art: "spotlight",
    palette: ["var(--accent-honeydew)", "var(--accent-light-peach)", "var(--accent-blossom)"],
    tag: "Slay",
    reactions: 58,
  },
  {
    id: "tinh-tao",
    title: "Tỉnh táo lên",
    alt: "Nhân vật cầm kính lúp trên nền trời xanh tím",
    art: "detective",
    palette: ["var(--accent-light-peach)", "var(--accent-lavender)", "var(--accent-blossom)"],
    tag: "Quan sát",
    reactions: 26,
  },
  {
    id: "xin-loi",
    title: "Xin lỗi được chưa?",
    alt: "Hai bàn tay chắp lại bên đám mây hồng đào",
    art: "apology",
    palette: ["var(--accent-jasmine)", "var(--accent-pink)", "var(--accent-peach)"],
    tag: "Năn nỉ",
    reactions: 37,
  },
  {
    id: "khong-biet",
    title: "Không biết gì hết",
    alt: "Nhân vật nép sau đám mây xanh bạc hà",
    art: "innocent",
    palette: ["var(--accent-honeydew)", "var(--accent-blossom)", "var(--accent-pink)"],
    tag: "Vô tội",
    reactions: 49,
  },
];

export const mockPlayers = [
  { name: "Mèo Cam", initials: "MC", status: "Đã gửi", score: 240, connected: true },
  { name: "Bánh Mì", initials: "BM", status: "Đã gửi", score: 190, connected: true },
  { name: "Mây Tím", initials: "MT", status: "Đang chọn", score: 160, connected: true },
  { name: "Cá Con", initials: "CC", status: "Đã gửi", score: 120, connected: false },
] as const;

export const mockQuestions = [
  "Khi admin bảo “chương trình hôm nay đơn giản lắm”...",
  "Khoảnh khắc bạn mở camera trước nhưng chưa kịp chuẩn bị...",
  "Khi cả nhóm đồng thanh bảo chỉ chơi thêm một ván...",
] as const;
