"use client";
// React Bits pieces for the home page, wrapped so they follow the site's colours and the
// visitor's "reduce motion" setting (no rotating words or moving marquee when it's on).
import { MotionConfig, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import Aurora from "@/components/bits/Aurora/Aurora";
import BlurText from "@/components/bits/BlurText/BlurText";
import GradientText from "@/components/bits/GradientText/GradientText";
import RotatingText from "@/components/bits/RotatingText/RotatingText";
import ScrollVelocity from "@/components/bits/ScrollVelocity/ScrollVelocity";
import ShinyText from "@/components/bits/ShinyText/ShinyText";
import SpotlightCard from "@/components/bits/SpotlightCard/SpotlightCard";

const ACCENT = "#c24a2e";
const ACCENT_2 = "#e8743f";
const AMBER = "#f2a33a";
const SHOP_TYPES = ["saree shop", "bakery", "kirana", "salon", "sweet shop", "box factory", "tailoring shop"];

export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

export function Kicker({ text }: { text: string }) {
  return <ShinyText text={text} color={ACCENT} shineColor="#ffb08a" speed={3} className="lp-kicker" />;
}

// "Speak. / Your [saree shop] is online."
export function HeroTitle() {
  const still = useReducedMotion();
  return (
    <h1 className="lp-h1">
      <span className="lp-h1-a">Speak.</span>
      <span className="lp-h1-b">
        Your{" "}
        {still ? (
          <span className="lp-rotate">shop</span>
        ) : (
          <RotatingText
            texts={SHOP_TYPES}
            mainClassName="lp-rotate"
            splitBy="characters"
            staggerFrom="last"
            staggerDuration={0.02}
            rotationInterval={2400}
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "-110%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
          />
        )}{" "}
        is online.
      </span>
    </h1>
  );
}

export function HeroSub({ text }: { text: string }) {
  return <BlurText text={text} delay={60} animateBy="words" direction="bottom" className="lp-sub" />;
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
    <GradientText colors={[ACCENT, ACCENT_2, AMBER, ACCENT]} animationSpeed={6} className="lp-greatest">
      {children}
    </GradientText>
  );
}

export function FeatureTile({ title, body, wide, dark }: { title: string; body: string; wide?: boolean; dark?: boolean }) {
  return (
    <SpotlightCard
      theme={dark ? "dark" : "light"}
      spotlightColor={dark ? ACCENT_2 : ACCENT}
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
      <Aurora colorStops={[ACCENT, AMBER, ACCENT_2]} amplitude={0.8} blend={0.6} speed={0.5} height={0.36} direction="bottom" mouseInteraction={false} />
    </div>
  );
}
