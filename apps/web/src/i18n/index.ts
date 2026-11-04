import { playerVi } from "./player-vi";

export const supportedLocales = ["vi"] as const;
export type Locale = (typeof supportedLocales)[number];
export const defaultLocale: Locale = "vi";

const catalogs = {
  vi: {
    player: playerVi,
    brand: { name: "MisThy Meme", suffix: "Party", homeLabel: "MisThy Meme Party — trang chủ" },
    common: { ready: "Sẵn sàng quẩy", session: "Phòng", connected: "Đã kết nối" },
    roles: {
      player: { label: "Người chơi", note: "Tham gia bằng điện thoại" },
      display: { label: "Màn hình", note: "Trình chiếu cho cả phòng" },
      admin: { label: "Điều phối", note: "Quản lý nhịp cuộc chơi" },
    },
  },
} as const;

export type Messages = (typeof catalogs)[typeof defaultLocale];

export function getMessages(locale: Locale = defaultLocale): Messages {
  return catalogs[locale];
}
