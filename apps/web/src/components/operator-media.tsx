import { useState } from "react";
import { useReducedMotion } from "motion/react";
import { getMessages } from "../i18n";
import { GlassButton } from "./glass-button";

export function OperatorMedia({ src, alt }: { src: string; alt: string }) {
  const copy = getMessages();
  const reduced = useReducedMotion();
  const [animate, setAnimate] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  if (failed)
    return (
      <div className="control-meme grid place-content-center gap-2 p-3 text-sm">
        <span role="status">{copy.admin.mediaFailure}</span>
        <GlassButton
          variant="ghost"
          onClick={() => {
            setFailed(false);
            setRetry((value) => value + 1);
          }}
        >
          {copy.admin.mediaRetry}
        </GlassButton>
      </div>
    );
  if (reduced && !animate)
    return (
      <GlassButton className="control-meme" onClick={() => setAnimate(true)}>
        {copy.player.phatAnhDong} {alt}
      </GlassButton>
    );
  return (
    <img
      key={retry}
      src={src}
      alt={alt}
      className="control-meme"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
