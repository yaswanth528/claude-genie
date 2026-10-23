"use client";
// React Bits pieces for the home page, wrapped so they follow the site's colours and the
// visitor's "reduce motion" setting (no rotating words or moving marquee when it's on).
import { MotionConfig, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Aurora from "@/components/bits/Aurora/Aurora";
import GradientText from "@/components/bits/GradientText/GradientText";
import ScrollVelocity from "@/components/bits/ScrollVelocity/ScrollVelocity";
import ShinyText from "@/components/bits/ShinyText/ShinyText";
import SpotlightCard from "@/components/bits/SpotlightCard/SpotlightCard";

// Peacock & Gold
const ACCENT = "#0e8f8f"; // teal
const ACCENT_2 = "#4fd1c5"; // aqua
const AMBER = "#d9a441"; // gold
const LILAC = "#2b8cc4"; // sky peacock
const SHOP_TYPES = ["saree shop", "bakery", "kirana store", "salon", "sweet shop", "box factory"];

export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

export function Kicker({ text }: { text: string }) {
  return <ShinyText text={text} color="#a87b22" shineColor="#f3d68f" speed={3} className="lp-kicker" />;
}

// "Speak. / Your [saree shop] is online." The whole second line swaps, so every version is
// centred on its own (no gaps around short words); the shop word's letters rise one after another.
// Pure CSS, transform and opacity only, so it stays smooth on budget phones.
export function HeroTitle() {
  return (
    <h1 className="lp-h1">
      <span className="lp-h1-a">Speak.</span>
      <span className="lp-lines" style={{ ["--n" as string]: SHOP_TYPES.length }}>
        <span className="sr-only">Your shop is online.</span>
        {SHOP_TYPES.map((w, i) => (
          <span key={w} className="lp-line" style={{ ["--i" as string]: i }} aria-hidden="true">
            Your{" "}
            <em>
              {Array.from(w).map((ch, j) => (
                <span key={j} style={{ ["--j" as string]: j }}>
                  {ch === " " ? " " : ch}
                </span>
              ))}
            </em>{" "}
            is online.
          </span>
        ))}
      </span>
    </h1>
  );
}

export function HeroSub({ text }: { text: string }) {
  return (
    <p className="lp-sub" data-reveal>
      {text}
    </p>
  );
}

// The kinds of shops SiteGenie is for, drifting past (faster as you scroll).
export function ShopMarquee() {
  const still = useReducedMotion();
  const rows = ["Sarees · Sweets · Kirana · Bakery · Salon · Tiffin · ", "Tailoring · Mobiles · Flowers · Boxes · Pharmacy · Gifts · "];
  if (still)
    return (
      <div className="lp-marquee still" aria-hidden="true">
        <p>{rows.join("")}</p>
      </div>
    );
  return (
    <div className="lp-marquee" aria-hidden="true">
      <ScrollVelocity texts={rows} velocity={36} className="lp-marquee-text" numCopies={6} />
    </div>
  );
}

export function Greatest({ children }: { children: ReactNode }) {
  return (
    <GradientText colors={[ACCENT, ACCENT_2, LILAC, AMBER, ACCENT]} animationSpeed={6} className="lp-greatest">
      {children}
    </GradientText>
  );
}

export function FeatureTile({ title, body, wide, dark }: { title: string; body: string; wide?: boolean; dark?: boolean }) {
  return (
    <SpotlightCard
      theme={dark ? "dark" : "light"}
      spotlightColor={dark ? AMBER : LILAC}
      intensity={dark ? 0.35 : 0.5}
      spotlightSize={dark ? 340 : 260}
      ambient={dark}
      className={`lp-tile ${wide ? "wide" : ""} ${dark ? "dark" : ""}`}
    >
      <h3>{title}</h3>
      <p>{body}</p>
    </SpotlightCard>
  );
}

export function FinalGlow() {
  return (
    <div className="lp-aurora" aria-hidden="true">
      <Aurora colorStops={[ACCENT_2, AMBER, LILAC]} amplitude={0.8} blend={0.6} speed={0.5} height={0.36} direction="bottom" mouseInteraction={false} />
    </div>
  );
}

// Counts up to a price when it scrolls into view (₹0 → ₹1,999). Shows the final number straight
// away without JavaScript or with reduced motion.
export function CountUp({ to, prefix = "₹" }: { to: number; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(to);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setN(0);
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (t: number) => {
        const k = Math.min(1, (t - start) / 1400);
        setN(Math.round(to * (1 - Math.pow(1 - k, 3))));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to]);
  return (
    <span ref={ref} aria-label={`${prefix}${to.toLocaleString("en-IN")}`}>
      {prefix}
      {n.toLocaleString("en-IN")}
    </span>
  );
}
