'use client';
import {useState,type InputHTMLAttributes} from 'react';
import {Eye,EyeOff} from 'lucide-react';
export default function PasswordInput(props:InputHTMLAttributes<HTMLInputElement>){const [visible,setVisible]=useState(false);return <div className="password-field"><input {...props} type={visible?'text':'password'}/><button type="button" className="password-toggle" aria-label={visible?'Masquer le code':'Afficher le code'} aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={19}/>:<Eye size={19}/>}</button></div>;}
