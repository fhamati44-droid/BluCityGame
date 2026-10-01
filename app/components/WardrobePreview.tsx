'use client';
// Keep the BLU hub free of a second WebGL context. Equipment is rendered in the city.
export default function WardrobePreview(){return <div className="wardrobe-preview" role="img" aria-label="BLU character"><img src="/blu.webp" alt="BLU" style={{height:240,width:240,objectFit:"contain",display:"block",margin:"auto"}}/><span>BLU</span></div>;}
