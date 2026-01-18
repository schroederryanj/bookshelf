import { describe, it, expect } from 'vitest';
import { classifyIntent, isConfidentClassification } from '@/lib/sms/intent-classifier';
import { TEST_MESSAGES } from '../mocks/twilio';

describe('Intent Classifier', () => {
  describe('classifyIntent', () => {
    describe('Update Progress Intent', () => {
      it.each(TEST_MESSAGES.updateProgress)(
        'should classify "$input" as update_progress',
        ({ input, expectedIntent, expectedPage, expectedPercent }) => {
          const result = classifyIntent(input);
          
          expect(result.intent).toBe(expectedIntent);
          expect(result.confidence).toBeGreaterThan(0.5);
          
          if (expectedPage !== undefined) {
            expect(result.parameters.pageNumber).toBe(expectedPage);
          }
          if (expectedPercent !== undefined) {
            expect(result.parameters.percentComplete).toBe(expectedPercent);
          }
        }
      );

      it('should extract page number from "page 150"', () => {
        const result = classifyIntent('page 150');
        expect(result.parameters.pageNumber).toBe(150);
      });

      it('should extract percentage from "75% done"', () => {
        const result = classifyIntent('75% done');
        expect(result.parameters.percentComplete).toBe(75);
      });

      it('should handle simple number as page update', () => {
        const result = classifyIntent('42');
        expect(result.intent).toBe('update_progress');
        expect(result.parameters.pageNumber).toBe(42);
      });

      it('should reject invalid percentage over 100', () => {
        const result = classifyIntent('150% done');
        expect(result.parameters.percentComplete).toBeUndefined();
      });
    });

    describe('Start Book Intent', () => {
      it.each(TEST_MESSAGES.startBook)(
        'should classify "$input" as start_book',
        ({ input, expectedIntent, expectedTitle }) => {
          const result = classifyIntent(input);

          expect(result.intent).toBe(expectedIntent);
          expect(result.confidence).toBeGreaterThanOrEqual(0.5);

          if (expectedTitle) {
            expect(result.parameters.bookTitle).toContain(expectedTitle.split(' ')[0]);
          }
        }
      );

      it('should extract book title with quotes', () => {
        const result = classifyIntent('start "The Great Gatsby"');
        expect(result.parameters.bookTitle).toBeTruthy();
      });

      it('should extract book title without quotes', () => {
        const result = classifyIntent('start The Great Gatsby');
        expect(result.parameters.bookTitle).toBeTruthy();
      });
    });

    describe('Finish Book Intent', () => {
      it.each(TEST_MESSAGES.finishBook)(
        'should classify "$input" as finish_book',
        ({ input, expectedIntent }) => {
          const result = classifyIntent(input);
          
          expect(result.intent).toBe(expectedIntent);
          expect(result.confidence).toBeGreaterThan(0.5);
        }
      );

      it('should extract book title from finish message', () => {
        const result = classifyIntent('finished The Great Gatsby');
        expect(result.parameters.bookTitle).toBeTruthy();
      });
    });

    describe('Get Status Intent', () => {
      it.each(TEST_MESSAGES.getStatus)(
        'should classify "$input" as get_status',
        ({ input, expectedIntent }) => {
          const result = classifyIntent(input);
          expect(result.intent).toBe(expectedIntent);
        }
      );
    });

    describe('List Reading Intent', () => {
      it.each(TEST_MESSAGES.listReading)(
        'should classify "$input" as list_reading',
        ({ input, expectedIntent }) => {
          const result = classifyIntent(input);
          expect(result.intent).toBe(expectedIntent);
        }
      );
    });

    describe('Search Book Intent', () => {
      it.each(TEST_MESSAGES.searchBook)(
        'should classify "$input" as search_book',
        ({ input, expectedIntent, expectedQuery }) => {
          const result = classifyIntent(input);
          
          expect(result.intent).toBe(expectedIntent);
          
          if (expectedQuery) {
            expect(result.parameters.query).toBeTruthy();
          }
        }
      );

      it('should extract search query', () => {
        const result = classifyIntent('find Harry Potter');
        expect(result.parameters.query).toContain('Harry Potter');
      });
    });

    describe('Get Stats Intent', () => {
      it.each(TEST_MESSAGES.getStats)(
        'should classify "$input" as get_stats',
        ({ input, expectedIntent }) => {
          const result = classifyIntent(input);
          expect(result.intent).toBe(expectedIntent);
        }
      );
    });

    describe('Help Intent', () => {
      it.each(TEST_MESSAGES.help)(
        'should classify "$input" as help',
        ({ input, expectedIntent }) => {
          const result = classifyIntent(input);
          expect(result.intent).toBe(expectedIntent);
        }
      );
    });

    describe('Unknown Intent', () => {
      it.each(TEST_MESSAGES.unknown)(
        'should classify "$input" as unknown',
        ({ input, expectedIntent }) => {
          const result = classifyIntent(input);
          expect(result.intent).toBe(expectedIntent);
        }
      );

      it('should have low confidence for unknown messages', () => {
        const result = classifyIntent('xyzabc123 qwerty');
        expect(result.confidence).toBeLessThan(0.5);
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty string', () => {
        const result = classifyIntent('');
        expect(result.intent).toBe('unknown');
        expect(result.confidence).toBe(0);
      });

      it('should handle whitespace-only string', () => {
        const result = classifyIntent('   ');
        expect(result.intent).toBe('unknown');
      });

      it('should handle message with leading/trailing whitespace', () => {
        const result = classifyIntent('   page 50   ');
        expect(result.intent).toBe('update_progress');
        expect(result.parameters.pageNumber).toBe(50);
      });

      it('should be case-insensitive', () => {
        const lowerResult = classifyIntent('help');
        const upperResult = classifyIntent('HELP');
        const mixedResult = classifyIntent('HeLp');
        
        expect(lowerResult.intent).toBe('help');
        expect(upperResult.intent).toBe('help');
        expect(mixedResult.intent).toBe('help');
      });

      it('should preserve raw message', () => {
        const input = '  Page 100  ';
        const result = classifyIntent(input);
        expect(result.rawMessage).toBe(input);
      });

      it('should handle very long messages', () => {
        const longMessage = 'page ' + '1'.repeat(100);
        const result = classifyIntent(longMessage);
        expect(result).toBeDefined();
      });

      it('should handle unicode characters', () => {
        const result = classifyIntent('start The Caf\u00e9 Book');
        expect(result.intent).toBe('start_book');
      });

      it('should handle special characters in search', () => {
        const result = classifyIntent('find O\'Reilly');
        expect(result.intent).toBe('search_book');
      });
    });

    describe('Ambiguous Messages', () => {
      it('should pick strongest match for ambiguous message', () => {
        // "page 50 done" could be update_progress or finish_book
        const result = classifyIntent('page 50 done');
        expect(result.intent).toBe('update_progress'); // Should prioritize page number
      });

      it('should handle messages that match multiple patterns', () => {
        const result = classifyIntent('finished reading page 300');
        // Pattern order determines which intent wins - update_progress patterns checked first
        // This tests that classification still works without errors
        expect(['update_progress', 'finish_book']).toContain(result.intent);
      });
    });
  });

  describe('isConfidentClassification', () => {
    it('should return true for high confidence', () => {
      const result = classifyIntent('page 150');
      expect(isConfidentClassification(result)).toBe(true);
    });

    it('should return false for low confidence', () => {
      const result = classifyIntent('xyzabc123');
      expect(isConfidentClassification(result)).toBe(false);
    });

    it('should respect custom threshold', () => {
      const result = classifyIntent('42'); // Moderate confidence
      expect(isConfidentClassification(result, 0.5)).toBe(true);
      expect(isConfidentClassification(result, 0.9)).toBe(false);
    });

    it('should return false for unknown intents', () => {
      const result = classifyIntent('');
      expect(isConfidentClassification(result)).toBe(false);
    });
  });

  describe('Confidence Scoring', () => {
    it('should have higher confidence for pattern matches than keyword matches', () => {
      const patternMatch = classifyIntent('page 150'); // Direct pattern match
      const keywordMatch = classifyIntent('I want to update my page progress'); // Keyword match
      
      expect(patternMatch.confidence).toBeGreaterThan(keywordMatch.confidence);
    });

    it('should boost confidence with multiple keywords', () => {
      const singleKeyword = classifyIntent('status');
      const multipleKeywords = classifyIntent('what is my current status progress');
      
      // Multiple keywords should have equal or higher confidence
      expect(multipleKeywords.confidence).toBeGreaterThanOrEqual(singleKeyword.confidence);
    });

    it('should cap confidence at 0.95', () => {
      const result = classifyIntent('page progress update 150 through');
      expect(result.confidence).toBeLessThanOrEqual(0.95);
    });
  });
});
