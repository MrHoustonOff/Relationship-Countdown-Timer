// /mrhoustontimer/app/static/js/effects.js
/**
 * @fileoverview Utilities for creating and animating visual particle effects.
 */

/**
 * Creates and animates a set of particles (symbols) flying out from a specified element.
 * Particles are positioned absolutely relative to the viewport and removed after animation.
 * Animation is driven by CSS (`particle-fly-out` keyframes) using CSS variables
 * `--particle-x` and `--particle-y` for the destination.
 *
 * @param {object} options - Configuration object for particle spawning.
 * @param {HTMLElement | null} options.originElement - The DOM element from which particles originate.
 * @param {string} options.symbol - The symbol (e.g., emoji '💖') to use as a particle.
 * @param {number} [options.count=10] - Number of particles to create. Default is 10.
 * @param {number} [options.spread=180] - Spread angle in degrees. 180 is a semicircle. Default is 180.
 * @param {number} [options.duration=1200] - Animation duration in ms. Default is 1200ms.
 * @param {number} [options.distance=300] - Maximum fly-out distance in pixels. Default is 300px.
 * @param {string} [options.particleClass=''] - Additional CSS class for styling.
 * @param {number} [options.aim=1] - Direction multiplier (vertical orientation).
 * @param {number} [options.deg_aim=0] - Angular offset in degrees.
 */
function spawnParticles({
    originElement,
    symbol,
    count = 10,
    spread = 180,
    duration = 1200,
    distance = 300,
    particleClass = '',
    aim = 1,
    deg_aim = 0
}) {
    // Validate origin element
    if (!originElement || !(originElement instanceof Element)) {
        return;
    }
    // Validate symbol
    if (!symbol) {
        return;
    }

    try {
        const originRect = originElement.getBoundingClientRect();
        // Calculate center point relative to the viewport
        const originX = originRect.left + originRect.width / 2;
        const originY = originRect.top + originRect.height / 2;

        for (let i = 0; i < count; i++) {
            const particle = document.createElement('span');
            particle.className = `particle ${particleClass || ''}`.trim();
            particle.textContent = symbol;

            // Set initial position to the center of the origin element
            particle.style.position = 'fixed';
            particle.style.left = `${originX}px`;
            particle.style.top = `${originY}px`;

            // Calculate random spread angle
            // Offset 90 degrees based on 'aim' parameter
            const angleOffset = 90 * aim + deg_aim;
            const randomAngleDeg = (Math.random() * spread - (spread / 2)) + angleOffset;
            const angleRad = randomAngleDeg * (Math.PI / 180);

            // Calculate random distance (between 50% and 100% of max distance)
            const currentDistance = (Math.random() * 0.5 + 0.5) * distance;

            // Calculate destination coordinates
            const endX = Math.cos(angleRad) * currentDistance;
            const endY = Math.sin(angleRad) * currentDistance;

            // Set CSS variables for the @keyframes animation
            particle.style.setProperty('--particle-x', `${endX.toFixed(2)}px`);
            particle.style.setProperty('--particle-y', `${endY.toFixed(2)}px`);

            document.body.appendChild(particle);

            // cleanup after animation finishes
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.remove();
                }
            }, duration);
        }
    } catch (error) {
        console.error("[spawnParticles] Error creating particles:", error);
    }
}