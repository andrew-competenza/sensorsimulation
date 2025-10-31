export class ColorUtils {
  /**
   * Multi-band heatmap color:
   * left = green, middle = orange, right = red
   * @param value - sensor value 0..100
   * @param x - x coordinate of cell
   * @param gridCols - total columns
   */
  static multiBandColor(value: number, x: number, gridCols: number): string {
    const v = Math.max(0, Math.min(100, value));
    const alpha = 0.2 + 0.7 * (v / 100); // 0.2 → 0.9 based on value

    const posFactor = x / (gridCols - 1); // 0=left, 1=right
    let r = 0, g = 0, b = 0;

    if (posFactor <= 0.33) {
      // left third → green
      r = 0;
      g = 255;
      b = 50; // slight blue tint
    } else if (posFactor <= 0.66) {
      // middle third → orange
      r = 255;
      g = 165;
      b = 0;
    } else {
      // right third → red
      r = 255;
      g = 0;
      b = 0;
    }

    return `rgba(${r},${g},${b},${alpha})`;
  }
}
