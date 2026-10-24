/**
 * Feature switches.
 *
 * AUTH_ENABLED = false  -> no sign-in / sign-up / Google button anywhere. Everyone plays as a guest
 *                          and everything (profile, quests, friends, tokens, shop) is saved on this device.
 * AUTH_ENABLED = true   -> V19 behaviour: optional accounts with cloud backup, server-side tokens.
 *
 * Nothing was deleted: flip this one value later and the whole login system comes back.
 */
export const AUTH_ENABLED = false;

/**
 * AVATAR_REALISTIC = true  -> natural body proportions, shaped face (nose, lips, brow, jaw), real eyes, fabric and skin shading.
 * AVATAR_REALISTIC = false -> the rounder v19 look.
 */
export const AVATAR_REALISTIC = true;
