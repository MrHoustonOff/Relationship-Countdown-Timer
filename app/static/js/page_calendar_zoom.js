/**
 * @fileoverview v2.0 - Standalone utility for calendar zoom control.
 * Waits for DOM to be ready before initialization.
 */

const DEFAULT_MIN_WIDTH = 320; // Default minimum module width in px
let currentMinModuleWidth = DEFAULT_MIN_WIDTH;

/**
 * Resets the CSS variable '--calendar-module-min-width' to default.
 */
function resetCalendarZoom() {
    currentMinModuleWidth = DEFAULT_MIN_WIDTH;
    document.documentElement.style.setProperty(
        '--calendar-module-min-width',
        `${currentMinModuleWidth}px`
    );
}

/**
 * Initializes the 'wheel' event listener for calendar zooming.
 */
function initCalendarZoom() {
    const container = document.getElementById('page-calendar');
    const mainArea = document.querySelector('.app-main');

    if (!container || !mainArea) {
        return;
    }

    mainArea.addEventListener('wheel', (event) => {
        // Only zoom if the calendar page is active and Ctrl key is pressed
        if (!container.classList.contains('active') || !event.ctrlKey) {
            return;
        }

        event.preventDefault(); // Prevent default page zoom

        const zoomStep = 40;
        const minWidth = 240;
        const maxWidth = 800;

        if (event.deltaY < 0) {
            currentMinModuleWidth += zoomStep;
        } else {
            currentMinModuleWidth -= zoomStep;
        }

        // Clamp values
        currentMinModuleWidth = Math.max(minWidth, Math.min(maxWidth, currentMinModuleWidth));

        document.documentElement.style.setProperty(
            '--calendar-module-min-width',
            `${currentMinModuleWidth}px`
        );

    }, { passive: false });
}

// Usage Example (call these when DOM is ready):
// resetCalendarZoom();
// initCalendarZoom();