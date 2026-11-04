import { sessionCodeSchema } from "@misthy/shared";
import { lazy, Suspense } from "react";
import { getMessages } from "./i18n";
import { AdminPage } from "./pages/admin-page";
import { DesignSystemPage } from "./pages/design-system-page";
import { HomePage } from "./pages/home-page";
import { PlayPage } from "./pages/play-page";
import { ContentAdminPage } from "./pages/content-admin-page";

const DisplayPage = lazy(() =>
  import("./pages/display-page").then((module) => ({ default: module.DisplayPage })),
);

function resolveRoute(pathname: string) {
  const match = pathname.match(/^\/(play|display|admin)\/([^/]+)(?:\/(content))?\/?$/);
  if (!match) return null;
  const code = sessionCodeSchema.safeParse(match[2]);
  if (!code.success) return null;
  const role = match[1] as "play" | "display" | "admin";
  return { role, sessionCode: code.data, section: match[3] };
}

export function App() {
  if (import.meta.env.DEV && window.location.pathname === "/dev/design-system") {
    return <DesignSystemPage />;
  }
  const route = resolveRoute(window.location.pathname);
  if (!route) return <HomePage />;
  if (route.role === "play") return <PlayPage sessionCode={route.sessionCode} />;
  if (route.role === "display")
    return (
      <Suspense
        fallback={
          <main className="presentation-shell">
            <p role="status">{getMessages().display.connecting}</p>
          </main>
        }
      >
        <DisplayPage sessionCode={route.sessionCode} />
      </Suspense>
    );
  if (route.section === "content") return <ContentAdminPage sessionCode={route.sessionCode} />;
  return <AdminPage sessionCode={route.sessionCode} />;
}
