"use client";

/**
 * TMAP Map JS(jsv2) SDK 로더 (FR-28)
 *
 * 지도 SDK는 브라우저에서 App Key를 쿼리스트링에 실어 부른다. 서버 프록시로 감쌀 수 없으므로
 * **운영 키(TMAP_APP_KEY)와 분리된 별도 웹 키**를 쓰고, SK open API 콘솔에서 도메인 제한을 건다.
 * 키가 없거나 로딩에 실패하면 지도는 내장 SVG로 되돌아간다 — 배차 자체는 영향받지 않는다.
 */

import { useSyncExternalStore } from "react";

export const TMAP_WEB_KEY = process.env.NEXT_PUBLIC_TMAP_WEB_KEY ?? "";

export type SdkStatus = "disabled" | "loading" | "ready" | "error";

const SCRIPT_ID = "tmap-jsv2";

// ─────────────────────────────────────────────────────────────
// jsv2 최소 타입 — SDK가 전역 `Tmapv2`로 올라온다
// ─────────────────────────────────────────────────────────────

export interface TmapLatLng {
  _lat: number;
  _lng: number;
}

export interface TmapMarker {
  setMap(map: unknown | null): void;
  addListener(event: string, handler: () => void): void;
}

export interface TmapPolyline {
  setMap(map: unknown | null): void;
}

export interface TmapInfoWindow {
  setMap(map: unknown | null): void;
  setVisible(v: boolean): void;
}

export interface TmapMapInstance {
  fitBounds(bounds: unknown): void;
  setCenter(latlng: TmapLatLng): void;
  setZoom(z: number): void;
  destroy?(): void;
  addListener(event: string, handler: () => void): void;
}

export interface TmapBounds {
  extend(latlng: TmapLatLng): void;
}

export interface Tmapv2Namespace {
  Map: new (
    el: string | HTMLElement,
    opts: Record<string, unknown>
  ) => TmapMapInstance;
  LatLng: new (lat: number, lng: number) => TmapLatLng;
  LatLngBounds: new () => TmapBounds;
  Marker: new (opts: Record<string, unknown>) => TmapMarker;
  Polyline: new (opts: Record<string, unknown>) => TmapPolyline;
  InfoWindow: new (opts: Record<string, unknown>) => TmapInfoWindow;
  Size: new (w: number, h: number) => unknown;
  Point: new (x: number, y: number) => unknown;
}

declare global {
  interface Window {
    Tmapv2?: Tmapv2Namespace;
  }
}

/**
 * 실제로 쓰는 생성자 목록.
 * jsv2는 스크립트 `onload` 이후에도 네임스페이스를 **비동기로 채운다**.
 * `window.Tmapv2`가 있다는 것만으로 준비됐다고 보면
 * `T.LatLng is not a constructor` 런타임 오류가 난다.
 */
const REQUIRED_MEMBERS = [
  "Map",
  "LatLng",
  "LatLngBounds",
  "Marker",
  "Polyline",
  "InfoWindow",
  "Size",
] as const;

/** 필요한 생성자가 전부 올라왔는지 확인한다 */
export function isTmapReady(ns: unknown): ns is Tmapv2Namespace {
  if (!ns || typeof ns !== "object") return false;
  const o = ns as Record<string, unknown>;
  return REQUIRED_MEMBERS.every((k) => typeof o[k] === "function");
}

/** 쓸 준비가 된 네임스페이스만 돌려준다. 아직 채워지는 중이면 null. */
export function getTmap(): Tmapv2Namespace | null {
  if (typeof window === "undefined") return null;
  return isTmapReady(window.Tmapv2) ? window.Tmapv2 : null;
}

/** 아직 준비되지 않은 멤버 이름 — 오류 메시지에 쓴다 */
function missingMembers(): string[] {
  const o = (typeof window === "undefined" ? undefined : window.Tmapv2) as
    | Record<string, unknown>
    | undefined;
  if (!o) return [...REQUIRED_MEMBERS];
  return REQUIRED_MEMBERS.filter((k) => typeof o[k] !== "function");
}

// ─────────────────────────────────────────────────────────────
// 로더
// ─────────────────────────────────────────────────────────────

let loadPromise: Promise<void> | null = null;

function loadSdk(key: string): Promise<void> {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    if (getTmap()) {
      resolve();
      return;
    }

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    const script = existing ?? document.createElement("script");

    /**
     * 스크립트가 내려왔다고 바로 쓸 수 있는 게 아니다.
     * jsv2는 추가 리소스를 더 받아 네임스페이스를 점진적으로 채우므로,
     * **필요한 생성자가 전부 올라올 때까지** 폴링한다.
     */
    const POLL_MS = 100;
    const POLL_LIMIT = 150; // 최대 15초

    const settle = () => {
      let tries = 0;
      const tick = () => {
        if (getTmap()) {
          resolve();
          return;
        }
        if (++tries > POLL_LIMIT) {
          reject(
            new Error(
              `TMAP SDK 초기화가 끝나지 않았습니다 (대기 ${Math.round(
                (POLL_LIMIT * POLL_MS) / 1000
              )}초) — 준비되지 않은 항목: ${missingMembers().join(", ")}`
            )
          );
          return;
        }
        setTimeout(tick, POLL_MS);
      };
      tick();
    };

    script.onerror = () =>
      reject(
        new Error(
          "TMAP 지도 SDK를 불러오지 못했습니다 — 웹 키가 유효한지, 도메인 제한에 현재 주소가 포함됐는지 확인하십시오"
        )
      );

    if (existing) {
      // HMR·재마운트로 스크립트가 이미 있으면 onload는 다시 울리지 않는다
      script.onload = settle;
      settle();
    } else {
      script.onload = settle;
      script.id = SCRIPT_ID;
      script.async = true;
      script.src = `https://apis.openapi.sk.com/tmap/jsv2?version=1&appKey=${encodeURIComponent(key)}`;
      document.head.appendChild(script);
    }
  });

  return loadPromise;
}

export interface SdkState {
  status: SdkStatus;
  error: string | null;
}

/**
 * SDK 로딩 상태는 React 바깥(전역 스크립트)에 있으므로 모듈 스토어에 두고
 * `useSyncExternalStore`로 읽는다. effect 안에서 setState를 부르지 않아도 되고,
 * 여러 지도 인스턴스가 상태를 공유한다.
 */
const DISABLED: SdkState = { status: "disabled", error: null };
const LOADING: SdkState = { status: "loading", error: null };
const READY: SdkState = { status: "ready", error: null };

let state: SdkState = TMAP_WEB_KEY ? LOADING : DISABLED;
const listeners = new Set<() => void>();

function publish(next: SdkState): void {
  state = next;
  for (const l of listeners) l();
}

let started = false;

function ensureLoad(): void {
  if (started || !TMAP_WEB_KEY) return;
  started = true;

  if (getTmap()) {
    publish(READY);
    return;
  }

  loadSdk(TMAP_WEB_KEY)
    .then(() => publish(READY))
    .catch((e: unknown) => {
      // 다음 시도를 위해 캐시를 비운다
      loadPromise = null;
      started = false;
      publish({
        status: "error",
        error: e instanceof Error ? e.message : String(e),
      });
    });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  ensureLoad();
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = (): SdkState => state;
/** 서버 렌더에서는 항상 같은 객체를 돌려줘야 무한 루프가 나지 않는다 */
const getServerSnapshot = (): SdkState => (TMAP_WEB_KEY ? LOADING : DISABLED);

/** 웹 키가 있으면 jsv2를 한 번만 로드한다. 키가 없으면 곧바로 disabled. */
export function useTmapSdk(): SdkState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
