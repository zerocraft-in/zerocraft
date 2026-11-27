"use client";
import { useRouter as originalRouter,usePathname as originalPath } from 'next/navigation';
import { scopedPath,unscopedPath } from './scope';
export { useSearchParams,useParams,redirect,notFound } from 'next/navigation';
export function usePathname(){return unscopedPath(originalPath()||'/store');}
export function useRouter(){const router=originalRouter();const pathname=originalPath()||'';return {...router,push:(href:string,options?:{scroll?:boolean})=>router.push(scopedPath(href,pathname),options),replace:(href:string,options?:{scroll?:boolean})=>router.replace(scopedPath(href,pathname),options),prefetch:(href:string)=>router.prefetch(scopedPath(href,pathname))};}
