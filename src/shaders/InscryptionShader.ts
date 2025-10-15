import * as THREE from 'three'
import { INSCRYPTION_SHADER_DEFAULTS } from './InscryptionShaderConfig'

// Vertex shader source
const vertexShader = `
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

// Fragment shader source - optimized for performance with grit effects
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

varying vec2 vUv;

// Optimized luminance calculation using constants
const vec3 LUMINANCE_WEIGHTS = vec3(0.299, 0.587, 0.114);

// Pseudo-random noise function for grit effects
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Film grain noise function
float filmGrain(vec2 uv, float time) {
    vec2 noise = uv * resolution * 0.75;
    noise.y += time * 0.01;
    return random(noise) * 2.0 - 1.0;
}

// Procedural dirt/dust texture
float dirtTexture(vec2 uv) {
    vec2 p = uv * 8.0;
    float dirt = 0.0;
    
    // Multiple octaves of noise for complex dirt pattern
    dirt += random(floor(p)) * 0.5;
    dirt += random(floor(p * 2.0)) * 0.25;
    dirt += random(floor(p * 4.0)) * 0.125;
    
    // Create streaks and scratches
    float streak1 = smoothstep(0.98, 1.0, random(vec2(floor(p.x * 0.1), 0.0)));
    float streak2 = smoothstep(0.99, 1.0, random(vec2(0.0, floor(p.y * 0.15))));
    
    dirt += (streak1 + streak2) * 0.3;
    
    return clamp(dirt, 0.0, 1.0);
}

// Vignette effect for that old camera look
float vignette(vec2 uv) {
    vec2 center = uv - 0.5;
    float dist = length(center);
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

void main() {
    // Sample with subtle chromatic aberration for gritty lens effect
    vec3 color = chromaticAberration(tDiffuse, vUv);
    
    // Calculate luminance using dot product
    float luminance = dot(color, LUMINANCE_WEIGHTS);
    
    // Optimized posterization factor calculation using step function
    float isLowLuminance = step(luminance, luminanceThreshold);
    float posterizationFactor = mix(
        colorSteps * (0.7 + luminance * 0.3), // High luminance case
        colorSteps * 0.3,                      // Low luminance case
        isLowLuminance
    );
    
    // Apply posterization with optimized floor/divide operation
    vec3 posterized = floor(color * posterizationFactor + 0.5) / posterizationFactor;
    
    // Apply darkness bias efficiently
    float darknessFactor = 1.0 - luminance * darknessBias;
    posterized *= darknessFactor;
    
    // Blend original and posterized based on intensity
    vec3 baseColor = mix(color, posterized, intensity);
    
    // === GRIT EFFECTS ===
    
    // Add film grain
    float grain = filmGrain(vUv, time) * filmGrainIntensity;
    baseColor += grain * 0.05;
    
    // Apply dirt and dust texture
    float dirt = dirtTexture(vUv);
    float dirtMask = smoothstep(0.6, 1.0, dirt) * grittiness;
    baseColor = mix(baseColor, baseColor * 0.7, dirtMask * 0.3);
    
    // Add subtle scratches and imperfections
    float scratchNoise = random(vec2(vUv.x * 0.1, time * 0.001));
    float scratch = smoothstep(0.995, 1.0, scratchNoise) * grittiness;
    baseColor = mix(baseColor, vec3(0.8), scratch * 0.1);
    
    // Apply vignette for that old camera aesthetic
    float vignetteEffect = vignette(vUv);
    baseColor *= mix(1.0, vignetteEffect, vignetteStrength);
    
    // Subtle color desaturation for aged look
    float desaturation = grittiness * 0.3;
    float gray = dot(baseColor, LUMINANCE_WEIGHTS);
    baseColor = mix(baseColor, vec3(gray), desaturation);
    
    // Add slight sepia tint for vintage feel
    vec3 sepia = vec3(
        dot(baseColor, vec3(0.393, 0.769, 0.189)),
        dot(baseColor, vec3(0.349, 0.686, 0.168)),
        dot(baseColor, vec3(0.272, 0.534, 0.131))
    );
    baseColor = mix(baseColor, sepia, grittiness * 0.15);
    
    // Final contrast boost for that harsh Inscryption look
    baseColor = pow(baseColor, vec3(1.0 + grittiness * 0.2));
    
    gl_FragColor = vec4(baseColor, 1.0);
}
`

// Shader uniforms interface
export interface InscryptionShaderUniforms {
  [key: string]: { value: any }
  tDiffuse: { value: THREE.Texture | null }
  luminanceThreshold: { value: number }
  colorSteps: { value: number }
  intensity: { value: number }
  darknessBias: { value: number }
  resolution: { value: THREE.Vector2 }
  time: { value: number }
  grittiness: { value: number }
  filmGrainIntensity: { value: number }
  vignetteStrength: { value: number }
}

// InscryptionShader class following Three.js shader pattern
export class InscryptionShader {
  static uniforms: InscryptionShaderUniforms = {
    tDiffuse: { value: null },
    luminanceThreshold: { value: INSCRYPTION_SHADER_DEFAULTS.luminanceThreshold },
    colorSteps: { value: INSCRYPTION_SHADER_DEFAULTS.colorSteps },
    intensity: { value: INSCRYPTION_SHADER_DEFAULTS.intensity },
    darknessBias: { value: INSCRYPTION_SHADER_DEFAULTS.darknessBias },
    resolution: { value: new THREE.Vector2(1024, 1024) },
    time: { value: 0.0 },
    grittiness: { value: 0.6 }, // Default grit level for Inscryption aesthetic
    filmGrainIntensity: { value: 0.8 }, // Moderate film grain
    vignetteStrength: { value: 0.4 }, // Subtle vignette
  }

  static vertexShader = vertexShader
  static fragmentShader = fragmentShader

  // Create a new instance of uniforms (for multiple shader instances)
  static createUniforms(): InscryptionShaderUniforms {
    return THREE.UniformsUtils.clone(this.uniforms)
  }

  // Create shader material
  static createMaterial(uniforms?: InscryptionShaderUniforms): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: uniforms || this.createUniforms(),
      vertexShader: this.vertexShader,
      fragmentShader: this.fragmentShader,
    })
  }
}
