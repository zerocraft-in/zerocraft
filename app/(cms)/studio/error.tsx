"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconRefresh,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function StudioError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <IconAlertTriangle className="size-6" />
          </div>
          <Badge variant="destructive">Studio error</Badge>
          <CardTitle className="text-xl">We couldn’t load this page</CardTitle>
          <CardDescription>
            {error.message ||
              "An unexpected error occurred while loading studio data."}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-xs text-muted-foreground">
          You can retry the request or return to the dashboard.
        </CardContent>
        <CardFooter className="justify-center gap-2">
          <Button onClick={() => reset()}>
            <IconRefresh />
            Try again
          </Button>
          <Button
            variant="outline"
            render={<Link href="/studio" />}
            nativeButton={false}
          >
            <IconArrowLeft />
            Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
