
Let's create a plan to decouple the existing systems

Tight Coupling Between Systems Systems are heavily interdependent with direct references everywhere. For example:

Game directly manipulates camera controller internals
UI manager has callbacks back to game
Creatures need references to camera, scene, and other creatures
Multiplayer system needs to know about game state structure
This makes it nearly impossible to change one system without affecting others.