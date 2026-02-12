"use client";

import { useState } from "react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import settingsSvg from "@/components/SVG/settingsSVG.svg";

export default function SettingsSheet({
  buttonClassName = "",
  iconClassName = "",
  label = "Settings",
  showLabel = false,
  reserveLabelSpace = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerClassName =
    buttonClassName ||
    "flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--card)] text-[color:var(--ink)] shadow-soft transition hover:-translate-y-0.5";
  const settingsIconSrc =
    typeof settingsSvg === "string" ? settingsSvg : settingsSvg.src;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={triggerClassName}
        aria-label="Open settings"
      >
        <span
          className={`h-6 w-6 bg-current ${iconClassName}`}
          style={{
            WebkitMaskImage: `url(${settingsIconSrc})`,
            maskImage: `url(${settingsIconSrc})`,
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskSize: "contain",
            maskSize: "contain",
            WebkitMaskPosition: "center",
            maskPosition: "center",
          }}
        />
        {showLabel ? (
          <span className="text-[11px] font-semibold">{label}</span>
        ) : reserveLabelSpace ? (
          <span className="text-[11px] font-semibold opacity-0 select-none">
            {label}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/40"
            aria-label="Close settings"
          />

          <div className="absolute inset-x-0 bottom-0">
            <div className="mx-auto w-full max-w-md rounded-t-3xl bg-[color:var(--card)] px-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-5 shadow-soft">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-[color:var(--ink)]">
                  Settings
                </h2>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-sm font-semibold text-[color:var(--muted)]"
                >
                  Done
                </button>
              </div>

              <div className="mt-5 flex items-center justify-between rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-muted)] px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-[color:var(--ink)]">
                    Theme
                  </p>
                  <p className="text-xs text-[color:var(--muted)]">
                    Light or dark appearance
                  </p>
                </div>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
