# Reading Progress Tracking Components

A comprehensive set of React components for tracking reading progress, goals, sessions, and statistics in a Next.js bookshelf application.

## Components Overview

### 1. ReadingProgressBar

A visual progress indicator showing reading completion percentage.

**Props:**
- `currentPage: number` - Current page number
- `totalPages: number` - Total pages in the book
- `size?: "sm" | "md" | "lg"` - Size variant (default: "md")
- `showPercentage?: boolean` - Show percentage text (default: true)
- `className?: string` - Additional CSS classes

**Usage:**
```tsx
import { ReadingProgressBar } from "@/components/reading-progress";

<ReadingProgressBar
  currentPage={250}
  totalPages={500}
  size="md"
  showPercentage={true}
/>
```

### 2. ReadingSessionTimer

An interactive timer for tracking reading sessions with auto-save functionality.

**Props:**
- `bookId?: number` - Book ID for session tracking
- `onSessionComplete?: (duration: number) => void` - Callback when session ends
- `autoSaveInterval?: number` - Auto-save interval in seconds (default: 60)

**Features:**
- Start/pause/resume/stop controls
- Auto-save at configurable intervals
- Displays elapsed time in hours/minutes/seconds
- Persists sessions via API calls

**Usage:**
```tsx
import { ReadingSessionTimer } from "@/components/reading-progress";

<ReadingSessionTimer
  bookId={123}
  onSessionComplete={(duration) => console.log(`Read for ${duration} seconds`)}
  autoSaveInterval={60}
/>
```

### 3. ReadingGoalCard

Display and manage reading goals with progress tracking.

**Goal Types:**
- `books_per_month` - Books to read per month
- `books_per_year` - Books to read per year
- `pages_per_day` - Pages to read per day

**Props:**
- `goal: ReadingGoal` - Goal object
- `onUpdate?: (goal: ReadingGoal) => void` - Update callback
- `onDelete?: (goalId: number) => void` - Delete callback
- `editable?: boolean` - Enable editing (default: false)

**ReadingGoal Type:**
```typescript
interface ReadingGoal {
  id?: number;
  type: "books_per_month" | "books_per_year" | "pages_per_day";
  target: number;
  current: number;
  startDate: string;
  endDate?: string;
}
```

**Usage:**
```tsx
import { ReadingGoalCard } from "@/components/reading-progress";

const goal = {
  id: 1,
  type: "books_per_month",
  target: 4,
  current: 2,
  startDate: "2024-01-01"
};

<ReadingGoalCard
  goal={goal}
  editable={true}
  onUpdate={(updatedGoal) => console.log(updatedGoal)}
  onDelete={(id) => console.log(`Delete goal ${id}`)}
/>
```

### 4. ReadingStreakBadge

Display current reading streak with milestone celebrations.

**Props:**
- `currentStreak: number` - Current consecutive reading days
- `longestStreak: number` - All-time longest streak
- `size?: "sm" | "md" | "lg"` - Size variant (default: "md")
- `showLongest?: boolean` - Show longest streak (default: true)

**Features:**
- Special "on fire" styling for 7+ day streaks
- Milestone animations for multiples of 10
- Displays both current and longest streak

**Usage:**
```tsx
import { ReadingStreakBadge } from "@/components/reading-progress";

<ReadingStreakBadge
  currentStreak={12}
  longestStreak={15}
  size="lg"
  showLongest={true}
/>
```

### 5. ReadingStatsWidget

Dashboard widget displaying comprehensive reading statistics.

**Props:**
- `stats: ReadingStats` - Statistics object
- `compact?: boolean` - Compact layout (default: false)

**ReadingStats Type:**
```typescript
interface ReadingStats {
  booksReadThisMonth: number;
  booksReadThisYear: number;
  pagesReadThisWeek: number;
  pagesReadThisMonth: number;
  averageReadingSpeed: number; // pages per hour
  totalReadingTime: number; // in minutes
  currentStreak: number;
  favoriteGenre?: string;
}
```

**Usage:**
```tsx
import { ReadingStatsWidget } from "@/components/reading-progress";

const stats = {
  booksReadThisMonth: 2,
  booksReadThisYear: 15,
  pagesReadThisWeek: 420,
  pagesReadThisMonth: 1580,
  averageReadingSpeed: 45,
  totalReadingTime: 3240, // 54 hours
  currentStreak: 12,
  favoriteGenre: "Science Fiction"
};

<ReadingStatsWidget stats={stats} compact={false} />
```

### 6. CurrentlyReadingList

List view of books currently being read with progress management.

**Props:**
- `books: ReadingBook[]` - Array of books in progress
- `onUpdateProgress?: (bookId: number, currentPage: number) => void` - Update callback
- `onRemove?: (bookId: number) => void` - Remove callback

**ReadingBook Type:**
```typescript
interface ReadingBook {
  id: number;
  title: string;
  author?: string;
  img: string;
  currentPage: number;
  totalPages: number;
  dateStarted: string;
  lastReadDate?: string;
}
```

**Features:**
- Inline progress editing
- Book cover thumbnails
- Reading duration tracking
- Progress bar visualization

**Usage:**
```tsx
import { CurrentlyReadingList } from "@/components/reading-progress";

const books = [
  {
    id: 1,
    title: "The Lord of the Rings",
    author: "J.R.R. Tolkien",
    img: "https://example.com/cover.jpg",
    currentPage: 450,
    totalPages: 1178,
    dateStarted: "2024-01-01",
    lastReadDate: "2024-01-15"
  }
];

<CurrentlyReadingList
  books={books}
  onUpdateProgress={(id, page) => console.log(`Update book ${id} to page ${page}`)}
  onRemove={(id) => console.log(`Remove book ${id}`)}
/>
```

## Design System

All components follow the existing bookshelf design patterns:

### Color Palette
- Primary: `#3d2e1f` (dark brown text)
- Secondary: `#6b5a4a` (medium brown)
- Accent: `#8b5a2b` (warm brown)
- Success: `#2d5a27` (green for read books)
- Background: Gradient from `#fef9ed` to `#f5ebe0` (vintage paper)
- Border: `#c4a77d` (light brown)

### Typography
- Font: Georgia serif for body text
- Font weight: Bold for numbers, medium for labels

### Shadows and Effects
- Box shadows: `0 2px 8px rgba(0,0,0,0.1)` for cards
- Transitions: `transition-all duration-500` for smooth animations
- Border radius: Rounded corners (`rounded-lg`)

## Integration Examples

### Adding to Book Detail Modal

```tsx
// In Shelf.tsx
import { ReadingProgressBar } from "./reading-progress/ReadingProgressBar";

// Inside the book modal:
{selectedBook.read === "Reading" && selectedBook.pages && (
  <div className="mt-4 p-3 rounded bg-white/40">
    <div className="text-xs text-[#6b5a4a] uppercase tracking-wider mb-2 font-medium">
      Reading Progress
    </div>
    <ReadingProgressBar
      currentPage={currentPage}
      totalPages={selectedBook.pages}
      size="md"
      showPercentage={true}
    />
  </div>
)}
```

### Enhanced Stats Component

```tsx
import { EnhancedStats } from "@/components/EnhancedStats";

// In your page:
<EnhancedStats
  books={books}
  currentStreak={7}
  longestStreak={15}
/>
```

### Full Dashboard Page

See `/app/reading-progress/page.tsx` for a complete example of all components working together.

## API Integration

Components expect the following API endpoints:

### POST /api/reading-sessions
Save reading session data:
```json
{
  "bookId": 123,
  "duration": 3600,
  "timestamp": "2024-01-17T10:00:00Z"
}
```

### Database Schema Extensions

Add these fields to your Book model:
```prisma
model Book {
  // ... existing fields
  currentPage    Int?     // Current reading page
  readingSessions ReadingSession[]
  readingGoals   ReadingGoal[]
}

model ReadingSession {
  id        Int      @id @default(autoincrement())
  bookId    Int
  book      Book     @relation(fields: [bookId], references: [id])
  duration  Int      // in seconds
  timestamp DateTime @default(now())
}

model ReadingGoal {
  id        Int      @id @default(autoincrement())
  userId    Int?
  type      String   // books_per_month, books_per_year, pages_per_day
  target    Int
  current   Int      @default(0)
  startDate DateTime
  endDate   DateTime?
}

model ReadingStreak {
  id            Int      @id @default(autoincrement())
  userId        Int      @unique
  currentStreak Int      @default(0)
  longestStreak Int      @default(0)
  lastReadDate  DateTime?
}
```

## File Structure

```
components/reading-progress/
├── ReadingProgressBar.tsx
├── ReadingSessionTimer.tsx
├── ReadingGoalCard.tsx
├── ReadingStreakBadge.tsx
├── ReadingStatsWidget.tsx
├── CurrentlyReadingList.tsx
├── index.ts
└── README.md
```

## Browser Support

All components use modern CSS features:
- CSS Grid
- Flexbox
- Custom properties
- Transitions and animations

Tested on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance Considerations

- Components are client-side rendered ("use client")
- Reading session timer uses useEffect cleanup
- Progress animations use CSS transitions (GPU-accelerated)
- Auto-save is throttled to prevent excessive API calls

## Accessibility

- Semantic HTML elements
- ARIA labels on interactive elements
- Keyboard navigation support
- Focus indicators on buttons
- Sufficient color contrast ratios

## License

Part of the Bookshelf application.
