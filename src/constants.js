export const THEMES = {
  white: {
    name: "White",
    canvasBg: "#ffffff",
    cssVars: {
      "--bg-body": "#ffffff",
      "--text-main": "#1a1a1a",
      "--text-muted": "#666666",
      "--bg-panel": "rgba(240, 240, 240, 0.85)",
      "--bg-input": "#e0e0e0",
      "--border-color": "#ccc",
      "--button-bg": "rgba(0, 0, 0, 0.8)",
      "--button-text": "#ffffff",
    },
  },
  black: {
    name: "Black",
    canvasBg: "#111111",
    cssVars: {
      "--bg-body": "#111111",
      "--text-main": "#ffffff",
      "--text-muted": "#a1a1a1",
      "--bg-panel": "rgba(30, 30, 30, 0.85)",
      "--bg-input": "#2a2a2a",
      "--border-color": "#444",
      "--button-bg": "rgba(255, 255, 255, 0.1)",
      "--button-text": "#ffffff",
    },
  },
};

// Helper to determine text color based on background brightness
export const getContrastColor = (hexColor) => {
  const r = parseInt(hexColor.substr(1, 2), 16);
  const g = parseInt(hexColor.substr(3, 2), 16);
  const b = parseInt(hexColor.substr(5, 2), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "#1a1a1a" : "#ffffff";
};
