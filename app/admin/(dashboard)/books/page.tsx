import { prisma } from "@/lib/prisma";
import { DraggableBookList } from "@/components/admin/DraggableBookList";
import Link from "next/link";

export default async function AdminBooksPage() {
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
      rating: true,
      position: true,
    },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">All Books</h1>
        <Link
          href="/admin/books/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Add New Book
        </Link>
      </div>

      <p className="text-gray-600 mb-4">{books.length} books in your collection. Drag to reorder.</p>

      <DraggableBookList books={books} />
    </div>
  );
}
