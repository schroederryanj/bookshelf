import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Types for streak display
interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
  lastReadDate: Date | null;
  showMilestones?: boolean;
  compact?: boolean;
}

// Mock implementation for testing
const MockStreakDisplay: React.FC<StreakDisplayProps> = ({
  currentStreak,
  longestStreak,
  lastReadDate,
  showMilestones = true,
  compact = false,
}) => {
  const milestones = [7, 14, 30, 50, 100, 365];

  const getNextMilestone = (): number | null => {
    return milestones.find((m) => m > currentStreak) || null;
  };

  const getDaysToNextMilestone = (): number => {
    const next = getNextMilestone();
    return next ? next - currentStreak : 0;
  };

  const getStreakStatus = (): 'active' | 'at_risk' | 'broken' => {
    if (!lastReadDate) return 'broken';
    const now = new Date();
    const diffHours = (now.getTime() - lastReadDate.getTime()) / (1000 * 60 * 60);
    if (diffHours < 24) return 'active';
    if (diffHours < 48) return 'at_risk';
    return 'broken';
  };

  const formatLastRead = (): string => {
    if (!lastReadDate) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - lastReadDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  const status = getStreakStatus();
  const statusColors = {
    active: 'text-green-500',
    at_risk: 'text-yellow-500',
    broken: 'text-red-500',
  };

  const statusLabels = {
    active: 'Active',
    at_risk: 'At Risk',
    broken: 'Broken',
  };

  if (compact) {
    return (
      <div data-testid="streak-display-compact" className="flex items-center gap-2">
        <span data-testid="streak-icon" className="text-2xl">
          {currentStreak > 0 ? '' : ''}
        </span>
        <span data-testid="current-streak-value" className="font-bold">
          {currentStreak}
        </span>
        <span className="text-sm text-gray-500">day streak</span>
      </div>
    );
  }

  return (
    <div data-testid="streak-display" className="p-4 bg-white rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Reading Streak</h3>
        <span
          data-testid="streak-status"
          className={`text-sm ${statusColors[status]}`}
        >
          {statusLabels[status]}
        </span>
      </div>

      <div className="flex justify-center items-center mb-4">
        <div className="text-center">
          <span data-testid="streak-flame" className="text-5xl">
            {currentStreak > 0 ? '' : ''}
          </span>
          <div
            data-testid="current-streak"
            className="text-4xl font-bold mt-2"
          >
            {currentStreak}
          </div>
          <div className="text-sm text-gray-500">
            {currentStreak === 1 ? 'day' : 'days'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-2 bg-gray-50 rounded">
          <div className="text-sm text-gray-500">Longest Streak</div>
          <div data-testid="longest-streak" className="font-bold">
            {longestStreak} days
          </div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded">
          <div className="text-sm text-gray-500">Last Read</div>
          <div data-testid="last-read" className="font-bold">
            {formatLastRead()}
          </div>
        </div>
      </div>

      {showMilestones && currentStreak > 0 && (
        <div data-testid="milestone-section" className="mt-4 pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Next milestone</span>
            <span data-testid="next-milestone" className="font-medium">
              {getNextMilestone() ? `${getNextMilestone()} days` : 'All achieved!'}
            </span>
          </div>
          {getNextMilestone() && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  data-testid="milestone-progress"
                  className="bg-orange-500 h-2 rounded-full"
                  style={{
                    width: `${(currentStreak / getNextMilestone()!) * 100}%`,
                  }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-1 text-right">
                <span data-testid="days-to-milestone">
                  {getDaysToNextMilestone()} days to go
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {milestones.includes(currentStreak) && (
        <div
          data-testid="milestone-achieved"
          className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-center"
        >
          <span className="text-xl">Congratulations!</span>
          <div className="font-medium text-yellow-800">
            You reached a {currentStreak}-day streak milestone!
          </div>
        </div>
      )}
    </div>
  );
};

describe('StreakDisplay Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render streak display', () => {
      render(
        <MockStreakDisplay
          currentStreak={7}
          longestStreak={14}
          lastReadDate={new Date('2024-01-15T10:00:00')}
        />
      );

      expect(screen.getByTestId('streak-display')).toBeInTheDocument();
    });

    it('should display current streak', () => {
      render(
        <MockStreakDisplay
          currentStreak={7}
          longestStreak={14}
          lastReadDate={new Date('2024-01-15T10:00:00')}
        />
      );

      expect(screen.getByTestId('current-streak')).toHaveTextContent('7');
    });

    it('should display longest streak', () => {
      render(
        <MockStreakDisplay
          currentStreak={7}
          longestStreak={21}
          lastReadDate={new Date('2024-01-15T10:00:00')}
        />
      );

      expect(screen.getByTestId('longest-streak')).toHaveTextContent('21 days');
    });

    it('should show fire emoji when streak is active', () => {
      render(
        <MockStreakDisplay
          currentStreak={5}
          longestStreak={10}
          lastReadDate={new Date('2024-01-15T10:00:00')}
        />
      );

      expect(screen.getByTestId('streak-flame')).toHaveTextContent('');
    });

    it('should show snowflake when streak is zero', () => {
      render(
        <MockStreakDisplay
          currentStreak={0}
          longestStreak={10}
          lastReadDate={null}
        />
      );

      expect(screen.getByTestId('streak-flame')).toHaveTextContent('');
    });
  });

  describe('Streak Status', () => {
    it('should show active status when read today', () => {
      render(
        <MockStreakDisplay
          currentStreak={7}
          longestStreak={14}
          lastReadDate={new Date('2024-01-15T10:00:00')} // 2 hours ago
        />
      );

      expect(screen.getByTestId('streak-status')).toHaveTextContent('Active');
      expect(screen.getByTestId('streak-status')).toHaveClass('text-green-500');
    });

    it('should show at risk status when last read was yesterday', () => {
      render(
        <MockStreakDisplay
          currentStreak={7}
          longestStreak={14}
          lastReadDate={new Date('2024-01-14T12:00:00')} // 24 hours ago
        />
      );

      expect(screen.getByTestId('streak-status')).toHaveTextContent('At Risk');
      expect(screen.getByTestId('streak-status')).toHaveClass('text-yellow-500');
    });

    it('should show broken status when streak is lost', () => {
      render(
        <MockStreakDisplay
          currentStreak={0}
          longestStreak={14}
          lastReadDate={new Date('2024-01-12T12:00:00')} // 3 days ago
        />
      );

      expect(screen.getByTestId('streak-status')).toHaveTextContent('Broken');
      expect(screen.getByTestId('streak-status')).toHaveClass('text-red-500');
    });

    it('should show broken status when never read', () => {
      render(
        <MockStreakDisplay
          currentStreak={0}
          longestStreak={0}
          lastReadDate={null}
        />
      );

      expect(screen.getByTestId('streak-status')).toHaveTextContent('Broken');
    });
  });

  describe('Last Read Formatting', () => {
    it('should show "Just now" for recent reads', () => {
      render(
        <MockStreakDisplay
          currentStreak={1}
          longestStreak={5}
          lastReadDate={new Date('2024-01-15T11:30:00')} // 30 min ago
        />
      );

      expect(screen.getByTestId('last-read')).toHaveTextContent('Just now');
    });

    it('should show hours ago for same day reads', () => {
      render(
        <MockStreakDisplay
          currentStreak={1}
          longestStreak={5}
          lastReadDate={new Date('2024-01-15T08:00:00')} // 4 hours ago
        />
      );

      expect(screen.getByTestId('last-read')).toHaveTextContent('4h ago');
    });

    it('should show "Yesterday" for yesterday reads', () => {
      render(
        <MockStreakDisplay
          currentStreak={1}
          longestStreak={5}
          lastReadDate={new Date('2024-01-14T10:00:00')} // Yesterday
        />
      );

      expect(screen.getByTestId('last-read')).toHaveTextContent('Yesterday');
    });

    it('should show "Never" when no read date', () => {
      render(
        <MockStreakDisplay
          currentStreak={0}
          longestStreak={0}
          lastReadDate={null}
        />
      );

      expect(screen.getByTestId('last-read')).toHaveTextContent('Never');
    });

    it('should show days ago for older reads', () => {
      render(
        <MockStreakDisplay
          currentStreak={0}
          longestStreak={10}
          lastReadDate={new Date('2024-01-10T10:00:00')} // 5 days ago
        />
      );

      expect(screen.getByTestId('last-read')).toHaveTextContent('5 days ago');
    });
  });

  describe('Milestone Display', () => {
    it('should show next milestone', () => {
      render(
        <MockStreakDisplay
          currentStreak={5}
          longestStreak={10}
          lastReadDate={new Date('2024-01-15T10:00:00')}
          showMilestones={true}
        />
      );

      expect(screen.getByTestId('next-milestone')).toHaveTextContent('7 days');
    });

    it('should show days to milestone', () => {
      render(
        <MockStreakDisplay
          currentStreak={5}
          longestStreak={10}
          lastReadDate={new Date('2024-01-15T10:00:00')}
          showMilestones={true}
        />
      );

      expect(screen.getByTestId('days-to-milestone')).toHaveTextContent('2 days to go');
    });

    it('should show correct next milestone for different streak values', () => {
      render(
        <MockStreakDisplay
          currentStreak={20}
          longestStreak={25}
          lastReadDate={new Date('2024-01-15T10:00:00')}
          showMilestones={true}
        />
      );

      expect(screen.getByTestId('next-milestone')).toHaveTextContent('30 days');
    });

    it('should show milestone achieved banner', () => {
      render(
        <MockStreakDisplay
          currentStreak={7}
          longestStreak={7}
          lastReadDate={new Date('2024-01-15T10:00:00')}
          showMilestones={true}
        />
      );

      expect(screen.getByTestId('milestone-achieved')).toBeInTheDocument();
      expect(screen.getByTestId('milestone-achieved')).toHaveTextContent(
        '7-day streak milestone'
      );
    });

    it('should hide milestones when disabled', () => {
      render(
        <MockStreakDisplay
          currentStreak={5}
          longestStreak={10}
          lastReadDate={new Date('2024-01-15T10:00:00')}
          showMilestones={false}
        />
      );

      expect(screen.queryByTestId('milestone-section')).not.toBeInTheDocument();
    });

    it('should show "All achieved!" for max milestone', () => {
      render(
        <MockStreakDisplay
          currentStreak={400}
          longestStreak={400}
          lastReadDate={new Date('2024-01-15T10:00:00')}
          showMilestones={true}
        />
      );

      expect(screen.getByTestId('next-milestone')).toHaveTextContent('All achieved!');
    });
  });

  describe('Compact Mode', () => {
    it('should render compact version', () => {
      render(
        <MockStreakDisplay
          currentStreak={7}
          longestStreak={14}
          lastReadDate={new Date('2024-01-15T10:00:00')}
          compact={true}
        />
      );

      expect(screen.getByTestId('streak-display-compact')).toBeInTheDocument();
      expect(screen.queryByTestId('streak-display')).not.toBeInTheDocument();
    });

    it('should show streak value in compact mode', () => {
      render(
        <MockStreakDisplay
          currentStreak={7}
          longestStreak={14}
          lastReadDate={new Date('2024-01-15T10:00:00')}
          compact={true}
        />
      );

      expect(screen.getByTestId('current-streak-value')).toHaveTextContent('7');
    });

    it('should show fire icon in compact mode when streak active', () => {
      render(
        <MockStreakDisplay
          currentStreak={5}
          longestStreak={10}
          lastReadDate={new Date('2024-01-15T10:00:00')}
          compact={true}
        />
      );

      expect(screen.getByTestId('streak-icon')).toHaveTextContent('');
    });
  });

  describe('Singular/Plural Labels', () => {
    it('should show "day" for streak of 1', () => {
      render(
        <MockStreakDisplay
          currentStreak={1}
          longestStreak={5}
          lastReadDate={new Date('2024-01-15T10:00:00')}
        />
      );

      expect(screen.getByText('day')).toBeInTheDocument();
    });

    it('should show "days" for streak greater than 1', () => {
      render(
        <MockStreakDisplay
          currentStreak={5}
          longestStreak={10}
          lastReadDate={new Date('2024-01-15T10:00:00')}
        />
      );

      expect(screen.getByText('days')).toBeInTheDocument();
    });
  });
});

describe('Streak Utility Functions', () => {
  describe('calculateMilestoneProgress', () => {
    const milestones = [7, 14, 30, 50, 100, 365];

    const getMilestoneProgress = (
      currentStreak: number
    ): { progress: number; next: number | null; daysLeft: number } => {
      const next = milestones.find((m) => m > currentStreak) || null;
      if (!next) {
        return { progress: 100, next: null, daysLeft: 0 };
      }
      const prevMilestone = milestones.filter((m) => m <= currentStreak).pop() || 0;
      const progress = ((currentStreak - prevMilestone) / (next - prevMilestone)) * 100;
      return {
        progress: Math.round(progress),
        next,
        daysLeft: next - currentStreak,
      };
    };

    it('should calculate progress towards first milestone', () => {
      const result = getMilestoneProgress(3);
      expect(result.progress).toBe(43); // 3/7 = 42.8%
      expect(result.next).toBe(7);
      expect(result.daysLeft).toBe(4);
    });

    it('should calculate progress between milestones', () => {
      const result = getMilestoneProgress(10);
      expect(result.progress).toBe(43); // (10-7)/(14-7) = 42.8%
      expect(result.next).toBe(14);
      expect(result.daysLeft).toBe(4);
    });

    it('should return 100% when all milestones achieved', () => {
      const result = getMilestoneProgress(400);
      expect(result.progress).toBe(100);
      expect(result.next).toBeNull();
      expect(result.daysLeft).toBe(0);
    });
  });

  describe('isStreakAtRisk', () => {
    const isAtRisk = (lastReadDate: Date | null): boolean => {
      if (!lastReadDate) return true;
      const now = new Date();
      const hoursSinceRead = (now.getTime() - lastReadDate.getTime()) / (1000 * 60 * 60);
      return hoursSinceRead >= 18 && hoursSinceRead < 48;
    };

    it('should return true when approaching 24 hour mark', () => {
      vi.setSystemTime(new Date('2024-01-15T12:00:00'));
      const lastRead = new Date('2024-01-14T16:00:00'); // 20 hours ago
      expect(isAtRisk(lastRead)).toBe(true);
    });

    it('should return false when recently read', () => {
      vi.setSystemTime(new Date('2024-01-15T12:00:00'));
      const lastRead = new Date('2024-01-15T08:00:00'); // 4 hours ago
      expect(isAtRisk(lastRead)).toBe(false);
    });

    it('should return true when no last read date', () => {
      expect(isAtRisk(null)).toBe(true);
    });
  });
});
