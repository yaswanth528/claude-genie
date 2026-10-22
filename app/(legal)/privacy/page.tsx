import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy policy · SiteGenie" };

const contact = () => process.env.SUPPORT_EMAIL;

export default function PrivacyPage() {
  const email = contact();
  return (
    <article>
      <h1>Privacy policy</h1>
      <p className="hint">Last updated: 22 October 2026</p>

      <p>
        SiteGenie helps small businesses make a website by speaking about their shop. This page explains what information we
        collect, why, who helps us process it, and the choices you have. We follow India’s Digital Personal Data Protection
        Act, 2023.
      </p>

      <h2>Shop owners</h2>
      <ul>
        <li>
          <strong>What you tell us:</strong> your voice recording and what it says, your shop’s name, products, prices, photos and
          videos, WhatsApp number, UPI ID, address, opening hours, and optionally an email address.
        </li>
        <li>
          <strong>Why:</strong> to build, show and update your website, send you orders and alerts, and handle your payment for
          SiteGenie.
        </li>
        <li>
          <strong>Your recording</strong> is sent to Google Gemini to turn speech into text and is not kept by SiteGenie after that.
          Recordings you replay on the review screen stay on your own phone.
        </li>
        <li>Your WhatsApp number, UPI ID and shop details are shown publicly on your website, because customers need them to order and pay.</li>
      </ul>

      <h2>Customers who order from a shop</h2>
      <ul>
        <li>
          <strong>What we keep:</strong> your name, phone number, delivery address, any note, and what you ordered.
        </li>
        <li>
          <strong>Why:</strong> so the shop can deliver your order, and so you can see or change it with your private order link.
        </li>
        <li>
          <strong>Who sees it:</strong> only the shop you ordered from (and SiteGenie, to run the service). We never sell it or
          use it for advertising.
        </li>
        <li>Payments by UPI go straight from you to the shop. SiteGenie never sees or holds that money.</li>
        <li>
          We count website visits per day to show the shop how many people visited. We don’t use cookies for this or store
          anything that identifies you.
        </li>
      </ul>

      <h2>Services that help us</h2>
      <p>We use these providers to run SiteGenie. They process data only to provide their service to us:</p>
      <ul>
        <li>Vercel (app hosting and photo storage)</li>
        <li>Cloudflare (database and shop website hosting)</li>
        <li>Google Gemini (speech to text, planning websites, translations)</li>
        <li>Unsplash and Pixabay (sample photos; we send them only search words)</li>
        <li>Meta WhatsApp (login codes, if you use WhatsApp login)</li>
        <li>Brevo (order and renewal emails, if you add an email address)</li>
      </ul>

      <h2>How long we keep it</h2>
      <ul>
        <li>Shop websites and their orders: while the shop uses SiteGenie, then deleted when the shop asks or the account is removed.</li>
        <li>Photos never used on a website: deleted after 2 days.</li>
        <li>Login codes: deleted after they expire.</li>
        <li>Weekly backups: kept privately to recover from mistakes.</li>
      </ul>

      <h2>Your choices</h2>
      <ul>
        <li>Shop owners can change or remove their details at any time from their edit screen.</li>
        <li>
          Anyone can ask us to see, correct or delete their information
          {email ? (
            <>
              {" "}
              by writing to <a href={`mailto:${email}`}>{email}</a>.
            </>
          ) : (
            " by contacting the SiteGenie team."
          )}
        </li>
        <li>Customers can also ask the shop directly on WhatsApp.</li>
      </ul>

      <h2>Children</h2>
      <p>SiteGenie is for businesses and is not meant for children under 18.</p>

      <h2>Changes</h2>
      <p>If we change this policy we’ll update the date above. Big changes will be shown on the SiteGenie home page.</p>
    </article>
  );
}
