/**
 * TMAP jsv2 준비 판정 회귀 테스트
 *
 * 실제 버그: `window.Tmapv2`가 올라온 직후 지도를 만들었더니
 * `T.LatLng is not a constructor`로 터졌다. jsv2는 스크립트 onload 이후에도
 * 네임스페이스를 비동기로 채우므로, **필요한 생성자가 전부 함수일 때만**
 * 준비된 것으로 봐야 한다.
 */
import { describe, expect, it } from "vitest";

import { isTmapReady } from "@/components/tmap-sdk";

const ctor = () => function Fake() {};

/** 실제로 쓰는 생성자 전부 */
function fullNamespace(): Record<string, unknown> {
  return {
    Map: ctor(),
    LatLng: ctor(),
    LatLngBounds: ctor(),
    Marker: ctor(),
    Polyline: ctor(),
    InfoWindow: ctor(),
    Size: ctor(),
  };
}

describe("isTmapReady", () => {
  it("필요한 생성자가 전부 있으면 준비된 것으로 본다", () => {
    expect(isTmapReady(fullNamespace())).toBe(true);
  });

  it("SDK가 추가 멤버를 더 갖고 있어도 준비된 것으로 본다", () => {
    expect(isTmapReady({ ...fullNamespace(), Point: ctor(), extras: 1 })).toBe(true);
  });

  it.each(["Map", "LatLng", "LatLngBounds", "Marker", "Polyline", "InfoWindow", "Size"])(
    "%s가 아직 없으면 준비되지 않은 것으로 본다",
    (missing) => {
      const ns = fullNamespace();
      delete ns[missing];
      expect(isTmapReady(ns)).toBe(false);
    }
  );

  it("멤버가 함수가 아니면 준비되지 않은 것으로 본다 — 실제 버그 재현", () => {
    // 로딩 중간 상태: 네임스페이스 객체는 있지만 LatLng이 아직 생성자가 아니다
    const partial = { ...fullNamespace(), LatLng: undefined };
    expect(isTmapReady(partial)).toBe(false);

    const placeholder = { ...fullNamespace(), LatLng: {} };
    expect(isTmapReady(placeholder)).toBe(false);
  });

  it("빈 객체·null·원시값은 준비되지 않은 것으로 본다", () => {
    expect(isTmapReady({})).toBe(false);
    expect(isTmapReady(null)).toBe(false);
    expect(isTmapReady(undefined)).toBe(false);
    expect(isTmapReady("Tmapv2")).toBe(false);
  });
});
