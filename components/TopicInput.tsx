"use client";

import { useRef } from "react";
import { MAX_TOPIC_CHARS, countChars, truncateChars } from "@/lib/text";
import { STRINGS } from "@/lib/strings";
import { ClearIcon } from "./icons";
import styles from "./TopicInput.module.css";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export default function TopicInput({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleClear() {
    onChange("");
    inputRef.current?.focus();
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.field}>
        <input
          ref={inputRef}
          type="text"
          dir="rtl"
          className={styles.input}
          value={value}
          // Not using maxLength: it counts UTF-16 units, not characters.
          onChange={(e) => onChange(truncateChars(e.target.value))}
          placeholder={STRINGS.topicPlaceholder}
          aria-label={STRINGS.topicLabel}
          aria-describedby="topic-counter"
          autoComplete="off"
          enterKeyHint="go"
        />
        {value !== "" && (
          <button
            type="button"
            className={styles.clear}
            onClick={handleClear}
            aria-label={STRINGS.clearTopic}
          >
            <ClearIcon />
          </button>
        )}
      </div>
      <p id="topic-counter" className={styles.counter} dir="ltr">
        {countChars(value)}/{MAX_TOPIC_CHARS}
      </p>
    </div>
  );
}
