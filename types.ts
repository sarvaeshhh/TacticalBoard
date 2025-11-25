export enum ItemType {
  HOME_PLAYER = 'HOME',
  AWAY_PLAYER = 'AWAY',
  BALL = 'BALL',
}

export enum ToolMode {
  SELECT = 'SELECT',
  PEN = 'PEN',
  ARROW = 'ARROW',
}

export interface BoardItem {
  id: string;
  type: ItemType;
  x: number;
  y: number;
  rotation: number;
  number?: number; // Jersey number
}

export interface Drawing {
  id: string;
  tool: ToolMode.PEN | ToolMode.ARROW;
  points: number[];
  color: string;
  strokeWidth: number;
}

export interface StageSize {
  width: number;
  height: number;
  scale: number;
}