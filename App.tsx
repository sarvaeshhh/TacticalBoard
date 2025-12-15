import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Transformer, Line, Arrow, Group } from 'react-konva';
import Konva from 'konva';
import { MousePointer2, Pen, Move, RotateCcw, Eraser, Undo2, Redo2 } from 'lucide-react';
import { Pitch } from './components/Pitch';
import { PlayerNode } from './components/PlayerNode';
import { TrashZone } from './components/TrashZone';
import { BoardItem, ItemType, ToolMode, Drawing } from './types';
import './global.css';

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

  // --- History State ---
  const [history, setHistory] = useState<{ items: BoardItem[], drawings: Drawing[] }[]>([
    { items: [], drawings: [] }
  ]);
  const [historyStep, setHistoryStep] = useState(0);

  // --- Refs ---
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const isDrawing = useRef(false);
  const currentLineId = useRef<string | null>(null);

  // --- Orientation Lock and Responsive Logic ---
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }

      // Check if we're in portrait and lock to landscape if possible
      if (window.innerWidth < window.innerHeight && window.screen && window.screen.orientation) {
        // Attempt to lock to landscape if currently in portrait
        window.screen.orientation.lock('landscape').catch(() => {
          // If landscape lock fails, try alternatives
          window.screen.orientation.lock('landscape-primary').catch(() => {
            window.screen.orientation.lock('landscape-secondary').catch(() => {
              console.warn('Screen orientation lock not supported or permission denied');
            });
          });
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Init

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- History Logic ---
  const addToHistory = (newItems: BoardItem[], newDrawings: Drawing[]) => {
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push({ items: newItems, drawings: newDrawings });
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyStep === 0) return;
    const prevStep = historyStep - 1;
    const content = history[prevStep];
    setItems(content.items);
    setDrawings(content.drawings);
    setHistoryStep(prevStep);
  };

  const handleRedo = () => {
    if (historyStep === history.length - 1) return;
    const nextStep = historyStep + 1;
    const content = history[nextStep];
    setItems(content.items);
    setDrawings(content.drawings);
    setHistoryStep(nextStep);
  };


  // Calculate Scale Factor to fit the VIRTUAL board into the CONTAINER
  // We want 'contain' behavior (show whole pitch) with padding for mobile
  const scale = Math.min(
    containerSize.width / VIRTUAL_WIDTH,
    containerSize.height / VIRTUAL_HEIGHT
  ) * 0.95; // Small padding to ensure full visibility
  // Fallback to avoid division by zero issues
  const safeScale = scale || 0.1;

  // Center the board
  const boardX = Math.max(0, (containerSize.width - VIRTUAL_WIDTH * safeScale) / 2);
  const boardY = Math.max(0, (containerSize.height - VIRTUAL_HEIGHT * safeScale) / 2);

  // --- Helpers ---
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Convert Screen Point to Virtual Point
  const getVirtualPoint = (stage: Konva.Stage) => {
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;
    return {
      x: (pointer.x - boardX) / safeScale,
      y: (pointer.y - boardY) / safeScale
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
    const newItems = [...items, newItem];
    setItems(newItems);
    addToHistory(newItems, drawings);
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
    // Update state with Virtual Coordinates
    // e.target.x() refers to the position relative to the parent Group (which is scaled).
    // This matches our virtual coordinate system perfectly.
    const newItems = items.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          x: e.target.x(),
          y: e.target.y(),
          rotation: e.target.rotation(),
        };
      }
      return item;
    });
    setItems(newItems);
    addToHistory(newItems, drawings);
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
    if (isDrawing.current) {
      isDrawing.current = false;
      currentLineId.current = null;
      addToHistory(items, drawings); // Save state after drawing finishes
    }
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
      {/* --- Floating Top Bar --- */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 md:gap-3 px-2 py-1 md:py-2 bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl shadow-black/50 max-w-[95vw] overflow-x-auto no-scrollbar">

        {/* Logo / Brand */}
        <div className="flex items-center justify-center p-2 mr-1 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 shadow-inner group">
          <svg className="w-6 h-6 text-emerald-500 transition-transform duration-500 group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
          </svg>
        </div>

        {/* Separator */}
        <div className="w-px h-8 bg-slate-700/50 mx-1"></div>

        {/* Main Tools Group */}
        <div className="flex items-center gap-1 bg-slate-800/50 p-1 rounded-xl border border-slate-700/30">
          <button
            onClick={() => setToolMode(ToolMode.SELECT)}
            className={`p-2.5 rounded-lg transition-all duration-200 relative group overflow-hidden ${toolMode === ToolMode.SELECT ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
            title="Select & Move"
          >
            <div className={`absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 ${toolMode === ToolMode.SELECT ? 'opacity-100' : ''}`} />
            <MousePointer2 size={20} className={`relative z-10 transition-transform duration-200 ${toolMode === ToolMode.SELECT ? 'scale-110' : 'group-hover:scale-110'}`} />
          </button>

          <button
            onClick={() => setToolMode(ToolMode.PEN)}
            className={`p-2.5 rounded-lg transition-all duration-200 relative group overflow-hidden ${toolMode === ToolMode.PEN ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
            title="Freehand Draw"
          >
            <div className={`absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 ${toolMode === ToolMode.PEN ? 'opacity-100' : ''}`} />
            <Pen size={20} className={`relative z-10 transition-transform duration-200 ${toolMode === ToolMode.PEN ? 'scale-110' : 'group-hover:scale-110'}`} />
          </button>

          <button
            onClick={() => setToolMode(ToolMode.ARROW)}
            className={`p-2.5 rounded-lg transition-all duration-200 relative group overflow-hidden ${toolMode === ToolMode.ARROW ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
            title="Draw Arrow"
          >
            <div className={`absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 ${toolMode === ToolMode.ARROW ? 'opacity-100' : ''}`} />
            <Move size={20} className={`relative z-10 transition-transform duration-200 ${toolMode === ToolMode.ARROW ? 'scale-110' : 'group-hover:scale-110'}`} />
          </button>
        </div>

        {/* Separator */}
        <div className="w-px h-8 bg-slate-700/50 mx-1"></div>

        {/* Color Picker */}
        <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-800/50 rounded-xl border border-slate-700/30">
          {['#fbbf24', '#ef4444', '#3b82f6', '#ffffff'].map(c => (
            <button
              key={c}
              onClick={() => setDrawingColor(c)}
              className={`w-6 h-6 rounded-full transition-all duration-300 ${drawingColor === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900 shadow-lg' : 'hover:scale-110 opacity-70 hover:opacity-100'}`}
              style={{ backgroundColor: c, boxShadow: drawingColor === c ? `0 0 10px ${c}` : 'none' }}
              title={`Color: ${c}`}
            />
          ))}
        </div>

        {/* Separator */}
        <div className="w-px h-8 bg-slate-700/50 mx-1"></div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Undo / Redo */}
          <div className="flex items-center gap-0.5 mr-2 bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/50">
            <button
              onClick={handleUndo}
              disabled={historyStep === 0}
              className={`p-2 rounded-md transition-all ${historyStep === 0 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:text-white hover:bg-slate-700'}`}
              title="Undo"
            >
              <Undo2 size={18} />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyStep === history.length - 1}
              className={`p-2 rounded-md transition-all ${historyStep === history.length - 1 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:text-white hover:bg-slate-700'}`}
              title="Redo"
            >
              <Redo2 size={18} />
            </button>
          </div>


          <button
            onClick={() => setDrawings([])}
            className="p-2.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200 group relative overflow-hidden"
            title="Clear Drawings"
          >
            <div className="absolute inset-0 bg-red-500/0 group-hover:bg-red-500/10 transition-colors duration-300" />
            <Eraser size={20} className="relative z-10 transition-transform duration-300 group-hover:rotate-12" />
          </button>
          <button
            onClick={() => { setItems([]); setDrawings([]); setHomeCount(1); setAwayCount(1); }}
            className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200 group relative overflow-hidden"
            title="Reset Board"
          >
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-300" />
            <RotateCcw size={20} className="relative z-10 transition-transform duration-500 group-hover:-rotate-180" />
          </button>
        </div>

      </div>

      {/* --- Main Content --- */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* Floating Sidebar for Players */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-40 flex flex-col space-y-3 bg-slate-900/90 backdrop-blur-xl p-3 rounded-2xl border border-slate-700/50 shadow-2xl shadow-black/50">
          {/* Section Label */}
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center px-2">Players</div>

          {/* Home Player Button */}
          <div className="relative group">
            <button
              onClick={() => addItem(ItemType.HOME_PLAYER)}
              className="w-16 h-16 rounded-full bg-[#ef4444] hover:bg-[#f87171] shadow-lg flex items-center justify-center border-2 border-white/30 relative transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-red-500/60"
            >
              <span className="font-bold text-white text-xl drop-shadow-md">{homeCount}</span>
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md">
                <svg className="w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </button>
            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg border border-slate-600 hidden md:block">
              Add Home Player
            </div>
          </div>

          {/* Away Player Button */}
          <div className="relative group">
            <button
              onClick={() => addItem(ItemType.AWAY_PLAYER)}
              className="w-16 h-16 rounded-full bg-[#3b82f6] hover:bg-[#60a5fa] shadow-lg flex items-center justify-center border-2 border-white/30 relative transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-blue-500/60"
            >
              <span className="font-bold text-white text-xl drop-shadow-md">{awayCount}</span>
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md">
                <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </button>
            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg border border-slate-600 hidden md:block">
              Add Away Player
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-slate-500/50 to-transparent my-1"></div>

          {/* Ball Button */}
          <div className="relative group">
            <button
              onClick={() => addItem(ItemType.BALL)}
              className="w-16 h-16 rounded-full bg-white hover:bg-slate-100 shadow-lg flex items-center justify-center border-2 border-slate-900 relative transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-xl"
            >
              {/* Ball with exact same appearance as on pitch */}
              <div className="w-11 h-11 rounded-full border-[3px] border-black relative">
                <div className="absolute inset-0 bg-white"></div>
              </div>
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-1 shadow-md">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </button>
            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg border border-slate-600 hidden md:block">
              Add Ball
            </div>
          </div>
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
                scaleX={safeScale}
                scaleY={safeScale}
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