const { remote } = require("electron");

const max = document.querySelector(".maximize");
const close = document.querySelector(".close");

const scalers = {
  maximize: `<svg fill="#ffffff" xmlns="http://www.w3.org/2000/svg" data-name="Layer 1" viewBox="0 0 100 100" x="0px" y="0px"><title>102all</title><path d="M39,6H16A10,10,0,0,0,6,16V37.53a4,4,0,0,0,8,0V16a2,2,0,0,1,2-2H39a4,4,0,0,0,0-8Z"></path><path d="M16,94H37.53a4,4,0,0,0,0-8H16a2,2,0,0,1-2-2V61a4,4,0,0,0-8,0V84A10,10,0,0,0,16,94Z"></path><path d="M90,58.47a4,4,0,0,0-4,4V84a2,2,0,0,1-2,2H61a4,4,0,0,0,0,8H84A10,10,0,0,0,94,84V62.47A4,4,0,0,0,90,58.47Z"></path><path d="M84,6H62.47a4,4,0,0,0,0,8H84a2,2,0,0,1,2,2V39a4,4,0,0,0,8,0V16A10,10,0,0,0,84,6Z"></path></svg>`,
  minimize: `<svg fill="#ffffff" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" x="0px" y="0px"><title>minimize</title><g><path d="M13,18H4a1,1,0,0,0,0,2h8v8a1,1,0,0,0,2,0V19A1,1,0,0,0,13,18Z"></path><path d="M28,18H19a1,1,0,0,0-1,1v9a1,1,0,0,0,2,0V20h8a1,1,0,0,0,0-2Z"></path><path d="M19,14h9a1,1,0,0,0,0-2H20V4a1,1,0,0,0-2,0v9A1,1,0,0,0,19,14Z"></path><path d="M13,3a1,1,0,0,0-1,1v8H4a1,1,0,0,0,0,2h9a1,1,0,0,0,1-1V4A1,1,0,0,0,13,3Z"></path></g></svg>`,
};

const win = remote.getCurrentWindow();

close.addEventListener("click", () => {
  win.close();
});

max.addEventListener("click", () => {
  if (!win.isMaximized()) {
    win.maximize();
    max.innerHTML = scalers.minimize;
  } else {
    win.restore();
    max.innerHTML = scalers.maximize;
  }
});
