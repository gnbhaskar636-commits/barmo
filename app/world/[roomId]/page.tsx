import { Suspense } from "react";
import WorldView from "@/components/WorldView";
import { isRoomId, type RoomId } from "@/lib/world/rooms";

interface PageProps {
  params: Promise<{ roomId: string }>;
}

export default async function Page({ params }: PageProps) {
  const resolvedParams = await params;
  const rawId = resolvedParams?.roomId;
  const roomId: RoomId = isRoomId(rawId) ? rawId : "lounge";

  return (
    <Suspense>
      <WorldView initialRoom={roomId} />
    </Suspense>
  );
}
