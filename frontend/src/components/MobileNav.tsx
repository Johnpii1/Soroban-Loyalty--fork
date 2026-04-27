"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/merchant",  label: "Merchant"  },
  { href: "/analytics", label: "Analytics" },
  { href: "/profile",   label: "Profile"   },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Hamburger button — visible only on mobile */}
      <button
        className="hamburger"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="mobile-drawer"
        onClick={() => setOpen((v) => !v)}
      >
        <span className={`hamburger-bar ${open ? "bar-top-open" : ""}`} />
        <span className={`hamburger-bar ${open ? "bar-mid-open" : ""}`} />
        <span className={`hamburger-bar ${open ? "bar-bot-open" : ""}`} />
      </button>

      {/* Backdrop */}
      {open && <div className="drawer-backdrop" aria-hidden="true" />}

      {/* Slide-in drawer */}
      <div
        id="mobile-drawer"
        ref={drawerRef}
        className={`mobile-drawer ${open ? "drawer-open" : ""}`}
        aria-hidden={!open}
      >
        <nav aria-label="Mobile navigation">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`drawer-link ${pathname === href ? "drawer-link-active" : ""}`}
              onClick={() => setOpen(false)}
              tabIndex={open ? 0 : -1}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
