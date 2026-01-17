export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-orange-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
        <p className="text-amber-800 font-medium">Loading bookshelf...</p>
      </div>
    </div>
  );
}
