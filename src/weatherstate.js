// Pure weather scheduling — testable without a WebGL context or Three.js.
export const WEATHER_MODES=['auto','clear','rain','storm','snow'];
export function nextWeather(mode){const i=WEATHER_MODES.indexOf(mode);return WEATHER_MODES[(i+1)%WEATHER_MODES.length];}
export function scheduledWeather(elapsed){
  const slot=Math.floor(Math.max(0,elapsed)/95)%8;
  return ['clear','clear','rain','storm','clear','snow','clear','rain'][slot];
}
export function effectiveWeather(mode,elapsed){return mode==='auto'?scheduledWeather(elapsed):mode;}
export function weatherLabel(mode){return ({clear:'SUNNY',rain:'RAIN',storm:'THUNDERSTORM',snow:'SNOW'})[mode]||'SUNNY';}
