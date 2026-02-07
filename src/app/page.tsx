import { Header } from "@/components/layout/header";
import { SearchBar } from "@/components/search/search-bar";
import { MapView } from "@/components/map/map-view";
import { VenueList } from "@/components/venues/venue-list";

export default function HomePage() {
  return (
    <div className="flex h-screen flex-col">
      <Header />
      <main className="flex flex-1 overflow-hidden">
        {/* Left panel: search + venue list */}
        <aside className="flex w-96 flex-col border-r border-border bg-card">
          <div className="border-b border-border p-4">
            <SearchBar />
          </div>
          <div className="flex-1 overflow-y-auto">
            <VenueList />
          </div>
        </aside>

        {/* Right panel: map */}
        <div className="flex-1">
          <MapView />
        </div>
      </main>
    </div>
  );
}
