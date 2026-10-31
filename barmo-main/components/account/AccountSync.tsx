"use client";

import { useEffect } from "react";
import { useToast } from "@/components/Toast";
import { claimDaily, claimQuests, initEconomy, useWallet } from "@/lib/economy/economy";
import { useHub } from "@/components/HubProvider";
import { initAccount, schedulePush } from "@/lib/account/account";

/** Invisible. Starts account sync once and saves profile/progress changes to the cloud when signed in. */
export default function AccountSync() {
  const { ready, me, quests, friends, blocked, muted } = useHub();
  const wal = useWallet();
  const toast = useToast();
  useEffect(() => {
    void initAccount();
    initEconomy();
  }, []);
  // Tokens: daily login + one-time reward for each finished quest (the server decides what is paid).
  useEffect(() => {
    if (!wal.loaded || wal.err) return;
    void (async () => {
      const n = (await claimDaily()) + (await claimQuests(Object.keys(quests.done)));
      if (n > 0) toast(`+${n} ⬡ tokens`);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wal.loaded, quests.done]);
  useEffect(() => {
    if (ready) schedulePush(me, quests, { friends, blocked, muted });
  }, [ready, me, quests, friends, blocked, muted]);
  return null;
}
