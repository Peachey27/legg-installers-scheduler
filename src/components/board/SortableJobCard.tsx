"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import type { Job } from "@/lib/types";
import JobCard from "../jobs/JobCard";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Props = {
  job: Job;
  listId: string;
  compact?: boolean;
  openOnClick?: boolean;
};

const PRESS_DELAY_MS = 140;

export default function SortableJobCard({
  job,
  listId,
  compact = false,
  openOnClick = true
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: job.id,
    data: { type: "job", job, listId }
  });

  const [pressed, setPressed] = useState(false);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);
  useEffect(() => {
    if (!isDragging) setPressed(false);
  }, [isDragging]);

  const setPressedSoon = useCallback(() => {
    clearTimer();
    timerRef.current = window.setTimeout(() => setPressed(true), PRESS_DELAY_MS);
  }, [clearTimer]);

  const handlePressStart = useCallback(
    (event: React.PointerEvent) => {
      if (event.pointerType === "touch") {
        setPressedSoon();
      } else {
        setPressed(true);
      }
    },
    [setPressedSoon]
  );

  const handlePressEnd = useCallback(() => {
    clearTimer();
    setPressed(false);
  }, [clearTimer]);

  const dragTransform = CSS.Transform.toString(transform);
  const visualTransform = useMemo(() => {
    if (isDragging || pressed) {
      return `${dragTransform} rotate(-1.5deg) scale(1.03)`;
    }
    return dragTransform;
  }, [dragTransform, isDragging, pressed]);

  const mergedListeners = {
    ...listeners,
    onPointerDown: (event: React.PointerEvent) => {
      handlePressStart(event);
      listeners?.onPointerDown?.(event);
    },
    onPointerUp: (event: React.PointerEvent) => {
      handlePressEnd();
      listeners?.onPointerUp?.(event);
    },
    onPointerCancel: (event: React.PointerEvent) => {
      handlePressEnd();
      listeners?.onPointerCancel?.(event);
    },
    onPointerLeave: (event: React.PointerEvent) => {
      if (!isDragging) handlePressEnd();
      listeners?.onPointerLeave?.(event);
    }
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...mergedListeners}
      style={{
        transform: visualTransform,
        transition,
        zIndex: isDragging ? 999 : undefined,
        boxShadow: isDragging || pressed ? "0 10px 24px rgba(15, 23, 42, 0.22)" : undefined,
        touchAction: isDragging ? "none" : "pan-y"
      }}
      className={`${isDragging ? "opacity-95" : ""} ${
        pressed ? "ring-2 ring-amber-300 rounded-xl" : ""
      } cursor-grab active:cursor-grabbing`}
    >
      <JobCard job={job} compact={compact} openOnClick={openOnClick} />
    </div>
  );
}
