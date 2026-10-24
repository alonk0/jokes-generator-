import type { GenerationStatus } from "@/lib/generation";
import { STRINGS } from "@/lib/strings";
import { CopyIcon } from "./icons";
import styles from "./JokeCard.module.css";

type Props = {
  status: GenerationStatus;
  joke: string;
  copied: boolean;
  onCopy: () => void;
};

export default function JokeCard({ status, joke, copied, onCopy }: Props) {
  const isWaiting = status === "streaming" && joke === "";
  const isEmpty = !isWaiting && joke === "";

  if (isEmpty) {
    return (
      <section className={`${styles.card} ${styles.empty}`}>
        <p className={styles.emptyText}>{STRINGS.emptyState}</p>
      </section>
    );
  }

  return (
    <section
      className={styles.card}
      // Announce only the final text, not every streamed chunk.
      aria-live={status === "streaming" ? "off" : "polite"}
      aria-busy={status === "streaming"}
    >
      {isWaiting ? (
        <div className={styles.loading}>
          <span className={styles.dots} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <p>{STRINGS.loading}</p>
        </div>
      ) : (
        <>
          <p className={styles.joke}>{joke}</p>
          {status === "completed" && (
            // Copying is offered only for a fully completed joke.
            <div className={styles.actions}>
              <button type="button" className={styles.copy} onClick={onCopy}>
                <CopyIcon />
                {copied ? STRINGS.copied : STRINGS.copy}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
