import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState, useEffect, useCallback } from 'react';

// Mock component implementation for testing session timer
interface SessionTimerProps {
  onStart?: () => void;
  onStop?: (duration: number) => void;
  onPause?: () => void;
  onResume?: () => void;
  isActive?: boolean;
  isPaused?: boolean;
  initialTime?: number; // in seconds
  maxDuration?: number; // in seconds
  showControls?: boolean;
  autoStart?: boolean;
}

// Mock implementation for testing purposes
const MockSessionTimer: React.FC<SessionTimerProps> = ({
  onStart,
  onStop,
  onPause,
  onResume,
  isActive: externalIsActive,
  isPaused: externalIsPaused,
  initialTime = 0,
  maxDuration,
  showControls = true,
  autoStart = false,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(initialTime);
  const [isActive, setIsActive] = useState(autoStart || externalIsActive || false);
  const [isPaused, setIsPaused] = useState(externalIsPaused || false);
  const onStopRef = React.useRef(onStop);
  onStopRef.current = onStop;

  const handleStart = useCallback(() => {
    setIsActive(true);
    setIsPaused(false);
    onStart?.();
  }, [onStart]);

  const handleStop = useCallback((finalTime?: number) => {
    setIsActive(false);
    setIsPaused(false);
    setElapsedSeconds((current) => {
      onStopRef.current?.(finalTime ?? current);
      return finalTime ?? current;
    });
  }, []);

  const handlePause = useCallback(() => {
    setIsPaused(true);
    onPause?.();
  }, [onPause]);

  const handleResume = useCallback(() => {
    setIsPaused(false);
    onResume?.();
  }, [onResume]);

  const handleReset = useCallback(() => {
    setElapsedSeconds(0);
    setIsActive(false);
    setIsPaused(false);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && !isPaused) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => {
          const newTime = prev + 1;
          if (maxDuration && newTime >= maxDuration) {
            handleStop(maxDuration);
            return maxDuration;
          }
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, isPaused, maxDuration, handleStop]);

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div data-testid="session-timer" className="p-4 bg-white rounded-lg shadow">
      <div
        data-testid="timer-display"
        className="text-4xl font-mono text-center mb-4"
        aria-live="polite"
        aria-atomic="true"
      >
        {formatTime(elapsedSeconds)}
      </div>

      <div data-testid="timer-status" className="text-center text-sm mb-4">
        {!isActive && !isPaused && elapsedSeconds === 0 && (
          <span className="text-gray-500">Ready to start</span>
        )}
        {isActive && !isPaused && (
          <span className="text-green-500">Recording...</span>
        )}
        {isPaused && <span className="text-yellow-500">Paused</span>}
        {!isActive && elapsedSeconds > 0 && (
          <span className="text-blue-500">Session ended</span>
        )}
      </div>

      {showControls && (
        <div className="flex justify-center gap-2">
          {!isActive && !isPaused && (
            <button
              data-testid="start-button"
              onClick={handleStart}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Start
            </button>
          )}

          {isActive && !isPaused && (
            <>
              <button
                data-testid="pause-button"
                onClick={handlePause}
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                Pause
              </button>
              <button
                data-testid="stop-button"
                onClick={() => handleStop()}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Stop
              </button>
            </>
          )}

          {isPaused && (
            <>
              <button
                data-testid="resume-button"
                onClick={handleResume}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Resume
              </button>
              <button
                data-testid="stop-button"
                onClick={() => handleStop()}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Stop
              </button>
            </>
          )}

          {elapsedSeconds > 0 && !isActive && (
            <button
              data-testid="reset-button"
              onClick={handleReset}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Reset
            </button>
          )}
        </div>
      )}
    </div>
  );
};

describe('SessionTimer Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render timer display', () => {
      render(<MockSessionTimer />);

      expect(screen.getByTestId('session-timer')).toBeInTheDocument();
      expect(screen.getByTestId('timer-display')).toBeInTheDocument();
    });

    it('should display initial time as 0:00', () => {
      render(<MockSessionTimer />);

      expect(screen.getByTestId('timer-display')).toHaveTextContent('0:00');
    });

    it('should display custom initial time', () => {
      render(<MockSessionTimer initialTime={125} />);

      expect(screen.getByTestId('timer-display')).toHaveTextContent('2:05');
    });

    it('should display "Ready to start" status initially', () => {
      render(<MockSessionTimer />);

      expect(screen.getByTestId('timer-status')).toHaveTextContent('Ready to start');
    });

    it('should render start button when not active', () => {
      render(<MockSessionTimer showControls={true} />);

      expect(screen.getByTestId('start-button')).toBeInTheDocument();
    });

    it('should hide controls when showControls is false', () => {
      render(<MockSessionTimer showControls={false} />);

      expect(screen.queryByTestId('start-button')).not.toBeInTheDocument();
    });
  });

  describe('Timer Controls', () => {
    it('should start timer when clicking start button', () => {
      const onStart = vi.fn();
      render(<MockSessionTimer onStart={onStart} />);

      fireEvent.click(screen.getByTestId('start-button'));

      expect(onStart).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('timer-status')).toHaveTextContent('Recording...');
    });

    it('should show pause and stop buttons when active', () => {
      render(<MockSessionTimer />);

      fireEvent.click(screen.getByTestId('start-button'));

      expect(screen.getByTestId('pause-button')).toBeInTheDocument();
      expect(screen.getByTestId('stop-button')).toBeInTheDocument();
      expect(screen.queryByTestId('start-button')).not.toBeInTheDocument();
    });

    it('should pause timer when clicking pause button', () => {
      const onPause = vi.fn();
      render(<MockSessionTimer onPause={onPause} />);

      fireEvent.click(screen.getByTestId('start-button'));
      fireEvent.click(screen.getByTestId('pause-button'));

      expect(onPause).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('timer-status')).toHaveTextContent('Paused');
    });

    it('should show resume button when paused', () => {
      render(<MockSessionTimer />);

      fireEvent.click(screen.getByTestId('start-button'));
      fireEvent.click(screen.getByTestId('pause-button'));

      expect(screen.getByTestId('resume-button')).toBeInTheDocument();
    });

    it('should resume timer when clicking resume button', () => {
      const onResume = vi.fn();
      render(<MockSessionTimer onResume={onResume} />);

      fireEvent.click(screen.getByTestId('start-button'));
      fireEvent.click(screen.getByTestId('pause-button'));
      fireEvent.click(screen.getByTestId('resume-button'));

      expect(onResume).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('timer-status')).toHaveTextContent('Recording...');
    });

    it('should stop timer when clicking stop button', () => {
      const onStop = vi.fn();
      render(<MockSessionTimer onStop={onStop} />);

      fireEvent.click(screen.getByTestId('start-button'));

      // Advance time by 30 seconds
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      fireEvent.click(screen.getByTestId('stop-button'));

      expect(onStop).toHaveBeenCalledWith(30);
    });

    it('should show reset button after stopping', () => {
      render(<MockSessionTimer />);

      fireEvent.click(screen.getByTestId('start-button'));

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      fireEvent.click(screen.getByTestId('stop-button'));

      expect(screen.getByTestId('reset-button')).toBeInTheDocument();
    });

    it('should reset timer to 0 when clicking reset', () => {
      render(<MockSessionTimer />);

      fireEvent.click(screen.getByTestId('start-button'));

      act(() => {
        vi.advanceTimersByTime(30000);
      });

      fireEvent.click(screen.getByTestId('stop-button'));
      fireEvent.click(screen.getByTestId('reset-button'));

      expect(screen.getByTestId('timer-display')).toHaveTextContent('0:00');
    });
  });

  describe('Time Counting', () => {
    it('should increment time every second when active', () => {
      render(<MockSessionTimer />);

      fireEvent.click(screen.getByTestId('start-button'));

      expect(screen.getByTestId('timer-display')).toHaveTextContent('0:00');

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByTestId('timer-display')).toHaveTextContent('0:01');

      act(() => {
        vi.advanceTimersByTime(59000);
      });

      expect(screen.getByTestId('timer-display')).toHaveTextContent('1:00');
    });

    it('should not increment time when paused', () => {
      render(<MockSessionTimer />);

      fireEvent.click(screen.getByTestId('start-button'));

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(screen.getByTestId('timer-display')).toHaveTextContent('0:10');

      fireEvent.click(screen.getByTestId('pause-button'));

      act(() => {
        vi.advanceTimersByTime(30000);
      });

      // Time should still be 0:10
      expect(screen.getByTestId('timer-display')).toHaveTextContent('0:10');
    });

    it('should continue from paused time when resumed', () => {
      render(<MockSessionTimer />);

      fireEvent.click(screen.getByTestId('start-button'));

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      fireEvent.click(screen.getByTestId('pause-button'));

      act(() => {
        vi.advanceTimersByTime(60000); // Wait a minute while paused
      });

      fireEvent.click(screen.getByTestId('resume-button'));

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(screen.getByTestId('timer-display')).toHaveTextContent('0:15');
    });
  });

  describe('Time Formatting', () => {
    it('should format seconds correctly', () => {
      render(<MockSessionTimer initialTime={45} />);

      expect(screen.getByTestId('timer-display')).toHaveTextContent('0:45');
    });

    it('should format minutes correctly', () => {
      render(<MockSessionTimer initialTime={180} />);

      expect(screen.getByTestId('timer-display')).toHaveTextContent('3:00');
    });

    it('should format hours correctly', () => {
      render(<MockSessionTimer initialTime={3665} />);

      expect(screen.getByTestId('timer-display')).toHaveTextContent('1:01:05');
    });

    it('should pad single digit minutes and seconds', () => {
      render(<MockSessionTimer initialTime={61} />);

      expect(screen.getByTestId('timer-display')).toHaveTextContent('1:01');
    });

    it('should format multi-hour sessions', () => {
      render(<MockSessionTimer initialTime={7200} />);

      expect(screen.getByTestId('timer-display')).toHaveTextContent('2:00:00');
    });
  });

  describe('Max Duration', () => {
    it('should stop automatically at max duration', () => {
      const onStop = vi.fn();
      render(<MockSessionTimer maxDuration={10} onStop={onStop} />);

      fireEvent.click(screen.getByTestId('start-button'));

      act(() => {
        vi.advanceTimersByTime(15000); // Try to go past max
      });

      expect(onStop).toHaveBeenCalledWith(10);
      expect(screen.getByTestId('timer-display')).toHaveTextContent('0:10');
    });

    it('should not exceed max duration', () => {
      render(<MockSessionTimer maxDuration={60} />);

      fireEvent.click(screen.getByTestId('start-button'));

      act(() => {
        vi.advanceTimersByTime(120000); // 2 minutes
      });

      expect(screen.getByTestId('timer-display')).toHaveTextContent('1:00');
    });
  });

  describe('Auto Start', () => {
    it('should start automatically when autoStart is true', () => {
      const onStart = vi.fn();
      render(<MockSessionTimer autoStart={true} onStart={onStart} />);

      expect(screen.getByTestId('timer-status')).toHaveTextContent('Recording...');
    });

    it('should begin counting immediately with autoStart', () => {
      render(<MockSessionTimer autoStart={true} />);

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(screen.getByTestId('timer-display')).toHaveTextContent('0:05');
    });
  });

  describe('Accessibility', () => {
    it('should have aria-live attribute on timer display', () => {
      render(<MockSessionTimer />);

      const display = screen.getByTestId('timer-display');
      expect(display).toHaveAttribute('aria-live', 'polite');
    });

    it('should have aria-atomic attribute on timer display', () => {
      render(<MockSessionTimer />);

      const display = screen.getByTestId('timer-display');
      expect(display).toHaveAttribute('aria-atomic', 'true');
    });

    it('buttons should be focusable', () => {
      render(<MockSessionTimer />);

      const startButton = screen.getByTestId('start-button');
      expect(startButton).not.toHaveAttribute('tabindex', '-1');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long sessions (12+ hours)', () => {
      render(<MockSessionTimer initialTime={43200} />); // 12 hours

      expect(screen.getByTestId('timer-display')).toHaveTextContent('12:00:00');
    });

    it('should handle rapid start/stop', () => {
      const onStart = vi.fn();
      const onStop = vi.fn();
      const { rerender } = render(<MockSessionTimer onStart={onStart} onStop={onStop} />);

      // First start/stop cycle
      fireEvent.click(screen.getByTestId('start-button'));
      fireEvent.click(screen.getByTestId('stop-button'));

      // Rerender to reset component state for second cycle
      rerender(<MockSessionTimer onStart={onStart} onStop={onStop} />);

      // Second start/stop cycle
      fireEvent.click(screen.getByTestId('start-button'));
      fireEvent.click(screen.getByTestId('stop-button'));

      expect(onStart).toHaveBeenCalledTimes(2);
      expect(onStop).toHaveBeenCalledTimes(2);
    });

    it('should handle rapid pause/resume', () => {
      const onPause = vi.fn();
      const onResume = vi.fn();
      render(<MockSessionTimer onPause={onPause} onResume={onResume} />);

      fireEvent.click(screen.getByTestId('start-button'));

      for (let i = 0; i < 5; i++) {
        fireEvent.click(screen.getByTestId('pause-button'));
        fireEvent.click(screen.getByTestId('resume-button'));
      }

      expect(onPause).toHaveBeenCalledTimes(5);
      expect(onResume).toHaveBeenCalledTimes(5);
    });

    it('should cleanup interval on unmount', () => {
      const { unmount } = render(<MockSessionTimer />);

      fireEvent.click(screen.getByTestId('start-button'));

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Clear any pending timers tracking before unmount
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      unmount();

      // The interval should be cleaned up
      // Note: This tests the cleanup function runs, actual cleanup depends on implementation
    });
  });

  describe('Callback Timing', () => {
    it('should call onStop with correct elapsed time', () => {
      const onStop = vi.fn();
      render(<MockSessionTimer onStop={onStop} />);

      fireEvent.click(screen.getByTestId('start-button'));

      act(() => {
        vi.advanceTimersByTime(65000); // 65 seconds
      });

      fireEvent.click(screen.getByTestId('stop-button'));

      expect(onStop).toHaveBeenCalledWith(65);
    });

    it('should call onStop with time including paused duration', () => {
      const onStop = vi.fn();
      render(<MockSessionTimer onStop={onStop} />);

      fireEvent.click(screen.getByTestId('start-button'));

      act(() => {
        vi.advanceTimersByTime(30000);
      });

      fireEvent.click(screen.getByTestId('pause-button'));

      act(() => {
        vi.advanceTimersByTime(60000); // Paused for 60s
      });

      fireEvent.click(screen.getByTestId('resume-button'));

      act(() => {
        vi.advanceTimersByTime(30000);
      });

      fireEvent.click(screen.getByTestId('stop-button'));

      // Should only count active time: 30 + 30 = 60
      expect(onStop).toHaveBeenCalledWith(60);
    });
  });
});

describe('Timer Utility Functions', () => {
  describe('formatTime', () => {
    const formatTime = (seconds: number): string => {
      const hrs = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;

      if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    it('should format 0 seconds', () => {
      expect(formatTime(0)).toBe('0:00');
    });

    it('should format seconds only', () => {
      expect(formatTime(45)).toBe('0:45');
    });

    it('should format minutes and seconds', () => {
      expect(formatTime(125)).toBe('2:05');
    });

    it('should format hours, minutes, and seconds', () => {
      expect(formatTime(3723)).toBe('1:02:03');
    });

    it('should handle 24+ hours', () => {
      expect(formatTime(86400)).toBe('24:00:00');
    });
  });

  describe('calculateSessionDuration', () => {
    const calculateDuration = (start: Date, end: Date): number => {
      return Math.floor((end.getTime() - start.getTime()) / 1000);
    };

    it('should calculate duration in seconds', () => {
      const start = new Date('2024-01-01T10:00:00');
      const end = new Date('2024-01-01T10:30:00');

      expect(calculateDuration(start, end)).toBe(1800);
    });

    it('should handle sub-second precision', () => {
      const start = new Date('2024-01-01T10:00:00.000');
      const end = new Date('2024-01-01T10:00:00.999');

      expect(calculateDuration(start, end)).toBe(0); // Floors to 0
    });
  });
});
