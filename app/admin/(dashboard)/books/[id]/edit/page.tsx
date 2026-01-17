import { prisma } from "@/lib/prisma";
import { BookForm } from "@/components/admin/BookForm";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditBookPage({ params }: Props) {
  const { id } = await params;
  const bookId = parseInt(id, 10);

  if (isNaN(bookId)) {
    notFound();
  }

  const book = await prisma.book.findUnique({
    where: { id: bookId },
  });

  if (!book) {
    notFound();
  }

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 sm:mb-8">Edit Book</h1>
      <BookForm
        mode="edit"
        initialData={{
          id: book.id,
          title: book.title,
          img: book.img,
          height: book.height,
          read: book.read,
          dateStarted: book.dateStarted,
          dateFinished: book.dateFinished,
          author: book.author,
          pages: book.pages,
          genre: book.genre,
          description: book.description,
          // Multi-factor ratings
          ratingWriting: book.ratingWriting,
          ratingPlot: book.ratingPlot,
          ratingCharacters: book.ratingCharacters,
          ratingPacing: book.ratingPacing,
          ratingWorldBuilding: book.ratingWorldBuilding,
          ratingEnjoyment: book.ratingEnjoyment,
          ratingRecommend: book.ratingRecommend,
          ratingOverall: book.ratingOverall,
          ratingOverrideManual: book.ratingOverrideManual,
        }}
      />
    </div>
  );
}
