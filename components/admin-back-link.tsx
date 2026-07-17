"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
export function AdminBackLink({href,label="BACK" ,dirty=false}:{href:string;label:string;dirty?:boolean}){const router=useRouter();const go=(e:React.MouseEvent)=>{if(dirty&&!window.confirm("You have unsaved changes. Leave this page?")){e.preventDefault();return;}router.push(href)};return <Link href={href} onClick={go} className="inline-flex min-h-10 items-center border border-white/15 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white/70 transition hover:border-signal hover:text-signal">← {label}</Link>}
