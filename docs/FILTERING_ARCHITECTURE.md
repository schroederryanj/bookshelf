# Advanced Filtering, Search, and Sorting Architecture

**Design Date:** 2026-01-17
**Version:** 1.0
**Technical Stack:** Next.js 16, React 19, Prisma, MariaDB

---

## 1. API Query Parameter Schema

### 1.1 Query Parameter Interface

```typescript
interface BookQueryParams {
  // Pagination
  page?: string;           // Default: "1"
  limit?: string;          // Default: "50", Max: "100"

  // Multi-criteria filtering
  genres?: string;         // Comma-separated: "Fantasy,Sci-Fi"
  minRating?: string;      // Float: "3.5"
  maxRating?: string;      // Float: "5.0"
  readStatus?: string;     // Enum: "read" | "reading" | "unread" | "dnf"
  author?: string;         // Partial match: "Sanderson"
  minPages?: string;       // Integer: "200"
  maxPages?: string;       // Integer: "800"
  shelf?: string;          // Integer: "1"

  // Search
  search?: string;         // Full-text search across title, author, description
  searchFields?: string;   // Comma-separated: "title,author,description"

  // Sorting
  sortBy?: string;         // Enum: see SortOptions below
  sortOrder?: string;      // Enum: "asc" | "desc"

  // Random picker
  random?: string;         // Boolean: "true" - returns 1 random book from filtered results
  randomSeed?: string;     // Integer: for reproducible random selection
}
```

### 1.2 Sort Options Enum

```typescript
enum SortField {
  DATE_ADDED = "createdAt",           // Database column
  DATE_FINISHED = "dateFinished",     // Nullable field
  RATING_OVERALL = "ratingOverall",   // Calculated or manual
  AUTHOR = "author",                  // Alphabetical
  PAGE_COUNT = "pages",               // Numeric
  TITLE = "title",                    // Alphabetical
  POSITION = "position",              // Default shelf order
  DATE_STARTED = "dateStarted",       // Reading progress
  PROGRESS = "progressPercent",       // Join with ReadingProgress
}

enum SortOrder {
  ASC = "asc",
  DESC = "desc"
}
```

### 1.3 Example Query URLs

```
GET /api/books?genres=Fantasy,Sci-Fi&minRating=4.0&readStatus=read&sortBy=dateFinished&sortOrder=desc

GET /api/books?search=dragons&searchFields=title,description&sortBy=ratingOverall&sortOrder=desc

GET /api/books?genres=Mystery&minPages=300&maxPages=500&random=true

GET /api/books?author=Sanderson&sortBy=dateAdded&sortOrder=asc&page=2&limit=20
```

---

## 2. Component Architecture

### 2.1 Component Hierarchy

```
BookshelfPage (Server Component)
├── FilterBar (Client Component)
│   ├── GenreFilter (Multi-select dropdown)
│   ├── RatingFilter (Range slider)
│   ├── ReadStatusFilter (Checkbox group)
│   └── AdvancedFilters (Collapsible)
│       ├── PageRangeFilter
│       └── AuthorFilter
├── SearchInput (Client Component)
│   └── SearchFieldSelector (Dropdown)
├── SortDropdown (Client Component)
├── RandomPicker (Client Component)
├── FilterSummary (Server Component - shows active filters)
└── BookGrid (Server Component)
    └── BookCard (Client Component)
```

### 2.2 Component Specifications

#### FilterBar Component
```typescript
// components/filtering/FilterBar.tsx
'use client'

interface FilterBarProps {
  initialFilters: FilterState;
  availableGenres: string[];
  onFilterChange: (filters: FilterState) => void;
}

interface FilterState {
  genres: string[];
  minRating: number | null;
  maxRating: number | null;
  readStatus: ReadStatus[];
  minPages: number | null;
  maxPages: number | null;
  author: string | null;
}

export function FilterBar({
  initialFilters,
  availableGenres,
  onFilterChange
}: FilterBarProps) {
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [isExpanded, setIsExpanded] = useState(false);

  // Debounced filter application to URL
  const debouncedApply = useDebouncedCallback(
    (newFilters: FilterState) => {
      const searchParams = new URLSearchParams();
      // Convert filters to URL params
      onFilterChange(newFilters);
    },
    500
  );

  return (
    <div className="filter-bar">
      {/* Genre multi-select */}
      <GenreFilter
        selected={filters.genres}
        options={availableGenres}
        onChange={(genres) => {
          const updated = { ...filters, genres };
          setFilters(updated);
          debouncedApply(updated);
        }}
      />

      {/* Rating range slider */}
      <RatingFilter
        min={filters.minRating}
        max={filters.maxRating}
        onChange={(min, max) => {
          const updated = { ...filters, minRating: min, maxRating: max };
          setFilters(updated);
          debouncedApply(updated);
        }}
      />

      {/* Read status checkboxes */}
      <ReadStatusFilter
        selected={filters.readStatus}
        onChange={(status) => {
          const updated = { ...filters, readStatus: status };
          setFilters(updated);
          debouncedApply(updated);
        }}
      />

      {/* Advanced filters (collapsible) */}
      <button onClick={() => setIsExpanded(!isExpanded)}>
        Advanced Filters {isExpanded ? '▲' : '▼'}
      </button>

      {isExpanded && (
        <AdvancedFilters
          filters={filters}
          onUpdate={(partial) => {
            const updated = { ...filters, ...partial };
            setFilters(updated);
            debouncedApply(updated);
          }}
        />
      )}

      {/* Clear all button */}
      <button onClick={() => {
        const cleared = getDefaultFilters();
        setFilters(cleared);
        onFilterChange(cleared);
      }}>
        Clear All
      </button>
    </div>
  );
}
```

#### SearchInput Component
```typescript
// components/filtering/SearchInput.tsx
'use client'

interface SearchInputProps {
  initialQuery: string;
  initialFields: SearchField[];
  onSearch: (query: string, fields: SearchField[]) => void;
}

type SearchField = 'title' | 'author' | 'description';

export function SearchInput({
  initialQuery,
  initialFields,
  onSearch
}: SearchInputProps) {
  const [query, setQuery] = useState(initialQuery);
  const [fields, setFields] = useState<SearchField[]>(initialFields);

  const debouncedSearch = useDebouncedCallback(
    (q: string, f: SearchField[]) => {
      onSearch(q, f);
    },
    300
  );

  return (
    <div className="search-input">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          const newQuery = e.target.value;
          setQuery(newQuery);
          debouncedSearch(newQuery, fields);
        }}
        placeholder="Search books..."
        className="search-field"
      />

      <SearchFieldSelector
        selected={fields}
        onChange={(newFields) => {
          setFields(newFields);
          debouncedSearch(query, newFields);
        }}
      />

      {query && (
        <button onClick={() => {
          setQuery('');
          onSearch('', fields);
        }}>
          Clear
        </button>
      )}
    </div>
  );
}
```

#### SortDropdown Component
```typescript
// components/filtering/SortDropdown.tsx
'use client'

interface SortDropdownProps {
  initialSort: SortField;
  initialOrder: SortOrder;
  onSortChange: (field: SortField, order: SortOrder) => void;
}

export function SortDropdown({
  initialSort,
  initialOrder,
  onSortChange
}: SortDropdownProps) {
  const [sortBy, setSortBy] = useState(initialSort);
  const [sortOrder, setSortOrder] = useState(initialOrder);

  const sortOptions = [
    { value: 'createdAt', label: 'Date Added' },
    { value: 'dateFinished', label: 'Date Finished' },
    { value: 'ratingOverall', label: 'Rating' },
    { value: 'author', label: 'Author' },
    { value: 'pages', label: 'Page Count' },
    { value: 'title', label: 'Title' },
    { value: 'position', label: 'Shelf Position' },
  ];

  return (
    <div className="sort-dropdown">
      <select
        value={sortBy}
        onChange={(e) => {
          const newSort = e.target.value as SortField;
          setSortBy(newSort);
          onSortChange(newSort, sortOrder);
        }}
      >
        {sortOptions.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <button
        onClick={() => {
          const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
          setSortOrder(newOrder);
          onSortChange(sortBy, newOrder);
        }}
        title={`Sort ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
      >
        {sortOrder === 'asc' ? '↑' : '↓'}
      </button>
    </div>
  );
}
```

#### RandomPicker Component
```typescript
// components/filtering/RandomPicker.tsx
'use client'

interface RandomPickerProps {
  totalFilteredBooks: number;
  onPickRandom: () => void;
}

export function RandomPicker({
  totalFilteredBooks,
  onPickRandom
}: RandomPickerProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    onPickRandom();
    // Loading state will be cleared by parent navigation
  };

  return (
    <button
      onClick={handleClick}
      disabled={totalFilteredBooks === 0 || isLoading}
      className="random-picker-btn"
    >
      {isLoading ? (
        <span>Picking...</span>
      ) : (
        <>
          <span>🎲</span>
          <span>Random Book ({totalFilteredBooks})</span>
        </>
      )}
    </button>
  );
}
```

---

## 3. State Management Strategy

### 3.1 URL-First Architecture (Recommended)

**Pattern:** All filter/search/sort state lives in URL search parameters

**Benefits:**
- Shareable URLs with exact filter state
- Browser back/forward navigation works correctly
- Server-side rendering friendly
- No client-side state synchronization issues
- Bookmarkable filtered views

**Implementation:**

```typescript
// app/bookshelf/page.tsx (Server Component)
interface BookshelfPageProps {
  searchParams: {
    page?: string;
    limit?: string;
    genres?: string;
    minRating?: string;
    maxRating?: string;
    readStatus?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    random?: string;
  };
}

export default async function BookshelfPage({
  searchParams
}: BookshelfPageProps) {
  // Parse search params into typed filters
  const filters = parseFilters(searchParams);

  // Fetch books with filters (server-side)
  const { books, total, metadata } = await fetchFilteredBooks(filters);

  // Fetch available genres for filter dropdown
  const availableGenres = await getUniqueGenres();

  return (
    <div>
      <FilterControls
        initialFilters={filters}
        availableGenres={availableGenres}
      />

      <FilterSummary
        filters={filters}
        totalResults={total}
      />

      <BookGrid books={books} />

      <Pagination
        currentPage={filters.page}
        totalPages={metadata.totalPages}
      />
    </div>
  );
}
```

```typescript
// components/filtering/FilterControls.tsx (Client Component)
'use client'

export function FilterControls({
  initialFilters,
  availableGenres
}: FilterControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateFilters = (newFilters: Partial<FilterState>) => {
    const params = new URLSearchParams(searchParams.toString());

    // Update URL params
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        params.delete(key);
      } else if (Array.isArray(value)) {
        params.set(key, value.join(','));
      } else {
        params.set(key, String(value));
      }
    });

    // Reset to page 1 when filters change
    params.set('page', '1');

    // Navigate with new params (triggers server re-render)
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <>
      <FilterBar
        initialFilters={initialFilters}
        availableGenres={availableGenres}
        onFilterChange={updateFilters}
      />

      <SearchInput
        initialQuery={initialFilters.search || ''}
        onSearch={(query) => updateFilters({ search: query })}
      />

      <SortDropdown
        initialSort={initialFilters.sortBy}
        initialOrder={initialFilters.sortOrder}
        onSortChange={(field, order) =>
          updateFilters({ sortBy: field, sortOrder: order })
        }
      />

      <RandomPicker
        totalFilteredBooks={initialFilters.totalCount}
        onPickRandom={() => updateFilters({ random: 'true' })}
      />
    </>
  );
}
```

### 3.2 Alternative: Hybrid State (If Needed)

For complex filter UIs that need immediate visual feedback before server round-trip:

```typescript
// Client state for UI responsiveness
const [localFilters, setLocalFilters] = useState(initialFilters);

// Debounced sync to URL/server
const syncToUrl = useDebouncedCallback(
  (filters: FilterState) => updateUrlParams(filters),
  500
);

// Update local state immediately, sync to server after debounce
const handleFilterChange = (newFilters: FilterState) => {
  setLocalFilters(newFilters);  // Instant UI update
  syncToUrl(newFilters);        // Debounced server fetch
};
```

---

## 4. Database Query Optimization

### 4.1 Enhanced Prisma Query Structure

```typescript
// lib/book-queries.ts
import { Prisma } from '@prisma/client';

export interface BookFilters {
  genres?: string[];
  minRating?: number;
  maxRating?: number;
  readStatus?: string[];
  author?: string;
  minPages?: number;
  maxPages?: number;
  search?: string;
  searchFields?: string[];
  shelf?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  random?: boolean;
  randomSeed?: number;
}

export async function fetchFilteredBooks(filters: BookFilters) {
  const {
    genres,
    minRating,
    maxRating,
    readStatus,
    author,
    minPages,
    maxPages,
    search,
    searchFields = ['title', 'author', 'description'],
    shelf,
    sortBy = 'position',
    sortOrder = 'asc',
    page = 1,
    limit = 50,
    random = false,
    randomSeed,
  } = filters;

  // Build WHERE clause
  const where: Prisma.BookWhereInput = {};

  // Genre filter (array contains any)
  if (genres && genres.length > 0) {
    where.genre = {
      in: genres, // Assumes single genre per book
      // For multi-genre support, would need: contains with OR logic
    };
  }

  // Rating range filter
  if (minRating !== undefined || maxRating !== undefined) {
    where.ratingOverall = {};
    if (minRating !== undefined) where.ratingOverall.gte = minRating;
    if (maxRating !== undefined) where.ratingOverall.lte = maxRating;
  }

  // Read status filter
  if (readStatus && readStatus.length > 0) {
    if (readStatus.includes('unread')) {
      // Special case: include null values
      where.OR = [
        { read: { in: readStatus.filter(s => s !== 'unread') } },
        { read: null }
      ];
    } else {
      where.read = { in: readStatus };
    }
  }

  // Author filter (case-insensitive partial match)
  if (author) {
    where.author = {
      contains: author,
      mode: 'insensitive',
    };
  }

  // Page range filter
  if (minPages !== undefined || maxPages !== undefined) {
    where.pages = {};
    if (minPages !== undefined) where.pages.gte = minPages;
    if (maxPages !== undefined) where.pages.lte = maxPages;
  }

  // Full-text search across multiple fields
  if (search) {
    const searchConditions: Prisma.BookWhereInput[] = [];

    if (searchFields.includes('title')) {
      searchConditions.push({
        title: { contains: search, mode: 'insensitive' }
      });
    }
    if (searchFields.includes('author')) {
      searchConditions.push({
        author: { contains: search, mode: 'insensitive' }
      });
    }
    if (searchFields.includes('description')) {
      searchConditions.push({
        description: { contains: search, mode: 'insensitive' }
      });
    }

    // Combine with existing OR clause if present
    if (where.OR) {
      where.AND = [
        { OR: where.OR },
        { OR: searchConditions }
      ];
      delete where.OR;
    } else {
      where.OR = searchConditions;
    }
  }

  // Shelf filter
  if (shelf !== undefined) {
    where.shelf = shelf;
  }

  // Random selection
  if (random) {
    const allIds = await prisma.book.findMany({
      where,
      select: { id: true },
    });

    if (allIds.length === 0) {
      return {
        books: [],
        total: 0,
        page: 1,
        limit: 1,
        totalPages: 0,
        hasMore: false,
        isRandom: true,
      };
    }

    // Seeded random for reproducibility
    const seed = randomSeed || Math.floor(Math.random() * 1000000);
    const randomIndex = seededRandom(seed, allIds.length);
    const randomBook = await prisma.book.findUnique({
      where: { id: allIds[randomIndex].id },
      include: {
        readingProgress: {
          where: { userId: 'default' },
          take: 1,
        },
      },
    });

    return {
      books: randomBook ? [randomBook] : [],
      total: allIds.length,
      page: 1,
      limit: 1,
      totalPages: 1,
      hasMore: false,
      isRandom: true,
      randomSeed: seed,
    };
  }

  // Build ORDER BY clause
  const orderBy = buildOrderBy(sortBy, sortOrder);

  // Pagination
  const skip = (page - 1) * limit;

  // Execute parallel queries for efficiency
  const [books, total] = await Promise.all([
    prisma.book.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        readingProgress: {
          where: { userId: 'default' },
          take: 1,
        },
      },
    }),
    prisma.book.count({ where }),
  ]);

  return {
    books,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasMore: skip + books.length < total,
    isRandom: false,
  };
}

function buildOrderBy(
  sortBy: string,
  sortOrder: 'asc' | 'desc'
): Prisma.BookOrderByWithRelationInput {
  // Handle special cases
  if (sortBy === 'progressPercent') {
    // Sort by reading progress (requires join)
    return {
      readingProgress: {
        _count: sortOrder, // Fallback: books with progress first
      },
    };
  }

  // Standard sorting
  return {
    [sortBy]: sortOrder,
  };
}

// Seeded random number generator for reproducible random selection
function seededRandom(seed: number, max: number): number {
  const x = Math.sin(seed) * 10000;
  return Math.floor((x - Math.floor(x)) * max);
}
```

### 4.2 Required Database Indexes

**Add to schema.prisma:**

```prisma
model Book {
  // ... existing fields ...

  @@index([genre])           // For genre filtering
  @@index([ratingOverall])   // For rating sorting/filtering
  @@index([pages])           // For page range filtering
  @@index([createdAt])       // For date added sorting
  @@index([dateFinished])    // For date finished sorting
  @@index([read])            // For read status filtering (already exists)
  @@index([author])          // For author filtering/sorting (already exists)
  @@index([title])           // For title sorting/search (already exists)
}
```

**Migration command:**
```bash
npx prisma migrate dev --name add_filtering_indexes
```

### 4.3 Performance Optimizations

#### Optimize for multi-genre support (future)
If books need multiple genres, modify schema:

```prisma
model Book {
  // ... existing fields ...
  genres String[] @db.VarChar(255) // Array of genres in MariaDB

  @@index([genres]) // Index on array field
}
```

#### Query result caching
For popular filter combinations:

```typescript
// lib/cache.ts
import { unstable_cache } from 'next/cache';

export const getCachedFilteredBooks = unstable_cache(
  async (filters: BookFilters) => fetchFilteredBooks(filters),
  ['filtered-books'],
  {
    revalidate: 60, // Cache for 60 seconds
    tags: ['books'],
  }
);

// Revalidate on book mutations
import { revalidateTag } from 'next/cache';

export async function updateBook(id: number, data: BookUpdateInput) {
  const result = await prisma.book.update({ where: { id }, data });
  revalidateTag('books'); // Invalidate all cached book queries
  return result;
}
```

#### Database-level full-text search (optional upgrade)
For better search performance at scale:

```sql
-- Add FULLTEXT index (MariaDB 10.0.5+)
ALTER TABLE Book ADD FULLTEXT INDEX ft_search (title, author, description);
```

```typescript
// Use raw SQL for FULLTEXT search
const books = await prisma.$queryRaw`
  SELECT * FROM Book
  WHERE MATCH(title, author, description) AGAINST(${search} IN NATURAL LANGUAGE MODE)
  LIMIT ${limit}
`;
```

---

## 5. API Route Implementation

### 5.1 Enhanced GET Route

```typescript
// app/api/books/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchFilteredBooks, type BookFilters } from '@/lib/book-queries';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse filters from query params
    const filters: BookFilters = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: Math.min(100, parseInt(searchParams.get('limit') || '50')),

      // Multi-criteria filters
      genres: searchParams.get('genres')?.split(',').filter(Boolean),
      minRating: searchParams.has('minRating')
        ? parseFloat(searchParams.get('minRating')!)
        : undefined,
      maxRating: searchParams.has('maxRating')
        ? parseFloat(searchParams.get('maxRating')!)
        : undefined,
      readStatus: searchParams.get('readStatus')?.split(',').filter(Boolean),
      author: searchParams.get('author') || undefined,
      minPages: searchParams.has('minPages')
        ? parseInt(searchParams.get('minPages')!)
        : undefined,
      maxPages: searchParams.has('maxPages')
        ? parseInt(searchParams.get('maxPages')!)
        : undefined,
      shelf: searchParams.has('shelf')
        ? parseInt(searchParams.get('shelf')!)
        : undefined,

      // Search
      search: searchParams.get('search') || undefined,
      searchFields: searchParams.get('searchFields')?.split(',') as any,

      // Sorting
      sortBy: searchParams.get('sortBy') || 'position',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc',

      // Random
      random: searchParams.get('random') === 'true',
      randomSeed: searchParams.has('randomSeed')
        ? parseInt(searchParams.get('randomSeed')!)
        : undefined,
    };

    // Fetch filtered books
    const result = await fetchFilteredBooks(filters);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error fetching filtered books:', error);
    return NextResponse.json(
      { error: 'Failed to fetch books' },
      { status: 500 }
    );
  }
}
```

---

## 6. Type Definitions

```typescript
// lib/types/filtering.ts

export type ReadStatus = 'read' | 'reading' | 'unread' | 'dnf';

export type SortField =
  | 'createdAt'
  | 'dateFinished'
  | 'ratingOverall'
  | 'author'
  | 'pages'
  | 'title'
  | 'position'
  | 'dateStarted'
  | 'progressPercent';

export type SortOrder = 'asc' | 'desc';

export type SearchField = 'title' | 'author' | 'description';

export interface FilterState {
  genres: string[];
  minRating: number | null;
  maxRating: number | null;
  readStatus: ReadStatus[];
  minPages: number | null;
  maxPages: number | null;
  author: string | null;
  search: string;
  searchFields: SearchField[];
  sortBy: SortField;
  sortOrder: SortOrder;
  page: number;
  limit: number;
}

export interface BookQueryResult {
  books: Book[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
  isRandom?: boolean;
  randomSeed?: number;
}

export const DEFAULT_FILTERS: FilterState = {
  genres: [],
  minRating: null,
  maxRating: null,
  readStatus: [],
  minPages: null,
  maxPages: null,
  author: null,
  search: '',
  searchFields: ['title', 'author', 'description'],
  sortBy: 'position',
  sortOrder: 'asc',
  page: 1,
  limit: 50,
};
```

---

## 7. Utility Functions

```typescript
// lib/utils/filter-utils.ts

export function parseFilters(searchParams: Record<string, string | undefined>): FilterState {
  return {
    genres: searchParams.genres?.split(',').filter(Boolean) || [],
    minRating: searchParams.minRating ? parseFloat(searchParams.minRating) : null,
    maxRating: searchParams.maxRating ? parseFloat(searchParams.maxRating) : null,
    readStatus: (searchParams.readStatus?.split(',') as ReadStatus[]) || [],
    minPages: searchParams.minPages ? parseInt(searchParams.minPages) : null,
    maxPages: searchParams.maxPages ? parseInt(searchParams.maxPages) : null,
    author: searchParams.author || null,
    search: searchParams.search || '',
    searchFields: (searchParams.searchFields?.split(',') as SearchField[]) || ['title', 'author', 'description'],
    sortBy: (searchParams.sortBy as SortField) || 'position',
    sortOrder: (searchParams.sortOrder as SortOrder) || 'asc',
    page: parseInt(searchParams.page || '1'),
    limit: parseInt(searchParams.limit || '50'),
  };
}

export function filtersToSearchParams(filters: Partial<FilterState>): URLSearchParams {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return;

    if (Array.isArray(value)) {
      if (value.length > 0) params.set(key, value.join(','));
    } else {
      params.set(key, String(value));
    }
  });

  return params;
}

export function getActiveFilterCount(filters: FilterState): number {
  let count = 0;

  if (filters.genres.length > 0) count++;
  if (filters.minRating !== null || filters.maxRating !== null) count++;
  if (filters.readStatus.length > 0) count++;
  if (filters.minPages !== null || filters.maxPages !== null) count++;
  if (filters.author) count++;
  if (filters.search) count++;

  return count;
}
```

---

## 8. Implementation Phases

### Phase 1: API Foundation (Week 1)
- Enhance `/api/books` route with full filter/sort support
- Add database indexes
- Implement `fetchFilteredBooks` query builder
- Write unit tests for query generation

### Phase 2: Core Components (Week 2)
- FilterBar with genre + rating + read status
- SearchInput with field selection
- SortDropdown with all options
- URL-based state management

### Phase 3: Advanced Features (Week 3)
- RandomPicker with seeded selection
- AdvancedFilters (page range, author)
- FilterSummary component
- Performance optimization and caching

### Phase 4: Polish & Testing (Week 4)
- Responsive design for mobile
- Loading states and skeletons
- Error handling and empty states
- E2E testing with Playwright

---

## 9. Performance Considerations

### Expected Query Performance
- Simple filter (genre only): <50ms
- Multi-criteria filter: <100ms
- Full-text search: <150ms
- Random selection: <200ms (needs ID fetch + random pick)

### Scaling Strategies
1. Add Redis caching for popular filter combinations
2. Implement database read replicas for search-heavy loads
3. Use MariaDB FULLTEXT indexes for better search
4. Consider ElasticSearch for advanced search features at scale

### Client-Side Optimization
- Debounce filter/search inputs (300-500ms)
- Use React.memo for filter components
- Implement virtual scrolling for large result sets
- Prefetch next page in pagination

---

## 10. Testing Strategy

### Unit Tests
```typescript
describe('fetchFilteredBooks', () => {
  it('should filter by genre', async () => {
    const result = await fetchFilteredBooks({ genres: ['Fantasy'] });
    expect(result.books.every(b => b.genre === 'Fantasy')).toBe(true);
  });

  it('should filter by rating range', async () => {
    const result = await fetchFilteredBooks({ minRating: 4.0, maxRating: 5.0 });
    expect(result.books.every(b => b.ratingOverall >= 4.0 && b.ratingOverall <= 5.0)).toBe(true);
  });

  it('should search across multiple fields', async () => {
    const result = await fetchFilteredBooks({
      search: 'dragon',
      searchFields: ['title', 'description']
    });
    expect(result.books.length).toBeGreaterThan(0);
  });
});
```

### Integration Tests
- API route with various query combinations
- Pagination edge cases
- Random selection reproducibility

### E2E Tests (Playwright)
```typescript
test('should filter books by genre and rating', async ({ page }) => {
  await page.goto('/bookshelf');

  // Select Fantasy genre
  await page.click('[data-testid="genre-filter"]');
  await page.click('[data-testid="genre-fantasy"]');

  // Set min rating to 4
  await page.fill('[data-testid="min-rating"]', '4');

  // Verify results
  const books = await page.$$('[data-testid="book-card"]');
  expect(books.length).toBeGreaterThan(0);

  // Verify URL updated
  expect(page.url()).toContain('genres=Fantasy');
  expect(page.url()).toContain('minRating=4');
});
```

---

## 11. Migration Path

### Backward Compatibility
- Maintain existing `/api/books` behavior for legacy params
- Add new params incrementally
- Deprecate old params gradually

### Data Migration
```sql
-- Ensure all books have valid ratings
UPDATE Book SET ratingOverall = 0 WHERE ratingOverall IS NULL;

-- Create computed column for multi-genre support (future)
ALTER TABLE Book ADD COLUMN genreArray JSON;
UPDATE Book SET genreArray = JSON_ARRAY(genre) WHERE genre IS NOT NULL;
```

---

## Appendix: File Structure

```
/home/ryan/code/bookshelf/
├── app/
│   ├── api/
│   │   └── books/
│   │       └── route.ts (enhanced)
│   └── bookshelf/
│       └── page.tsx (server component with filters)
├── components/
│   └── filtering/
│       ├── FilterBar.tsx
│       ├── GenreFilter.tsx
│       ├── RatingFilter.tsx
│       ├── ReadStatusFilter.tsx
│       ├── AdvancedFilters.tsx
│       ├── SearchInput.tsx
│       ├── SearchFieldSelector.tsx
│       ├── SortDropdown.tsx
│       ├── RandomPicker.tsx
│       ├── FilterSummary.tsx
│       └── FilterControls.tsx
├── lib/
│   ├── book-queries.ts (new - all query logic)
│   ├── utils/
│   │   └── filter-utils.ts (new)
│   └── types/
│       └── filtering.ts (new)
└── tests/
    ├── unit/
    │   └── book-queries.test.ts
    ├── integration/
    │   └── api-books.test.ts
    └── e2e/
        └── filtering.spec.ts
```
