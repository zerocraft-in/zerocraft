"use client";

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@zerocraft/ui/card";
import { Button } from "@zerocraft/ui/button";
import { Plus } from "lucide-react";

export function MetafieldsCard() {
  return (
    <div className="space-y-4">
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Product metafields</CardTitle>
        <Button variant="outline" size="sm">
          Add definition
        </Button>
      </CardHeader>
      <Card>
        <CardContent className="flex items-center justify-between">
          <span className="text-sm text-body">
            No metafields pinned
          </span>
        </CardContent>
        <CardFooter>
          <Button variant="outline" size="sm">
            <Plus />
            Disclosures
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
