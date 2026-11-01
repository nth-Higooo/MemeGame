import { cn } from "../lib/utils";

export function DecorativeSparkle({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={cn("celestial-sparkle", className)} viewBox="0 0 32 32">
      <path d="M16 1.5c.9 9.8 4.7 13.6 14.5 14.5C20.7 16.9 16.9 20.7 16 30.5 15.1 20.7 11.3 16.9 1.5 16 11.3 15.1 15.1 11.3 16 1.5Z" />
    </svg>
  );
}

export function DecorativeCloud({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={cn("celestial-cloud", className)} viewBox="0 0 240 112">
      <path
        className="cloud-shadow"
        d="M29 93c-16 0-27-10-27-24 0-13 10-23 24-24 5-21 23-35 45-35 20 0 37 11 44 29 7-7 17-11 28-11 22 0 40 16 43 37 4-2 9-3 14-3 17 0 31 11 31 25 0 15-14 25-33 25H29Z"
      />
      <path
        className="cloud-body"
        d="M27 84C12 84 2 75 2 62s10-22 24-23C31 18 49 4 71 4c20 0 37 11 44 29 7-7 17-11 28-11 22 0 40 16 43 37 4-2 9-3 14-3 17 0 31 11 31 25 0 15-14 25-33 25H27Z"
      />
      <path
        className="cloud-highlight"
        d="M37 40c8-16 21-24 39-24 9 0 18 3 25 8-21-2-35 5-43 20-7 13-16 20-28 20-6 0-11-2-15-5 11-1 18-7 22-19Z"
      />
    </svg>
  );
}

export function CelestialBackground({
  tone = "light",
  contained = false,
}: {
  tone?: "light" | "stage";
  contained?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "celestial-scene",
        tone === "stage" && "celestial-scene-stage",
        contained && "celestial-scene-contained",
      )}
    >
      <div className="celestial-haze celestial-haze-one" />
      <div className="celestial-haze celestial-haze-two" />
      <DecorativeSparkle className="sparkle-a" />
      <DecorativeSparkle className="sparkle-b" />
      <DecorativeSparkle className="sparkle-c" />
      <span className="tiny-star star-a" />
      <span className="tiny-star star-b" />
      <span className="tiny-star star-c" />
      <DecorativeCloud className="cloud-a" />
      <DecorativeCloud className="cloud-b" />
      <div className="celestial-grain" />
    </div>
  );
}
