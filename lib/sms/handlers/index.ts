/**
 * SMS Command Handlers
 *
 * Central export for all SMS command handlers.
 * Each handler processes a specific intent and returns an SMS-friendly response.
 */

// Types
export type {
  HandlerResult,
  HandlerContext,
  ParsedIntent,
  CommandHandler,
} from "./types";

export {
  formatNumber,
  truncate,
  splitMessage,
  errorResult,
  successResult,
} from "./types";

// Search handlers
export {
  searchHandler,
  getBookHandler,
} from "./search-handler";

// Progress handlers
export {
  updateProgressHandler,
  finishBookHandler,
  startReadingHandler,
  getCurrentReadingHandler,
} from "./progress-handler";

// Recommendations handlers
export {
  recommendationsHandler,
  authorRecommendationsHandler,
} from "./recommendations-handler";

// Add book handlers
export {
  addBookHandler,
  parseAndAddBookHandler,
  quickAddHandler,
} from "./add-book-handler";

// Stats handlers
export {
  statsHandler,
  yearlyStatsHandler,
  monthlyStatsHandler,
  streakHandler,
  genreStatsHandler,
  quickStatsHandler,
} from "./stats-handler";

// Help handlers
export {
  helpHandler,
  quickHelpHandler,
  unknownCommandHandler,
  welcomeHandler,
} from "./help-handler";

// Book details handlers
export {
  bookDetailsHandler,
  bookPagesHandler,
  bookAuthorHandler,
  bookRatingHandler,
} from "./book-details-handler";

// Reading status handlers
export {
  currentlyReadingHandler,
  unreadBooksHandler,
  finishedBooksHandler,
  dnfBooksHandler,
  readingStatusSummaryHandler,
} from "./reading-status-handler";

// Genre stats handlers
export {
  genreCountHandler,
  favoriteGenreHandler,
  booksByGenreHandler,
  genreBreakdownHandler,
  genreDiversityHandler,
} from "./genre-stats-handler";

// Ratings handlers
export {
  highestRatedHandler,
  lowestRatedHandler,
  booksByRatingHandler,
  averageRatingHandler,
  ratingDistributionHandler,
  unratedBooksHandler,
} from "./ratings-handler";

// Goal handlers
export {
  goalProgressHandler,
  onTrackHandler,
  booksNeededHandler,
  allGoalsHandler,
} from "./goal-handler";

// Unread book handlers
export {
  filteredUnreadHandler,
  whatToReadNextHandler,
  quickReadsHandler,
  longReadsHandler,
  randomUnreadHandler,
} from "./unread-handler";

// Time query handlers
export {
  booksInTimeframeHandler,
  readingActivityHandler,
  comparePeriodsHandler,
  readingHistoryHandler,
} from "./time-query-handler";

// Compare handlers
export {
  compareHandler,
  whichIsLongerHandler,
  whichIsBetterHandler,
} from "./compare-handler";

// Similar books handlers
export {
  similarBooksHandler,
  booksByAuthorHandler,
  sameGenreHandler,
} from "./similar-books-handler";

// Filter handlers
export {
  filterHandler,
  unreadBooksHandler as advancedUnreadBooksHandler,
  topRatedHandler,
  shortBooksHandler,
  longBooksHandler,
} from "./filter-handler";

// Patterns handlers
export {
  patternsHandler,
  readingPaceHandler,
  detailedStreakHandler,
  productivePeriodsHandler,
  timeSpentHandler,
  completionRateHandler,
} from "./patterns-handler";

// Smart suggestions handlers
export {
  smartSuggestionsHandler,
  favoritesBasedHandler,
  quickReadHandler,
  epicReadHandler,
  randomBookHandler,
  moodBasedHandler,
} from "./suggestions-handler";

// Collection query handlers (comprehensive AI-powered queries)
export {
  bookDetailsHandler as collectionBookDetailsHandler,
  readingStatusHandler as collectionReadingStatusHandler,
  genreQueryHandler,
  readingPatternsHandler,
  ratingsQueryHandler,
  goalProgressHandler as collectionGoalProgressHandler,
  unreadBooksHandler as collectionUnreadBooksHandler,
  similarBooksHandler as collectionSimilarBooksHandler,
  compareBooksHandler,
  timeQueryHandler,
  complexFilterHandler,
  moreResultsHandler,
} from "./collection-handlers";

/**
 * Handler registry - maps command names to handlers
 */
import { CommandHandler } from "./types";
import { searchHandler, getBookHandler } from "./search-handler";
import {
  updateProgressHandler,
  finishBookHandler,
  startReadingHandler,
  getCurrentReadingHandler,
} from "./progress-handler";
import {
  recommendationsHandler,
  authorRecommendationsHandler,
} from "./recommendations-handler";
import {
  addBookHandler,
  parseAndAddBookHandler,
} from "./add-book-handler";
import {
  statsHandler,
  yearlyStatsHandler,
  monthlyStatsHandler,
  streakHandler,
  genreStatsHandler,
} from "./stats-handler";
import {
  helpHandler,
  unknownCommandHandler,
  welcomeHandler,
} from "./help-handler";
import {
  bookDetailsHandler,
  bookPagesHandler,
  bookAuthorHandler,
  bookRatingHandler,
} from "./book-details-handler";
import {
  currentlyReadingHandler,
  unreadBooksHandler,
  finishedBooksHandler,
  dnfBooksHandler,
  readingStatusSummaryHandler,
} from "./reading-status-handler";
import {
  genreCountHandler,
  favoriteGenreHandler,
  booksByGenreHandler,
  genreBreakdownHandler,
  genreDiversityHandler,
} from "./genre-stats-handler";
import {
  highestRatedHandler,
  lowestRatedHandler,
  booksByRatingHandler,
  averageRatingHandler,
  ratingDistributionHandler,
  unratedBooksHandler,
} from "./ratings-handler";
import {
  goalProgressHandler,
  onTrackHandler,
  booksNeededHandler,
  allGoalsHandler,
} from "./goal-handler";
import {
  filteredUnreadHandler,
  whatToReadNextHandler,
  quickReadsHandler,
  longReadsHandler,
  randomUnreadHandler,
} from "./unread-handler";
import {
  booksInTimeframeHandler,
  readingActivityHandler,
  comparePeriodsHandler,
  readingHistoryHandler,
} from "./time-query-handler";
import {
  compareHandler,
  whichIsLongerHandler,
  whichIsBetterHandler,
} from "./compare-handler";
import {
  similarBooksHandler,
  booksByAuthorHandler,
  sameGenreHandler,
} from "./similar-books-handler";
import {
  filterHandler,
  topRatedHandler,
  shortBooksHandler,
  longBooksHandler,
} from "./filter-handler";
import {
  patternsHandler,
  readingPaceHandler,
  detailedStreakHandler,
  productivePeriodsHandler,
  timeSpentHandler,
  completionRateHandler,
} from "./patterns-handler";
import {
  smartSuggestionsHandler,
  favoritesBasedHandler,
  quickReadHandler,
  epicReadHandler,
  randomBookHandler,
  moodBasedHandler,
} from "./suggestions-handler";
import {
  bookDetailsHandler as collectionBookDetailsHandler,
  readingStatusHandler as collectionReadingStatusHandler,
  genreQueryHandler,
  readingPatternsHandler,
  ratingsQueryHandler,
  goalProgressHandler as collectionGoalProgressHandler,
  unreadBooksHandler as collectionUnreadBooksHandler,
  similarBooksHandler as collectionSimilarBooksHandler,
  compareBooksHandler,
  timeQueryHandler,
  complexFilterHandler,
  moreResultsHandler,
} from "./collection-handlers";

export const handlers: Record<string, CommandHandler> = {
  // Search
  search: searchHandler,
  book: getBookHandler,
  find: searchHandler,

  // Progress
  page: updateProgressHandler,
  update: updateProgressHandler,
  progress: updateProgressHandler,
  finish: finishBookHandler,
  done: finishBookHandler,
  complete: finishBookHandler,
  start: startReadingHandler,
  begin: startReadingHandler,
  reading: getCurrentReadingHandler,
  current: getCurrentReadingHandler,

  // Recommendations
  recommend: recommendationsHandler,
  recommendations: recommendationsHandler,
  suggest: recommendationsHandler,
  "recommend-author": authorRecommendationsHandler,

  // Add book
  add: parseAndAddBookHandler,
  "add-book": addBookHandler,
  new: parseAndAddBookHandler,

  // Stats
  stats: statsHandler,
  statistics: statsHandler,
  year: yearlyStatsHandler,
  yearly: yearlyStatsHandler,
  month: monthlyStatsHandler,
  monthly: monthlyStatsHandler,
  streak: streakHandler,
  genres: genreStatsHandler,

  // Help
  help: helpHandler,
  "?": helpHandler,
  commands: helpHandler,
  welcome: welcomeHandler,
  hi: welcomeHandler,
  hello: welcomeHandler,

  // Book details
  about: bookDetailsHandler,
  details: bookDetailsHandler,
  info: bookDetailsHandler,
  pages: bookPagesHandler,
  "page-count": bookPagesHandler,
  "who-wrote": bookAuthorHandler,
  author: bookAuthorHandler,
  rating: bookRatingHandler,
  rate: bookRatingHandler,

  // Reading status
  "currently-reading": currentlyReadingHandler,
  "my-books": readingStatusSummaryHandler,
  library: readingStatusSummaryHandler,
  unread: unreadBooksHandler,
  "not-started": unreadBooksHandler,
  finished: finishedBooksHandler,
  completed: finishedBooksHandler,
  read: finishedBooksHandler,
  dnf: dnfBooksHandler,
  "did-not-finish": dnfBooksHandler,
  abandoned: dnfBooksHandler,

  // Genre queries
  "genre-count": genreCountHandler,
  "count-genre": genreCountHandler,
  "favorite-genre": favoriteGenreHandler,
  "best-genre": favoriteGenreHandler,
  "books-by-genre": booksByGenreHandler,
  "genre-books": booksByGenreHandler,
  "genre-breakdown": genreBreakdownHandler,
  "genre-stats": genreBreakdownHandler,
  "genre-diversity": genreDiversityHandler,
  diversity: genreDiversityHandler,

  // Ratings
  "highest-rated": highestRatedHandler,
  "top-rated": highestRatedHandler,
  "best-books": highestRatedHandler,
  favorites: highestRatedHandler,
  "lowest-rated": lowestRatedHandler,
  "worst-books": lowestRatedHandler,
  "5-star": booksByRatingHandler,
  "five-star": booksByRatingHandler,
  "4-star": booksByRatingHandler,
  "four-star": booksByRatingHandler,
  "average-rating": averageRatingHandler,
  "rating-avg": averageRatingHandler,
  "rating-distribution": ratingDistributionHandler,
  "rating-breakdown": ratingDistributionHandler,
  "unrated": unratedBooksHandler,
  "not-rated": unratedBooksHandler,

  // Goals
  goal: goalProgressHandler,
  goals: allGoalsHandler,
  "goal-progress": goalProgressHandler,
  "on-track": onTrackHandler,
  "am-i-on-track": onTrackHandler,
  "books-needed": booksNeededHandler,
  "to-goal": booksNeededHandler,

  // Unread/suggestions
  "what-to-read": whatToReadNextHandler,
  "read-next": whatToReadNextHandler,
  "next-book": whatToReadNextHandler,
  "quick-read": quickReadsHandler,
  "short-books": quickReadsHandler,
  "long-read": longReadsHandler,
  "long-books": longReadsHandler,
  random: randomUnreadHandler,
  "random-book": randomUnreadHandler,
  "surprise-me": randomUnreadHandler,
  "filter-unread": filteredUnreadHandler,

  // Time queries
  "books-in": booksInTimeframeHandler,
  "read-in": booksInTimeframeHandler,
  "this-year": booksInTimeframeHandler,
  "last-year": booksInTimeframeHandler,
  "this-month": booksInTimeframeHandler,
  "last-month": booksInTimeframeHandler,
  activity: readingActivityHandler,
  "reading-activity": readingActivityHandler,
  compare: comparePeriodsHandler,
  "compare-periods": comparePeriodsHandler,
  history: readingHistoryHandler,
  "reading-history": readingHistoryHandler,
  timeline: readingHistoryHandler,

  // Unknown
  unknown: unknownCommandHandler,

  // Compare books (new handlers)
  "compare-two": compareHandler,
  versus: compareHandler,
  vs: compareHandler,
  "book-vs-book": compareHandler,
  longer: whichIsLongerHandler,
  "is-longer": whichIsLongerHandler,
  "better-rated": whichIsBetterHandler,

  // Similar books (new handlers)
  similar: similarBooksHandler,
  like: similarBooksHandler,
  "more-like": similarBooksHandler,
  "by-author": booksByAuthorHandler,
  "books-by": booksByAuthorHandler,
  "author-books": booksByAuthorHandler,
  "same-genre": sameGenreHandler,
  "in-genre": sameGenreHandler,

  // Advanced filters (new handlers)
  "filter-books": filterHandler,
  "advanced-filter": filterHandler,
  "highly-rated": topRatedHandler,
  "best-rated": topRatedHandler,
  "short-read": shortBooksHandler,
  short: shortBooksHandler,
  "quick-reads": quickReadHandler,
  long: longBooksHandler,
  "long-reads": longBooksHandler,
  epic: epicReadHandler,

  // Reading patterns (new handlers)
  patterns: patternsHandler,
  "reading-stats": patternsHandler,
  pace: readingPaceHandler,
  "pages-per-day": readingPaceHandler,
  "streak-details": detailedStreakHandler,
  "my-streak": detailedStreakHandler,
  "productive-times": productivePeriodsHandler,
  "best-time": productivePeriodsHandler,
  "when-do-i-read": productivePeriodsHandler,
  "time-spent": timeSpentHandler,
  "reading-time": timeSpentHandler,
  "hours-read": timeSpentHandler,
  "completion-rate": completionRateHandler,
  "finish-rate": completionRateHandler,

  // Smart suggestions (new handlers)
  "what-should-i-read": smartSuggestionsHandler,
  "what-next": smartSuggestionsHandler,
  "suggest-book": smartSuggestionsHandler,
  "for-me": smartSuggestionsHandler,
  "based-on-favorites": favoritesBasedHandler,
  "from-favorites": favoritesBasedHandler,
  "quick-book": quickReadHandler,
  "fast-read": quickReadHandler,
  "epic-read": epicReadHandler,
  "big-book": epicReadHandler,
  "random-pick": randomBookHandler,
  "pick-for-me": randomBookHandler,
  mood: moodBasedHandler,
  "mood-based": moodBasedHandler,
  feeling: moodBasedHandler,

  // Collection query handlers (AI intent routing)
  "tell-me-about": collectionBookDetailsHandler,
  "how-many-pages": collectionBookDetailsHandler,
  "book-details": collectionBookDetailsHandler,
  "reading-patterns": readingPatternsHandler,
  "my-patterns": readingPatternsHandler,
  "reading-pace": readingPatternsHandler,
  "complex-filter": complexFilterHandler,
  filter: complexFilterHandler,
  "find-books": complexFilterHandler,
  more: moreResultsHandler,
  "show-more": moreResultsHandler,
  next: moreResultsHandler,
  "compare-books": compareBooksHandler,
  "which-is-longer": compareBooksHandler,
  "which-is-better": compareBooksHandler,
  "similar-to": collectionSimilarBooksHandler,
  "books-like": collectionSimilarBooksHandler,
  "time-read": timeQueryHandler,
  "when-did-i": timeQueryHandler,
  "rated-books": ratingsQueryHandler,
  "highest-rating": ratingsQueryHandler,
  "my-goal": collectionGoalProgressHandler,
  "goal-status": collectionGoalProgressHandler,
  "unread-list": collectionUnreadBooksHandler,
  "to-read": collectionUnreadBooksHandler,
  "genre-query": genreQueryHandler,
};

/**
 * Get a handler by command name
 */
export function getHandler(command: string): CommandHandler {
  const normalizedCommand = command.toLowerCase().trim();
  return handlers[normalizedCommand] || handlers.unknown;
}

/**
 * Execute a command with the appropriate handler
 */
export async function executeCommand(
  command: string,
  params: Record<string, string | number | boolean | undefined>,
  context: { userId: string; rawMessage: string }
): Promise<import("./types").HandlerResult> {
  const handler = getHandler(command);
  return handler({ command, params }, context);
}
