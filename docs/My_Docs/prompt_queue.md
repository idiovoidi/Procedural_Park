All these files are shaders / filters and should be inside src\rendering\shaders instead of src\rendering\visual-effects
src\rendering\visual-effects\ChromaticAberrationFilter.ts
src\rendering\visual-effects\CRTFilter.ts
src\rendering\visual-effects\FilmGrainFilter.ts

The other files in src\rendering\visual-effects managing performance should be handling all shaders with one access point and src\rendering\visual-effects\LowResolutionRenderer.ts needs to be investigated to understand if it's a shader or actual implementation.