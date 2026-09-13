import { Fragment, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/** Withhold cached screens until the server verifies the current identity. */
export function SessionQueryBoundary({children}: {children: ReactNode}) {
  const client=useQueryClient();
  const identity=useRef<string|null>(null);
  const [verified,setVerified]=useState<string|null>(null);
  const [error,setError]=useState(false);
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    let live=true;let generation=0;
    const clear=()=>{void client.cancelQueries();client.clear();setVerified(null);};
    clear();
    const validate=async(expected?:string)=>{
      const epoch=++generation;setError(false);
      try {
        const {data,error:failure}=await supabase.auth.getUser();
        if(!live||epoch!==generation)return;
        if(failure||!data.user||(expected&&data.user.id!==expected))throw new Error('identity_not_verified');
        identity.current=data.user.id;setVerified(data.user.id);
      } catch {if(live&&epoch===generation){identity.current=null;setVerified(null);setError(true);}}
    };
    void validate();
    const {data}=supabase.auth.onAuthStateChange((event,session)=>{
      if(!live||event==='INITIAL_SESSION')return;
      const next=session?.user.id||null;
      if(next===identity.current&&event!=='SIGNED_OUT')return;
      ++generation;identity.current=next;clear();
      if(!next){setError(true);return;}
      queueMicrotask(()=>{if(live)void validate(next);});
    });
    return()=>{live=false;++generation;data.subscription.unsubscribe();};
  },[client,attempt]);
  if(!verified)return <section className="grid min-h-[50vh] place-items-center p-6 text-center"><div><h2 className="text-lg font-bold">{error?'Session verification required':'Verifying isolated workspace access…'}</h2><p className="mt-2 text-sm text-muted-foreground">Previous-account records remain hidden.</p>{error&&<div className="mt-4 flex justify-center gap-3"><button className="rounded-lg border px-4 py-2 text-sm" onClick={()=>setAttempt(v=>v+1)}>Retry verification</button><button className="rounded-lg border px-4 py-2 text-sm" onClick={()=>void supabase.auth.signOut()}>Sign out</button></div>}</div></section>;
  return <Fragment key={verified}>{children}</Fragment>;
}
