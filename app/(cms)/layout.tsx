"use client";
import "./globals.css";
import React from "react";
import { Providers } from "@/components/providers/provider";

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Providers>{children}</Providers>;
}
