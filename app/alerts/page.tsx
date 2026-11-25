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
      <div className="pagehead u3-pagehead">
        <div>
          <h1>Alerts & Transmissions</h1>
          <p className="hint">Direct connection requests, guild invitations & universe notifications</p>
        </div>
        <div className="row tight u3-top-actions">
          <button className="btn g sm" onClick={h.enableAlerts}>Enable Browser Alerts</button>
          <button className="btn g sm" onClick={h.markNoticesRead}>Mark All Read</button>
        </div>
      </div>

      {h.notices.length === 0 && (
        <div className="empty u3-empty-state">
          <span className="u3-empty-icon">🔔</span>
          <b>All clear. No unread transmissions.</b>
          <p>Friend requests, accepted frequencies and guild invites will appear here.</p>
        </div>
      )}

      <div className="plist u3-cards-list">
        {h.notices.map((n) => {
          const pending = n.type === "req" && n.from ? h.reqIn.some((r) => r.id === n.from!.id) : false;
          const joinable = n.type === "ginv" && n.gid && !h.groups.some((g) => g.id === n.gid);

          return (
            <div key={n.id} className={"card notice u3-person-card" + (n.read ? "" : " unread")}>
              {n.from && <Dot av={n.from.av} name={n.from.name} size={42} />}
              <div className="grow u3-person-info">
                <div><b>{n.text}</b></div>
                <small className="hint">{timeAgo(n.ts)}</small>
              </div>
              <div className="row2 u3-card-actions">
                {n.from && (
                  <button className="btn g sm" onClick={() => router.push("/profile?id=" + n.from!.id)}>
                    Profile
                  </button>
                )}
                {pending && n.from && (
                  <>
                    <button className="btn sm" onClick={() => h.acceptRequest(n.from!)}>Accept Link</button>
                    <button className="btn g sm" onClick={() => h.declineRequest(n.from!.id)}>Decline</button>
                  </>
                )}
                {joinable && (
                  <button className="btn sm" onClick={() => { h.joinGroup(n.gid!); router.push("/groups"); }}>
                    Join Guild
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
