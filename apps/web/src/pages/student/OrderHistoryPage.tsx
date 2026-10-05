import React from 'react';
import { ReceiptText, Clock } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export const OrderHistoryPage: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="pt-1">
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          My Orders
        </h2>
        <p className="text-xs text-muted-foreground">
          Track active tokens and review past meal receipts
        </p>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="active">Active Orders</TabsTrigger>
          <TabsTrigger value="past">Past Receipts</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="pt-4">
          <EmptyState
            icon={ReceiptText}
            title="No Active Orders"
            description="You don't have any ongoing orders at the moment. Browse canteens to place a new order!"
          />
        </TabsContent>

        <TabsContent value="past" className="pt-4">
          <EmptyState
            icon={Clock}
            title="No Order History"
            description="Your past completed orders and tokens will appear here."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
