import Link from "next/link";

const providers = [
  {
    name: "OpenStreetMap Nominatim",
    purpose: "Resolves the location text you submit into a place label and coordinates.",
    href: "https://operations.osmfoundation.org/policies/nominatim/"
  },
  {
    name: "Open-Meteo",
    purpose: "Provides weather and air-quality model output for the resolved coordinates.",
    href: "https://open-meteo.com/en/terms"
  },
  {
    name: "OpenStreetMap Overpass",
    purpose: "Returns mapped amenities around the selected location through a bounded best-effort public Overpass endpoint list, unless an operator configures alternatives. Public service availability is not guaranteed; mapped features may be incomplete.",
    href: "https://wiki.openstreetmap.org/wiki/Overpass_API"
  }
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#f5f6ef] px-4 py-8 text-[#20352a] sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="inline-flex rounded-lg text-sm font-semibold text-[#174b38] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d78b21]">
          ← Back to Infracis
        </Link>

        <header className="mt-8 border-b border-[#dce4d8] pb-7">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a56a12]">Transparency</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[#153a2b] sm:text-4xl">Data & privacy</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#53675a] sm:text-base">
            Infracis investigates a location using public data sources. This page explains the current source-code behavior; it is not a substitute for an approved legal privacy notice for a future hosted service.
          </p>
        </header>

        <div className="space-y-8 py-8">
          <section>
            <h2 className="text-lg font-bold text-[#153a2b]">Information you submit</h2>
            <p className="mt-2 text-sm leading-7 text-[#53675a]">
              When you investigate a place, the location text or selected coordinates are sent to the Infracis server route to retrieve relevant location data. A location can be sensitive: submit only what is needed for your investigation, and avoid adding names, phone numbers, apartment access details, or other personal information to the search field.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#153a2b]">External data providers</h2>
            <p className="mt-2 text-sm leading-7 text-[#53675a]">
              To produce a report, Infracis sends the necessary query or coordinates to the providers below when the relevant source is enabled. Their own terms, privacy practices, availability, and data policies apply. Provider failures and disabled sources are shown as unavailable rather than being replaced with invented data.
            </p>
            <ul className="mt-4 space-y-3">
              {providers.map((provider) => (
                <li key={provider.name} className="rounded-2xl border border-[#dce4d8] bg-white p-4">
                  <a href={provider.href} target="_blank" rel="noreferrer" className="font-semibold text-[#174b38] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d78b21]">
                    {provider.name}
                  </a>
                  <p className="mt-1 text-sm leading-6 text-[#53675a]">{provider.purpose}</p>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#153a2b]">Temporary server-side cache and request limits</h2>
            <p className="mt-2 text-sm leading-7 text-[#53675a]">
              When the shared Redis service is configured, Infracis temporarily caches provider results to reduce repeat requests and comply with provider limits. The cache key for geocoding includes the normalized location text and its result may be retained for up to 24 hours; weather results are cached for up to 5 minutes, air-quality results for up to 10 minutes, and mapped amenities for up to 1 hour. In local development, geocoding and amenity results can also be cached in per-process memory for up to 24 hours and 1 hour respectively. These are operational caches, not saved reports or user accounts.
            </p>
            <p className="mt-2 text-sm leading-7 text-[#53675a]">
              The analysis route also keeps a per-instance in-memory copy of a generated report for up to 15 minutes to reduce repeat provider calls. This cache is volatile and is not a saved-report feature, but the query and report data remain in server memory during that window.
            </p>
            <p className="mt-2 text-sm leading-7 text-[#53675a]">
              The shared rate limiter also temporarily stores a client-IP-derived request counter and a global geocoding-slot timestamp. Avoid putting names or other personal information into location searches. Production requests fail closed if the shared rate limiter is not configured or cannot be reached. The eventual hosting operator must verify access controls, retention, and deletion behavior for the configured cache service before public launch.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#153a2b]">Saved reports and exports</h2>
            <p className="mt-2 text-sm leading-7 text-[#53675a]">
              The current product stores saved reports in this browser on this device using browser storage. Cloud sync, user accounts, and server-side report persistence are not available. Anyone with access to this browser profile may be able to access those saved reports. You can delete saved reports inside Infracis or clear this site&apos;s browser storage.
            </p>
            <p className="mt-2 text-sm leading-7 text-[#53675a]">
              Exporting a report downloads a JSON file to your device. After export, that file is under your device&apos;s storage and sharing controls.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#153a2b]">Limits and operational transparency</h2>
            <p className="mt-2 text-sm leading-7 text-[#53675a]">
              Weather and air-quality values are model estimates, not on-site sensor readings. OpenStreetMap features are community-mapped and may be missing or outdated. A missing mapped feature does not prove that a service is absent.
            </p>
            <p className="mt-2 text-sm leading-7 text-[#53675a]">
              Infracis has not been deployed as part of this work. Before any public launch, the operator must verify the actual hosting environment&apos;s access logs, telemetry, backups, retention, and deletion settings and publish a final policy that reflects those settings.
            </p>
          </section>

          <section className="rounded-2xl border border-[#dce4d8] bg-[#edf3e9] p-5">
            <h2 className="text-base font-bold text-[#153a2b]">Questions or corrections</h2>
            <p className="mt-2 text-sm leading-6 text-[#53675a]">
              For source-code questions or to report a data-transparency issue, use the project repository.
            </p>
            <a href="https://github.com/kaustubhdua/infracis/issues" target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-xl bg-[#174b38] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#103728] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d78b21] focus-visible:ring-offset-2">
              Open a GitHub issue
            </a>
          </section>
        </div>
      </div>
    </main>
  );
}
