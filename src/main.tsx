
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import App from "./app/App.tsx";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <Analytics />
  </>
);

// 生产环境按需缓存已访问过的视觉与音频资源；不预下载整包，兼顾首屏速度和流量。
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const serviceWorkerUrl = new URL("sw.js", document.baseURI);
    navigator.serviceWorker.register(serviceWorkerUrl, { scope: "./" }).catch((error) => {
      console.warn("[ServiceWorker] 注册失败，将继续使用浏览器默认缓存：", error);
    });
  });
}
