import React from 'react';
import { Store, Clock, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/stores/authStore';

export const CanteenSelectorPage: React.FC = () => {
  const user = useAuth((state) => state.user);

  return (
    <div className="space-y-4">
      {/* Greeting & Wallet Summary */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Hi {user?.name ? user.name.split(' ')[0] : 'there'} 👋
          </h2>
          <p className="text-xs text-muted-foreground">
            Hungry? Pre-order from your favourite canteen
          </p>
        </div>
      </div>

      {/* Phase 1 Landing Card */}
      <Card className="border-brand/20 bg-gradient-to-br from-brand/5 via-card to-card overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-md shadow-brand/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-foreground">
                  Phase 1 Foundation Live
                </h3>
                <Badge variant="success" className="text-[10px] py-0">
                  Ready
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Auth session active, design tokens initialized, real-time socket connected. Full canteen ordering and live menus launch in Phase 2.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Canteen previews list */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Campus Canteens
          </h3>
          <span className="text-[11px] text-muted-foreground">5 Locations</span>
        </div>

        {[
          { name: 'Main Canteen', location: 'Block A, Central Campus', wait: '8 min', open: true },
          { name: 'Juice Corner', location: 'Near Sports Complex', wait: '3 min', open: true },
          { name: 'South Food Hub', location: 'Engineering Block 3', wait: '12 min', open: true },
          { name: 'Night Cafe', location: 'Hostel Square', wait: 'Closed', open: false },
          { name: 'Mini Bites', location: 'Library Ground Floor', wait: '5 min', open: true },
        ].map((canteen, idx) => (
          <Card
            key={idx}
            className={`border transition-all ${
              canteen.open
                ? 'hover:border-brand/50 hover:shadow-sm cursor-pointer'
                : 'opacity-60 bg-muted/30 cursor-not-allowed'
            }`}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-foreground">
                    {canteen.name}
                  </h4>
                  <p className="text-xs text-muted-foreground">{canteen.location}</p>
                </div>
              </div>

              <div className="text-right">
                {canteen.open ? (
                  <Badge variant="success" className="gap-1 text-[11px]">
                    <Clock className="h-3 w-3" />
                    <span>~{canteen.wait}</span>
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-[11px]">
                    Closed
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
