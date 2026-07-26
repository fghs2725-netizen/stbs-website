'use client';

interface ThumbnailNavProps {
  totalPages: number;
  currentPage: number;
  onPageSelect: (page: number) => void;
}

export default function ThumbnailNav({ totalPages, currentPage, onPageSelect }: ThumbnailNavProps) {
  const thumbnails = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="space-y-4">
      {thumbnails.map(pageNum => (
        <button
          key={pageNum}
          onClick={() => onPageSelect(pageNum)}
          className={`w-full flex flex-col items-center gap-2 group focus:outline-none`}
        >
          <div className={`w-3/4 aspect-[1/1.414] bg-white rounded-sm shadow-sm border-2 transition-all relative overflow-hidden ${
            currentPage === pageNum ? 'border-[#f7c600] ring-2 ring-[#f7c600]/20' : 'border-transparent group-hover:border-gray-500'
          }`}>
            <div className="absolute inset-0 bg-black/5 flex items-center justify-center text-gray-400 text-xs font-mono">
              P.{pageNum}
            </div>
          </div>
          <span className={`text-xs font-mono ${currentPage === pageNum ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}`}>
            {pageNum}
          </span>
        </button>
      ))}
    </div>
  );
}
