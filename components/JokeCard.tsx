import Image from "next/image";
import type { GenerationStatus } from "@/lib/generation";
import { STRINGS } from "@/lib/strings";
import { CopyIcon } from "./icons";
import styles from "./JokeCard.module.css";

type Props = {
  status: GenerationStatus;
  joke: string;
};

export default function JokeCard({ status, joke }: Props) {
  const isWaiting = status === "streaming" && joke === "";
  const isEmpty = !isWaiting && joke === "";

  if (isEmpty) {
    return (
      <section className={`${styles.card} ${styles.empty}`}>
        <Image
          src="/illustrations/clown.webp"
          alt=""
          width={180}
          height={180}
          className={styles.clown}
          priority
        />
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
            // Visual only for now; copying is wired in Milestone 3.
            <div className={styles.actions}>
              <button type="button" className={styles.copy}>
                <CopyIcon />
                {STRINGS.copy}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
