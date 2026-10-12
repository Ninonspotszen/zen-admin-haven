import { useState, type FormEvent, type ReactNode } from "react";
import { Zap, Mic, Globe, RefreshCw, TrendingUp, AlertCircle, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { HomeHeader, HomeFooter } from "@/components/home-chrome";
import { supabase } from "@/integrations/supabase/client";
import hero from "@/assets/pro-hero.jpg";
import imgHeb from "@/assets/pro-hebergements.jpg";
import imgEnt from "@/assets/pro-entreprises.jpg";
import imgEco from "@/assets/pro-ecoles.jpg";
import imgSan from "@/assets/pro-sante.jpg";
import imgCol from "@/assets/pro-collectivites.jpg";
import pwaRecommended from "@/assets/pwa-recommande.png";
import pwaPlayer from "@/assets/pwa-player.png";

type FieldDef = { name: "nom" | "email" | "etablissement" | "type_structure" | "taille" | "message"; labelKey: string; type?: "text" | "email" | "select" | "textarea"; optionsKey?: string };
type Sector = { id: string; image: string; legal?: boolean; fields: FieldDef[] };

const sectorImages: Record<string, string> = { hebergements: imgHeb, entreprises: imgEnt, ecoles: imgEco, sante: imgSan, collectivites: imgCol };
const msgField: FieldDef = { name: "message", labelKey: "pro.form.field.message", type: "textarea" };

const sectors: Sector[] = [
  { id: "hebergements", image: imgHeb,
    fields: [{ name: "etablissement", labelKey: "pro.sector.hebergements.fields.etablissement" }, { name: "type_structure", labelKey: "pro.sector.hebergements.fields.type_structure", type: "select", optionsKey: "pro.sector.hebergements.options" }, { name: "taille", labelKey: "pro.sector.hebergements.fields.taille" }, msgField] },
  { id: "entreprises", image: imgEnt,
    fields: [{ name: "etablissement", labelKey: "pro.sector.entreprises.fields.etablissement" }, { name: "nom", labelKey: "pro.form.field.fonction" }, { name: "email", labelKey: "pro.sector.entreprises.fields.email", type: "email" }, { name: "taille", labelKey: "pro.sector.entreprises.fields.taille", type: "select", optionsKey: "pro.sector.entreprises.options" }, msgField] },
  { id: "ecoles", image: imgEco,
    fields: [{ name: "etablissement", labelKey: "pro.sector.ecoles.fields.etablissement" }, { name: "nom", labelKey: "pro.form.field.fonction" }, { name: "email", labelKey: "pro.sector.ecoles.fields.email", type: "email" }, { name: "taille", labelKey: "pro.sector.ecoles.fields.taille", type: "select", optionsKey: "pro.sector.ecoles.options" }, msgField] },
  { id: "sante", image: imgSan, legal: true,
    fields: [{ name: "etablissement", labelKey: "pro.sector.sante.fields.etablissement" }, { name: "nom", labelKey: "pro.form.field.fonction" }, { name: "email", labelKey: "pro.sector.sante.fields.email", type: "email" }, { name: "type_structure", labelKey: "pro.sector.sante.fields.type_structure", type: "select", optionsKey: "pro.sector.sante.options" }, { name: "taille", labelKey: "pro.sector.sante.fields.taille" }, msgField] },
  { id: "collectivites", image: imgCol,
    fields: [{ name: "etablissement", labelKey: "pro.sector.collectivites.fields.etablissement" }, { name: "nom", labelKey: "pro.form.field.fonction" }, { name: "email", labelKey: "pro.sector.collectivites.fields.email", type: "email" }, { name: "type_structure", labelKey: "pro.sector.collectivites.fields.type_structure", type: "select", optionsKey: "pro.sector.collectivites.options" }, { name: "taille", labelKey: "pro.sector.collectivites.fields.taille" }, msgField] },
];

const generalFields: FieldDef[] = [
  { name: "nom", labelKey: "pro.form.field.nom" },
  { name: "email", labelKey: "pro.form.field.email", type: "email" },
  { name: "type_structure", labelKey: "pro.form.field.etablissement", type: "select", optionsKey: "pro.form.generalOptions" },
  { name: "etablissement", labelKey: "pro.form.field.etablissement" },
  { name: "taille", labelKey: "pro.form.field.taille" },
  { name: "message", labelKey: "pro.form.field.messageLibre", type: "textarea" },
];

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

function Heading({ eyebrow, children }: { eyebrow: string; children: ReactNode }) {
  return <div className="pr-heading"><p className="pr-eyebrow">{eyebrow}</p><h2>{children}</h2></div>;
}

function ContactForm({ secteur, title, fields, cta, large = false }: { secteur: string; title: string; fields: FieldDef[]; cta: string; large?: boolean }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const { t } = useTranslation();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const row: Record<string, string | null> = { secteur };
    for (const f of fields) {
      const v = String(fd.get(f.name) ?? "").trim();
      row[f.name] = row[f.name] ? `${row[f.name]} · ${v}` : v || null;
    }
    setState("sending");
    const { error } = await supabase.from("contact_requests").insert(row as never);
    setState(error ? "error" : "done");
  }
  return (
    <div className={`pr-form-card ${large ? "pr-form-large" : ""}`}>
      {state === "done" ? <p className="pr-success" role="status">{t("pro.form.success")}</p> : (
        <form onSubmit={submit}>
          <h3 className="pr-form-title">{title}</h3>
          <p className="pr-form-note">{large ? t("pro.form.note") : t("pro.form.notePersonal")}</p>
          {fields.map(f => {
            const id = `${secteur}-${f.name}-${f.labelKey.length}`;
            const label = t(f.labelKey);
            const options = f.optionsKey ? (t(f.optionsKey, { returnObjects: true }) as string[]) : undefined;
            return <label key={id} htmlFor={id} className="pr-field"><span>{label}</span>
              {f.type === "textarea" ? <textarea id={id} name={f.name} maxLength={5000} />
                : f.type === "select" ? <select id={id} name={f.name} defaultValue=""><option value="" disabled>{t("pro.form.select.placeholder")}</option>{options?.map(o => <option key={o}>{o}</option>)}</select>
                : <input id={id} name={f.name} type={f.type ?? "text"} maxLength={200} required={f.type === "email"} />}
            </label>;
          })}
          {state === "error" && <p className="pr-error">{t("pro.form.error")}</p>}
          <button className="pr-btn pr-btn-full" type="submit" disabled={state === "sending"}>{cta}</button>
        </form>
      )}
    </div>
  );
}

export function ProfessionnelsPage() {
  const [active, setActive] = useState("hebergements");
  const s = sectors.find(x => x.id === active)!;
  const { t } = useTranslation();
  const sList = t(`pro.sector.${s.id}.list`, { returnObjects: true }) as string[];
  return <div className="sz-home sz-pro"><HomeHeader anchorPrefix="/" /><main>
    <section className="pr-hero">
      <img className="pr-hero-img" src={hero} alt={t("pro.hero.img.alt")} width={1920} height={1088} />
      <div className="pr-hero-shade" />
      <div className="pr-hero-inner">
        <p className="pr-eyebrow">{t("pro.hero.eyebrow")}</p>
        <h1>{t("pro.hero.h1")}</h1>
        <p className="pr-hero-copy">{t("pro.hero.copy")}</p>
        <div className="pr-hero-ctas"><button className="pr-btn" onClick={() => scrollTo("offre")}>{t("pro.hero.cta.offer")}</button><button className="pr-link" onClick={() => scrollTo("devis")}>{t("pro.hero.cta.quote")}</button></div>
      </div>
    </section>

    <section className="pr-section">
      <div className="pr-inner pr-center">
        <p className="pr-eyebrow">{t("pro.why.eyebrow")}</p>
        <h2 className="pr-promise">{t("pro.why.h2")}</h2>
        <p className="pr-body">{t("pro.why.body")}</p>
        <p className="pr-quote">{t("pro.why.quote")}</p>
        <div className="pr-grid3">
          {[Zap, Mic, Globe].map((Icon, i) => <div className="pr-card" key={i}><Icon aria-hidden className="pr-icon" /><h3>{t(`pro.why.card${i}.title`)}</h3><p>{t(`pro.why.card${i}.body`)}</p></div>)}
        </div>
      </div>
    </section>

    <section className="pr-section pr-alt">
      <div className="pr-inner">
        <Heading eyebrow={t("pro.steps.eyebrow")}>{t("pro.steps.h2")}</Heading>
        <ol className="pr-timeline">{[0, 1, 2, 3, 4, 5].map(i => <li key={i}><span className="pr-num">{String(i + 1).padStart(2, "0")}</span><h3>{t(`pro.steps.items.${i}.title`)}</h3><p>{t(`pro.steps.items.${i}.body`)}</p></li>)}</ol>
        <div className="pr-center"><button className="pr-btn" onClick={() => scrollTo("devis")}>{t("pro.steps.cta")}</button><p className="pr-note">{t("pro.steps.note")}</p></div>
      </div>
    </section>

    <section className="pr-section pr-dark">
      <div className="pr-inner pr-center">
        <p className="pr-eyebrow">{t("pro.screens.eyebrow")}</p>
        <h2>{t("pro.screens.h2")}</h2>
        <p className="pr-dark-body">{t("pro.screens.body")}</p>
        <div className="pr-phones">
          <div className="pr-phone"><img src={pwaRecommended} alt={t("pro.screens.img0.alt")} loading="lazy" /></div>
          <div className="pr-phone"><img src={pwaPlayer} alt={t("pro.screens.img1.alt")} loading="lazy" /></div>
        </div>
        <button className="pr-link" onClick={() => scrollTo("devis")}>{t("pro.screens.cta")}</button>
      </div>
    </section>

    <section className="pr-section" id="offre">
      <div className="pr-inner">
        <Heading eyebrow={t("pro.offers.eyebrow")}>{t("pro.offers.h2")}</Heading>
        <div className="pr-tabs" role="tablist">{sectors.map(x => <button key={x.id} role="tab" aria-selected={x.id === active} className={x.id === active ? "is-active" : ""} onClick={() => setActive(x.id)}>{t(`pro.sector.${x.id}.tab`)}</button>)}</div>
        <div className="pr-panel" role="tabpanel">
          <div className="pr-panel-text">
            <img className="pr-panel-img" src={s.image} alt="" loading="lazy" width={1024} height={768} />
            <span className="pr-chip">{t(`pro.sector.${s.id}.chip`)}</span>
            <p className="pr-subchip">{t(`pro.sector.${s.id}.sub`)}</p>
            <h3 className="pr-h3">{t(`pro.sector.${s.id}.title`)}</h3>
            <p className="pr-body-left">{t(`pro.sector.${s.id}.body`)}</p>
            {s.legal && <div className="pr-legal"><AlertCircle aria-hidden /><p>{t(`pro.sector.${s.id}.legal`)}</p></div>}
            <ul className="pr-checks">{sList.map(l => <li key={l}><Check aria-hidden />{l}</li>)}</ul>
            <a className="pr-inline-link" href={`#form-${s.id}`}>{t("pro.sector.inlineCta")}</a>
          </div>
          <div id={`form-${s.id}`}><ContactForm key={s.id} secteur={s.id} title={t(`pro.sector.${s.id}.formTitle`)} fields={s.fields} cta={t("pro.form.ctaStart")} /></div>
        </div>
      </div>
    </section>

    <section className="pr-section pr-alt">
      <div className="pr-inner">
        <Heading eyebrow={t("pro.testi.eyebrow")}>{t("pro.testi.h2")}</Heading>
        <div className="pr-grid2">{[0, 1].map(i => <figure className="pr-card" key={i}><blockquote className="pr-testi">{t("pro.testi.placeholder")}</blockquote><span className="pr-sep" /><figcaption><strong>{t("pro.testi.name")}</strong><span>{t(`pro.testi.role${i}`)}</span></figcaption></figure>)}</div>
      </div>
    </section>

    {/* <SectionCarteSpots /> */}
    {/* À réactiver au lancement — ne pas intégrer maintenant */}

    <section className="pr-section pr-alt">
      <div className="pr-inner">
        <Heading eyebrow={t("pro.why2.eyebrow")}>{t("pro.why2.h2")}</Heading>
        <div className="pr-grid2">
          {[Zap, Mic, RefreshCw, TrendingUp].map((I, i) => <div className="pr-card" key={i}><I aria-hidden className="pr-icon" /><h3>{t(`pro.why2.card${i}.title`)}</h3><p>{t(`pro.why2.card${i}.body`)}</p></div>)}
        </div>
      </div>
    </section>

    <section className="pr-section pr-dark" id="devis">
      <div className="pr-inner pr-center">
        <p className="pr-eyebrow">{t("pro.quote.eyebrow")}</p>
        <h2>{t("pro.quote.h2")}</h2>
        <p className="pr-dark-body">{t("pro.quote.body")}</p>
        <ContactForm secteur="general" title={t("pro.quote.formTitle")} fields={generalFields} cta={t("pro.form.cta")} large />
        <p className="pr-alt-contact">{t("pro.form.altContact")}</p>
      </div>
    </section>
  </main><HomeFooter /></div>;
}
