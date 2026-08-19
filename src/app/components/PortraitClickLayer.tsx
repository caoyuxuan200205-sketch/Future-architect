import React, { useCallback, useEffect, useRef, useState } from "react";
import { voiceManager } from "../services/voiceManager";

/**
 * 立绘点击互动层
 *
 * 覆盖在人物立绘舞台（相对定位容器）之上的透明交互层：
 * - 点击任意位置：在该位置播放涟漪扩散动画
 * - 同时角色从台词池中随机说一句简短回应（气泡显示约 2.6 秒）
 * - 如果该台词配置了语音文件，自动调用 voiceManager 播放
 * - 台词播放期间再次点击只出涟漪不重复说话，避免刷屏
 */

interface Ripple {
  id: number;
  x: number;
  y: number;
}

interface Speech {
  id: number;
  text: string;
}

/** 立绘点击热区：舞台百分比坐标矩形 + 专属台词池 */
export interface PortraitClickZone {
  /** 热区矩形（占舞台宽/高的百分比）：[left, top, right, bottom] */
  rect: [number, number, number, number];
  /** 点击该区域时的专属台词池 */
  lines: string[];
}

let rippleCounter = 0;

export function PortraitClickLayer({
  characterId,
  lines,
  zones = [],
  disabled = false,
  bubbleTop = "13%",
  bubbleAlign = "center",
}: {
  /** 角色 ID（用于语音匹配） */
  characterId?: string;
  /** 角色台词池（按角色与关系状态在外部选好传入） */
  lines: string[];
  /** 个性化点击热区（如裤子区域更娇羞），区域外使用 lines 随机 */
  zones?: PortraitClickZone[];
  /** 禁用交互（如剧情播放中需要静默时） */
  disabled?: boolean;
  /** 台词气泡距舞台顶部的垂直位置（不同立绘构图需错开脸部，默认 13%） */
  bubbleTop?: string;
  /** 台词气泡水平对齐方式（立绘偏侧时把气泡挪到空边，默认居中） */
  bubbleAlign?: "center" | "left" | "right";
}) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [speech, setSpeech] = useState<Speech | null>(null);
  const busyRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  // 卸载时清理所有定时器，防止内存泄漏与越界 setState
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // 1. 点击位置涟漪动画（最多同屏保留 4 个）
      rippleCounter += 1;
      const rippleId = rippleCounter;
      setRipples((prev) => [...prev.slice(-3), { id: rippleId, x, y }]);
      timersRef.current.push(
        window.setTimeout(() => {
          setRipples((prev) => prev.filter((r) => r.id !== rippleId));
        }, 650),
      );

      // 2. 台词气泡（播放期间不重复触发）
      if (busyRef.current) return;
      const pxPct = (x / rect.width) * 100;
      const pyPct = (y / rect.height) * 100;
      const zone = zones.find(
        (z) =>
          z.lines.length > 0 &&
          pxPct >= z.rect[0] &&
          pxPct <= z.rect[2] &&
          pyPct >= z.rect[1] &&
          pyPct <= z.rect[3],
      );
      const pool = zone ? zone.lines : lines;
      if (pool.length === 0) return;
      busyRef.current = true;
      const text = pool[Math.floor(Math.random() * pool.length)];
      rippleCounter += 1;
      const speechId = rippleCounter;
      setSpeech({ id: speechId, text });

      // 尝试自动播放对应的角色语音
      voiceManager.playVoiceByText(characterId, text);

      timersRef.current.push(
        window.setTimeout(() => {
          setSpeech((cur) => (cur && cur.id === speechId ? null : cur));
          busyRef.current = false;
        }, 2600),
      );
    },
    [characterId, lines, zones, disabled],
  );

  return (
    <div
      className="absolute inset-0 z-20 cursor-pointer select-none"
      onClick={handleClick}
      aria-hidden
    >
      {ripples.map((r) => (
        <span
          key={r.id}
          className="pointer-events-none absolute"
          style={{ left: r.x, top: r.y }}
        >
          <span className="portrait-ripple-ring" />
          <span className="portrait-ripple-core" />
        </span>
      ))}
      {speech && (
        <div
          key={speech.id}
          className={`absolute z-30 ${
            bubbleAlign === "left"
              ? "left-[4%] max-w-[28%]"
              : bubbleAlign === "right"
                ? "right-[4%] max-w-[28%]"
                : "left-1/2 max-w-[72%] -translate-x-1/2"
          }`}
          style={{ top: bubbleTop }}
        >
          <div
            className={`portrait-speech-bubble ${
              bubbleAlign === "left"
                ? "speech-tail-right"
                : bubbleAlign === "right"
                  ? "speech-tail-left"
                  : "speech-tail-bottom"
            } rounded-2xl border border-[#c9a84c]/35 bg-[#060c16]/88 px-4 py-2 text-center text-[13px] leading-relaxed text-amber-50 shadow-xl backdrop-blur-md`}
          >
            {speech.text}
          </div>
        </div>
      )}
    </div>
  );
}
