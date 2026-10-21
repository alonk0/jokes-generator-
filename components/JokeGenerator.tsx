"use client";

import { useEffect, useRef, useState } from "react";
import type { GenerationStatus } from "@/lib/generation";
import { streamJoke } from "@/lib/jokeClient";
import { STRINGS } from "@/lib/strings";
import ErrorMessage from "./ErrorMessage";
import JokeCard from "./JokeCard";
import TopicInput from "./TopicInput";
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
  const controllerRef = useRef<AbortController | null>(null);

  const isStreaming = view.status === "streaming";

  // Cancel an active request when the component unmounts.
  useEffect(() => () => controllerRef.current?.abort(), []);

  async function generate() {
    const controller = new AbortController();
    controllerRef.current = controller;
    // The previous joke is cleared only when a new generation starts.
    setView({ status: "streaming", joke: "", errorMessage: "" });

    let received = false;
    const result = await streamJoke(topic, {
      signal: controller.signal,
      onDelta: (text) => {
        received = true;
        setView((v) => ({ ...v, joke: v.joke + text }));
      },
    });

    if (controllerRef.current === controller) controllerRef.current = null;

    if (result === "completed") {
      setView((v) => ({ ...v, status: "completed" }));
    } else if (result === "aborted") {
      // Stopped by the user: keep the partial text, no message.
      setView((v) => ({ ...v, status: "stopped" }));
    } else {
      setView((v) => ({
        ...v,
        status: "error",
        errorMessage: received ? STRINGS.interrupted : STRINGS.genericError,
      }));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isStreaming) {
      // Basic stop; hardened in Milestone 3.
      controllerRef.current?.abort();
    } else {
      void generate();
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

      <JokeCard status={view.status} joke={view.joke} />
    </div>
  );
}
