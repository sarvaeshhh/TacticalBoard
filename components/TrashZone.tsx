import React from 'react';
import { Rect, Group, Image as KonvaImage } from 'react-konva';
import useImage from 'use-image';

// Simple trash icon as base64 or shape
// We will use a shape group for simplicity and reliability without external assets

interface TrashZoneProps {
    x: number;
    y: number;
    width: number;
    height: number;
    isActive: boolean;
}

export const TrashZone: React.FC<TrashZoneProps> = ({ x, y, width, height, isActive }) => {
    return (
        <Group x={x} y={y}>
            <Rect 
                width={width}
                height={height}
                fill={isActive ? "rgba(239, 68, 68, 0.5)" : "rgba(0,0,0,0.2)"}
                cornerRadius={10}
                stroke={isActive ? "red" : "transparent"}
                strokeWidth={2}
            />
            {/* Simple Trash Icon shape */}
            <Group x={width/2 - 12} y={height/2 - 14} opacity={0.8}>
                {/* Lid */}
                <Rect x={2} y={0} width={20} height={4} fill="white" cornerRadius={2} />
                <Rect x={7} y={-3} width={10} height={3} fill="white" cornerRadius={1} />
                {/* Bin */}
                <Rect x={4} y={6} width={16} height={20} fill="white" cornerRadius={2} />
                {/* Lines */}
                <Rect x={8} y={10} width={2} height={12} fill="#ef4444" />
                <Rect x={14} y={10} width={2} height={12} fill="#ef4444" />
            </Group>
        </Group>
    )
}