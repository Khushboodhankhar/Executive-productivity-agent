import { useState, useEffect } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [dark]);

  return (
    <button onClick={() => setDark(!dark)} className="p-2 rounded-full bg-white dark:bg-gray-800 shadow">
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
