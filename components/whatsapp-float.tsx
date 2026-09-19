"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

// Message text specified in the brief. It is the customer's own first message, so it keeps the word "quote".
const MESSAGE = "Hi, I'd like a quote for borewell drilling.";

/**
 * Floating WhatsApp shortcut: appears after ~400px of scroll, bottom-right, flat (no shadow).
 * Wrapped in an <aside> landmark so it is not stray page content. The footer's bottom bar keeps
 * extra padding on small screens so this button never covers the legal links.
 */
export function WhatsAppFloat({ phone }: { phone?: string }) {
  const [visible, setVisible] = useState(false);
  const reduce = useReducedMotion();

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

  return (
    <aside aria-label="WhatsApp chat">
      <AnimatePresence>
        {visible && (
          <motion.a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat with us on WhatsApp"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: reduce ? 0 : 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-u2 right-u2 z-50 flex size-14 items-center justify-center rounded-full bg-stbs-verified text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stbs-ink md:bottom-u3 md:right-u3"
          >
            <MessageCircle size={26} strokeWidth={1.75} aria-hidden />
          </motion.a>
        )}
      </AnimatePresence>
    </aside>
  );
}
