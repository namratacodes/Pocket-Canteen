import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Search, AlertCircle, UtensilsCrossed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SkeletonCard } from '@/components/common/SkeletonCard';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { VegDot } from '@/components/common/VegDot';
import { useMenu } from './useMenu';
import { useMenuLive } from './useMenuLive';
import { CategoryTabs } from './CategoryTabs';
import { MenuItemCard } from './MenuItemCard';
import { ItemDetailSheet } from './ItemDetailSheet';
import { ComboCarousel } from './ComboCarousel';
import { CartSheet } from '@/features/student/cart/CartSheet';
import { FloatingCartBar } from '@/features/student/cart/FloatingCartBar';
import { CanteenSwitchDialog } from '@/features/student/cart/CanteenSwitchDialog';
import type { MenuItem } from '@/types';
import type { ApiError } from '@/lib/api/client';
import { LastUpdatedNote } from '@/components/common/LastUpdatedNote';

export const MenuPage: React.FC = () => {
  const { canteenId = '' } = useParams<{ canteenId: string }>();
  const navigate = useNavigate();

  const { canteen, menuItems, combos, isLoading, isError, error, refetch } = useMenu(canteenId);
  useMenuLive(canteenId);

  // Prefs: Veg only filter persisted in localStorage
  const [vegOnly, setVegOnly] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('pc-prefs-v1');
      return saved ? JSON.parse(saved).vegOnly === true : false;
    } catch {
      return false;
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [switchDialogItem, setSwitchDialogItem] = useState<MenuItem | null>(null);
  const [isSwitchOpen, setIsSwitchOpen] = useState(false);

  // Save veg only pref
  useEffect(() => {
    try {
      const existing = localStorage.getItem('pc-prefs-v1');
      const parsed = existing ? JSON.parse(existing) : {};
      localStorage.setItem('pc-prefs-v1', JSON.stringify({ ...parsed, vegOnly }));
    } catch {
      // ignore storage errors
    }
  }, [vegOnly]);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    set.add('All');
    menuItems.forEach((m) => {
      if (m.category) set.add(m.category);
    });
    return Array.from(set);
  }, [menuItems]);

  // Filter items based on veg filter and search query
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (vegOnly && !item.isVeg) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc) return false;
      }
      return true;
    });
  }, [menuItems, vegOnly, searchQuery]);

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, MenuItem[]> = {};
    filteredItems.forEach((item) => {
      const cat = item.category || 'General';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [filteredItems]);

  // Smooth scroll to category
  const handleSelectCategory = (cat: string) => {
    setActiveCategory(cat);
    if (cat === 'All') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const elem = document.getElementById(`category-${cat}`);
    if (elem) {
      const headerOffset = 115;
      const elementPosition = elem.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  // Scroll spy to update active category
  useEffect(() => {
    if (categories.length <= 1) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const cat = entry.target.getAttribute('data-cat-name');
            if (cat) setActiveCategory(cat);
          }
        });
      },
      { rootMargin: '-120px 0px -70% 0px' }
    );

    const sections = document.querySelectorAll('[data-cat-section]');
    sections.forEach((sec) => observer.observe(sec));

    return () => observer.disconnect();
  }, [groupedItems, categories]);

  const handleNeedsSwitch = (item: MenuItem) => {
    setSwitchDialogItem(item);
    setIsSwitchOpen(true);
  };

  const handleSelectItem = (item: MenuItem) => {
    setSelectedItem(item);
    setIsDetailOpen(true);
  };

  const isCanteenOpen = canteen?.isOpen ?? true;

  if (isLoading) {
    return (
      <div className="space-y-4 pb-20">
        <div className="h-10 w-48 rounded-xl bg-muted animate-pulse" />
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-8">
        <ErrorState error={error as ApiError | Error} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-28">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/student')}
            className="h-9 w-9 rounded-xl -ml-2 text-foreground hover:bg-muted"
            aria-label="Back to canteens"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground line-clamp-1">
              {canteen?.name ?? 'Menu'}
            </h1>
            <p className="text-xs text-muted-foreground">{canteen?.location}</p>
          </div>
        </div>

        {canteen?.isOpen ? (
          <Badge variant="success" className="gap-1 text-xs py-1 px-2.5 shadow-xs">
            <Clock className="h-3 w-3" />
            <span>~{canteen.liveQueue?.estimatedWaitMins ?? 8} min</span>
          </Badge>
        ) : (
          <Badge variant="destructive" className="text-xs py-1 px-2.5 shadow-xs">
            Closed
          </Badge>
        )}
      </div>

      {/* Closed Canteen Banner */}
      {!isCanteenOpen && (
        <div className="rounded-2xl border border-destructive/30 bg-danger-soft p-3.5 flex items-center gap-3 text-destructive">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div className="text-xs font-semibold">
            Closed now · Opens at {canteen?.operatingHours.open ?? '8:00 AM'}
            <p className="text-[11px] font-normal text-destructive/80 mt-0.5">
              You can browse items, but ordering is currently disabled.
            </p>
          </div>
        </div>
      )}

      <LastUpdatedNote scope={'menu:' + canteenId} hasData={menuItems.length > 0} />

      {/* Controls: Search and Veg Only Toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in menu..."
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-input bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 h-10 shadow-xs flex-shrink-0">
          <VegDot isVeg={true} />
          <Label htmlFor="veg-toggle" className="text-xs font-semibold cursor-pointer">
            Veg only
          </Label>
          <Switch
            id="veg-toggle"
            checked={vegOnly}
            onCheckedChange={setVegOnly}
            className="scale-80"
          />
        </div>
      </div>

      {/* Combos Carousel */}
      {!searchQuery && combos.length > 0 && (
        <ComboCarousel
          combos={combos}
          menuItems={menuItems}
          canteenName={canteen?.name ?? ''}
          isCanteenOpen={isCanteenOpen}
          onNeedsSwitch={handleNeedsSwitch}
        />
      )}

      {/* Category Tabs */}
      <CategoryTabs
        categories={categories}
        activeCategory={activeCategory}
        onSelectCategory={handleSelectCategory}
      />

      {/* Menu Categories & Items List */}
      {filteredItems.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="No menu items found"
          description="Try turning off the veg-only filter or clearing your search query."
        />
      ) : (
        <div className="space-y-6 pt-1">
          {Object.entries(groupedItems).map(([cat, items]) => (
            <section
              key={cat}
              id={`category-${cat}`}
              data-cat-section
              data-cat-name={cat}
              className="space-y-2.5 scroll-mt-28"
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                {cat} ({items.length})
              </h3>
              <div className="space-y-2.5">
                {items.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    canteenName={canteen?.name ?? ''}
                    isCanteenOpen={isCanteenOpen}
                    onSelect={handleSelectItem}
                    onNeedsSwitch={handleNeedsSwitch}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Floating Cart Bar */}
      <FloatingCartBar
        canteenId={canteenId}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {/* Cart Sheet */}
      <CartSheet
        open={isCartOpen}
        onOpenChange={setIsCartOpen}
        menuItems={menuItems}
        combos={combos}
      />

      {/* Item Detail Sheet */}
      <ItemDetailSheet
        item={selectedItem}
        canteenName={canteen?.name ?? ''}
        isCanteenOpen={isCanteenOpen}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onNeedsSwitch={handleNeedsSwitch}
      />

      {/* Canteen Switch Confirmation Dialog */}
      <CanteenSwitchDialog
        open={isSwitchOpen}
        onOpenChange={setIsSwitchOpen}
        pendingItem={switchDialogItem}
        newCanteenName={canteen?.name ?? ''}
      />
    </div>
  );
};
