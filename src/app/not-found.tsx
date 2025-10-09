import React from "react";
import Link from "next/link";

const Custom404 = () => {
  return (
    <div className="main404">
      <h1 className="h1404">404 - Page Not Found</h1>
      <p className="p404">
        Oops! The page you are looking for doesn&apos;t exist.
      </p>

      <Link className="link404" href="/profile">
        Go back homepage
      </Link>
    </div>
  );
};

export default Custom404;
