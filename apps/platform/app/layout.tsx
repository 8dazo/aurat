import type {Metadata} from 'next';
import {Toaster} from '@/components/ui/sonner';
import './globals.css';
import {MotionProvider} from '@/components/motion';
export const metadata:Metadata={title:{default:'Aurat — Replay the run. Catch the regression.',template:'%s · Aurat'},description:'Run your changed AI application against recorded model and tool responses. Catch incorrect actions, arguments and outcomes before you merge.',icons:{icon:'/assets/aurat-mark.webp'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" className="dark"><body><MotionProvider>{children}<Toaster richColors position="bottom-right"/></MotionProvider></body></html>}
