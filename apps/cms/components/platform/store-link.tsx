"use client";
import NextLink from 'next/link';
import { usePathname as actualPath } from 'next/navigation';
import { scopedPath } from '@/lib/platform/scope';
export default function StoreLink(props:React.ComponentProps<typeof NextLink>){const pathname=actualPath()||'';return <NextLink {...props} href={typeof props.href==='string'?scopedPath(props.href,pathname):props.href} />;}
