/** Sponsor slots use local assets only. Replace names and logo paths after approval.
 * Copy a PNG/WebP logo into public/sponsors and set logo to /sponsors/name.png.
 * These fictional businesses demonstrate placements; no commercial partnership is implied.
 */
export type SponsorSlot={city:number;mission:number;name:string;logo:string|null;color:number};
export const SPONSOR_SLOTS:SponsorSlot[]=[
 {city:1,mission:1,name:'BLU Grocery',logo:'/sponsors/blu-grocery.svg',color:0xffb84f},
 {city:1,mission:3,name:'Spark Bakery',logo:'/sponsors/spark-bakery.svg',color:0xffb84f},
 {city:1,mission:4,name:'Volt Workshop',logo:'/sponsors/volt-workshop.svg',color:0xffb84f},
 {city:2,mission:2,name:'Volt Sneakers',logo:'/sponsors/volt-sneakers.svg',color:0x39d9eb},
 {city:2,mission:3,name:'Neon Cafe',logo:'/sponsors/neon-cafe.svg',color:0xff59ba},
 {city:2,mission:5,name:'BLU Delivery',logo:'/sponsors/blu-delivery.svg',color:0x39d9eb},
 {city:3,mission:3,name:'BLU Services',logo:'/sponsors/blu-services.svg',color:0x70e5ff},
 {city:3,mission:6,name:'BLU City Hall',logo:'/sponsors/blu-city-hall.svg',color:0x70e5ff}
];
export function localSponsorLogo(path:string|null){return path!==null&&/^\/sponsors\/[a-z0-9_-]+\.(png|webp|svg)$/i.test(path)?path:null;}
