"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";

// Message text specified in the brief. It is the customer's own first message, so it keeps the word "quote".
const MESSAGE = "Hi, I'd like a quote for borewell drilling.";

/**
 * Floating WhatsApp shortcut: appears after ~400px of scroll, bottom-right, flat (no shadow).
 * Wrapped in an <aside> landmark so it is not stray page content. The footer's bottom bar keeps
 * extra padding on small screens so this button never covers the legal links.
 */
export function WhatsAppFloat({ phone }: { phone?: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // When the admin has cleared the WhatsApp/phone numbers, do not show a hardcoded fallback number.
  const number = (phone ?? "").replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
  if (!number) return null;

  const href = `https://wa.me/91${number}?text=${encodeURIComponent(MESSAGE)}`;

  // Plain CSS transition (no animation library): this component loads on every public page, and pulling
  // in framer-motion for a fade cost ~120 KB of JavaScript. Hidden = out of the tab order and the a11y tree.
  return (
    <aside aria-label="WhatsApp chat">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        aria-hidden={!visible}
        tabIndex={visible ? 0 : -1}
        className={`fixed bottom-u2 right-u2 z-50 flex size-14 items-center justify-center rounded-full bg-stbs-verified text-white transition-[opacity,transform,visibility] duration-[250ms] ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stbs-ink motion-reduce:transition-none md:bottom-u3 md:right-u3 ${visible ? "visible translate-y-0 opacity-100" : "invisible translate-y-2 opacity-0"}`}
      >
        <MessageCircle size={26} strokeWidth={1.75} aria-hidden />
      </a>
    </aside>
  );
}
