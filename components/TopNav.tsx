"use client";

import NavSegments from "./NavSegments";
import LanguageSelect from "./LanguageSelect";

/** Top bar: the section segmented control + the language selector. */
export default function TopNav() {
  return (
    <nav className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-3 mb-8">
      <NavSegments />
      <LanguageSelect />
    </nav>
  );
}
