import { playerVi } from "./player-vi";
import { displayVi } from "./display-vi";
import { adminVi } from "./admin-vi";
import { themeVi } from "./theme-vi";

export const supportedLocales = ["vi"] as const;
export type Locale = (typeof supportedLocales)[number];
export const defaultLocale: Locale = "vi";

const catalogs = {
  vi: {
    player: playerVi,
    display: displayVi,
    admin: adminVi,
    theme: themeVi,
    home: {
      title: "Chọn meme.",
      subtitle: "Cùng bật cười.",
      join: "Vào phòng chơi",
      roles: "Chọn giao diện",
      ready: "Sẵn sàng",
      pick: "Chọn meme",
      vote: "Bình chọn",
      result: "Xem kết quả",
    },
    brand: {
      title: "Meme Party",
      name: "Meme",
      suffix: "Party",
      homeLabel: "Meme Party — trang chủ",
    },
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
