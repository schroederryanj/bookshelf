import { BookForm } from "@/components/admin/BookForm";

export default function NewBookPage() {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 sm:mb-8">Add New Book</h1>
      <BookForm mode="create" />
    </div>
  );
}
