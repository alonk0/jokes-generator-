import { DEMO, type DemoState } from "./demo";
import styles from "./DemoPanel.module.css";

const STATES = Object.keys(DEMO.buttons) as DemoState[];

export default function DemoPanel({ onSelect }: { onSelect: (state: DemoState) => void }) {
  return (
    <aside className={styles.panel} aria-label={DEMO.notice}>
      <p className={styles.notice}>{DEMO.notice}</p>
      <div className={styles.buttons}>
        {STATES.map((state) => (
          <button
            key={state}
            type="button"
            className={styles.button}
            onClick={() => onSelect(state)}
          >
            {DEMO.buttons[state]}
          </button>
        ))}
      </div>
    </aside>
  );
}
