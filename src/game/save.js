const SAVE_KEY = "nba-gatcha-save-v4";

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveGame(state) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function clearGame() {
  localStorage.removeItem(SAVE_KEY);
}
