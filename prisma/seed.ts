import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { books } from "../data/books";

async function main() {
  const adapter = new PrismaMariaDb({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "bookshelf",
    password: process.env.DB_PASSWORD || "bookshelf123",
    database: process.env.DB_NAME || "bookshelf",
    port: parseInt(process.env.DB_PORT || "3306"),
  });
  const prisma = new PrismaClient({ adapter });

  console.log("Starting seed...");

  // Clear existing data
  await prisma.book.deleteMany();
  console.log("Cleared existing books");

  // Insert books in batches, preserving original order with position
  const batchSize = 50;
  for (let i = 0; i < books.length; i += batchSize) {
    const batch = books.slice(i, i + batchSize);
    await prisma.book.createMany({
      data: batch.map((book, batchIndex) => ({
        title: book.title,
        img: book.img,
        height: book.height,
        read: book.read || null,
        author: book.author || null,
        pages: book.pages || null,
        genre: book.genre || null,
        description: book.description || null,
        position: i + batchIndex, // Preserve original array order
      })),
    });
    console.log(
      `Inserted books ${i + 1} to ${Math.min(i + batchSize, books.length)}`
    );
  }

  const count = await prisma.book.count();
  console.log(`Seeding complete. Total books: ${count}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
