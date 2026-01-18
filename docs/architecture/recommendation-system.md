# Book Recommendation System Architecture

## Overview

This document outlines the architecture for a book recommendation system integrated into the Next.js bookshelf application. The system provides four types of recommendations:

1. **Similar to [book]** - Genre and author-based similarity
2. **Based on your favorites** - Recommendations from highest-rated books
3. **More by this author** - Author-based recommendations
4. **In this genre** - Genre exploration

---

## Architecture Decision Records (ADRs)

### ADR-001: Server-Side Computation

**Status:** Accepted

**Context:** Recommendations can be computed on the client or server. Client-side reduces server load but exposes algorithms and requires sending full book data.

**Decision:** Compute recommendations server-side via Next.js API routes.

**Rationale:**
- Keeps recommendation logic private and maintainable
- Enables database query optimization with Prisma
- Supports caching at the API layer
- Reduces client bundle size
- Enables future ML model integration without client changes

**Consequences:**
- Additional server load (mitigated by caching)
- Slight latency for API calls (mitigated by edge caching)

---

### ADR-002: Hybrid Recommendation Strategy

**Status:** Accepted

**Context:** External APIs (Google Books) can provide discovery but may be unavailable or rate-limited. Local data enables personalized recommendations.

**Decision:** Implement a hybrid system with local-first recommendations and optional external API enrichment.

**Rationale:**
- Local recommendations always available (zero external dependencies)
- External APIs enhance discovery of new books
- Graceful degradation when APIs unavailable
- User's reading history provides high-quality signals

**Consequences:**
- Need to maintain two recommendation pathways
- Caching strategy required for external API calls

---

### ADR-003: No Schema Changes Required

**Status:** Accepted

**Context:** The existing schema already contains the fields needed for recommendations.

**Decision:** Use existing schema fields without modifications.

**Available Fields:**
- `genre` (comma-separated) - For genre-based matching
- `author` - For author-based recommendations
- `ratingOverall` - For favorites identification
- `ratingEnjoyment`, `ratingRecommend` - For quality signals
- `read` status - For filtering already-read books
- `description` - For potential text similarity (future)

**Consequences:**
- No migration required
- Existing indexes on `author` and `ratingOverall` support queries

---

## System Architecture

```
+------------------------------------------------------------------+
|                        Client Layer                               |
+------------------------------------------------------------------+
|  BookDetailPage    |  HomePage       |  DiscoveryPage            |
|  - Similar books   |  - Favorites    |  - Genre exploration      |
|  - Same author     |  - Suggestions  |  - Discovery carousel     |
+------------------------------------------------------------------+
                              |
                              v
+------------------------------------------------------------------+
|                      API Route Layer                              |
|                   /api/recommendations/*                          |
+------------------------------------------------------------------+
|  /similar/[bookId]  |  /favorites  |  /author/[name]  |  /genre  |
+------------------------------------------------------------------+
                              |
                              v
+------------------------------------------------------------------+
|                  Recommendation Service                           |
|                   lib/recommendations.ts                          |
+------------------------------------------------------------------+
|  SimilarityEngine  |  FavoritesEngine  |  DiscoveryEngine        |
|  - Genre matching  |  - Rating-based   |  - Genre expansion      |
|  - Author matching |  - Read patterns  |  - Unread prioritization|
+------------------------------------------------------------------+
                              |
              +---------------+---------------+
              v                               v
+-------------------------+     +-------------------------+
|     Local Data Layer    |     |   External API Layer    |
|         (Prisma)        |     |      (Optional)         |
+-------------------------+     +-------------------------+
|  - User's book library  |     |  - Google Books API     |
|  - Reading history      |     |  - OpenLibrary API      |
|  - Ratings & favorites  |     |  - (Future: ML APIs)    |
+-------------------------+     +-------------------------+
              |                               |
              v                               v
+-------------------------+     +-------------------------+
|      MySQL Database     |     |    Redis/Memory Cache   |
|    (Existing Schema)    |     |   (API Response Cache)  |
+-------------------------+     +-------------------------+
```

---

## API Route Structure

### Route Hierarchy

```
/api/recommendations/
  |-- similar/[bookId]/route.ts    # Similar to specific book
  |-- favorites/route.ts           # Based on user favorites
  |-- author/[name]/route.ts       # More by author
  |-- genre/route.ts               # Genre exploration
  |-- discover/route.ts            # External API discovery (optional)
```

### Endpoint Specifications

#### 1. GET /api/recommendations/similar/[bookId]

Returns books similar to the specified book.

**Query Parameters:**
- `limit` (optional, default: 10) - Maximum results
- `includeExternal` (optional, default: false) - Include external API results

**Response:**
```typescript
{
  recommendations: Recommendation[];
  source: 'local' | 'hybrid';
  basedOn: {
    bookId: number;
    title: string;
    genres: string[];
    author: string;
  };
}
```

**Algorithm:**
1. Fetch target book's genres and author
2. Score local books by:
   - Genre overlap (0-1 normalized by Jaccard similarity)
   - Same author bonus (+0.3)
   - High rating bonus (rating/5 * 0.2)
3. Exclude already-read books (optional filter)
4. Return top N by score

---

#### 2. GET /api/recommendations/favorites

Returns recommendations based on user's highest-rated books.

**Query Parameters:**
- `limit` (optional, default: 10)
- `minRating` (optional, default: 4.0) - Minimum rating for "favorites"

**Response:**
```typescript
{
  recommendations: Recommendation[];
  basedOn: {
    favoriteCount: number;
    topGenres: string[];
    topAuthors: string[];
  };
}
```

**Algorithm:**
1. Identify favorites: books with `ratingOverall >= minRating` OR `ratingRecommend >= 4`
2. Extract genre frequency distribution from favorites
3. Extract author frequency from favorites
4. Score unread books by:
   - Genre match with favorite genres (weighted by frequency)
   - Author match with favorite authors
   - Existing rating if partially read
5. Return top N

---

#### 3. GET /api/recommendations/author/[name]

Returns all books by a specific author.

**Query Parameters:**
- `limit` (optional, default: 20)
- `excludeBookId` (optional) - Exclude specific book

**Response:**
```typescript
{
  recommendations: Book[];
  author: string;
  totalByAuthor: number;
  external?: ExternalBook[];  // From Google Books if enabled
}
```

---

#### 4. GET /api/recommendations/genre

Genre exploration recommendations.

**Query Parameters:**
- `genre` (required) - Genre to explore
- `limit` (optional, default: 10)
- `excludeRead` (optional, default: true)

**Response:**
```typescript
{
  recommendations: Recommendation[];
  genre: string;
  totalInGenre: number;
}
```

---

## Data Types

### Core Types

```typescript
// lib/recommendations/types.ts

export interface Recommendation {
  book: Book;
  score: number;
  reasons: RecommendationReason[];
  source: 'local' | 'external';
}

export interface RecommendationReason {
  type: 'genre_match' | 'author_match' | 'rating_similar' | 'favorite_pattern';
  description: string;
  weight: number;
}

export interface RecommendationContext {
  userId?: string;
  excludeRead?: boolean;
  includeExternal?: boolean;
  limit?: number;
}

export interface SimilarityScore {
  bookId: number;
  genreScore: number;
  authorScore: number;
  ratingScore: number;
  totalScore: number;
}

export interface UserPreferences {
  topGenres: Array<{ genre: string; count: number; avgRating: number }>;
  topAuthors: Array<{ author: string; count: number; avgRating: number }>;
  avgRating: number;
  preferredPageRange: { min: number; max: number };
}
```

---

## Caching Strategy

### Cache Layers

```
+------------------+     +------------------+     +------------------+
|  Browser Cache   | --> |  Next.js Cache   | --> |  Database Query  |
|  (5 min stale)   |     |  (revalidate)    |     |   (Prisma)       |
+------------------+     +------------------+     +------------------+
```

### Implementation

```typescript
// API route with caching headers
export async function GET(request: NextRequest) {
  const recommendations = await getRecommendations(params);

  return NextResponse.json(recommendations, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
```

### Cache Invalidation

Recommendations cache should be invalidated when:
- New book added to library
- Book rating updated
- Book marked as read/unread

```typescript
// In book mutation handlers
import { revalidatePath, revalidateTag } from 'next/cache';

// After book update
revalidateTag('recommendations');
revalidatePath('/api/recommendations');
```

### External API Caching

For Google Books API calls:

```typescript
// lib/cache/external-api.ts
const EXTERNAL_CACHE_TTL = 60 * 60 * 24; // 24 hours

// In-memory cache for development, Redis for production
const cache = new Map<string, { data: any; expiry: number }>();

export async function cachedExternalFetch(key: string, fetcher: () => Promise<any>) {
  const cached = cache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  const data = await fetcher();
  cache.set(key, { data, expiry: Date.now() + EXTERNAL_CACHE_TTL * 1000 });
  return data;
}
```

---

## Recommendation Algorithms

### 1. Genre Similarity (Jaccard Index)

```typescript
function calculateGenreSimilarity(bookA: Book, bookB: Book): number {
  const genresA = new Set(bookA.genre?.split(',').map(g => g.trim().toLowerCase()) ?? []);
  const genresB = new Set(bookB.genre?.split(',').map(g => g.trim().toLowerCase()) ?? []);

  if (genresA.size === 0 || genresB.size === 0) return 0;

  const intersection = new Set([...genresA].filter(g => genresB.has(g)));
  const union = new Set([...genresA, ...genresB]);

  return intersection.size / union.size;
}
```

### 2. Composite Scoring

```typescript
function calculateSimilarityScore(
  targetBook: Book,
  candidateBook: Book,
  userPreferences?: UserPreferences
): SimilarityScore {
  const genreScore = calculateGenreSimilarity(targetBook, candidateBook);

  const authorScore = targetBook.author && candidateBook.author &&
    targetBook.author.toLowerCase() === candidateBook.author.toLowerCase() ? 1 : 0;

  const ratingScore = candidateBook.ratingOverall
    ? candidateBook.ratingOverall / 5
    : 0.5; // Neutral for unrated

  // Weighted combination
  const weights = { genre: 0.5, author: 0.3, rating: 0.2 };

  const totalScore =
    genreScore * weights.genre +
    authorScore * weights.author +
    ratingScore * weights.rating;

  return { bookId: candidateBook.id!, genreScore, authorScore, ratingScore, totalScore };
}
```

### 3. Favorites Analysis

```typescript
async function analyzeUserFavorites(userId: string): Promise<UserPreferences> {
  const favorites = await prisma.book.findMany({
    where: {
      OR: [
        { ratingOverall: { gte: 4 } },
        { ratingRecommend: { gte: 4 } },
        { ratingEnjoyment: { gte: 4 } },
      ],
    },
  });

  // Genre frequency analysis
  const genreCounts = new Map<string, { count: number; totalRating: number }>();
  favorites.forEach(book => {
    book.genre?.split(',').forEach(genre => {
      const g = genre.trim().toLowerCase();
      const current = genreCounts.get(g) || { count: 0, totalRating: 0 };
      genreCounts.set(g, {
        count: current.count + 1,
        totalRating: current.totalRating + (book.ratingOverall ?? 0),
      });
    });
  });

  const topGenres = [...genreCounts.entries()]
    .map(([genre, data]) => ({
      genre,
      count: data.count,
      avgRating: data.totalRating / data.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Similar analysis for authors...

  return { topGenres, topAuthors: [], avgRating: 0, preferredPageRange: { min: 0, max: 1000 } };
}
```

---

## Fallback Strategy

### When External APIs Unavailable

```typescript
async function getRecommendationsWithFallback(
  context: RecommendationContext
): Promise<Recommendation[]> {
  // Always get local recommendations first
  const localRecs = await getLocalRecommendations(context);

  if (!context.includeExternal) {
    return localRecs;
  }

  try {
    const externalRecs = await getExternalRecommendations(context);
    return mergeRecommendations(localRecs, externalRecs);
  } catch (error) {
    console.warn('External API unavailable, using local only:', error);
    return localRecs;
  }
}
```

### Fallback Hierarchy

1. **Primary:** Local database recommendations (always available)
2. **Secondary:** Cached external API results (if available)
3. **Tertiary:** Fresh external API call (if API available and not rate-limited)
4. **Final:** Return local-only with `source: 'local'` flag

---

## Performance Considerations

### Database Query Optimization

```typescript
// Efficient query for similar books
const similarBooks = await prisma.book.findMany({
  where: {
    id: { not: bookId },
    read: excludeRead ? { not: 'Read' } : undefined,
    OR: genres.map(g => ({ genre: { contains: g } })),
  },
  select: {
    id: true,
    title: true,
    author: true,
    genre: true,
    ratingOverall: true,
    img: true,
    // Only select fields needed for recommendations
  },
  take: limit * 3, // Fetch extra for scoring/filtering
});
```

### Pagination for Large Collections

```typescript
// For collections > 1000 books
async function getPaginatedRecommendations(
  context: RecommendationContext,
  cursor?: number
): Promise<{ recommendations: Recommendation[]; nextCursor?: number }> {
  const batchSize = 100;

  const books = await prisma.book.findMany({
    where: { /* ... */ },
    take: batchSize,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
  });

  // Score and return
}
```

### Indexing Recommendations

Existing indexes are sufficient:
- `@@index([author])` - Author lookups
- `@@index([ratingOverall])` - Favorites queries

Consider adding for production scale:
```prisma
@@index([genre]) // Full-text index for genre search
@@index([read, ratingOverall]) // Compound for favorites
```

---

## UI Integration Points

### 1. Book Detail Page

```tsx
// components/BookDetail.tsx
function BookDetail({ book }: { book: Book }) {
  return (
    <div>
      {/* Book details... */}

      <RecommendationSection
        title="Similar Books"
        endpoint={`/api/recommendations/similar/${book.id}`}
      />

      {book.author && (
        <RecommendationSection
          title={`More by ${book.author}`}
          endpoint={`/api/recommendations/author/${encodeURIComponent(book.author)}`}
        />
      )}
    </div>
  );
}
```

### 2. Home Page / Dashboard

```tsx
// components/RecommendedForYou.tsx
function RecommendedForYou() {
  const { data } = useSWR('/api/recommendations/favorites');

  return (
    <section>
      <h2>Recommended For You</h2>
      <p className="text-muted">Based on your {data?.basedOn.favoriteCount} favorites</p>
      <BookCarousel books={data?.recommendations} />
    </section>
  );
}
```

### 3. Genre Page

```tsx
// app/genre/[genre]/page.tsx
export default async function GenrePage({ params }: { params: { genre: string } }) {
  const recommendations = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/recommendations/genre?genre=${params.genre}`
  ).then(r => r.json());

  return (
    <div>
      <h1>{params.genre} Books</h1>
      <BookGrid books={recommendations.recommendations} />
    </div>
  );
}
```

### Component Structure

```
components/recommendations/
  |-- RecommendationCard.tsx       # Single recommendation with reasons
  |-- RecommendationSection.tsx    # Section with title and carousel
  |-- RecommendationCarousel.tsx   # Horizontal scroll of books
  |-- SimilarBooksWidget.tsx       # Compact widget for book detail
  |-- FavoritesRecommendations.tsx # Personalized homepage section
```

---

## File Structure

```
lib/
  |-- recommendations/
  |     |-- index.ts              # Main exports
  |     |-- types.ts              # Type definitions
  |     |-- similarity.ts         # Similarity algorithms
  |     |-- favorites.ts          # Favorites analysis
  |     |-- discovery.ts          # External API integration
  |     |-- cache.ts              # Caching utilities
  |
  |-- cache/
        |-- external-api.ts       # External API cache layer

app/api/recommendations/
  |-- similar/[bookId]/route.ts
  |-- favorites/route.ts
  |-- author/[name]/route.ts
  |-- genre/route.ts
  |-- discover/route.ts

components/recommendations/
  |-- RecommendationCard.tsx
  |-- RecommendationSection.tsx
  |-- RecommendationCarousel.tsx
  |-- SimilarBooksWidget.tsx
  |-- FavoritesRecommendations.tsx
```

---

## Implementation Phases

### Phase 1: Core Local Recommendations (MVP)
- [ ] Implement `lib/recommendations/` core module
- [ ] Create `/api/recommendations/similar/[bookId]` endpoint
- [ ] Create `/api/recommendations/favorites` endpoint
- [ ] Add basic `RecommendationSection` component
- [ ] Integrate into book detail page

### Phase 2: Author and Genre
- [ ] Implement `/api/recommendations/author/[name]`
- [ ] Implement `/api/recommendations/genre`
- [ ] Add genre exploration page
- [ ] Add author page with recommendations

### Phase 3: External API Integration
- [ ] Implement Google Books API discovery
- [ ] Add caching layer for external calls
- [ ] Implement fallback strategy
- [ ] Add "Discover New Books" section

### Phase 4: Optimization
- [ ] Add Redis caching for production
- [ ] Implement pagination for large collections
- [ ] Add recommendation analytics
- [ ] A/B test algorithm weights

---

## Security Considerations

1. **Rate Limiting:** Apply rate limits to recommendation endpoints
2. **Input Validation:** Validate bookId, author name, genre parameters
3. **SQL Injection:** Prisma handles parameterization automatically
4. **API Key Protection:** External API keys in environment variables only

---

## Testing Strategy

```typescript
// tests/lib/recommendations/similarity.test.ts
describe('calculateGenreSimilarity', () => {
  it('returns 1 for identical genres', () => {
    const bookA = { genre: 'Fiction, Mystery' };
    const bookB = { genre: 'Mystery, Fiction' };
    expect(calculateGenreSimilarity(bookA, bookB)).toBe(1);
  });

  it('returns 0 for no overlap', () => {
    const bookA = { genre: 'Fiction' };
    const bookB = { genre: 'Non-Fiction' };
    expect(calculateGenreSimilarity(bookA, bookB)).toBe(0);
  });

  it('handles empty genres', () => {
    const bookA = { genre: null };
    const bookB = { genre: 'Fiction' };
    expect(calculateGenreSimilarity(bookA, bookB)).toBe(0);
  });
});
```

---

## Summary

This architecture provides:

1. **Reliability:** Local-first with graceful external API fallback
2. **Performance:** Multi-layer caching, optimized queries, pagination
3. **Extensibility:** Modular design allows algorithm improvements
4. **Maintainability:** Clear separation of concerns, typed interfaces
5. **Zero Migration:** Uses existing schema fields effectively

The server-side computation approach ensures recommendation logic remains private, cacheable, and easy to evolve without client updates.
