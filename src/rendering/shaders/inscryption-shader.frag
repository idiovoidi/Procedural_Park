// Inscryption Shader - Fragment Shader
// Luminance-based posterization shader for dark atmospheric effect

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