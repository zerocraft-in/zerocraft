import type { ReactNode, SVGProps } from "react";

type StoreIconProps = Omit<SVGProps<SVGSVGElement>, "name"> & {
  size?: number | string;
};
type StoreIconName =
  | "search"
  | "bag"
  | "menu"
  | "close"
  | "heart"
  | "heart-filled"
  | "eye"
  | "arrow-right"
  | "arrow-left"
  | "arrow-up-right"
  | "chevron-right"
  | "chevron-down"
  | "chevron-up"
  | "home"
  | "trash"
  | "tag"
  | "check"
  | "truck"
  | "shield-check"
  | "gift"
  | "package"
  | "clock"
  | "printer"
  | "map-pin"
  | "settings"
  | "user"
  | "mail"
  | "cash"
  | "refresh"
  | "photo"
  | "sparkles"
  | "circle-check"
  | "adjustments"
  | "grid"
  | "list"
  | "loader"
  | "share"
  | "instagram"
  | "youtube"
  | "pinterest"
  | "network-nodes"
  | "rounded-frame";

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const iconPaths: Record<StoreIconName, ReactNode> = {
  search: (
    <>
      <circle {...stroke} cx="11" cy="11" r="6.5" />
      <path {...stroke} d="m16 16 5 5" />
    </>
  ),
  bag: (
    <>
      <path {...stroke} d="M5 8.5h14l1 11H4l1-11Z" />
      <path {...stroke} d="M8.5 9V6.5a3.5 3.5 0 0 1 7 0V9" />
    </>
  ),
  menu: <path {...stroke} d="M4 7h16M4 12h16M4 17h16" />,
  close: <path {...stroke} d="m6 6 12 12M18 6 6 18" />,
  heart: (
    <path
      {...stroke}
      d="M20.8 8.7c0 5.1-8.8 10.1-8.8 10.1S3.2 13.8 3.2 8.7a4.8 4.8 0 0 1 8.8-2.6 4.8 4.8 0 0 1 8.8 2.6Z"
    />
  ),
  "heart-filled": (
    <path
      fill="currentColor"
      d="M20.8 8.7c0 5.1-8.8 10.1-8.8 10.1S3.2 13.8 3.2 8.7a4.8 4.8 0 0 1 8.8-2.6 4.8 4.8 0 0 1 8.8 2.6Z"
    />
  ),
  eye: (
    <>
      <path
        {...stroke}
        d="M2.8 12s3.3-5.6 9.2-5.6S21.2 12 21.2 12s-3.3 5.6-9.2 5.6S2.8 12 2.8 12Z"
      />
      <circle {...stroke} cx="12" cy="12" r="2.4" />
    </>
  ),
  "arrow-right": <path {...stroke} d="M4 12h15M13 6l6 6-6 6" />,
  "arrow-left": <path {...stroke} d="M20 12H5M11 6l-6 6 6 6" />,
  "arrow-up-right": <path {...stroke} d="M6 18 18 6M8 6h10v10" />,
  "chevron-right": <path {...stroke} d="m9 5 7 7-7 7" />,
  "chevron-down": <path {...stroke} d="m5 9 7 7 7-7" />,
  "chevron-up": <path {...stroke} d="m5 15 7-7 7 7" />,
  home: <path {...stroke} d="m3.5 11 8.5-7 8.5 7v8.5h-6v-5h-5v5h-6V11Z" />,
  trash: (
    <>
      <path
        {...stroke}
        d="M5 7h14M9 7V4.5h6V7M7 7l.8 13h8.4L17 7M10 11v5M14 11v5"
      />
    </>
  ),
  tag: (
    <>
      <path {...stroke} d="M4 5v7l8 8 8-8-8-8H4Z" />
      <circle {...stroke} cx="8" cy="9" r="1" />
    </>
  ),
  check: <path {...stroke} d="m5 12 4.5 4.5L19 7" />,
  truck: (
    <>
      <path {...stroke} d="M3 6h11v10H3zM14 10h4l3 3v3h-7z" />
      <circle {...stroke} cx="7" cy="18" r="2" />
      <circle {...stroke} cx="18" cy="18" r="2" />
    </>
  ),
  "shield-check": (
    <>
      <path
        {...stroke}
        d="M12 3 19 6v5c0 4.4-2.9 7.8-7 10-4.1-2.2-7-5.6-7-10V6l7-3Z"
      />
      <path {...stroke} d="m8.5 12 2.2 2.2 4.8-5" />
    </>
  ),
  gift: (
    <path
      {...stroke}
      d="M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7H8.5a2 2 0 1 1 2-2c0 1.2 1.5 2 1.5 2ZM12 7h3.5a2 2 0 1 0-2-2c0 1.2-1.5 2-1.5 2Z"
    />
  ),
  package: (
    <>
      <path {...stroke} d="m4 7 8-4 8 4v10l-8 4-8-4V7Z" />
      <path {...stroke} d="m4 7 8 4 8-4M12 11v10" />
    </>
  ),
  clock: (
    <>
      <circle {...stroke} cx="12" cy="12" r="8.5" />
      <path {...stroke} d="M12 7v5l3.5 2" />
    </>
  ),
  printer: <path {...stroke} d="M6 9V4h12v5M6 17H4V9h16v8h-2M7 14h10v6H7z" />,
  "map-pin": (
    <>
      <path {...stroke} d="M19 10c0 5-7 10-7 10S5 15 5 10a7 7 0 1 1 14 0Z" />
      <circle {...stroke} cx="12" cy="10" r="2" />
    </>
  ),
  settings: (
    <>
      <circle {...stroke} cx="12" cy="12" r="3" />
      <path
        {...stroke}
        d="m19 13 2-1-2-1-.4-2 1.4-1.5-2.1-2.1-1.5 1.4-2-.4-1-2-1 2-2 .4-1.5-1.4-2.1 2.1L7 9.6l-.4 2-2 1 2 1 .4 2-1.4 1.5 2.1 2.1 1.5-1.4 2 .4 1 2 1-2 2-.4 1.5 1.4 2.1-2.1-1.4-1.5.4-2Z"
      />
    </>
  ),
  user: (
    <>
      <circle {...stroke} cx="12" cy="8" r="3.5" />
      <path {...stroke} d="M5 20c.7-3.4 3-5 7-5s6.3 1.6 7 5" />
    </>
  ),
  mail: (
    <>
      <rect {...stroke} x="3.5" y="5.5" width="17" height="13" rx="1.5" />
      <path {...stroke} d="m4 7 8 6 8-6" />
    </>
  ),
  cash: (
    <>
      <rect {...stroke} x="3" y="6" width="18" height="12" rx="2" />
      <circle {...stroke} cx="12" cy="12" r="2.5" />
      <path {...stroke} d="M6 9h.01M18 15h.01" />
    </>
  ),
  refresh: (
    <>
      <path {...stroke} d="M19 8V4l-2 2a7 7 0 1 0 1.5 8" />
      <path {...stroke} d="M19 4h-4" />
    </>
  ),
  photo: (
    <>
      <rect {...stroke} x="3.5" y="5" width="17" height="14" rx="2" />
      <circle {...stroke} cx="8.5" cy="9" r="1.2" />
      <path {...stroke} d="m5.5 16 4-4 3 3 2-2 4 3" />
    </>
  ),
  sparkles: (
    <path
      {...stroke}
      d="m7 3 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3ZM17 11l1.3 3.7L22 16l-3.7 1.3L17 21l-1.3-3.7L12 16l3.7-1.3L17 11Z"
    />
  ),
  "circle-check": (
    <>
      <circle {...stroke} cx="12" cy="12" r="8.5" />
      <path {...stroke} d="m8 12 2.5 2.5L16 9" />
    </>
  ),
  adjustments: <path {...stroke} d="M4 7h16M4 17h16M8 4v6M16 14v6" />,
  grid: (
    <>
      <rect {...stroke} x="4" y="4" width="6" height="6" />
      <rect {...stroke} x="14" y="4" width="6" height="6" />
      <rect {...stroke} x="4" y="14" width="6" height="6" />
      <rect {...stroke} x="14" y="14" width="6" height="6" />
    </>
  ),
  list: (
    <path {...stroke} d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
  ),
  loader: (
    <path
      {...stroke}
      d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"
    />
  ),
  instagram: (
    <>
      <rect {...stroke} x="3.5" y="3.5" width="17" height="17" rx="4" />
      <circle {...stroke} cx="12" cy="12" r="4" />
      <circle fill="currentColor" cx="17.2" cy="6.8" r="1" />
    </>
  ),
  youtube: (
    <>
      <rect {...stroke} x="3" y="6" width="18" height="12" rx="3" />
      <path fill="currentColor" d="m10 9 5.5 3-5.5 3V9Z" />
    </>
  ),
  pinterest: (
    <>
      <circle {...stroke} cx="12" cy="12" r="8.5" />
      <path {...stroke} d="M10.2 18.6c.7-1.5 1.1-3.1 1.4-4.5-.8-.7-1.2-1.7-1.2-2.8 0-2.1 1.5-3.6 3.5-3.6 1.7 0 2.9 1.2 2.9 2.8 0 2-1.1 3.7-2.7 3.7-.6 0-1.1-.5-1-1.1l.4-1.6c.2-.8-.1-1.5-.8-1.5-.8 0-1.4.8-1.4 1.9 0 .7.2 1.2.2 1.2l-1.1 4.7" />
    </>
  ),
  share: (
    <>
      <circle {...stroke} cx="6" cy="12" r="2.2" />
      <circle {...stroke} cx="17.5" cy="6" r="2.2" />
      <circle {...stroke} cx="17.5" cy="18" r="2.2" />
      <path {...stroke} d="m8 11 7.5-4M8 13l7.5 4" />
    </>
  ),
  "network-nodes": (
    <path
      fill="currentColor"
      d="M12.281 1.25c.285 0 .53.078.751.178.198.089.42.217.656.353l.659.379c.236.136.457.264.634.39.198.141.388.313.531.56.144.247.198.498.222.739.021.217.021.472.021.743v.788c0 .271 0 .526-.021.743-.024.241-.078.492-.222.739-.143.247-.333.419-.531.56-.177.126-.398.254-.634.39l-.659.379c-.236.136-.457.263-.655.353v4.094l4.098 3.688c.098-.058.202-.118.309-.18l.659-.379c.236-.136.457-.264.656-.353.221-.1.465-.178.75-.178s.53.078.751.178c.198.089.42.217.656.353l.659.379c.236.136.457.264.634.39.198.141.388.313.531.56.144.247.198.498.222.739.021.217.021.472.021.743v.788c0 .271 0 .526-.021.743-.024.241-.078.492-.222.739-.143.247-.333.419-.531.56-.177.126-.398.254-.634.39l-.659.379c-.236.136-.457.263-.655.353-.221.1-.466.178-.751.178s-.529-.078-.75-.178c-.199-.09-.42-.217-.656-.353l-.659-.379c-.236-.136-.457-.264-.634-.39-.197-.141-.388-.313-.531-.56-.143-.247-.198-.498-.221-.739-.022-.217-.022-.472-.022-.743v-.788c0-.271 0-.526.022-.743.012-.129.034-.262.073-.395l-3.843-3.459-3.846 3.462c.039.132.06.263.073.392.021.217.021.472.021.743v.788c0 .271 0 .526-.021.743-.024.241-.078.492-.222.739-.143.247-.333.419-.531.56-.177.126-.398.254-.634.39l-.659.379c-.236.136-.458.264-.656.353-.221.1-.466.178-.751.178s-.529-.078-.75-.178c-.199-.09-.42-.217-.656-.353l-.659-.379c-.236-.136-.458-.264-.635-.39-.197-.141-.388-.313-.531-.56-.143-.247-.198-.498-.221-.739-.022-.217-.022-.472-.022-.743v-.788c0-.271 0-.526.022-.743.023-.241.078-.492.221-.739.143-.247.334-.419.531-.56.177-.126.399-.254.635-.39l.659-.379c.236-.136.457-.264.656-.353.221-.1.465-.178.75-.178s.53.078.751.178c.198.089.42.217.656.353l.659.379c.107.062.212.122.31.181l4.1-3.689V8.573c-.2-.09-.421-.218-.657-.354l-.659-.379c-.236-.136-.458-.264-.635-.39-.197-.141-.388-.313-.531-.56-.143-.247-.198-.498-.221-.739-.022-.217-.022-.472-.022-.743v-.788c0-.271 0-.526.022-.743.023-.241.078-.492.221-.739.143-.247.334-.419.531-.56.177-.126.399-.254.635-.39l.659-.379c.236-.136.457-.264.656-.353.221-.1.465-.178.75-.178Z"
    />
  ),
  "rounded-frame": (
    <path
      fill="currentColor"
      d="M9.274 8.854c-.378-.108-.89-.125-1.661-.095a.75.75 0 0 1-.781-.72.75.75 0 0 1 .722-.778c.763-.03 1.5-.032 2.138.152.693.2 1.244.608 1.644 1.305l.02.037c.202.403.51 1.059.845 1.785.391-.503.853-1.064 1.363-1.566.89-.877 2.08-1.733 3.493-1.724a.75.75 0 0 1-.01 1.5c-.794-.005-1.611.489-2.426 1.291-.644.634-1.191 1.361-1.656 1.979l-.053.07c.079.173.157.343.232.507.365.801.672 1.473.804 1.747.184.38.334.573.585.702.286.147.814.267 1.877.196a.75.75 0 0 1 .1 1.496c-1.164.079-2.02-.026-2.668-.359-.681-.351-1.013-.893-1.25-1.383-.142-.293-.402-.862-.711-1.539-.432.556-.937 1.157-1.489 1.684-.893.854-2.068 1.675-3.399 1.608a.75.75 0 0 1 .075-1.498c.675.034 1.45-.396 2.283-1.192.688-.659 1.308-1.462 1.822-2.155-.44-.962-.876-1.902-1.154-2.459-.2-.341-.429-.499-.746-.591Z"
    />
  ),
};

export function StoreIcon({
  name,
  size = 24,
  ...props
}: StoreIconProps & { name: StoreIconName }) {
  return (
    <svg
      {...props}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden={props["aria-label"] ? undefined : true}
    >
      {iconPaths[name]}
    </svg>
  );
}

const makeIcon = (name: StoreIconName) => {
  const Icon = (props: StoreIconProps) => <StoreIcon name={name} {...props} />;
  Icon.displayName = `StoreIcon(${name})`;
  return Icon;
};

export const IconSearch = makeIcon("search");
export const IconShoppingBag = makeIcon("bag");
export const IconMenu2 = makeIcon("menu");
export const IconX = makeIcon("close");
export const IconHeart = makeIcon("heart");
export const IconHeartFilled = makeIcon("heart-filled");
export const IconEye = makeIcon("eye");
export const IconArrowRight = makeIcon("arrow-right");
export const IconArrowLeft = makeIcon("arrow-left");
export const IconArrowUpRight = makeIcon("arrow-up-right");
export const IconChevronRight = makeIcon("chevron-right");
export const IconChevronDown = makeIcon("chevron-down");
export const IconChevronUp = makeIcon("chevron-up");
export const IconHome = makeIcon("home");
export const IconTrash = makeIcon("trash");
export const IconTag = makeIcon("tag");
export const IconCheck = makeIcon("check");
export const IconTruck = makeIcon("truck");
export const IconShieldCheck = makeIcon("shield-check");
export const IconGift = makeIcon("gift");
export const IconPackage = makeIcon("package");
export const IconClock = makeIcon("clock");
export const IconPrinter = makeIcon("printer");
export const IconMapPin = makeIcon("map-pin");
export const IconSettings = makeIcon("settings");
export const IconUser = makeIcon("user");
export const IconMail = makeIcon("mail");
export const IconCash = makeIcon("cash");
export const IconRefresh = makeIcon("refresh");
export const IconPhoto = makeIcon("photo");
export const IconSparkles = makeIcon("sparkles");
export const IconCircleCheck = makeIcon("circle-check");
export const IconAdjustmentsHorizontal = makeIcon("adjustments");
export const IconLayoutGrid = makeIcon("grid");
export const IconList = makeIcon("list");
export const IconLoader2 = makeIcon("loader");
export const IconShare = makeIcon("share");
export const IconInstagram = makeIcon("instagram");
export const IconYoutube = makeIcon("youtube");
export const IconPinterest = makeIcon("pinterest");
export const IconNetworkNodes = makeIcon("network-nodes");
export const IconRoundedFrame = makeIcon("rounded-frame");
