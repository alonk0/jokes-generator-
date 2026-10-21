import Image from "next/image";
import JokeGenerator from "@/components/JokeGenerator";
import { STRINGS } from "@/lib/strings";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          {STRINGS.appName}{" "}
          <span className={styles.emoji} aria-hidden="true">
            😂
          </span>
        </h1>
        <p className={styles.subtitle}>{STRINGS.subtitle}</p>
      </header>

      <JokeGenerator />

      <footer className={styles.footer}>
        <Image
          src="/illustrations/friends.webp"
          alt=""
          width={558}
          height={404}
          className={styles.friends}
        />
        <p className={styles.footerText}>{STRINGS.footer}</p>
      </footer>
    </main>
  );
}
