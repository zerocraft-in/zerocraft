import Link from "next/link";
import { IconArrowLeft, IconRoute } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <Card className="w-full max-w-lg text-center">
        <CardHeader className="items-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <IconRoute className="size-6" />
          </span>
          <CardTitle className="mt-2 text-2xl">Page not found</CardTitle>
          <CardDescription>
            This workspace route is not available or has moved to a core CMS
            area.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link href="/" />} nativeButton={false}>
            <IconArrowLeft />
            Back to dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
