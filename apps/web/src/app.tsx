import { sessionCodeSchema } from "@misthy/shared";
import { AdminPage } from "./pages/admin-page";
import { DesignSystemPage } from "./pages/design-system-page";
import { DisplayPage } from "./pages/display-page";
import { HomePage } from "./pages/home-page";
import { PlayPage } from "./pages/play-page";

function resolveRoute(pathname: string) {
  const match = pathname.match(/^\/(play|display|admin)\/([^/]+)\/?$/);
  if (!match) return null;
  const code = sessionCodeSchema.safeParse(match[2]);
  if (!code.success) return null;
  const role = match[1] as "play" | "display" | "admin";
  return { role, sessionCode: code.data };
}

export function App() {
  if (import.meta.env.DEV && window.location.pathname === "/dev/design-system") {
    return <DesignSystemPage />;
  }
  const route = resolveRoute(window.location.pathname);
  if (!route) return <HomePage />;
  if (route.role === "play") return <PlayPage sessionCode={route.sessionCode} />;
  if (route.role === "display") return <DisplayPage sessionCode={route.sessionCode} />;
  return <AdminPage sessionCode={route.sessionCode} />;
}
