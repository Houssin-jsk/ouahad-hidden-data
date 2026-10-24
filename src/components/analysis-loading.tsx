"use client";
import type { LoadingFrame } from "@/loading/presentation";
import { LoadingStages } from "./loading-stages";
import { LoadingStatus } from "./loading-status";
import { useEffect, useRef } from "react";
import type { ImageSource } from "@/analysis/types";
import { PRESENTATION_STAGES } from "@/loading/presentation";
export function AnalysisLoading({
  frame,
  onCancel,
  source,
}: {
  frame: LoadingFrame;
  onCancel: () => void;
  source: ImageSource;
}) {
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = section.current;
    if (!node) return;
    node.focus({ preventScroll: true });
    node.scrollIntoView({
      block: window.innerWidth <= 820 ? "start" : "nearest",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, []);
  return (
    <section
      ref={section}
      tabIndex={-1}
      className="analysis-loading"
      aria-label="Analysis progress"
    >
      <div className="loading-heading">
        <div>
          <span className="eyebrow">A closer look</span>
          <h2 key={frame.presentedIndex}>
            {PRESENTATION_STAGES[frame.presentedIndex].label}
            <span className="loading-title-dot">.</span>
          </h2>
        </div>
        <span className="processing-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </div>
      <div className="loading-preview">
        {/* Local blob pixels never enter image optimization or a remote service. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={source.url} alt="Image being analyzed" />
      </div>
      <div
        className="loading-progress"
        role="progressbar"
        aria-label="Analysis stages"
        aria-valuemin={0}
        aria-valuemax={6}
        aria-valuenow={Math.min(6, Math.floor(frame.progress * 6))}
        aria-valuetext={`${PRESENTATION_STAGES[frame.presentedIndex].label}. ${frame.workReady ? "Results ready." : "Analysis is still running."} Stages are milestones, not a percentage of work.`}
      >
        <span style={{ width: `${frame.progress * 100}%` }} />
      </div>
      <div className="loading-progress-caption">
        <span>Processing in your browser</span>
        <span>{String(frame.presentedIndex + 1).padStart(2, "0")} / 06</span>
      </div>
      <LoadingStages frame={frame} />
      <LoadingStatus frame={frame} />
      <button className="text-button loading-cancel" onClick={onCancel}>
        Cancel analysis
      </button>
    </section>
  );
}
