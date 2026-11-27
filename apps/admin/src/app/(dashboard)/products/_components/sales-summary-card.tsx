import { Card, CardContent, CardHeader, CardTitle } from "@zerocraft/ui/card";

export function SalesSummaryCard() {
  return (
    <Card className="border-0 bg-transparent shadow-none">
      <CardHeader className="border-b px-0 pb-3 pt-0">
        <CardTitle className="text-sm font-semibold">Sales</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-0 pt-3">
        <p className="text-sm text-[#5f6368]">No recent sales of this product</p>
        <button type="button" className="text-sm text-[#005bd3] hover:underline">View details</button>
      </CardContent>
    </Card>
  );
}
