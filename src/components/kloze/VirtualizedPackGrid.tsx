import { memo, useRef, useEffect } from "react";
import { FixedSizeGrid as Grid, GridChildComponentProps } from "react-window";
import { PackCard } from "./PackCard";

interface VirtualizedPackGridProps {
  packs: any[];
  likedPackIds: Set<string>;
  onLike: (id: string) => void;
  columnCount?: number;
  rowHeight?: number;
  containerHeight?: number;
}

// Cell renderer for react-window
const Cell = memo(({ columnIndex, rowIndex, style, data }: GridChildComponentProps) => {
  const { packs, columnCount, likedPackIds, onLike } = data;
  const index = rowIndex * columnCount + columnIndex;

  if (index >= packs.length) {
    return null;
  }

  const pack = packs[index];

  return (
    <div style={style}>
      <div className="p-2">
        <PackCard
          pack={pack}
          isLiked={likedPackIds.has(pack.id)}
          onLike={onLike}
        />
      </div>
    </div>
  );
});

Cell.displayName = 'VirtualizedPackGridCell';

export const VirtualizedPackGrid = memo(function VirtualizedPackGrid({
  packs,
  likedPackIds,
  onLike,
  columnCount = 2,
  rowHeight = 280,
  containerHeight = 600,
}: VirtualizedPackGridProps) {
  const gridRef = useRef<Grid>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate grid dimensions
  const rowCount = Math.ceil(packs.length / columnCount);

  // Get container width for responsive column width
  useEffect(() => {
    const handleResize = () => {
      if (gridRef.current) {
        gridRef.current.resetAfterIndices({ columnIndex: 0, rowIndex: 0 });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get column width dynamically
  const getColumnWidth = () => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      return containerWidth / columnCount;
    }
    return 200; // fallback
  };

  return (
    <div ref={containerRef} className="w-full">
      <Grid
        ref={gridRef}
        columnCount={columnCount}
        columnWidth={getColumnWidth()}
        height={containerHeight}
        rowCount={rowCount}
        rowHeight={rowHeight}
        width="100%"
        itemData={{
          packs,
          columnCount,
          likedPackIds,
          onLike,
        }}
        overscanRowCount={2}
        className="scrollbar-hide"
      >
        {Cell}
      </Grid>
    </div>
  );
});
