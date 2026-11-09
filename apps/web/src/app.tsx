import { sessionCodeSchema } from "@misthy/shared";
import { lazy, Suspense } from "react";
import { getMessages } from "./i18n";
import { DesignSystemPage } from "./pages/design-system-page";
import { HomePage } from "./pages/home-page";
import { PlayPage } from "./pages/play-page";
import { ContentAdminPage } from "./pages/content-admin-page";

const DisplayPage = lazy(() =>
  import("./pages/display-page").then((module) => ({ default: module.DisplayPage })),
);
const AdminPage = lazy(() =>
  import("./pages/admin-page").then((module) => ({ default: module.AdminPage })),
);
const JudgePage = lazy(() =>
  import("./pages/admin-page").then((module) => ({ default: module.JudgePage })),
);
const ReviewPage = lazy(() =>
  import("./pages/admin-page").then((module) => ({ default: module.ReviewPage })),
);

function resolveRoute(pathname: string) {
  const match = pathname.match(/^\/(play|display|admin|judge)\/([^/]+)(?:\/(content|review))?\/?$/);
  if (!match) return null;
  const code = sessionCodeSchema.safeParse(match[2]);
  if (!code.success) return null;
  const role = match[1] as "play" | "display" | "admin" | "judge";
  return { role, sessionCode: code.data, section: match[3] };
}

export function App() {
  if (import.meta.env.DEV && window.location.pathname === "/dev/design-system") {
    return <DesignSystemPage />;
  }
  const route = resolveRoute(window.location.pathname);
  if (!route) return <HomePage />;
  if (route.role === "play") return <PlayPage sessionCode={route.sessionCode} />;
  if (route.role === "judge")
    return (
      <Suspense fallback={<p role="status">{getMessages().admin.judgeTitle}</p>}>
        <JudgePage sessionCode={route.sessionCode} />
      </Suspense>
    );
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
  if (route.section === "review")
    return (
      <Suspense fallback={<p role="status">{getMessages().admin.reviewTitle}</p>}>
        <ReviewPage sessionCode={route.sessionCode} />
      </Suspense>
    );
  return (
    <Suspense fallback={<p role="status">{getMessages().admin.title}</p>}>
      <AdminPage sessionCode={route.sessionCode} />
    </Suspense>
  );
}
