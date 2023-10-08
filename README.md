# InfiniTIXY

**InfiniTIXY** is an evolution of [tixy.land](https://tixy.land). It offers an endless canvas for visualization, creativity, and exploration of interactive functions and graphics.

![](demo.gif)

## Features
- Create dynamic visualizations using functions on an interactive canvas.
- Adjust various settings to control the appearance of your visualizations.
- See instant updates as you modify your function or settings.
- Zoom in and out or pan across the canvas to explore details.
- Expand your view to fullscreen for a more immersive experience.
- Simulate the original tixy.land grid.
- Full-color support with `hsl`, `hsv`, `rgb`, and `hex` functions built-in.
- Toggle between Cartesian and Screen coordinate systems.

## Settings
InfiniTIXY provides several checkboxes that allow you to customize the behaviour of the canvas:

1. Use Circles: When checked, the visualization will use circles to represent data points. When unchecked, it will use squares.
2. Cartesian: When checked, the coordinate system will be Cartesian. When unchecked, it will use a screen/canvas coordinate system (y increases down).
3. Color: When checked, the visualization will use color. When unchecked, it will use the original tixy.land colors.
4. TIXY Emulator: When checked, the TIXY Emulator mode is enabled, which restricts the coordinate space and grid.
5. Grid: When checked, a grid will be displayed over the visualization.
6. Grid Values: When checked, the grid will display the function output for the cell. When unchecked, it will show the cell's coordinates.
7. Smooth Zoom: When checked, zooming in and out will be smooth. When unchecked, zooming will be discrete.
8. Smooth Pan: When checked, panning (moving the view) will be smooth. When unchecked, panning will be instant.
9. Show FPS: When checked, the frames per second (FPS) counter will be displayed in the top left corner.

## User Function Variables
- `t`: Time variable that continuously increases as the animation progresses.
- `i`: The current index of the cell on the screen.
- `x`: The x-coordinate of the current cell.
- `y`: The y-coordinate of the current cell.
- `mx`: The x-coordinate of the mouse cursor position (useful for interactive functions).
- `my`: The y-coordinate of the mouse cursor position (useful for interactive functions).
- `c`: The total number of cells visible on the screen.

## How to Use
1. Start by modifying the function inside the input field.
2. As you modify the function, the visualization on the canvas will update in real-time.
3. Experiment with different settings to customize the appearance of your visualization.
4. If you want to reset the camera view, click the "Reset Camera" button.
5. You can also enter fullscreen mode by clicking the "Fullscreen" button.
6. Enjoy creating beautiful and interactive visualizations!