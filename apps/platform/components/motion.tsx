'use client';

import {createContext,useContext,useEffect,useState} from 'react';
import {Pause,Play} from 'lucide-react';
import {usePathname} from 'next/navigation';
import {Button} from '@/components/ui/button';

const MotionContext=createContext({paused:false,reduced:false,toggle:()=>{}});

export function MotionProvider({children}:{children:React.ReactNode}){
  const [paused,setPaused]=useState(false);
  const [reduced,setReduced]=useState(false);
  const path=usePathname();
  useEffect(()=>{
    const preference=matchMedia('(prefers-reduced-motion: reduce)');
    const sync=()=>setReduced(preference.matches);
    sync();preference.addEventListener('change',sync);
    try{setPaused(localStorage.getItem('aurat-motion-paused')==='true');}catch{}
    return()=>preference.removeEventListener('change',sync);
  },[]);
  const enabled=!paused&&!reduced;
  useEffect(()=>{
    document.documentElement.dataset.motion=enabled?'on':'paused';
    if(!enabled)return;
    const animations:Animation[]=[];
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries){
        entry.target.setAttribute('data-in-view',String(entry.isIntersecting));
        if(entry.isIntersecting&&entry.target.hasAttribute('data-reveal')&&!entry.target.hasAttribute('data-revealed')){
          entry.target.setAttribute('data-revealed','');
          animations.push(entry.target.animate([{opacity:.35,transform:'translateY(18px)'},{opacity:1,transform:'translateY(0)'}],{duration:650,easing:'cubic-bezier(.2,.7,.2,1)'}));
        }
      }
    },{threshold:.08});
    const selector='[data-reveal], [data-motion-art]';
    const register=(node:Node)=>{
      if(!(node instanceof Element))return;
      if(node.matches(selector))observer.observe(node);
      node.querySelectorAll(selector).forEach(el=>observer.observe(el));
    };
    register(document.body);
    const mutations=new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(register)));
    mutations.observe(document.body,{childList:true,subtree:true});
    let frame=0;
    const move=(event:PointerEvent)=>{
      if(event.pointerType!=='mouse')return;
      const hero=document.querySelector<HTMLElement>('.hero');
      if(!hero)return;
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{
        const box=hero.getBoundingClientRect();
        const inside=event.clientY>=box.top&&event.clientY<=box.bottom&&event.clientX>=box.left&&event.clientX<=box.right;
        hero.style.setProperty('--pointer-x',inside?`${(event.clientX-box.left-box.width/2)*.018}px`:'0px');
        hero.style.setProperty('--pointer-y',inside?`${(event.clientY-box.top-box.height/2)*.014}px`:'0px');
      });
    };
    const visibility=()=>document.documentElement.dataset.visibility=document.hidden?'hidden':'visible';
    visibility();document.addEventListener('visibilitychange',visibility);
    window.addEventListener('pointermove',move,{passive:true});
    return()=>{observer.disconnect();mutations.disconnect();cancelAnimationFrame(frame);animations.forEach(a=>a.cancel());window.removeEventListener('pointermove',move);document.removeEventListener('visibilitychange',visibility);document.querySelector<HTMLElement>('.hero')?.style.removeProperty('--pointer-x');document.querySelector<HTMLElement>('.hero')?.style.removeProperty('--pointer-y');};
  },[enabled,path]);
  function toggle(){setPaused(value=>{const next=!value;try{localStorage.setItem('aurat-motion-paused',String(next));}catch{}return next;});}
  return <MotionContext.Provider value={{paused,reduced,toggle}}>{children}</MotionContext.Provider>;
}

export function MotionToggle(){
  const {paused,reduced,toggle}=useContext(MotionContext);
  const stopped=paused||reduced;
  return <Button variant="ghost" size="icon" className="motion-toggle" onClick={toggle} disabled={reduced} aria-label={reduced?'Motion disabled by your system preference':paused?'Enable decorative motion':'Pause decorative motion'} aria-pressed={stopped} title={reduced?'Reduced motion enabled':paused?'Enable motion':'Pause motion'}>{stopped?<Play size={15}/>:<Pause size={15}/>}</Button>;
}
