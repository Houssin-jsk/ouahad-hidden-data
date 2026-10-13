"use client";
import type { LoadingFrame } from "@/loading/presentation";
import { LoadingStages } from "./loading-stages";
import { LoadingStatus } from "./loading-status";
import { useEffect, useRef } from "react";
import {
  LoadingIllustration,
  type LoadingEvidence,
} from "./loading-illustration";
import type { ImageSource } from "@/analysis/types";
import type { MapUrls } from "./spatial-preview";
import { PRESENTATION_STAGES } from "@/loading/presentation";
export function AnalysisLoading({
  frame,
  onCancel,
  source,
  evidence,
  maps,
}: {
  frame: LoadingFrame;
  onCancel: () => void;
  source: ImageSource;
  evidence: LoadingEvidence | null;
  maps: MapUrls | null;
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
          <span className="eyebrow">HIDDEN DATA / ANALYSIS</span>
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
      <LoadingIllustration
        index={frame.presentedIndex}
        source={source}
        evidence={evidence}
        maps={maps}
      />
      <div
        className="loading-progress"
        role="progressbar"
        aria-label="Result presentation"
        aria-valuemin={0}
        aria-valuemax={6}
        aria-valuenow={Math.min(6, Math.floor(frame.progress * 6))}
        aria-valuetext={`Presentation stage ${frame.presentedIndex + 1} of 6. ${frame.workReady ? "Calculations ready." : "Real analysis still running."}`}
      >
        <span style={{ width: `${frame.progress * 100}%` }} />
      </div>
      <div className="loading-progress-caption">
        <span>STAGED PRESENTATION</span>
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
