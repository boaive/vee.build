/**
 * Physical sky: the Preetham daylight model with a cloud layer, adapted
 * from three.js examples/jsm/objects/Sky.js (MIT). Two changes: the sun is
 * a unit direction, and the output is scaled by `uIntensity` so the sky sits
 * correctly against the scene's lights before tone mapping.
 *
 * The same model is evaluated on the CPU (`skyRadiance`) so the haze, the
 * light colours and the sky always agree.
 */
import { BackSide, Color, ShaderMaterial, Vector3 } from 'three';

export interface CloudParams {
  /** 0 clear – 1 overcast. */
  coverage: number;
  /** How solid each cloud is. */
  density: number;
  /** Feature size; larger is smaller clouds. */
  scale: number;
  /** 0 high and wispy – 1 low and close. */
  elevation: number;
  /** Shifts the pattern, to frame a set. */
  offset?: [number, number];
  /** Strength of direct sun on the clouds (low suns light them from below). */
  light?: number;
}

export interface SkyParams {
  turbidity: number;
  rayleigh: number;
  mie: number;
  mieG: number;
  /** Multiplier on the model's radiance. */
  intensity: number;
  /** Sun disc brightness; 0 hides it (out of frame). */
  disc: number;
  /** Soft compression of bright sky by luminance (L / (1 + k L), hue kept) after intensity; 0 is off. */
  compress?: number;
  /** Seen only below the horizon: reflections and the environment's lower half. */
  ground: string;
  clouds?: CloudParams;
  /** Colour multiplier for the upper sky, blended in above the horizon. */
  tint?: [number, number, number];
  /**
   * Twilight: the analytic model only holds while the sun is up, so after
   * sunset the sky blends to a measured-looking gradient (linear colours):
   * zenith, the band above the horizon away from the sun, and the glow
   * toward it.
   */
  twilight?: { amount: number; zenith: [number, number, number]; band: [number, number, number]; glow: [number, number, number] };
}

const VERT = /* glsl */ `
uniform vec3 uSunDir;
uniform float uRayleigh;
uniform float uTurbidity;
uniform float uMie;

varying vec3 vWorldPosition;
varying vec3 vBetaR;
varying vec3 vBetaM;
varying float vSunE;

const float e = 2.71828182845904523536028747135266249775724709369995957;
const vec3 totalRayleigh = vec3( 5.804542996261093E-6, 1.3562911419845635E-5, 3.0265902468824876E-5 );
const vec3 MieConst = vec3( 1.8399918514433978E14, 2.7798023919660528E14, 4.0790479543861094E14 );
const float cutoffAngle = 1.6110731556870734;
const float steepness = 1.5;
const float EE = 1000.0;

float sunIntensity( float zenithAngleCos ) {
  zenithAngleCos = clamp( zenithAngleCos, -1.0, 1.0 );
  return EE * max( 0.0, 1.0 - pow( e, -( ( cutoffAngle - acos( zenithAngleCos ) ) / steepness ) ) );
}

vec3 totalMie( float T ) {
  float c = ( 0.2 * T ) * 10E-18;
  return 0.434 * c * MieConst;
}

void main() {
  vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  gl_Position.z = gl_Position.w;
  vSunE = sunIntensity( uSunDir.y );
  vBetaR = totalRayleigh * uRayleigh;
  vBetaM = totalMie( uTurbidity ) * uMie;
}`;

const FRAG = /* glsl */ `
varying vec3 vWorldPosition;
varying vec3 vBetaR;
varying vec3 vBetaM;
varying float vSunE;

uniform vec3 uSunDir;
uniform float uMieG;
uniform float uIntensity;
uniform float uDisc;
uniform float uCompress;
uniform vec3 uGround;
uniform vec4 uCloud;       // coverage, density, scale, elevation
uniform vec2 uCloudOffset;
uniform float uCloudLight;
uniform vec3 uTint;
uniform float uTwilight;
uniform vec3 uTwiZenith;
uniform vec3 uTwiBand;
uniform vec3 uTwiGlow;

vec3 twilightSky( vec3 d ) {
  float h = max( d.y, 0.0 );
  vec2 sxz = normalize( uSunDir.xz + vec2( 1e-5 ) );
  vec2 dxz = normalize( d.xz + vec2( 1e-5 ) );
  float toward = max( dot( dxz, sxz ), 0.0 );
  vec3 c = mix( uTwiBand, uTwiZenith, smoothstep( 0.0, 0.55, h ) );
  c += uTwiGlow * pow( toward, 2.5 ) * ( 1.0 - smoothstep( 0.0, 0.28, h ) );
  return c;
}

vec2 gradient( vec2 i ) {
  vec3 p = fract( i.xyx * vec3( 0.1031, 0.1030, 0.0973 ) );
  p += dot( p, p.yzx + 33.33 );
  return fract( ( p.xx + p.yz ) * p.zy ) * 2.0 - 1.0;
}
float noise( vec2 p ) {
  vec2 i = floor( p );
  vec2 f = fract( p );
  vec2 u = f * f * f * ( f * ( f * 6.0 - 15.0 ) + 10.0 );
  float a = dot( gradient( i ), f );
  float b = dot( gradient( i + vec2( 1.0, 0.0 ) ), f - vec2( 1.0, 0.0 ) );
  float c = dot( gradient( i + vec2( 0.0, 1.0 ) ), f - vec2( 0.0, 1.0 ) );
  float d = dot( gradient( i + vec2( 1.0, 1.0 ) ), f - vec2( 1.0, 1.0 ) );
  return mix( mix( a, b, u.x ), mix( c, d, u.x ), u.y ) * 1.6;
}
float fbm( vec2 p ) {
  float r = 0.0;
  float a = 1.0;
  for ( int i = 0; i < 5; i ++ ) {
    r += a * noise( p );
    a *= 0.5;
    p = p * 2.03 + vec2( 1.7, 9.2 );
  }
  return r;
}

const float pi = 3.141592653589793238462643383279502884197169;
const float rayleighZenithLength = 8.4E3;
const float mieZenithLength = 1.25E3;
const float sunAngularDiameterCos = 0.99996;
const float THREE_OVER_SIXTEENPI = 0.05968310365946075;
const float ONE_OVER_FOURPI = 0.07957747154594767;

float rayleighPhase( float cosTheta ) {
  return THREE_OVER_SIXTEENPI * ( 1.0 + pow( cosTheta, 2.0 ) );
}
float hgPhase( float cosTheta, float g ) {
  float g2 = pow( g, 2.0 );
  float inverse = 1.0 / pow( 1.0 - 2.0 * g * cosTheta + g2, 1.5 );
  return ONE_OVER_FOURPI * ( ( 1.0 - g2 ) * inverse );
}

void main() {
  vec3 direction = normalize( vWorldPosition - cameraPosition );

  float zenithAngle = acos( max( 0.0, direction.y ) );
  float inverse = 1.0 / ( cos( zenithAngle ) + 0.15 * pow( 93.885 - ( ( zenithAngle * 180.0 ) / pi ), -1.253 ) );
  float sR = rayleighZenithLength * inverse;
  float sM = mieZenithLength * inverse;
  vec3 Fex = exp( -( vBetaR * sR + vBetaM * sM ) );

  float cosTheta = dot( direction, uSunDir );
  float rPhase = rayleighPhase( cosTheta * 0.5 + 0.5 );
  vec3 betaRTheta = vBetaR * rPhase;
  float mPhase = hgPhase( cosTheta, uMieG );
  vec3 betaMTheta = vBetaM * mPhase;

  vec3 Lin = pow( vSunE * ( ( betaRTheta + betaMTheta ) / ( vBetaR + vBetaM ) ) * ( 1.0 - Fex ), vec3( 1.5 ) );
  Lin *= mix( vec3( 1.0 ), pow( vSunE * ( ( betaRTheta + betaMTheta ) / ( vBetaR + vBetaM ) ) * Fex, vec3( 1.0 / 2.0 ) ), clamp( pow( 1.0 - uSunDir.y, 5.0 ), 0.0, 1.0 ) );

  vec3 L0 = vec3( 0.1 ) * Fex;
  float sundisc = smoothstep( sunAngularDiameterCos, sunAngularDiameterCos + 0.00002, cosTheta ) * uDisc;
  vec3 sundiscColor = ( 760.0 * sundisc ) * min( vSunE * Fex, 80.0 );

  vec3 texColor = ( Lin + L0 ) * 0.04 + vec3( 0.0, 0.0003, 0.00075 );
  float discMask = 1.0;
  // After sunset: blend toward the twilight gradient (in model units, before intensity).
  texColor = mix( texColor, twilightSky( direction ) / max( uIntensity, 1e-4 ), uTwilight );

  if ( direction.y > 0.0 && uCloud.x > 0.0 ) {
    float elevation = mix( 1.0, 0.1, uCloud.w );
    vec2 cloudUV = direction.xz / ( direction.y * elevation );
    cloudUV = cloudUV * uCloud.z + uCloudOffset;
    float cloudNoise = clamp( fbm( cloudUV * 1000.0 ) * 0.7 + 0.5, 0.0, 1.0 );
    float region = noise( cloudUV * 300.0 ) * 0.37 + 0.5;
    float cov = clamp( uCloud.x + ( region - 0.5 ) * 0.6, 0.0, 1.0 );
    float threshold = 1.0 - cov;
    float cloudMask = smoothstep( threshold, threshold + 0.3, cloudNoise );
    float horizonFade = smoothstep( 0.0, 0.03 + 0.06 * uCloud.w, direction.y );
    cloudMask *= horizonFade;
    float dayFactor = smoothstep( -0.08, 0.3, uSunDir.y );
    float zs = acos( max( 0.0, uSunDir.y ) );
    float invS = 1.0 / ( cos( zs ) + 0.15 * pow( 93.885 - ( ( zs * 180.0 ) / pi ), -1.253 ) );
    vec3 FexSun = exp( -( vBetaR * rayleighZenithLength * invS + vBetaM * mieZenithLength * invS ) );
    vec3 sunColor = vSunE * mix( Fex, FexSun, 0.85 ) * 0.22 * 0.04 * uCloudLight;
    vec3 skyAmbient = Lin * 0.04 + vec3( 0.0, 0.0003, 0.00075 );
    float depth = max( 0.0, cloudNoise - threshold );
    float beer = exp( depth * -4.0 );
    float powder = 1.0 - beer * beer;
    float shade = mix( 0.45, 1.0, clamp( beer * powder * 2.6, 0.0, 1.0 ) );
    float silver = clamp( 0.51 / pow( 1.49 - cosTheta * 1.4, 1.5 ), 0.0, 3.0 );
    float edge = cloudMask * ( 1.0 - cloudMask ) * 4.0;
    vec3 cloudColor = skyAmbient + sunColor * shade;
    cloudColor += sunColor * silver * edge * 0.6;
    cloudColor *= max( dayFactor, 0.06 ) + ( 1.0 - dayFactor ) * uCloudLight * 0.6;
    float alpha = ( 1.0 - exp( depth * uCloud.y * -12.0 ) ) * horizonFade;
    discMask = 1.0 - alpha;
    // Distant clouds sink into the haze, but a low sun keeps lighting them.
    vec3 cloudAerial = mix( texColor, cloudColor, pow( Fex, vec3( 0.35 ) ) );
    texColor = mix( texColor, cloudAerial, alpha );
  }

  texColor *= mix( vec3( 1.0 ), uTint, smoothstep( 0.02, 0.55, direction.y ) );
  texColor *= uIntensity;
  // Tames the glow round a low sun so the rest of the sky keeps its colour;
  // the disc is added after, so it stays the brightest thing in frame.
  float lum = max( dot( texColor, vec3( 0.2126, 0.7152, 0.0722 ) ), 1e-6 );
  texColor *= 1.0 / ( 1.0 + uCompress * lum );
  texColor += sundiscColor * discMask * 0.002;
  // Below the horizon: ground bounce for reflections, blended in under the haze line.
  texColor = mix( texColor, uGround, smoothstep( 0.0, -0.12, direction.y ) );

  gl_FragColor = vec4( texColor, 1.0 );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function createPhysicalSky(params: SkyParams, sunDir: readonly [number, number, number]) {
  const m = new ShaderMaterial({
    uniforms: {
      uSunDir: { value: new Vector3(...sunDir).normalize() },
      uRayleigh: { value: params.rayleigh },
      uTurbidity: { value: params.turbidity },
      uMie: { value: params.mie },
      uMieG: { value: params.mieG },
      uIntensity: { value: params.intensity },
      uDisc: { value: params.disc },
      uCompress: { value: params.compress ?? 0 },
      uGround: { value: new Color(params.ground) },
      uCloud: { value: { x: 0, y: 0, z: 0, w: 0 } },
      uCloudOffset: { value: [0, 0] },
      uCloudLight: { value: 1 },
      uTint: { value: new Vector3(1, 1, 1) },
      uTwilight: { value: 0 },
      uTwiZenith: { value: new Vector3() },
      uTwiBand: { value: new Vector3() },
      uTwiGlow: { value: new Vector3() },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    side: BackSide,
    depthWrite: false,
    fog: false,
  });
  paintPhysicalSky(m, params, sunDir);
  return m;
}

export function paintPhysicalSky(m: ShaderMaterial, p: SkyParams, sunDir: readonly [number, number, number]) {
  const u = m.uniforms;
  (u.uSunDir.value as Vector3).set(...sunDir).normalize();
  u.uRayleigh.value = p.rayleigh;
  u.uTurbidity.value = p.turbidity;
  u.uMie.value = p.mie;
  u.uMieG.value = p.mieG;
  u.uIntensity.value = p.intensity;
  u.uDisc.value = p.disc;
  u.uCompress.value = p.compress ?? 0;
  (u.uGround.value as Color).set(p.ground);
  const c = p.clouds;
  u.uCloud.value = { x: c?.coverage ?? 0, y: c?.density ?? 0, z: (c?.scale ?? 1) * 0.0002, w: c?.elevation ?? 0.5 };
  u.uCloudOffset.value = c?.offset ?? [0, 0];
  u.uCloudLight.value = c?.light ?? 1;
  (u.uTint.value as Vector3).set(...(p.tint ?? [1, 1, 1]));
  u.uTwilight.value = p.twilight?.amount ?? 0;
  (u.uTwiZenith.value as Vector3).set(...(p.twilight?.zenith ?? [0, 0, 0]));
  (u.uTwiBand.value as Vector3).set(...(p.twilight?.band ?? [0, 0, 0]));
  (u.uTwiGlow.value as Vector3).set(...(p.twilight?.glow ?? [0, 0, 0]));
}

/* ------------------------------------------------------------------ */
/* The same model on the CPU                                           */
/* ------------------------------------------------------------------ */

const TOTAL_RAYLEIGH = [5.804542996261093e-6, 1.3562911419845635e-5, 3.0265902468824876e-5];
const MIE_CONST = [1.8399918514433978e14, 2.7798023919660528e14, 4.0790479543861094e14];
const OFFSET = [0, 0.0003, 0.00075];

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function sunIntensity(zc: number) {
  const c = clamp(zc, -1, 1);
  return 1000 * Math.max(0, 1 - Math.exp(-((1.6110731556870734 - Math.acos(c)) / 1.5)));
}

/** Sky radiance (linear, after `intensity`) in direction `dir` for a sun at `sun`. Clouds excluded. */
export function skyRadiance(dir: Vector3, sun: Vector3, p: SkyParams, out = new Color()) {
  const sunE = sunIntensity(sun.y);
  const c = 0.2 * p.turbidity * 10e-18;
  const zenithAngle = Math.acos(Math.max(0, dir.y));
  const inv = 1 / (Math.cos(zenithAngle) + 0.15 * Math.pow(93.885 - (zenithAngle * 180) / Math.PI, -1.253));
  const cosTheta = dir.dot(sun);
  const rPhase = (3 / (16 * Math.PI)) * (1 + Math.pow(cosTheta * 0.5 + 0.5, 2));
  const g2 = p.mieG * p.mieG;
  const mPhase = (1 / (4 * Math.PI)) * ((1 - g2) / Math.pow(1 - 2 * p.mieG * cosTheta + g2, 1.5));
  const k = clamp(Math.pow(1 - sun.y, 5), 0, 1);
  const rgb = [0, 0, 0];
  const tw = p.twilight;
  let twi: number[] | null = null;
  if (tw && tw.amount > 0) {
    const h = Math.max(dir.y, 0);
    const sl = Math.hypot(sun.x, sun.z) || 1;
    const dl = Math.hypot(dir.x, dir.z) || 1;
    const toward = Math.max((dir.x * sun.x + dir.z * sun.z) / (sl * dl), 0);
    const ss = (a: number, b: number, x: number) => {
      const t = clamp((x - a) / (b - a), 0, 1);
      return t * t * (3 - 2 * t);
    };
    const zk = ss(0, 0.55, h);
    const gk = Math.pow(toward, 2.5) * (1 - ss(0, 0.28, h));
    twi = [0, 1, 2].map((i) => tw.band[i] + (tw.zenith[i] - tw.band[i]) * zk + tw.glow[i] * gk);
  }
  for (let i = 0; i < 3; i++) {
    const bR = TOTAL_RAYLEIGH[i] * p.rayleigh;
    const bM = 0.434 * c * MIE_CONST[i] * p.mie;
    const fex = Math.exp(-(bR * 8.4e3 * inv + bM * 1.25e3 * inv));
    const ratio = (bR * rPhase + bM * mPhase) / (bR + bM);
    let lin = Math.pow(sunE * ratio * (1 - fex), 1.5);
    lin *= 1 + (Math.pow(sunE * ratio * fex, 0.5) - 1) * k;
    const model = (lin + 0.1 * fex) * 0.04 + OFFSET[i];
    const blended = twi ? model + (twi[i] / Math.max(p.intensity, 1e-4) - model) * tw!.amount : model;
    rgb[i] = blended * p.intensity;
  }
  const tk = Math.min(1, Math.max(0, (dir.y - 0.02) / 0.53));
  const ts = tk * tk * (3 - 2 * tk);
  const tint = p.tint ?? [1, 1, 1];
  for (let i = 0; i < 3; i++) rgb[i] *= 1 + (tint[i] - 1) * ts;
  const lum = Math.max(rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722, 1e-6);
  const f = 1 / (1 + (p.compress ?? 0) * lum);
  return out.setRGB(rgb[0] * f, rgb[1] * f, rgb[2] * f);
}

/** Colour of direct sunlight after the atmosphere, normalised so its brightest channel is 1. */
export function sunlightColor(sun: Vector3, p: SkyParams, out = new Color()) {
  const c = 0.2 * p.turbidity * 10e-18;
  const zenithAngle = Math.acos(clamp(sun.y, 0.0, 1));
  const inv = 1 / (Math.cos(zenithAngle) + 0.15 * Math.pow(93.885 - (zenithAngle * 180) / Math.PI, -1.253));
  const rgb = [0, 1, 2].map((i) => {
    const bR = TOTAL_RAYLEIGH[i] * p.rayleigh;
    const bM = 0.434 * c * MIE_CONST[i] * p.mie;
    return Math.exp(-(bR * 8.4e3 * inv + bM * 1.25e3 * inv));
  });
  const m = Math.max(...rgb, 1e-6);
  return out.setRGB(rgb[0] / m, rgb[1] / m, rgb[2] / m);
}

const _d = new Vector3();
const _s = new Vector3();

/**
 * The horizon as two colours and a falloff, for haze that matches the sky:
 * `toward` in the sun's azimuth, `away` everywhere else, blended by
 * max(dot(dir, sunXZ), 0)^power.
 */
export function horizonHaze(sunDir: readonly [number, number, number], p: SkyParams) {
  _s.set(...sunDir).normalize();
  const az = Math.atan2(_s.x, _s.z);
  // Sampled a few degrees up: right at the horizon a low sun's sky is deep red,
  // which turns distant hills red; the band just above reads as haze.
  const at = (offset: number, el = 0.09) => {
    _d.set(Math.sin(az + offset) * Math.cos(el), Math.sin(el), Math.cos(az + offset) * Math.cos(el));
    return skyRadiance(_d, _s, p);
  };
  const toward = at(0);
  const away = at(Math.PI).add(at(Math.PI * 0.6)).add(at(-Math.PI * 0.6)).multiplyScalar(1 / 3);
  const mid = at(Math.PI / 4);
  const lum = (c: Color) => c.r * 0.2126 + c.g * 0.7152 + c.b * 0.0722;
  const ratio = clamp((lum(mid) - lum(away)) / Math.max(1e-5, lum(toward) - lum(away)), 0.001, 0.999);
  const power = clamp(Math.log(ratio) / Math.log(Math.SQRT1_2), 1, 24);
  return { toward, away, power };
}
