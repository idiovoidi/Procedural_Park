// Inscryption Shader - Vertex Shader
// Basic vertex shader for post-processing effects

varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}