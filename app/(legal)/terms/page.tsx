import type { Metadata } from "next";
import { GRACE_DAYS, PRICES, YEARLY } from "@/lib/prices";

export const metadata: Metadata = { title: "Terms · SiteGenie" };

const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default function TermsPage() {
  const email = process.env.SUPPORT_EMAIL;
  return (
    <article>
      <h1>Terms of use</h1>
      <p className="hint">Last updated: 22 October 2026</p>

      <p>These terms are an agreement between you and SiteGenie. By making or publishing a website with SiteGenie, you agree to them.</p>

      <h2>What SiteGenie does</h2>
      <p>
        You describe your shop by voice (and photos if you like). SiteGenie builds a website you can review, edit and publish.
        Customers can order from it on WhatsApp, or with a cart on dynamic websites.
      </p>

      <h2>Your responsibilities</h2>
      <ul>
        <li>Check everything before publishing. Prices and details come from what you said, and speech can be misheard.</li>
        <li>Only sell legal goods and services, and only upload photos and videos you have the right to use.</li>
        <li>You are responsible for your products, prices, deliveries, refunds and any taxes, and for dealing with your customers.</li>
        <li>Keep your private edit link safe. Anyone with it can change your website.</li>
      </ul>

      <h2>Prices</h2>
      <ul>
        <li>
          <strong>Static website:</strong> {rupees(PRICES.static)} one-time.
        </li>
        <li>
          <strong>Dynamic website (cart and online orders):</strong> {rupees(PRICES.static)} setup plus {rupees(YEARLY)} a year.
          If the yearly plan isn’t renewed, online orders keep working for {GRACE_DAYS} days and then pause; your website
          stays online and customers can still order on WhatsApp.
        </li>
        <li>Custom domains, if offered, are paid separately.</li>
        <li>Prices may change for new purchases; we won’t change what you already paid for.</li>
      </ul>

      <h2>Payments between you and your customers</h2>
      <p>
        UPI and other payments go directly from your customers to you. SiteGenie is not a party to those payments and cannot
        refund or reverse them.
      </p>

      <h2>Photos and AI</h2>
      <ul>
        <li>Where you add no photos, SiteGenie may show sample photos from Unsplash or Pixabay, labelled “Sample photo”. They are not pictures of your actual products; replace them with your own when you can.</li>
        <li>Wording on your website is suggested by AI from what you said. You can edit all of it.</li>
      </ul>

      <h2>Fair use</h2>
      <p>To keep SiteGenie working for everyone, there are limits on how often you can build, translate or upload. Don’t misuse the service, attack it, or use it to send spam.</p>

      <h2>Availability</h2>
      <p>
        We work to keep SiteGenie running, but it is provided as it is, and we can’t promise it will never be interrupted. To
        the extent the law allows, SiteGenie isn’t liable for lost sales or indirect losses; our total liability is limited to
        what you paid us in the last 12 months.
      </p>

      <h2>Ending</h2>
      <p>
        You can stop using SiteGenie at any time and ask us to delete your website. We may suspend websites that break these
        terms or the law.
      </p>

      <h2>Law</h2>
      <p>These terms follow the laws of India.</p>

      {email && (
        <p>
          Questions? Write to <a href={`mailto:${email}`}>{email}</a>.
        </p>
      )}
    </article>
  );
}
