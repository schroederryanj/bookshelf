/**
 * Help Handler - Display available commands
 */

import {
  CommandHandler,
  successResult,
  splitMessage,
} from "./types";

const HELP_SECTIONS = {
  main: `Commands:
SEARCH [term] - Find books
ADD [title] by [author] - Add book
START [title] - Begin reading
PAGE [#] [title] - Update progress
FINISH [title] - Mark complete
STATS - Your reading stats
RECOMMEND - Get suggestions
READING - Current books
HELP [topic] - More info`,

  search: `Search commands:
SEARCH [term] - Search all
SEARCH title [term]
SEARCH author [name]
SEARCH genre [genre]
BOOK [id] - Get book details`,

  add: `Add commands:
ADD [title] by [author]
ADD [title] - [author]
ADD [title], [genre], [pages]p
Example: ADD The Hobbit by Tolkien`,

  progress: `Progress commands:
START [title] - Begin reading
PAGE [#] [title] - Update page
PAGE [#] BOOK [id]
FINISH [title] - Complete book
READING - List in-progress`,

  stats: `Stats commands:
STATS - Full summary
STREAK - Current streak
YEAR - This year's books
MONTH - This month's stats
GENRES - Favorite genres`,

  recommend: `Recommend commands:
RECOMMEND - Personalized picks
RECOMMEND [genre]
RECOMMEND author [name]`,
};

/**
 * Main help handler
 */
export const helpHandler: CommandHandler = async (intent, _context) => {
  const topic = (intent.params.topic as string | undefined)?.toLowerCase();

  if (topic && topic in HELP_SECTIONS) {
    return successResult(HELP_SECTIONS[topic as keyof typeof HELP_SECTIONS]);
  }

  if (topic) {
    return successResult(
      `Unknown topic "${topic}". Topics: search, add, progress, stats, recommend`
    );
  }

  // Return main help
  const message = HELP_SECTIONS.main;
  const parts = splitMessage(message, 160);

  return {
    success: true,
    message: parts[0],
    parts: parts.length > 1 ? parts : undefined,
  };
};

/**
 * Get a concise command list (for SMS length constraints)
 */
export const quickHelpHandler: CommandHandler = async (_intent, _context) => {
  return successResult(
    "SEARCH|ADD|START|PAGE|FINISH|STATS|RECOMMEND|READING|HELP [topic]"
  );
};

/**
 * Unknown command handler
 */
export const unknownCommandHandler: CommandHandler = async (intent, _context) => {
  const command = intent.params.attempted as string | undefined;

  if (command) {
    return successResult(
      `Unknown: "${command.slice(0, 20)}". Text HELP for commands.`
    );
  }

  return successResult("Sorry, didn't understand. Text HELP for commands.");
};

/**
 * Welcome message for new users
 */
export const welcomeHandler: CommandHandler = async (_intent, _context) => {
  return successResult(
    "Welcome to Bookshelf! Track your reading via SMS. Text HELP to see commands."
  );
};
