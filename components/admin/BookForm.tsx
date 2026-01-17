"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { BookSearch, BookSearchResult } from "./BookSearch";
import { StarRating } from "../ui/StarRating";
import { RATING_FACTORS, calculateOverallRating } from "@/lib/ratings";

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
  // Multi-factor ratings
  ratingWriting: number | null;
  ratingPlot: number | null;
  ratingCharacters: number | null;
  ratingPacing: number | null;
  ratingWorldBuilding: number | null;
  ratingEnjoyment: number | null;
  ratingRecommend: number | null;
  ratingOverall: number | null;
  ratingOverrideManual: boolean;
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
  const [selectedThumbnail, setSelectedThumbnail] = useState<string | null>(
    null
  );
  const [showDetailedRating, setShowDetailedRating] = useState(false);

  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    img: initialData?.img || "",
    height: initialData?.height || 7,
    read: initialData?.read || "Unread",
    author: initialData?.author || "",
    pages: initialData?.pages || "",
    genre: initialData?.genre || "",
    description: initialData?.description || "",
    // Multi-factor ratings
    ratingWriting: initialData?.ratingWriting || 0,
    ratingPlot: initialData?.ratingPlot || 0,
    ratingCharacters: initialData?.ratingCharacters || 0,
    ratingPacing: initialData?.ratingPacing || 0,
    ratingWorldBuilding: initialData?.ratingWorldBuilding || 0,
    ratingEnjoyment: initialData?.ratingEnjoyment || 0,
    ratingRecommend: initialData?.ratingRecommend || 0,
    ratingOverall: initialData?.ratingOverall || 0,
    ratingOverrideManual: initialData?.ratingOverrideManual || false,
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setSelectedThumbnail(null);
    }
  };

  const handleBookSelect = (book: BookSearchResult) => {
    setFormData({
      ...formData,
      title: book.title,
      author: book.author || "",
      pages: book.pages?.toString() || "",
      genre: book.genre || "",
      description: book.description || "",
    });

    if (book.thumbnail) {
      setSelectedThumbnail(book.thumbnail);
      setImagePreview(book.thumbnail);
      setImageFile(null);
    }
  };

  const handleFactorChange = (factorKey: string, value: number) => {
    const newFormData = { ...formData, [factorKey]: value };

    // Auto-recalculate overall if not manually overridden
    if (!formData.ratingOverrideManual) {
      const calculated = calculateOverallRating(newFormData);
      newFormData.ratingOverall = calculated || 0;
    }

    setFormData(newFormData);
  };

  const handleOverallChange = (value: number) => {
    setFormData({
      ...formData,
      ratingOverall: value,
      ratingOverrideManual: true,
    });
  };

  const handleOverrideToggle = (checked: boolean) => {
    const newFormData = { ...formData, ratingOverrideManual: checked };

    // If turning off override, recalculate from factors
    if (!checked) {
      const calculated = calculateOverallRating(formData);
      newFormData.ratingOverall = calculated || 0;
    }

    setFormData(newFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let imagePath = formData.img;

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
      } else if (selectedThumbnail && !formData.img) {
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
        // Multi-factor ratings
        ratingWriting: formData.ratingWriting || null,
        ratingPlot: formData.ratingPlot || null,
        ratingCharacters: formData.ratingCharacters || null,
        ratingPacing: formData.ratingPacing || null,
        ratingWorldBuilding: formData.ratingWorldBuilding || null,
        ratingEnjoyment: formData.ratingEnjoyment || null,
        ratingRecommend: formData.ratingRecommend || null,
        ratingOverall: formData.ratingOverall || null,
        ratingOverrideManual: formData.ratingOverrideManual,
      };

      const url =
        mode === "create" ? "/api/books" : `/api/books/${initialData?.id}`;
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
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-lg shadow-md p-4 sm:p-6"
    >
      {error && (
        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-md">{error}</div>
      )}

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

          {/* Multi-factor Rating Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rating
            </label>

            {/* Overall Rating Display */}
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm text-gray-600 w-16">Overall:</span>
              <StarRating
                value={formData.ratingOverall}
                onChange={handleOverallChange}
                size="lg"
                disabled={!formData.ratingOverrideManual}
              />
              <span className="text-sm text-gray-500">
                {formData.ratingOverall > 0
                  ? `${formData.ratingOverall.toFixed(1)}/5`
                  : "-"}
              </span>
            </div>

            {/* Toggle for detailed ratings */}
            <button
              type="button"
              onClick={() => setShowDetailedRating(!showDetailedRating)}
              className="text-sm text-blue-600 hover:text-blue-800 mb-2 flex items-center gap-1"
            >
              <svg
                className={`w-4 h-4 transition-transform ${
                  showDetailedRating ? "rotate-90" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              {showDetailedRating
                ? "Hide detailed ratings"
                : "Show detailed ratings"}
            </button>

            {/* Detailed Rating Factors */}
            {showDetailedRating && (
              <div className="p-3 bg-gray-50 rounded-md space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {RATING_FACTORS.map((factor) => (
                    <div
                      key={factor.key}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm text-gray-700">
                        {factor.label}
                      </span>
                      <StarRating
                        value={
                          formData[factor.key as keyof typeof formData] as number
                        }
                        onChange={(val) => handleFactorChange(factor.key, val)}
                        size="sm"
                      />
                    </div>
                  ))}
                </div>

                {/* Manual override toggle */}
                <div className="pt-2 border-t border-gray-200">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.ratingOverrideManual}
                      onChange={(e) => handleOverrideToggle(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-600">
                      Override calculated average
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-6">
                    {formData.ratingOverrideManual
                      ? "Click overall stars to set manually"
                      : "Overall rating auto-calculated from factors"}
                  </p>
                </div>
              </div>
            )}
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
                  <img
                    src={imagePreview}
                    alt="Cover preview"
                    className="w-full h-full object-contain rounded"
                  />
                ) : (
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
