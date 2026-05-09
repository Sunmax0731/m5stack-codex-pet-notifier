export function rgbaFromControls(colorInput, alphaInput) {
  const hex = colorInput.value.replace('#', '');
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
    a: Number(alphaInput.value)
  };
}

export function rgbaCss(value) {
  return `rgba(${value.r}, ${value.g}, ${value.b}, ${value.a / 255})`;
}

export function rgbaOverBlackCss(value) {
  if (value.a <= 0) {
    return 'transparent';
  }
  const alpha = value.a / 255;
  const r = Math.round(value.r * alpha);
  const g = Math.round(value.g * alpha);
  const b = Math.round(value.b * alpha);
  return `rgb(${r}, ${g}, ${b})`;
}

export function rgbaLabel(colorInput, alphaInput) {
  return `${colorInput.value} / ${alphaInput.value}`;
}

export function updateRgbaVisual(swatch, preview, colorInput, alphaInput) {
  const value = rgbaFromControls(colorInput, alphaInput);
  const css = rgbaCss(value);
  [swatch, preview].forEach((item) => {
    if (!item) {
      return;
    }
    item.style.setProperty('--rgba-preview', css);
    item.title = rgbaLabel(colorInput, alphaInput);
  });
}

export function moodFromState(value) {
  return {
    waiting: 'listening',
    running: 'thinking',
    failed: 'alert',
    review: 'confused',
    reacting: 'happy',
    celebrate: 'proud'
  }[value] || value || 'idle';
}
