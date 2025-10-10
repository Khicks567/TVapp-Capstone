import Navbar from "@/app/components/nav";
import { Suspense } from "react";

import TvSearchContent from "../components/tvsearch";

export default function TvsearchPage() {
  return (
    <div>
      <Navbar />

      <Suspense fallback={<div>Loading search interface...</div>}>
        <TvSearchContent />
      </Suspense>
    </div>
  );
}
