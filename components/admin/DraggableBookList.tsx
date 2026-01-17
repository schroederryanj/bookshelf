"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";

type Book = {
  id: number;
  title: string;
  img: string;
  author: string | null;
  pages: number | null;
  read: string | null;
  genre: string | null;
  ratingOverall: number | null;
  position: number;
};

export function DraggableBookList({ books: initialBooks }: { books: Book[] }) {
  const router = useRouter();
  const [books, setBooks] = useState(initialBooks);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragOverItem.current = index;
  };

  const handleDrop = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) return;

    const newBooks = [...books];
    const draggedBook = newBooks[dragItem.current];
    newBooks.splice(dragItem.current, 1);
    newBooks.splice(dragOverItem.current, 0, draggedBook);

    // Update positions
    newBooks.forEach((book, index) => {
      book.position = index;
    });

    setBooks(newBooks);
    setHasChanges(true);
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/books/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          books: books.map((b) => ({
            id: b.id,
            position: b.position,
            shelf: 1,
          })),
        }),
      });

      if (res.ok) {
        setHasChanges(false);
        router.refresh();
      } else {
        alert("Failed to save order");
      }
    } catch {
      alert("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/books/${id}`, { method: "DELETE" });
      if (res.ok) {
        setBooks(books.filter((b) => b.id !== id));
        router.refresh();
      } else {
        alert("Failed to delete book");
      }
    } catch {
      alert("An error occurred");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-gray-400 text-sm">-</span>;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? "text-yellow-400 fill-yellow-400"
                : "text-gray-300"
            }`}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
            />
          </svg>
        ))}
      </div>
    );
  };

  const renderStatusBadge = (read: string | null) => (
    <span
      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
        read === "Read"
          ? "bg-green-100 text-green-800"
          : read === "Unread"
          ? "bg-yellow-100 text-yellow-800"
          : "bg-gray-100 text-gray-800"
      }`}
    >
      {read || "Unknown"}
    </span>
  );

  return (
    <>
      {/* Save Bar */}
      {hasChanges && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex justify-between items-center">
          <span className="text-amber-800 text-sm sm:text-base">You have unsaved changes to the book order.</span>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm sm:text-base"
          >
            {saving ? "Saving..." : "Save Order"}
          </button>
        </div>
      )}

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3 min-w-0">
        {books.map((book, index) => (
          <div
            key={book.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={handleDrop}
            className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 min-w-0"
          >
            <div className="flex gap-3 min-w-0">
              {/* Drag Handle & Cover */}
              <div className="flex items-start gap-2">
                <div className="text-gray-400 cursor-move mt-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
                  </svg>
                </div>
                <div className="w-16 h-24 relative flex-shrink-0">
                  <Image
                    src={`/${book.img}`}
                    alt={book.title}
                    fill
                    className="object-cover rounded"
                    sizes="64px"
                  />
                </div>
              </div>

              {/* Book Info */}
              <div className="flex-1 min-w-0 overflow-hidden">
                <h3 className="font-medium text-gray-900 truncate text-sm">{book.title}</h3>
                <p className="text-xs text-gray-500 truncate">{book.author || "Unknown author"}</p>

                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {renderStatusBadge(book.read)}
                  {book.pages && (
                    <span className="text-xs text-gray-500">{book.pages} pages</span>
                  )}
                </div>

                <div className="mt-2">
                  {renderStars(book.ratingOverall)}
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-3">
                  <Link
                    href={`/admin/books/${book.id}/edit`}
                    className="text-sm text-blue-600 hover:text-blue-900 font-medium"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => setDeleteId(book.id)}
                    className="text-sm text-red-600 hover:text-red-900 font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8">

              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Book
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Author
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pages
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rating
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {books.map((book, index) => (
              <tr
                key={book.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={handleDrop}
                className="hover:bg-gray-50 cursor-move"
              >
                <td className="px-4 py-3 text-gray-400">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
                  </svg>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-10 h-14 relative flex-shrink-0">
                      <Image
                        src={`/${book.img}`}
                        alt={book.title}
                        fill
                        className="object-cover rounded"
                        sizes="40px"
                      />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                        {book.title}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {book.author || "-"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {book.pages || "-"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {renderStatusBadge(book.read)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {renderStars(book.ratingOverall)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                  <Link
                    href={`/admin/books/${book.id}/edit`}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => setDeleteId(book.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Delete Book?
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this book? This action cannot be
              undone.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
