import { Shelf } from "@/components/Shelf";
import { Stats } from "@/components/Stats";
import { prisma } from "@/lib/prisma";
import { Book } from "@/data/types";

export default async function Home() {
  const dbBooks = await prisma.book.findMany({
    orderBy: { position: "asc" },
  });

  // Transform Prisma types to match existing Book type
  const books: Book[] = dbBooks.map((book) => ({
    title: book.title,
    img: book.img,
    height: book.height,
    read: book.read ?? undefined,
    author: book.author ?? undefined,
    pages: book.pages ?? undefined,
    genre: book.genre ?? undefined,
    description: book.description ?? undefined,
    rating: book.rating ?? undefined,
  }));

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen">
      <main className="flex flex-col gap-0 row-start-2 items-center ">
        <Stats books={books}></Stats>
        <Shelf books={books}></Shelf>
      </main>
    </div>
  );
}
