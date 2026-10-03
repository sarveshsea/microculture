/* Offspring storyboard: open 0–250ms; sequence 250–600ms; transfer 600–1600ms;
 * Generate 1600–2250ms; settle 2250–2500ms. Interaction time is independent of biology. */
(() => {
 'use strict';
 const TIMING=Object.freeze({open:.25,derive:.6,transfer:1.6,reveal:2.25,commit:2.5});
 const clamp=x=>Math.max(0,Math.min(1,x));
 function merge(elapsed,reduced=false){const t=reduced?TIMING.commit:Math.max(0,Number.isFinite(elapsed)?elapsed:0);return Object.freeze({
  elapsed:t,opening:clamp(t/TIMING.open),sequence:clamp((t-TIMING.open)/(TIMING.derive-TIMING.open)),
  transfer:clamp((t-TIMING.derive)/(TIMING.transfer-TIMING.derive)),reveal:clamp((t-TIMING.transfer)/(TIMING.reveal-TIMING.transfer)),
  settle:clamp((t-TIMING.reveal)/(TIMING.commit-TIMING.reveal)),complete:t>=TIMING.commit,
 });}
 globalThis.MicroLifecycle=Object.freeze({TIMING,merge});
})();
