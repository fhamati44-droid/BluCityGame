'use client';
import {Component,type ReactNode} from 'react';
import type {Lang} from '../../lib/levels';
export default class WalletBoundary extends Component<{lang:Lang;children:ReactNode},{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){if(!this.state.failed)return this.props.children;return <section className="hub-card" role="alert"><h2>{this.props.lang==='he'?'טעינת הארנק נכשלה':this.props.lang==='ar'?'تعذّر تحميل المحفظة':'Wallet failed to load'}</h2><p>{this.props.lang==='he'?'WALLET_INIT_FAILED · אפשר להמשיך לשחק. פתח את המשחק מחדש כדי לנסות שוב':this.props.lang==='ar'?'WALLET_INIT_FAILED · يمكنك متابعة اللعب. افتح اللعبة مجدداً للمحاولة':'WALLET_INIT_FAILED · You can keep playing. Reopen the game to retry'}</p></section>;}
}
