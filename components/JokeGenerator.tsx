"use client";

import { useEffect, useRef, useState } from "react";
import { messageForFailure } from "@/lib/errors";
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
const COPIED_MS = 2000;

export default function JokeGenerator() {
  const [topic, setTopic] = useState("");
  const [view, setView] = useState<View>(INITIAL_VIEW);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  // Identifies the active request; late updates from older requests are ignored.
  const requestIdRef = useRef(0);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isStreaming = view.status === "streaming";

  function resetCopy() {
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = null;
    setCopied(false);
    setCopyFailed(false);
  }

  // Cancel an active request and the copy timer when the component unmounts.
  useEffect(
    () => () => {
      controllerRef.current?.abort();
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    },
    [],
  );

  async function generate() {
    const id = ++requestIdRef.current;
    const controller = new AbortController();
    controllerRef.current = controller;
    resetCopy();
    // The previous joke is cleared only when a new generation starts.
    setView({ status: "streaming", joke: "", errorMessage: "" });

    const result = await streamJoke(topic, {
      signal: controller.signal,
      onDelta: (text) => {
        if (requestIdRef.current !== id) return;
        setView((v) => ({ ...v, joke: v.joke + text }));
      },
    });

    if (requestIdRef.current !== id) return;
    controllerRef.current = null;

    if (result.status === "completed") {
      setView((v) => ({ ...v, status: "completed" }));
    } else if (result.status === "aborted") {
      setView((v) => ({ ...v, status: "stopped" }));
    } else {
      setView((v) => ({ ...v, status: "error", errorMessage: messageForFailure(result.failure) }));
    }
  }

  function stop() {
    // Invalidate the request first so nothing it sends later reaches the view.
    requestIdRef.current++;
    controllerRef.current?.abort();
    controllerRef.current = null;
    // Stopped by the user: keep the partial text, no message.
    setView((v) => ({ ...v, status: "stopped" }));
  }

  async function copy() {
    if (view.status !== "completed") return;
    resetCopy();
    try {
      await navigator.clipboard.writeText(view.joke);
      setCopied(true);
      copiedTimerRef.current = setTimeout(() => setCopied(false), COPIED_MS);
    } catch {
      setCopyFailed(true);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isStreaming) stop();
    else void generate();
  }

  const errorMessage =
    view.status === "error" ? view.errorMessage : copyFailed ? STRINGS.copyFailed : "";

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

      {errorMessage && <ErrorMessage message={errorMessage} />}

      <JokeCard status={view.status} joke={view.joke} copied={copied} onCopy={copy} />
    </div>
  );
}
