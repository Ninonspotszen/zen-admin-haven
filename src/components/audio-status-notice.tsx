import { useTranslation } from "react-i18next";
import type { AudioStatus } from "@/lib/player-hooks";

/**
 * Message discret sous la barre de progression du lecteur (fond sombre).
 * role="status" + aria-live : le message est aussi annoncé par les lecteurs d'écran.
 */
export function AudioStatusNotice({ status, onRetry }: { status: AudioStatus; onRetry: () => void }) {
  const { t } = useTranslation();
  const message = status === "ok" ? "" : t(`player.status.${status}`);
  const canRetry = status === "slow" || status === "error";
  return (
    <div role="status" aria-live="polite" className="mt-3 min-h-[1.25rem] text-center text-[13px] leading-snug" style={{ color: "#D8D4CC" }}>
      {message && (
        <p className="mx-auto max-w-[300px]">
          {message}
          {canRetry && (
            <>
              {" "}
              <button type="button" onClick={onRetry} className="underline underline-offset-2 font-semibold" style={{ color: "#F0EDE8" }}>
                {t("player.status.retry")}
              </button>
            </>
          )}
        </p>
      )}
    </div>
  );
}
