"use client";

import { useState, useEffect, useRef } from "react";

interface ReadingSessionTimerProps {
  bookId?: number;
  onSessionComplete?: (duration: number) => void;
  autoSaveInterval?: number; // in seconds
}

export function ReadingSessionTimer({
  bookId,
  onSessionComplete,
  autoSaveInterval = 60,
}: ReadingSessionTimerProps) {
  const [isActive, setIsActive] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [lastSaved, setLastSaved] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive]);

  // Auto-save logic
  useEffect(() => {
    if (isActive && elapsedTime > 0 && elapsedTime % autoSaveInterval === 0) {
      handleAutoSave();
    }
  }, [elapsedTime, isActive, autoSaveInterval]);

  const handleAutoSave = async () => {
    if (bookId && elapsedTime > lastSaved) {
      try {
        // API call to save reading session
        await fetch("/api/reading-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookId,
            duration: elapsedTime - lastSaved,
            timestamp: new Date().toISOString(),
          }),
        });
        setLastSaved(elapsedTime);
      } catch (error) {
        console.error("Failed to auto-save reading session:", error);
      }
    }
  };

  const handleStart = () => {
    setIsActive(true);
  };

  const handlePause = () => {
    setIsActive(false);
  };

  const handleStop = async () => {
    setIsActive(false);

    // Save final session
    if (bookId && elapsedTime > 0) {
      await handleAutoSave();
    }

    if (onSessionComplete) {
      onSessionComplete(elapsedTime);
    }

    setElapsedTime(0);
    setLastSaved(0);
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  return (
    <div
      className="p-4 rounded-lg"
      style={{
        background: "linear-gradient(135deg, #fef9ed 0%, #f5ebe0 100%)",
        border: "1px solid #c4a77d",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-[#6b5a4a] uppercase tracking-wider mb-1">
            Reading Session
          </div>
          <div className="text-2xl font-bold text-[#3d2e1f] font-mono">
            {formatTime(elapsedTime)}
          </div>
          {lastSaved > 0 && (
            <div className="text-xs text-[#8b5a2b] mt-1">
              Auto-saved {formatTime(elapsedTime - lastSaved)} ago
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {!isActive && elapsedTime === 0 && (
            <button
              onClick={handleStart}
              className="px-4 py-2 rounded-lg bg-[#2d5a27] text-white hover:bg-[#4a7c42] transition-colors text-sm font-medium"
            >
              Start
            </button>
          )}

          {isActive && (
            <button
              onClick={handlePause}
              className="px-4 py-2 rounded-lg bg-[#8b5a2b] text-white hover:bg-[#a67c52] transition-colors text-sm font-medium"
            >
              Pause
            </button>
          )}

          {!isActive && elapsedTime > 0 && (
            <>
              <button
                onClick={handleStart}
                className="px-4 py-2 rounded-lg bg-[#2d5a27] text-white hover:bg-[#4a7c42] transition-colors text-sm font-medium"
              >
                Resume
              </button>
              <button
                onClick={handleStop}
                className="px-4 py-2 rounded-lg bg-[#6b5a4a] text-white hover:bg-[#3d2e1f] transition-colors text-sm font-medium"
              >
                Stop
              </button>
            </>
          )}

          {isActive && (
            <button
              onClick={handleStop}
              className="px-4 py-2 rounded-lg bg-[#6b5a4a] text-white hover:bg-[#3d2e1f] transition-colors text-sm font-medium"
            >
              Stop
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
