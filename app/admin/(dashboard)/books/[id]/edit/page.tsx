import { prisma } from "@/lib/prisma";
import { BookForm } from "@/components/admin/BookForm";
import { notFound } from "next/navigation";

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
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Edit Book</h1>
      <BookForm
        mode="edit"
        initialData={{
          id: book.id,
          title: book.title,
          img: book.img,
          height: book.height,
          read: book.read,
          author: book.author,
          pages: book.pages,
          genre: book.genre,
          description: book.description,
          rating: book.rating,
        }}
      />
    </div>
  );
}
