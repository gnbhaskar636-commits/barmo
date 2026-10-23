"use client";

import { useRouter } from "next/navigation";
import AppShell from "@/components/app/AppShell";
import { Dot } from "@/components/app/Avatar";
import { useHub } from "@/components/HubProvider";
import { timeAgo } from "@/lib/social/store";

export default function AlertsPage() {
  const router = useRouter();
  const h = useHub();
  return (
    <AppShell>
      <div className="pagehead">
        <h1>Notifications</h1>
        <div className="row tight">
          <button className="btn g sm" onClick={h.enableAlerts}>Enable browser alerts</button>
          <button className="btn g sm" onClick={h.markNoticesRead}>Mark all read</button>
        </div>
      </div>
      {h.notices.length === 0 && <div className="empty">Nothing yet. Friend requests, accepted requests and group invites show up here.</div>}
      <div className="plist">
        {h.notices.map((n) => {
          const pending = n.type === "req" && n.from ? h.reqIn.some((r) => r.id === n.from!.id) : false;
          const joinable = n.type === "ginv" && n.gid && !h.groups.some((g) => g.id === n.gid);
          return (
            <div key={n.id} className={"card notice" + (n.read ? "" : " unread")}>
              {n.from && <Dot av={n.from.av} name={n.from.name} />}
              <div className="grow">
                <div>{n.text}</div>
                <small className="hint">{timeAgo(n.ts)}</small>
              </div>
              {n.from && <button className="btn g sm" onClick={() => router.push("/profile?id=" + n.from!.id)}>Profile</button>}
              {pending && n.from && (
                <>
                  <button className="btn sm" onClick={() => h.acceptRequest(n.from!)}>Accept</button>
                  <button className="btn g sm" onClick={() => h.declineRequest(n.from!.id)}>Decline</button>
                </>
              )}
              {joinable && <button className="btn sm" onClick={() => { h.joinGroup(n.gid!); router.push("/groups"); }}>Join</button>}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
