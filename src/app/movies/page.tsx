import { Suspense } from "react";
import Navbar from "@/app/components/nav";
import { MovieSearchContent } from "@/app/components/moviesearch";

export default function MoviesearchPage() {
  return (
    <div>
      <Navbar />

      <Suspense fallback={<div>Loading search interface...</div>}>
        <MovieSearchContent />
      </Suspense>
    </div>
  );
}
