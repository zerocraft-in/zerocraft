import { MetadataRoute } from 'next';


export default function sitemap(): MetadataRoute.Sitemap {
return [
{ url: 'https://zerocraft.in', lastModified: new Date() },
{ url: 'https://zerocraft.in/branding' },
{ url: 'https://zerocraft.in/web-development' },
{ url: 'https://zerocraft.in/digital-marketing' },
{ url: 'https://zerocraft.in/ui-ux-design' },
{ url: 'https://zerocraft.in/video-production' },
{ url: 'https://zerocraft.in/printing' },
];
}