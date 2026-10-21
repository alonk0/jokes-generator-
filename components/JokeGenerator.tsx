"use client";

import { useEffect, useRef, useState } from "react";
import type { GenerationStatus } from "@/lib/generation";
import { STRINGS } from "@/lib/strings";
import DemoPanel from "./DemoPanel";
import ErrorMessage from "./ErrorMessage";
import JokeCard from "./JokeCard";
import TopicInput from "./TopicInput";
import { DEMO, type DemoState } from "./demo";
import { SparkleIcon, StopIcon } from "./icons";
import styles from "./JokeGenerator.module.css";

type View = {
  status: GenerationStatus;
  joke: string;
  errorMessage: string;
};

const INITIAL_VIEW: View = { status: "idle", joke: "", errorMessage: "" };

export default function JokeGenerator() {
  const [topic, setTopic] = useState("");
  const [view, setView] = useState<View>(INITIAL_VIEW);
  const previousView = useRef<View>(INITIAL_VIEW);
  const demoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isStreaming = view.status === "streaming";

  function clearDemoTimer() {
    if (demoTimer.current) {
      clearTimeout(demoTimer.current);
      demoTimer.current = null;
    }
  }

  useEffect(() => clearDemoTimer, []);

  // Demo flow: show the waiting state, then a fixed demo joke. No network call.
  function startDemo() {
    clearDemoTimer();
    previousView.current = view;
    setView({ status: "streaming", joke: "", errorMessage: "" });
    demoTimer.current = setTimeout(() => {
      demoTimer.current = null;
      setView({ status: "completed", joke: DEMO.joke, errorMessage: "" });
    }, DEMO.waitMs);
  }

  function stopDemo() {
    clearDemoTimer();
    setView(previousView.current);
  }

  function showDemoState(state: DemoState) {
    clearDemoTimer();
    switch (state) {
      case "empty":
        setView(INITIAL_VIEW);
        break;
      case "waiting":
        setView({ status: "streaming", joke: "", errorMessage: "" });
        break;
      case "joke":
        setView({ status: "completed", joke: DEMO.joke, errorMessage: "" });
        break;
      case "error":
        setView({ status: "error", joke: DEMO.partialJoke, errorMessage: STRINGS.genericError });
        break;
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isStreaming) {
      stopDemo();
    } else {
      startDemo();
    }
  }

  return (
    <div className={styles.generator}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <TopicInput value={topic} onChange={setTopic} />
        <button
          type="submit"
          className={`${styles.primary} ${isStreaming ? styles.stop : ""}`}
        >
          {isStreaming ? <StopIcon /> : <SparkleIcon />}
          {isStreaming ? STRINGS.stop : STRINGS.generate}
        </button>
      </form>

      {view.status === "error" && view.errorMessage && (
        <ErrorMessage message={view.errorMessage} />
      )}

      <JokeCard status={view.status} joke={view.joke} badge={DEMO.badge} />

      <DemoPanel onSelect={showDemoState} />
    </div>
  );
}
