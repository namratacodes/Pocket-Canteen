import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Flame, MapPin, Store } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Canteen } from '@/types';
import { cn } from '@/lib/utils';

interface CanteenCardProps {
  canteen: Canteen;
}

export const CanteenCard: React.FC<CanteenCardProps> = ({ canteen }) => {
  const navigate = useNavigate();

  const isRush = canteen.isOpen && (canteen.liveQueue?.estimatedWaitMins ?? 0) > 15;
  const waitMins = canteen.liveQueue?.estimatedWaitMins ?? 0;
  const activeOrders = canteen.liveQueue?.activeOrders ?? 0;

  const handleClick = () => {
    navigate(`/student/c/${canteen.id}`);
  };

  return (
    <Card
      onClick={handleClick}
      className={cn(
        'group cursor-pointer overflow-hidden rounded-2xl border border-border shadow-card transition-all duration-200',
        'hover:border-brand/40 hover:shadow-md active:scale-[0.99]',
        !canteen.isOpen && 'opacity-75 bg-muted/20 hover:border-border'
      )}
    >
      {/* 16:9 Image Header */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
        {canteen.imageUrl ? (
          <img
            src={canteen.imageUrl}
            alt={canteen.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Store className="h-10 w-10 stroke-1" />
          </div>
        )}

        {/* Gradient overlay for badges */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Status badges overlay */}
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {canteen.isOpen ? (
              <Badge variant="success" className="gap-1 text-xs py-0.5 px-2 font-medium shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                <span>Open</span>
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1 text-xs py-0.5 px-2 font-medium shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                <span>Closed</span>
              </Badge>
            )}

            {isRush && (
              <Badge className="bg-warning-soft text-warning border-warning/40 gap-1 text-xs py-0.5 px-2 font-medium shadow-sm">
                <Flame className="h-3 w-3 fill-warning text-warning" />
                <span>Rush</span>
              </Badge>
            )}
          </div>

          {canteen.isOpen && (
            <span className="rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
              ⏱ ~{waitMins} min
            </span>
          )}
        </div>
      </div>

      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-foreground group-hover:text-brand transition-colors">
              {canteen.name}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{canteen.location}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border/60 pt-2.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {canteen.isOpen
                ? `${canteen.operatingHours.open} – ${canteen.operatingHours.close}`
                : `Opens at ${canteen.operatingHours.open}`}
            </span>
          </div>

          {canteen.isOpen ? (
            <span className="text-[11px] font-medium text-muted-foreground">
              {activeOrders} in queue
            </span>
          ) : (
            <span className="text-[11px] font-medium text-destructive">
              Closed now
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
