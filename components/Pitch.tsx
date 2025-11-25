import React from 'react';
import { Rect, Circle, Line, Group } from 'react-konva';

interface PitchProps {
  width: number;
  height: number;
}

export const Pitch: React.FC<PitchProps> = ({ width, height }) => {
  const lineColor = "rgba(255, 255, 255, 0.8)";
  const lineWidth = 3; // Slightly thicker for visibility
  
  // Use the passed width/height as the Virtual Resolution
  const padding = width * 0.05;
  const fieldWidth = width - (padding * 2);
  const fieldHeight = height - (padding * 2);
  
  const centerX = width / 2;
  const centerY = height / 2;
  
  const penaltyBoxHeight = fieldHeight * 0.4;
  const penaltyBoxWidth = fieldWidth * 0.16;
  const goalAreaHeight = fieldHeight * 0.2;
  const goalAreaWidth = fieldWidth * 0.06;

  return (
    <Group>
      {/* Grass Background */}
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="#2e8b57" // SeaGreen
      />
      
      {/* Striped Grass Effect */}
      {[...Array(10)].map((_, i) => (
        <Rect
          key={i}
          x={padding + (fieldWidth / 10) * i}
          y={padding}
          width={fieldWidth / 10}
          height={fieldHeight}
          fill={i % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'transparent'}
        />
      ))}

      {/* Outer Boundary */}
      <Rect
        x={padding}
        y={padding}
        width={fieldWidth}
        height={fieldHeight}
        stroke={lineColor}
        strokeWidth={lineWidth}
      />

      {/* Halfway Line */}
      <Line
        points={[centerX, padding, centerX, height - padding]}
        stroke={lineColor}
        strokeWidth={lineWidth}
      />

      {/* Center Circle */}
      <Circle
        x={centerX}
        y={centerY}
        radius={fieldHeight * 0.15}
        stroke={lineColor}
        strokeWidth={lineWidth}
      />
      
      {/* Center Spot */}
      <Circle
        x={centerX}
        y={centerY}
        radius={4}
        fill={lineColor}
      />

      {/* Left Penalty Area */}
      <Group>
        <Rect
          x={padding}
          y={centerY - penaltyBoxHeight / 2}
          width={penaltyBoxWidth}
          height={penaltyBoxHeight}
          stroke={lineColor}
          strokeWidth={lineWidth}
        />
        {/* Goal Area */}
        <Rect
          x={padding}
          y={centerY - goalAreaHeight / 2}
          width={goalAreaWidth}
          height={goalAreaHeight}
          stroke={lineColor}
          strokeWidth={lineWidth}
        />
        {/* Penalty Spot */}
        <Circle
          x={padding + (fieldWidth * 0.11)}
          y={centerY}
          radius={3}
          fill={lineColor}
        />
      </Group>

      {/* Right Penalty Area - Mirrored */}
      <Group scaleX={-1} x={width}>
        <Rect
          x={padding}
          y={centerY - penaltyBoxHeight / 2}
          width={penaltyBoxWidth}
          height={penaltyBoxHeight}
          stroke={lineColor}
          strokeWidth={lineWidth}
        />
        <Rect
          x={padding}
          y={centerY - goalAreaHeight / 2}
          width={goalAreaWidth}
          height={goalAreaHeight}
          stroke={lineColor}
          strokeWidth={lineWidth}
        />
        <Circle
          x={padding + (fieldWidth * 0.11)}
          y={centerY}
          radius={3}
          fill={lineColor}
        />
      </Group>

      {/* Corner Arcs */}
      <Group>
        <Circle x={padding} y={padding} radius={15} stroke={lineColor} strokeWidth={lineWidth} 
          clipFunc={(ctx) => ctx.rect(padding, padding, 30, 30)} />
        <Circle x={padding} y={height - padding} radius={15} stroke={lineColor} strokeWidth={lineWidth}
          clipFunc={(ctx) => ctx.rect(padding, height - padding - 30, 30, 30)} />
        <Circle x={width - padding} y={padding} radius={15} stroke={lineColor} strokeWidth={lineWidth}
          clipFunc={(ctx) => ctx.rect(width - padding - 30, padding, 30, 30)} />
        <Circle x={width - padding} y={height - padding} radius={15} stroke={lineColor} strokeWidth={lineWidth}
          clipFunc={(ctx) => ctx.rect(width - padding - 30, height - padding - 30, 30, 30)} />
      </Group>

    </Group>
  );
};