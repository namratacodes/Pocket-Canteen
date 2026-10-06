import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface CategoryTabsProps {
  categories: string[];
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  className?: string;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  categories,
  activeCategory,
  onSelectCategory,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the active tab into view horizontally
  useEffect(() => {
    if (!containerRef.current) return;
    const activeTab = containerRef.current.querySelector(
      `[data-category="${activeCategory}"]`
    ) as HTMLElement | null;

    if (activeTab) {
      const container = containerRef.current;
      const scrollLeft =
        activeTab.offsetLeft - container.offsetWidth / 2 + activeTab.offsetWidth / 2;
      container.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });
    }
  }, [activeCategory]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'sticky top-[57px] z-20 flex gap-2 overflow-x-auto py-2.5 px-4 bg-background/95 backdrop-blur border-b border-border/80 scrollbar-none -mx-4',
        className
      )}
    >
      {categories.map((cat) => {
        const isActive = activeCategory === cat;
        return (
          <button
            key={cat}
            data-category={cat}
            onClick={() => onSelectCategory(cat)}
            className={cn(
              'h-8 px-3.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 select-none flex-shrink-0',
              isActive
                ? 'bg-brand text-white shadow-sm'
                : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
};
