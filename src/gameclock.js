export const GAME_SECONDS_PER_REAL_SECOND=180;
export const DAY_SECONDS=86400;
export const START_TIME_SECONDS=7*3600+30*60;
export function gameSeconds(elapsed,initial=START_TIME_SECONDS){return ((initial+Math.max(0,elapsed)*GAME_SECONDS_PER_REAL_SECOND)%DAY_SECONDS+DAY_SECONDS)%DAY_SECONDS;}
export function hourOfDay(t){return t/DAY_SECONDS*24;}
export function formatClock(t){const m=Math.floor((((t%DAY_SECONDS)+DAY_SECONDS)%DAY_SECONDS)/60);return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;}
export function daylightPhase(h){if(h<5||h>=19)return 'NIGHT';if(h<8)return 'MORNING';if(h<16.5)return 'DAYTIME';return 'SUNSET';}
export function nightBlend(h){if(h>=19.5||h<4.75)return 1;if(h>=18)return Math.min(1,(h-18)/1.5);if(h<6.25)return Math.max(0,(6.25-h)/1.5);return 0;}
