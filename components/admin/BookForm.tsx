"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { BookSearch, BookSearchResult } from "./BookSearch";

type BookData = {
  id?: number;
  title: string;
  img: string;
  height: number;
  read: string | null;
  author: string | null;
  pages: number | null;
  genre: string | null;
  description: string | null;
  rating: number | null;
};

type Props = {
  initialData?: BookData;
  mode: "create" | "edit";
};

export function BookForm({ initialData, mode }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    initialData?.img ? `/${initialData.img}` : null
  );
  // State for book selected from search
  const [selectedThumbnail, setSelectedThumbnail] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    img: initialData?.img || "",
    height: initialData?.height || 7,
    read: initialData?.read || "Unread",
    author: initialData?.author || "",
    pages: initialData?.pages || "",
    genre: initialData?.genre || "",
    description: initialData?.description || "",
    rating: initialData?.rating || 0,
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setSelectedThumbnail(null); // Clear search thumbnail if user uploads
    }
  };

  // Handler for when a book is selected from search
  const handleBookSelect = (book: BookSearchResult) => {
    setFormData({
      ...formData,
      title: book.title,
      author: book.author || "",
      pages: book.pages?.toString() || "",
      genre: book.genre || "",
      description: book.description || "",
    });

    // Set thumbnail for potential download
    if (book.thumbnail) {
      setSelectedThumbnail(book.thumbnail);
      setImagePreview(book.thumbnail);
      setImageFile(null); // Clear any uploaded file
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let imagePath = formData.img;

      // Upload image if new file selected
      if (imageFile) {
        const uploadData = new FormData();
        uploadData.append("file", imageFile);
        uploadData.append("title", formData.title);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: uploadData,
        });

        if (!uploadRes.ok) {
          throw new Error("Failed to upload image");
        }

        const uploadResult = await uploadRes.json();
        imagePath = uploadResult.path;
      }
      // Download cover from Google Books if selected from search
      else if (selectedThumbnail && !formData.img) {
        const coverRes = await fetch("/api/books/cover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: selectedThumbnail,
            title: formData.title,
          }),
        });

        if (coverRes.ok) {
          const coverResult = await coverRes.json();
          imagePath = coverResult.path;
        } else {
          throw new Error("Failed to download cover image");
        }
      }

      const bookData = {
        title: formData.title,
        img: imagePath,
        height: Number(formData.height),
        read: formData.read || null,
        author: formData.author || null,
        pages: formData.pages ? Number(formData.pages) : null,
        genre: formData.genre || null,
        description: formData.description || null,
        rating: formData.rating ? Number(formData.rating) : null,
      };

      const url =
        mode === "create"
          ? "/api/books"
          : `/api/books/${initialData?.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save book");
      }

      router.push("/admin/books");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-4 sm:p-6">
      {error && (
        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-md">{error}</div>
      )}

      {/* Book Search */}
      <BookSearch onSelect={handleBookSelect} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Author
            </label>
            <input
              type="text"
              value={formData.author}
              onChange={(e) =>
                setFormData({ ...formData, author: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pages
              </label>
              <input
                type="number"
                value={formData.pages}
                onChange={(e) =>
                  setFormData({ ...formData, pages: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Height (display) *
              </label>
              <input
                type="number"
                value={formData.height}
                onChange={(e) =>
                  setFormData({ ...formData, height: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                step="0.0001"
                min="1"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.read}
                onChange={(e) =>
                  setFormData({ ...formData, read: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="Unread">Unread</option>
                <option value="Reading">Reading</option>
                <option value="Read">Read</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Genre
              </label>
              <input
                type="text"
                value={formData.genre}
                onChange={(e) =>
                  setFormData({ ...formData, genre: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rating
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      rating: formData.rating === star ? 0 : star,
                    })
                  }
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <svg
                    className={`w-8 h-8 ${
                      star <= formData.rating
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
                </button>
              ))}
              {formData.rating > 0 && (
                <span className="ml-2 text-sm text-gray-500">
                  {formData.rating}/5
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Click a star to rate, click again to remove
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              rows={5}
            />
          </div>
        </div>

        {/* Right Column - Image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cover Image {mode === "create" && !selectedThumbnail && "*"}
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
            {imagePreview ? (
              <div className="relative w-full aspect-[2/3] max-w-xs mx-auto">
                {imagePreview.startsWith("http") ? (
                  // External URL from Google Books
                  <img
                    src={imagePreview}
                    alt="Cover preview"
                    className="w-full h-full object-contain rounded"
                  />
                ) : (
                  // Local image
                  <Image
                    src={imagePreview}
                    alt="Cover preview"
                    fill
                    className="object-contain rounded"
                  />
                )}
              </div>
            ) : (
              <div className="w-full aspect-[2/3] max-w-xs mx-auto bg-gray-100 rounded flex items-center justify-center">
                <span className="text-gray-400">No image</span>
              </div>
            )}
            <input
              type="file"
              onChange={handleImageChange}
              accept="image/webp,image/png,image/jpeg"
              className="mt-4 w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="text-xs text-gray-500 mt-2">
              {selectedThumbnail
                ? "Cover from Google Books will be downloaded, or upload your own"
                : "Accepted formats: WebP, PNG, JPG"}
            </p>
          </div>

          {mode === "edit" && !imageFile && formData.img && (
            <p className="mt-2 text-sm text-gray-500">
              Current: {formData.img}
            </p>
          )}
        </div>
      </div>

      <div className="mt-8 flex justify-end gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? "Saving..."
            : mode === "create"
            ? "Create Book"
            : "Update Book"}
        </button>
      </div>
    </form>
  );
}
