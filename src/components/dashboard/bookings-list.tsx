"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/types/database";

interface Booking {
  id: string;
  status: BookingStatus;
  requested_date: string;
  requested_time: string | null;
  party_size: number;
  message: string | null;
  created_at: string;
  venues?: { name: string; slug: string };
}

const statusLabels: Record<BookingStatus, string> = {
  pending: "Ожидает",
  accepted: "Принята",
  rejected: "Отклонена",
  cancelled: "Отменена",
};

const statusColors: Record<BookingStatus, string> = {
  pending: "bg-yellow-500/10 text-yellow-500",
  accepted: "bg-emerald-500/10 text-emerald-500",
  rejected: "bg-red-500/10 text-red-500",
  cancelled: "bg-muted text-muted-foreground",
};

export function BookingsList() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await fetch("/api/bookings");
        if (res.ok) {
          const data = await res.json();
          setBookings(data.bookings ?? []);
        }
      } catch (err) {
        console.error("Failed to fetch bookings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  const updateStatus = async (id: string, status: BookingStatus) => {
    const res = await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (res.ok) {
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status } : b))
      );
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border p-4">
        <CalendarCheck className="h-5 w-5 text-primary" />
        <h2 className="font-semibold">Заявки на бронь</h2>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="p-4 text-center text-sm text-muted-foreground">
          Заявок пока нет
        </div>
      ) : (
        <div className="divide-y divide-border">
          {bookings.map((booking) => (
            <div key={booking.id} className="flex items-center gap-3 p-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {booking.requested_date}
                    {booking.requested_time && ` в ${booking.requested_time}`}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium",
                      statusColors[booking.status]
                    )}
                  >
                    {statusLabels[booking.status]}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {booking.party_size} чел.
                  {booking.message && ` — ${booking.message}`}
                </p>
              </div>

              {booking.status === "pending" && (
                <div className="flex gap-1">
                  <button
                    onClick={() => updateStatus(booking.id, "accepted")}
                    className="rounded-lg bg-emerald-600 p-1.5 text-white transition-colors hover:bg-emerald-700"
                    title="Принять"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => updateStatus(booking.id, "rejected")}
                    className="rounded-lg bg-red-600 p-1.5 text-white transition-colors hover:bg-red-700"
                    title="Отклонить"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
