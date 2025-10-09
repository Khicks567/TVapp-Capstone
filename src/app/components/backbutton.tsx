"use client";

import { ArrowLeft } from "lucide-react";

export default function Backbutton() {
  return (
    <button onClick={() => window.history.back()} className="backbutton">
      <ArrowLeft /> Back
    </button>
  );
}
