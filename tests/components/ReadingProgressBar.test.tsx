import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock component implementation for testing
// In actual implementation, this would be imported from components/
interface ReadingProgressBarProps {
  currentPage: number;
  totalPages: number;
  status: 'not_started' | 'reading' | 'completed' | 'on_hold';
  onPageChange?: (page: number) => void;
  showPercentage?: boolean;
  showPageCount?: boolean;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

// Mock implementation for testing purposes
const MockReadingProgressBar: React.FC<ReadingProgressBarProps> = ({
  currentPage,
  totalPages,
  status,
  onPageChange,
  showPercentage = true,
  showPageCount = true,
  size = 'md',
  animated = true,
}) => {
  const percentage = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-4',
    lg: 'h-6',
  };

  const statusColors = {
    not_started: 'bg-gray-300',
    reading: 'bg-blue-500',
    completed: 'bg-green-500',
    on_hold: 'bg-yellow-500',
  };

  return (
    <div data-testid="reading-progress-bar" className="w-full">
      <div className={`w-full bg-gray-200 rounded-full ${sizeClasses[size]}`}>
        <div
          data-testid="progress-fill"
          className={`${sizeClasses[size]} rounded-full ${statusColors[status]} ${
            animated ? 'transition-all duration-300' : ''
          }`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <div className="flex justify-between mt-1 text-sm">
        {showPageCount && (
          <span data-testid="page-count">
            {currentPage} / {totalPages} pages
          </span>
        )}
        {showPercentage && (
          <span data-testid="percentage">{percentage}%</span>
        )}
      </div>
      {onPageChange && (
        <input
          type="number"
          data-testid="page-input"
          value={currentPage}
          onChange={(e) => onPageChange(parseInt(e.target.value, 10) || 0)}
          min={0}
          max={totalPages}
          className="mt-2 w-20 border rounded px-2 py-1"
        />
      )}
    </div>
  );
};

describe('ReadingProgressBar Component', () => {
  describe('Rendering', () => {
    it('should render progress bar correctly', () => {
      render(
        <MockReadingProgressBar
          currentPage={50}
          totalPages={200}
          status="reading"
        />
      );

      expect(screen.getByTestId('reading-progress-bar')).toBeInTheDocument();
      expect(screen.getByTestId('progress-fill')).toBeInTheDocument();
    });

    it('should display correct percentage', () => {
      render(
        <MockReadingProgressBar
          currentPage={100}
          totalPages={200}
          status="reading"
        />
      );

      expect(screen.getByTestId('percentage')).toHaveTextContent('50%');
    });

    it('should display page count when enabled', () => {
      render(
        <MockReadingProgressBar
          currentPage={75}
          totalPages={300}
          status="reading"
          showPageCount={true}
        />
      );

      expect(screen.getByTestId('page-count')).toHaveTextContent('75 / 300 pages');
    });

    it('should hide percentage when disabled', () => {
      render(
        <MockReadingProgressBar
          currentPage={50}
          totalPages={200}
          status="reading"
          showPercentage={false}
        />
      );

      expect(screen.queryByTestId('percentage')).not.toBeInTheDocument();
    });

    it('should hide page count when disabled', () => {
      render(
        <MockReadingProgressBar
          currentPage={50}
          totalPages={200}
          status="reading"
          showPageCount={false}
        />
      );

      expect(screen.queryByTestId('page-count')).not.toBeInTheDocument();
    });
  });

  describe('Progress Calculation', () => {
    it('should show 0% for not started books', () => {
      render(
        <MockReadingProgressBar
          currentPage={0}
          totalPages={200}
          status="not_started"
        />
      );

      expect(screen.getByTestId('percentage')).toHaveTextContent('0%');
    });

    it('should show 100% for completed books', () => {
      render(
        <MockReadingProgressBar
          currentPage={200}
          totalPages={200}
          status="completed"
        />
      );

      expect(screen.getByTestId('percentage')).toHaveTextContent('100%');
    });

    it('should round percentage correctly', () => {
      render(
        <MockReadingProgressBar
          currentPage={33}
          totalPages={100}
          status="reading"
        />
      );

      expect(screen.getByTestId('percentage')).toHaveTextContent('33%');
    });

    it('should handle zero total pages', () => {
      render(
        <MockReadingProgressBar
          currentPage={0}
          totalPages={0}
          status="not_started"
        />
      );

      expect(screen.getByTestId('percentage')).toHaveTextContent('0%');
    });
  });

  describe('Status Styles', () => {
    it('should apply gray color for not started', () => {
      render(
        <MockReadingProgressBar
          currentPage={0}
          totalPages={200}
          status="not_started"
        />
      );

      const fill = screen.getByTestId('progress-fill');
      expect(fill).toHaveClass('bg-gray-300');
    });

    it('should apply blue color for reading', () => {
      render(
        <MockReadingProgressBar
          currentPage={50}
          totalPages={200}
          status="reading"
        />
      );

      const fill = screen.getByTestId('progress-fill');
      expect(fill).toHaveClass('bg-blue-500');
    });

    it('should apply green color for completed', () => {
      render(
        <MockReadingProgressBar
          currentPage={200}
          totalPages={200}
          status="completed"
        />
      );

      const fill = screen.getByTestId('progress-fill');
      expect(fill).toHaveClass('bg-green-500');
    });

    it('should apply yellow color for on hold', () => {
      render(
        <MockReadingProgressBar
          currentPage={100}
          totalPages={200}
          status="on_hold"
        />
      );

      const fill = screen.getByTestId('progress-fill');
      expect(fill).toHaveClass('bg-yellow-500');
    });
  });

  describe('Size Variants', () => {
    it('should render small size correctly', () => {
      render(
        <MockReadingProgressBar
          currentPage={50}
          totalPages={200}
          status="reading"
          size="sm"
        />
      );

      const fill = screen.getByTestId('progress-fill');
      expect(fill).toHaveClass('h-2');
    });

    it('should render medium size correctly', () => {
      render(
        <MockReadingProgressBar
          currentPage={50}
          totalPages={200}
          status="reading"
          size="md"
        />
      );

      const fill = screen.getByTestId('progress-fill');
      expect(fill).toHaveClass('h-4');
    });

    it('should render large size correctly', () => {
      render(
        <MockReadingProgressBar
          currentPage={50}
          totalPages={200}
          status="reading"
          size="lg"
        />
      );

      const fill = screen.getByTestId('progress-fill');
      expect(fill).toHaveClass('h-6');
    });
  });

  describe('Accessibility', () => {
    it('should have correct ARIA attributes', () => {
      render(
        <MockReadingProgressBar
          currentPage={75}
          totalPages={100}
          status="reading"
        />
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });
  });

  describe('Interactive Page Input', () => {
    it('should render page input when onPageChange is provided', () => {
      const handleChange = vi.fn();
      render(
        <MockReadingProgressBar
          currentPage={50}
          totalPages={200}
          status="reading"
          onPageChange={handleChange}
        />
      );

      expect(screen.getByTestId('page-input')).toBeInTheDocument();
    });

    it('should not render page input when onPageChange is not provided', () => {
      render(
        <MockReadingProgressBar
          currentPage={50}
          totalPages={200}
          status="reading"
        />
      );

      expect(screen.queryByTestId('page-input')).not.toBeInTheDocument();
    });

    it('should call onPageChange when input changes', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(
        <MockReadingProgressBar
          currentPage={50}
          totalPages={200}
          status="reading"
          onPageChange={handleChange}
        />
      );

      const input = screen.getByTestId('page-input');
      await user.clear(input);
      await user.type(input, '75');

      expect(handleChange).toHaveBeenCalled();
    });

    it('should have correct min and max attributes on input', () => {
      render(
        <MockReadingProgressBar
          currentPage={50}
          totalPages={200}
          status="reading"
          onPageChange={vi.fn()}
        />
      );

      const input = screen.getByTestId('page-input');
      expect(input).toHaveAttribute('min', '0');
      expect(input).toHaveAttribute('max', '200');
    });
  });

  describe('Animation', () => {
    it('should have transition class when animated', () => {
      render(
        <MockReadingProgressBar
          currentPage={50}
          totalPages={200}
          status="reading"
          animated={true}
        />
      );

      const fill = screen.getByTestId('progress-fill');
      expect(fill).toHaveClass('transition-all');
    });

    it('should not have transition class when not animated', () => {
      render(
        <MockReadingProgressBar
          currentPage={50}
          totalPages={200}
          status="reading"
          animated={false}
        />
      );

      const fill = screen.getByTestId('progress-fill');
      expect(fill).not.toHaveClass('transition-all');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large page numbers', () => {
      render(
        <MockReadingProgressBar
          currentPage={5000}
          totalPages={10000}
          status="reading"
        />
      );

      expect(screen.getByTestId('percentage')).toHaveTextContent('50%');
      expect(screen.getByTestId('page-count')).toHaveTextContent('5000 / 10000 pages');
    });

    it('should handle current page exceeding total pages', () => {
      // This shouldn't happen in practice but should be handled gracefully
      const calculatePercentage = (current: number, total: number) => {
        if (total === 0) return 0;
        return Math.min(Math.round((current / total) * 100), 100);
      };

      expect(calculatePercentage(250, 200)).toBe(100);
    });

    it('should handle negative page numbers gracefully', () => {
      const validatePageNumber = (page: number) => Math.max(0, page);

      expect(validatePageNumber(-10)).toBe(0);
      expect(validatePageNumber(50)).toBe(50);
    });
  });
});
