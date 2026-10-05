import React from 'react';
import { LayoutDashboard, Store, Users, Coins, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Price } from '@/components/common/Price';

export const AdminOverviewPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Platform Governance Overview
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor multi-canteen operations, campus transaction volume, and financial netting
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Active Canteens
            </CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5 / 5</div>
            <p className="text-xs text-emerald-600 font-medium mt-1">All operating online</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Orders Processed
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-brand" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">1,428</div>
            <p className="text-xs text-muted-foreground mt-1">Across all 5 units today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Today's GMV
            </CardTitle>
            <Coins className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              <Price amount={42580.0} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Direct-to-canteen routing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Active Staff
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">14</div>
            <p className="text-xs text-muted-foreground mt-1">Staff accounts provisioned</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Campus Canteen Status</CardTitle>
            <Badge variant="outline">Live Monitoring</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {[
              { name: 'Main Canteen', orders: 482, revenue: 16400, queue: 12 },
              { name: 'Juice Corner', orders: 310, revenue: 8900, queue: 4 },
              { name: 'South Food Hub', orders: 340, revenue: 11200, queue: 8 },
              { name: 'Night Cafe', orders: 180, revenue: 3800, queue: 2 },
              { name: 'Mini Bites', orders: 116, revenue: 2280, queue: 3 },
            ].map((c, i) => (
              <div key={i} className="py-3 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm">{c.name}</h4>
                  <p className="text-xs text-muted-foreground">{c.orders} orders today</p>
                </div>
                <div className="text-right">
                  <Price amount={c.revenue} className="text-sm font-bold" />
                  <p className="text-xs text-emerald-600 font-medium">Queue: {c.queue} orders</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
