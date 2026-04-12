import { contextBridge } from "electron";
contextBridge.exposeInMainWorld("seolBridge", {
  isElectron: true
});
