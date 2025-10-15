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

// Fragment shader source - optimized for performance
const fragmentShader = `
uniform sampler2D tDiffuse;
uniform float luminanceThreshold;
uniform float colorSteps;
uniform float intensity;
uniform float darknessBias;
uniform vec2 resolution;
uniform float time;

varying vec2 vUv;

// Optimized luminance calculation using constants
const vec3 LUMINANCE_WEIGHTS = vec3(0.299, 0.587, 0.114);

void main() {
    // Sample the input texture once
    vec4 texel = texture2D(tDiffuse, vUv);
    vec3 color = texel.rgb;
    
    // Calculate luminance using dot product (faster than separate multiplications)
    float luminance = dot(color, LUMINANCE_WEIGHTS);
    
    // Optimized posterization factor calculation using step function
    // This avoids branching which can be slow on some GPUs
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
    
    // Final blend - use built-in mix function for hardware optimization
    vec3 finalColor = mix(color, posterized, intensity);
    
    gl_FragColor = vec4(finalColor, texel.a);
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
