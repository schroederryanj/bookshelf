# Filtering Architecture - Quick Reference

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User Browser                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  URL: /bookshelf?genres=Fantasy&minRating=4.0&sortBy=ratingOverall  │
│                              ↓                                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  BookshelfPage (Server Component)                             │  │
│  │  - Parses URL searchParams                                    │  │
│  │  - Fetches filtered books server-side                         │  │
│  │  - Pre-renders with data                                      │  │
│  └────────────────┬─────────────────────────────────────────────┘  │
│                   │                                                   │
│  ┌────────────────▼─────────────────────────────────────────────┐  │
│  │  FilterControls (Client Component)                            │  │
│  │  ┌──────────────┐ ┌────────────┐ ┌─────────────┐            │  │
│  │  │ FilterBar    │ │ SearchInput│ │ SortDropdown│            │  │
│  │  │ - Genre      │ │ - Query    │ │ - Field     │            │  │
│  │  │ - Rating     │ │ - Fields   │ │ - Order     │            │  │
│  │  │ - Status     │ └────────────┘ └─────────────┘            │  │
│  │  └──────────────┘                                             │  │
│  │  ┌──────────────┐                                             │  │
│  │  │ RandomPicker │                                             │  │
│  │  └──────────────┘                                             │  │
│  │                                                                 │  │
│  │  onChange → updateURL() → router.push() → Server Re-render    │  │
│  └────────────────┬─────────────────────────────────────────────┘  │
│                   │                                                   │
│  ┌────────────────▼─────────────────────────────────────────────┐  │
│  │  BookGrid (Server Component)                                  │  │
│  │  - Renders filtered books                                     │  │
│  │  - Client-side interactions (hover, click)                    │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      Next.js Server                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  GET /api/books?genres=Fantasy&minRating=4.0&sortBy=ratingOverall   │
│                              ↓                                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  API Route Handler                                            │  │
│  │  - Parse & validate query params                              │  │
│  │  - Call fetchFilteredBooks(filters)                           │  │
│  └────────────────┬─────────────────────────────────────────────┘  │
│                   │                                                   │
│  ┌────────────────▼─────────────────────────────────────────────┐  │
│  │  fetchFilteredBooks() - lib/book-queries.ts                   │  │
│  │  ┌──────────────────────────────────────────────────────────┐ │  │
│  │  │ Build WHERE clause:                                       │ │  │
│  │  │  - genres → { genre: { in: [...] } }                     │ │  │
│  │  │  - rating → { ratingOverall: { gte, lte } }              │ │  │
│  │  │  - search → { OR: [title, author, desc] }                │ │  │
│  │  └──────────────────────────────────────────────────────────┘ │  │
│  │  ┌──────────────────────────────────────────────────────────┐ │  │
│  │  │ Build ORDER BY clause:                                    │ │  │
│  │  │  - sortBy → { [field]: sortOrder }                        │ │  │
│  │  └──────────────────────────────────────────────────────────┘ │  │
│  │  ┌──────────────────────────────────────────────────────────┐ │  │
│  │  │ Execute parallel queries:                                 │ │  │
│  │  │  - prisma.book.findMany({ where, orderBy, skip, take })  │ │  │
│  │  │  - prisma.book.count({ where })                           │ │  │
│  │  └──────────────────────────────────────────────────────────┘ │  │
│  └────────────────┬─────────────────────────────────────────────┘  │
│                   │                                                   │
└───────────────────┼───────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      MariaDB Database                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  SELECT * FROM Book                                                  │
│  WHERE genre IN ('Fantasy')                                          │
│    AND ratingOverall >= 4.0                                          │
│    AND read = 'read'                                                 │
│  ORDER BY ratingOverall DESC                                         │
│  LIMIT 50 OFFSET 0;                                                  │
│                                                                       │
│  Indexes used:                                                       │
│  - @@index([genre])                                                  │
│  - @@index([ratingOverall])                                          │
│  - @@index([read])                                                   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## State Management Flow

```
User Action → Local State Update → Debounced URL Update → Server Re-render → New Data
     ↓              (instant)           (300-500ms)        (server fetch)    (display)
  Click Filter
     │
     └─→ setFilters({ genre: 'Fantasy' })
              │
              └─→ debouncedUpdateUrl()
                       │
                       └─→ router.push('/bookshelf?genres=Fantasy')
                                │
                                └─→ Server re-fetches with new params
                                         │
                                         └─→ Response returned to client
```

---

## Data Flow: Random Book Selection

```
User clicks "Random Book" button
         ↓
URL: /bookshelf?random=true&randomSeed=123456
         ↓
fetchFilteredBooks({ random: true, randomSeed: 123456 })
         ↓
1. Fetch all matching IDs:
   SELECT id FROM Book WHERE [filters]
         ↓
2. Seeded random selection:
   randomIndex = seededRandom(123456, idArray.length)
         ↓
3. Fetch single book:
   SELECT * FROM Book WHERE id = idArray[randomIndex]
         ↓
Return { books: [randomBook], total: totalMatches, randomSeed: 123456 }
```

---

## Component Interaction Pattern

```typescript
// Server Component (no state)
async function BookshelfPage({ searchParams }) {
  const filters = parseFilters(searchParams);
  const data = await fetchFilteredBooks(filters);

  return (
    <FilterControls initialFilters={filters} />
    <BookGrid books={data.books} />
  );
}

// Client Component (manages URL)
function FilterControls({ initialFilters }) {
  const router = useRouter();

  const updateFilters = (newFilters) => {
    const params = filtersToSearchParams(newFilters);
    router.push(`/bookshelf?${params}`); // Triggers server re-render
  };

  return <FilterBar onFilterChange={updateFilters} />;
}
```

---

## Key Design Decisions

### Decision 1: URL-First State Management
**Chosen:** All filter state in URL search parameters
**Alternative:** Local state with API calls
**Rationale:**
- Shareable URLs (users can bookmark filtered views)
- Browser back/forward works correctly
- Server-side rendering friendly
- No state synchronization issues
- SEO-friendly for public pages

### Decision 2: Server Components for Data Fetching
**Chosen:** Server Components fetch data, Client Components handle interactions
**Alternative:** Client-side data fetching with SWR/React Query
**Rationale:**
- Faster initial page load (no waterfall)
- Reduced client bundle size
- Better SEO
- Simpler caching strategy

### Decision 3: Debounced URL Updates
**Chosen:** 300-500ms debounce on filter changes
**Alternative:** Immediate updates
**Rationale:**
- Reduces server load from rapid filter changes
- Better UX for range sliders and text inputs
- Still feels responsive with optimistic UI updates

### Decision 4: Parallel Database Queries
**Chosen:** Run count() and findMany() in parallel
**Alternative:** Sequential queries
**Rationale:**
- 50% faster response time
- No data race issues (same WHERE clause)
- Better resource utilization

### Decision 5: Seeded Random Selection
**Chosen:** Deterministic random with seed parameter
**Alternative:** Pure random (Math.random())
**Rationale:**
- Reproducible results (users can share random picks)
- Enables "re-roll" functionality
- Better for testing

---

## Performance Targets

| Operation | Target | Strategy |
|-----------|--------|----------|
| Simple filter (1 criteria) | <50ms | Single index scan |
| Multi-criteria (3+ filters) | <100ms | Composite index + parallel queries |
| Full-text search | <150ms | Case-insensitive LIKE (upgrade to FULLTEXT) |
| Random selection | <200ms | ID fetch + random pick |
| Sort by date/rating | +10ms | Indexed columns |
| Pagination | +5ms | OFFSET/LIMIT |

---

## Database Index Strategy

```prisma
model Book {
  // High-selectivity indexes (used in WHERE clauses)
  @@index([genre])          // Filter: genre IN (...)
  @@index([ratingOverall])  // Filter: rating >= X
  @@index([read])           // Filter: read status
  @@index([pages])          // Filter: page range

  // Sort indexes (used in ORDER BY)
  @@index([createdAt])      // Sort: date added
  @@index([dateFinished])   // Sort: date finished
  @@index([author])         // Sort: alphabetical
  @@index([title])          // Sort: alphabetical

  // Composite index for common query pattern (future optimization)
  @@index([genre, ratingOverall, read])
}
```

**Index selection priority:**
1. WHERE clause filters (highest selectivity first)
2. ORDER BY columns
3. JOIN columns (for reading progress)

---

## Error Handling & Edge Cases

### Empty Results
```typescript
if (books.length === 0) {
  return (
    <EmptyState
      message="No books found matching your filters"
      action={<button onClick={clearFilters}>Clear Filters</button>}
    />
  );
}
```

### Invalid Parameters
```typescript
// API route validation
const limit = Math.min(100, Math.max(1, parseInt(params.limit || '50')));
const minRating = Math.max(0, Math.min(5, parseFloat(params.minRating)));
```

### Random on Empty Set
```typescript
if (random && allIds.length === 0) {
  return {
    books: [],
    total: 0,
    message: 'No books available for random selection'
  };
}
```

---

## Testing Coverage

### Unit Tests
- `parseFilters()` - URL param parsing
- `filtersToSearchParams()` - Filter serialization
- `buildOrderBy()` - Sort clause generation
- `seededRandom()` - Deterministic random

### Integration Tests
- API route with various filter combinations
- Multi-criteria filtering
- Pagination boundaries
- Random selection reproducibility

### E2E Tests
- User applies multiple filters
- Search and sort combination
- Clear all filters
- Random book selection
- Share filtered URL

---

## Migration Checklist

- [ ] Add new database indexes
- [ ] Run migration: `npx prisma migrate dev --name add_filtering_indexes`
- [ ] Create `lib/book-queries.ts`
- [ ] Create `lib/types/filtering.ts`
- [ ] Create `lib/utils/filter-utils.ts`
- [ ] Update `app/api/books/route.ts`
- [ ] Create filter components in `components/filtering/`
- [ ] Update `app/bookshelf/page.tsx` with filter support
- [ ] Add unit tests
- [ ] Add integration tests
- [ ] Add E2E tests
- [ ] Performance testing with large dataset
- [ ] Documentation update

---

## API Examples

### Example 1: Multi-criteria Filter
```bash
GET /api/books?genres=Fantasy,Sci-Fi&minRating=4.0&readStatus=read&sortBy=dateFinished&sortOrder=desc&page=1&limit=20

Response:
{
  "books": [...],
  "total": 42,
  "page": 1,
  "limit": 20,
  "totalPages": 3,
  "hasMore": true
}
```

### Example 2: Search with Sort
```bash
GET /api/books?search=dragon&searchFields=title,description&sortBy=ratingOverall&sortOrder=desc

Response:
{
  "books": [
    { "title": "Fourth Wing", "ratingOverall": 4.8, ... },
    { "title": "A Court of Thorns and Roses", "ratingOverall": 4.5, ... }
  ],
  "total": 2,
  "page": 1,
  "limit": 50,
  "totalPages": 1,
  "hasMore": false
}
```

### Example 3: Random Book
```bash
GET /api/books?genres=Mystery&minPages=300&maxPages=500&random=true

Response:
{
  "books": [{ "title": "The Silent Patient", ... }],
  "total": 15,
  "page": 1,
  "limit": 1,
  "totalPages": 1,
  "hasMore": false,
  "isRandom": true,
  "randomSeed": 892341
}
```

---

## Future Enhancements

### Phase 2 Features
- Save filter presets (e.g., "High-rated fantasy books")
- Export filtered book list (CSV, JSON)
- Bulk actions on filtered results
- Advanced search operators (AND, OR, NOT)
- Filter by custom date ranges

### Performance Optimizations
- Redis caching for popular filter combinations
- ElasticSearch integration for advanced full-text search
- Database read replicas for search-heavy workloads
- GraphQL API for flexible client queries

### UX Improvements
- Filter suggestions based on popular combinations
- "Did you mean?" for search queries
- Visual indicators for active filters
- Filter history (recently used filters)
- Mobile-optimized filter drawer
