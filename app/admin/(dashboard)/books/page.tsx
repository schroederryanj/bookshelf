import { prisma } from "@/lib/prisma";
import { DraggableBookList } from "@/components/admin/DraggableBookList";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminBooksPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;

  // Fetch books with description for RandomBookPicker
  const books = await prisma.book.findMany({
    orderBy: { position: "asc" },
    select: {
      id: true,
      title: true,
      img: true,
      author: true,
      pages: true,
      read: true,
      genre: true,
      description: true,
      ratingOverall: true,
      rating: true,
      position: true,
      createdAt: true,
      dateFinished: true,
    },
  });

  // Get unique genres for the filter dropdown
  const genres = [...new Set(books.map(b => b.genre).filter((g): g is string => g !== null))].sort();

  return (
    <div className="min-w-0">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 min-w-0">All Books</h1>
        <Link
          href="/admin/books/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-center sm:text-left whitespace-nowrap flex-shrink-0"
        >
          Add New Book
        </Link>
      </div>

      <DraggableBookList books={books} initialFilter={filter} genres={genres} />
    </div>
  );
}
