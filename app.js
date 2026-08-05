const installButton = document.getElementById("installAppButton");
const installStatus = document.getElementById("installStatus");
const heroStartButton = document.getElementById("heroStartButton");
const gameStartButton = document.getElementById("startButton");

let installPrompt = null;

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function updateInstallMessage() {
  if (isStandalone()) {
    installButton.hidden = true;
    installStatus.textContent = "Die App ist bereits installiert.";
    return;
  }

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  installStatus.textContent = isIos
    ? "In Safari: Teilen → Zum Home-Bildschirm."
    : "Öffne das Browser-Menü und wähle „App installieren“ oder „Zum Startbildschirm hinzufügen“.";
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  installButton.hidden = false;
  installStatus.textContent = "Diese Web-App kann auf deinem Gerät installiert werden.";
});

installButton.addEventListener("click", async () => {
  if (!installPrompt) {
    updateInstallMessage();
    return;
  }

  installPrompt.prompt();
  const result = await installPrompt.userChoice;
  installPrompt = null;
  installButton.hidden = true;
  installStatus.textContent = result.outcome === "accepted"
    ? "Installation gestartet."
    : "Installation abgebrochen — du kannst sie später erneut starten.";
});

window.addEventListener("appinstalled", () => {
  installPrompt = null;
  installButton.hidden = true;
  installStatus.textContent = "T-POSE TURBO wurde installiert.";
});

heroStartButton.addEventListener("click", () => {
  window.setTimeout(() => gameStartButton.focus({ preventScroll: true }), 450);
});

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js?v=2").catch(() => {
      installStatus.textContent = "Online spielbar. Für Offline-Modus muss die Seite über HTTPS veröffentlicht sein.";
    });
  });
}

updateInstallMessage();
