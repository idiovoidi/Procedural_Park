import * as THREE from 'three'
import { INSCRYPTION_SHADER_DEFAULTS } from './InscryptionShaderConfig'
import type { InscryptionShaderUniforms } from './types'

// Vertex shader source
const vertexShader = `
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

// Fragment shader source - posterization, dithering, grit and CRT effects.
// tDiffuse arrives as linear colour from the composer, so everything is converted to
// display (sRGB) space up front and written out as-is; this keeps the look identical to
// the non-post-processed fallback render and makes the quantization steps perceptually even.
const fragmentShader = `
uniform sampler2D tDiffuse;
uniform float luminanceThreshold;
uniform float colorSteps;
uniform float intensity;
uniform float darknessBias;
uniform vec2 resolution;
uniform float time;
uniform float grittiness;
uniform float filmGrainIntensity;
uniform float vignetteStrength;
uniform float ditheringIntensity;
uniform float pixelSize;
uniform float crtCurvature;
uniform float crtScanlines;
uniform float crtPhosphor;

varying vec2 vUv;

const vec3 LUMINANCE_WEIGHTS = vec3(0.299, 0.587, 0.114);
const float TWO_PI = 6.28318530718;

// Linear -> sRGB transfer function
vec3 linearToSRGB(vec3 c) {
    c = clamp(c, 0.0, 1.0);
    return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

// Sine-free hash, stable across GPUs even for large pixel coordinates
float random(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

// Smooth value noise
float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(random(i), random(i + vec2(1.0, 0.0)), f.x),
        mix(random(i + vec2(0.0, 1.0)), random(i + vec2(1.0, 1.0)), f.x),
        f.y
    );
}

// Film grain: re-rolled 24 times a second so it shimmers instead of sitting still
float filmGrain(vec2 cell) {
    float frame = floor(time * 24.0);
    return random(cell + vec2(frame * 37.1, frame * 61.7)) * 2.0 - 1.0;
}

// Procedural lens dirt: soft blotches, aspect-corrected so they stay round
float dirtTexture(vec2 uv) {
    vec2 p = vec2(uv.x * resolution.x / resolution.y, uv.y) * 4.0;
    float dirt = valueNoise(p) * 0.5 + valueNoise(p * 2.0 + 17.0) * 0.25 + valueNoise(p * 4.0 + 31.0) * 0.125;
    return dirt / 0.875;
}

// Flickering vertical film scratches, one pixel wide and patchy along their length
float scratches(vec2 uv) {
    float column = floor(uv.x * resolution.x);
    float frame = floor(time * 8.0);
    float streak = step(0.9985, random(vec2(column, frame)));
    float gap = step(0.45, valueNoise(vec2(uv.y * 5.0, column + frame * 13.0)));
    return streak * gap;
}

// Vignette effect for that old camera look
float vignette(vec2 uv) {
    float dist = length(uv - 0.5);
    return 1.0 - smoothstep(0.3, 0.8, dist);
}

// Subtle chromatic aberration for aged lens effect
vec3 chromaticAberration(sampler2D tex, vec2 uv) {
    vec2 offset = (uv - 0.5) * 0.002 * grittiness;

    float r = texture2D(tex, uv + offset).r;
    float g = texture2D(tex, uv).g;
    float b = texture2D(tex, uv - offset).b;

    return vec3(r, g, b);
}

// 4x4 Bayer threshold in [0, 15/16], built from two nested 2x2 matrices
float bayer2(vec2 p) {
    return mod(p.x * 2.0 + p.y * 3.0, 4.0);
}

float bayer4(vec2 cell) {
    vec2 q = mod(floor(cell), 4.0);
    return (bayer2(mod(q, 2.0)) * 4.0 + bayer2(floor(q * 0.5))) / 16.0;
}

// CRT scanlines: exactly four pixel rows per period so the pattern never beats against the pixel grid
float scanlines(vec2 uv, float amount) {
    if (amount <= 0.0) return 1.0;

    float row = floor(uv.y * resolution.y);
    float scanline = sin(TWO_PI * (row + 0.5) / 4.0) * 0.5 + 0.5;
    return mix(1.0, scanline * 0.7 + 0.3, amount);
}

// CRT aperture-grille phosphor mask: one RGB triad every three pixel columns
vec3 phosphorMask(vec2 uv, vec3 color, float amount) {
    if (amount <= 0.0) return color;

    float phase = mod(floor(uv.x * resolution.x), 3.0);
    vec3 lit = vec3(1.0 - step(0.5, phase), step(0.5, phase) * (1.0 - step(1.5, phase)), step(1.5, phase));
    // Dim the two unlit sub-pixels, then renormalise so average brightness is unchanged
    vec3 mask = (0.7 + 0.3 * lit) / 0.8;
    return color * mix(vec3(1.0), mask, amount);
}

void main() {
    // === SAMPLING ===

    // Pixel cell used for pixelation, dithering and grain so they all share one grid
    float cellSize = max(pixelSize, 1.0);
    vec2 cell = floor(vUv * resolution / cellSize);
    vec2 sampleUV = pixelSize > 1.0 ? (cell + 0.5) * cellSize / resolution : vUv;

    vec3 color = linearToSRGB(chromaticAberration(tDiffuse, sampleUV));

    // === POSTERIZATION + DITHERING ===

    float luminance = dot(color, LUMINANCE_WEIGHTS);

    // Ordered-dither offset, centred on zero so dithering never shifts overall brightness
    float dither = (bayer4(cell) - 15.0 / 32.0) * ditheringIntensity;

    // Two fixed quantization grids (coarse for darks, fine for brights) crossfaded around the
    // threshold; a per-pixel grid size would produce speckle and a hard seam at the threshold
    float darkSteps = max(1.0, floor(colorSteps * 0.3 + 0.5));
    vec3 darkQuantized = floor(color * darkSteps + 0.5 + dither) / darkSteps;
    vec3 brightQuantized = floor(color * colorSteps + 0.5 + dither) / colorSteps;
    float brightMix = smoothstep(luminanceThreshold - 0.04, luminanceThreshold + 0.04, luminance);
    vec3 posterized = clamp(mix(darkQuantized, brightQuantized, brightMix), 0.0, 1.0);

    // Apply darkness bias
    posterized *= 1.0 - luminance * darknessBias;

    // Blend original and posterized based on intensity
    vec3 baseColor = clamp(mix(color, posterized, intensity), 0.0, 1.0);

    // === GRIT EFFECTS ===

    // Film grain
    baseColor += filmGrain(cell) * filmGrainIntensity * 0.05;

    // Dirt and dust
    float dirtMask = smoothstep(0.55, 0.85, dirtTexture(vUv)) * grittiness;
    baseColor = mix(baseColor, baseColor * 0.7, dirtMask * 0.3);

    // Scratches
    baseColor = mix(baseColor, vec3(0.8), scratches(vUv) * grittiness * 0.1);

    // Grain and grit can push values out of range; later steps (pow) need a valid colour
    baseColor = clamp(baseColor, 0.0, 1.0);

    // === CRT DISPLAY EFFECTS ===

    baseColor *= scanlines(vUv, crtScanlines);
    baseColor = phosphorMask(vUv, baseColor, crtPhosphor);

    // Vignette for that old camera/monitor aesthetic
    baseColor *= mix(1.0, vignette(vUv), vignetteStrength);

    // === GRADING ===

    // Desaturation for aged look
    float gray = dot(baseColor, LUMINANCE_WEIGHTS);
    baseColor = mix(baseColor, vec3(gray), grittiness * 0.3);

    // Slight sepia tint for vintage feel
    vec3 sepia = vec3(
        dot(baseColor, vec3(0.393, 0.769, 0.189)),
        dot(baseColor, vec3(0.349, 0.686, 0.168)),
        dot(baseColor, vec3(0.272, 0.534, 0.131))
    );
    baseColor = mix(baseColor, sepia, grittiness * 0.15);

    // Final contrast boost for that harsh Inscryption look
    baseColor = pow(clamp(baseColor, 0.0, 1.0), vec3(1.0 + grittiness * 0.2));

    gl_FragColor = vec4(baseColor, 1.0);
}
`

// InscryptionShader class following Three.js shader pattern
// biome-ignore lint/complexity/noStaticOnlyClass: Following Three.js shader pattern with static uniforms
export class InscryptionShader {
  static uniforms: InscryptionShaderUniforms = {
    tDiffuse: { value: null },
    luminanceThreshold: { value: INSCRYPTION_SHADER_DEFAULTS.luminanceThreshold },
    colorSteps: { value: INSCRYPTION_SHADER_DEFAULTS.colorSteps },
    intensity: { value: INSCRYPTION_SHADER_DEFAULTS.intensity },
    darknessBias: { value: INSCRYPTION_SHADER_DEFAULTS.darknessBias },
    resolution: { value: new THREE.Vector2(1024, 1024) },
    time: { value: 0.0 },
    grittiness: { value: INSCRYPTION_SHADER_DEFAULTS.grittiness },
    filmGrainIntensity: { value: INSCRYPTION_SHADER_DEFAULTS.filmGrainIntensity },
    vignetteStrength: { value: INSCRYPTION_SHADER_DEFAULTS.vignetteStrength },
    ditheringIntensity: { value: INSCRYPTION_SHADER_DEFAULTS.ditheringIntensity },
    pixelSize: { value: INSCRYPTION_SHADER_DEFAULTS.pixelSize },
    crtCurvature: { value: INSCRYPTION_SHADER_DEFAULTS.crtCurvature },
    crtScanlines: { value: INSCRYPTION_SHADER_DEFAULTS.crtScanlines },
    crtPhosphor: { value: INSCRYPTION_SHADER_DEFAULTS.crtPhosphor },
  }

  static vertexShader = vertexShader
  static fragmentShader = fragmentShader

  // Create a new instance of uniforms (for multiple shader instances)
  static createUniforms(): InscryptionShaderUniforms {
    return THREE.UniformsUtils.clone(InscryptionShader.uniforms)
  }

  // Create shader material
  static createMaterial(uniforms?: InscryptionShaderUniforms): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: uniforms || InscryptionShader.createUniforms(),
      vertexShader: InscryptionShader.vertexShader,
      fragmentShader: InscryptionShader.fragmentShader,
    })
  }
}
