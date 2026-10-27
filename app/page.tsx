import {
  ArrowDownRight,
  ArrowRight,
  Check,
  CircleHelp,
  Compass,
  FileSearch,
  Layers3,
  MapPin,
  ShieldCheck,
  Sparkles
} from "lucide-react";

const pillars = [
  {
    icon: FileSearch,
    number: "01",
    title: "Evidence, not assumptions",
    description:
      "Every finding should lead back to a named source, a timestamp, and a clear limitation."
  },
  {
    icon: Layers3,
    number: "02",
    title: "One comparable picture",
    description:
      "Bring location context together without pretending that missing data is a clean bill of health."
  },
  {
    icon: CircleHelp,
    number: "03",
    title: "Know what you don't know",
    description:
      "See the unanswered questions worth checking before you commit to a property."
  }
];

const reportRows = [
  { label: "Nearby essentials", status: "Ready to investigate", kind: "neutral" },
  { label: "Environmental context", status: "Source coverage required", kind: "warning" },
  { label: "Hazard history", status: "Must verify by location", kind: "warning" },
  { label: "Data freshness", status: "Shown per source", kind: "neutral" }
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f7f2] text-[#182720]">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <a href="/" className="flex items-center gap-3" aria-label="Infracis home">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#205b49] text-white">
            <Compass size={22} strokeWidth={1.8} />
          </span>
          <span>
            <span className="block text-lg font-semibold tracking-tight">infracis</span>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-[#758078]">Location intelligence</span>
          </span>
        </a>
        <nav className="hidden items-center gap-8 text-sm text-[#536159] md:flex" aria-label="Main navigation">
          <a href="#approach" className="transition hover:text-[#205b49]">Our approach</a>
          <a href="#sample" className="transition hover:text-[#205b49]">Report preview</a>
          <a href="#principles" className="transition hover:text-[#205b49]">Principles</a>
        </nav>
        <a href="#sample" className="rounded-full border border-[#d7ded7] bg-white px-4 py-2.5 text-sm font-medium transition hover:border-[#205b49]">
          Explore the concept <ArrowRight className="ml-1 inline" size={15} />
        </a>
      </header>

      <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-12 sm:px-8 md:pt-20 lg:grid-cols-[1.03fr_.97fr] lg:px-12 lg:pb-28">
        <div className="relative z-10">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#dce6dd] bg-white/80 px-3.5 py-2 text-xs font-medium text-[#386b55]">
            <span className="h-2 w-2 rounded-full bg-[#4b956a]" />
            A more thoughtful way to choose where to live
          </div>
          <h1 className="max-w-2xl text-5xl font-medium leading-[1.04] tracking-[-0.055em] sm:text-6xl lg:text-[4.5rem]">
            Know the place
            <br />
            <span className="font-serif italic text-[#47745e]">before</span> the property.
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-[#657168] sm:text-lg sm:leading-8">
            A property listing tells you what you can buy. Infracis is being built to help you investigate the location, compare the trade-offs, and see what still needs checking.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <a href="#sample" className="rounded-full bg-[#205b49] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#174737]">
              See the report concept <ArrowRight className="ml-2 inline" size={16} />
            </a>
            <a href="#principles" className="rounded-full border border-[#d9dfd8] bg-white px-6 py-3.5 text-sm font-semibold text-[#34453b] transition hover:border-[#a6b8a8]">
              How we build trust
            </a>
          </div>
          <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs text-[#758078]">
            <span className="flex items-center gap-2"><ShieldCheck size={15} /> Evidence-first by design</span>
            <span className="flex items-center gap-2"><CircleHelp size={15} /> Unknowns stay visible</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <div className="absolute -right-12 -top-12 h-52 w-52 rounded-full bg-[#dce9dc] blur-3xl" />
          <div className="absolute -bottom-10 -left-8 h-48 w-48 rounded-full bg-[#eee7d5] blur-3xl" />
          <div className="relative rounded-[2rem] border border-white bg-white/90 p-3 shadow-[0_28px_90px_-45px_rgba(27,64,45,0.28)] backdrop-blur">
            <div className="rounded-[1.5rem] bg-[#edf2e9] p-5 sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6b7c6c]">Location report / concept</p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight">Look beyond the listing</h2>
                  <p className="mt-1 text-xs text-[#718073]">Illustrative interface · no live location data</p>
                </div>
                <span className="rounded-xl bg-white p-3 text-[#35694f]"><MapPin size={20} /></span>
              </div>

              <div className="map-grid relative mt-6 h-48 overflow-hidden rounded-2xl border border-[#d8e2d5] bg-[#e3ebdf]">
                <div className="absolute left-[10%] top-[18%] h-20 w-32 rotate-12 rounded-[40%] bg-[#c6ddc4]" />
                <div className="absolute right-[8%] top-[10%] h-16 w-24 -rotate-12 rounded-[40%] bg-[#c6ddc4]" />
                <div className="absolute bottom-[7%] left-[30%] h-14 w-32 rotate-6 rounded-[40%] bg-[#c6ddc4]" />
                <div className="absolute left-[-8%] top-[47%] h-4 w-[120%] rotate-[-13deg] bg-white/90" />
                <div className="absolute left-[46%] top-[-20%] h-[140%] w-4 rotate-[18deg] bg-white/90" />
                <div className="absolute left-[12%] top-[28%] h-2 w-[75%] rotate-[25deg] rounded-full bg-[#9cb9a3]" />
                <div className="absolute left-[23%] top-[27%] grid h-9 w-9 place-items-center rounded-full border-4 border-white bg-[#205b49] text-white shadow-md"><MapPin size={16} /></div>
                <div className="absolute bottom-4 right-4 rounded-xl border border-white/80 bg-white/90 px-3 py-2 text-[10px] font-medium text-[#54695a] shadow-sm">
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#7c9b78]" />Illustrative map
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs text-[#7a867d]">Evidence coverage</p>
                  <p className="mt-2 text-lg font-semibold">To be measured</p>
                  <p className="mt-1 text-[11px] text-[#7a867d]">By source and geography</p>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs text-[#7a867d]">Risk score</p>
                  <p className="mt-2 text-lg font-semibold">Not assumed</p>
                  <p className="mt-1 text-[11px] text-[#7a867d]">No unsupported numbers</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3 rounded-2xl border border-[#dce5d9] bg-white/70 p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f2ead7] text-[#826c36]"><CircleHelp size={18} /></span>
                <div>
                  <p className="text-sm font-medium">The missing information matters, too.</p>
                  <p className="mt-1 text-xs leading-5 text-[#718073]">A source gap is shown as unknown—not quietly scored as safe.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-5 -right-2 hidden items-center gap-2 rounded-2xl border border-[#e4e8df] bg-white px-4 py-3 text-xs font-medium shadow-lg sm:flex">
            <Sparkles size={15} className="text-[#47745e]" /> AI explains. Evidence supports.
          </div>
        </div>
      </section>

      <section id="approach" className="border-y border-[#e6e8e0] bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#598069]">A different question</p>
            <h2 className="mt-4 text-3xl font-medium tracking-[-0.04em] sm:text-4xl">Not “what’s nearby?”<br />But “what should I know?”</h2>
            <p className="mt-4 leading-7 text-[#6d786f]">The goal is not to produce the most confident score. It is to make the decision easier to inspect.</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {pillars.map(({ icon: Icon, number, title, description }) => (
              <article key={number} className="rounded-3xl border border-[#e5e9e2] bg-[#fbfcf9] p-6 transition hover:-translate-y-1 hover:border-[#c6d7c8] hover:shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e8f0e6] text-[#35694f]"><Icon size={21} /></span>
                  <span className="text-xs font-medium tracking-[0.15em] text-[#a2aaa1]">{number}</span>
                </div>
                <h3 className="mt-7 text-lg font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#6d786f]">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="sample" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#598069]">Inside a report</p>
            <h2 className="mt-4 text-3xl font-medium tracking-[-0.04em] sm:text-4xl">A clearer picture.<br />Without false certainty.</h2>
            <p className="mt-4 leading-7 text-[#6d786f]">This is a product preview, not a live assessment. Real findings will appear only after their data sources and calculations are connected and tested.</p>
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#e3e8de] bg-white p-4">
              <ShieldCheck className="mt-0.5 shrink-0 text-[#47745e]" size={20} />
              <p className="text-sm leading-6 text-[#5d6c60]">Every important statement should be traceable to evidence—or clearly marked as unknown.</p>
            </div>
          </div>
          <div className="rounded-[2rem] border border-[#e0e5dc] bg-white p-5 shadow-[0_20px_70px_-50px_rgba(27,64,45,0.3)] sm:p-7">
            <div className="flex items-center justify-between border-b border-[#edf0e9] pb-5">
              <div>
                <p className="text-xs text-[#849087]">LOCATION DUE-DILIGENCE</p>
                <h3 className="mt-1 text-lg font-semibold">Evidence checklist</h3>
              </div>
              <span className="rounded-full bg-[#f4f0e4] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#8b7540]">Preview</span>
            </div>
            <div className="divide-y divide-[#edf0e9]">
              {reportRows.map((row) => (
                <div key={row.label} className="flex items-center gap-3 py-4">
                  <span className={row.kind === "warning" ? "grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f6f0e1] text-[#927943]" : "grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e9f2e8] text-[#3c7451]"}>
                    {row.kind === "warning" ? <CircleHelp size={17} /> : <Check size={17} />}
                  </span>
                  <span className="flex-1 text-sm font-medium">{row.label}</span>
                  <span className="max-w-[145px] text-right text-xs leading-5 text-[#849087]">{row.status}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl bg-[#f6f7f2] p-4">
              <p className="text-sm font-semibold">Next step</p>
              <p className="mt-1 text-sm leading-6 text-[#6d786f]">Connect and validate source data for a specific pilot area before producing a real report.</p>
              <ArrowDownRight size={18} className="mt-3 text-[#47745e]" />
            </div>
          </div>
        </div>
      </section>

      <section id="principles" className="bg-[#1f4f40] py-16 text-white sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-2 lg:px-12">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#b8d3bf]">Built around trust</p>
            <h2 className="mt-4 max-w-xl text-3xl font-medium tracking-[-0.04em] sm:text-4xl">Confidence should come from evidence, not design.</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["Sources stay visible", "Findings show where the information came from."],
              ["Unknown means unknown", "Missing coverage is never treated as proof of safety."],
              ["AI has boundaries", "Models explain evidence; deterministic code calculates metrics."],
              ["Limitations are explicit", "Historical, estimated, and incomplete data are labeled."]
            ].map(([title, description]) => (
              <div key={title} className="rounded-2xl border border-white/15 bg-white/[0.06] p-5">
                <Check size={18} className="text-[#b8d3bf]" />
                <h3 className="mt-4 text-sm font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/65">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-xs text-[#7a867d] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <span>© {new Date().getFullYear()} Infracis · A location due-diligence concept</span>
        <span>Prototype shell · Live data integrations not yet connected</span>
      </footer>
    </main>
  );
}
