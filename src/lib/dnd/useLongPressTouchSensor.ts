import { useCallback, useLayoutEffect, useRef } from "react";
import type { PreDragActions, Sensor, SensorAPI } from "@hello-pangea/dnd";

type Position = { x: number; y: number };

const LONG_PRESS_MS = 2000;

function invariant(condition: any, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function getTouchPoint(event: TouchEvent): Position | null {
  const touch = event.touches[0] ?? event.changedTouches[0];
  if (!touch) return null;
  return { x: touch.clientX, y: touch.clientY };
}

export default function useLongPressTouchSensor(api: SensorAPI): Sensor {
  const phaseRef = useRef<
    | { type: "IDLE" }
    | { type: "PENDING"; actions: PreDragActions; point: Position; timer: number }
    | { type: "DRAGGING"; actions: ReturnType<PreDragActions["fluidLift"]> }
  >({ type: "IDLE" });

  const unbindRef = useRef<null | (() => void)>(null);

  const cleanup = useCallback(() => {
    if (unbindRef.current) unbindRef.current();
    unbindRef.current = null;
    const phase = phaseRef.current;
    if (phase.type === "PENDING") {
      window.clearTimeout(phase.timer);
    }
    phaseRef.current = { type: "IDLE" };
  }, []);

  const startDragging = useCallback(() => {
    const phase = phaseRef.current;
    invariant(phase.type === "PENDING", "Expected PENDING phase to start drag");
    const fluid = phase.actions.fluidLift({ x: phase.point.x, y: phase.point.y } as any);
    phaseRef.current = { type: "DRAGGING", actions: fluid };
  }, []);

  const cancel = useCallback(() => {
    const phase = phaseRef.current;
    if (phase.type === "PENDING") {
      phase.actions.abort();
    }
    if (phase.type === "DRAGGING") {
      phase.actions.cancel({ shouldBlockNextClick: true });
    }
    cleanup();
  }, [cleanup]);

  const bindWindowListeners = useCallback(() => {
    function onTouchMove(event: TouchEvent) {
      const phase = phaseRef.current;
      if (phase.type === "IDLE") return;

      if (phase.type === "PENDING") {
        // Any movement before long-press cancels (allow normal scroll).
        cancel();
        return;
      }

      // dragging
      event.preventDefault();
      const point = getTouchPoint(event);
      if (!point) return;
      phase.actions.move({ x: point.x, y: point.y } as any);
    }

    function onTouchEnd(event: TouchEvent) {
      const phase = phaseRef.current;
      if (phase.type === "PENDING") {
        // Released before long press finished
        phase.actions.abort();
        cleanup();
        return;
      }
      if (phase.type === "DRAGGING") {
        event.preventDefault();
        phase.actions.drop({ shouldBlockNextClick: true });
        cleanup();
      }
    }

    function onTouchCancel() {
      cancel();
    }

    function onContextMenu(e: Event) {
      // prevent native context menu while waiting/dragging
      if (phaseRef.current.type !== "IDLE") e.preventDefault();
    }

    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: false });
    window.addEventListener("touchcancel", onTouchCancel, { passive: true });
    window.addEventListener("contextmenu", onContextMenu, { passive: false });

    unbindRef.current = () => {
      window.removeEventListener("touchmove", onTouchMove as any);
      window.removeEventListener("touchend", onTouchEnd as any);
      window.removeEventListener("touchcancel", onTouchCancel as any);
      window.removeEventListener("contextmenu", onContextMenu as any);
    };
  }, [cancel, cleanup]);

  useLayoutEffect(() => {
    function onTouchStartCapture(event: TouchEvent) {
      // Only start if idle
      if (phaseRef.current.type !== "IDLE") return;
      if (api.isLockClaimed()) return;
      const draggableId = api.findClosestDraggableId(event);
      if (!draggableId) return;
      if (!api.canGetLock(draggableId)) return;

      const point = getTouchPoint(event);
      if (!point) return;

      const actions = api.tryGetLock(draggableId, cancel, { sourceEvent: event });
      if (!actions) return;

      // delay drag start for long-press
      const timer = window.setTimeout(startDragging, LONG_PRESS_MS);
      phaseRef.current = { type: "PENDING", actions, point, timer };

      bindWindowListeners();
    }

    // capture is required so we can start before anything else handles it
    window.addEventListener("touchstart", onTouchStartCapture, { capture: true, passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStartCapture as any, { capture: true } as any);
      cleanup();
    };
  }, [api, bindWindowListeners, cancel, cleanup, startDragging]);

  // Sensor signature is (api) => void. We return nothing because hooks already attached listeners.
  return (() => {}) as unknown as Sensor;
}

