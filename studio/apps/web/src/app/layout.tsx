import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
 title:"Looplilt Studio — Make a story move",
 description:"An open, local creative workspace for editable animation, video, and sound.",
 metadataBase:new URL("https://looplilt.com"),alternates:{canonical:"/studio/"},icons:{icon:"/studio/favicon.png"},
};
export const viewport:Viewport={width:"device-width",initialScale:1,themeColor:"#12201e"};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en" data-theme="dark" className="h-full"><body className="h-full overflow-hidden">{children}</body></html>;}
