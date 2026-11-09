import type { StaticImageData } from "next/image";

export type SceneId = "overview" | "terminal" | "boarding" | "flight";

export type Phase = "Darat" | "Terminal" | "Boarding" | "Udara";

export interface Scene {
  id: SceneId;
  src: StaticImageData;
  alt: string;
}

/** A point in scene space. Every scene is drawn in a 2000 × 1116 coordinate box. */
export interface ScenePoint {
  x: number;
  y: number;
}

/** One camera keyframe in the scroll-driven flight through the airport. */
export interface CameraKey {
  scene: SceneId;
  focus: ScenePoint;
  zoom: number;
  /** rotateX in degrees — how far the ground plane leans away from the viewer */
  tilt: number;
  /** rotateZ in degrees — orbit around the focus point */
  spin: number;
}

export interface FlowStep extends CameraKey {
  id: string;
  code: string;
  zone: string;
  phase: Phase;
  title: string;
  body: string;
  duration: string;
  /** Location of the map pin to highlight */
  pin: ScenePoint;
}

export interface Zone {
  scene: SceneId;
  codes: string;
  title: string;
  body: string;
  items: string[];
}
