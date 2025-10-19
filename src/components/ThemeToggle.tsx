import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import clsx from "clsx";

export default function ThemeTest() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // ✅ Force default theme to dark on mount
    if (!theme) setTheme("dark");
  }, [theme, setTheme]);

  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle theme"
      className={clsx(
        "relative w-[100px] h-[40px] rounded-full overflow-hidden border-2 transition-all duration-700 ease-[cubic-bezier(0.68,-0.55,0.27,1.55)]",
        isDark
          ? "bg-gradient-to-t from-[#1a1a2e] to-[#16213e] border-gray-700"
          : "bg-gradient-to-t from-[#87ceeb] to-[#e0f6ff] border-blue-200"
      )}
    >
      {/* ☀️ Sun */}
      <div
        className={clsx(
          "absolute top-[7px] w-[25px] h-[25px] rounded-full bg-gradient-radial from-[#ffd700_30%] to-[#ffa500_70%] shadow-[0_0_8px_#ffd700] transition-all duration-700",
          isDark ? "-left-[40px] scale-0" : "left-[8px] scale-100"
        )}
      ></div>

      {/* 🌙 Moon */}
      <div
        className={clsx(
          "absolute top-[7px] w-[25px] h-[25px] rounded-full bg-gradient-radial from-[#f4f4f4_30%] to-[#e0e0e0_70%] shadow-[0_0_8px_#f4f4f4] transition-all duration-700",
          isDark ? "right-[8px] scale-100" : "-right-[40px] scale-0"
        )}
      ></div>

      {/* ☁️ Cloud 1 */}
      <div
        className={clsx(
          "absolute bg-white rounded-[20px] top-[10px] left-[45px] w-[30px] h-[8px] transition-all duration-700 before:content-[''] before:absolute before:bg-white before:rounded-full before:w-[14px] before:h-[14px] before:-top-[6px] before:left-[2px] after:content-[''] after:absolute after:bg-white after:rounded-full after:w-[12px] after:h-[12px] after:-top-[5px] after:right-[2px]",
          isDark && "translate-x-[120px] scale-0"
        )}
      ></div>

      {/* ☁️ Cloud 2 */}
      <div
        className={clsx(
          "absolute bg-white rounded-[20px] top-[22px] left-[60px] w-[25px] h-[6px] transition-all duration-700 before:content-[''] before:absolute before:bg-white before:rounded-full before:w-[10px] before:h-[10px] before:-top-[4px] before:left-[2px] after:content-[''] after:absolute after:bg-white after:rounded-full after:w-[8px] after:h-[8px] after:-top-[3px] after:right-[2px]",
          isDark && "translate-x-[120px] scale-0"
        )}
      ></div>

      {/* ⭐ Stars */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className={clsx(
            "absolute bg-white opacity-0 transition-all duration-700 clip-star animate-[twinkle_2s_infinite]",
            isDark && "opacity-100 scale-[1.2]",
            [
              "top-[6px] left-[12px] w-[5px] h-[5px] delay-[0s]",
              "top-[18px] left-[28px] w-[4px] h-[4px] delay-[0.3s]",
              "top-[28px] left-[18px] w-[3px] h-[3px] delay-[0.6s]",
            ][i]
          )}
        ></div>
      ))}
    </button>
  );
}
