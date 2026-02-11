// challenge.js
import { loadJSON, saveJSON } from "./utils.js";

const KEY_CHALLENGE = "iq_challenge_v3";

function loadCh(){ return loadJSON(KEY_CHALLENGE, { enabled:false, mult:1.0 }); }
function saveCh(s){ saveJSON(KEY_CHALLENGE, s); }

export function ensureChallengeState(){
  const st = loadCh();
  if (typeof st.enabled !== "boolean") st.enabled = false;
  if (!(st.mult > 0.5 && st.mult <= 2.0)) st.mult = 1.0;
  saveCh(st);
  return st;
}

export function challengeMultiplier(){
  const st = loadCh();
  return st.enabled ? (st.mult || 1.15) : 1.0;
}

export function toggleChallenge(){
  const st = loadCh();
  st.enabled = !st.enabled;
  saveCh(st);
  return st;
}

export function setChallengeMult(x){
  const st = loadCh();
  st.mult = Math.max(1.0, Math.min(1.5, Number(x||1.15)));
  saveCh(st);
  return st;
}
