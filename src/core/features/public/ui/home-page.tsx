import { publicProductConfig } from "../../../app/mounts/public-config";
import { Hero } from "./home/Hero";
import { Closing, Free, Product, Score, TryIt } from "./home/Sections";
import { SiteFooter } from "./home/SiteFooter";
import { SiteHeader } from "./home/SiteHeader";
import "./home/hero.css";
import "./home/sections.css";
import "./home/drawings.css";
import "./home/rest.css";
import "./home/rest-art.css";

export function HomePage() {
  const { name, imageUrl, description, showPoweredByCredit } = publicProductConfig;
  return (
    <div className="ob-site">
      <SiteHeader name={name} imageUrl={imageUrl} />
      <main data-testid="identity-plate">
        <Hero description={description} />
        <Free />
        <Score />
        <Product />
        <TryIt />
        <Closing />
      </main>
      <SiteFooter name={name} imageUrl={imageUrl} showCredit={showPoweredByCredit} />
    </div>
  );
}
