import * as THREE from 'three'

// Vertex shader source
const vertexShader = `
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

// Fragment shader source
const fragmentShader = `
uniform sampler2D tDiffuse;
uniform float luminanceThreshold;
uniform float colorSteps;
uniform float intensity;
uniform float darknessBias;
uniform vec2 resolution;
uniform float time;

varying vec2 vUv;

void main() {
    // Sample the input texture
    vec4 texel = texture2D(tDiffuse, vUv);
    vec3 color = texel.rgb;
    
    // Calculate luminance using standard formula
    float luminance = dot(color, vec3(0.299, 0.587, 0.114));
    
    // Determine posterization factor based on luminance threshold
    float posterizationFactor;
    if (luminance < luminanceThreshold) {
        // Aggressive posterization for dark areas
        posterizationFactor = colorSteps * 0.3;
    } else {
        // Preserve detail in bright areas
        posterizationFactor = colorSteps * (0.7 + luminance * 0.3);
    }
    
    // Apply posterization
    vec3 posterized = floor(color * posterizationFactor) / posterizationFactor;
    
    // Apply darkness bias to low-luminance areas
    float darknessFactor = 1.0 - (luminance * darknessBias);
    posterized *= darknessFactor;
    
    // Blend original and posterized based on intensity
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
    luminanceThreshold: { value: 0.3 },
    colorSteps: { value: 8.0 },
    intensity: { value: 1.0 },
    darknessBias: { value: 0.4 },
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
