# Reading Progress Implementation Guide

## Overview

This guide covers the implementation of the Reading Progress Tracking feature for the bookshelf application.

## ✅ Completed Components

### Core UI Components
All components are located in `/home/ryan/code/bookshelf/components/reading-progress/`

1. **ReadingProgressBar.tsx** - Visual progress indicator with percentage
2. **ReadingSessionTimer.tsx** - Interactive timer with auto-save
3. **ReadingGoalCard.tsx** - Goal management with progress tracking
4. **ReadingStreakBadge.tsx** - Streak display with milestones
5. **ReadingStatsWidget.tsx** - Comprehensive statistics dashboard
6. **CurrentlyReadingList.tsx** - List of books in progress

### Enhanced Components
Located in `/home/ryan/code/bookshelf/components/`

7. **EnhancedStats.tsx** - Stats component with reading streak badge

### Updated Components
8. **Shelf.tsx** - Updated to include reading progress in book modal

### Demo Pages
Located in `/home/ryan/code/bookshelf/app/`

9. **reading-progress/page.tsx** - Standalone demo of all components
10. **bookshelf-enhanced/page.tsx** - Bookshelf with enhanced stats

## File Locations

```
/home/ryan/code/bookshelf/
├── components/
│   ├── reading-progress/
│   │   ├── ReadingProgressBar.tsx
│   │   ├── ReadingSessionTimer.tsx
│   │   ├── ReadingGoalCard.tsx
│   │   ├── ReadingStreakBadge.tsx
│   │   ├── ReadingStatsWidget.tsx
│   │   ├── CurrentlyReadingList.tsx
│   │   ├── index.ts
│   │   └── README.md
│   ├── EnhancedStats.tsx
│   └── Shelf.tsx (updated)
├── app/
│   ├── reading-progress/
│   │   └── page.tsx
│   └── bookshelf-enhanced/
│       └── page.tsx
└── docs/
    └── reading-progress-implementation.md
```

## Quick Start

### 1. View the Demo

Visit the demo page to see all components in action:
```
http://localhost:3000/reading-progress
```

### 2. Use Individual Components

Import components as needed:

```tsx
import {
  ReadingProgressBar,
  ReadingSessionTimer,
  ReadingGoalCard,
  ReadingStreakBadge,
  ReadingStatsWidget,
  CurrentlyReadingList
} from "@/components/reading-progress";
```

### 3. Enhanced Bookshelf

View the enhanced bookshelf with reading streak:
```
http://localhost:3000/bookshelf-enhanced
```

## Integration Steps

### Step 1: Update Database Schema

Add these fields to your Prisma schema:

```prisma
// In prisma/schema.prisma

model Book {
  // ... existing fields
  currentPage     Int?     // Add this for tracking progress
  readingSessions ReadingSession[]
}

model ReadingSession {
  id        Int      @id @default(autoincrement())
  bookId    Int
  book      Book     @relation(fields: [bookId], references: [id])
  duration  Int      // Duration in seconds
  timestamp DateTime @default(now())

  @@index([bookId])
  @@index([timestamp])
}

model ReadingGoal {
  id        Int      @id @default(autoincrement())
  userId    Int?
  type      String   // "books_per_month" | "books_per_year" | "pages_per_day"
  target    Int
  current   Int      @default(0)
  startDate DateTime
  endDate   DateTime?

  @@index([userId])
  @@index([type])
}

model ReadingStreak {
  id            Int      @id @default(autoincrement())
  userId        Int      @unique
  currentStreak Int      @default(0)
  longestStreak Int      @default(0)
  lastReadDate  DateTime?
}
```

Then run:
```bash
npx prisma migrate dev --name add_reading_progress
npx prisma generate
```

### Step 2: Create API Routes

Create these API routes for backend functionality:

#### `/app/api/reading-sessions/route.ts`
```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { bookId, duration, timestamp } = await request.json();

    const session = await prisma.readingSession.create({
      data: {
        bookId,
        duration,
        timestamp: new Date(timestamp),
      },
    });

    return NextResponse.json(session);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save reading session" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get("bookId");

    const sessions = bookId
      ? await prisma.readingSession.findMany({
          where: { bookId: parseInt(bookId) },
          orderBy: { timestamp: "desc" },
        })
      : await prisma.readingSession.findMany({
          orderBy: { timestamp: "desc" },
          take: 50,
        });

    return NextResponse.json(sessions);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch reading sessions" },
      { status: 500 }
    );
  }
}
```

#### `/app/api/reading-goals/route.ts`
```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const goals = await prisma.readingGoal.findMany({
      orderBy: { startDate: "desc" },
    });
    return NextResponse.json(goals);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch reading goals" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { type, target, startDate } = await request.json();

    const goal = await prisma.readingGoal.create({
      data: {
        type,
        target,
        current: 0,
        startDate: new Date(startDate),
      },
    });

    return NextResponse.json(goal);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create reading goal" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, target, current } = await request.json();

    const goal = await prisma.readingGoal.update({
      where: { id },
      data: {
        ...(target !== undefined && { target }),
        ...(current !== undefined && { current }),
      },
    });

    return NextResponse.json(goal);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update reading goal" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Goal ID required" },
        { status: 400 }
      );
    }

    await prisma.readingGoal.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete reading goal" },
      { status: 500 }
    );
  }
}
```

#### `/app/api/reading-streak/route.ts`
```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "1"; // Default user

    const streak = await prisma.readingStreak.findUnique({
      where: { userId: parseInt(userId) },
    });

    if (!streak) {
      // Create initial streak record
      const newStreak = await prisma.readingStreak.create({
        data: {
          userId: parseInt(userId),
          currentStreak: 0,
          longestStreak: 0,
        },
      });
      return NextResponse.json(newStreak);
    }

    return NextResponse.json(streak);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch reading streak" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, readDate } = await request.json();

    const streak = await prisma.readingStreak.findUnique({
      where: { userId },
    });

    const today = new Date(readDate);
    const lastRead = streak?.lastReadDate ? new Date(streak.lastReadDate) : null;

    let currentStreak = 1;
    let longestStreak = streak?.longestStreak || 1;

    if (lastRead) {
      const daysDiff = Math.floor(
        (today.getTime() - lastRead.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === 1) {
        // Consecutive day
        currentStreak = (streak?.currentStreak || 0) + 1;
      } else if (daysDiff > 1) {
        // Streak broken
        currentStreak = 1;
      } else {
        // Same day
        currentStreak = streak?.currentStreak || 1;
      }
    }

    longestStreak = Math.max(longestStreak, currentStreak);

    const updatedStreak = await prisma.readingStreak.upsert({
      where: { userId },
      update: {
        currentStreak,
        longestStreak,
        lastReadDate: today,
      },
      create: {
        userId,
        currentStreak,
        longestStreak,
        lastReadDate: today,
      },
    });

    return NextResponse.json(updatedStreak);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update reading streak" },
      { status: 500 }
    );
  }
}
```

### Step 3: Update Book Pages

Add progress tracking to your existing book detail pages:

```tsx
// In your book detail component
import { ReadingProgressBar, ReadingSessionTimer } from "@/components/reading-progress";

// In the render:
{book.read === "Reading" && (
  <>
    <ReadingProgressBar
      currentPage={book.currentPage || 0}
      totalPages={book.pages || 0}
      size="md"
    />

    <ReadingSessionTimer
      bookId={book.id}
      onSessionComplete={async (duration) => {
        // Update stats
        await fetch("/api/reading-sessions", {
          method: "POST",
          body: JSON.stringify({
            bookId: book.id,
            duration,
            timestamp: new Date().toISOString()
          })
        });
      }}
    />
  </>
)}
```

## Features Implemented

### ✅ Progress Tracking
- Visual progress bars with percentage
- Progress update controls
- Multiple size variants (sm, md, lg)

### ✅ Reading Sessions
- Start/pause/resume timer
- Auto-save every 60 seconds (configurable)
- Session history tracking
- Time formatting (hours, minutes, seconds)

### ✅ Reading Goals
- Books per month/year
- Pages per day
- Progress visualization
- Editable targets
- Goal completion detection

### ✅ Reading Streaks
- Current streak tracking
- Longest streak record
- "On fire" styling for 7+ days
- Milestone celebrations (every 10 days)

### ✅ Statistics Dashboard
- Books read (month/year)
- Pages read (week/month)
- Average reading speed
- Total reading time
- Favorite genre
- Compact and full layouts

### ✅ Currently Reading List
- List view of in-progress books
- Inline progress editing
- Reading duration calculation
- Book cover thumbnails

## Testing

Run the development server:
```bash
npm run dev
```

Visit these URLs:
- `/reading-progress` - Full component demo
- `/bookshelf-enhanced` - Enhanced bookshelf with streak
- `/bookshelf` - Original bookshelf with progress in modals

## Next Steps

### Backend Implementation
1. Implement the API routes shown above
2. Run database migrations
3. Seed initial data for testing

### Frontend Enhancements
1. Add real-time progress updates
2. Connect components to API endpoints
3. Add user authentication
4. Implement progress persistence

### Additional Features
1. Reading statistics charts (Chart.js, Recharts)
2. Reading challenges
3. Social features (share progress)
4. Export reading data
5. Reading recommendations based on goals

## Styling Customization

All components use Tailwind CSS and follow the vintage book theme:

```tsx
// Color variables (can be extracted to theme)
const colors = {
  primary: "#3d2e1f",
  secondary: "#6b5a4a",
  accent: "#8b5a2b",
  success: "#2d5a27",
  background: "linear-gradient(135deg, #fef9ed 0%, #f5ebe0 100%)",
  border: "#c4a77d",
};
```

To customize, update the color classes in each component.

## Performance Notes

- All components are client-side rendered
- Auto-save is throttled to reduce API calls
- CSS transitions are GPU-accelerated
- Components use React hooks for state management
- No external dependencies beyond React/Next.js

## Accessibility

- ARIA labels on all interactive elements
- Keyboard navigation support
- Semantic HTML structure
- Sufficient color contrast
- Focus indicators on buttons

## Support

For questions or issues:
1. Check component README: `/components/reading-progress/README.md`
2. Review demo page: `/app/reading-progress/page.tsx`
3. Check implementation guide: `/docs/reading-progress-implementation.md`

## License

Part of the bookshelf application.
