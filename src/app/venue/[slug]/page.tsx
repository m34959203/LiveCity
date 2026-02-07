import { Header } from "@/components/layout/header";
import { VenueDetail } from "@/components/venues/venue-detail";

interface VenuePageProps {
  params: Promise<{ slug: string }>;
}

export default async function VenuePage({ params }: VenuePageProps) {
  const { slug } = await params;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <VenueDetail slug={slug} />
      </main>
    </div>
  );
}
