"use client";

import { useEffect } from "react";

export default function BootstrapClient() {
  useEffect(() => {
    // This dynamically imports the Bootstrap JS bundle.
    // It ensures the code runs only on the client, after the page is interactive,
    // which prevents hydration errors.
    require("bootstrap/dist/js/bootstrap.bundle.min.js");
  }, []);

  return null;
}
