import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Transformer, Line, Arrow, Group } from 'react-konva';
import Konva from 'konva';
import { MousePointer2, Pen, Move, RotateCcw, PlusCircle, Eraser, Users } from 'lucide-react';
import { Pitch } from './components/Pitch';
import { PlayerNode } from './components/PlayerNode';
import { TrashZone } from './components/TrashZone';
import { BoardItem, ItemType, ToolMode, Drawing } from './types';

// Virtual Board Resolution (Logic coordinates)
// Standard Pitch Ratio approx 105:68. We use a high resolution for clarity.
const VIRTUAL_WIDTH = 1050;
const VIRTUAL_HEIGHT = 680;
const TRASH_SIZE = 60;

const App: React.FC = () => {
  // --- State ---
  // Container size (Window/Viewport)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  
  const [items, setItems] = useState<BoardItem[]>([]);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toolMode, setToolMode] = useState<ToolMode>(ToolMode.SELECT);
  const [drawingColor, setDrawingColor] = useState('#fbbf24');
  const [homeCount, setHomeCount] = useState(1);
  const [awayCount, setAwayCount] = useState(1);
  const [isTrashActive, setIsTrashActive] = useState(false);

  // --- Refs ---
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const isDrawing = useRef(false);
  const currentLineId = useRef<string | null>(null);

  // --- Responsive Logic ---
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerSize({
            width: containerRef.current.offsetWidth,
            height: containerRef.current.offsetHeight
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Init

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate Scale Factor to fit the VIRTUAL board into the CONTAINER
  // We want 'contain' behavior (show whole pitch)
  const scale = Math.min(
    containerSize.width / VIRTUAL_WIDTH,
    containerSize.height / VIRTUAL_HEIGHT
  ) || 0.1; // Fallback to avoid division by zero issues

  // Center the board
  const boardX = (containerSize.width - VIRTUAL_WIDTH * scale) / 2;
  const boardY = (containerSize.height - VIRTUAL_HEIGHT * scale) / 2;

  // --- Helpers ---
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Convert Screen Point to Virtual Point
  const getVirtualPoint = (stage: Konva.Stage) => {
      const pointer = stage.getPointerPosition();
      if (!pointer) return null;
      return {
          x: (pointer.x - boardX) / scale,
          y: (pointer.y - boardY) / scale
      };
  };

  const addItem = (type: ItemType) => {
    let number: number | undefined;

    if (type === ItemType.HOME_PLAYER) {
        number = homeCount;
        setHomeCount(prev => prev < 99 ? prev + 1 : 1);
    } else if (type === ItemType.AWAY_PLAYER) {
        number = awayCount;
        setAwayCount(prev => prev < 99 ? prev + 1 : 1);
    }

    const newItem: BoardItem = {
      id: generateId(),
      type,
      x: VIRTUAL_WIDTH / 2 + (Math.random() * 100 - 50),
      y: VIRTUAL_HEIGHT / 2 + (Math.random() * 100 - 50),
      rotation: 0,
      number
    };
    setItems([...items, newItem]);
    setToolMode(ToolMode.SELECT);
  };

  const handleDragEnd = (id: string, e: Konva.KonvaEventObject<DragEvent>) => {
    // Trash Check: Need Absolute Position because Trash is in Screen Space
    const absPos = e.target.getAbsolutePosition();
    const trashX = containerSize.width - TRASH_SIZE - 20;
    const trashY = containerSize.height - TRASH_SIZE - 20;
    
    // Check intersection with Trash Icon in Screen Space (with buffer)
    if (
        absPos.x > trashX - 30 && absPos.x < trashX + TRASH_SIZE + 30 &&
        absPos.y > trashY - 30 && absPos.y < trashY + TRASH_SIZE + 30
    ) {
        setItems(items.filter(i => i.id !== id));
        if (selectedId === id) setSelectedId(null);
        setIsTrashActive(false);
        return;
    }

    // Update state with Virtual Coordinates
    // e.target.x() refers to the position relative to the parent Group (which is scaled).
    // This matches our virtual coordinate system perfectly.
    setItems(prevItems => prevItems.map((item) => {
        if (item.id === id) {
             return { 
                 ...item, 
                 x: e.target.x(),
                 y: e.target.y(),
                 rotation: e.target.rotation(),
             };
        }
        return item;
    }));
    setIsTrashActive(false);
  };

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
       const absPos = e.target.getAbsolutePosition();
       const trashX = containerSize.width - TRASH_SIZE - 20;
       const trashY = containerSize.height - TRASH_SIZE - 20;

       if (
           absPos.x > trashX - 30 && absPos.x < trashX + TRASH_SIZE + 30 &&
           absPos.y > trashY - 30 && absPos.y < trashY + TRASH_SIZE + 30
       ) {
           setIsTrashActive(true);
       } else {
           setIsTrashActive(false);
       }
  }

  // --- Drawing Logic ---
  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    
    // Deselect if clicking on empty area (Stage or Pitch background)
    // We check if the target has a name 'pitch-bg' or if it is the stage itself
    const isBackground = e.target === stage || e.target.attrs.name === 'pitch-bg';
    if (isBackground) {
      setSelectedId(null);
    }

    if (toolMode === ToolMode.SELECT) return;

    // Start drawing
    isDrawing.current = true;
    const pos = getVirtualPoint(stage);
    if (!pos) return;

    const id = generateId();
    currentLineId.current = id;

    const newDrawing: Drawing = {
      id,
      tool: toolMode as ToolMode.PEN | ToolMode.ARROW,
      points: [pos.x, pos.y],
      color: drawingColor,
      strokeWidth: 4, // Slightly thicker for visibility
    };

    setDrawings([...drawings, newDrawing]);
  };

  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!isDrawing.current || !currentLineId.current) return;

    const stage = e.target.getStage();
    if (!stage) return;
    const point = getVirtualPoint(stage);
    if (!point) return;

    setDrawings((prevDrawings) =>
      prevDrawings.map((layer) => {
        if (layer.id === currentLineId.current) {
            if (layer.tool === ToolMode.ARROW) {
                // For arrow, we only keep start point and update end point
                return { ...layer, points: [layer.points[0], layer.points[1], point.x, point.y] };
            } else {
                // For pen, we append points
                return { ...layer, points: [...layer.points, point.x, point.y] };
            }
        }
        return layer;
      })
    );
  };

  const handleStageMouseUp = () => {
    isDrawing.current = false;
    currentLineId.current = null;
  };

  // --- Transformer Sync ---
  useEffect(() => {
    if (selectedId && transformerRef.current && stageRef.current) {
        // We look for the node inside the stage. 
        // Since we are scaling the Group, not the Stage, finding by ID works fine.
        const selectedNode = stageRef.current.findOne('.' + selectedId);
        if (selectedNode) {
            transformerRef.current.nodes([selectedNode]);
            transformerRef.current.getLayer()?.batchDraw();
        } else {
            transformerRef.current.nodes([]);
        }
    }
  }, [selectedId, items]);

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* --- Toolbar --- */}
      <header className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 z-10 shrink-0">
        <div className="flex items-center space-x-2">
           <div className="bg-green-600 p-2 rounded-lg">
             <Users size={20} className="text-white" />
           </div>
           <h1 className="text-xl font-bold text-white hidden md:block">Tactical<span className="text-green-500">Board</span></h1>
        </div>

        {/* Tools */}
        <div className="flex items-center space-x-1 md:space-x-2 bg-slate-700 p-1 rounded-lg overflow-x-auto max-w-[60vw]">
           {/* Mode Toggles */}
           <button 
             onClick={() => setToolMode(ToolMode.SELECT)}
             className={`p-2 rounded ${toolMode === ToolMode.SELECT ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-600'}`}
             title="Move Mode"
           >
             <MousePointer2 size={20} />
           </button>
           <div className="w-px h-6 bg-slate-600 mx-1"></div>
           
           <button 
             onClick={() => setToolMode(ToolMode.PEN)}
             className={`p-2 rounded ${toolMode === ToolMode.PEN ? 'bg-amber-500 text-slate-900 shadow-lg' : 'text-slate-300 hover:bg-slate-600'}`}
             title="Freehand"
           >
             <Pen size={20} />
           </button>
           <button 
             onClick={() => setToolMode(ToolMode.ARROW)}
             className={`p-2 rounded ${toolMode === ToolMode.ARROW ? 'bg-amber-500 text-slate-900 shadow-lg' : 'text-slate-300 hover:bg-slate-600'}`}
             title="Arrow"
           >
             <Move size={20} />
           </button>

           <div className="w-px h-6 bg-slate-600 mx-1"></div>

           {/* Color Picker */}
           <div className="flex space-x-1 px-1">
              {['#fbbf24', '#ef4444', '#3b82f6', '#ffffff'].map(c => (
                  <button
                    key={c}
                    onClick={() => setDrawingColor(c)}
                    className={`w-6 h-6 rounded-full border-2 ${drawingColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
              ))}
           </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
            <button 
                onClick={() => setDrawings([])}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                title="Clear Drawings"
            >
                <Eraser size={20} />
            </button>
            <button 
                onClick={() => { setItems([]); setDrawings([]); setHomeCount(1); setAwayCount(1); }}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                title="Reset Board"
            >
                <RotateCcw size={20} />
            </button>
        </div>
      </header>

      {/* --- Main Content --- */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Floating Sidebar for Players */}
        <div className="absolute left-4 top-4 z-20 flex flex-col space-y-3 bg-slate-800/90 backdrop-blur p-3 rounded-xl border border-slate-700 shadow-2xl safe-area-left">
            <button 
                onClick={() => addItem(ItemType.HOME_PLAYER)}
                className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-400 shadow-lg flex items-center justify-center border-2 border-slate-800 group relative transition-transform hover:scale-110 active:scale-95"
            >
                <span className="font-bold text-white text-lg">{homeCount}</span>
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                    <PlusCircle size={12} className="text-red-500" />
                </div>
            </button>
            <button 
                onClick={() => addItem(ItemType.AWAY_PLAYER)}
                className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-400 shadow-lg flex items-center justify-center border-2 border-slate-800 group relative transition-transform hover:scale-110 active:scale-95"
            >
                <span className="font-bold text-white text-lg">{awayCount}</span>
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                    <PlusCircle size={12} className="text-blue-500" />
                </div>
            </button>
             <button 
                onClick={() => addItem(ItemType.BALL)}
                className="w-12 h-12 rounded-full bg-white hover:bg-slate-200 shadow-lg flex items-center justify-center border-2 border-slate-800 relative transition-transform hover:scale-110 active:scale-95"
            >
                <div className="w-8 h-8 rounded-full border-2 border-black relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-black/10"></div>
                </div>
                <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5">
                     <PlusCircle size={12} className="text-white" />
                </div>
            </button>
        </div>

        {/* Canvas Area */}
        <div ref={containerRef} className="flex-1 bg-slate-900 relative touch-none cursor-crosshair">
          <Stage
            ref={stageRef}
            width={containerSize.width}
            height={containerSize.height}
            onMouseDown={handleStageMouseDown}
            onMouseMove={handleStageMouseMove}
            onMouseUp={handleStageMouseUp}
            onTouchStart={handleStageMouseDown}
            onTouchMove={handleStageMouseMove}
            onTouchEnd={handleStageMouseUp}
          >
            {/* 
                Game World Group 
                This group contains the pitch, players, and drawings.
                It is scaled and positioned to fit the screen.
            */}
            <Layer>
                <Group 
                    x={boardX} 
                    y={boardY} 
                    scaleX={scale} 
                    scaleY={scale}
                >
                    {/* Background used for click detection */}
                    <Pitch width={VIRTUAL_WIDTH} height={VIRTUAL_HEIGHT} />

                    {/* Drawings */}
                    {drawings.map((line) => (
                        line.tool === ToolMode.ARROW ? (
                            <Arrow
                                key={line.id}
                                points={line.points}
                                stroke={line.color}
                                strokeWidth={line.strokeWidth}
                                fill={line.color}
                                pointerLength={15}
                                pointerWidth={15}
                                tension={0}
                                lineCap="round"
                                lineJoin="round"
                            />
                        ) : (
                            <Line
                                key={line.id}
                                points={line.points}
                                stroke={line.color}
                                strokeWidth={line.strokeWidth}
                                tension={0.5}
                                lineCap="round"
                                lineJoin="round"
                            />
                        )
                    ))}

                    {/* Players */}
                    {items.map((item) => (
                        <Group 
                            key={item.id} 
                            name={item.id} // Used for Transformer finding
                        >
                            <PlayerNode
                                item={item}
                                isSelected={item.id === selectedId}
                                onSelect={() => {
                                    if (toolMode === ToolMode.SELECT) {
                                        setSelectedId(item.id);
                                    }
                                }}
                                onDragEnd={(e) => handleDragEnd(item.id, e)}
                                onDragMove={handleDragMove}
                                toolMode={toolMode}
                            />
                        </Group>
                    ))}
                    
                    {/* Transformer acts on nodes inside this group, so it inherits the scale automatically? 
                        Konva Transformer usually attaches to the node. If the node is scaled, transformer handles it.
                    */}
                    <Transformer
                        ref={transformerRef}
                        boundBoxFunc={(oldBox, newBox) => {
                            if (newBox.width < 5 || newBox.height < 5) return oldBox;
                            return newBox;
                        }}
                        enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
                        rotateEnabled={true}
                        resizeEnabled={false} // Keep players constant size
                        anchorSize={10}
                    />
                </Group>
            </Layer>

             {/* UI Layer (Unscaled, Screen Coordinates) */}
             <Layer>
                <TrashZone 
                    x={containerSize.width - TRASH_SIZE - 20} 
                    y={containerSize.height - TRASH_SIZE - 20}
                    width={TRASH_SIZE}
                    height={TRASH_SIZE}
                    isActive={isTrashActive}
                />
             </Layer>

          </Stage>
          
          {/* Helper Overlay */}
          {items.length === 0 && (
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <div className="bg-slate-900/60 text-white p-4 rounded-xl backdrop-blur-md border border-slate-700 shadow-2xl">
                    <p className="text-center font-bold text-lg">Welcome to TacticalBoard Pro</p>
                    <p className="text-center text-sm text-slate-300 mt-2">1. Add players using the left buttons.</p>
                    <p className="text-center text-sm text-slate-300">2. Select "Pen" or "Arrow" to draw.</p>
                    <p className="text-center text-sm text-slate-300">3. Drag players to the trash bin to delete.</p>
                 </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;