import React from "react";
import { NextPage } from "next";

const Custom404: NextPage = () => {
  return (
    <div className="main404">
      <h1 className="h1404">404 - Page Not Found</h1>
      <p className="p404">Oops! The page you are looking for doesn't exist.</p>

      <a className="link404" href="/profile">
        Go back homepage
      </a>
    </div>
  );
};

export default Custom404;
