import React, { useRef, useEffect } from 'react';
import { Group, Circle, Text, RegularPolygon } from 'react-konva';
import Konva from 'konva';
import { BoardItem, ItemType, ToolMode } from '../types';

interface PlayerNodeProps {
  item: BoardItem;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => void;
  toolMode: ToolMode;
}

export const PlayerNode: React.FC<PlayerNodeProps> = ({
  item,
  isSelected,
  onSelect,
  onDragEnd,
  onDragMove,
  toolMode,
}) => {
  const shapeRef = useRef<Konva.Group>(null);
  const trRef = useRef<Konva.Transformer>(null);

  // Colors based on type
  const getFill = () => {
    switch (item.type) {
      case ItemType.HOME_PLAYER: return '#ef4444'; // Red-500
      case ItemType.AWAY_PLAYER: return '#3b82f6'; // Blue-500
      case ItemType.BALL: return '#ffffff';
      default: return '#999';
    }
  };

  const getStroke = () => {
    if (item.type === ItemType.BALL) return '#000000';
    return isSelected ? '#fbbf24' : '#ffffff'; // Amber-400 if selected
  };

  const getRadius = () => {
     if (item.type === ItemType.BALL) return 12; // Virtual units
     return 20; // Virtual units
  }

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  const radius = getRadius();
  const fontSize = 18;

  return (
    <>
      <Group
        ref={shapeRef}
        x={item.x}
        y={item.y}
        rotation={item.rotation}
        draggable={toolMode === ToolMode.SELECT}
        onClick={onSelect}
        onTap={onSelect}
        onDragStart={onSelect}
        onDragEnd={onDragEnd}
        onDragMove={onDragMove}
      >
        {/* Direction Indicator (Triangle) */}
        {item.type !== ItemType.BALL && (
            <RegularPolygon
                sides={3}
                radius={radius + 6}
                fill="rgba(255,255,255,0.4)"
                y={-(radius + 4)}
                rotation={0}
            />
        )}

        {/* Main Body */}
        <Circle
          radius={radius}
          fill={getFill()}
          stroke={getStroke()}
          strokeWidth={3}
          shadowColor="black"
          shadowBlur={5}
          shadowOpacity={0.3}
          shadowOffsetX={2}
          shadowOffsetY={2}
        />
        
        {/* Jersey Number */}
        {item.number && (
          <Text
            text={item.number.toString()}
            fontSize={fontSize}
            fontStyle="bold"
            fill="white"
            x={-radius}
            y={-radius}
            width={radius * 2}
            height={radius * 2}
            align="center"
            verticalAlign="middle"
            listening={false}
          />
        )}
      </Group>
    </>
  );
};