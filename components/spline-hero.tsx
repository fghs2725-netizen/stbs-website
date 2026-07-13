"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";

const Spline = dynamic(() => import("@splinetool/react-spline/next"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-signal/5" />,
});

const defaultScene = "https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode";

export function SplineHero() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  if (!ready) return null;
  return <motion.div aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: .28 }} transition={{ duration: 1.2, delay: .4 }} className="pointer-events-none absolute right-0 top-20 z-[1] hidden h-[70%] w-[48%] overflow-hidden mix-blend-screen xl:block">
    <Spline scene={process.env.NEXT_PUBLIC_SPLINE_SCENE_URL || defaultScene} />
  </motion.div>;
}
