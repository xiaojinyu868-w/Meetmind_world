var e=Object.defineProperty,t=(t,n)=>{let r={};for(var i in t)e(r,i,{get:t[i],enumerable:!0});return n||e(r,Symbol.toStringTag,{value:`Module`}),r};(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var n=`attached`,r=1e3,i=1001,a=1002,o=1003,s=1004,c=1005,l=1006,u=1007,d=1008,f=1008,p=1009,m=1010,h=1011,g=1012,_=1013,v=1014,y=1015,b=1016,x=1017,S=1018,C=1020,w=35902,T=35899,E=1021,D=1022,O=1023,k=1026,A=1027,j=1028,M=1029,N=1030,ee=1031,te=1033,P=33776,ne=33777,re=33778,ie=33779,ae=35840,oe=35841,se=35842,ce=35843,F=36196,le=37492,ue=37496,de=37488,fe=37489,pe=37490,me=37491,he=37808,ge=37809,_e=37810,ve=37811,ye=37812,be=37813,xe=37814,Se=37815,Ce=37816,we=37817,Te=37818,Ee=37819,De=37820,Oe=37821,ke=36492,Ae=36494,je=36495,Me=36283,I=36284,Ne=36285,Pe=36286,Fe=2200,L=2201,Ie=2202,R=2300,z=2301,Le=2302,Re=2303,ze=2400,Be=2401,Ve=2402,He=2500,Ue=2501,We=3200,Ge=`srgb`,Ke=`srgb-linear`,qe=`linear`,Je=`srgb`,Ye=7680,Xe=35044,Ze=35048,Qe=`300 es`,$e=2e3;function et(e){for(let t=e.length-1;t>=0;--t)if(e[t]>=65535)return!0;return!1}function tt(e){return ArrayBuffer.isView(e)&&!(e instanceof DataView)}function nt(e){return document.createElementNS(`http://www.w3.org/1999/xhtml`,e)}function rt(){let e=nt(`canvas`);return e.style.display=`block`,e}var it={};function at(...e){let t=`THREE.`+e.shift();console.log(t,...e)}function ot(e){let t=e[0];if(typeof t==`string`&&t.startsWith(`TSL:`)){let t=e[1];t&&t.isStackTrace?e[0]+=` `+t.getLocation():e[1]=`Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.`}return e}function B(...e){e=ot(e);let t=`THREE.`+e.shift();{let n=e[0];n&&n.isStackTrace?console.warn(n.getError(t)):console.warn(t,...e)}}function V(...e){e=ot(e);let t=`THREE.`+e.shift();{let n=e[0];n&&n.isStackTrace?console.error(n.getError(t)):console.error(t,...e)}}function st(...e){let t=e.join(` `);t in it||(it[t]=!0,B(...e))}function ct(e,t,n){return new Promise(function(r,i){function a(){switch(e.clientWaitSync(t,e.SYNC_FLUSH_COMMANDS_BIT,0)){case e.WAIT_FAILED:i();break;case e.TIMEOUT_EXPIRED:setTimeout(a,n);break;default:r()}}setTimeout(a,n)})}var lt={0:1,2:6,4:7,3:5,1:0,6:2,7:4,5:3},ut=class{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){let n=this._listeners;return n!==void 0&&n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){let n=this._listeners;if(n===void 0)return;let r=n[e];if(r!==void 0){let e=r.indexOf(t);e!==-1&&r.splice(e,1)}}dispatchEvent(e){let t=this._listeners;if(t===void 0)return;let n=t[e.type];if(n!==void 0){e.target=this;let t=n.slice(0);for(let n=0,r=t.length;n<r;n++)t[n].call(this,e);e.target=null}}},dt=`00.01.02.03.04.05.06.07.08.09.0a.0b.0c.0d.0e.0f.10.11.12.13.14.15.16.17.18.19.1a.1b.1c.1d.1e.1f.20.21.22.23.24.25.26.27.28.29.2a.2b.2c.2d.2e.2f.30.31.32.33.34.35.36.37.38.39.3a.3b.3c.3d.3e.3f.40.41.42.43.44.45.46.47.48.49.4a.4b.4c.4d.4e.4f.50.51.52.53.54.55.56.57.58.59.5a.5b.5c.5d.5e.5f.60.61.62.63.64.65.66.67.68.69.6a.6b.6c.6d.6e.6f.70.71.72.73.74.75.76.77.78.79.7a.7b.7c.7d.7e.7f.80.81.82.83.84.85.86.87.88.89.8a.8b.8c.8d.8e.8f.90.91.92.93.94.95.96.97.98.99.9a.9b.9c.9d.9e.9f.a0.a1.a2.a3.a4.a5.a6.a7.a8.a9.aa.ab.ac.ad.ae.af.b0.b1.b2.b3.b4.b5.b6.b7.b8.b9.ba.bb.bc.bd.be.bf.c0.c1.c2.c3.c4.c5.c6.c7.c8.c9.ca.cb.cc.cd.ce.cf.d0.d1.d2.d3.d4.d5.d6.d7.d8.d9.da.db.dc.dd.de.df.e0.e1.e2.e3.e4.e5.e6.e7.e8.e9.ea.eb.ec.ed.ee.ef.f0.f1.f2.f3.f4.f5.f6.f7.f8.f9.fa.fb.fc.fd.fe.ff`.split(`.`),ft=1234567,pt=Math.PI/180,mt=180/Math.PI;function ht(){let e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0,r=Math.random()*4294967295|0;return(dt[e&255]+dt[e>>8&255]+dt[e>>16&255]+dt[e>>24&255]+`-`+dt[t&255]+dt[t>>8&255]+`-`+dt[t>>16&15|64]+dt[t>>24&255]+`-`+dt[n&63|128]+dt[n>>8&255]+`-`+dt[n>>16&255]+dt[n>>24&255]+dt[r&255]+dt[r>>8&255]+dt[r>>16&255]+dt[r>>24&255]).toLowerCase()}function gt(e,t,n){return Math.max(t,Math.min(n,e))}function _t(e,t){return(e%t+t)%t}function vt(e,t,n,r,i){return r+(e-t)*(i-r)/(n-t)}function yt(e,t,n){return e===t?0:(n-e)/(t-e)}function bt(e,t,n){return(1-n)*e+n*t}function xt(e,t,n,r){return bt(e,t,1-Math.exp(-n*r))}function St(e,t=1){return t-Math.abs(_t(e,t*2)-t)}function Ct(e,t,n){return e<=t?0:e>=n?1:(e=(e-t)/(n-t),e*e*(3-2*e))}function wt(e,t,n){return e<=t?0:e>=n?1:(e=(e-t)/(n-t),e*e*e*(e*(e*6-15)+10))}function Tt(e,t){return e+Math.floor(Math.random()*(t-e+1))}function Et(e,t){return e+Math.random()*(t-e)}function Dt(e){return e*(.5-Math.random())}function Ot(e){e!==void 0&&(ft=e);let t=ft+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function kt(e){return e*pt}function At(e){return e*mt}function jt(e){return!(e&e-1)&&e!==0}function Mt(e){return 2**Math.ceil(Math.log(e)/Math.LN2)}function Nt(e){return 2**Math.floor(Math.log(e)/Math.LN2)}function Pt(e,t,n,r,i){let a=Math.cos,o=Math.sin,s=a(n/2),c=o(n/2),l=a((t+r)/2),u=o((t+r)/2),d=a((t-r)/2),f=o((t-r)/2),p=a((r-t)/2),m=o((r-t)/2);switch(i){case`XYX`:e.set(s*u,c*d,c*f,s*l);break;case`YZY`:e.set(c*f,s*u,c*d,s*l);break;case`ZXZ`:e.set(c*d,c*f,s*u,s*l);break;case`XZX`:e.set(s*u,c*m,c*p,s*l);break;case`YXY`:e.set(c*p,s*u,c*m,s*l);break;case`ZYZ`:e.set(c*m,c*p,s*u,s*l);break;default:B(`MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: `+i)}}function Ft(e,t){switch(t.constructor){case Float32Array:return e;case Uint32Array:return e/4294967295;case Uint16Array:return e/65535;case Uint8Array:return e/255;case Int32Array:return Math.max(e/2147483647,-1);case Int16Array:return Math.max(e/32767,-1);case Int8Array:return Math.max(e/127,-1);default:throw Error(`THREE.MathUtils: Invalid component type.`)}}function It(e,t){switch(t.constructor){case Float32Array:return e;case Uint32Array:return Math.round(e*4294967295);case Uint16Array:return Math.round(e*65535);case Uint8Array:return Math.round(e*255);case Int32Array:return Math.round(e*2147483647);case Int16Array:return Math.round(e*32767);case Int8Array:return Math.round(e*127);default:throw Error(`THREE.MathUtils: Invalid component type.`)}}var Lt={DEG2RAD:pt,RAD2DEG:mt,generateUUID:ht,clamp:gt,euclideanModulo:_t,mapLinear:vt,inverseLerp:yt,lerp:bt,damp:xt,pingpong:St,smoothstep:Ct,smootherstep:wt,randInt:Tt,randFloat:Et,randFloatSpread:Dt,seededRandom:Ot,degToRad:kt,radToDeg:At,isPowerOfTwo:jt,ceilPowerOfTwo:Mt,floorPowerOfTwo:Nt,setQuaternionFromProperEuler:Pt,normalize:It,denormalize:Ft},H=class e{static{e.prototype.isVector2=!0}constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw Error(`THREE.Vector2: index is out of range: `+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw Error(`THREE.Vector2: index is out of range: `+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){let t=this.x,n=this.y,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6],this.y=r[1]*t+r[4]*n+r[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=gt(this.x,e.x,t.x),this.y=gt(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=gt(this.x,e,t),this.y=gt(this.y,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(gt(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(gt(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){let n=Math.cos(t),r=Math.sin(t),i=this.x-e.x,a=this.y-e.y;return this.x=i*n-a*r+e.x,this.y=i*r+a*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},Rt=class{constructor(e=0,t=0,n=0,r=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=r}static slerpFlat(e,t,n,r,i,a,o){let s=n[r+0],c=n[r+1],l=n[r+2],u=n[r+3],d=i[a+0],f=i[a+1],p=i[a+2],m=i[a+3];if(u!==m||s!==d||c!==f||l!==p){let e=s*d+c*f+l*p+u*m;e<0&&(d=-d,f=-f,p=-p,m=-m,e=-e);let t=1-o;if(e<.9995){let n=Math.acos(e),r=Math.sin(n);t=Math.sin(t*n)/r,o=Math.sin(o*n)/r,s=s*t+d*o,c=c*t+f*o,l=l*t+p*o,u=u*t+m*o}else{s=s*t+d*o,c=c*t+f*o,l=l*t+p*o,u=u*t+m*o;let e=1/Math.sqrt(s*s+c*c+l*l+u*u);s*=e,c*=e,l*=e,u*=e}}e[t]=s,e[t+1]=c,e[t+2]=l,e[t+3]=u}static multiplyQuaternionsFlat(e,t,n,r,i,a){let o=n[r],s=n[r+1],c=n[r+2],l=n[r+3],u=i[a],d=i[a+1],f=i[a+2],p=i[a+3];return e[t]=o*p+l*u+s*f-c*d,e[t+1]=s*p+l*d+c*u-o*f,e[t+2]=c*p+l*f+o*d-s*u,e[t+3]=l*p-o*u-s*d-c*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,r){return this._x=e,this._y=t,this._z=n,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){let n=e._x,r=e._y,i=e._z,a=e._order,o=Math.cos,s=Math.sin,c=o(n/2),l=o(r/2),u=o(i/2),d=s(n/2),f=s(r/2),p=s(i/2);switch(a){case`XYZ`:this._x=d*l*u+c*f*p,this._y=c*f*u-d*l*p,this._z=c*l*p+d*f*u,this._w=c*l*u-d*f*p;break;case`YXZ`:this._x=d*l*u+c*f*p,this._y=c*f*u-d*l*p,this._z=c*l*p-d*f*u,this._w=c*l*u+d*f*p;break;case`ZXY`:this._x=d*l*u-c*f*p,this._y=c*f*u+d*l*p,this._z=c*l*p+d*f*u,this._w=c*l*u-d*f*p;break;case`ZYX`:this._x=d*l*u-c*f*p,this._y=c*f*u+d*l*p,this._z=c*l*p-d*f*u,this._w=c*l*u+d*f*p;break;case`YZX`:this._x=d*l*u+c*f*p,this._y=c*f*u+d*l*p,this._z=c*l*p-d*f*u,this._w=c*l*u-d*f*p;break;case`XZY`:this._x=d*l*u-c*f*p,this._y=c*f*u-d*l*p,this._z=c*l*p+d*f*u,this._w=c*l*u+d*f*p;break;default:B(`Quaternion: .setFromEuler() encountered an unknown order: `+a)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){let n=t/2,r=Math.sin(n);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){let t=e.elements,n=t[0],r=t[4],i=t[8],a=t[1],o=t[5],s=t[9],c=t[2],l=t[6],u=t[10],d=n+o+u;if(d>0){let e=.5/Math.sqrt(d+1);this._w=.25/e,this._x=(l-s)*e,this._y=(i-c)*e,this._z=(a-r)*e}else if(n>o&&n>u){let e=2*Math.sqrt(1+n-o-u);this._w=(l-s)/e,this._x=.25*e,this._y=(r+a)/e,this._z=(i+c)/e}else if(o>u){let e=2*Math.sqrt(1+o-n-u);this._w=(i-c)/e,this._x=(r+a)/e,this._y=.25*e,this._z=(s+l)/e}else{let e=2*Math.sqrt(1+u-n-o);this._w=(a-r)/e,this._x=(i+c)/e,this._y=(s+l)/e,this._z=.25*e}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(gt(this.dot(e),-1,1)))}rotateTowards(e,t){let n=this.angleTo(e);if(n===0)return this;let r=Math.min(1,t/n);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x*=e,this._y*=e,this._z*=e,this._w*=e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){let n=e._x,r=e._y,i=e._z,a=e._w,o=t._x,s=t._y,c=t._z,l=t._w;return this._x=n*l+a*o+r*c-i*s,this._y=r*l+a*s+i*o-n*c,this._z=i*l+a*c+n*s-r*o,this._w=a*l-n*o-r*s-i*c,this._onChangeCallback(),this}slerp(e,t){let n=e._x,r=e._y,i=e._z,a=e._w,o=this.dot(e);o<0&&(n=-n,r=-r,i=-i,a=-a,o=-o);let s=1-t;if(o<.9995){let e=Math.acos(o),c=Math.sin(e);s=Math.sin(s*e)/c,t=Math.sin(t*e)/c,this._x=this._x*s+n*t,this._y=this._y*s+r*t,this._z=this._z*s+i*t,this._w=this._w*s+a*t,this._onChangeCallback()}else this._x=this._x*s+n*t,this._y=this._y*s+r*t,this._z=this._z*s+i*t,this._w=this._w*s+a*t,this.normalize();return this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){let e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),r=Math.sqrt(1-n),i=Math.sqrt(n);return this.set(r*Math.sin(e),r*Math.cos(e),i*Math.sin(t),i*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},U=class e{static{e.prototype.isVector3=!0}constructor(e=0,t=0,n=0){this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw Error(`THREE.Vector3: index is out of range: `+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw Error(`THREE.Vector3: index is out of range: `+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Bt.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Bt.setFromAxisAngle(e,t))}applyMatrix3(e){let t=this.x,n=this.y,r=this.z,i=e.elements;return this.x=i[0]*t+i[3]*n+i[6]*r,this.y=i[1]*t+i[4]*n+i[7]*r,this.z=i[2]*t+i[5]*n+i[8]*r,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){let t=this.x,n=this.y,r=this.z,i=e.elements,a=1/(i[3]*t+i[7]*n+i[11]*r+i[15]);return this.x=(i[0]*t+i[4]*n+i[8]*r+i[12])*a,this.y=(i[1]*t+i[5]*n+i[9]*r+i[13])*a,this.z=(i[2]*t+i[6]*n+i[10]*r+i[14])*a,this}applyQuaternion(e){let t=this.x,n=this.y,r=this.z,i=e.x,a=e.y,o=e.z,s=e.w,c=2*(a*r-o*n),l=2*(o*t-i*r),u=2*(i*n-a*t);return this.x=t+s*c+a*u-o*l,this.y=n+s*l+o*c-i*u,this.z=r+s*u+i*l-a*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){let t=this.x,n=this.y,r=this.z,i=e.elements;return this.x=i[0]*t+i[4]*n+i[8]*r,this.y=i[1]*t+i[5]*n+i[9]*r,this.z=i[2]*t+i[6]*n+i[10]*r,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=gt(this.x,e.x,t.x),this.y=gt(this.y,e.y,t.y),this.z=gt(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=gt(this.x,e,t),this.y=gt(this.y,e,t),this.z=gt(this.z,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(gt(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){let n=e.x,r=e.y,i=e.z,a=t.x,o=t.y,s=t.z;return this.x=r*s-i*o,this.y=i*a-n*s,this.z=n*o-r*a,this}projectOnVector(e){let t=e.lengthSq();if(t===0)return this.set(0,0,0);let n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return zt.copy(this).projectOnVector(e),this.sub(zt)}reflect(e){return this.sub(zt.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(gt(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y,r=this.z-e.z;return t*t+n*n+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){let r=Math.sin(t)*e;return this.x=r*Math.sin(n),this.y=Math.cos(t)*e,this.z=r*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){let t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),r=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=r,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},zt=new U,Bt=new Rt,W=class e{static{e.prototype.isMatrix3=!0}constructor(e,t,n,r,i,a,o,s,c){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,r,i,a,o,s,c)}set(e,t,n,r,i,a,o,s,c){let l=this.elements;return l[0]=e,l[1]=r,l[2]=o,l[3]=t,l[4]=i,l[5]=s,l[6]=n,l[7]=a,l[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){let t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,r=t.elements,i=this.elements,a=n[0],o=n[3],s=n[6],c=n[1],l=n[4],u=n[7],d=n[2],f=n[5],p=n[8],m=r[0],h=r[3],g=r[6],_=r[1],v=r[4],y=r[7],b=r[2],x=r[5],S=r[8];return i[0]=a*m+o*_+s*b,i[3]=a*h+o*v+s*x,i[6]=a*g+o*y+s*S,i[1]=c*m+l*_+u*b,i[4]=c*h+l*v+u*x,i[7]=c*g+l*y+u*S,i[2]=d*m+f*_+p*b,i[5]=d*h+f*v+p*x,i[8]=d*g+f*y+p*S,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8];return t*a*l-t*o*c-n*i*l+n*o*s+r*i*c-r*a*s}invert(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8],u=l*a-o*c,d=o*s-l*i,f=c*i-a*s,p=t*u+n*d+r*f;if(p===0)return this.set(0,0,0,0,0,0,0,0,0);let m=1/p;return e[0]=u*m,e[1]=(r*c-l*n)*m,e[2]=(o*n-r*a)*m,e[3]=d*m,e[4]=(l*t-r*s)*m,e[5]=(r*i-o*t)*m,e[6]=f*m,e[7]=(n*s-c*t)*m,e[8]=(a*t-n*i)*m,this}transpose(){let e,t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){let t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,r,i,a,o){let s=Math.cos(i),c=Math.sin(i);return this.set(n*s,n*c,-n*(s*a+c*o)+a+e,-r*c,r*s,-r*(-c*a+s*o)+o+t,0,0,1),this}scale(e,t){return st(`Matrix3: .scale() is deprecated. Use .makeScale() instead.`),this.premultiply(Vt.makeScale(e,t)),this}rotate(e){return st(`Matrix3: .rotate() is deprecated. Use .makeRotation() instead.`),this.premultiply(Vt.makeRotation(-e)),this}translate(e,t){return st(`Matrix3: .translate() is deprecated. Use .makeTranslation() instead.`),this.premultiply(Vt.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){let t=this.elements,n=e.elements;for(let e=0;e<9;e++)if(t[e]!==n[e])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}},Vt=new W,Ht=new W().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Ut=new W().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Wt(){let e={enabled:!0,workingColorSpace:Ke,spaces:{},convert:function(e,t,n){return this.enabled===!1||t===n||!t||!n?e:(this.spaces[t].transfer===`srgb`&&(e.r=Kt(e.r),e.g=Kt(e.g),e.b=Kt(e.b)),this.spaces[t].primaries!==this.spaces[n].primaries&&(e.applyMatrix3(this.spaces[t].toXYZ),e.applyMatrix3(this.spaces[n].fromXYZ)),this.spaces[n].transfer===`srgb`&&(e.r=qt(e.r),e.g=qt(e.g),e.b=qt(e.b)),e)},workingToColorSpace:function(e,t){return this.convert(e,this.workingColorSpace,t)},colorSpaceToWorking:function(e,t){return this.convert(e,t,this.workingColorSpace)},getPrimaries:function(e){return this.spaces[e].primaries},getTransfer:function(e){return e===``?qe:this.spaces[e].transfer},getToneMappingMode:function(e){return this.spaces[e].outputColorSpaceConfig.toneMappingMode||`standard`},getLuminanceCoefficients:function(e,t=this.workingColorSpace){return e.fromArray(this.spaces[t].luminanceCoefficients)},define:function(e){Object.assign(this.spaces,e)},_getMatrix:function(e,t,n){return e.copy(this.spaces[t].toXYZ).multiply(this.spaces[n].fromXYZ)},_getDrawingBufferColorSpace:function(e){return this.spaces[e].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(e=this.workingColorSpace){return this.spaces[e].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(t,n){return st(`ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace().`),e.workingToColorSpace(t,n)},toWorkingColorSpace:function(t,n){return st(`ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking().`),e.colorSpaceToWorking(t,n)}},t=[.64,.33,.3,.6,.15,.06],n=[.2126,.7152,.0722],r=[.3127,.329];return e.define({[Ke]:{primaries:t,whitePoint:r,transfer:qe,toXYZ:Ht,fromXYZ:Ut,luminanceCoefficients:n,workingColorSpaceConfig:{unpackColorSpace:Ge},outputColorSpaceConfig:{drawingBufferColorSpace:Ge}},[Ge]:{primaries:t,whitePoint:r,transfer:Je,toXYZ:Ht,fromXYZ:Ut,luminanceCoefficients:n,outputColorSpaceConfig:{drawingBufferColorSpace:Ge}}}),e}var Gt=Wt();function Kt(e){return e<.04045?e*.0773993808:(e*.9478672986+.0521327014)**2.4}function qt(e){return e<.0031308?e*12.92:1.055*e**.41666-.055}var Jt,Yt=class{static getDataURL(e,t=`image/png`){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>`u`)return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{Jt===void 0&&(Jt=nt(`canvas`)),Jt.width=e.width,Jt.height=e.height;let t=Jt.getContext(`2d`);e instanceof ImageData?t.putImageData(e,0,0):t.drawImage(e,0,0,e.width,e.height),n=Jt}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap){let t=nt(`canvas`);t.width=e.width,t.height=e.height;let n=t.getContext(`2d`);n.drawImage(e,0,0,e.width,e.height);let r=n.getImageData(0,0,e.width,e.height),i=r.data;for(let e=0;e<i.length;e++)i[e]=Kt(i[e]/255)*255;return n.putImageData(r,0,0),t}if(e.data){let t=e.data.slice(0);for(let e=0;e<t.length;e++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[e]=Math.floor(Kt(t[e]/255)*255):t[e]=Kt(t[e]);return{data:t,width:e.width,height:e.height}}return B(`ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied.`),e}},Xt=0,Zt=class{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Xt++}),this.uuid=ht(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){let t=this.data;return typeof HTMLVideoElement<`u`&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<`u`&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t===null?e.set(0,0,0):e.set(t.width,t.height,t.depth||0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){let t=e===void 0||typeof e==`string`;if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];let n={uuid:this.uuid,url:``},r=this.data;if(r!==null){let e;if(Array.isArray(r)){e=[];for(let t=0,n=r.length;t<n;t++)r[t].isDataTexture?e.push(Qt(r[t].image)):e.push(Qt(r[t]))}else e=Qt(r);n.url=e}return t||(e.images[this.uuid]=n),n}};function Qt(e){return typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap?Yt.getDataURL(e):e.data?{data:Array.from(e.data),width:e.width,height:e.height,type:e.data.constructor.name}:(B(`Texture: Unable to serialize Texture.`),{})}var $t=0,en=new U,tn=class e extends ut{constructor(t=e.DEFAULT_IMAGE,n=e.DEFAULT_MAPPING,r=i,a=i,o=l,s=d,c=O,u=p,f=e.DEFAULT_ANISOTROPY,m=``){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:$t++}),this.uuid=ht(),this.name=``,this.source=new Zt(t),this.mipmaps=[],this.mapping=n,this.channel=0,this.wrapS=r,this.wrapT=a,this.magFilter=o,this.minFilter=s,this.anisotropy=f,this.format=c,this.internalFormat=null,this.type=u,this.offset=new H(0,0),this.repeat=new H(1,1),this.center=new H(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new W,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=m,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(t&&t.depth&&t.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(en).x}get height(){return this.source.getSize(en).y}get depth(){return this.source.getSize(en).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(let t in e){let n=e[t];if(n===void 0){B(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}let r=this[t];if(r===void 0){B(`Texture.setValues(): property '${t}' does not exist.`);continue}r&&n&&r.isVector2&&n.isVector2||r&&n&&r.isVector3&&n.isVector3||r&&n&&r.isMatrix3&&n.isMatrix3?r.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e==`string`;if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];let n={metadata:{version:4.7,type:`Texture`,generator:`Texture.toJSON`},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:`dispose`})}transformUv(e){if(this.mapping!==300)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case r:e.x-=Math.floor(e.x);break;case i:e.x=e.x<0?0:1;break;case a:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x-=Math.floor(e.x)}if(e.y<0||e.y>1)switch(this.wrapT){case r:e.y-=Math.floor(e.y);break;case i:e.y=e.y<0?0:1;break;case a:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y-=Math.floor(e.y)}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}};tn.DEFAULT_IMAGE=null,tn.DEFAULT_MAPPING=300,tn.DEFAULT_ANISOTROPY=1;var nn=class e{static{e.prototype.isVector4=!0}constructor(e=0,t=0,n=0,r=1){this.x=e,this.y=t,this.z=n,this.w=r}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw Error(`THREE.Vector4: index is out of range: `+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw Error(`THREE.Vector4: index is out of range: `+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w===void 0?1:e.w,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){let t=this.x,n=this.y,r=this.z,i=this.w,a=e.elements;return this.x=a[0]*t+a[4]*n+a[8]*r+a[12]*i,this.y=a[1]*t+a[5]*n+a[9]*r+a[13]*i,this.z=a[2]*t+a[6]*n+a[10]*r+a[14]*i,this.w=a[3]*t+a[7]*n+a[11]*r+a[15]*i,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);let t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,r,i,a=.01,o=.1,s=e.elements,c=s[0],l=s[4],u=s[8],d=s[1],f=s[5],p=s[9],m=s[2],h=s[6],g=s[10];if(Math.abs(l-d)<a&&Math.abs(u-m)<a&&Math.abs(p-h)<a){if(Math.abs(l+d)<o&&Math.abs(u+m)<o&&Math.abs(p+h)<o&&Math.abs(c+f+g-3)<o)return this.set(1,0,0,0),this;t=Math.PI;let e=(c+1)/2,s=(f+1)/2,_=(g+1)/2,v=(l+d)/4,y=(u+m)/4,b=(p+h)/4;return e>s&&e>_?e<a?(n=0,r=.707106781,i=.707106781):(n=Math.sqrt(e),r=v/n,i=y/n):s>_?s<a?(n=.707106781,r=0,i=.707106781):(r=Math.sqrt(s),n=v/r,i=b/r):_<a?(n=.707106781,r=.707106781,i=0):(i=Math.sqrt(_),n=y/i,r=b/i),this.set(n,r,i,t),this}let _=Math.sqrt((h-p)*(h-p)+(u-m)*(u-m)+(d-l)*(d-l));return Math.abs(_)<.001&&(_=1),this.x=(h-p)/_,this.y=(u-m)/_,this.z=(d-l)/_,this.w=Math.acos((c+f+g-1)/2),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=gt(this.x,e.x,t.x),this.y=gt(this.y,e.y,t.y),this.z=gt(this.z,e.z,t.z),this.w=gt(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=gt(this.x,e,t),this.y=gt(this.y,e,t),this.z=gt(this.z,e,t),this.w=gt(this.w,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(gt(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},rn=class extends ut{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:l,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new nn(0,0,e,t),this.scissorTest=!1,this.viewport=new nn(0,0,e,t),this.textures=[];let r=new tn({width:e,height:t,depth:n.depth}),i=n.count;for(let e=0;e<i;e++)this.textures[e]=r.clone(),this.textures[e].isRenderTargetTexture=!0,this.textures[e].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(e={}){let t={minFilter:l,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let e=0;e<this.textures.length;e++)this.textures[e].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let r=0,i=this.textures.length;r<i;r++)this.textures[r].image.width=e,this.textures[r].image.height=t,this.textures[r].image.depth=n,this.textures[r].isData3DTexture!==!0&&(this.textures[r].isArrayTexture=this.textures[r].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;let n=Object.assign({},e.textures[t].image);this.textures[t].source=new Zt(n)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this.multiview=e.multiview,this.useArrayDepthTexture=e.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:`dispose`})}},an=class extends rn{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}},on=class extends tn{constructor(e=null,t=1,n=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:r},this.magFilter=o,this.minFilter=o,this.wrapR=i,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}},sn=class extends an{constructor(e=1,t=1,n=1,r={}){super(e,t,r),this.isWebGLArrayRenderTarget=!0,this.depth=n,this.texture=new on(null,e,t,n),this._setTextureOptions(r),this.texture.isRenderTargetTexture=!0}},cn=class extends tn{constructor(e=null,t=1,n=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:r},this.magFilter=o,this.minFilter=o,this.wrapR=i,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}},ln=class e{static{e.prototype.isMatrix4=!0}constructor(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h)}set(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h){let g=this.elements;return g[0]=e,g[4]=t,g[8]=n,g[12]=r,g[1]=i,g[5]=a,g[9]=o,g[13]=s,g[2]=c,g[6]=l,g[10]=u,g[14]=d,g[3]=f,g[7]=p,g[11]=m,g[15]=h,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new e().fromArray(this.elements)}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){let t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){let t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return this.determinantAffine()===0?(e.set(1,0,0),t.set(0,1,0),n.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){if(e.determinantAffine()===0)return this.identity();let t=this.elements,n=e.elements,r=1/un.setFromMatrixColumn(e,0).length(),i=1/un.setFromMatrixColumn(e,1).length(),a=1/un.setFromMatrixColumn(e,2).length();return t[0]=n[0]*r,t[1]=n[1]*r,t[2]=n[2]*r,t[3]=0,t[4]=n[4]*i,t[5]=n[5]*i,t[6]=n[6]*i,t[7]=0,t[8]=n[8]*a,t[9]=n[9]*a,t[10]=n[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){let t=this.elements,n=e.x,r=e.y,i=e.z,a=Math.cos(n),o=Math.sin(n),s=Math.cos(r),c=Math.sin(r),l=Math.cos(i),u=Math.sin(i);if(e.order===`XYZ`){let e=a*l,n=a*u,r=o*l,i=o*u;t[0]=s*l,t[4]=-s*u,t[8]=c,t[1]=n+r*c,t[5]=e-i*c,t[9]=-o*s,t[2]=i-e*c,t[6]=r+n*c,t[10]=a*s}else if(e.order===`YXZ`){let e=s*l,n=s*u,r=c*l,i=c*u;t[0]=e+i*o,t[4]=r*o-n,t[8]=a*c,t[1]=a*u,t[5]=a*l,t[9]=-o,t[2]=n*o-r,t[6]=i+e*o,t[10]=a*s}else if(e.order===`ZXY`){let e=s*l,n=s*u,r=c*l,i=c*u;t[0]=e-i*o,t[4]=-a*u,t[8]=r+n*o,t[1]=n+r*o,t[5]=a*l,t[9]=i-e*o,t[2]=-a*c,t[6]=o,t[10]=a*s}else if(e.order===`ZYX`){let e=a*l,n=a*u,r=o*l,i=o*u;t[0]=s*l,t[4]=r*c-n,t[8]=e*c+i,t[1]=s*u,t[5]=i*c+e,t[9]=n*c-r,t[2]=-c,t[6]=o*s,t[10]=a*s}else if(e.order===`YZX`){let e=a*s,n=a*c,r=o*s,i=o*c;t[0]=s*l,t[4]=i-e*u,t[8]=r*u+n,t[1]=u,t[5]=a*l,t[9]=-o*l,t[2]=-c*l,t[6]=n*u+r,t[10]=e-i*u}else if(e.order===`XZY`){let e=a*s,n=a*c,r=o*s,i=o*c;t[0]=s*l,t[4]=-u,t[8]=c*l,t[1]=e*u+i,t[5]=a*l,t[9]=n*u-r,t[2]=r*u-n,t[6]=o*l,t[10]=i*u+e}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(fn,e,pn)}lookAt(e,t,n){let r=this.elements;return gn.subVectors(e,t),gn.lengthSq()===0&&(gn.z=1),gn.normalize(),mn.crossVectors(n,gn),mn.lengthSq()===0&&(Math.abs(n.z)===1?gn.x+=1e-4:gn.z+=1e-4,gn.normalize(),mn.crossVectors(n,gn)),mn.normalize(),hn.crossVectors(gn,mn),r[0]=mn.x,r[4]=hn.x,r[8]=gn.x,r[1]=mn.y,r[5]=hn.y,r[9]=gn.y,r[2]=mn.z,r[6]=hn.z,r[10]=gn.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,r=t.elements,i=this.elements,a=n[0],o=n[4],s=n[8],c=n[12],l=n[1],u=n[5],d=n[9],f=n[13],p=n[2],m=n[6],h=n[10],g=n[14],_=n[3],v=n[7],y=n[11],b=n[15],x=r[0],S=r[4],C=r[8],w=r[12],T=r[1],E=r[5],D=r[9],O=r[13],k=r[2],A=r[6],j=r[10],M=r[14],N=r[3],ee=r[7],te=r[11],P=r[15];return i[0]=a*x+o*T+s*k+c*N,i[4]=a*S+o*E+s*A+c*ee,i[8]=a*C+o*D+s*j+c*te,i[12]=a*w+o*O+s*M+c*P,i[1]=l*x+u*T+d*k+f*N,i[5]=l*S+u*E+d*A+f*ee,i[9]=l*C+u*D+d*j+f*te,i[13]=l*w+u*O+d*M+f*P,i[2]=p*x+m*T+h*k+g*N,i[6]=p*S+m*E+h*A+g*ee,i[10]=p*C+m*D+h*j+g*te,i[14]=p*w+m*O+h*M+g*P,i[3]=_*x+v*T+y*k+b*N,i[7]=_*S+v*E+y*A+b*ee,i[11]=_*C+v*D+y*j+b*te,i[15]=_*w+v*O+y*M+b*P,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[4],r=e[8],i=e[12],a=e[1],o=e[5],s=e[9],c=e[13],l=e[2],u=e[6],d=e[10],f=e[14],p=e[3],m=e[7],h=e[11],g=e[15],_=s*f-c*d,v=o*f-c*u,y=o*d-s*u,b=a*f-c*l,x=a*d-s*l,S=a*u-o*l;return t*(m*_-h*v+g*y)-n*(p*_-h*b+g*x)+r*(p*v-m*b+g*S)-i*(p*y-m*x+h*S)}determinantAffine(){let e=this.elements,t=e[0],n=e[4],r=e[8],i=e[1],a=e[5],o=e[9],s=e[2],c=e[6],l=e[10];return t*(a*l-o*c)-n*(i*l-o*s)+r*(i*c-a*s)}transpose(){let e=this.elements,t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){let r=this.elements;return e.isVector3?(r[12]=e.x,r[13]=e.y,r[14]=e.z):(r[12]=e,r[13]=t,r[14]=n),this}invert(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8],u=e[9],d=e[10],f=e[11],p=e[12],m=e[13],h=e[14],g=e[15],_=t*o-n*a,v=t*s-r*a,y=t*c-i*a,b=n*s-r*o,x=n*c-i*o,S=r*c-i*s,C=l*m-u*p,w=l*h-d*p,T=l*g-f*p,E=u*h-d*m,D=u*g-f*m,O=d*g-f*h,k=_*O-v*D+y*E+b*T-x*w+S*C;if(k===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let A=1/k;return e[0]=(o*O-s*D+c*E)*A,e[1]=(r*D-n*O-i*E)*A,e[2]=(m*S-h*x+g*b)*A,e[3]=(d*x-u*S-f*b)*A,e[4]=(s*T-a*O-c*w)*A,e[5]=(t*O-r*T+i*w)*A,e[6]=(h*y-p*S-g*v)*A,e[7]=(l*S-d*y+f*v)*A,e[8]=(a*D-o*T+c*C)*A,e[9]=(n*T-t*D-i*C)*A,e[10]=(p*x-m*y+g*_)*A,e[11]=(u*y-l*x-f*_)*A,e[12]=(o*w-a*E-s*C)*A,e[13]=(t*E-n*w+r*C)*A,e[14]=(m*v-p*b-h*_)*A,e[15]=(l*b-u*v+d*_)*A,this}scale(e){let t=this.elements,n=e.x,r=e.y,i=e.z;return t[0]*=n,t[4]*=r,t[8]*=i,t[1]*=n,t[5]*=r,t[9]*=i,t[2]*=n,t[6]*=r,t[10]*=i,t[3]*=n,t[7]*=r,t[11]*=i,this}getMaxScaleOnAxis(){let e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],r=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,r))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){let t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){let n=Math.cos(t),r=Math.sin(t),i=1-n,a=e.x,o=e.y,s=e.z,c=i*a,l=i*o;return this.set(c*a+n,c*o-r*s,c*s+r*o,0,c*o+r*s,l*o+n,l*s-r*a,0,c*s-r*o,l*s+r*a,i*s*s+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,r,i,a){return this.set(1,n,i,0,e,1,a,0,t,r,1,0,0,0,0,1),this}compose(e,t,n){let r=this.elements,i=t._x,a=t._y,o=t._z,s=t._w,c=i+i,l=a+a,u=o+o,d=i*c,f=i*l,p=i*u,m=a*l,h=a*u,g=o*u,_=s*c,v=s*l,y=s*u,b=n.x,x=n.y,S=n.z;return r[0]=(1-(m+g))*b,r[1]=(f+y)*b,r[2]=(p-v)*b,r[3]=0,r[4]=(f-y)*x,r[5]=(1-(d+g))*x,r[6]=(h+_)*x,r[7]=0,r[8]=(p+v)*S,r[9]=(h-_)*S,r[10]=(1-(d+m))*S,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,t,n){let r=this.elements;e.x=r[12],e.y=r[13],e.z=r[14];let i=this.determinantAffine();if(i===0)return n.set(1,1,1),t.identity(),this;let a=un.set(r[0],r[1],r[2]).length(),o=un.set(r[4],r[5],r[6]).length(),s=un.set(r[8],r[9],r[10]).length();i<0&&(a=-a),dn.copy(this);let c=1/a,l=1/o,u=1/s;return dn.elements[0]*=c,dn.elements[1]*=c,dn.elements[2]*=c,dn.elements[4]*=l,dn.elements[5]*=l,dn.elements[6]*=l,dn.elements[8]*=u,dn.elements[9]*=u,dn.elements[10]*=u,t.setFromRotationMatrix(dn),n.x=a,n.y=o,n.z=s,this}makePerspective(e,t,n,r,i,a,o=$e,s=!1){let c=this.elements,l=2*i/(t-e),u=2*i/(n-r),d=(t+e)/(t-e),f=(n+r)/(n-r),p,m;if(s)p=i/(a-i),m=a*i/(a-i);else if(o===2e3)p=-(a+i)/(a-i),m=-2*a*i/(a-i);else if(o===2001)p=-a/(a-i),m=-a*i/(a-i);else throw Error(`THREE.Matrix4.makePerspective(): Invalid coordinate system: `+o);return c[0]=l,c[4]=0,c[8]=d,c[12]=0,c[1]=0,c[5]=u,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=p,c[14]=m,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,n,r,i,a,o=$e,s=!1){let c=this.elements,l=2/(t-e),u=2/(n-r),d=-(t+e)/(t-e),f=-(n+r)/(n-r),p,m;if(s)p=1/(a-i),m=a/(a-i);else if(o===2e3)p=-2/(a-i),m=-(a+i)/(a-i);else if(o===2001)p=-1/(a-i),m=-i/(a-i);else throw Error(`THREE.Matrix4.makeOrthographic(): Invalid coordinate system: `+o);return c[0]=l,c[4]=0,c[8]=0,c[12]=d,c[1]=0,c[5]=u,c[9]=0,c[13]=f,c[2]=0,c[6]=0,c[10]=p,c[14]=m,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){let t=this.elements,n=e.elements;for(let e=0;e<16;e++)if(t[e]!==n[e])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}},un=new U,dn=new ln,fn=new U(0,0,0),pn=new U(1,1,1),mn=new U,hn=new U,gn=new U,_n=new ln,vn=new Rt,yn=class e{constructor(t=0,n=0,r=0,i=e.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=n,this._z=r,this._order=i}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,r=this._order){return this._x=e,this._y=t,this._z=n,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){let r=e.elements,i=r[0],a=r[4],o=r[8],s=r[1],c=r[5],l=r[9],u=r[2],d=r[6],f=r[10];switch(t){case`XYZ`:this._y=Math.asin(gt(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-l,f),this._z=Math.atan2(-a,i)):(this._x=Math.atan2(d,c),this._z=0);break;case`YXZ`:this._x=Math.asin(-gt(l,-1,1)),Math.abs(l)<.9999999?(this._y=Math.atan2(o,f),this._z=Math.atan2(s,c)):(this._y=Math.atan2(-u,i),this._z=0);break;case`ZXY`:this._x=Math.asin(gt(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-u,f),this._z=Math.atan2(-a,c)):(this._y=0,this._z=Math.atan2(s,i));break;case`ZYX`:this._y=Math.asin(-gt(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(d,f),this._z=Math.atan2(s,i)):(this._x=0,this._z=Math.atan2(-a,c));break;case`YZX`:this._z=Math.asin(gt(s,-1,1)),Math.abs(s)<.9999999?(this._x=Math.atan2(-l,c),this._y=Math.atan2(-u,i)):(this._x=0,this._y=Math.atan2(o,f));break;case`XZY`:this._z=Math.asin(-gt(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(o,i)):(this._x=Math.atan2(-l,f),this._y=0);break;default:B(`Euler: .setFromRotationMatrix() encountered an unknown order: `+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return _n.makeRotationFromQuaternion(e),this.setFromRotationMatrix(_n,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return vn.setFromEuler(this),this.setFromQuaternion(vn,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};yn.DEFAULT_ORDER=`XYZ`;var bn=class{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return!!(this.mask&(1<<e|0))}},xn=0,Sn=new U,Cn=new Rt,wn=new ln,Tn=new U,En=new U,Dn=new U,On=new Rt,kn=new U(1,0,0),An=new U(0,1,0),jn=new U(0,0,1),Mn={type:`added`},Nn={type:`removed`},Pn={type:`childadded`,child:null},Fn={type:`childremoved`,child:null},In=class e extends ut{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:xn++}),this.uuid=ht(),this.name=``,this.type=`Object3D`,this.parent=null,this.children=[],this.up=e.DEFAULT_UP.clone();let t=new U,n=new yn,r=new Rt,i=new U(1,1,1);function a(){r.setFromEuler(n,!1)}function o(){n.setFromQuaternion(r,void 0,!1)}n._onChange(a),r._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:n},quaternion:{configurable:!0,enumerable:!0,value:r},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new ln},normalMatrix:{value:new W}}),this.matrix=new ln,this.matrixWorld=new ln,this.matrixAutoUpdate=e.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=e.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new bn,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return Cn.setFromAxisAngle(e,t),this.quaternion.multiply(Cn),this}rotateOnWorldAxis(e,t){return Cn.setFromAxisAngle(e,t),this.quaternion.premultiply(Cn),this}rotateX(e){return this.rotateOnAxis(kn,e)}rotateY(e){return this.rotateOnAxis(An,e)}rotateZ(e){return this.rotateOnAxis(jn,e)}translateOnAxis(e,t){return Sn.copy(e).applyQuaternion(this.quaternion),this.position.add(Sn.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(kn,e)}translateY(e){return this.translateOnAxis(An,e)}translateZ(e){return this.translateOnAxis(jn,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(wn.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?Tn.copy(e):Tn.set(e,t,n);let r=this.parent;this.updateWorldMatrix(!0,!1),En.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?wn.lookAt(En,Tn,this.up):wn.lookAt(Tn,En,this.up),this.quaternion.setFromRotationMatrix(wn),r&&(wn.extractRotation(r.matrixWorld),Cn.setFromRotationMatrix(wn),this.quaternion.premultiply(Cn.invert()))}add(e){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return e===this?(V(`Object3D.add: object can't be added as a child of itself.`,e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(Mn),Pn.child=e,this.dispatchEvent(Pn),Pn.child=null):V(`Object3D.add: object not an instance of THREE.Object3D.`,e),this)}remove(e){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.remove(arguments[e]);return this}let t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(Nn),Fn.child=e,this.dispatchEvent(Fn),Fn.child=null),this}removeFromParent(){let e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),wn.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),wn.multiply(e.parent.matrixWorld)),e.applyMatrix4(wn),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(Mn),Pn.child=e,this.dispatchEvent(Pn),Pn.child=null,this}getObjectById(e){return this.getObjectByProperty(`id`,e)}getObjectByName(e){return this.getObjectByProperty(`name`,e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,r=this.children.length;n<r;n++){let r=this.children[n].getObjectByProperty(e,t);if(r!==void 0)return r}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);let r=this.children;for(let i=0,a=r.length;i<a;i++)r[i].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(En,e,Dn),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(En,On,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);let t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverseVisible(e)}traverseAncestors(e){let t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let e=this.pivot;if(e!==null){let t=e.x,n=e.y,r=e.z,i=this.matrix.elements;i[12]+=t-i[0]*t-i[4]*n-i[8]*r,i[13]+=n-i[1]*t-i[5]*n-i[9]*r,i[14]+=r-i[2]*t-i[6]*n-i[10]*r}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t,n=!1){let r=this.parent;if(e===!0&&r!==null&&r.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||n)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,n=!0),t===!0){let e=this.children;for(let t=0,r=e.length;t<r;t++)e[t].updateWorldMatrix(!1,!0,n)}}toJSON(e){let t=e===void 0||typeof e==`string`,n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:`Object`,generator:`Object3D.toJSON`});let r={};r.uuid=this.uuid,r.type=this.type,this.name!==``&&(r.name=this.name),this.castShadow===!0&&(r.castShadow=!0),this.receiveShadow===!0&&(r.receiveShadow=!0),this.visible===!1&&(r.visible=!1),this.frustumCulled===!1&&(r.frustumCulled=!1),this.renderOrder!==0&&(r.renderOrder=this.renderOrder),this.static!==!1&&(r.static=this.static),Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.pivot!==null&&(r.pivot=this.pivot.toArray()),this.matrixAutoUpdate===!1&&(r.matrixAutoUpdate=!1),this.morphTargetDictionary!==void 0&&(r.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(r.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(r.type=`InstancedMesh`,r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type=`BatchedMesh`,r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.geometryInfo=this._geometryInfo.map(e=>({...e,boundingBox:e.boundingBox?e.boundingBox.toJSON():void 0,boundingSphere:e.boundingSphere?e.boundingSphere.toJSON():void 0})),r.instanceInfo=this._instanceInfo.map(e=>({...e})),r.availableInstanceIds=this._availableInstanceIds.slice(),r.availableGeometryIds=this._availableGeometryIds.slice(),r.nextIndexStart=this._nextIndexStart,r.nextVertexStart=this._nextVertexStart,r.geometryCount=this._geometryCount,r.maxInstanceCount=this._maxInstanceCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.matricesTexture=this._matricesTexture.toJSON(e),r.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(r.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(r.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(r.boundingBox=this.boundingBox.toJSON()));function i(t,n){return t[n.uuid]===void 0&&(t[n.uuid]=n.toJSON(e)),n.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=i(e.geometries,this.geometry);let t=this.geometry.parameters;if(t!==void 0&&t.shapes!==void 0){let n=t.shapes;if(Array.isArray(n))for(let t=0,r=n.length;t<r;t++){let r=n[t];i(e.shapes,r)}else i(e.shapes,n)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(i(e.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let t=[];for(let n=0,r=this.material.length;n<r;n++)t.push(i(e.materials,this.material[n]));r.material=t}else r.material=i(e.materials,this.material);if(this.children.length>0){r.children=[];for(let t=0;t<this.children.length;t++)r.children.push(this.children[t].toJSON(e).object)}if(this.animations.length>0){r.animations=[];for(let t=0;t<this.animations.length;t++){let n=this.animations[t];r.animations.push(i(e.animations,n))}}if(t){let t=a(e.geometries),r=a(e.materials),i=a(e.textures),o=a(e.images),s=a(e.shapes),c=a(e.skeletons),l=a(e.animations),u=a(e.nodes);t.length>0&&(n.geometries=t),r.length>0&&(n.materials=r),i.length>0&&(n.textures=i),o.length>0&&(n.images=o),s.length>0&&(n.shapes=s),c.length>0&&(n.skeletons=c),l.length>0&&(n.animations=l),u.length>0&&(n.nodes=u)}return n.object=r,n;function a(e){let t=[];for(let n in e){let r=e[n];delete r.metadata,t.push(r)}return t}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot===null?null:e.pivot.clone(),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let t=0;t<e.children.length;t++){let n=e.children[t];this.add(n.clone())}return this}};In.DEFAULT_UP=new U(0,1,0),In.DEFAULT_MATRIX_AUTO_UPDATE=!0,In.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var Ln=class extends In{constructor(){super(),this.isGroup=!0,this.type=`Group`}},Rn={type:`move`},zn=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Ln,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Ln,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new U,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new U),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Ln,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new U,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new U,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){let t=this._hand;if(t)for(let n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:`connected`,data:e}),this}disconnect(e){return this.dispatchEvent({type:`disconnected`,data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let r=null,i=null,a=null,o=this._targetRay,s=this._grip,c=this._hand;if(e&&t.session.visibilityState!==`visible-blurred`){if(c&&e.hand){a=!0;for(let r of e.hand.values()){let e=t.getJointPose(r,n),i=this._getHandJoint(c,r);e!==null&&(i.matrix.fromArray(e.transform.matrix),i.matrix.decompose(i.position,i.rotation,i.scale),i.matrixWorldNeedsUpdate=!0,i.jointRadius=e.radius),i.visible=e!==null}let r=c.joints[`index-finger-tip`],i=c.joints[`thumb-tip`],o=r.position.distanceTo(i.position);c.inputState.pinching&&o>.025?(c.inputState.pinching=!1,this.dispatchEvent({type:`pinchend`,handedness:e.handedness,target:this})):!c.inputState.pinching&&o<=.015&&(c.inputState.pinching=!0,this.dispatchEvent({type:`pinchstart`,handedness:e.handedness,target:this}))}else s!==null&&e.gripSpace&&(i=t.getPose(e.gripSpace,n),i!==null&&(s.matrix.fromArray(i.transform.matrix),s.matrix.decompose(s.position,s.rotation,s.scale),s.matrixWorldNeedsUpdate=!0,i.linearVelocity?(s.hasLinearVelocity=!0,s.linearVelocity.copy(i.linearVelocity)):s.hasLinearVelocity=!1,i.angularVelocity?(s.hasAngularVelocity=!0,s.angularVelocity.copy(i.angularVelocity)):s.hasAngularVelocity=!1,s.eventsEnabled&&s.dispatchEvent({type:`gripUpdated`,data:e,target:this})));o!==null&&(r=t.getPose(e.targetRaySpace,n),r===null&&i!==null&&(r=i),r!==null&&(o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,r.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(r.linearVelocity)):o.hasLinearVelocity=!1,r.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(r.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(Rn)))}return o!==null&&(o.visible=r!==null),s!==null&&(s.visible=i!==null),c!==null&&(c.visible=a!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){let n=new Ln;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}},Bn={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Vn={h:0,s:0,l:0},Hn={h:0,s:0,l:0};function Un(e,t,n){return n<0&&(n+=1),n>1&&--n,n<1/6?e+(t-e)*6*n:n<1/2?t:n<2/3?e+(t-e)*6*(2/3-n):e}var G=class{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){let t=e;t&&t.isColor?this.copy(t):typeof t==`number`?this.setHex(t):typeof t==`string`&&this.setStyle(t)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Ge){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,Gt.colorSpaceToWorking(this,t),this}setRGB(e,t,n,r=Gt.workingColorSpace){return this.r=e,this.g=t,this.b=n,Gt.colorSpaceToWorking(this,r),this}setHSL(e,t,n,r=Gt.workingColorSpace){if(e=_t(e,1),t=gt(t,0,1),n=gt(n,0,1),t===0)this.r=this.g=this.b=n;else{let r=n<=.5?n*(1+t):n+t-n*t,i=2*n-r;this.r=Un(i,r,e+1/3),this.g=Un(i,r,e),this.b=Un(i,r,e-1/3)}return Gt.colorSpaceToWorking(this,r),this}setStyle(e,t=Ge){function n(t){t!==void 0&&parseFloat(t)<1&&B(`Color: Alpha component of `+e+` will be ignored.`)}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(e)){let i,a=r[1],o=r[2];switch(a){case`rgb`:case`rgba`:if(i=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(i[4]),this.setRGB(Math.min(255,parseInt(i[1],10))/255,Math.min(255,parseInt(i[2],10))/255,Math.min(255,parseInt(i[3],10))/255,t);if(i=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(i[4]),this.setRGB(Math.min(100,parseInt(i[1],10))/100,Math.min(100,parseInt(i[2],10))/100,Math.min(100,parseInt(i[3],10))/100,t);break;case`hsl`:case`hsla`:if(i=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(i[4]),this.setHSL(parseFloat(i[1])/360,parseFloat(i[2])/100,parseFloat(i[3])/100,t);break;default:B(`Color: Unknown color model `+e)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){let n=r[1],i=n.length;if(i===3)return this.setRGB(parseInt(n.charAt(0),16)/15,parseInt(n.charAt(1),16)/15,parseInt(n.charAt(2),16)/15,t);if(i===6)return this.setHex(parseInt(n,16),t);B(`Color: Invalid hex color `+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Ge){let n=Bn[e.toLowerCase()];return n===void 0?B(`Color: Unknown color `+e):this.setHex(n,t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Kt(e.r),this.g=Kt(e.g),this.b=Kt(e.b),this}copyLinearToSRGB(e){return this.r=qt(e.r),this.g=qt(e.g),this.b=qt(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Ge){return Gt.workingToColorSpace(Wn.copy(this),e),Math.round(gt(Wn.r*255,0,255))*65536+Math.round(gt(Wn.g*255,0,255))*256+Math.round(gt(Wn.b*255,0,255))}getHexString(e=Ge){return(`000000`+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=Gt.workingColorSpace){Gt.workingToColorSpace(Wn.copy(this),t);let n=Wn.r,r=Wn.g,i=Wn.b,a=Math.max(n,r,i),o=Math.min(n,r,i),s,c,l=(o+a)/2;if(o===a)s=0,c=0;else{let e=a-o;switch(c=l<=.5?e/(a+o):e/(2-a-o),a){case n:s=(r-i)/e+(r<i?6:0);break;case r:s=(i-n)/e+2;break;case i:s=(n-r)/e+4}s/=6}return e.h=s,e.s=c,e.l=l,e}getRGB(e,t=Gt.workingColorSpace){return Gt.workingToColorSpace(Wn.copy(this),t),e.r=Wn.r,e.g=Wn.g,e.b=Wn.b,e}getStyle(e=Ge){Gt.workingToColorSpace(Wn.copy(this),e);let t=Wn.r,n=Wn.g,r=Wn.b;return e===`srgb`?`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(r*255)})`:`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${r.toFixed(3)})`}offsetHSL(e,t,n){return this.getHSL(Vn),this.setHSL(Vn.h+e,Vn.s+t,Vn.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(Vn),e.getHSL(Hn);let n=bt(Vn.h,Hn.h,t),r=bt(Vn.s,Hn.s,t),i=bt(Vn.l,Hn.l,t);return this.setHSL(n,r,i),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){let t=this.r,n=this.g,r=this.b,i=e.elements;return this.r=i[0]*t+i[3]*n+i[6]*r,this.g=i[1]*t+i[4]*n+i[7]*r,this.b=i[2]*t+i[5]*n+i[8]*r,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},Wn=new G;G.NAMES=Bn;var Gn=class e{constructor(e,t=1,n=1e3){this.isFog=!0,this.name=``,this.color=new G(e),this.near=t,this.far=n}clone(){return new e(this.color,this.near,this.far)}toJSON(){return{type:`Fog`,name:this.name,color:this.color.getHex(),near:this.near,far:this.far}}},Kn=class extends In{constructor(){super(),this.isScene=!0,this.type=`Scene`,this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new yn,this.environmentIntensity=1,this.environmentRotation=new yn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`observe`,{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){let t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}},qn=new U,Jn=new U,Yn=new U,Xn=new U,Zn=new U,Qn=new U,$n=new U,er=new U,tr=new U,nr=new U,rr=new nn,ir=new nn,ar=new nn,or=class e{constructor(e=new U,t=new U,n=new U){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,r){r.subVectors(n,t),qn.subVectors(e,t),r.cross(qn);let i=r.lengthSq();return i>0?r.multiplyScalar(1/Math.sqrt(i)):r.set(0,0,0)}static getBarycoord(e,t,n,r,i){qn.subVectors(r,t),Jn.subVectors(n,t),Yn.subVectors(e,t);let a=qn.dot(qn),o=qn.dot(Jn),s=qn.dot(Yn),c=Jn.dot(Jn),l=Jn.dot(Yn),u=a*c-o*o;if(u===0)return i.set(0,0,0),null;let d=1/u,f=(c*s-o*l)*d,p=(a*l-o*s)*d;return i.set(1-f-p,p,f)}static containsPoint(e,t,n,r){return this.getBarycoord(e,t,n,r,Xn)!==null&&Xn.x>=0&&Xn.y>=0&&Xn.x+Xn.y<=1}static getInterpolation(e,t,n,r,i,a,o,s){return this.getBarycoord(e,t,n,r,Xn)===null?(s.x=0,s.y=0,`z`in s&&(s.z=0),`w`in s&&(s.w=0),null):(s.setScalar(0),s.addScaledVector(i,Xn.x),s.addScaledVector(a,Xn.y),s.addScaledVector(o,Xn.z),s)}static getInterpolatedAttribute(e,t,n,r,i,a){return rr.setScalar(0),ir.setScalar(0),ar.setScalar(0),rr.fromBufferAttribute(e,t),ir.fromBufferAttribute(e,n),ar.fromBufferAttribute(e,r),a.setScalar(0),a.addScaledVector(rr,i.x),a.addScaledVector(ir,i.y),a.addScaledVector(ar,i.z),a}static isFrontFacing(e,t,n,r){return qn.subVectors(n,t),Jn.subVectors(e,t),qn.cross(Jn).dot(r)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,r){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[r]),this}setFromAttributeAndIndices(e,t,n,r){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,r),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return qn.subVectors(this.c,this.b),Jn.subVectors(this.a,this.b),qn.cross(Jn).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return e.getNormal(this.a,this.b,this.c,t)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,n){return e.getBarycoord(t,this.a,this.b,this.c,n)}getInterpolation(t,n,r,i,a){return e.getInterpolation(t,this.a,this.b,this.c,n,r,i,a)}containsPoint(t){return e.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return e.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){let n=this.a,r=this.b,i=this.c,a,o;Zn.subVectors(r,n),Qn.subVectors(i,n),er.subVectors(e,n);let s=Zn.dot(er),c=Qn.dot(er);if(s<=0&&c<=0)return t.copy(n);tr.subVectors(e,r);let l=Zn.dot(tr),u=Qn.dot(tr);if(l>=0&&u<=l)return t.copy(r);let d=s*u-l*c;if(d<=0&&s>=0&&l<=0)return a=s/(s-l),t.copy(n).addScaledVector(Zn,a);nr.subVectors(e,i);let f=Zn.dot(nr),p=Qn.dot(nr);if(p>=0&&f<=p)return t.copy(i);let m=f*c-s*p;if(m<=0&&c>=0&&p<=0)return o=c/(c-p),t.copy(n).addScaledVector(Qn,o);let h=l*p-f*u;if(h<=0&&u-l>=0&&f-p>=0)return $n.subVectors(i,r),o=(u-l)/(u-l+(f-p)),t.copy(r).addScaledVector($n,o);let g=1/(h+m+d);return a=m*g,o=d*g,t.copy(n).addScaledVector(Zn,a).addScaledVector(Qn,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}},sr=class{constructor(e=new U(1/0,1/0,1/0),t=new U(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(lr.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(lr.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){let n=lr.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);let n=e.geometry;if(n!==void 0){let r=n.getAttribute(`position`);if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let t=0,n=r.count;t<n;t++)e.isMesh===!0?e.getVertexPosition(t,lr):lr.fromBufferAttribute(r,t),lr.applyMatrix4(e.matrixWorld),this.expandByPoint(lr);else e.boundingBox===void 0?(n.boundingBox===null&&n.computeBoundingBox(),ur.copy(n.boundingBox)):(e.boundingBox===null&&e.computeBoundingBox(),ur.copy(e.boundingBox)),ur.applyMatrix4(e.matrixWorld),this.union(ur)}let r=e.children;for(let e=0,n=r.length;e<n;e++)this.expandByObject(r[e],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,lr),lr.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(_r),vr.subVectors(this.max,_r),dr.subVectors(e.a,_r),fr.subVectors(e.b,_r),pr.subVectors(e.c,_r),mr.subVectors(fr,dr),hr.subVectors(pr,fr),gr.subVectors(dr,pr);let t=[0,-mr.z,mr.y,0,-hr.z,hr.y,0,-gr.z,gr.y,mr.z,0,-mr.x,hr.z,0,-hr.x,gr.z,0,-gr.x,-mr.y,mr.x,0,-hr.y,hr.x,0,-gr.y,gr.x,0];return!xr(t,dr,fr,pr,vr)||(t=[1,0,0,0,1,0,0,0,1],!xr(t,dr,fr,pr,vr))?!1:(yr.crossVectors(mr,hr),t=[yr.x,yr.y,yr.z],xr(t,dr,fr,pr,vr))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,lr).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(lr).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(cr[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),cr[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),cr[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),cr[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),cr[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),cr[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),cr[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),cr[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(cr),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}},cr=[new U,new U,new U,new U,new U,new U,new U,new U],lr=new U,ur=new sr,dr=new U,fr=new U,pr=new U,mr=new U,hr=new U,gr=new U,_r=new U,vr=new U,yr=new U,br=new U;function xr(e,t,n,r,i){for(let a=0,o=e.length-3;a<=o;a+=3){br.fromArray(e,a);let o=i.x*Math.abs(br.x)+i.y*Math.abs(br.y)+i.z*Math.abs(br.z),s=t.dot(br),c=n.dot(br),l=r.dot(br);if(Math.max(-Math.max(s,c,l),Math.min(s,c,l))>o)return!1}return!0}var Sr=new U,Cr=new H,wr=0,Tr=class extends ut{constructor(e,t,n=!1){if(super(),Array.isArray(e))throw TypeError(`THREE.BufferAttribute: array should be a Typed Array.`);this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:wr++}),this.name=``,this.array=e,this.itemSize=t,this.count=e===void 0?0:e.length/t,this.normalized=n,this.usage=Xe,this.updateRanges=[],this.gpuType=y,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let r=0,i=this.itemSize;r<i;r++)this.array[e+r]=t.array[n+r];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)Cr.fromBufferAttribute(this,t),Cr.applyMatrix3(e),this.setXY(t,Cr.x,Cr.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)Sr.fromBufferAttribute(this,t),Sr.applyMatrix3(e),this.setXYZ(t,Sr.x,Sr.y,Sr.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)Sr.fromBufferAttribute(this,t),Sr.applyMatrix4(e),this.setXYZ(t,Sr.x,Sr.y,Sr.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)Sr.fromBufferAttribute(this,t),Sr.applyNormalMatrix(e),this.setXYZ(t,Sr.x,Sr.y,Sr.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)Sr.fromBufferAttribute(this,t),Sr.transformDirection(e),this.setXYZ(t,Sr.x,Sr.y,Sr.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=Ft(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=It(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=Ft(t,this.array)),t}setX(e,t){return this.normalized&&(t=It(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=Ft(t,this.array)),t}setY(e,t){return this.normalized&&(t=It(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=Ft(t,this.array)),t}setZ(e,t){return this.normalized&&(t=It(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=Ft(t,this.array)),t}setW(e,t){return this.normalized&&(t=It(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=It(t,this.array),n=It(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,r){return e*=this.itemSize,this.normalized&&(t=It(t,this.array),n=It(n,this.array),r=It(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this}setXYZW(e,t,n,r,i){return e*=this.itemSize,this.normalized&&(t=It(t,this.array),n=It(n,this.array),r=It(r,this.array),i=It(i,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this.array[e+3]=i,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==``&&(e.name=this.name),this.usage!==35044&&(e.usage=this.usage),e}dispose(){this.dispatchEvent({type:`dispose`})}},Er=class extends Tr{constructor(e,t,n){super(new Uint16Array(e),t,n)}},Dr=class extends Tr{constructor(e,t,n){super(new Uint32Array(e),t,n)}},Or=class extends Tr{constructor(e,t,n){super(new Float32Array(e),t,n)}},kr=new sr,Ar=new U,jr=new U,Mr=class{constructor(e=new U,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){let n=this.center;t===void 0?kr.setFromPoints(e).getCenter(n):n.copy(t);let r=0;for(let t=0,i=e.length;t<i;t++)r=Math.max(r,n.distanceToSquared(e[t]));return this.radius=Math.sqrt(r),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){let t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){let n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius*=e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Ar.subVectors(e,this.center);let t=Ar.lengthSq();if(t>this.radius*this.radius){let e=Math.sqrt(t),n=(e-this.radius)*.5;this.center.addScaledVector(Ar,n/e),this.radius+=n}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(jr.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Ar.copy(e.center).add(jr)),this.expandByPoint(Ar.copy(e.center).sub(jr))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}},Nr=0,Pr=new ln,Fr=new In,Ir=new U,Lr=new sr,Rr=new sr,zr=new U,Br=class e extends ut{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Nr++}),this.uuid=ht(),this.name=``,this.type=`BufferGeometry`,this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(e){return this.index=Array.isArray(e)?new(et(e)?Dr:Er)(e,1):e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){let t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let t=new W().getNormalMatrix(e);n.applyNormalMatrix(t),n.needsUpdate=!0}let r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(e){return Pr.makeRotationFromQuaternion(e),this.applyMatrix4(Pr),this}rotateX(e){return Pr.makeRotationX(e),this.applyMatrix4(Pr),this}rotateY(e){return Pr.makeRotationY(e),this.applyMatrix4(Pr),this}rotateZ(e){return Pr.makeRotationZ(e),this.applyMatrix4(Pr),this}translate(e,t,n){return Pr.makeTranslation(e,t,n),this.applyMatrix4(Pr),this}scale(e,t,n){return Pr.makeScale(e,t,n),this.applyMatrix4(Pr),this}lookAt(e){return Fr.lookAt(e),Fr.updateMatrix(),this.applyMatrix4(Fr.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Ir).negate(),this.translate(Ir.x,Ir.y,Ir.z),this}setFromPoints(e){let t=this.getAttribute(`position`);if(t===void 0){let t=[];for(let n=0,r=e.length;n<r;n++){let r=e[n];t.push(r.x,r.y,r.z||0)}this.setAttribute(`position`,new Or(t,3))}else{let n=Math.min(e.length,t.count);for(let r=0;r<n;r++){let n=e[r];t.setXYZ(r,n.x,n.y,n.z||0)}e.length>t.count&&B(`BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry.`),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new sr);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){V(`BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.`,this),this.boundingBox.set(new U(-1/0,-1/0,-1/0),new U(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let e=0,n=t.length;e<n;e++){let n=t[e];Lr.setFromBufferAttribute(n),this.morphTargetsRelative?(zr.addVectors(this.boundingBox.min,Lr.min),this.boundingBox.expandByPoint(zr),zr.addVectors(this.boundingBox.max,Lr.max),this.boundingBox.expandByPoint(zr)):(this.boundingBox.expandByPoint(Lr.min),this.boundingBox.expandByPoint(Lr.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&V(`BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.`,this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Mr);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){V(`BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.`,this),this.boundingSphere.set(new U,1/0);return}if(e){let n=this.boundingSphere.center;if(Lr.setFromBufferAttribute(e),t)for(let e=0,n=t.length;e<n;e++){let n=t[e];Rr.setFromBufferAttribute(n),this.morphTargetsRelative?(zr.addVectors(Lr.min,Rr.min),Lr.expandByPoint(zr),zr.addVectors(Lr.max,Rr.max),Lr.expandByPoint(zr)):(Lr.expandByPoint(Rr.min),Lr.expandByPoint(Rr.max))}Lr.getCenter(n);let r=0;for(let t=0,i=e.count;t<i;t++)zr.fromBufferAttribute(e,t),r=Math.max(r,n.distanceToSquared(zr));if(t)for(let i=0,a=t.length;i<a;i++){let a=t[i],o=this.morphTargetsRelative;for(let t=0,i=a.count;t<i;t++)zr.fromBufferAttribute(a,t),o&&(Ir.fromBufferAttribute(e,t),zr.add(Ir)),r=Math.max(r,n.distanceToSquared(zr))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&V(`BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.`,this)}}computeTangents(){let e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){V(`BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)`);return}let n=t.position,r=t.normal,i=t.uv,a=this.getAttribute(`tangent`);(a===void 0||a.count!==n.count)&&(a=new Tr(new Float32Array(4*n.count),4),this.setAttribute(`tangent`,a));let o=[],s=[];for(let e=0;e<n.count;e++)o[e]=new U,s[e]=new U;let c=new U,l=new U,u=new U,d=new H,f=new H,p=new H,m=new U,h=new U;function g(e,t,r){c.fromBufferAttribute(n,e),l.fromBufferAttribute(n,t),u.fromBufferAttribute(n,r),d.fromBufferAttribute(i,e),f.fromBufferAttribute(i,t),p.fromBufferAttribute(i,r),l.sub(c),u.sub(c),f.sub(d),p.sub(d);let a=1/(f.x*p.y-p.x*f.y);isFinite(a)&&(m.copy(l).multiplyScalar(p.y).addScaledVector(u,-f.y).multiplyScalar(a),h.copy(u).multiplyScalar(f.x).addScaledVector(l,-p.x).multiplyScalar(a),o[e].add(m),o[t].add(m),o[r].add(m),s[e].add(h),s[t].add(h),s[r].add(h))}let _=this.groups;_.length===0&&(_=[{start:0,count:e.count}]);for(let t=0,n=_.length;t<n;++t){let n=_[t],r=n.start,i=n.count;for(let t=r,n=r+i;t<n;t+=3)g(e.getX(t+0),e.getX(t+1),e.getX(t+2))}let v=new U,y=new U,b=new U,x=new U;function S(e){b.fromBufferAttribute(r,e),x.copy(b);let t=o[e];v.copy(t),v.sub(b.multiplyScalar(b.dot(t))).normalize(),y.crossVectors(x,t);let n=y.dot(s[e])<0?-1:1;a.setXYZW(e,v.x,v.y,v.z,n)}for(let t=0,n=_.length;t<n;++t){let n=_[t],r=n.start,i=n.count;for(let t=r,n=r+i;t<n;t+=3)S(e.getX(t+0)),S(e.getX(t+1)),S(e.getX(t+2))}this._transformed=!0}computeVertexNormals(){let e=this.index,t=this.getAttribute(`position`);if(t!==void 0){let n=this.getAttribute(`normal`);if(n===void 0||n.count!==t.count)n=new Tr(new Float32Array(t.count*3),3),this.setAttribute(`normal`,n);else for(let e=0,t=n.count;e<t;e++)n.setXYZ(e,0,0,0);let r=new U,i=new U,a=new U,o=new U,s=new U,c=new U,l=new U,u=new U;if(e)for(let d=0,f=e.count;d<f;d+=3){let f=e.getX(d+0),p=e.getX(d+1),m=e.getX(d+2);r.fromBufferAttribute(t,f),i.fromBufferAttribute(t,p),a.fromBufferAttribute(t,m),l.subVectors(a,i),u.subVectors(r,i),l.cross(u),o.fromBufferAttribute(n,f),s.fromBufferAttribute(n,p),c.fromBufferAttribute(n,m),o.add(l),s.add(l),c.add(l),n.setXYZ(f,o.x,o.y,o.z),n.setXYZ(p,s.x,s.y,s.z),n.setXYZ(m,c.x,c.y,c.z)}else for(let e=0,o=t.count;e<o;e+=3)r.fromBufferAttribute(t,e+0),i.fromBufferAttribute(t,e+1),a.fromBufferAttribute(t,e+2),l.subVectors(a,i),u.subVectors(r,i),l.cross(u),n.setXYZ(e+0,l.x,l.y,l.z),n.setXYZ(e+1,l.x,l.y,l.z),n.setXYZ(e+2,l.x,l.y,l.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)zr.fromBufferAttribute(e,t),zr.normalize(),e.setXYZ(t,zr.x,zr.y,zr.z)}toNonIndexed(){function t(e,t){let n=e.array,r=e.itemSize,i=e.normalized,a=new n.constructor(t.length*r),o=0,s=0;for(let i=0,c=t.length;i<c;i++){o=e.isInterleavedBufferAttribute?t[i]*e.data.stride+e.offset:t[i]*r;for(let e=0;e<r;e++)a[s++]=n[o++]}return new Tr(a,r,i)}if(this.index===null)return B(`BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed.`),this;let n=new e,r=this.index.array,i=this.attributes;for(let e in i){let a=i[e],o=t(a,r);n.setAttribute(e,o)}let a=this.morphAttributes;for(let e in a){let i=[],o=a[e];for(let e=0,n=o.length;e<n;e++){let n=o[e],a=t(n,r);i.push(a)}n.morphAttributes[e]=i}n.morphTargetsRelative=this.morphTargetsRelative;let o=this.groups;for(let e=0,t=o.length;e<t;e++){let t=o[e];n.addGroup(t.start,t.count,t.materialIndex)}return n}toJSON(){let e={metadata:{version:4.7,type:`BufferGeometry`,generator:`BufferGeometry.toJSON`}};if(e.uuid=this.uuid,e.type=this.parameters!==void 0&&this._transformed===!0?`BufferGeometry`:this.type,this.name!==``&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){let t=this.parameters;for(let n in t)t[n]!==void 0&&(e[n]=t[n]);return e}e.data={attributes:{}};let t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});let n=this.attributes;for(let t in n){let r=n[t];e.data.attributes[t]=r.toJSON(e.data)}let r={},i=!1;for(let t in this.morphAttributes){let n=this.morphAttributes[t],a=[];for(let t=0,r=n.length;t<r;t++){let r=n[t];a.push(r.toJSON(e.data))}a.length>0&&(r[t]=a,i=!0)}i&&(e.data.morphAttributes=r,e.data.morphTargetsRelative=this.morphTargetsRelative);let a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));let o=this.boundingSphere;return o!==null&&(e.data.boundingSphere=o.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let t={};this.name=e.name;let n=e.index;n!==null&&this.setIndex(n.clone());let r=e.attributes;for(let e in r){let n=r[e];this.setAttribute(e,n.clone(t))}let i=e.morphAttributes;for(let e in i){let n=[],r=i[e];for(let e=0,i=r.length;e<i;e++)n.push(r[e].clone(t));this.morphAttributes[e]=n}this.morphTargetsRelative=e.morphTargetsRelative;let a=e.groups;for(let e=0,t=a.length;e<t;e++){let t=a[e];this.addGroup(t.start,t.count,t.materialIndex)}let o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());let s=e.boundingSphere;return s!==null&&(this.boundingSphere=s.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this._transformed=e._transformed,this}dispose(){this.dispatchEvent({type:`dispose`})}},Vr=class{constructor(e,t){this.isInterleavedBuffer=!0,this.array=e,this.stride=t,this.count=e===void 0?0:e.length/t,this.usage=Xe,this.updateRanges=[],this.version=0,this.uuid=ht()}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,n){e*=this.stride,n*=t.stride;for(let r=0,i=this.stride;r<i;r++)this.array[e+r]=t.array[n+r];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=ht()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);let t=new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]),n=new this.constructor(t,this.stride);return n.setUsage(this.usage),n}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){return e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=ht()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer))),{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}},Hr=new U,Ur=class e{constructor(e,t,n,r=!1){this.isInterleavedBufferAttribute=!0,this.name=``,this.data=e,this.itemSize=t,this.offset=n,this.normalized=r}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,n=this.data.count;t<n;t++)Hr.fromBufferAttribute(this,t),Hr.applyMatrix4(e),this.setXYZ(t,Hr.x,Hr.y,Hr.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)Hr.fromBufferAttribute(this,t),Hr.applyNormalMatrix(e),this.setXYZ(t,Hr.x,Hr.y,Hr.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)Hr.fromBufferAttribute(this,t),Hr.transformDirection(e),this.setXYZ(t,Hr.x,Hr.y,Hr.z);return this}getComponent(e,t){let n=this.array[e*this.data.stride+this.offset+t];return this.normalized&&(n=Ft(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=It(n,this.array)),this.data.array[e*this.data.stride+this.offset+t]=n,this}setX(e,t){return this.normalized&&(t=It(t,this.array)),this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){return this.normalized&&(t=It(t,this.array)),this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){return this.normalized&&(t=It(t,this.array)),this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){return this.normalized&&(t=It(t,this.array)),this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){let t=this.data.array[e*this.data.stride+this.offset];return this.normalized&&(t=Ft(t,this.array)),t}getY(e){let t=this.data.array[e*this.data.stride+this.offset+1];return this.normalized&&(t=Ft(t,this.array)),t}getZ(e){let t=this.data.array[e*this.data.stride+this.offset+2];return this.normalized&&(t=Ft(t,this.array)),t}getW(e){let t=this.data.array[e*this.data.stride+this.offset+3];return this.normalized&&(t=Ft(t,this.array)),t}setXY(e,t,n){return e=e*this.data.stride+this.offset,this.normalized&&(t=It(t,this.array),n=It(n,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this}setXYZ(e,t,n,r){return e=e*this.data.stride+this.offset,this.normalized&&(t=It(t,this.array),n=It(n,this.array),r=It(r,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=r,this}setXYZW(e,t,n,r,i){return e=e*this.data.stride+this.offset,this.normalized&&(t=It(t,this.array),n=It(n,this.array),r=It(r,this.array),i=It(i,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=r,this.data.array[e+3]=i,this}clone(t){if(t===void 0){at(`InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.`);let e=[];for(let t=0;t<this.count;t++){let n=t*this.data.stride+this.offset;for(let t=0;t<this.itemSize;t++)e.push(this.data.array[n+t])}return new Tr(new this.array.constructor(e),this.itemSize,this.normalized)}return t.interleavedBuffers===void 0&&(t.interleavedBuffers={}),t.interleavedBuffers[this.data.uuid]===void 0&&(t.interleavedBuffers[this.data.uuid]=this.data.clone(t)),new e(t.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){at(`InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.`);let e=[];for(let t=0;t<this.count;t++){let n=t*this.data.stride+this.offset;for(let t=0;t<this.itemSize;t++)e.push(this.data.array[n+t])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:e,normalized:this.normalized}}return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}},Wr=0,Gr=class extends ut{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Wr++}),this.uuid=ht(),this.name=``,this.type=`Material`,this.blending=1,this.side=0,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=204,this.blendDst=205,this.blendEquation=100,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new G(0,0,0),this.blendAlpha=0,this.depthFunc=3,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=519,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Ye,this.stencilZFail=Ye,this.stencilZPass=Ye,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(let t in e){let n=e[t];if(n===void 0){B(`Material: parameter '${t}' has value of undefined.`);continue}let r=this[t];if(r===void 0){B(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(n):r&&r.isVector2&&n&&n.isVector2||r&&r.isEuler&&n&&n.isEuler||r&&r.isVector3&&n&&n.isVector3?r.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e==`string`;t&&(e={textures:{},images:{}});let n={metadata:{version:4.7,type:`Material`,generator:`Material.toJSON`}};n.uuid=this.uuid,n.type=this.type,this.name!==``&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==1&&(n.blending=this.blending),this.side!==0&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==204&&(n.blendSrc=this.blendSrc),this.blendDst!==205&&(n.blendDst=this.blendDst),this.blendEquation!==100&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==3&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==519&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==7680&&(n.stencilFail=this.stencilFail),this.stencilZFail!==7680&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==7680&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.allowOverride===!1&&(n.allowOverride=!1),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!==`round`&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!==`round`&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function r(e){let t=[];for(let n in e){let r=e[n];delete r.metadata,t.push(r)}return t}if(t){let t=r(e.textures),i=r(e.images);t.length>0&&(n.textures=t),i.length>0&&(n.images=i)}return n}fromJSON(e,t){if(e.uuid!==void 0&&(this.uuid=e.uuid),e.name!==void 0&&(this.name=e.name),e.color!==void 0&&this.color!==void 0&&this.color.setHex(e.color),e.roughness!==void 0&&(this.roughness=e.roughness),e.metalness!==void 0&&(this.metalness=e.metalness),e.sheen!==void 0&&(this.sheen=e.sheen),e.sheenColor!==void 0&&(this.sheenColor=new G().setHex(e.sheenColor)),e.sheenRoughness!==void 0&&(this.sheenRoughness=e.sheenRoughness),e.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(e.emissive),e.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(e.specular),e.specularIntensity!==void 0&&(this.specularIntensity=e.specularIntensity),e.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(e.specularColor),e.shininess!==void 0&&(this.shininess=e.shininess),e.clearcoat!==void 0&&(this.clearcoat=e.clearcoat),e.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=e.clearcoatRoughness),e.dispersion!==void 0&&(this.dispersion=e.dispersion),e.iridescence!==void 0&&(this.iridescence=e.iridescence),e.iridescenceIOR!==void 0&&(this.iridescenceIOR=e.iridescenceIOR),e.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=e.iridescenceThicknessRange),e.transmission!==void 0&&(this.transmission=e.transmission),e.thickness!==void 0&&(this.thickness=e.thickness),e.attenuationDistance!==void 0&&(this.attenuationDistance=e.attenuationDistance),e.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(e.attenuationColor),e.anisotropy!==void 0&&(this.anisotropy=e.anisotropy),e.anisotropyRotation!==void 0&&(this.anisotropyRotation=e.anisotropyRotation),e.fog!==void 0&&(this.fog=e.fog),e.flatShading!==void 0&&(this.flatShading=e.flatShading),e.blending!==void 0&&(this.blending=e.blending),e.combine!==void 0&&(this.combine=e.combine),e.side!==void 0&&(this.side=e.side),e.shadowSide!==void 0&&(this.shadowSide=e.shadowSide),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.alphaTest!==void 0&&(this.alphaTest=e.alphaTest),e.alphaHash!==void 0&&(this.alphaHash=e.alphaHash),e.depthFunc!==void 0&&(this.depthFunc=e.depthFunc),e.depthTest!==void 0&&(this.depthTest=e.depthTest),e.depthWrite!==void 0&&(this.depthWrite=e.depthWrite),e.colorWrite!==void 0&&(this.colorWrite=e.colorWrite),e.blendSrc!==void 0&&(this.blendSrc=e.blendSrc),e.blendDst!==void 0&&(this.blendDst=e.blendDst),e.blendEquation!==void 0&&(this.blendEquation=e.blendEquation),e.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=e.blendSrcAlpha),e.blendDstAlpha!==void 0&&(this.blendDstAlpha=e.blendDstAlpha),e.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=e.blendEquationAlpha),e.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(e.blendColor),e.blendAlpha!==void 0&&(this.blendAlpha=e.blendAlpha),e.stencilWriteMask!==void 0&&(this.stencilWriteMask=e.stencilWriteMask),e.stencilFunc!==void 0&&(this.stencilFunc=e.stencilFunc),e.stencilRef!==void 0&&(this.stencilRef=e.stencilRef),e.stencilFuncMask!==void 0&&(this.stencilFuncMask=e.stencilFuncMask),e.stencilFail!==void 0&&(this.stencilFail=e.stencilFail),e.stencilZFail!==void 0&&(this.stencilZFail=e.stencilZFail),e.stencilZPass!==void 0&&(this.stencilZPass=e.stencilZPass),e.stencilWrite!==void 0&&(this.stencilWrite=e.stencilWrite),e.wireframe!==void 0&&(this.wireframe=e.wireframe),e.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=e.wireframeLinewidth),e.wireframeLinecap!==void 0&&(this.wireframeLinecap=e.wireframeLinecap),e.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=e.wireframeLinejoin),e.rotation!==void 0&&(this.rotation=e.rotation),e.linewidth!==void 0&&(this.linewidth=e.linewidth),e.dashSize!==void 0&&(this.dashSize=e.dashSize),e.gapSize!==void 0&&(this.gapSize=e.gapSize),e.scale!==void 0&&(this.scale=e.scale),e.polygonOffset!==void 0&&(this.polygonOffset=e.polygonOffset),e.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=e.polygonOffsetFactor),e.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=e.polygonOffsetUnits),e.dithering!==void 0&&(this.dithering=e.dithering),e.alphaToCoverage!==void 0&&(this.alphaToCoverage=e.alphaToCoverage),e.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=e.premultipliedAlpha),e.forceSinglePass!==void 0&&(this.forceSinglePass=e.forceSinglePass),e.allowOverride!==void 0&&(this.allowOverride=e.allowOverride),e.visible!==void 0&&(this.visible=e.visible),e.toneMapped!==void 0&&(this.toneMapped=e.toneMapped),e.userData!==void 0&&(this.userData=e.userData),e.vertexColors!==void 0&&(this.vertexColors=typeof e.vertexColors==`number`?e.vertexColors>0:e.vertexColors),e.size!==void 0&&(this.size=e.size),e.sizeAttenuation!==void 0&&(this.sizeAttenuation=e.sizeAttenuation),e.map!==void 0&&(this.map=t[e.map]||null),e.matcap!==void 0&&(this.matcap=t[e.matcap]||null),e.alphaMap!==void 0&&(this.alphaMap=t[e.alphaMap]||null),e.bumpMap!==void 0&&(this.bumpMap=t[e.bumpMap]||null),e.bumpScale!==void 0&&(this.bumpScale=e.bumpScale),e.normalMap!==void 0&&(this.normalMap=t[e.normalMap]||null),e.normalMapType!==void 0&&(this.normalMapType=e.normalMapType),e.normalScale!==void 0){let t=e.normalScale;Array.isArray(t)===!1&&(t=[t,t]),this.normalScale=new H().fromArray(t)}return e.displacementMap!==void 0&&(this.displacementMap=t[e.displacementMap]||null),e.displacementScale!==void 0&&(this.displacementScale=e.displacementScale),e.displacementBias!==void 0&&(this.displacementBias=e.displacementBias),e.roughnessMap!==void 0&&(this.roughnessMap=t[e.roughnessMap]||null),e.metalnessMap!==void 0&&(this.metalnessMap=t[e.metalnessMap]||null),e.emissiveMap!==void 0&&(this.emissiveMap=t[e.emissiveMap]||null),e.emissiveIntensity!==void 0&&(this.emissiveIntensity=e.emissiveIntensity),e.specularMap!==void 0&&(this.specularMap=t[e.specularMap]||null),e.specularIntensityMap!==void 0&&(this.specularIntensityMap=t[e.specularIntensityMap]||null),e.specularColorMap!==void 0&&(this.specularColorMap=t[e.specularColorMap]||null),e.envMap!==void 0&&(this.envMap=t[e.envMap]||null),e.envMapRotation!==void 0&&this.envMapRotation.fromArray(e.envMapRotation),e.envMapIntensity!==void 0&&(this.envMapIntensity=e.envMapIntensity),e.reflectivity!==void 0&&(this.reflectivity=e.reflectivity),e.refractionRatio!==void 0&&(this.refractionRatio=e.refractionRatio),e.lightMap!==void 0&&(this.lightMap=t[e.lightMap]||null),e.lightMapIntensity!==void 0&&(this.lightMapIntensity=e.lightMapIntensity),e.aoMap!==void 0&&(this.aoMap=t[e.aoMap]||null),e.aoMapIntensity!==void 0&&(this.aoMapIntensity=e.aoMapIntensity),e.gradientMap!==void 0&&(this.gradientMap=t[e.gradientMap]||null),e.clearcoatMap!==void 0&&(this.clearcoatMap=t[e.clearcoatMap]||null),e.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=t[e.clearcoatRoughnessMap]||null),e.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=t[e.clearcoatNormalMap]||null),e.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new H().fromArray(e.clearcoatNormalScale)),e.iridescenceMap!==void 0&&(this.iridescenceMap=t[e.iridescenceMap]||null),e.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=t[e.iridescenceThicknessMap]||null),e.transmissionMap!==void 0&&(this.transmissionMap=t[e.transmissionMap]||null),e.thicknessMap!==void 0&&(this.thicknessMap=t[e.thicknessMap]||null),e.anisotropyMap!==void 0&&(this.anisotropyMap=t[e.anisotropyMap]||null),e.sheenColorMap!==void 0&&(this.sheenColorMap=t[e.sheenColorMap]||null),e.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=t[e.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;let t=e.clippingPlanes,n=null;if(t!==null){let e=t.length;n=Array(e);for(let r=0;r!==e;++r)n[r]=t[r].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:`dispose`})}set needsUpdate(e){e===!0&&this.version++}},Kr=class extends Gr{constructor(e){super(),this.isSpriteMaterial=!0,this.type=`SpriteMaterial`,this.color=new G(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.rotation=e.rotation,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}},qr,Jr=new U,Yr=new U,Xr=new U,Zr=new H,Qr=new H,$r=new ln,ei=new U,ti=new U,ni=new U,ri=new H,ii=new H,ai=new H,oi=class extends In{constructor(e=new Kr){if(super(),this.isSprite=!0,this.type=`Sprite`,qr===void 0){qr=new Br;let e=new Vr(new Float32Array([-.5,-.5,0,0,0,.5,-.5,0,1,0,.5,.5,0,1,1,-.5,.5,0,0,1]),5);qr.setIndex([0,1,2,0,2,3]),qr.setAttribute(`position`,new Ur(e,3,0,!1)),qr.setAttribute(`uv`,new Ur(e,2,3,!1))}this.geometry=qr,this.material=e,this.center=new H(.5,.5),this.count=1}raycast(e,t){e.camera===null&&V(`Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.`),Yr.setFromMatrixScale(this.matrixWorld),$r.copy(e.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(e.camera.matrixWorldInverse,this.matrixWorld),Xr.setFromMatrixPosition(this.modelViewMatrix),e.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1&&Yr.multiplyScalar(-Xr.z);let n=this.material.rotation,r,i;n!==0&&(i=Math.cos(n),r=Math.sin(n));let a=this.center;si(ei.set(-.5,-.5,0),Xr,a,Yr,r,i),si(ti.set(.5,-.5,0),Xr,a,Yr,r,i),si(ni.set(.5,.5,0),Xr,a,Yr,r,i),ri.set(0,0),ii.set(1,0),ai.set(1,1);let o=e.ray.intersectTriangle(ei,ti,ni,!1,Jr);if(o===null&&(si(ti.set(-.5,.5,0),Xr,a,Yr,r,i),ii.set(0,1),o=e.ray.intersectTriangle(ei,ni,ti,!1,Jr),o===null))return;let s=e.ray.origin.distanceTo(Jr);s<e.near||s>e.far||t.push({distance:s,point:Jr.clone(),uv:or.getInterpolation(Jr,ei,ti,ni,ri,ii,ai,new H),face:null,object:this})}copy(e,t){return super.copy(e,t),e.center!==void 0&&this.center.copy(e.center),this.material=e.material,this}};function si(e,t,n,r,i,a){Zr.subVectors(e,n).addScalar(.5).multiply(r),i===void 0?Qr.copy(Zr):(Qr.x=a*Zr.x-i*Zr.y,Qr.y=i*Zr.x+a*Zr.y),e.copy(t),e.x+=Qr.x,e.y+=Qr.y,e.applyMatrix4($r)}var ci=new U,li=new U,ui=new U,di=new U,fi=new U,pi=new U,mi=new U,hi=class{constructor(e=new U,t=new U(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,ci)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);let n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){let t=ci.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(ci.copy(this.origin).addScaledVector(this.direction,t),ci.distanceToSquared(e))}distanceSqToSegment(e,t,n,r){li.copy(e).add(t).multiplyScalar(.5),ui.copy(t).sub(e).normalize(),di.copy(this.origin).sub(li);let i=e.distanceTo(t)*.5,a=-this.direction.dot(ui),o=di.dot(this.direction),s=-di.dot(ui),c=di.lengthSq(),l=Math.abs(1-a*a),u,d,f,p;if(l>0)if(u=a*s-o,d=a*o-s,p=i*l,u>=0)if(d>=-p)if(d<=p){let e=1/l;u*=e,d*=e,f=u*(u+a*d+2*o)+d*(a*u+d+2*s)+c}else d=i,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*s)+c;else d=-i,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*s)+c;else d<=-p?(u=Math.max(0,-(-a*i+o)),d=u>0?-i:Math.min(Math.max(-i,-s),i),f=-u*u+d*(d+2*s)+c):d<=p?(u=0,d=Math.min(Math.max(-i,-s),i),f=d*(d+2*s)+c):(u=Math.max(0,-(a*i+o)),d=u>0?i:Math.min(Math.max(-i,-s),i),f=-u*u+d*(d+2*s)+c);else d=a>0?-i:i,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*s)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,u),r&&r.copy(li).addScaledVector(ui,d),f}intersectSphere(e,t){ci.subVectors(e.center,this.origin);let n=ci.dot(this.direction),r=ci.dot(ci)-n*n,i=e.radius*e.radius;if(r>i)return null;let a=Math.sqrt(i-r),o=n-a,s=n+a;return s<0?null:o<0?this.at(s,t):this.at(o,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){let t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){let n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){let t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,r,i,a,o,s,c=1/this.direction.x,l=1/this.direction.y,u=1/this.direction.z,d=this.origin;return c>=0?(n=(e.min.x-d.x)*c,r=(e.max.x-d.x)*c):(n=(e.max.x-d.x)*c,r=(e.min.x-d.x)*c),l>=0?(i=(e.min.y-d.y)*l,a=(e.max.y-d.y)*l):(i=(e.max.y-d.y)*l,a=(e.min.y-d.y)*l),n>a||i>r||((i>n||isNaN(n))&&(n=i),(a<r||isNaN(r))&&(r=a),u>=0?(o=(e.min.z-d.z)*u,s=(e.max.z-d.z)*u):(o=(e.max.z-d.z)*u,s=(e.min.z-d.z)*u),n>s||o>r)||((o>n||n!==n)&&(n=o),(s<r||r!==r)&&(r=s),r<0)?null:this.at(n>=0?n:r,t)}intersectsBox(e){return this.intersectBox(e,ci)!==null}intersectTriangle(e,t,n,r,i){fi.subVectors(t,e),pi.subVectors(n,e),mi.crossVectors(fi,pi);let a=this.direction.dot(mi),o;if(a>0){if(r)return null;o=1}else if(a<0)o=-1,a=-a;else return null;di.subVectors(this.origin,e);let s=o*this.direction.dot(pi.crossVectors(di,pi));if(s<0)return null;let c=o*this.direction.dot(fi.cross(di));if(c<0||s+c>a)return null;let l=-o*di.dot(mi);return l<0?null:this.at(l/a,i)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},gi=class extends Gr{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type=`MeshBasicMaterial`,this.color=new G(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new yn,this.combine=0,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap=`round`,this.wireframeLinejoin=`round`,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}},_i=new ln,vi=new hi,yi=new Mr,bi=new U,xi=new U,Si=new U,Ci=new U,wi=new U,Ti=new U,Ei=new U,Di=new U,K=class extends In{constructor(e=new Br,t=new gi){super(),this.isMesh=!0,this.type=`Mesh`,this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){let e=this.geometry.morphAttributes,t=Object.keys(e);if(t.length>0){let n=e[t[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let e=0,t=n.length;e<t;e++){let t=n[e].name||String(e);this.morphTargetInfluences.push(0),this.morphTargetDictionary[t]=e}}}}getVertexPosition(e,t){let n=this.geometry,r=n.attributes.position,i=n.morphAttributes.position,a=n.morphTargetsRelative;t.fromBufferAttribute(r,e);let o=this.morphTargetInfluences;if(i&&o){Ti.set(0,0,0);for(let n=0,r=i.length;n<r;n++){let r=o[n],s=i[n];r!==0&&(wi.fromBufferAttribute(s,e),a?Ti.addScaledVector(wi,r):Ti.addScaledVector(wi.sub(t),r))}t.add(Ti)}return t}raycast(e,t){let n=this.geometry,r=this.material,i=this.matrixWorld;r!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),yi.copy(n.boundingSphere),yi.applyMatrix4(i),vi.copy(e.ray).recast(e.near),!(yi.containsPoint(vi.origin)===!1&&(vi.intersectSphere(yi,bi)===null||vi.origin.distanceToSquared(bi)>(e.far-e.near)**2))&&(_i.copy(i).invert(),vi.copy(e.ray).applyMatrix4(_i),(n.boundingBox===null||vi.intersectsBox(n.boundingBox)!==!1)&&this._computeIntersections(e,t,vi)))}_computeIntersections(e,t,n){let r,i=this.geometry,a=this.material,o=i.index,s=i.attributes.position,c=i.attributes.uv,l=i.attributes.uv1,u=i.attributes.normal,d=i.groups,f=i.drawRange;if(o!==null)if(Array.isArray(a))for(let i=0,s=d.length;i<s;i++){let s=d[i],p=a[s.materialIndex],m=Math.max(s.start,f.start),h=Math.min(o.count,Math.min(s.start+s.count,f.start+f.count));for(let i=m,a=h;i<a;i+=3){let a=o.getX(i),d=o.getX(i+1),f=o.getX(i+2);r=ki(this,p,e,n,c,l,u,a,d,f),r&&(r.faceIndex=Math.floor(i/3),r.face.materialIndex=s.materialIndex,t.push(r))}}else{let i=Math.max(0,f.start),s=Math.min(o.count,f.start+f.count);for(let d=i,f=s;d<f;d+=3){let i=o.getX(d),s=o.getX(d+1),f=o.getX(d+2);r=ki(this,a,e,n,c,l,u,i,s,f),r&&(r.faceIndex=Math.floor(d/3),t.push(r))}}else if(s!==void 0)if(Array.isArray(a))for(let i=0,o=d.length;i<o;i++){let o=d[i],p=a[o.materialIndex],m=Math.max(o.start,f.start),h=Math.min(s.count,Math.min(o.start+o.count,f.start+f.count));for(let i=m,a=h;i<a;i+=3){let a=i,s=i+1,d=i+2;r=ki(this,p,e,n,c,l,u,a,s,d),r&&(r.faceIndex=Math.floor(i/3),r.face.materialIndex=o.materialIndex,t.push(r))}}else{let i=Math.max(0,f.start),o=Math.min(s.count,f.start+f.count);for(let s=i,d=o;s<d;s+=3){let i=s,o=s+1,d=s+2;r=ki(this,a,e,n,c,l,u,i,o,d),r&&(r.faceIndex=Math.floor(s/3),t.push(r))}}}};function Oi(e,t,n,r,i,a,o,s){let c;if(c=t.side===1?r.intersectTriangle(o,a,i,!0,s):r.intersectTriangle(i,a,o,t.side===0,s),c===null)return null;Di.copy(s),Di.applyMatrix4(e.matrixWorld);let l=n.ray.origin.distanceTo(Di);return l<n.near||l>n.far?null:{distance:l,point:Di.clone(),object:e}}function ki(e,t,n,r,i,a,o,s,c,l){e.getVertexPosition(s,xi),e.getVertexPosition(c,Si),e.getVertexPosition(l,Ci);let u=Oi(e,t,n,r,xi,Si,Ci,Ei);if(u){let e=new U;or.getBarycoord(Ei,xi,Si,Ci,e),i&&(u.uv=or.getInterpolatedAttribute(i,s,c,l,e,new H)),a&&(u.uv1=or.getInterpolatedAttribute(a,s,c,l,e,new H)),o&&(u.normal=or.getInterpolatedAttribute(o,s,c,l,e,new U),u.normal.dot(r.direction)>0&&u.normal.multiplyScalar(-1));let t={a:s,b:c,c:l,normal:new U,materialIndex:0};or.getNormal(xi,Si,Ci,t.normal),u.face=t,u.barycoord=e}return u}var Ai=new nn,ji=new nn,Mi=new nn,Ni=new nn,Pi=new ln,Fi=new U,Ii=new Mr,Li=new ln,Ri=new hi,zi=class extends K{constructor(e,t){super(e,t),this.isSkinnedMesh=!0,this.type=`SkinnedMesh`,this.bindMode=n,this.bindMatrix=new ln,this.bindMatrixInverse=new ln,this.boundingBox=null,this.boundingSphere=null}computeBoundingBox(){let e=this.geometry;this.boundingBox===null&&(this.boundingBox=new sr),this.boundingBox.makeEmpty();let t=e.getAttribute(`position`);for(let e=0;e<t.count;e++)this.getVertexPosition(e,Fi),this.boundingBox.expandByPoint(Fi)}computeBoundingSphere(){let e=this.geometry;this.boundingSphere===null&&(this.boundingSphere=new Mr),this.boundingSphere.makeEmpty();let t=e.getAttribute(`position`);for(let e=0;e<t.count;e++)this.getVertexPosition(e,Fi),this.boundingSphere.expandByPoint(Fi)}copy(e,t){return super.copy(e,t),this.bindMode=e.bindMode,this.bindMatrix.copy(e.bindMatrix),this.bindMatrixInverse.copy(e.bindMatrixInverse),this.skeleton=e.skeleton,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}raycast(e,t){let n=this.material,r=this.matrixWorld;n!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Ii.copy(this.boundingSphere),Ii.applyMatrix4(r),e.ray.intersectsSphere(Ii)!==!1&&(Li.copy(r).invert(),Ri.copy(e.ray).applyMatrix4(Li),(this.boundingBox===null||Ri.intersectsBox(this.boundingBox)!==!1)&&this._computeIntersections(e,t,Ri)))}getVertexPosition(e,t){return super.getVertexPosition(e,t),this.applyBoneTransform(e,t),t}bind(e,t){this.skeleton=e,t===void 0&&(this.updateMatrixWorld(!0),this.skeleton.calculateInverses(),t=this.matrixWorld),this.bindMatrix.copy(t),this.bindMatrixInverse.copy(t).invert()}pose(){this.skeleton.pose()}normalizeSkinWeights(){let e=new nn,t=this.geometry.attributes.skinWeight;for(let n=0,r=t.count;n<r;n++){e.fromBufferAttribute(t,n);let r=1/e.manhattanLength();r===1/0?e.set(1,0,0,0):e.multiplyScalar(r),t.setXYZW(n,e.x,e.y,e.z,e.w)}}updateMatrixWorld(e){super.updateMatrixWorld(e),this.bindMode===`attached`?this.bindMatrixInverse.copy(this.matrixWorld).invert():this.bindMode===`detached`?this.bindMatrixInverse.copy(this.bindMatrix).invert():B(`SkinnedMesh: Unrecognized bindMode: `+this.bindMode)}applyBoneTransform(e,t){let n=this.skeleton,r=this.geometry;ji.fromBufferAttribute(r.attributes.skinIndex,e),Mi.fromBufferAttribute(r.attributes.skinWeight,e),t.isVector4?(Ai.copy(t),t.set(0,0,0,0)):(Ai.set(...t,1),t.set(0,0,0)),Ai.applyMatrix4(this.bindMatrix);for(let e=0;e<4;e++){let r=Mi.getComponent(e);if(r!==0){let i=ji.getComponent(e);Pi.multiplyMatrices(n.bones[i].matrixWorld,n.boneInverses[i]),t.addScaledVector(Ni.copy(Ai).applyMatrix4(Pi),r)}}return t.isVector4&&(t.w=Ai.w),t.applyMatrix4(this.bindMatrixInverse)}},Bi=class extends In{constructor(){super(),this.isBone=!0,this.type=`Bone`}},Vi=class extends tn{constructor(e=null,t=1,n=1,r,i,a,s,c,l=o,u=o,d,f){super(null,a,s,c,l,u,r,i,d,f),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}},Hi=new ln,Ui=new ln,Wi=class e{constructor(e=[],t=[]){this.uuid=ht(),this.bones=e.slice(0),this.boneInverses=t,this.boneMatrices=null,this.boneTexture=null,this.init()}init(){let e=this.bones,t=this.boneInverses;if(this.boneMatrices=new Float32Array(e.length*16),t.length===0)this.calculateInverses();else if(e.length!==t.length){B(`Skeleton: Number of inverse bone matrices does not match amount of bones.`),this.boneInverses=[];for(let e=0,t=this.bones.length;e<t;e++)this.boneInverses.push(new ln)}}calculateInverses(){this.boneInverses.length=0;for(let e=0,t=this.bones.length;e<t;e++){let t=new ln;this.bones[e]&&t.copy(this.bones[e].matrixWorld).invert(),this.boneInverses.push(t)}}pose(){for(let e=0,t=this.bones.length;e<t;e++){let t=this.bones[e];t&&t.matrixWorld.copy(this.boneInverses[e]).invert()}for(let e=0,t=this.bones.length;e<t;e++){let t=this.bones[e];t&&(t.parent&&t.parent.isBone?(t.matrix.copy(t.parent.matrixWorld).invert(),t.matrix.multiply(t.matrixWorld)):t.matrix.copy(t.matrixWorld),t.matrix.decompose(t.position,t.quaternion,t.scale))}}update(){let e=this.bones,t=this.boneInverses,n=this.boneMatrices,r=this.boneTexture;for(let r=0,i=e.length;r<i;r++){let i=e[r]?e[r].matrixWorld:Ui;Hi.multiplyMatrices(i,t[r]),Hi.toArray(n,r*16)}r!==null&&(r.needsUpdate=!0)}clone(){return new e(this.bones,this.boneInverses)}computeBoneTexture(){let e=Math.sqrt(this.bones.length*4);e=Math.ceil(e/4)*4,e=Math.max(e,4);let t=new Float32Array(e*e*4);t.set(this.boneMatrices);let n=new Vi(t,e,e,O,y);return n.needsUpdate=!0,this.boneMatrices=t,this.boneTexture=n,this}getBoneByName(e){for(let t=0,n=this.bones.length;t<n;t++){let n=this.bones[t];if(n.name===e)return n}}dispose(){this.boneTexture!==null&&(this.boneTexture.dispose(),this.boneTexture=null)}fromJSON(e,t){this.uuid=e.uuid;for(let n=0,r=e.bones.length;n<r;n++){let r=e.bones[n],i=t[r];i===void 0&&(B(`Skeleton: No bone found with UUID:`,r),i=new Bi),this.bones.push(i),this.boneInverses.push(new ln().fromArray(e.boneInverses[n]))}return this.init(),this}toJSON(){let e={metadata:{version:4.7,type:`Skeleton`,generator:`Skeleton.toJSON`},bones:[],boneInverses:[]};e.uuid=this.uuid;let t=this.bones,n=this.boneInverses;for(let r=0,i=t.length;r<i;r++){let i=t[r];e.bones.push(i.uuid);let a=n[r];e.boneInverses.push(a.toArray())}return e}},Gi=class extends Tr{constructor(e,t,n,r=1){super(e,t,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=r}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){let e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}},Ki=new ln,qi=new ln,Ji=[],Yi=new sr,Xi=new ln,Zi=new K,Qi=new Mr,$i=class extends K{constructor(e,t,n){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new Gi(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let e=0;e<n;e++)this.setMatrixAt(e,Xi)}computeBoundingBox(){let e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new sr),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,Ki),Yi.copy(e.boundingBox).applyMatrix4(Ki),this.boundingBox.union(Yi)}computeBoundingSphere(){let e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new Mr),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,Ki),Qi.copy(e.boundingSphere).applyMatrix4(Ki),this.boundingSphere.union(Qi)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),e.morphTexture!==null&&(this.morphTexture=e.morphTexture.clone()),e.instanceColor!==null&&(this.instanceColor=e.instanceColor.clone()),this.count=e.count,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}getColorAt(e,t){return this.instanceColor===null?t.setRGB(1,1,1):t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){return t.fromArray(this.instanceMatrix.array,e*16)}getMorphAt(e,t){let n=t.morphTargetInfluences,r=this.morphTexture.source.data.data,i=e*(n.length+1)+1;for(let e=0;e<n.length;e++)n[e]=r[i+e]}raycast(e,t){let n=this.matrixWorld,r=this.count;if(Zi.geometry=this.geometry,Zi.material=this.material,Zi.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Qi.copy(this.boundingSphere),Qi.applyMatrix4(n),e.ray.intersectsSphere(Qi)!==!1))for(let i=0;i<r;i++){this.getMatrixAt(i,Ki),qi.multiplyMatrices(n,Ki),Zi.matrixWorld=qi,Zi.raycast(e,Ji);for(let e=0,n=Ji.length;e<n;e++){let n=Ji[e];n.instanceId=i,n.object=this,t.push(n)}Ji.length=0}}setColorAt(e,t){return this.instanceColor===null&&(this.instanceColor=new Gi(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),t.toArray(this.instanceColor.array,e*3),this}setMatrixAt(e,t){return t.toArray(this.instanceMatrix.array,e*16),this}setMorphAt(e,t){let n=t.morphTargetInfluences,r=n.length+1;this.morphTexture===null&&(this.morphTexture=new Vi(new Float32Array(r*this.count),r,this.count,j,y));let i=this.morphTexture.source.data.data,a=0;for(let e=0;e<n.length;e++)a+=n[e];let o=this.geometry.morphTargetsRelative?1:1-a,s=r*e;return i[s]=o,i.set(n,s+1),this}updateMorphTargets(){}dispose(){this.dispatchEvent({type:`dispose`}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}},ea=new U,ta=new U,na=new W,ra=class{constructor(e=new U(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,r){return this.normal.set(e,t,n),this.constant=r,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){let r=ea.subVectors(n,t).cross(ta.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(r,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){let e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,n=!0){let r=e.delta(ea),i=this.normal.dot(r);if(i===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;let a=-(e.start.dot(this.normal)+this.constant)/i;return n===!0&&(a<0||a>1)?null:t.copy(e.start).addScaledVector(r,a)}intersectsLine(e){let t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){let n=t||na.getNormalMatrix(e),r=this.coplanarPoint(ea).applyMatrix4(e),i=this.normal.applyMatrix3(n).normalize();return this.constant=-r.dot(i),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}},ia=new Mr,aa=new H(.5,.5),oa=new U,sa=class{constructor(e=new ra,t=new ra,n=new ra,r=new ra,i=new ra,a=new ra){this.planes=[e,t,n,r,i,a]}set(e,t,n,r,i,a){let o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(n),o[3].copy(r),o[4].copy(i),o[5].copy(a),this}copy(e){let t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=$e,n=!1){let r=this.planes,i=e.elements,a=i[0],o=i[1],s=i[2],c=i[3],l=i[4],u=i[5],d=i[6],f=i[7],p=i[8],m=i[9],h=i[10],g=i[11],_=i[12],v=i[13],y=i[14],b=i[15];if(r[0].setComponents(c-a,f-l,g-p,b-_).normalize(),r[1].setComponents(c+a,f+l,g+p,b+_).normalize(),r[2].setComponents(c+o,f+u,g+m,b+v).normalize(),r[3].setComponents(c-o,f-u,g-m,b-v).normalize(),n)r[4].setComponents(s,d,h,y).normalize(),r[5].setComponents(c-s,f-d,g-h,b-y).normalize();else if(r[4].setComponents(c-s,f-d,g-h,b-y).normalize(),t===2e3)r[5].setComponents(c+s,f+d,g+h,b+y).normalize();else if(t===2001)r[5].setComponents(s,d,h,y).normalize();else throw Error(`THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: `+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),ia.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{let t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),ia.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(ia)}intersectsSprite(e){return ia.center.set(0,0,0),ia.radius=.7071067811865476+aa.distanceTo(e.center),ia.applyMatrix4(e.matrixWorld),this.intersectsSphere(ia)}intersectsSphere(e){let t=this.planes,n=e.center,r=-e.radius;for(let e=0;e<6;e++)if(t[e].distanceToPoint(n)<r)return!1;return!0}intersectsBox(e){let t=this.planes;for(let n=0;n<6;n++){let r=t[n];if(oa.x=r.normal.x>0?e.max.x:e.min.x,oa.y=r.normal.y>0?e.max.y:e.min.y,oa.z=r.normal.z>0?e.max.z:e.min.z,r.distanceToPoint(oa)<0)return!1}return!0}containsPoint(e){let t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}},ca=class extends Gr{constructor(e){super(),this.isLineBasicMaterial=!0,this.type=`LineBasicMaterial`,this.color=new G(16777215),this.map=null,this.linewidth=1,this.linecap=`round`,this.linejoin=`round`,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}},la=new U,ua=new U,da=new ln,fa=new hi,pa=new Mr,ma=new U,ha=new U,ga=class extends In{constructor(e=new Br,t=new ca){super(),this.isLine=!0,this.type=`Line`,this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,n=[0];for(let e=1,r=t.count;e<r;e++)la.fromBufferAttribute(t,e-1),ua.fromBufferAttribute(t,e),n[e]=n[e-1],n[e]+=la.distanceTo(ua);e.setAttribute(`lineDistance`,new Or(n,1))}else B(`Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.`);return this}raycast(e,t){let n=this.geometry,r=this.matrixWorld,i=e.params.Line.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),pa.copy(n.boundingSphere),pa.applyMatrix4(r),pa.radius+=i,e.ray.intersectsSphere(pa)===!1)return;da.copy(r).invert(),fa.copy(e.ray).applyMatrix4(da);let o=i/((this.scale.x+this.scale.y+this.scale.z)/3),s=o*o,c=this.isLineSegments?2:1,l=n.index,u=n.attributes.position;if(l!==null){let n=Math.max(0,a.start),r=Math.min(l.count,a.start+a.count);for(let i=n,a=r-1;i<a;i+=c){let n=l.getX(i),r=l.getX(i+1),a=_a(this,e,fa,s,n,r,i);a&&t.push(a)}if(this.isLineLoop){let i=l.getX(r-1),a=l.getX(n),o=_a(this,e,fa,s,i,a,r-1);o&&t.push(o)}}else{let n=Math.max(0,a.start),r=Math.min(u.count,a.start+a.count);for(let i=n,a=r-1;i<a;i+=c){let n=_a(this,e,fa,s,i,i+1,i);n&&t.push(n)}if(this.isLineLoop){let i=_a(this,e,fa,s,r-1,n,r-1);i&&t.push(i)}}}updateMorphTargets(){let e=this.geometry.morphAttributes,t=Object.keys(e);if(t.length>0){let n=e[t[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let e=0,t=n.length;e<t;e++){let t=n[e].name||String(e);this.morphTargetInfluences.push(0),this.morphTargetDictionary[t]=e}}}}};function _a(e,t,n,r,i,a,o){let s=e.geometry.attributes.position;if(la.fromBufferAttribute(s,i),ua.fromBufferAttribute(s,a),n.distanceSqToSegment(la,ua,ma,ha)>r)return;ma.applyMatrix4(e.matrixWorld);let c=t.ray.origin.distanceTo(ma);if(!(c<t.near||c>t.far))return{distance:c,point:ha.clone().applyMatrix4(e.matrixWorld),index:o,face:null,faceIndex:null,barycoord:null,object:e}}var va=new U,ya=new U,ba=class extends ga{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type=`LineSegments`}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,n=[];for(let e=0,r=t.count;e<r;e+=2)va.fromBufferAttribute(t,e),ya.fromBufferAttribute(t,e+1),n[e]=e===0?0:n[e-1],n[e+1]=n[e]+va.distanceTo(ya);e.setAttribute(`lineDistance`,new Or(n,1))}else B(`LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.`);return this}},xa=class extends ga{constructor(e,t){super(e,t),this.isLineLoop=!0,this.type=`LineLoop`}},Sa=class extends Gr{constructor(e){super(),this.isPointsMaterial=!0,this.type=`PointsMaterial`,this.color=new G(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}},Ca=new ln,wa=new hi,Ta=new Mr,Ea=new U,Da=class extends In{constructor(e=new Br,t=new Sa){super(),this.isPoints=!0,this.type=`Points`,this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){let n=this.geometry,r=this.matrixWorld,i=e.params.Points.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Ta.copy(n.boundingSphere),Ta.applyMatrix4(r),Ta.radius+=i,e.ray.intersectsSphere(Ta)===!1)return;Ca.copy(r).invert(),wa.copy(e.ray).applyMatrix4(Ca);let o=i/((this.scale.x+this.scale.y+this.scale.z)/3),s=o*o,c=n.index,l=n.attributes.position;if(c!==null){let n=Math.max(0,a.start),i=Math.min(c.count,a.start+a.count);for(let a=n,o=i;a<o;a++){let n=c.getX(a);Ea.fromBufferAttribute(l,n),Oa(Ea,n,s,r,e,t,this)}}else{let n=Math.max(0,a.start),i=Math.min(l.count,a.start+a.count);for(let a=n,o=i;a<o;a++)Ea.fromBufferAttribute(l,a),Oa(Ea,a,s,r,e,t,this)}}updateMorphTargets(){let e=this.geometry.morphAttributes,t=Object.keys(e);if(t.length>0){let n=e[t[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let e=0,t=n.length;e<t;e++){let t=n[e].name||String(e);this.morphTargetInfluences.push(0),this.morphTargetDictionary[t]=e}}}}};function Oa(e,t,n,r,i,a,o){let s=wa.distanceSqToPoint(e);if(s<n){let n=new U;wa.closestPointToPoint(e,n),n.applyMatrix4(r);let c=i.ray.origin.distanceTo(n);if(c<i.near||c>i.far)return;a.push({distance:c,distanceToRay:Math.sqrt(s),point:n,index:t,face:null,faceIndex:null,barycoord:null,object:o})}}var ka=class extends tn{constructor(e=[],t=301,n,r,i,a,o,s,c,l){super(e,t,n,r,i,a,o,s,c,l),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}},Aa=class extends tn{constructor(e,t,n,r,i,a,o,s,c){super(e,t,n,r,i,a,o,s,c),this.isCanvasTexture=!0,this.needsUpdate=!0}},ja=class extends tn{constructor(e,t,n=v,r,i,a,s=o,c=o,l,u=k,d=1){if(u!==1026&&u!==1027)throw Error(`THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat`);super({width:e,height:t,depth:d},r,i,a,s,c,u,n,l),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Zt(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){let t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}},Ma=class extends ja{constructor(e,t=v,n=301,r,i,a=o,s=o,c,l=k){let u={width:e,height:e,depth:1},d=[u,u,u,u,u,u];super(e,e,t,n,r,i,a,s,c,l),this.image=d,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}},Na=class extends tn{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}},Pa=class e extends Br{constructor(e=1,t=1,n=1,r=1,i=1,a=1){super(),this.type=`BoxGeometry`,this.parameters={width:e,height:t,depth:n,widthSegments:r,heightSegments:i,depthSegments:a};let o=this;r=Math.floor(r),i=Math.floor(i),a=Math.floor(a);let s=[],c=[],l=[],u=[],d=0,f=0;p(`z`,`y`,`x`,-1,-1,n,t,e,a,i,0),p(`z`,`y`,`x`,1,-1,n,t,-e,a,i,1),p(`x`,`z`,`y`,1,1,e,n,t,r,a,2),p(`x`,`z`,`y`,1,-1,e,n,-t,r,a,3),p(`x`,`y`,`z`,1,-1,e,t,n,r,i,4),p(`x`,`y`,`z`,-1,-1,e,t,-n,r,i,5),this.setIndex(s),this.setAttribute(`position`,new Or(c,3)),this.setAttribute(`normal`,new Or(l,3)),this.setAttribute(`uv`,new Or(u,2));function p(e,t,n,r,i,a,p,m,h,g,_){let v=a/h,y=p/g,b=a/2,x=p/2,S=m/2,C=h+1,w=g+1,T=0,E=0,D=new U;for(let a=0;a<w;a++){let o=a*y-x;for(let s=0;s<C;s++)D[e]=(s*v-b)*r,D[t]=o*i,D[n]=S,c.push(D.x,D.y,D.z),D[e]=0,D[t]=0,D[n]=m>0?1:-1,l.push(D.x,D.y,D.z),u.push(s/h),u.push(1-a/g),T+=1}for(let e=0;e<g;e++)for(let t=0;t<h;t++){let n=d+t+C*e,r=d+t+C*(e+1),i=d+(t+1)+C*(e+1),a=d+(t+1)+C*e;s.push(n,r,a),s.push(r,i,a),E+=6}o.addGroup(f,E,_),f+=E,d+=T}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}},Fa=class e extends Br{constructor(e=1,t=32,n=0,r=Math.PI*2){super(),this.type=`CircleGeometry`,this.parameters={radius:e,segments:t,thetaStart:n,thetaLength:r},t=Math.max(3,t);let i=[],a=[],o=[],s=[],c=new U,l=new H;a.push(0,0,0),o.push(0,0,1),s.push(.5,.5);for(let i=0,u=3;i<=t;i++,u+=3){let d=n+i/t*r;c.x=e*Math.cos(d),c.y=e*Math.sin(d),a.push(c.x,c.y,c.z),o.push(0,0,1),l.x=(a[u]/e+1)/2,l.y=(a[u+1]/e+1)/2,s.push(l.x,l.y)}for(let e=1;e<=t;e++)i.push(e,e+1,0);this.setIndex(i),this.setAttribute(`position`,new Or(a,3)),this.setAttribute(`normal`,new Or(o,3)),this.setAttribute(`uv`,new Or(s,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.radius,t.segments,t.thetaStart,t.thetaLength)}},Ia=class e extends Br{constructor(e=1,t=1,n=1,r=32,i=1,a=!1,o=0,s=Math.PI*2){super(),this.type=`CylinderGeometry`,this.parameters={radiusTop:e,radiusBottom:t,height:n,radialSegments:r,heightSegments:i,openEnded:a,thetaStart:o,thetaLength:s};let c=this;r=Math.floor(r),i=Math.floor(i);let l=[],u=[],d=[],f=[],p=0,m=[],h=n/2,g=0;_(),a===!1&&(e>0&&v(!0),t>0&&v(!1)),this.setIndex(l),this.setAttribute(`position`,new Or(u,3)),this.setAttribute(`normal`,new Or(d,3)),this.setAttribute(`uv`,new Or(f,2));function _(){let a=new U,_=new U,v=0,y=(t-e)/n;for(let c=0;c<=i;c++){let l=[],g=c/i,v=g*(t-e)+e;for(let e=0;e<=r;e++){let t=e/r,i=t*s+o,c=Math.sin(i),m=Math.cos(i);_.x=v*c,_.y=-g*n+h,_.z=v*m,u.push(_.x,_.y,_.z),a.set(c,y,m).normalize(),d.push(a.x,a.y,a.z),f.push(t,1-g),l.push(p++)}m.push(l)}for(let n=0;n<r;n++)for(let r=0;r<i;r++){let a=m[r][n],o=m[r+1][n],s=m[r+1][n+1],c=m[r][n+1];(e>0||r!==0)&&(l.push(a,o,c),v+=3),(t>0||r!==i-1)&&(l.push(o,s,c),v+=3)}c.addGroup(g,v,0),g+=v}function v(n){let i=p,a=new H,m=new U,_=0,v=n===!0?e:t,y=n===!0?1:-1;for(let e=1;e<=r;e++)u.push(0,h*y,0),d.push(0,y,0),f.push(.5,.5),p++;let b=p;for(let e=0;e<=r;e++){let t=e/r*s+o,n=Math.cos(t),i=Math.sin(t);m.x=v*i,m.y=h*y,m.z=v*n,u.push(m.x,m.y,m.z),d.push(0,y,0),a.x=n*.5+.5,a.y=i*.5*y+.5,f.push(a.x,a.y),p++}for(let e=0;e<r;e++){let t=i+e,r=b+e;n===!0?l.push(r,r+1,t):l.push(r+1,r,t),_+=3}c.addGroup(g,_,n===!0?1:2),g+=_}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}},La=class e extends Ia{constructor(e=1,t=1,n=32,r=1,i=!1,a=0,o=Math.PI*2){super(0,e,t,n,r,i,a,o),this.type=`ConeGeometry`,this.parameters={radius:e,height:t,radialSegments:n,heightSegments:r,openEnded:i,thetaStart:a,thetaLength:o}}static fromJSON(t){return new e(t.radius,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}},Ra=class e extends Br{constructor(e=[],t=[],n=1,r=0){super(),this.type=`PolyhedronGeometry`,this.parameters={vertices:e,indices:t,radius:n,detail:r};let i=[],a=[];o(r),c(n),l(),this.setAttribute(`position`,new Or(i,3)),this.setAttribute(`normal`,new Or(i.slice(),3)),this.setAttribute(`uv`,new Or(a,2)),r===0?this.computeVertexNormals():this.normalizeNormals();function o(e){let n=new U,r=new U,i=new U;for(let a=0;a<t.length;a+=3)f(t[a+0],n),f(t[a+1],r),f(t[a+2],i),s(n,r,i,e)}function s(e,t,n,r){let i=r+1,a=[];for(let r=0;r<=i;r++){a[r]=[];let o=e.clone().lerp(n,r/i),s=t.clone().lerp(n,r/i),c=i-r;for(let e=0;e<=c;e++)e===0&&r===i?a[r][e]=o:a[r][e]=o.clone().lerp(s,e/c)}for(let e=0;e<i;e++)for(let t=0;t<2*(i-e)-1;t++){let n=Math.floor(t/2);t%2==0?(d(a[e][n+1]),d(a[e+1][n]),d(a[e][n])):(d(a[e][n+1]),d(a[e+1][n+1]),d(a[e+1][n]))}}function c(e){let t=new U;for(let n=0;n<i.length;n+=3)t.x=i[n+0],t.y=i[n+1],t.z=i[n+2],t.normalize().multiplyScalar(e),i[n+0]=t.x,i[n+1]=t.y,i[n+2]=t.z}function l(){let e=new U;for(let t=0;t<i.length;t+=3){e.x=i[t+0],e.y=i[t+1],e.z=i[t+2];let n=h(e)/2/Math.PI+.5,r=g(e)/Math.PI+.5;a.push(n,1-r)}p(),u()}function u(){for(let e=0;e<a.length;e+=6){let t=a[e+0],n=a[e+2],r=a[e+4];Math.max(t,n,r)>.9&&Math.min(t,n,r)<.1&&(t<.2&&(a[e+0]+=1),n<.2&&(a[e+2]+=1),r<.2&&(a[e+4]+=1))}}function d(e){i.push(e.x,e.y,e.z)}function f(t,n){let r=t*3;n.x=e[r+0],n.y=e[r+1],n.z=e[r+2]}function p(){let e=new U,t=new U,n=new U,r=new U,o=new H,s=new H,c=new H;for(let l=0,u=0;l<i.length;l+=9,u+=6){e.set(i[l+0],i[l+1],i[l+2]),t.set(i[l+3],i[l+4],i[l+5]),n.set(i[l+6],i[l+7],i[l+8]),o.set(a[u+0],a[u+1]),s.set(a[u+2],a[u+3]),c.set(a[u+4],a[u+5]),r.copy(e).add(t).add(n).divideScalar(3);let d=h(r);m(o,u+0,e,d),m(s,u+2,t,d),m(c,u+4,n,d)}}function m(e,t,n,r){r<0&&e.x===1&&(a[t]=e.x-1),n.x===0&&n.z===0&&(a[t]=r/2/Math.PI+.5)}function h(e){return Math.atan2(e.z,-e.x)}function g(e){return Math.atan2(-e.y,Math.sqrt(e.x*e.x+e.z*e.z))}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.vertices,t.indices,t.radius,t.detail)}},za=class e extends Ra{constructor(e=1,t=0){let n=(1+Math.sqrt(5))/2,r=[-1,n,0,1,n,0,-1,-n,0,1,-n,0,0,-1,n,0,1,n,0,-1,-n,0,1,-n,n,0,-1,n,0,1,-n,0,-1,-n,0,1];super(r,[0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1],e,t),this.type=`IcosahedronGeometry`,this.parameters={radius:e,detail:t}}static fromJSON(t){return new e(t.radius,t.detail)}},Ba=class e extends Br{constructor(e=1,t=1,n=1,r=1){super(),this.type=`PlaneGeometry`,this.parameters={width:e,height:t,widthSegments:n,heightSegments:r};let i=e/2,a=t/2,o=Math.floor(n),s=Math.floor(r),c=o+1,l=s+1,u=e/o,d=t/s,f=[],p=[],m=[],h=[];for(let e=0;e<l;e++){let t=e*d-a;for(let n=0;n<c;n++){let r=n*u-i;p.push(r,-t,0),m.push(0,0,1),h.push(n/o),h.push(1-e/s)}}for(let e=0;e<s;e++)for(let t=0;t<o;t++){let n=t+c*e,r=t+c*(e+1),i=t+1+c*(e+1),a=t+1+c*e;f.push(n,r,a),f.push(r,i,a)}this.setIndex(f),this.setAttribute(`position`,new Or(p,3)),this.setAttribute(`normal`,new Or(m,3)),this.setAttribute(`uv`,new Or(h,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.width,t.height,t.widthSegments,t.heightSegments)}},Va=class e extends Br{constructor(e=.5,t=1,n=32,r=1,i=0,a=Math.PI*2){super(),this.type=`RingGeometry`,this.parameters={innerRadius:e,outerRadius:t,thetaSegments:n,phiSegments:r,thetaStart:i,thetaLength:a},n=Math.max(3,n),r=Math.max(1,r);let o=[],s=[],c=[],l=[],u=e,d=(t-e)/r,f=new U,p=new H;for(let e=0;e<=r;e++){for(let e=0;e<=n;e++){let r=i+e/n*a;f.x=u*Math.cos(r),f.y=u*Math.sin(r),s.push(f.x,f.y,f.z),c.push(0,0,1),p.x=(f.x/t+1)/2,p.y=(f.y/t+1)/2,l.push(p.x,p.y)}u+=d}for(let e=0;e<r;e++){let t=e*(n+1);for(let e=0;e<n;e++){let r=e+t,i=r,a=r+n+1,s=r+n+2,c=r+1;o.push(i,a,c),o.push(a,s,c)}}this.setIndex(o),this.setAttribute(`position`,new Or(s,3)),this.setAttribute(`normal`,new Or(c,3)),this.setAttribute(`uv`,new Or(l,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.innerRadius,t.outerRadius,t.thetaSegments,t.phiSegments,t.thetaStart,t.thetaLength)}};function Ha(e){let t={};for(let n in e){t[n]={};for(let r in e[n]){let i=e[n][r];if(Wa(i))i.isRenderTargetTexture?(B(`UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms().`),t[n][r]=null):t[n][r]=i.clone();else if(Array.isArray(i))if(Wa(i[0])){let e=[];for(let t=0,n=i.length;t<n;t++)e[t]=i[t].clone();t[n][r]=e}else t[n][r]=i.slice();else t[n][r]=i}}return t}function Ua(e){let t={};for(let n=0;n<e.length;n++){let r=Ha(e[n]);for(let e in r)t[e]=r[e]}return t}function Wa(e){return e&&(e.isColor||e.isMatrix3||e.isMatrix4||e.isVector2||e.isVector3||e.isVector4||e.isTexture||e.isQuaternion)}function Ga(e){let t=[];for(let n=0;n<e.length;n++)t.push(e[n].clone());return t}function Ka(e){let t=e.getRenderTarget();return t===null?e.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:Gt.workingColorSpace}var qa={clone:Ha,merge:Ua},Ja=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Ya=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,Xa=class extends Gr{constructor(e){super(),this.isShaderMaterial=!0,this.type=`ShaderMaterial`,this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Ja,this.fragmentShader=Ya,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Ha(e.uniforms),this.uniformsGroups=Ga(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){let t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(let n in this.uniforms){let r=this.uniforms[n].value;r&&r.isTexture?t.uniforms[n]={type:`t`,value:r.toJSON(e).uuid}:r&&r.isColor?t.uniforms[n]={type:`c`,value:r.getHex()}:r&&r.isVector2?t.uniforms[n]={type:`v2`,value:r.toArray()}:r&&r.isVector3?t.uniforms[n]={type:`v3`,value:r.toArray()}:r&&r.isVector4?t.uniforms[n]={type:`v4`,value:r.toArray()}:r&&r.isMatrix3?t.uniforms[n]={type:`m3`,value:r.toArray()}:r&&r.isMatrix4?t.uniforms[n]={type:`m4`,value:r.toArray()}:t.uniforms[n]={value:r}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;let n={};for(let e in this.extensions)this.extensions[e]===!0&&(n[e]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}fromJSON(e,t){if(super.fromJSON(e,t),e.uniforms!==void 0)for(let n in e.uniforms){let r=e.uniforms[n];switch(this.uniforms[n]={},r.type){case`t`:this.uniforms[n].value=t[r.value]||null;break;case`c`:this.uniforms[n].value=new G().setHex(r.value);break;case`v2`:this.uniforms[n].value=new H().fromArray(r.value);break;case`v3`:this.uniforms[n].value=new U().fromArray(r.value);break;case`v4`:this.uniforms[n].value=new nn().fromArray(r.value);break;case`m3`:this.uniforms[n].value=new W().fromArray(r.value);break;case`m4`:this.uniforms[n].value=new ln().fromArray(r.value);break;default:this.uniforms[n].value=r.value}}if(e.defines!==void 0&&(this.defines=e.defines),e.vertexShader!==void 0&&(this.vertexShader=e.vertexShader),e.fragmentShader!==void 0&&(this.fragmentShader=e.fragmentShader),e.glslVersion!==void 0&&(this.glslVersion=e.glslVersion),e.extensions!==void 0)for(let t in e.extensions)this.extensions[t]=e.extensions[t];return e.lights!==void 0&&(this.lights=e.lights),e.clipping!==void 0&&(this.clipping=e.clipping),this}},Za=class extends Xa{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type=`RawShaderMaterial`}},Qa=class extends Gr{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type=`MeshStandardMaterial`,this.defines={STANDARD:``},this.color=new G(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new G(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new H(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new yn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap=`round`,this.wireframeLinejoin=`round`,this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:``},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}},$a=class extends Qa{constructor(e){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:``,PHYSICAL:``},this.type=`MeshPhysicalMaterial`,this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new H(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return gt(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(e){this.ior=(1+.4*e)/(1-.4*e)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new G(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new G(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new G(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._sheen=0,this._transmission=0,this.setValues(e)}get anisotropy(){return this._anisotropy}set anisotropy(e){this._anisotropy>0!=e>0&&this.version++,this._anisotropy=e}get clearcoat(){return this._clearcoat}set clearcoat(e){this._clearcoat>0!=e>0&&this.version++,this._clearcoat=e}get iridescence(){return this._iridescence}set iridescence(e){this._iridescence>0!=e>0&&this.version++,this._iridescence=e}get dispersion(){return this._dispersion}set dispersion(e){this._dispersion>0!=e>0&&this.version++,this._dispersion=e}get sheen(){return this._sheen}set sheen(e){this._sheen>0!=e>0&&this.version++,this._sheen=e}get transmission(){return this._transmission}set transmission(e){this._transmission>0!=e>0&&this.version++,this._transmission=e}copy(e){return super.copy(e),this.defines={STANDARD:``,PHYSICAL:``},this.anisotropy=e.anisotropy,this.anisotropyRotation=e.anisotropyRotation,this.anisotropyMap=e.anisotropyMap,this.clearcoat=e.clearcoat,this.clearcoatMap=e.clearcoatMap,this.clearcoatRoughness=e.clearcoatRoughness,this.clearcoatRoughnessMap=e.clearcoatRoughnessMap,this.clearcoatNormalMap=e.clearcoatNormalMap,this.clearcoatNormalScale.copy(e.clearcoatNormalScale),this.dispersion=e.dispersion,this.ior=e.ior,this.iridescence=e.iridescence,this.iridescenceMap=e.iridescenceMap,this.iridescenceIOR=e.iridescenceIOR,this.iridescenceThicknessRange=[...e.iridescenceThicknessRange],this.iridescenceThicknessMap=e.iridescenceThicknessMap,this.sheen=e.sheen,this.sheenColor.copy(e.sheenColor),this.sheenColorMap=e.sheenColorMap,this.sheenRoughness=e.sheenRoughness,this.sheenRoughnessMap=e.sheenRoughnessMap,this.transmission=e.transmission,this.transmissionMap=e.transmissionMap,this.thickness=e.thickness,this.thicknessMap=e.thicknessMap,this.attenuationDistance=e.attenuationDistance,this.attenuationColor.copy(e.attenuationColor),this.specularIntensity=e.specularIntensity,this.specularIntensityMap=e.specularIntensityMap,this.specularColor.copy(e.specularColor),this.specularColorMap=e.specularColorMap,this}},eo=class extends Gr{constructor(e){super(),this.isMeshToonMaterial=!0,this.defines={TOON:``},this.type=`MeshToonMaterial`,this.color=new G(16777215),this.map=null,this.gradientMap=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new G(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new H(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.alphaMap=null,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap=`round`,this.wireframeLinejoin=`round`,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.gradientMap=e.gradientMap,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.alphaMap=e.alphaMap,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}},to=class extends Gr{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type=`MeshDepthMaterial`,this.depthPacking=We,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}},no=class extends Gr{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type=`MeshDistanceMaterial`,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}};function ro(e,t){return!e||e.constructor===t?e:typeof t.BYTES_PER_ELEMENT==`number`?new t(e):Array.prototype.slice.call(e)}function io(e){function t(t,n){return e[t]-e[n]}let n=e.length,r=Array(n);for(let e=0;e!==n;++e)r[e]=e;return r.sort(t),r}function ao(e,t,n){let r=e.length,i=new e.constructor(r);for(let a=0,o=0;o!==r;++a){let r=n[a]*t;for(let n=0;n!==t;++n)i[o++]=e[r+n]}return i}function oo(e,t,n,r){let i=1,a=e[0];for(;a!==void 0&&a[r]===void 0;)a=e[i++];if(a===void 0)return;let o=a[r];if(o!==void 0)if(Array.isArray(o))do o=a[r],o!==void 0&&(t.push(a.time),n.push(...o)),a=e[i++];while(a!==void 0);else if(o.toArray!==void 0)do o=a[r],o!==void 0&&(t.push(a.time),o.toArray(n,n.length)),a=e[i++];while(a!==void 0);else do o=a[r],o!==void 0&&(t.push(a.time),n.push(o)),a=e[i++];while(a!==void 0)}var so=class{constructor(e,t,n,r){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=r===void 0?new t.constructor(n):r,this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){let t=this.parameterPositions,n=this._cachedIndex,r=t[n],i=t[n-1];validate_interval:{seek:{let a;linear_scan:{forward_scan:if(!(e<r)){for(let a=n+2;;){if(r===void 0){if(e<i)break forward_scan;return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===a)break;if(i=r,r=t[++n],e<r)break seek}a=t.length;break linear_scan}if(!(e>=i)){let o=t[1];e<o&&(n=2,i=o);for(let a=n-2;;){if(i===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===a)break;if(r=i,i=t[--n-1],e>=i)break seek}a=n,n=0;break linear_scan}break validate_interval}for(;n<a;){let r=n+a>>>1;e<t[r]?a=r:n=r+1}if(r=t[n],i=t[n-1],i===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(r===void 0)return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,i,r)}return this.interpolate_(n,i,e,r)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let t=this.resultBuffer,n=this.sampleValues,r=this.valueSize,i=e*r;for(let e=0;e!==r;++e)t[e]=n[i+e];return t}interpolate_(){throw Error(`THREE.Interpolant: Call to abstract method.`)}intervalChanged_(){}},co=class extends so{constructor(e,t,n,r){super(e,t,n,r),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:ze,endingEnd:ze}}intervalChanged_(e,t,n){let r=this.parameterPositions,i=e-2,a=e+1,o=r[i],s=r[a];if(o===void 0)switch(this.getSettings_().endingStart){case Be:i=e,o=2*t-n;break;case Ve:i=r.length-2,o=t+r[i]-r[i+1];break;default:i=e,o=n}if(s===void 0)switch(this.getSettings_().endingEnd){case Be:a=e,s=2*n-t;break;case Ve:a=1,s=n+r[1]-r[0];break;default:a=e-1,s=t}let c=(n-t)*.5,l=this.valueSize;this._weightPrev=c/(t-o),this._weightNext=c/(s-n),this._offsetPrev=i*l,this._offsetNext=a*l}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=e*o,c=s-o,l=this._offsetPrev,u=this._offsetNext,d=this._weightPrev,f=this._weightNext,p=(n-t)/(r-t),m=p*p,h=m*p,g=-d*h+2*d*m-d*p,_=(1+d)*h+(-1.5-2*d)*m+(-.5+d)*p+1,v=(-1-f)*h+(1.5+f)*m+.5*p,y=f*h-f*m;for(let e=0;e!==o;++e)i[e]=g*a[l+e]+_*a[c+e]+v*a[s+e]+y*a[u+e];return i}},lo=class extends so{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=e*o,c=s-o,l=(n-t)/(r-t),u=1-l;for(let e=0;e!==o;++e)i[e]=a[c+e]*u+a[s+e]*l;return i}},uo=class extends so{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e){return this.copySampleValue_(e-1)}},fo=class extends so{interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=e*o,c=s-o,l=this.inTangents,u=this.outTangents;if(!l||!u){let e=(n-t)/(r-t),l=1-e;for(let t=0;t!==o;++t)i[t]=a[c+t]*l+a[s+t]*e;return i}let d=o*2,f=e-1;for(let p=0;p!==o;++p){let o=a[c+p],m=a[s+p],h=f*d+p*2,g=u[h],_=u[h+1],v=e*d+p*2,y=l[v],b=l[v+1],x=(n-t)/(r-t),S,C,w,T,E;for(let e=0;e<8;e++){S=x*x,C=S*x,w=1-x,T=w*w,E=T*w;let e=E*t+3*T*x*g+3*w*S*y+C*r-n;if(Math.abs(e)<1e-10)break;let i=3*T*(g-t)+6*w*x*(y-g)+3*S*(r-y);if(Math.abs(i)<1e-10)break;x-=e/i,x=Math.max(0,Math.min(1,x))}i[p]=E*o+3*T*x*_+3*w*S*b+C*m}return i}},po=class{constructor(e,t,n,r){if(e===void 0)throw Error(`THREE.KeyframeTrack: track name is undefined`);if(t===void 0||t.length===0)throw Error(`THREE.KeyframeTrack: no keyframes in track named `+e);this.name=e,this.times=ro(t,this.TimeBufferType),this.values=ro(n,this.ValueBufferType),this.setInterpolation(r||this.DefaultInterpolation)}static toJSON(e){let t=e.constructor,n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:ro(e.times,Array),values:ro(e.values,Array)};let t=e.getInterpolation();t!==e.DefaultInterpolation&&(n.interpolation=t)}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new uo(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new lo(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new co(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodBezier(e){let t=new fo(this.times,this.values,this.getValueSize(),e);return this.settings&&(t.inTangents=this.settings.inTangents,t.outTangents=this.settings.outTangents),t}setInterpolation(e){let t;switch(e){case R:t=this.InterpolantFactoryMethodDiscrete;break;case z:t=this.InterpolantFactoryMethodLinear;break;case Le:t=this.InterpolantFactoryMethodSmooth;break;case Re:t=this.InterpolantFactoryMethodBezier}if(t===void 0){let t=`unsupported interpolation for `+this.ValueTypeName+` keyframe track named `+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw Error(t);return B(`KeyframeTrack:`,t),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return R;case this.InterpolantFactoryMethodLinear:return z;case this.InterpolantFactoryMethodSmooth:return Le;case this.InterpolantFactoryMethodBezier:return Re}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let t=this.times;for(let n=0,r=t.length;n!==r;++n)t[n]+=e}return this}scale(e){if(e!==1){let t=this.times;for(let n=0,r=t.length;n!==r;++n)t[n]*=e}return this}trim(e,t){let n=this.times,r=n.length,i=0,a=r-1;for(;i!==r&&n[i]<e;)++i;for(;a!==-1&&n[a]>t;)--a;if(++a,i!==0||a!==r){i>=a&&(a=Math.max(a,1),i=a-1);let e=this.getValueSize();this.times=n.slice(i,a),this.values=this.values.slice(i*e,a*e)}return this}validate(){let e=!0,t=this.getValueSize();t-Math.floor(t)!==0&&(V(`KeyframeTrack: Invalid value size in track.`,this),e=!1);let n=this.times,r=this.values,i=n.length;i===0&&(V(`KeyframeTrack: Track is empty.`,this),e=!1);let a=null;for(let t=0;t!==i;t++){let r=n[t];if(typeof r==`number`&&isNaN(r)){V(`KeyframeTrack: Time is not a valid number.`,this,t,r),e=!1;break}if(a!==null&&a>r){V(`KeyframeTrack: Out of order keys.`,this,t,r,a),e=!1;break}a=r}if(r!==void 0&&tt(r))for(let t=0,n=r.length;t!==n;++t){let n=r[t];if(isNaN(n)){V(`KeyframeTrack: Value is not a valid number.`,this,t,n),e=!1;break}}return e}optimize(){let e=this.times.slice(),t=this.values.slice(),n=this.getValueSize(),r=this.getInterpolation()===Le,i=e.length-1,a=1;for(let o=1;o<i;++o){let i=!1,s=e[o];if(s!==e[o+1]&&(o!==1||s!==e[0]))if(r)i=!0;else{let e=o*n,r=e-n,a=e+n;for(let o=0;o!==n;++o){let n=t[e+o];if(n!==t[r+o]||n!==t[a+o]){i=!0;break}}}if(i){if(o!==a){e[a]=e[o];let r=o*n,i=a*n;for(let e=0;e!==n;++e)t[i+e]=t[r+e]}++a}}if(i>0){e[a]=e[i];for(let e=i*n,r=a*n,o=0;o!==n;++o)t[r+o]=t[e+o];++a}return a===e.length?(this.times=e,this.values=t):(this.times=e.slice(0,a),this.values=t.slice(0,a*n)),this}clone(){let e=this.times.slice(),t=this.values.slice(),n=this.constructor,r=new n(this.name,e,t);return r.createInterpolant=this.createInterpolant,r}};po.prototype.ValueTypeName=``,po.prototype.TimeBufferType=Float32Array,po.prototype.ValueBufferType=Float32Array,po.prototype.DefaultInterpolation=z;var mo=class extends po{constructor(e,t,n){super(e,t,n)}};mo.prototype.ValueTypeName=`bool`,mo.prototype.ValueBufferType=Array,mo.prototype.DefaultInterpolation=R,mo.prototype.InterpolantFactoryMethodLinear=void 0,mo.prototype.InterpolantFactoryMethodSmooth=void 0;var ho=class extends po{constructor(e,t,n,r){super(e,t,n,r)}};ho.prototype.ValueTypeName=`color`;var go=class extends po{constructor(e,t,n,r){super(e,t,n,r)}};go.prototype.ValueTypeName=`number`;var _o=class extends so{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=(n-t)/(r-t),c=e*o;for(let e=c+o;c!==e;c+=4)Rt.slerpFlat(i,0,a,c-o,a,c,s);return i}},vo=class extends po{constructor(e,t,n,r){super(e,t,n,r)}InterpolantFactoryMethodLinear(e){return new _o(this.times,this.values,this.getValueSize(),e)}};vo.prototype.ValueTypeName=`quaternion`,vo.prototype.InterpolantFactoryMethodSmooth=void 0;var yo=class extends po{constructor(e,t,n){super(e,t,n)}};yo.prototype.ValueTypeName=`string`,yo.prototype.ValueBufferType=Array,yo.prototype.DefaultInterpolation=R,yo.prototype.InterpolantFactoryMethodLinear=void 0,yo.prototype.InterpolantFactoryMethodSmooth=void 0;var bo=class extends po{constructor(e,t,n,r){super(e,t,n,r)}};bo.prototype.ValueTypeName=`vector`;var xo=class{constructor(e=``,t=-1,n=[],r=He){this.name=e,this.tracks=n,this.duration=t,this.blendMode=r,this.uuid=ht(),this.userData={},this.duration<0&&this.resetDuration()}static parse(e){let t=[],n=e.tracks,r=1/(e.fps||1);for(let e=0,i=n.length;e!==i;++e)t.push(Co(n[e]).scale(r));let i=new this(e.name,e.duration,t,e.blendMode);return i.uuid=e.uuid,i.userData=JSON.parse(e.userData||`{}`),i}static toJSON(e){let t=[],n=e.tracks,r={name:e.name,duration:e.duration,tracks:t,uuid:e.uuid,blendMode:e.blendMode,userData:JSON.stringify(e.userData)};for(let e=0,r=n.length;e!==r;++e)t.push(po.toJSON(n[e]));return r}static CreateFromMorphTargetSequence(e,t,n,r){let i=t.length,a=[];for(let e=0;e<i;e++){let o=[],s=[];o.push((e+i-1)%i,e,(e+1)%i),s.push(0,1,0);let c=io(o);o=ao(o,1,c),s=ao(s,1,c),!r&&o[0]===0&&(o.push(i),s.push(s[0])),a.push(new go(`.morphTargetInfluences[`+t[e].name+`]`,o,s).scale(1/n))}return new this(e,-1,a)}static findByName(e,t){let n=e;if(!Array.isArray(e)){let t=e;n=t.geometry&&t.geometry.animations||t.animations}for(let e=0;e<n.length;e++)if(n[e].name===t)return n[e];return null}static CreateClipsFromMorphTargetSequences(e,t,n){let r={},i=/^([\w-]*?)([\d]+)$/;for(let t=0,n=e.length;t<n;t++){let n=e[t],a=n.name.match(i);if(a&&a.length>1){let e=a[1],t=r[e];t||(r[e]=t=[]),t.push(n)}}let a=[];for(let e in r)a.push(this.CreateFromMorphTargetSequence(e,r[e],t,n));return a}resetDuration(){let e=this.tracks,t=0;for(let n=0,r=e.length;n!==r;++n){let e=this.tracks[n];t=Math.max(t,e.times[e.times.length-1])}return this.duration=t,this}trim(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].trim(0,this.duration);return this}validate(){let e=!0;for(let t=0;t<this.tracks.length;t++)e&&=this.tracks[t].validate();return e}optimize(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].optimize();return this}clone(){let e=[];for(let t=0;t<this.tracks.length;t++)e.push(this.tracks[t].clone());let t=new this.constructor(this.name,this.duration,e,this.blendMode);return t.userData=JSON.parse(JSON.stringify(this.userData)),t}toJSON(){return this.constructor.toJSON(this)}};function So(e){switch(e.toLowerCase()){case`scalar`:case`double`:case`float`:case`number`:case`integer`:return go;case`vector`:case`vector2`:case`vector3`:case`vector4`:return bo;case`color`:return ho;case`quaternion`:return vo;case`bool`:case`boolean`:return mo;case`string`:return yo}throw Error(`THREE.KeyframeTrack: Unsupported typeName: `+e)}function Co(e){if(e.type===void 0)throw Error(`THREE.KeyframeTrack: track type undefined, can not parse`);let t=So(e.type);if(e.times===void 0){let t=[],n=[];oo(e.keys,t,n,`value`),e.times=t,e.values=n}return t.parse===void 0?new t(e.name,e.times,e.values,e.interpolation):t.parse(e)}var wo={enabled:!1,files:{},add:function(e,t){this.enabled!==!1&&(To(e)||(this.files[e]=t))},get:function(e){if(this.enabled!==!1&&!To(e))return this.files[e]},remove:function(e){delete this.files[e]},clear:function(){this.files={}}};function To(e){try{let t=e.slice(e.indexOf(`:`)+1);return new URL(t).protocol===`blob:`}catch{return!1}}var Eo=new class{constructor(e,t,n){let r=this,i=!1,a=0,o=0,s,c=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this._abortController=null,this.itemStart=function(e){o++,i===!1&&r.onStart!==void 0&&r.onStart(e,a,o),i=!0},this.itemEnd=function(e){a++,r.onProgress!==void 0&&r.onProgress(e,a,o),a===o&&(i=!1,r.onLoad!==void 0&&r.onLoad())},this.itemError=function(e){r.onError!==void 0&&r.onError(e)},this.resolveURL=function(e){return e=e.normalize(`NFC`),s?s(e):e},this.setURLModifier=function(e){return s=e,this},this.addHandler=function(e,t){return c.push(e,t),this},this.removeHandler=function(e){let t=c.indexOf(e);return t!==-1&&c.splice(t,2),this},this.getHandler=function(e){for(let t=0,n=c.length;t<n;t+=2){let n=c[t],r=c[t+1];if(n.global&&(n.lastIndex=0),n.test(e))return r}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||=new AbortController,this._abortController}},Do=class{constructor(e){this.manager=e===void 0?Eo:e,this.crossOrigin=`anonymous`,this.withCredentials=!1,this.path=``,this.resourcePath=``,this.requestHeader={},typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`observe`,{detail:this}))}load(){}loadAsync(e,t){let n=this;return new Promise(function(r,i){n.load(e,r,t,i)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}};Do.DEFAULT_MATERIAL_NAME=`__DEFAULT`;var Oo={},ko=class extends Error{constructor(e,t){super(e),this.response=t}},Ao=class extends Do{constructor(e){super(e),this.mimeType=``,this.responseType=``,this._abortController=new AbortController}load(e,t,n,r){e===void 0&&(e=``),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);let i=wo.get(`file:${e}`);if(i!==void 0){this.manager.itemStart(e),setTimeout(()=>{t&&t(i),this.manager.itemEnd(e)},0);return}if(Oo[e]!==void 0){Oo[e].push({onLoad:t,onProgress:n,onError:r});return}Oo[e]=[],Oo[e].push({onLoad:t,onProgress:n,onError:r});let a=new Request(e,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?`include`:`same-origin`,signal:typeof AbortSignal.any==`function`?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal}),o=this.mimeType,s=this.responseType;fetch(a).then(t=>{if(t.status===200||t.status===0){if(t.status===0&&B(`FileLoader: HTTP Status 0 received.`),typeof ReadableStream>`u`||t.body===void 0||t.body.getReader===void 0)return t;let n=Oo[e],r=t.body.getReader(),i=t.headers.get(`X-File-Size`)||t.headers.get(`Content-Length`),a=i?parseInt(i):0,o=a!==0,s=0,c=new ReadableStream({start(e){t();function t(){r.read().then(({done:r,value:i})=>{if(r)e.close();else{s+=i.byteLength;let r=new ProgressEvent(`progress`,{lengthComputable:o,loaded:s,total:a});for(let e=0,t=n.length;e<t;e++){let t=n[e];t.onProgress&&t.onProgress(r)}e.enqueue(i),t()}},t=>{e.error(t)})}}});return new Response(c)}throw new ko(`fetch for "${t.url}" responded with ${t.status}: ${t.statusText}`,t)}).then(e=>{switch(s){case`arraybuffer`:return e.arrayBuffer();case`blob`:return e.blob();case`document`:return e.text().then(e=>new DOMParser().parseFromString(e,o));case`json`:return e.json();default:if(o===``)return e.text();{let t=/charset="?([^;"\s]*)"?/i.exec(o),n=t&&t[1]?t[1].toLowerCase():void 0,r=new TextDecoder(n);return e.arrayBuffer().then(e=>r.decode(e))}}}).then(t=>{wo.add(`file:${e}`,t);let n=Oo[e];delete Oo[e];for(let e=0,r=n.length;e<r;e++){let r=n[e];r.onLoad&&r.onLoad(t)}}).catch(t=>{let n=Oo[e];if(n===void 0)throw this.manager.itemError(e),t;delete Oo[e];for(let e=0,r=n.length;e<r;e++){let r=n[e];r.onError&&r.onError(t)}this.manager.itemError(e)}).finally(()=>{this.manager.itemEnd(e)}),this.manager.itemStart(e)}setResponseType(e){return this.responseType=e,this}setMimeType(e){return this.mimeType=e,this}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}},jo=new WeakMap,Mo=class extends Do{constructor(e){super(e)}load(e,t,n,r){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);let i=this,a=wo.get(`image:${e}`);if(a!==void 0){if(a.complete===!0)i.manager.itemStart(e),setTimeout(function(){t&&t(a),i.manager.itemEnd(e)},0);else{let e=jo.get(a);e===void 0&&(e=[],jo.set(a,e)),e.push({onLoad:t,onError:r})}return a}let o=nt(`img`);function s(){l(),t&&t(this);let n=jo.get(this)||[];for(let e=0;e<n.length;e++){let t=n[e];t.onLoad&&t.onLoad(this)}jo.delete(this),i.manager.itemEnd(e)}function c(t){l(),r&&r(t),wo.remove(`image:${e}`);let n=jo.get(this)||[];for(let e=0;e<n.length;e++){let r=n[e];r.onError&&r.onError(t)}jo.delete(this),i.manager.itemError(e),i.manager.itemEnd(e)}function l(){o.removeEventListener(`load`,s,!1),o.removeEventListener(`error`,c,!1)}return o.addEventListener(`load`,s,!1),o.addEventListener(`error`,c,!1),e.slice(0,5)!==`data:`&&this.crossOrigin!==void 0&&(o.crossOrigin=this.crossOrigin),wo.add(`image:${e}`,o),i.manager.itemStart(e),o.src=e,o}},No=class extends Do{constructor(e){super(e)}load(e,t,n,r){let i=new tn,a=new Mo(this.manager);return a.setCrossOrigin(this.crossOrigin),a.setPath(this.path),a.load(e,function(e){i.image=e,i.needsUpdate=!0,t!==void 0&&t(i)},n,r),i}},Po=class extends In{constructor(e,t=1){super(),this.isLight=!0,this.type=`Light`,this.color=new G(e),this.intensity=t}dispose(){this.dispatchEvent({type:`dispose`})}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){let t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,t}},Fo=class extends Po{constructor(e,t,n){super(e,n),this.isHemisphereLight=!0,this.type=`HemisphereLight`,this.position.copy(In.DEFAULT_UP),this.updateMatrix(),this.groundColor=new G(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}toJSON(e){let t=super.toJSON(e);return t.object.groundColor=this.groundColor.getHex(),t}},Io=new ln,Lo=new U,Ro=new U,zo=class{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new H(512,512),this.mapType=p,this.map=null,this.mapPass=null,this.matrix=new ln,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new sa,this._frameExtents=new H(1,1),this._viewportCount=1,this._viewports=[new nn(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){let t=this.camera,n=this.matrix;Lo.setFromMatrixPosition(e.matrixWorld),t.position.copy(Lo),Ro.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(Ro),t.updateMatrixWorld(),Io.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Io,t.coordinateSystem,t.reversedDepth),t.coordinateSystem===2001||t.reversedDepth?n.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(Io)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this.biasNode=e.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){let e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}},Bo=new U,Vo=new Rt,Ho=new U,Uo=class extends In{constructor(){super(),this.isCamera=!0,this.type=`Camera`,this.matrixWorldInverse=new ln,this.projectionMatrix=new ln,this.projectionMatrixInverse=new ln,this.coordinateSystem=$e,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(Bo,Vo,Ho),Ho.x===1&&Ho.y===1&&Ho.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Bo,Vo,Ho.set(1,1,1)).invert()}updateWorldMatrix(e,t,n=!1){super.updateWorldMatrix(e,t,n),this.matrixWorld.decompose(Bo,Vo,Ho),Ho.x===1&&Ho.y===1&&Ho.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Bo,Vo,Ho.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},Wo=new U,Go=new H,Ko=new H,qo=class extends Uo{constructor(e=50,t=1,n=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type=`PerspectiveCamera`,this.fov=e,this.zoom=1,this.near=n,this.far=r,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){let t=.5*this.getFilmHeight()/e;this.fov=mt*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){let e=Math.tan(pt*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return mt*2*Math.atan(Math.tan(pt*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){Wo.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(Wo.x,Wo.y).multiplyScalar(-e/Wo.z),Wo.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(Wo.x,Wo.y).multiplyScalar(-e/Wo.z)}getViewSize(e,t){return this.getViewBounds(e,Go,Ko),t.subVectors(Ko,Go)}setViewOffset(e,t,n,r,i,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=i,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=this.near,t=e*Math.tan(pt*.5*this.fov)/this.zoom,n=2*t,r=this.aspect*n,i=-.5*r,a=this.view;if(this.view!==null&&this.view.enabled){let e=a.fullWidth,o=a.fullHeight;i+=a.offsetX*r/e,t-=a.offsetY*n/o,r*=a.width/e,n*=a.height/o}let o=this.filmOffset;o!==0&&(i+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(i,i+r,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}},Jo=class extends zo{constructor(){super(new qo(50,1,.5,500)),this.isSpotLightShadow=!0,this.focus=1,this.aspect=1}updateMatrices(e){let t=this.camera,n=mt*2*e.angle*this.focus,r=this.mapSize.width/this.mapSize.height*this.aspect,i=e.distance||t.far;(n!==t.fov||r!==t.aspect||i!==t.far)&&(t.fov=n,t.aspect=r,t.far=i,t.updateProjectionMatrix()),super.updateMatrices(e)}copy(e){return super.copy(e),this.focus=e.focus,this}},Yo=class extends Po{constructor(e,t,n=0,r=Math.PI/3,i=0,a=2){super(e,t),this.isSpotLight=!0,this.type=`SpotLight`,this.position.copy(In.DEFAULT_UP),this.updateMatrix(),this.target=new In,this.distance=n,this.angle=r,this.penumbra=i,this.decay=a,this.map=null,this.shadow=new Jo}get power(){return this.intensity*Math.PI}set power(e){this.intensity=e/Math.PI}dispose(){super.dispose(),this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.angle=e.angle,this.penumbra=e.penumbra,this.decay=e.decay,this.target=e.target.clone(),this.map=e.map,this.shadow=e.shadow.clone(),this}toJSON(e){let t=super.toJSON(e);return t.object.distance=this.distance,t.object.angle=this.angle,t.object.decay=this.decay,t.object.penumbra=this.penumbra,t.object.target=this.target.uuid,this.map&&this.map.isTexture&&(t.object.map=this.map.toJSON(e).uuid),t.object.shadow=this.shadow.toJSON(),t}},Xo=class extends zo{constructor(){super(new qo(90,1,.5,500)),this.isPointLightShadow=!0}},Zo=class extends Po{constructor(e,t,n=0,r=2){super(e,t),this.isPointLight=!0,this.type=`PointLight`,this.distance=n,this.decay=r,this.shadow=new Xo}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){super.dispose(),this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}toJSON(e){let t=super.toJSON(e);return t.object.distance=this.distance,t.object.decay=this.decay,t.object.shadow=this.shadow.toJSON(),t}},Qo=class extends Uo{constructor(e=-1,t=1,n=1,r=-1,i=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type=`OrthographicCamera`,this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=r,this.near=i,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,r,i,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=i,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,r=(this.top+this.bottom)/2,i=n-e,a=n+e,o=r+t,s=r-t;if(this.view!==null&&this.view.enabled){let e=(this.right-this.left)/this.view.fullWidth/this.zoom,t=(this.top-this.bottom)/this.view.fullHeight/this.zoom;i+=e*this.view.offsetX,a=i+e*this.view.width,o-=t*this.view.offsetY,s=o-t*this.view.height}this.projectionMatrix.makeOrthographic(i,a,o,s,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}},$o=class extends zo{constructor(){super(new Qo(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},es=class extends Po{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type=`DirectionalLight`,this.position.copy(In.DEFAULT_UP),this.updateMatrix(),this.target=new In,this.shadow=new $o}dispose(){super.dispose(),this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}toJSON(e){let t=super.toJSON(e);return t.object.shadow=this.shadow.toJSON(),t.object.target=this.target.uuid,t}},ts=class{static extractUrlBase(e){let t=e.lastIndexOf(`/`);return t===-1?`./`:e.slice(0,t+1)}static resolveURL(e,t){return typeof e!=`string`||e===``?``:(/^https?:\/\//i.test(t)&&/^\//.test(e)&&(t=t.replace(/(^https?:\/\/[^\/]+).*/i,`$1`)),/^(https?:)?\/\//i.test(e)||/^data:.*,.*$/i.test(e)||/^blob:.*$/i.test(e)?e:t+e)}},ns=class extends Br{constructor(){super(),this.isInstancedBufferGeometry=!0,this.type=`InstancedBufferGeometry`,this.instanceCount=1/0}copy(e){return super.copy(e),this.instanceCount=e.instanceCount,this}toJSON(){let e=super.toJSON();return e.instanceCount=this.instanceCount,e.isInstancedBufferGeometry=!0,e}},rs=new WeakMap,is=class extends Do{constructor(e){super(e),this.isImageBitmapLoader=!0,typeof createImageBitmap>`u`&&B(`ImageBitmapLoader: createImageBitmap() not supported.`),typeof fetch>`u`&&B(`ImageBitmapLoader: fetch() not supported.`),this.options={premultiplyAlpha:`none`},this._abortController=new AbortController}setOptions(e){return this.options=e,this}load(e,t,n,r){e===void 0&&(e=``),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);let i=this,a=wo.get(`image-bitmap:${e}`);if(a!==void 0){if(i.manager.itemStart(e),a.then){a.then(n=>{rs.has(a)===!0?(r&&r(rs.get(a)),i.manager.itemError(e),i.manager.itemEnd(e)):(t&&t(n),i.manager.itemEnd(e))});return}setTimeout(function(){t&&t(a),i.manager.itemEnd(e)},0);return}let o={};o.credentials=this.crossOrigin===`anonymous`?`same-origin`:`include`,o.headers=this.requestHeader,o.signal=typeof AbortSignal.any==`function`?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal;let s=fetch(e,o).then(function(e){return e.blob()}).then(function(e){return createImageBitmap(e,Object.assign(i.options,{colorSpaceConversion:`none`}))}).then(function(n){wo.add(`image-bitmap:${e}`,n),t&&t(n),i.manager.itemEnd(e)}).catch(function(t){r&&r(t),rs.set(s,t),wo.remove(`image-bitmap:${e}`),i.manager.itemError(e),i.manager.itemEnd(e)});wo.add(`image-bitmap:${e}`,s),i.manager.itemStart(e)}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}},as,os=class{static getContext(){return as===void 0&&(as=new(window.AudioContext||window.webkitAudioContext)),as}static setContext(e){as=e}},ss=class extends Do{constructor(e){super(e)}load(e,t,n,r){let i=this,a=new Ao(this.manager);a.setResponseType(`arraybuffer`),a.setPath(this.path),a.setRequestHeader(this.requestHeader),a.setWithCredentials(this.withCredentials),a.load(e,function(n){try{let r=n.slice(0),a=os.getContext(),s=e+`#decode`;i.manager.itemStart(s),a.decodeAudioData(r,function(e){t(e),i.manager.itemEnd(s)}).catch(function(e){o(e),i.manager.itemEnd(s)})}catch(e){o(e)}},n,r);function o(t){r?r(t):V(t),i.manager.itemError(e)}}},cs=-90,ls=1,us=class extends In{constructor(e,t,n){super(),this.type=`CubeCamera`,this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let r=new qo(cs,ls,e,t);r.layers=this.layers,this.add(r);let i=new qo(cs,ls,e,t);i.layers=this.layers,this.add(i);let a=new qo(cs,ls,e,t);a.layers=this.layers,this.add(a);let o=new qo(cs,ls,e,t);o.layers=this.layers,this.add(o);let s=new qo(cs,ls,e,t);s.layers=this.layers,this.add(s);let c=new qo(cs,ls,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let e=this.coordinateSystem,t=this.children.concat(),[n,r,i,a,o,s]=t;for(let e of t)this.remove(e);if(e===2e3)n.up.set(0,1,0),n.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),i.up.set(0,0,-1),i.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),s.up.set(0,1,0),s.lookAt(0,0,-1);else if(e===2001)n.up.set(0,-1,0),n.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),i.up.set(0,0,1),i.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),s.up.set(0,-1,0),s.lookAt(0,0,-1);else throw Error(`THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: `+e);for(let e of t)this.add(e),e.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:r}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());let[i,a,o,s,c,l]=this.children,u=e.getRenderTarget(),d=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),p=e.xr.enabled;e.xr.enabled=!1;let m=n.texture.generateMipmaps;n.texture.generateMipmaps=!1;let h=!1;h=e.isWebGLRenderer===!0?e.state.buffers.depth.getReversed():e.reversedDepthBuffer,e.setRenderTarget(n,0,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,i),e.setRenderTarget(n,1,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,a),e.setRenderTarget(n,2,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,o),e.setRenderTarget(n,3,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,s),e.setRenderTarget(n,4,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),n.texture.generateMipmaps=m,e.setRenderTarget(n,5,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),e.setRenderTarget(u,d,f),e.xr.enabled=p,n.texture.needsPMREMUpdate=!0}},ds=class extends qo{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}},fs=class{constructor(){this._previousTime=0,this._currentTime=0,this._startTime=performance.now(),this._delta=0,this._elapsed=0,this._timescale=1,this._document=null,this._pageVisibilityHandler=null}connect(e){this._document=e,e.hidden!==void 0&&(this._pageVisibilityHandler=ps.bind(this),e.addEventListener(`visibilitychange`,this._pageVisibilityHandler,!1))}disconnect(){this._pageVisibilityHandler!==null&&(this._document.removeEventListener(`visibilitychange`,this._pageVisibilityHandler),this._pageVisibilityHandler=null),this._document=null}getDelta(){return this._delta/1e3}getElapsed(){return this._elapsed/1e3}getTimescale(){return this._timescale}setTimescale(e){return this._timescale=e,this}reset(){return this._currentTime=performance.now()-this._startTime,this}dispose(){this.disconnect()}update(e){return this._pageVisibilityHandler!==null&&this._document.hidden===!0?this._delta=0:(this._previousTime=this._currentTime,this._currentTime=(e===void 0?performance.now():e)-this._startTime,this._delta=(this._currentTime-this._previousTime)*this._timescale,this._elapsed+=this._delta),this}};function ps(){this._document.hidden===!1&&this.reset()}var ms=new U,hs=new Rt,gs=new U,_s=new U,vs=new U,ys=class extends In{constructor(){super(),this.type=`AudioListener`,this.context=os.getContext(),this.gain=this.context.createGain(),this.gain.connect(this.context.destination),this.filter=null,this.timeDelta=0,this._timer=new fs}getInput(){return this.gain}removeFilter(){return this.filter!==null&&(this.gain.disconnect(this.filter),this.filter.disconnect(this.context.destination),this.gain.connect(this.context.destination),this.filter=null),this}getFilter(){return this.filter}setFilter(e){return this.filter===null?this.gain.disconnect(this.context.destination):(this.gain.disconnect(this.filter),this.filter.disconnect(this.context.destination)),this.filter=e,this.gain.connect(this.filter),this.filter.connect(this.context.destination),this}getMasterVolume(){return this.gain.gain.value}setMasterVolume(e){return this.gain.gain.setTargetAtTime(e,this.context.currentTime,.01),this}updateMatrixWorld(e){super.updateMatrixWorld(e),this._timer.update();let t=this.context.listener;if(this.timeDelta=this._timer.getDelta(),this.matrixWorld.decompose(ms,hs,gs),_s.set(0,0,-1).applyQuaternion(hs),vs.set(0,1,0).applyQuaternion(hs),t.positionX){let e=this.context.currentTime+this.timeDelta;t.positionX.linearRampToValueAtTime(ms.x,e),t.positionY.linearRampToValueAtTime(ms.y,e),t.positionZ.linearRampToValueAtTime(ms.z,e),t.forwardX.linearRampToValueAtTime(_s.x,e),t.forwardY.linearRampToValueAtTime(_s.y,e),t.forwardZ.linearRampToValueAtTime(_s.z,e),t.upX.linearRampToValueAtTime(vs.x,e),t.upY.linearRampToValueAtTime(vs.y,e),t.upZ.linearRampToValueAtTime(vs.z,e)}else t.setPosition(ms.x,ms.y,ms.z),t.setOrientation(_s.x,_s.y,_s.z,vs.x,vs.y,vs.z)}},bs=class extends In{constructor(e){super(),this.type=`Audio`,this.listener=e,this.context=e.context,this.gain=this.context.createGain(),this.gain.connect(e.getInput()),this.autoplay=!1,this.buffer=null,this.detune=0,this.loop=!1,this.loopStart=0,this.loopEnd=0,this.offset=0,this.duration=void 0,this.playbackRate=1,this.isPlaying=!1,this.hasPlaybackControl=!0,this.source=null,this.sourceType=`empty`,this._startedAt=0,this._progress=0,this._connected=!1,this.filters=[]}getOutput(){return this.gain}setNodeSource(e){return this.hasPlaybackControl=!1,this.sourceType=`audioNode`,this.source=e,this.connect(),this}setMediaElementSource(e){return this.hasPlaybackControl=!1,this.sourceType=`mediaNode`,this.source=this.context.createMediaElementSource(e),this.connect(),this}setMediaStreamSource(e){return this.hasPlaybackControl=!1,this.sourceType=`mediaStreamNode`,this.source=this.context.createMediaStreamSource(e),this.connect(),this}setBuffer(e){return this.buffer=e,this.sourceType=`buffer`,this.autoplay&&this.play(),this}play(e=0){if(this.isPlaying===!0){B(`Audio: Audio is already playing.`);return}if(this.hasPlaybackControl===!1){B(`Audio: this Audio has no playback control.`);return}this._startedAt=this.context.currentTime+e;let t=this.context.createBufferSource();return t.buffer=this.buffer,t.loop=this.loop,t.loopStart=this.loopStart,t.loopEnd=this.loopEnd,t.onended=this.onEnded.bind(this),t.start(this._startedAt,this._progress+this.offset,this.duration),this.isPlaying=!0,this.source=t,this.setDetune(this.detune),this.setPlaybackRate(this.playbackRate),this.connect()}pause(){if(this.hasPlaybackControl===!1){B(`Audio: this Audio has no playback control.`);return}return this.isPlaying===!0&&(this._progress+=Math.max(this.context.currentTime-this._startedAt,0)*this.playbackRate,this.loop===!0&&(this._progress%=this.duration||this.buffer.duration),this.source.stop(),this.source.onended=null,this.isPlaying=!1),this}stop(e=0){if(this.hasPlaybackControl===!1){B(`Audio: this Audio has no playback control.`);return}return this._progress=0,this.source!==null&&(this.source.stop(this.context.currentTime+e),this.source.onended=null),this.isPlaying=!1,this}connect(){if(this.filters.length>0){this.source.connect(this.filters[0]);for(let e=1,t=this.filters.length;e<t;e++)this.filters[e-1].connect(this.filters[e]);this.filters[this.filters.length-1].connect(this.getOutput())}else this.source.connect(this.getOutput());return this._connected=!0,this}disconnect(){if(this._connected!==!1){if(this.filters.length>0){this.source.disconnect(this.filters[0]);for(let e=1,t=this.filters.length;e<t;e++)this.filters[e-1].disconnect(this.filters[e]);this.filters[this.filters.length-1].disconnect(this.getOutput())}else this.source.disconnect(this.getOutput());return this._connected=!1,this}}getFilters(){return this.filters}setFilters(e){return e||=[],this._connected===!0?(this.disconnect(),this.filters=e.slice(),this.connect()):this.filters=e.slice(),this}setDetune(e){return this.detune=e,this.isPlaying===!0&&this.source.detune!==void 0&&this.source.detune.setTargetAtTime(this.detune,this.context.currentTime,.01),this}getDetune(){return this.detune}getFilter(){return this.getFilters()[0]}setFilter(e){return this.setFilters(e?[e]:[])}setPlaybackRate(e){if(this.hasPlaybackControl===!1){B(`Audio: this Audio has no playback control.`);return}return this.playbackRate=e,this.isPlaying===!0&&this.source.playbackRate.setTargetAtTime(this.playbackRate,this.context.currentTime,.01),this}getPlaybackRate(){return this.playbackRate}onEnded(){this.isPlaying=!1,this._progress=0}getLoop(){return this.hasPlaybackControl===!1?(B(`Audio: this Audio has no playback control.`),!1):this.loop}setLoop(e){if(this.hasPlaybackControl===!1){B(`Audio: this Audio has no playback control.`);return}return this.loop=e,this.isPlaying===!0&&(this.source.loop=this.loop),this}setLoopStart(e){return this.loopStart=e,this}setLoopEnd(e){return this.loopEnd=e,this}getVolume(){return this.gain.gain.value}setVolume(e){return this.gain.gain.setTargetAtTime(e,this.context.currentTime,.01),this}copy(e,t){return super.copy(e,t),e.sourceType===`buffer`?(this.autoplay=e.autoplay,this.buffer=e.buffer,this.detune=e.detune,this.loop=e.loop,this.loopStart=e.loopStart,this.loopEnd=e.loopEnd,this.offset=e.offset,this.duration=e.duration,this.playbackRate=e.playbackRate,this.hasPlaybackControl=e.hasPlaybackControl,this.sourceType=e.sourceType,this.filters=e.filters.slice(),this):(B(`Audio: Audio source type cannot be copied.`),this)}clone(e){return new this.constructor(this.listener).copy(this,e)}},xs=class{constructor(e,t,n){this.binding=e,this.valueSize=n;let r,i,a;switch(t){case`quaternion`:r=this._slerp,i=this._slerpAdditive,a=this._setAdditiveIdentityQuaternion,this.buffer=new Float64Array(n*6),this._workIndex=5;break;case`string`:case`bool`:r=this._select,i=this._select,a=this._setAdditiveIdentityOther,this.buffer=Array(n*5);break;default:r=this._lerp,i=this._lerpAdditive,a=this._setAdditiveIdentityNumeric,this.buffer=new Float64Array(n*5)}this._mixBufferRegion=r,this._mixBufferRegionAdditive=i,this._setIdentity=a,this._origIndex=3,this._addIndex=4,this.cumulativeWeight=0,this.cumulativeWeightAdditive=0,this.useCount=0,this.referenceCount=0}accumulate(e,t){let n=this.buffer,r=this.valueSize,i=e*r+r,a=this.cumulativeWeight;if(a===0){for(let e=0;e!==r;++e)n[i+e]=n[e];a=t}else{a+=t;let e=t/a;this._mixBufferRegion(n,i,0,e,r)}this.cumulativeWeight=a}accumulateAdditive(e){let t=this.buffer,n=this.valueSize,r=n*this._addIndex;this.cumulativeWeightAdditive===0&&this._setIdentity(),this._mixBufferRegionAdditive(t,r,0,e,n),this.cumulativeWeightAdditive+=e}apply(e){let t=this.valueSize,n=this.buffer,r=e*t+t,i=this.cumulativeWeight,a=this.cumulativeWeightAdditive,o=this.binding;if(this.cumulativeWeight=0,this.cumulativeWeightAdditive=0,i<1){let e=t*this._origIndex;this._mixBufferRegion(n,r,e,1-i,t)}a>0&&this._mixBufferRegionAdditive(n,r,this._addIndex*t,1,t);for(let e=t,i=t+t;e!==i;++e)if(n[e]!==n[e+t]){o.setValue(n,r);break}}saveOriginalState(){let e=this.binding,t=this.buffer,n=this.valueSize,r=n*this._origIndex;e.getValue(t,r);for(let e=n,i=r;e!==i;++e)t[e]=t[r+e%n];this._setIdentity(),this.cumulativeWeight=0,this.cumulativeWeightAdditive=0}restoreOriginalState(){let e=this.valueSize*3;this.binding.setValue(this.buffer,e)}_setAdditiveIdentityNumeric(){let e=this._addIndex*this.valueSize,t=e+this.valueSize;for(let n=e;n<t;n++)this.buffer[n]=0}_setAdditiveIdentityQuaternion(){this._setAdditiveIdentityNumeric(),this.buffer[this._addIndex*this.valueSize+3]=1}_setAdditiveIdentityOther(){let e=this._origIndex*this.valueSize,t=this._addIndex*this.valueSize;for(let n=0;n<this.valueSize;n++)this.buffer[t+n]=this.buffer[e+n]}_select(e,t,n,r,i){if(r>=.5)for(let r=0;r!==i;++r)e[t+r]=e[n+r]}_slerp(e,t,n,r){Rt.slerpFlat(e,t,e,t,e,n,r)}_slerpAdditive(e,t,n,r,i){let a=this._workIndex*i;Rt.multiplyQuaternionsFlat(e,a,e,t,e,n),Rt.slerpFlat(e,t,e,t,e,a,r)}_lerp(e,t,n,r,i){let a=1-r;for(let o=0;o!==i;++o){let i=t+o;e[i]=e[i]*a+e[n+o]*r}}_lerpAdditive(e,t,n,r,i){for(let a=0;a!==i;++a){let i=t+a;e[i]=e[i]+e[n+a]*r}}},Ss=`\\[\\]\\.:\\/`,Cs=RegExp(`[\\[\\]\\.:\\/]`,`g`),ws=`[^\\[\\]\\.:\\/]`,Ts=`[^`+Ss.replace(`\\.`,``)+`]`,Es=`((?:WC+[\\/:])*)`.replace(`WC`,ws),Ds=`(WCOD+)?`.replace(`WCOD`,Ts),Os=`(?:\\.(WC+)(?:\\[(.+)\\])?)?`.replace(`WC`,ws),ks=`\\.(WC+)(?:\\[(.+)\\])?`.replace(`WC`,ws),As=RegExp(`^`+Es+Ds+Os+ks+`$`),js=[`material`,`materials`,`bones`,`map`],Ms=class{constructor(e,t,n){let r=n||Ns.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,r)}getValue(e,t){this.bind();let n=this._targetGroup.nCachedObjects_,r=this._bindings[n];r!==void 0&&r.getValue(e,t)}setValue(e,t){let n=this._bindings;for(let r=this._targetGroup.nCachedObjects_,i=n.length;r!==i;++r)n[r].setValue(e,t)}bind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}},Ns=class e{constructor(t,n,r){this.path=n,this.parsedPath=r||e.parseTrackName(n),this.node=e.findNode(t,this.parsedPath.nodeName),this.rootNode=t,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(t,n,r){return t&&t.isAnimationObjectGroup?new e.Composite(t,n,r):new e(t,n,r)}static sanitizeNodeName(e){return e.replace(/\s/g,`_`).replace(Cs,``)}static parseTrackName(e){let t=As.exec(e);if(t===null)throw Error(`THREE.PropertyBinding: Cannot parse trackName: `+e);let n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},r=n.nodeName&&n.nodeName.lastIndexOf(`.`);if(r!==void 0&&r!==-1){let e=n.nodeName.substring(r+1);js.indexOf(e)!==-1&&(n.nodeName=n.nodeName.substring(0,r),n.objectName=e)}if(n.propertyName===null||n.propertyName.length===0)throw Error(`THREE.PropertyBinding: can not parse propertyName from trackName: `+e);return n}static findNode(e,t){if(t===void 0||t===``||t===`.`||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){let n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){let n=function(e){for(let r=0;r<e.length;r++){let i=e[r];if(i.name===t||i.uuid===t)return i;let a=n(i.children);if(a)return a}return null},r=n(e.children);if(r)return r}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)e[t++]=n[r]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)n[r]=e[t++]}_setValue_array_setNeedsUpdate(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)n[r]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)n[r]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let t=this.node,n=this.parsedPath,r=n.objectName,i=n.propertyName,a=n.propertyIndex;if(t||(t=e.findNode(this.rootNode,n.nodeName),this.node=t),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!t){B(`PropertyBinding: No target node found for track: `+this.path+`.`);return}if(r){let e=n.objectIndex;switch(r){case`materials`:if(!t.material){V(`PropertyBinding: Can not bind to material as node does not have a material.`,this);return}if(!t.material.materials){V(`PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.`,this);return}t=t.material.materials;break;case`bones`:if(!t.skeleton){V(`PropertyBinding: Can not bind to bones as node does not have a skeleton.`,this);return}t=t.skeleton.bones;for(let n=0;n<t.length;n++)if(t[n].name===e){e=n;break}break;case`map`:if(`map`in t){t=t.map;break}if(!t.material){V(`PropertyBinding: Can not bind to material as node does not have a material.`,this);return}if(!t.material.map){V(`PropertyBinding: Can not bind to material.map as node.material does not have a map.`,this);return}t=t.material.map;break;default:if(t[r]===void 0){V(`PropertyBinding: Can not bind to objectName of node undefined.`,this);return}t=t[r]}if(e!==void 0){if(t[e]===void 0){V(`PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.`,this,t);return}t=t[e]}}let o=t[i];if(o===void 0){let e=n.nodeName;V(`PropertyBinding: Trying to update property for track: `+e+`.`+i+` but it wasn't found.`,t);return}let s=this.Versioning.None;this.targetObject=t,t.isMaterial===!0?s=this.Versioning.NeedsUpdate:t.isObject3D===!0&&(s=this.Versioning.MatrixWorldNeedsUpdate);let c=this.BindingType.Direct;if(a!==void 0){if(i===`morphTargetInfluences`){if(!t.geometry){V(`PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.`,this);return}if(!t.geometry.morphAttributes){V(`PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.`,this);return}t.morphTargetDictionary[a]!==void 0&&(a=t.morphTargetDictionary[a])}c=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=a}else o.fromArray!==void 0&&o.toArray!==void 0?(c=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(c=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=i;this.getValue=this.GetterByBindingType[c],this.setValue=this.SetterByBindingTypeAndVersioning[c][s]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};Ns.Composite=Ms,Ns.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3},Ns.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2},Ns.prototype.GetterByBindingType=[Ns.prototype._getValue_direct,Ns.prototype._getValue_array,Ns.prototype._getValue_arrayElement,Ns.prototype._getValue_toArray],Ns.prototype.SetterByBindingTypeAndVersioning=[[Ns.prototype._setValue_direct,Ns.prototype._setValue_direct_setNeedsUpdate,Ns.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[Ns.prototype._setValue_array,Ns.prototype._setValue_array_setNeedsUpdate,Ns.prototype._setValue_array_setMatrixWorldNeedsUpdate],[Ns.prototype._setValue_arrayElement,Ns.prototype._setValue_arrayElement_setNeedsUpdate,Ns.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[Ns.prototype._setValue_fromArray,Ns.prototype._setValue_fromArray_setNeedsUpdate,Ns.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var Ps=class{constructor(e,t,n=null,r=t.blendMode){this._mixer=e,this._clip=t,this._localRoot=n,this.blendMode=r;let i=t.tracks,a=i.length,o=Array(a),s={endingStart:ze,endingEnd:ze};for(let e=0;e!==a;++e){let t=i[e].createInterpolant(null);o[e]=t,t.settings=s}this._interpolantSettings=s,this._interpolants=o,this._propertyBindings=Array(a),this._cacheIndex=null,this._byClipCacheIndex=null,this._timeScaleInterpolant=null,this._restoreTimeScale=null,this._weightInterpolant=null,this.loop=L,this._loopCount=-1,this._startTime=null,this.time=0,this.timeScale=1,this._effectiveTimeScale=1,this.weight=1,this._effectiveWeight=1,this.repetitions=1/0,this.paused=!1,this.enabled=!0,this.clampWhenFinished=!1,this.zeroSlopeAtStart=!0,this.zeroSlopeAtEnd=!0}play(){return this._mixer._activateAction(this),this}stop(){return this._mixer._deactivateAction(this),this.reset()}reset(){return this.paused=!1,this.enabled=!0,this.time=0,this._loopCount=-1,this._startTime=null,this.stopFading().stopWarping()}isRunning(){return this.enabled&&!this.paused&&this.timeScale!==0&&this._startTime===null&&this._mixer._isActiveAction(this)}isScheduled(){return this._mixer._isActiveAction(this)}startAt(e){return this._startTime=e,this}setLoop(e,t){return this.loop=e,this.repetitions=t,this}setEffectiveWeight(e){return this.weight=e,this._effectiveWeight=this.enabled?e:0,this.stopFading()}getEffectiveWeight(){return this._effectiveWeight}fadeIn(e){return this._scheduleFading(e,0,1)}fadeOut(e){return this._scheduleFading(e,1,0)}crossFadeFrom(e,t,n=!1){if(e.fadeOut(t),this.fadeIn(t),n===!0){let n=this._clip.duration,r=e._clip.duration,i=r/n,a=n/r;e._restoreTimeScale=e.timeScale,this._restoreTimeScale=this.timeScale,e.warp(1,i,t),this.warp(a,1,t)}return this}crossFadeTo(e,t,n=!1){return e.crossFadeFrom(this,t,n)}stopFading(){let e=this._weightInterpolant;return e!==null&&(this._weightInterpolant=null,this._mixer._takeBackControlInterpolant(e)),this}setEffectiveTimeScale(e){return this.timeScale=e,this._effectiveTimeScale=this.paused?0:e,this.stopWarping()}getEffectiveTimeScale(){return this._effectiveTimeScale}setDuration(e){return this.timeScale=this._clip.duration/e,this.stopWarping()}syncWith(e){return this.time=e.time,this.timeScale=e.timeScale,this.stopWarping()}halt(e){return this.warp(this._effectiveTimeScale,0,e)}warp(e,t,n){let r=this._mixer,i=r.time,a=this.timeScale,o=this._timeScaleInterpolant;o===null&&(o=r._lendControlInterpolant(),this._timeScaleInterpolant=o);let s=o.parameterPositions,c=o.sampleValues;return s[0]=i,s[1]=i+n,c[0]=e/a,c[1]=t/a,this}stopWarping(){let e=this._timeScaleInterpolant;return e!==null&&(this._timeScaleInterpolant=null,this._mixer._takeBackControlInterpolant(e)),this._restoreTimeScale=null,this}getMixer(){return this._mixer}getClip(){return this._clip}getRoot(){return this._localRoot||this._mixer._root}_update(e,t,n,r){if(!this.enabled){this._updateWeight(e);return}let i=this._startTime;if(i!==null){let r=(e-i)*n;r<0||n===0?t=0:(this._startTime=null,t=n*r)}t*=this._updateTimeScale(e);let a=this._updateTime(t),o=this._updateWeight(e);if(o>0){let e=this._interpolants,t=this._propertyBindings;switch(this.blendMode){case Ue:for(let n=0,r=e.length;n!==r;++n)e[n].evaluate(a),t[n].accumulateAdditive(o);break;case He:default:for(let n=0,i=e.length;n!==i;++n)e[n].evaluate(a),t[n].accumulate(r,o)}}}_updateWeight(e){let t=0;if(this.enabled){t=this.weight;let n=this._weightInterpolant;if(n!==null){let r=n.evaluate(e)[0];t*=r,e>n.parameterPositions[1]&&(this.stopFading(),r===0&&(this.enabled=!1))}}return this._effectiveWeight=t,t}_updateTimeScale(e){let t=0;if(!this.paused){t=this.timeScale;let n=this._timeScaleInterpolant;if(n!==null){let r=n.evaluate(e)[0];t*=r,e>n.parameterPositions[1]&&(t===0?this.paused=!0:(this._restoreTimeScale!==null&&(t=this._restoreTimeScale),this.timeScale=t),this.stopWarping())}}return this._effectiveTimeScale=t,t}_updateTime(e){let t=this._clip.duration,n=this.loop,r=this.time+e,i=this._loopCount,a=n===Ie;if(e===0)return i===-1?r:a&&(i&1)==1?t-r:r;if(n===2200){i===-1&&(this._loopCount=0,this._setEndings(!0,!0,!1));handle_stop:{if(r>=t)r=t;else if(r<0)r=0;else{this.time=r;break handle_stop}this.clampWhenFinished?this.paused=!0:this.enabled=!1,this.time=r,this._mixer.dispatchEvent({type:`finished`,action:this,direction:e<0?-1:1})}}else{if(i===-1&&(e>=0?(i=0,this._setEndings(!0,this.repetitions===0,a)):this._setEndings(this.repetitions===0,!0,a)),r>=t||r<0){let n=Math.floor(r/t);r-=t*n,i+=Math.abs(n);let o=this.repetitions-i;if(o<=0)this.clampWhenFinished?this.paused=!0:this.enabled=!1,r=e>0?t:0,this.time=r,this._mixer.dispatchEvent({type:`finished`,action:this,direction:e>0?1:-1});else{if(o===1){let t=e<0;this._setEndings(t,!t,a)}else this._setEndings(!1,!1,a);this._loopCount=i,this.time=r,this._mixer.dispatchEvent({type:`loop`,action:this,loopDelta:n})}}else this._loopCount=i,this.time=r;if(a&&(i&1)==1)return t-r}return r}_setEndings(e,t,n){let r=this._interpolantSettings;n?(r.endingStart=Be,r.endingEnd=Be):(r.endingStart=e?this.zeroSlopeAtStart?Be:ze:Ve,r.endingEnd=t?this.zeroSlopeAtEnd?Be:ze:Ve)}_scheduleFading(e,t,n){let r=this._mixer,i=r.time,a=this._weightInterpolant;a===null&&(a=r._lendControlInterpolant(),this._weightInterpolant=a);let o=a.parameterPositions,s=a.sampleValues;return o[0]=i,s[0]=t,o[1]=i+e,s[1]=n,this}},Fs=new Float32Array(1),Is=class extends ut{constructor(e){super(),this._root=e,this._initMemoryManager(),this._accuIndex=0,this.time=0,this.timeScale=1,typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`observe`,{detail:this}))}_bindAction(e,t){let n=e._localRoot||this._root,r=e._clip.tracks,i=r.length,a=e._propertyBindings,o=e._interpolants,s=n.uuid,c=this._bindingsByRootAndName,l=c[s];l===void 0&&(l={},c[s]=l);for(let e=0;e!==i;++e){let i=r[e],c=i.name,u=l[c];if(u!==void 0)++u.referenceCount,a[e]=u;else{if(u=a[e],u!==void 0){u._cacheIndex===null&&(++u.referenceCount,this._addInactiveBinding(u,s,c));continue}let r=t&&t._propertyBindings[e].binding.parsedPath;u=new xs(Ns.create(n,c,r),i.ValueTypeName,i.getValueSize()),++u.referenceCount,this._addInactiveBinding(u,s,c),a[e]=u}o[e].resultBuffer=u.buffer}}_activateAction(e){if(!this._isActiveAction(e)){if(e._cacheIndex===null){let t=(e._localRoot||this._root).uuid,n=e._clip.uuid,r=this._actionsByClip[n];this._bindAction(e,r&&r.knownActions[0]),this._addInactiveAction(e,n,t)}let t=e._propertyBindings;for(let e=0,n=t.length;e!==n;++e){let n=t[e];n.useCount++===0&&(this._lendBinding(n),n.saveOriginalState())}this._lendAction(e)}}_deactivateAction(e){if(this._isActiveAction(e)){let t=e._propertyBindings;for(let e=0,n=t.length;e!==n;++e){let n=t[e];--n.useCount===0&&(n.restoreOriginalState(),this._takeBackBinding(n))}this._takeBackAction(e)}}_initMemoryManager(){this._actions=[],this._nActiveActions=0,this._actionsByClip={},this._bindings=[],this._nActiveBindings=0,this._bindingsByRootAndName={},this._controlInterpolants=[],this._nActiveControlInterpolants=0;let e=this;this.stats={actions:{get total(){return e._actions.length},get inUse(){return e._nActiveActions}},bindings:{get total(){return e._bindings.length},get inUse(){return e._nActiveBindings}},controlInterpolants:{get total(){return e._controlInterpolants.length},get inUse(){return e._nActiveControlInterpolants}}}}_isActiveAction(e){let t=e._cacheIndex;return t!==null&&t<this._nActiveActions}_addInactiveAction(e,t,n){let r=this._actions,i=this._actionsByClip,a=i[t];if(a===void 0)a={knownActions:[e],actionByRoot:{}},e._byClipCacheIndex=0,i[t]=a;else{let t=a.knownActions;e._byClipCacheIndex=t.length,t.push(e)}e._cacheIndex=r.length,r.push(e),a.actionByRoot[n]=e}_removeInactiveAction(e){let t=this._actions,n=t[t.length-1],r=e._cacheIndex;n._cacheIndex=r,t[r]=n,t.pop(),e._cacheIndex=null;let i=e._clip.uuid,a=this._actionsByClip,o=a[i],s=o.knownActions,c=s[s.length-1],l=e._byClipCacheIndex;c._byClipCacheIndex=l,s[l]=c,s.pop(),e._byClipCacheIndex=null;let u=o.actionByRoot,d=(e._localRoot||this._root).uuid;delete u[d],s.length===0&&delete a[i],this._removeInactiveBindingsForAction(e)}_removeInactiveBindingsForAction(e){let t=e._propertyBindings;for(let e=0,n=t.length;e!==n;++e){let n=t[e];--n.referenceCount===0&&this._removeInactiveBinding(n)}}_lendAction(e){let t=this._actions,n=e._cacheIndex,r=this._nActiveActions++,i=t[r];e._cacheIndex=r,t[r]=e,i._cacheIndex=n,t[n]=i}_takeBackAction(e){let t=this._actions,n=e._cacheIndex,r=--this._nActiveActions,i=t[r];e._cacheIndex=r,t[r]=e,i._cacheIndex=n,t[n]=i}_addInactiveBinding(e,t,n){let r=this._bindingsByRootAndName,i=this._bindings,a=r[t];a===void 0&&(a={},r[t]=a),a[n]=e,e._cacheIndex=i.length,i.push(e)}_removeInactiveBinding(e){let t=this._bindings,n=e.binding,r=n.rootNode.uuid,i=n.path,a=this._bindingsByRootAndName,o=a[r],s=t[t.length-1],c=e._cacheIndex;s._cacheIndex=c,t[c]=s,t.pop(),delete o[i],Object.keys(o).length===0&&delete a[r]}_lendBinding(e){let t=this._bindings,n=e._cacheIndex,r=this._nActiveBindings++,i=t[r];e._cacheIndex=r,t[r]=e,i._cacheIndex=n,t[n]=i}_takeBackBinding(e){let t=this._bindings,n=e._cacheIndex,r=--this._nActiveBindings,i=t[r];e._cacheIndex=r,t[r]=e,i._cacheIndex=n,t[n]=i}_lendControlInterpolant(){let e=this._controlInterpolants,t=this._nActiveControlInterpolants++,n=e[t];return n===void 0&&(n=new lo(new Float32Array(2),new Float32Array(2),1,Fs),n.__cacheIndex=t,e[t]=n),n}_takeBackControlInterpolant(e){let t=this._controlInterpolants,n=e.__cacheIndex,r=--this._nActiveControlInterpolants,i=t[r];e.__cacheIndex=r,t[r]=e,i.__cacheIndex=n,t[n]=i}clipAction(e,t,n){let r=t||this._root,i=r.uuid,a=typeof e==`string`?xo.findByName(r,e):e,o=a===null?e:a.uuid,s=this._actionsByClip[o],c=null;if(n===void 0&&(n=a===null?He:a.blendMode),s!==void 0){let e=s.actionByRoot[i];if(e!==void 0&&e.blendMode===n)return e;c=s.knownActions[0],a===null&&(a=c._clip)}if(a===null)return null;let l=new Ps(this,a,t,n);return this._bindAction(l,c),this._addInactiveAction(l,o,i),l}existingAction(e,t){let n=t||this._root,r=n.uuid,i=typeof e==`string`?xo.findByName(n,e):e,a=i?i.uuid:e,o=this._actionsByClip[a];return o===void 0?null:o.actionByRoot[r]||null}stopAllAction(){let e=this._actions,t=this._nActiveActions;for(let n=t-1;n>=0;--n)e[n].stop();return this}update(e){e*=this.timeScale;let t=this._actions,n=this._nActiveActions,r=this.time+=e,i=Math.sign(e),a=this._accuIndex^=1;for(let o=0;o!==n;++o)t[o]._update(r,e,i,a);let o=this._bindings,s=this._nActiveBindings;for(let e=0;e!==s;++e)o[e].apply(a);return this}setTime(e){this.time=0;for(let e=0;e<this._actions.length;e++)this._actions[e].time=0;return this.update(e)}getRoot(){return this._root}uncacheClip(e){let t=this._actions,n=e.uuid,r=this._actionsByClip,i=r[n];if(i!==void 0){let e=i.knownActions;for(let n=0,r=e.length;n!==r;++n){let r=e[n];this._deactivateAction(r);let i=r._cacheIndex,a=t[t.length-1];r._cacheIndex=null,r._byClipCacheIndex=null,a._cacheIndex=i,t[i]=a,t.pop(),this._removeInactiveBindingsForAction(r)}delete r[n]}}uncacheRoot(e){let t=e.uuid,n=this._actionsByClip;for(let e in n){let r=n[e].actionByRoot[t];r!==void 0&&(this._deactivateAction(r),this._removeInactiveAction(r))}let r=this._bindingsByRootAndName[t];if(r!==void 0)for(let e in r){let t=r[e];t.restoreOriginalState(),this._removeInactiveBinding(t)}}uncacheAction(e,t){let n=this.existingAction(e,t);n!==null&&(this._deactivateAction(n),this._removeInactiveAction(n))}},Ls=new ln,Rs=class{constructor(e,t,n=0,r=1/0){this.ray=new hi(e,t),this.near=n,this.far=r,this.camera=null,this.layers=new bn,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,t){this.ray.set(e,t)}setFromCamera(e,t){t.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(t).sub(this.ray.origin).normalize(),this.camera=t):t.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,t.projectionMatrix.elements[14]).unproject(t),this.ray.direction.set(0,0,-1).transformDirection(t.matrixWorld),this.camera=t):V(`Raycaster: Unsupported camera type: `+t.type)}setFromXRController(e){return Ls.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(Ls),this}intersectObject(e,t=!0,n=[]){return Bs(e,this,n,t),n.sort(zs),n}intersectObjects(e,t=!0,n=[]){for(let r=0,i=e.length;r<i;r++)Bs(e[r],this,n,t);return n.sort(zs),n}};function zs(e,t){return e.distance-t.distance}function Bs(e,t,n,r){let i=!0;if(e.layers.test(t.layers)&&e.raycast(t,n)===!1&&(i=!1),i===!0&&r===!0){let r=e.children;for(let e=0,i=r.length;e<i;e++)Bs(r[e],t,n,!0)}}var Vs=class{constructor(e=!0){this.autoStart=e,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1,B(`Clock: This module has been deprecated. Please use THREE.Timer instead.`)}start(){this.startTime=performance.now(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let e=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){let t=performance.now();e=(t-this.oldTime)/1e3,this.oldTime=t,this.elapsedTime+=e}return e}},Hs=class e{static{e.prototype.isMatrix2=!0}constructor(e,t,n,r){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,n,r)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let n=0;n<4;n++)this.elements[n]=e[n+t];return this}set(e,t,n,r){let i=this.elements;return i[0]=e,i[2]=t,i[1]=n,i[3]=r,this}};function Us(e,t,n,r){let i=Ws(r);switch(n){case E:return e*t;case j:return e*t/i.components*i.byteLength;case M:return e*t/i.components*i.byteLength;case N:return e*t*2/i.components*i.byteLength;case ee:return e*t*2/i.components*i.byteLength;case D:return e*t*3/i.components*i.byteLength;case O:return e*t*4/i.components*i.byteLength;case te:return e*t*4/i.components*i.byteLength;case P:case ne:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*8;case re:case ie:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case oe:case ce:return Math.max(e,16)*Math.max(t,8)/4;case ae:case se:return Math.max(e,8)*Math.max(t,8)/2;case F:case le:case de:case fe:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*8;case ue:case pe:case me:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case he:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case ge:return Math.floor((e+4)/5)*Math.floor((t+3)/4)*16;case _e:return Math.floor((e+4)/5)*Math.floor((t+4)/5)*16;case ve:return Math.floor((e+5)/6)*Math.floor((t+4)/5)*16;case ye:return Math.floor((e+5)/6)*Math.floor((t+5)/6)*16;case be:return Math.floor((e+7)/8)*Math.floor((t+4)/5)*16;case xe:return Math.floor((e+7)/8)*Math.floor((t+5)/6)*16;case Se:return Math.floor((e+7)/8)*Math.floor((t+7)/8)*16;case Ce:return Math.floor((e+9)/10)*Math.floor((t+4)/5)*16;case we:return Math.floor((e+9)/10)*Math.floor((t+5)/6)*16;case Te:return Math.floor((e+9)/10)*Math.floor((t+7)/8)*16;case Ee:return Math.floor((e+9)/10)*Math.floor((t+9)/10)*16;case De:return Math.floor((e+11)/12)*Math.floor((t+9)/10)*16;case Oe:return Math.floor((e+11)/12)*Math.floor((t+11)/12)*16;case ke:case Ae:case je:return Math.ceil(e/4)*Math.ceil(t/4)*16;case Me:case I:return Math.ceil(e/4)*Math.ceil(t/4)*8;case Ne:case Pe:return Math.ceil(e/4)*Math.ceil(t/4)*16}throw Error(`Unable to determine texture byte length for ${n} format.`)}function Ws(e){switch(e){case p:case m:return{byteLength:1,components:1};case g:case h:case b:return{byteLength:2,components:1};case x:case S:return{byteLength:2,components:4};case v:case _:case y:return{byteLength:4,components:1};case w:case T:return{byteLength:4,components:3}}throw Error(`THREE.TextureUtils: Unknown texture type ${e}.`)}typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`register`,{detail:{revision:`185`}})),typeof window<`u`&&(window.__THREE__?B(`WARNING: Multiple instances of Three.js being imported.`):window.__THREE__=`185`);function Gs(){let e=null,t=!1,n=null,r=null;function i(t,a){n(t,a),r=e.requestAnimationFrame(i)}return{start:function(){t!==!0&&n!==null&&e!==null&&(r=e.requestAnimationFrame(i),t=!0)},stop:function(){e!==null&&e.cancelAnimationFrame(r),t=!1},setAnimationLoop:function(e){n=e},setContext:function(t){e=t}}}function Ks(e){let t=new WeakMap;function n(t,n){let r=t.array,i=t.usage,a=r.byteLength,o=e.createBuffer();e.bindBuffer(n,o),e.bufferData(n,r,i),t.onUploadCallback();let s;if(r instanceof Float32Array)s=e.FLOAT;else if(typeof Float16Array<`u`&&r instanceof Float16Array)s=e.HALF_FLOAT;else if(r instanceof Uint16Array)s=t.isFloat16BufferAttribute?e.HALF_FLOAT:e.UNSIGNED_SHORT;else if(r instanceof Int16Array)s=e.SHORT;else if(r instanceof Uint32Array)s=e.UNSIGNED_INT;else if(r instanceof Int32Array)s=e.INT;else if(r instanceof Int8Array)s=e.BYTE;else if(r instanceof Uint8Array)s=e.UNSIGNED_BYTE;else if(r instanceof Uint8ClampedArray)s=e.UNSIGNED_BYTE;else throw Error(`THREE.WebGLAttributes: Unsupported buffer data format: `+r);return{buffer:o,type:s,bytesPerElement:r.BYTES_PER_ELEMENT,version:t.version,size:a}}function r(t,n,r){let i=n.array,a=n.updateRanges;if(e.bindBuffer(r,t),a.length===0)e.bufferSubData(r,0,i);else{a.sort((e,t)=>e.start-t.start);let t=0;for(let e=1;e<a.length;e++){let n=a[t],r=a[e];r.start<=n.start+n.count+1?n.count=Math.max(n.count,r.start+r.count-n.start):(++t,a[t]=r)}a.length=t+1;for(let t=0,n=a.length;t<n;t++){let n=a[t];e.bufferSubData(r,n.start*i.BYTES_PER_ELEMENT,i,n.start,n.count)}n.clearUpdateRanges()}n.onUploadCallback()}function i(e){return e.isInterleavedBufferAttribute&&(e=e.data),t.get(e)}function a(n){n.isInterleavedBufferAttribute&&(n=n.data);let r=t.get(n);r&&(e.deleteBuffer(r.buffer),t.delete(n))}function o(e,i){if(e.isInterleavedBufferAttribute&&(e=e.data),e.isGLBufferAttribute){let n=t.get(e);(!n||n.version<e.version)&&t.set(e,{buffer:e.buffer,type:e.type,bytesPerElement:e.elementSize,version:e.version});return}let a=t.get(e);if(a===void 0)t.set(e,n(e,i));else if(a.version<e.version){if(a.size!==e.array.byteLength)throw Error(`THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.`);r(a.buffer,e,i),a.version=e.version}}return{get:i,remove:a,update:o}}var q={alphahash_fragment:`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,alphahash_pars_fragment:`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,alphamap_fragment:`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,alphamap_pars_fragment:`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,alphatest_fragment:`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,alphatest_pars_fragment:`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,aomap_fragment:`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,aomap_pars_fragment:`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,batching_pars_vertex:`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,batching_vertex:`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,begin_vertex:`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,beginnormal_vertex:`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,bsdfs:`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,iridescence_fragment:`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,bumpmap_pars_fragment:`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,clipping_planes_fragment:`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,clipping_planes_pars_fragment:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,clipping_planes_pars_vertex:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,clipping_planes_vertex:`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,color_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,color_pars_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,color_pars_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,color_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,common:`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,cube_uv_reflection_fragment:`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,defaultnormal_vertex:`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,displacementmap_pars_vertex:`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,displacementmap_vertex:`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,emissivemap_fragment:`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,emissivemap_pars_fragment:`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,colorspace_fragment:`gl_FragColor = linearToOutputTexel( gl_FragColor );`,colorspace_pars_fragment:`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,envmap_fragment:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,envmap_common_pars_fragment:`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,envmap_pars_fragment:`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,envmap_pars_vertex:`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,envmap_physical_pars_fragment:`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,envmap_vertex:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,fog_vertex:`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,fog_pars_vertex:`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,fog_fragment:`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,fog_pars_fragment:`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,gradientmap_pars_fragment:`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,lightmap_pars_fragment:`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,lights_lambert_fragment:`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,lights_lambert_pars_fragment:`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,lights_pars_begin:`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,lights_toon_fragment:`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,lights_toon_pars_fragment:`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,lights_phong_fragment:`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,lights_phong_pars_fragment:`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,lights_physical_fragment:`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,lights_physical_pars_fragment:`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
		vec3 iridescenceFresnelDielectric;
		vec3 iridescenceFresnelMetallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
vec3 BRDF_GGX_Multiscatter( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 singleScatter = BRDF_GGX( lightDir, viewDir, normal, material );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 dfgV = texture2D( dfgLUT, vec2( material.roughness, dotNV ) ).rg;
	vec2 dfgL = texture2D( dfgLUT, vec2( material.roughness, dotNL ) ).rg;
	vec3 FssEss_V = material.specularColorBlended * dfgV.x + material.specularF90 * dfgV.y;
	vec3 FssEss_L = material.specularColorBlended * dfgL.x + material.specularF90 * dfgL.y;
	float Ess_V = dfgV.x + dfgV.y;
	float Ess_L = dfgL.x + dfgL.y;
	float Ems_V = 1.0 - Ess_V;
	float Ems_L = 1.0 - Ess_L;
	vec3 Favg = material.specularColorBlended + ( 1.0 - material.specularColorBlended ) * 0.047619;
	vec3 Fms = FssEss_V * FssEss_L * Favg / ( 1.0 - Ems_V * Ems_L * Favg + EPSILON );
	float compensationFactor = Ems_V * Ems_L;
	vec3 multiScatter = Fms * compensationFactor;
	return singleScatter + multiScatter;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX_Multiscatter( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnelDielectric, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceFresnelMetallic, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,lights_fragment_begin:`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( material.iridescenceFresnelDielectric, material.iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,lights_fragment_maps:`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,lights_fragment_end:`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,lightprobes_pars_fragment:`#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,logdepthbuf_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,logdepthbuf_pars_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_pars_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,map_fragment:`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,map_pars_fragment:`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,map_particle_fragment:`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,map_particle_pars_fragment:`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,metalnessmap_fragment:`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,metalnessmap_pars_fragment:`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,morphinstance_vertex:`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,morphcolor_vertex:`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,morphnormal_vertex:`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,morphtarget_pars_vertex:`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,morphtarget_vertex:`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,normal_fragment_begin:`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,normal_fragment_maps:`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,normal_pars_fragment:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_pars_vertex:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_vertex:`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,normalmap_pars_fragment:`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,clearcoat_normal_fragment_begin:`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,clearcoat_normal_fragment_maps:`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,clearcoat_pars_fragment:`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,iridescence_pars_fragment:`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,opaque_fragment:`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,packing:`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,premultiplied_alpha_fragment:`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,project_vertex:`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,dithering_fragment:`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,dithering_pars_fragment:`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,roughnessmap_fragment:`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,roughnessmap_pars_fragment:`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,shadowmap_pars_fragment:`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,shadowmap_pars_vertex:`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,shadowmap_vertex:`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,shadowmask_pars_fragment:`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,skinbase_vertex:`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,skinning_pars_vertex:`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,skinning_vertex:`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,skinnormal_vertex:`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,specularmap_fragment:`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,specularmap_pars_fragment:`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,tonemapping_fragment:`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,tonemapping_pars_fragment:`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,transmission_fragment:`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,transmission_pars_fragment:`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,uv_pars_fragment:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_pars_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,worldpos_vertex:`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,background_vert:`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,background_frag:`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,backgroundCube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,backgroundCube_frag:`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,cube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,cube_frag:`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,depth_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,depth_frag:`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,distance_vert:`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,distance_frag:`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,equirect_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,equirect_frag:`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,linedashed_vert:`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,linedashed_frag:`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,meshbasic_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,meshbasic_frag:`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshlambert_vert:`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshlambert_frag:`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshmatcap_vert:`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,meshmatcap_frag:`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshnormal_vert:`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,meshnormal_frag:`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,meshphong_vert:`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshphong_frag:`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshphysical_vert:`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,meshphysical_frag:`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshtoon_vert:`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshtoon_frag:`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,points_vert:`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,points_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,shadow_vert:`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,shadow_frag:`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,sprite_vert:`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,sprite_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`},J={common:{diffuse:{value:new G(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new W},alphaMap:{value:null},alphaMapTransform:{value:new W},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new W}},envmap:{envMap:{value:null},envMapRotation:{value:new W},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new W}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new W}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new W},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new W},normalScale:{value:new H(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new W},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new W}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new W}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new W}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new G(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new U},probesMax:{value:new U},probesResolution:{value:new U}},points:{diffuse:{value:new G(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new W},alphaTest:{value:0},uvTransform:{value:new W}},sprite:{diffuse:{value:new G(16777215)},opacity:{value:1},center:{value:new H(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new W},alphaMap:{value:null},alphaMapTransform:{value:new W},alphaTest:{value:0}}},qs={basic:{uniforms:Ua([J.common,J.specularmap,J.envmap,J.aomap,J.lightmap,J.fog]),vertexShader:q.meshbasic_vert,fragmentShader:q.meshbasic_frag},lambert:{uniforms:Ua([J.common,J.specularmap,J.envmap,J.aomap,J.lightmap,J.emissivemap,J.bumpmap,J.normalmap,J.displacementmap,J.fog,J.lights,{emissive:{value:new G(0)},envMapIntensity:{value:1}}]),vertexShader:q.meshlambert_vert,fragmentShader:q.meshlambert_frag},phong:{uniforms:Ua([J.common,J.specularmap,J.envmap,J.aomap,J.lightmap,J.emissivemap,J.bumpmap,J.normalmap,J.displacementmap,J.fog,J.lights,{emissive:{value:new G(0)},specular:{value:new G(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:q.meshphong_vert,fragmentShader:q.meshphong_frag},standard:{uniforms:Ua([J.common,J.envmap,J.aomap,J.lightmap,J.emissivemap,J.bumpmap,J.normalmap,J.displacementmap,J.roughnessmap,J.metalnessmap,J.fog,J.lights,{emissive:{value:new G(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:q.meshphysical_vert,fragmentShader:q.meshphysical_frag},toon:{uniforms:Ua([J.common,J.aomap,J.lightmap,J.emissivemap,J.bumpmap,J.normalmap,J.displacementmap,J.gradientmap,J.fog,J.lights,{emissive:{value:new G(0)}}]),vertexShader:q.meshtoon_vert,fragmentShader:q.meshtoon_frag},matcap:{uniforms:Ua([J.common,J.bumpmap,J.normalmap,J.displacementmap,J.fog,{matcap:{value:null}}]),vertexShader:q.meshmatcap_vert,fragmentShader:q.meshmatcap_frag},points:{uniforms:Ua([J.points,J.fog]),vertexShader:q.points_vert,fragmentShader:q.points_frag},dashed:{uniforms:Ua([J.common,J.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:q.linedashed_vert,fragmentShader:q.linedashed_frag},depth:{uniforms:Ua([J.common,J.displacementmap]),vertexShader:q.depth_vert,fragmentShader:q.depth_frag},normal:{uniforms:Ua([J.common,J.bumpmap,J.normalmap,J.displacementmap,{opacity:{value:1}}]),vertexShader:q.meshnormal_vert,fragmentShader:q.meshnormal_frag},sprite:{uniforms:Ua([J.sprite,J.fog]),vertexShader:q.sprite_vert,fragmentShader:q.sprite_frag},background:{uniforms:{uvTransform:{value:new W},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:q.background_vert,fragmentShader:q.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new W}},vertexShader:q.backgroundCube_vert,fragmentShader:q.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:q.cube_vert,fragmentShader:q.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:q.equirect_vert,fragmentShader:q.equirect_frag},distance:{uniforms:Ua([J.common,J.displacementmap,{referencePosition:{value:new U},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:q.distance_vert,fragmentShader:q.distance_frag},shadow:{uniforms:Ua([J.lights,J.fog,{color:{value:new G(0)},opacity:{value:1}}]),vertexShader:q.shadow_vert,fragmentShader:q.shadow_frag}};qs.physical={uniforms:Ua([qs.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new W},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new W},clearcoatNormalScale:{value:new H(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new W},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new W},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new W},sheen:{value:0},sheenColor:{value:new G(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new W},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new W},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new W},transmissionSamplerSize:{value:new H},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new W},attenuationDistance:{value:0},attenuationColor:{value:new G(0)},specularColor:{value:new G(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new W},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new W},anisotropyVector:{value:new H},anisotropyMap:{value:null},anisotropyMapTransform:{value:new W}}]),vertexShader:q.meshphysical_vert,fragmentShader:q.meshphysical_frag};var Js={r:0,b:0,g:0},Ys=new ln,Xs=new W;Xs.set(-1,0,0,0,1,0,0,0,1);function Zs(e,t,n,r,i,a){let o=new G(0),s=i===!0?0:1,c,l,u=null,d=0,f=null;function p(e){let n=e.isScene===!0?e.background:null;if(n&&n.isTexture){let r=e.backgroundBlurriness>0;n=t.get(n,r)}return n}function m(t){let r=!1,i=p(t);i===null?g(o,s):i&&i.isColor&&(g(i,1),r=!0);let c=e.xr.getEnvironmentBlendMode();c===`additive`?n.buffers.color.setClear(0,0,0,1,a):c===`alpha-blend`&&n.buffers.color.setClear(0,0,0,0,a),(e.autoClear||r)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil))}function h(t,n){let i=p(n);i&&(i.isCubeTexture||i.mapping===306)?(l===void 0&&(l=new K(new Pa(1,1,1),new Xa({name:`BackgroundCubeMaterial`,uniforms:Ha(qs.backgroundCube.uniforms),vertexShader:qs.backgroundCube.vertexShader,fragmentShader:qs.backgroundCube.fragmentShader,side:1,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute(`normal`),l.geometry.deleteAttribute(`uv`),l.onBeforeRender=function(e,t,n){this.matrixWorld.copyPosition(n.matrixWorld)},Object.defineProperty(l.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(l)),l.material.uniforms.envMap.value=i,l.material.uniforms.backgroundBlurriness.value=n.backgroundBlurriness,l.material.uniforms.backgroundIntensity.value=n.backgroundIntensity,l.material.uniforms.backgroundRotation.value.setFromMatrix4(Ys.makeRotationFromEuler(n.backgroundRotation)).transpose(),i.isCubeTexture&&i.isRenderTargetTexture===!1&&l.material.uniforms.backgroundRotation.value.premultiply(Xs),l.material.toneMapped=Gt.getTransfer(i.colorSpace)!==Je,(u!==i||d!==i.version||f!==e.toneMapping)&&(l.material.needsUpdate=!0,u=i,d=i.version,f=e.toneMapping),l.layers.enableAll(),t.unshift(l,l.geometry,l.material,0,0,null)):i&&i.isTexture&&(c===void 0&&(c=new K(new Ba(2,2),new Xa({name:`BackgroundMaterial`,uniforms:Ha(qs.background.uniforms),vertexShader:qs.background.vertexShader,fragmentShader:qs.background.fragmentShader,side:0,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute(`normal`),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(c)),c.material.uniforms.t2D.value=i,c.material.uniforms.backgroundIntensity.value=n.backgroundIntensity,c.material.toneMapped=Gt.getTransfer(i.colorSpace)!==Je,i.matrixAutoUpdate===!0&&i.updateMatrix(),c.material.uniforms.uvTransform.value.copy(i.matrix),(u!==i||d!==i.version||f!==e.toneMapping)&&(c.material.needsUpdate=!0,u=i,d=i.version,f=e.toneMapping),c.layers.enableAll(),t.unshift(c,c.geometry,c.material,0,0,null))}function g(t,r){t.getRGB(Js,Ka(e)),n.buffers.color.setClear(Js.r,Js.g,Js.b,r,a)}function _(){l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return o},setClearColor:function(e,t=1){o.set(e),s=t,g(o,s)},getClearAlpha:function(){return s},setClearAlpha:function(e){s=e,g(o,s)},render:m,addToRenderList:h,dispose:_}}function Qs(e,t){let n=e.getParameter(e.MAX_VERTEX_ATTRIBS),r={},i=f(null),a=i,o=!1;function s(n,r,i,s,c){let u=!1,f=d(n,s,i,r);a!==f&&(a=f,l(a.object)),u=p(n,s,i,c),u&&m(n,s,i,c),c!==null&&t.update(c,e.ELEMENT_ARRAY_BUFFER),(u||o)&&(o=!1,b(n,r,i,s),c!==null&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t.get(c).buffer))}function c(){return e.createVertexArray()}function l(t){return e.bindVertexArray(t)}function u(t){return e.deleteVertexArray(t)}function d(e,t,n,i){let a=i.wireframe===!0,o=r[t.id];o===void 0&&(o={},r[t.id]=o);let s=e.isInstancedMesh===!0?e.id:0,l=o[s];l===void 0&&(l={},o[s]=l);let u=l[n.id];u===void 0&&(u={},l[n.id]=u);let d=u[a];return d===void 0&&(d=f(c()),u[a]=d),d}function f(e){let t=[],r=[],i=[];for(let e=0;e<n;e++)t[e]=0,r[e]=0,i[e]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:t,enabledAttributes:r,attributeDivisors:i,object:e,attributes:{},index:null}}function p(e,t,n,r){let i=a.attributes,o=t.attributes,s=0,c=n.getAttributes();for(let t in c)if(c[t].location>=0){let n=i[t],r=o[t];if(r===void 0&&(t===`instanceMatrix`&&e.instanceMatrix&&(r=e.instanceMatrix),t===`instanceColor`&&e.instanceColor&&(r=e.instanceColor)),n===void 0||n.attribute!==r||r&&n.data!==r.data)return!0;s++}return a.attributesNum!==s||a.index!==r}function m(e,t,n,r){let i={},o=t.attributes,s=0,c=n.getAttributes();for(let t in c)if(c[t].location>=0){let n=o[t];n===void 0&&(t===`instanceMatrix`&&e.instanceMatrix&&(n=e.instanceMatrix),t===`instanceColor`&&e.instanceColor&&(n=e.instanceColor));let r={};r.attribute=n,n&&n.data&&(r.data=n.data),i[t]=r,s++}a.attributes=i,a.attributesNum=s,a.index=r}function h(){let e=a.newAttributes;for(let t=0,n=e.length;t<n;t++)e[t]=0}function g(e){_(e,0)}function _(t,n){let r=a.newAttributes,i=a.enabledAttributes,o=a.attributeDivisors;r[t]=1,i[t]===0&&(e.enableVertexAttribArray(t),i[t]=1),o[t]!==n&&(e.vertexAttribDivisor(t,n),o[t]=n)}function v(){let t=a.newAttributes,n=a.enabledAttributes;for(let r=0,i=n.length;r<i;r++)n[r]!==t[r]&&(e.disableVertexAttribArray(r),n[r]=0)}function y(t,n,r,i,a,o,s){s===!0?e.vertexAttribIPointer(t,n,r,a,o):e.vertexAttribPointer(t,n,r,i,a,o)}function b(n,r,i,a){h();let o=a.attributes,s=i.getAttributes(),c=r.defaultAttributeValues;for(let r in s){let i=s[r];if(i.location>=0){let s=o[r];if(s===void 0&&(r===`instanceMatrix`&&n.instanceMatrix&&(s=n.instanceMatrix),r===`instanceColor`&&n.instanceColor&&(s=n.instanceColor)),s!==void 0){let r=s.normalized,o=s.itemSize,c=t.get(s);if(c===void 0)continue;let l=c.buffer,u=c.type,d=c.bytesPerElement,f=u===e.INT||u===e.UNSIGNED_INT||s.gpuType===1013;if(s.isInterleavedBufferAttribute){let t=s.data,c=t.stride,p=s.offset;if(t.isInstancedInterleavedBuffer){for(let e=0;e<i.locationSize;e++)_(i.location+e,t.meshPerAttribute);n.isInstancedMesh!==!0&&a._maxInstanceCount===void 0&&(a._maxInstanceCount=t.meshPerAttribute*t.count)}else for(let e=0;e<i.locationSize;e++)g(i.location+e);e.bindBuffer(e.ARRAY_BUFFER,l);for(let e=0;e<i.locationSize;e++)y(i.location+e,o/i.locationSize,u,r,c*d,(p+o/i.locationSize*e)*d,f)}else{if(s.isInstancedBufferAttribute){for(let e=0;e<i.locationSize;e++)_(i.location+e,s.meshPerAttribute);n.isInstancedMesh!==!0&&a._maxInstanceCount===void 0&&(a._maxInstanceCount=s.meshPerAttribute*s.count)}else for(let e=0;e<i.locationSize;e++)g(i.location+e);e.bindBuffer(e.ARRAY_BUFFER,l);for(let e=0;e<i.locationSize;e++)y(i.location+e,o/i.locationSize,u,r,o*d,o/i.locationSize*e*d,f)}}else if(c!==void 0){let t=c[r];if(t!==void 0)switch(t.length){case 2:e.vertexAttrib2fv(i.location,t);break;case 3:e.vertexAttrib3fv(i.location,t);break;case 4:e.vertexAttrib4fv(i.location,t);break;default:e.vertexAttrib1fv(i.location,t)}}}}v()}function x(){T();for(let e in r){let t=r[e];for(let e in t){let n=t[e];for(let e in n){let t=n[e];for(let e in t)u(t[e].object),delete t[e];delete n[e]}}delete r[e]}}function S(e){if(r[e.id]===void 0)return;let t=r[e.id];for(let e in t){let n=t[e];for(let e in n){let t=n[e];for(let e in t)u(t[e].object),delete t[e];delete n[e]}}delete r[e.id]}function C(e){for(let t in r){let n=r[t];for(let t in n){let r=n[t];if(r[e.id]===void 0)continue;let i=r[e.id];for(let e in i)u(i[e].object),delete i[e];delete r[e.id]}}}function w(e){for(let t in r){let n=r[t],i=e.isInstancedMesh===!0?e.id:0,a=n[i];if(a!==void 0){for(let e in a){let t=a[e];for(let e in t)u(t[e].object),delete t[e];delete a[e]}delete n[i],Object.keys(n).length===0&&delete r[t]}}}function T(){E(),o=!0,a!==i&&(a=i,l(a.object))}function E(){i.geometry=null,i.program=null,i.wireframe=!1}return{setup:s,reset:T,resetDefaultState:E,dispose:x,releaseStatesOfGeometry:S,releaseStatesOfObject:w,releaseStatesOfProgram:C,initAttributes:h,enableAttribute:g,disableUnusedAttributes:v}}function $s(e,t,n){let r;function i(e){r=e}function a(t,i){e.drawArrays(r,t,i),n.update(i,r,1)}function o(t,i,a){a!==0&&(e.drawArraysInstanced(r,t,i,a),n.update(i,r,a))}function s(e,i,a){if(a===0)return;t.get(`WEBGL_multi_draw`).multiDrawArraysWEBGL(r,e,0,i,0,a);let o=0;for(let e=0;e<a;e++)o+=i[e];n.update(o,r,1)}this.setMode=i,this.render=a,this.renderInstances=o,this.renderMultiDraw=s}function ec(e,t,n,r){let i;function a(){if(i!==void 0)return i;if(t.has(`EXT_texture_filter_anisotropic`)===!0){let n=t.get(`EXT_texture_filter_anisotropic`);i=e.getParameter(n.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function o(t){return t===1023||r.convert(t)===e.getParameter(e.IMPLEMENTATION_COLOR_READ_FORMAT)}function s(n){let i=n===1016&&(t.has(`EXT_color_buffer_half_float`)||t.has(`EXT_color_buffer_float`));return!(n!==1009&&r.convert(n)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_TYPE)&&n!==1015&&!i)}function c(t){if(t===`highp`){if(e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.HIGH_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.HIGH_FLOAT).precision>0)return`highp`;t=`mediump`}return t===`mediump`&&e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.MEDIUM_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.MEDIUM_FLOAT).precision>0?`mediump`:`lowp`}let l=n.precision===void 0?`highp`:n.precision,u=c(l);u!==l&&(B(`WebGLRenderer:`,l,`not supported, using`,u,`instead.`),l=u);let d=n.logarithmicDepthBuffer===!0,f=n.reversedDepthBuffer===!0&&t.has(`EXT_clip_control`);n.reversedDepthBuffer===!0&&f===!1&&B(`WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.`);let p=e.getParameter(e.MAX_TEXTURE_IMAGE_UNITS),m=e.getParameter(e.MAX_VERTEX_TEXTURE_IMAGE_UNITS),h=e.getParameter(e.MAX_TEXTURE_SIZE),g=e.getParameter(e.MAX_CUBE_MAP_TEXTURE_SIZE),_=e.getParameter(e.MAX_VERTEX_ATTRIBS),v=e.getParameter(e.MAX_VERTEX_UNIFORM_VECTORS),y=e.getParameter(e.MAX_VARYING_VECTORS),b=e.getParameter(e.MAX_FRAGMENT_UNIFORM_VECTORS),x=e.getParameter(e.MAX_SAMPLES),S=e.getParameter(e.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:a,getMaxPrecision:c,textureFormatReadable:o,textureTypeReadable:s,precision:l,logarithmicDepthBuffer:d,reversedDepthBuffer:f,maxTextures:p,maxVertexTextures:m,maxTextureSize:h,maxCubemapSize:g,maxAttributes:_,maxVertexUniforms:v,maxVaryings:y,maxFragmentUniforms:b,maxSamples:x,samples:S}}function tc(e){let t=this,n=null,r=0,i=!1,a=!1,o=new ra,s=new W,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(e,t){let n=e.length!==0||t||r!==0||i;return i=t,r=e.length,n},this.beginShadows=function(){a=!0,u(null)},this.endShadows=function(){a=!1},this.setGlobalState=function(e,t){n=u(e,t,0)},this.setState=function(t,o,s){let d=t.clippingPlanes,f=t.clipIntersection,p=t.clipShadows,m=e.get(t);if(!i||d===null||d.length===0||a&&!p)a?u(null):l();else{let e=a?0:r,t=e*4,i=m.clippingState||null;c.value=i,i=u(d,o,t,s);for(let e=0;e!==t;++e)i[e]=n[e];m.clippingState=i,this.numIntersection=f?this.numPlanes:0,this.numPlanes+=e}};function l(){c.value!==n&&(c.value=n,c.needsUpdate=r>0),t.numPlanes=r,t.numIntersection=0}function u(e,n,r,i){let a=e===null?0:e.length,l=null;if(a!==0){if(l=c.value,i!==!0||l===null){let t=r+a*4,i=n.matrixWorldInverse;s.getNormalMatrix(i),(l===null||l.length<t)&&(l=new Float32Array(t));for(let t=0,n=r;t!==a;++t,n+=4)o.copy(e[t]).applyMatrix4(i,s),o.normal.toArray(l,n),l[n+3]=o.constant}c.value=l,c.needsUpdate=!0}return t.numPlanes=a,t.numIntersection=0,l}}var nc=4,rc=[.125,.215,.35,.446,.526,.582],ic=20,ac=256,oc=new Qo,sc=new G,cc=null,lc=0,uc=0,dc=!1,fc=new U,pc=class{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,n=.1,r=100,i={}){let{size:a=256,position:o=fc}=i;cc=this._renderer.getRenderTarget(),lc=this._renderer.getActiveCubeFace(),uc=this._renderer.getActiveMipmapLevel(),dc=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(a);let s=this._allocateTargets();return s.depthBuffer=!0,this._sceneToCubeUV(e,n,r,s,o),t>0&&this._blur(s,0,0,t),this._applyPMREM(s),this._cleanup(s),s}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=bc(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=yc(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=2**this._lodMax}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(cc,lc,uc),this._renderer.xr.enabled=dc,e.scissorTest=!1,gc(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===301||e.mapping===302?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),cc=this._renderer.getRenderTarget(),lc=this._renderer.getActiveCubeFace(),uc=this._renderer.getActiveMipmapLevel(),dc=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:l,minFilter:l,generateMipmaps:!1,type:b,format:O,colorSpace:Ke,depthBuffer:!1},r=hc(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=hc(e,t,n);let{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=mc(r)),this._blurMaterial=vc(r,e,t),this._ggxMaterial=_c(r,e,t)}return r}_compileMaterial(e){let t=new K(new Br,e);this._renderer.compile(t,oc)}_sceneToCubeUV(e,t,n,r,i){let a=new qo(90,1,t,n),o=[1,-1,1,1,1,1],s=[1,1,1,-1,-1,-1],c=this._renderer,l=c.autoClear,u=c.toneMapping;c.getClearColor(sc),c.toneMapping=0,c.autoClear=!1,c.state.buffers.depth.getReversed()&&(c.setRenderTarget(r),c.clearDepth(),c.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new K(new Pa,new gi({name:`PMREM.Background`,side:1,depthWrite:!1,depthTest:!1})));let d=this._backgroundBox,f=d.material,p=!1,m=e.background;m?m.isColor&&(f.color.copy(m),e.background=null,p=!0):(f.color.copy(sc),p=!0);for(let t=0;t<6;t++){let n=t%3;n===0?(a.up.set(0,o[t],0),a.position.set(i.x,i.y,i.z),a.lookAt(i.x+s[t],i.y,i.z)):n===1?(a.up.set(0,0,o[t]),a.position.set(i.x,i.y,i.z),a.lookAt(i.x,i.y+s[t],i.z)):(a.up.set(0,o[t],0),a.position.set(i.x,i.y,i.z),a.lookAt(i.x,i.y,i.z+s[t]));let l=this._cubeSize;gc(r,n*l,t>2?l:0,l,l),c.setRenderTarget(r),p&&c.render(d,a),c.render(e,a)}c.toneMapping=u,c.autoClear=l,e.background=m}_textureToCubeUV(e,t){let n=this._renderer,r=e.mapping===301||e.mapping===302;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=bc()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=yc());let i=r?this._cubemapMaterial:this._equirectMaterial,a=this._lodMeshes[0];a.material=i;let o=i.uniforms;o.envMap.value=e;let s=this._cubeSize;gc(t,0,0,3*s,2*s),n.setRenderTarget(t),n.render(a,oc)}_applyPMREM(e){let t=this._renderer,n=t.autoClear;t.autoClear=!1;let r=this._lodMeshes.length;for(let t=1;t<r;t++)this._applyGGXFilter(e,t-1,t);t.autoClear=n}_applyGGXFilter(e,t,n){let r=this._renderer,i=this._pingPongRenderTarget,a=this._ggxMaterial,o=this._lodMeshes[n];o.material=a;let s=a.uniforms,c=n/(this._lodMeshes.length-1),l=t/(this._lodMeshes.length-1),u=Math.sqrt(c*c-l*l)*(0+c*1.25),{_lodMax:d}=this,f=this._sizeLods[n],p=3*f*(n>d-nc?n-d+nc:0),m=4*(this._cubeSize-f);s.envMap.value=e.texture,s.roughness.value=u,s.mipInt.value=d-t,gc(i,p,m,3*f,2*f),r.setRenderTarget(i),r.render(o,oc),s.envMap.value=i.texture,s.roughness.value=0,s.mipInt.value=d-n,gc(e,p,m,3*f,2*f),r.setRenderTarget(e),r.render(o,oc)}_blur(e,t,n,r,i){let a=this._pingPongRenderTarget;this._halfBlur(e,a,t,n,r,`latitudinal`,i),this._halfBlur(a,e,n,n,r,`longitudinal`,i)}_halfBlur(e,t,n,r,i,a,o){let s=this._renderer,c=this._blurMaterial;a!==`latitudinal`&&a!==`longitudinal`&&V(`blur direction must be either latitudinal or longitudinal!`);let l=this._lodMeshes[r];l.material=c;let u=c.uniforms,d=this._sizeLods[n]-1,f=isFinite(i)?Math.PI/(2*d):2*Math.PI/39,p=i/f,m=isFinite(i)?1+Math.floor(3*p):ic;m>ic&&B(`sigmaRadians, ${i}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${ic}`);let h=[],g=0;for(let e=0;e<ic;++e){let t=e/p,n=Math.exp(-t*t/2);h.push(n),e===0?g+=n:e<m&&(g+=2*n)}for(let e=0;e<h.length;e++)h[e]=h[e]/g;u.envMap.value=e.texture,u.samples.value=m,u.weights.value=h,u.latitudinal.value=a===`latitudinal`,o&&(u.poleAxis.value=o);let{_lodMax:_}=this;u.dTheta.value=f,u.mipInt.value=_-n;let v=this._sizeLods[r];gc(t,3*v*(r>_-nc?r-_+nc:0),4*(this._cubeSize-v),3*v,2*v),s.setRenderTarget(t),s.render(l,oc)}};function mc(e){let t=[],n=[],r=[],i=e,a=e-nc+1+rc.length;for(let o=0;o<a;o++){let a=2**i;t.push(a);let s=1/a;o>e-nc?s=rc[o-e+nc-1]:o===0&&(s=0),n.push(s);let c=1/(a-2),l=-c,u=1+c,d=[l,l,u,l,u,u,l,l,u,u,l,u],f=new Float32Array(108),p=new Float32Array(72),m=new Float32Array(36);for(let e=0;e<6;e++){let t=e%3*2/3-1,n=e>2?0:-1,r=[t,n,0,t+2/3,n,0,t+2/3,n+1,0,t,n,0,t+2/3,n+1,0,t,n+1,0];f.set(r,18*e),p.set(d,12*e);let i=[e,e,e,e,e,e];m.set(i,6*e)}let h=new Br;h.setAttribute(`position`,new Tr(f,3)),h.setAttribute(`uv`,new Tr(p,2)),h.setAttribute(`faceIndex`,new Tr(m,1)),r.push(new K(h,null)),i>nc&&i--}return{lodMeshes:r,sizeLods:t,sigmas:n}}function hc(e,t,n){let r=new an(e,t,n);return r.texture.mapping=306,r.texture.name=`PMREM.cubeUv`,r.scissorTest=!0,r}function gc(e,t,n,r,i){e.viewport.set(t,n,r,i),e.scissor.set(t,n,r,i)}function _c(e,t,n){return new Xa({name:`PMREMGGXConvolution`,defines:{GGX_SAMPLES:ac,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/n,CUBEUV_MAX_MIP:`${e}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:xc(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function vc(e,t,n){let r=new Float32Array(ic),i=new U(0,1,0);return new Xa({name:`SphericalGaussianBlur`,defines:{n:ic,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/n,CUBEUV_MAX_MIP:`${e}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:r},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:i}},vertexShader:xc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function yc(){return new Xa({name:`EquirectangularToCubeUV`,uniforms:{envMap:{value:null}},vertexShader:xc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function bc(){return new Xa({name:`CubemapToCubeUV`,uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:xc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function xc(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}var Sc=class extends an{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let n={width:e,height:e,depth:1},r=[n,n,n,n,n,n];this.texture=new ka(r),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new Pa(5,5,5),i=new Xa({name:`CubemapFromEquirect`,uniforms:Ha(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:1,blending:0});i.uniforms.tEquirect.value=t;let a=new K(r,i),o=t.minFilter;return t.minFilter===1008&&(t.minFilter=l),new us(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t=!0,n=!0,r=!0){let i=e.getRenderTarget();for(let i=0;i<6;i++)e.setRenderTarget(this,i),e.clear(t,n,r);e.setRenderTarget(i)}};function Cc(e){let t=new WeakMap,n=new WeakMap,r=null;function i(e,t=!1){return e==null?null:t?o(e):a(e)}function a(n){if(n&&n.isTexture){let r=n.mapping;if(r===303||r===304)if(t.has(n)){let e=t.get(n).texture;return s(e,n.mapping)}else{let r=n.image;if(r&&r.height>0){let i=new Sc(r.height);return i.fromEquirectangularTexture(e,n),t.set(n,i),n.addEventListener(`dispose`,l),s(i.texture,n.mapping)}return null}}return n}function o(t){if(t&&t.isTexture){let i=t.mapping,a=i===303||i===304,o=i===301||i===302;if(a||o){let i=n.get(t),s=i===void 0?0:i.texture.pmremVersion;if(t.isRenderTargetTexture&&t.pmremVersion!==s)return r===null&&(r=new pc(e)),i=a?r.fromEquirectangular(t,i):r.fromCubemap(t,i),i.texture.pmremVersion=t.pmremVersion,n.set(t,i),i.texture;if(i!==void 0)return i.texture;{let s=t.image;return a&&s&&s.height>0||o&&s&&c(s)?(r===null&&(r=new pc(e)),i=a?r.fromEquirectangular(t):r.fromCubemap(t),i.texture.pmremVersion=t.pmremVersion,n.set(t,i),t.addEventListener(`dispose`,u),i.texture):null}}}return t}function s(e,t){return t===303?e.mapping=301:t===304&&(e.mapping=302),e}function c(e){let t=0;for(let n=0;n<6;n++)e[n]!==void 0&&t++;return t===6}function l(e){let n=e.target;n.removeEventListener(`dispose`,l);let r=t.get(n);r!==void 0&&(t.delete(n),r.dispose())}function u(e){let t=e.target;t.removeEventListener(`dispose`,u);let r=n.get(t);r!==void 0&&(n.delete(t),r.dispose())}function d(){t=new WeakMap,n=new WeakMap,r!==null&&(r.dispose(),r=null)}return{get:i,dispose:d}}function wc(e){let t={};function n(n){if(t[n]!==void 0)return t[n];let r=e.getExtension(n);return t[n]=r,r}return{has:function(e){return n(e)!==null},init:function(){n(`EXT_color_buffer_float`),n(`WEBGL_clip_cull_distance`),n(`OES_texture_float_linear`),n(`EXT_color_buffer_half_float`),n(`WEBGL_multisampled_render_to_texture`),n(`WEBGL_render_shared_exponent`)},get:function(e){let t=n(e);return t===null&&st(`WebGLRenderer: `+e+` extension not supported.`),t}}}function Tc(e,t,n,r){let i={},a=new WeakMap;function o(e){let s=e.target;s.index!==null&&t.remove(s.index);for(let e in s.attributes)t.remove(s.attributes[e]);s.removeEventListener(`dispose`,o),delete i[s.id];let c=a.get(s);c&&(t.remove(c),a.delete(s)),r.releaseStatesOfGeometry(s),s.isInstancedBufferGeometry===!0&&delete s._maxInstanceCount,n.memory.geometries--}function s(e,t){return i[t.id]===!0?t:(t.addEventListener(`dispose`,o),i[t.id]=!0,n.memory.geometries++,t)}function c(n){let r=n.attributes;for(let n in r)t.update(r[n],e.ARRAY_BUFFER)}function l(e){let n=[],r=e.index,i=e.attributes.position,o=0;if(i===void 0)return;if(r!==null){let e=r.array;o=r.version;for(let t=0,r=e.length;t<r;t+=3){let r=e[t+0],i=e[t+1],a=e[t+2];n.push(r,i,i,a,a,r)}}else{let e=i.array;o=i.version;for(let t=0,r=e.length/3-1;t<r;t+=3){let e=t+0,r=t+1,i=t+2;n.push(e,r,r,i,i,e)}}let s=new(i.count>=65535?Dr:Er)(n,1);s.version=o;let c=a.get(e);c&&t.remove(c),a.set(e,s)}function u(e){let t=a.get(e);if(t){let n=e.index;n!==null&&t.version<n.version&&l(e)}else l(e);return a.get(e)}return{get:s,update:c,getWireframeAttribute:u}}function Ec(e,t,n){let r;function i(e){r=e}let a,o;function s(e){a=e.type,o=e.bytesPerElement}function c(t,i){e.drawElements(r,i,a,t*o),n.update(i,r,1)}function l(t,i,s){s!==0&&(e.drawElementsInstanced(r,i,a,t*o,s),n.update(i,r,s))}function u(e,i,o){if(o===0)return;t.get(`WEBGL_multi_draw`).multiDrawElementsWEBGL(r,i,0,a,e,0,o);let s=0;for(let e=0;e<o;e++)s+=i[e];n.update(s,r,1)}this.setMode=i,this.setIndex=s,this.render=c,this.renderInstances=l,this.renderMultiDraw=u}function Dc(e){let t={geometries:0,textures:0},n={frame:0,calls:0,triangles:0,points:0,lines:0};function r(t,r,i){switch(n.calls++,r){case e.TRIANGLES:n.triangles+=t/3*i;break;case e.LINES:n.lines+=t/2*i;break;case e.LINE_STRIP:n.lines+=i*(t-1);break;case e.LINE_LOOP:n.lines+=i*t;break;case e.POINTS:n.points+=i*t;break;default:V(`WebGLInfo: Unknown draw mode:`,r)}}function i(){n.calls=0,n.triangles=0,n.points=0,n.lines=0}return{memory:t,render:n,programs:null,autoReset:!0,reset:i,update:r}}function Oc(e,t,n){let r=new WeakMap,i=new nn;function a(a,o,s){let c=a.morphTargetInfluences,l=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,u=l===void 0?0:l.length,d=r.get(o);if(d===void 0||d.count!==u){d!==void 0&&d.texture.dispose();let e=o.morphAttributes.position!==void 0,n=o.morphAttributes.normal!==void 0,a=o.morphAttributes.color!==void 0,s=o.morphAttributes.position||[],c=o.morphAttributes.normal||[],l=o.morphAttributes.color||[],f=0;e===!0&&(f=1),n===!0&&(f=2),a===!0&&(f=3);let p=o.attributes.position.count*f,m=1;p>t.maxTextureSize&&(m=Math.ceil(p/t.maxTextureSize),p=t.maxTextureSize);let h=new Float32Array(p*m*4*u),g=new on(h,p,m,u);g.type=y,g.needsUpdate=!0;let _=f*4;for(let t=0;t<u;t++){let r=s[t],o=c[t],u=l[t],d=p*m*4*t;for(let t=0;t<r.count;t++){let s=t*_;e===!0&&(i.fromBufferAttribute(r,t),h[d+s+0]=i.x,h[d+s+1]=i.y,h[d+s+2]=i.z,h[d+s+3]=0),n===!0&&(i.fromBufferAttribute(o,t),h[d+s+4]=i.x,h[d+s+5]=i.y,h[d+s+6]=i.z,h[d+s+7]=0),a===!0&&(i.fromBufferAttribute(u,t),h[d+s+8]=i.x,h[d+s+9]=i.y,h[d+s+10]=i.z,h[d+s+11]=u.itemSize===4?i.w:1)}}d={count:u,texture:g,size:new H(p,m)},r.set(o,d);function v(){g.dispose(),r.delete(o),o.removeEventListener(`dispose`,v)}o.addEventListener(`dispose`,v)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)s.getUniforms().setValue(e,`morphTexture`,a.morphTexture,n);else{let t=0;for(let e=0;e<c.length;e++)t+=c[e];let n=o.morphTargetsRelative?1:1-t;s.getUniforms().setValue(e,`morphTargetBaseInfluence`,n),s.getUniforms().setValue(e,`morphTargetInfluences`,c)}s.getUniforms().setValue(e,`morphTargetsTexture`,d.texture,n),s.getUniforms().setValue(e,`morphTargetsTextureSize`,d.size)}return{update:a}}function kc(e,t,n,r,i){let a=new WeakMap;function o(r){let o=i.render.frame,s=r.geometry,l=t.get(r,s);if(a.get(l)!==o&&(t.update(l),a.set(l,o)),r.isInstancedMesh&&(r.hasEventListener(`dispose`,c)===!1&&r.addEventListener(`dispose`,c),a.get(r)!==o&&(n.update(r.instanceMatrix,e.ARRAY_BUFFER),r.instanceColor!==null&&n.update(r.instanceColor,e.ARRAY_BUFFER),a.set(r,o))),r.isSkinnedMesh){let e=r.skeleton;a.get(e)!==o&&(e.update(),a.set(e,o))}return l}function s(){a=new WeakMap}function c(e){let t=e.target;t.removeEventListener(`dispose`,c),r.releaseStatesOfObject(t),n.remove(t.instanceMatrix),t.instanceColor!==null&&n.remove(t.instanceColor)}return{update:o,dispose:s}}var Ac={1:`LINEAR_TONE_MAPPING`,2:`REINHARD_TONE_MAPPING`,3:`CINEON_TONE_MAPPING`,4:`ACES_FILMIC_TONE_MAPPING`,6:`AGX_TONE_MAPPING`,7:`NEUTRAL_TONE_MAPPING`,5:`CUSTOM_TONE_MAPPING`};function jc(e,t,n,r,i,a){let o=new an(t,n,{type:e,depthBuffer:i,stencilBuffer:a,samples:r?4:0,depthTexture:i?new ja(t,n):void 0}),s=new an(t,n,{type:b,depthBuffer:!1,stencilBuffer:!1}),c=new Br;c.setAttribute(`position`,new Or([-1,3,0,-1,-1,0,3,-1,0],3)),c.setAttribute(`uv`,new Or([0,2,0,0,2,0],2));let l=new Za({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),u=new K(c,l),d=new Qo(-1,1,1,-1,0,1),f=null,p=null,m=!1,h,g=null,_=[],v=!1;this.setSize=function(e,t){o.setSize(e,t),s.setSize(e,t);for(let n=0;n<_.length;n++){let r=_[n];r.setSize&&r.setSize(e,t)}},this.setEffects=function(e){_=e,v=_.length>0&&_[0].isRenderPass===!0;let t=o.width,n=o.height;for(let e=0;e<_.length;e++){let r=_[e];r.setSize&&r.setSize(t,n)}},this.begin=function(e,t){if(m||e.toneMapping===0&&_.length===0)return!1;if(g=t,t!==null){let e=t.width,n=t.height;(o.width!==e||o.height!==n)&&this.setSize(e,n)}return v===!1&&e.setRenderTarget(o),h=e.toneMapping,e.toneMapping=0,!0},this.hasRenderPass=function(){return v},this.end=function(e,t){e.toneMapping=h,m=!0;let n=o,r=s;for(let i=0;i<_.length;i++){let a=_[i];if(a.enabled!==!1&&(a.render(e,r,n,t),a.needsSwap!==!1)){let e=n;n=r,r=e}}if(f!==e.outputColorSpace||p!==e.toneMapping){f=e.outputColorSpace,p=e.toneMapping,l.defines={},Gt.getTransfer(f)===`srgb`&&(l.defines.SRGB_TRANSFER=``);let t=Ac[p];t&&(l.defines[t]=``),l.needsUpdate=!0}l.uniforms.tDiffuse.value=n.texture,e.setRenderTarget(g),e.render(u,d),g=null,m=!1},this.isCompositing=function(){return m},this.dispose=function(){o.depthTexture&&o.depthTexture.dispose(),o.dispose(),s.dispose(),c.dispose(),l.dispose()}}var Mc=new tn,Nc=new ja(1,1),Pc=new on,Fc=new cn,Ic=new ka,Lc=[],Rc=[],zc=new Float32Array(16),Bc=new Float32Array(9),Vc=new Float32Array(4);function Hc(e,t,n){let r=e[0];if(r<=0||r>0)return e;let i=t*n,a=Lc[i];if(a===void 0&&(a=new Float32Array(i),Lc[i]=a),t!==0){r.toArray(a,0);for(let r=1,i=0;r!==t;++r)i+=n,e[r].toArray(a,i)}return a}function Uc(e,t){if(e.length!==t.length)return!1;for(let n=0,r=e.length;n<r;n++)if(e[n]!==t[n])return!1;return!0}function Wc(e,t){for(let n=0,r=t.length;n<r;n++)e[n]=t[n]}function Gc(e,t){let n=Rc[t];n===void 0&&(n=new Int32Array(t),Rc[t]=n);for(let r=0;r!==t;++r)n[r]=e.allocateTextureUnit();return n}function Kc(e,t){let n=this.cache;n[0]!==t&&(e.uniform1f(this.addr,t),n[0]=t)}function qc(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2f(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(Uc(n,t))return;e.uniform2fv(this.addr,t),Wc(n,t)}}function Jc(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3f(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else if(t.r!==void 0)(n[0]!==t.r||n[1]!==t.g||n[2]!==t.b)&&(e.uniform3f(this.addr,t.r,t.g,t.b),n[0]=t.r,n[1]=t.g,n[2]=t.b);else{if(Uc(n,t))return;e.uniform3fv(this.addr,t),Wc(n,t)}}function Yc(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4f(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(Uc(n,t))return;e.uniform4fv(this.addr,t),Wc(n,t)}}function Xc(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(Uc(n,t))return;e.uniformMatrix2fv(this.addr,!1,t),Wc(n,t)}else{if(Uc(n,r))return;Vc.set(r),e.uniformMatrix2fv(this.addr,!1,Vc),Wc(n,r)}}function Zc(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(Uc(n,t))return;e.uniformMatrix3fv(this.addr,!1,t),Wc(n,t)}else{if(Uc(n,r))return;Bc.set(r),e.uniformMatrix3fv(this.addr,!1,Bc),Wc(n,r)}}function Qc(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(Uc(n,t))return;e.uniformMatrix4fv(this.addr,!1,t),Wc(n,t)}else{if(Uc(n,r))return;zc.set(r),e.uniformMatrix4fv(this.addr,!1,zc),Wc(n,r)}}function $c(e,t){let n=this.cache;n[0]!==t&&(e.uniform1i(this.addr,t),n[0]=t)}function el(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2i(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(Uc(n,t))return;e.uniform2iv(this.addr,t),Wc(n,t)}}function tl(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3i(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(Uc(n,t))return;e.uniform3iv(this.addr,t),Wc(n,t)}}function nl(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4i(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(Uc(n,t))return;e.uniform4iv(this.addr,t),Wc(n,t)}}function rl(e,t){let n=this.cache;n[0]!==t&&(e.uniform1ui(this.addr,t),n[0]=t)}function il(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2ui(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(Uc(n,t))return;e.uniform2uiv(this.addr,t),Wc(n,t)}}function al(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3ui(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(Uc(n,t))return;e.uniform3uiv(this.addr,t),Wc(n,t)}}function ol(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4ui(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(Uc(n,t))return;e.uniform4uiv(this.addr,t),Wc(n,t)}}function sl(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i);let a;this.type===e.SAMPLER_2D_SHADOW?(Nc.compareFunction=n.isReversedDepthBuffer()?518:515,a=Nc):a=Mc,n.setTexture2D(t||a,i)}function cl(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTexture3D(t||Fc,i)}function ll(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTextureCube(t||Ic,i)}function ul(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTexture2DArray(t||Pc,i)}function dl(e){switch(e){case 5126:return Kc;case 35664:return qc;case 35665:return Jc;case 35666:return Yc;case 35674:return Xc;case 35675:return Zc;case 35676:return Qc;case 5124:case 35670:return $c;case 35667:case 35671:return el;case 35668:case 35672:return tl;case 35669:case 35673:return nl;case 5125:return rl;case 36294:return il;case 36295:return al;case 36296:return ol;case 35678:case 36198:case 36298:case 36306:case 35682:return sl;case 35679:case 36299:case 36307:return cl;case 35680:case 36300:case 36308:case 36293:return ll;case 36289:case 36303:case 36311:case 36292:return ul}}function fl(e,t){e.uniform1fv(this.addr,t)}function pl(e,t){let n=Hc(t,this.size,2);e.uniform2fv(this.addr,n)}function ml(e,t){let n=Hc(t,this.size,3);e.uniform3fv(this.addr,n)}function hl(e,t){let n=Hc(t,this.size,4);e.uniform4fv(this.addr,n)}function gl(e,t){let n=Hc(t,this.size,4);e.uniformMatrix2fv(this.addr,!1,n)}function _l(e,t){let n=Hc(t,this.size,9);e.uniformMatrix3fv(this.addr,!1,n)}function vl(e,t){let n=Hc(t,this.size,16);e.uniformMatrix4fv(this.addr,!1,n)}function yl(e,t){e.uniform1iv(this.addr,t)}function bl(e,t){e.uniform2iv(this.addr,t)}function xl(e,t){e.uniform3iv(this.addr,t)}function Sl(e,t){e.uniform4iv(this.addr,t)}function Cl(e,t){e.uniform1uiv(this.addr,t)}function wl(e,t){e.uniform2uiv(this.addr,t)}function Tl(e,t){e.uniform3uiv(this.addr,t)}function El(e,t){e.uniform4uiv(this.addr,t)}function Dl(e,t,n){let r=this.cache,i=t.length,a=Gc(n,i);Uc(r,a)||(e.uniform1iv(this.addr,a),Wc(r,a));let o;o=this.type===e.SAMPLER_2D_SHADOW?Nc:Mc;for(let e=0;e!==i;++e)n.setTexture2D(t[e]||o,a[e])}function Ol(e,t,n){let r=this.cache,i=t.length,a=Gc(n,i);Uc(r,a)||(e.uniform1iv(this.addr,a),Wc(r,a));for(let e=0;e!==i;++e)n.setTexture3D(t[e]||Fc,a[e])}function kl(e,t,n){let r=this.cache,i=t.length,a=Gc(n,i);Uc(r,a)||(e.uniform1iv(this.addr,a),Wc(r,a));for(let e=0;e!==i;++e)n.setTextureCube(t[e]||Ic,a[e])}function Al(e,t,n){let r=this.cache,i=t.length,a=Gc(n,i);Uc(r,a)||(e.uniform1iv(this.addr,a),Wc(r,a));for(let e=0;e!==i;++e)n.setTexture2DArray(t[e]||Pc,a[e])}function jl(e){switch(e){case 5126:return fl;case 35664:return pl;case 35665:return ml;case 35666:return hl;case 35674:return gl;case 35675:return _l;case 35676:return vl;case 5124:case 35670:return yl;case 35667:case 35671:return bl;case 35668:case 35672:return xl;case 35669:case 35673:return Sl;case 5125:return Cl;case 36294:return wl;case 36295:return Tl;case 36296:return El;case 35678:case 36198:case 36298:case 36306:case 35682:return Dl;case 35679:case 36299:case 36307:return Ol;case 35680:case 36300:case 36308:case 36293:return kl;case 36289:case 36303:case 36311:case 36292:return Al}}var Ml=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=dl(t.type)}},Nl=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=jl(t.type)}},Pl=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){let r=this.seq;for(let i=0,a=r.length;i!==a;++i){let a=r[i];a.setValue(e,t[a.id],n)}}},Fl=/(\w+)(\])?(\[|\.)?/g;function Il(e,t){e.seq.push(t),e.map[t.id]=t}function Ll(e,t,n){let r=e.name,i=r.length;for(Fl.lastIndex=0;;){let a=Fl.exec(r),o=Fl.lastIndex,s=a[1],c=a[2]===`]`,l=a[3];if(c&&(s|=0),l===void 0||l===`[`&&o+2===i){Il(n,l===void 0?new Ml(s,e,t):new Nl(s,e,t));break}{let e=n.map[s];e===void 0&&(e=new Pl(s),Il(n,e)),n=e}}}var Rl=class{constructor(e,t){this.seq=[],this.map={};let n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let r=0;r<n;++r){let n=e.getActiveUniform(t,r);Ll(n,e.getUniformLocation(t,n.name),this)}let r=[],i=[];for(let t of this.seq)t.type===e.SAMPLER_2D_SHADOW||t.type===e.SAMPLER_CUBE_SHADOW||t.type===e.SAMPLER_2D_ARRAY_SHADOW?r.push(t):i.push(t);r.length>0&&(this.seq=r.concat(i))}setValue(e,t,n,r){let i=this.map[t];i!==void 0&&i.setValue(e,n,r)}setOptional(e,t,n){let r=t[n];r!==void 0&&this.setValue(e,n,r)}static upload(e,t,n,r){for(let i=0,a=t.length;i!==a;++i){let a=t[i],o=n[a.id];o.needsUpdate!==!1&&a.setValue(e,o.value,r)}}static seqWithValue(e,t){let n=[];for(let r=0,i=e.length;r!==i;++r){let i=e[r];i.id in t&&n.push(i)}return n}};function zl(e,t,n){let r=e.createShader(t);return e.shaderSource(r,n),e.compileShader(r),r}var Bl=37297,Vl=0;function Hl(e,t){let n=e.split(`
`),r=[],i=Math.max(t-6,0),a=Math.min(t+6,n.length);for(let e=i;e<a;e++){let i=e+1;r.push(`${i===t?`>`:` `} ${i}: ${n[e]}`)}return r.join(`
`)}var Ul=new W;function Wl(e){Gt._getMatrix(Ul,Gt.workingColorSpace,e);let t=`mat3( ${Ul.elements.map(e=>e.toFixed(4))} )`;switch(Gt.getTransfer(e)){case qe:return[t,`LinearTransferOETF`];case Je:return[t,`sRGBTransferOETF`];default:return B(`WebGLProgram: Unsupported color space: `,e),[t,`LinearTransferOETF`]}}function Gl(e,t,n){let r=e.getShaderParameter(t,e.COMPILE_STATUS),i=(e.getShaderInfoLog(t)||``).trim();if(r&&i===``)return``;let a=/ERROR: 0:(\d+)/.exec(i);if(a){let r=parseInt(a[1]);return n.toUpperCase()+`

`+i+`

`+Hl(e.getShaderSource(t),r)}return i}function Kl(e,t){let n=Wl(t);return[`vec4 ${e}( vec4 value ) {`,`	return ${n[1]}( vec4( value.rgb * ${n[0]}, value.a ) );`,`}`].join(`
`)}var ql={1:`Linear`,2:`Reinhard`,3:`Cineon`,4:`ACESFilmic`,6:`AgX`,7:`Neutral`,5:`Custom`};function Jl(e,t){let n=ql[t];return n===void 0?(B(`WebGLProgram: Unsupported toneMapping:`,t),`vec3 `+e+`( vec3 color ) { return LinearToneMapping( color ); }`):`vec3 `+e+`( vec3 color ) { return `+n+`ToneMapping( color ); }`}var Yl=new U;function Xl(){return Gt.getLuminanceCoefficients(Yl),[`float luminance( const in vec3 rgb ) {`,`	const vec3 weights = vec3( ${Yl.x.toFixed(4)}, ${Yl.y.toFixed(4)}, ${Yl.z.toFixed(4)} );`,`	return dot( weights, rgb );`,`}`].join(`
`)}function Zl(e){return[e.extensionClipCullDistance?`#extension GL_ANGLE_clip_cull_distance : require`:``,e.extensionMultiDraw?`#extension GL_ANGLE_multi_draw : require`:``].filter(eu).join(`
`)}function Ql(e){let t=[];for(let n in e){let r=e[n];r!==!1&&t.push(`#define `+n+` `+r)}return t.join(`
`)}function $l(e,t){let n={},r=e.getProgramParameter(t,e.ACTIVE_ATTRIBUTES);for(let i=0;i<r;i++){let r=e.getActiveAttrib(t,i),a=r.name,o=1;r.type===e.FLOAT_MAT2&&(o=2),r.type===e.FLOAT_MAT3&&(o=3),r.type===e.FLOAT_MAT4&&(o=4),n[a]={type:r.type,location:e.getAttribLocation(t,a),locationSize:o}}return n}function eu(e){return e!==``}function tu(e,t){let n=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return e.replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,n).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function nu(e,t){return e.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var ru=/^[ \t]*#include +<([\w\d./]+)>/gm;function iu(e){return e.replace(ru,ou)}var au=new Map;function ou(e,t){let n=q[t];if(n===void 0){let e=au.get(t);if(e!==void 0)n=q[e],B(`WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.`,t,e);else throw Error(`THREE.WebGLProgram: Can not resolve #include <`+t+`>`)}return iu(n)}var su=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function cu(e){return e.replace(su,lu)}function lu(e,t,n,r){let i=``;for(let e=parseInt(t);e<parseInt(n);e++)i+=r.replace(/\[\s*i\s*\]/g,`[ `+e+` ]`).replace(/UNROLLED_LOOP_INDEX/g,e);return i}function uu(e){let t=`precision ${e.precision} float;
	precision ${e.precision} int;
	precision ${e.precision} sampler2D;
	precision ${e.precision} samplerCube;
	precision ${e.precision} sampler3D;
	precision ${e.precision} sampler2DArray;
	precision ${e.precision} sampler2DShadow;
	precision ${e.precision} samplerCubeShadow;
	precision ${e.precision} sampler2DArrayShadow;
	precision ${e.precision} isampler2D;
	precision ${e.precision} isampler3D;
	precision ${e.precision} isamplerCube;
	precision ${e.precision} isampler2DArray;
	precision ${e.precision} usampler2D;
	precision ${e.precision} usampler3D;
	precision ${e.precision} usamplerCube;
	precision ${e.precision} usampler2DArray;
	`;return e.precision===`highp`?t+=`
#define HIGH_PRECISION`:e.precision===`mediump`?t+=`
#define MEDIUM_PRECISION`:e.precision===`lowp`&&(t+=`
#define LOW_PRECISION`),t}var du={1:`SHADOWMAP_TYPE_PCF`,3:`SHADOWMAP_TYPE_VSM`};function fu(e){return du[e.shadowMapType]||`SHADOWMAP_TYPE_BASIC`}var pu={301:`ENVMAP_TYPE_CUBE`,302:`ENVMAP_TYPE_CUBE`,306:`ENVMAP_TYPE_CUBE_UV`};function mu(e){return e.envMap===!1?`ENVMAP_TYPE_CUBE`:pu[e.envMapMode]||`ENVMAP_TYPE_CUBE`}var hu={302:`ENVMAP_MODE_REFRACTION`};function gu(e){return e.envMap===!1?`ENVMAP_MODE_REFLECTION`:hu[e.envMapMode]||`ENVMAP_MODE_REFLECTION`}var _u={0:`ENVMAP_BLENDING_MULTIPLY`,1:`ENVMAP_BLENDING_MIX`,2:`ENVMAP_BLENDING_ADD`};function vu(e){return e.envMap===!1?`ENVMAP_BLENDING_NONE`:_u[e.combine]||`ENVMAP_BLENDING_NONE`}function yu(e){let t=e.envMapCubeUVHeight;if(t===null)return null;let n=Math.log2(t)-2,r=1/t;return{texelWidth:1/(3*Math.max(2**n,112)),texelHeight:r,maxMip:n}}function bu(e,t,n,r){let i=e.getContext(),a=n.defines,o=n.vertexShader,s=n.fragmentShader,c=fu(n),l=mu(n),u=gu(n),d=vu(n),f=yu(n),p=Zl(n),m=Ql(a),h=i.createProgram(),g,_,v=n.glslVersion?`#version `+n.glslVersion+`
`:``;n.isRawShaderMaterial?(g=[`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m].filter(eu).join(`
`),g.length>0&&(g+=`
`),_=[`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m].filter(eu).join(`
`),_.length>0&&(_+=`
`)):(g=[uu(n),`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m,n.extensionClipCullDistance?`#define USE_CLIP_DISTANCE`:``,n.batching?`#define USE_BATCHING`:``,n.batchingColor?`#define USE_BATCHING_COLOR`:``,n.instancing?`#define USE_INSTANCING`:``,n.instancingColor?`#define USE_INSTANCING_COLOR`:``,n.instancingMorph?`#define USE_INSTANCING_MORPH`:``,n.useFog&&n.fog?`#define USE_FOG`:``,n.useFog&&n.fogExp2?`#define FOG_EXP2`:``,n.map?`#define USE_MAP`:``,n.envMap?`#define USE_ENVMAP`:``,n.envMap?`#define `+u:``,n.lightMap?`#define USE_LIGHTMAP`:``,n.aoMap?`#define USE_AOMAP`:``,n.bumpMap?`#define USE_BUMPMAP`:``,n.normalMap?`#define USE_NORMALMAP`:``,n.normalMapObjectSpace?`#define USE_NORMALMAP_OBJECTSPACE`:``,n.normalMapTangentSpace?`#define USE_NORMALMAP_TANGENTSPACE`:``,n.displacementMap?`#define USE_DISPLACEMENTMAP`:``,n.emissiveMap?`#define USE_EMISSIVEMAP`:``,n.anisotropy?`#define USE_ANISOTROPY`:``,n.anisotropyMap?`#define USE_ANISOTROPYMAP`:``,n.clearcoatMap?`#define USE_CLEARCOATMAP`:``,n.clearcoatRoughnessMap?`#define USE_CLEARCOAT_ROUGHNESSMAP`:``,n.clearcoatNormalMap?`#define USE_CLEARCOAT_NORMALMAP`:``,n.iridescenceMap?`#define USE_IRIDESCENCEMAP`:``,n.iridescenceThicknessMap?`#define USE_IRIDESCENCE_THICKNESSMAP`:``,n.specularMap?`#define USE_SPECULARMAP`:``,n.specularColorMap?`#define USE_SPECULAR_COLORMAP`:``,n.specularIntensityMap?`#define USE_SPECULAR_INTENSITYMAP`:``,n.roughnessMap?`#define USE_ROUGHNESSMAP`:``,n.metalnessMap?`#define USE_METALNESSMAP`:``,n.alphaMap?`#define USE_ALPHAMAP`:``,n.alphaHash?`#define USE_ALPHAHASH`:``,n.transmission?`#define USE_TRANSMISSION`:``,n.transmissionMap?`#define USE_TRANSMISSIONMAP`:``,n.thicknessMap?`#define USE_THICKNESSMAP`:``,n.sheenColorMap?`#define USE_SHEEN_COLORMAP`:``,n.sheenRoughnessMap?`#define USE_SHEEN_ROUGHNESSMAP`:``,n.mapUv?`#define MAP_UV `+n.mapUv:``,n.alphaMapUv?`#define ALPHAMAP_UV `+n.alphaMapUv:``,n.lightMapUv?`#define LIGHTMAP_UV `+n.lightMapUv:``,n.aoMapUv?`#define AOMAP_UV `+n.aoMapUv:``,n.emissiveMapUv?`#define EMISSIVEMAP_UV `+n.emissiveMapUv:``,n.bumpMapUv?`#define BUMPMAP_UV `+n.bumpMapUv:``,n.normalMapUv?`#define NORMALMAP_UV `+n.normalMapUv:``,n.displacementMapUv?`#define DISPLACEMENTMAP_UV `+n.displacementMapUv:``,n.metalnessMapUv?`#define METALNESSMAP_UV `+n.metalnessMapUv:``,n.roughnessMapUv?`#define ROUGHNESSMAP_UV `+n.roughnessMapUv:``,n.anisotropyMapUv?`#define ANISOTROPYMAP_UV `+n.anisotropyMapUv:``,n.clearcoatMapUv?`#define CLEARCOATMAP_UV `+n.clearcoatMapUv:``,n.clearcoatNormalMapUv?`#define CLEARCOAT_NORMALMAP_UV `+n.clearcoatNormalMapUv:``,n.clearcoatRoughnessMapUv?`#define CLEARCOAT_ROUGHNESSMAP_UV `+n.clearcoatRoughnessMapUv:``,n.iridescenceMapUv?`#define IRIDESCENCEMAP_UV `+n.iridescenceMapUv:``,n.iridescenceThicknessMapUv?`#define IRIDESCENCE_THICKNESSMAP_UV `+n.iridescenceThicknessMapUv:``,n.sheenColorMapUv?`#define SHEEN_COLORMAP_UV `+n.sheenColorMapUv:``,n.sheenRoughnessMapUv?`#define SHEEN_ROUGHNESSMAP_UV `+n.sheenRoughnessMapUv:``,n.specularMapUv?`#define SPECULARMAP_UV `+n.specularMapUv:``,n.specularColorMapUv?`#define SPECULAR_COLORMAP_UV `+n.specularColorMapUv:``,n.specularIntensityMapUv?`#define SPECULAR_INTENSITYMAP_UV `+n.specularIntensityMapUv:``,n.transmissionMapUv?`#define TRANSMISSIONMAP_UV `+n.transmissionMapUv:``,n.thicknessMapUv?`#define THICKNESSMAP_UV `+n.thicknessMapUv:``,n.vertexTangents&&n.flatShading===!1?`#define USE_TANGENT`:``,n.vertexNormals?`#define HAS_NORMAL`:``,n.vertexColors?`#define USE_COLOR`:``,n.vertexAlphas?`#define USE_COLOR_ALPHA`:``,n.vertexUv1s?`#define USE_UV1`:``,n.vertexUv2s?`#define USE_UV2`:``,n.vertexUv3s?`#define USE_UV3`:``,n.pointsUvs?`#define USE_POINTS_UV`:``,n.flatShading?`#define FLAT_SHADED`:``,n.skinning?`#define USE_SKINNING`:``,n.morphTargets?`#define USE_MORPHTARGETS`:``,n.morphNormals&&n.flatShading===!1?`#define USE_MORPHNORMALS`:``,n.morphColors?`#define USE_MORPHCOLORS`:``,n.morphTargetsCount>0?`#define MORPHTARGETS_TEXTURE_STRIDE `+n.morphTextureStride:``,n.morphTargetsCount>0?`#define MORPHTARGETS_COUNT `+n.morphTargetsCount:``,n.doubleSided?`#define DOUBLE_SIDED`:``,n.flipSided?`#define FLIP_SIDED`:``,n.shadowMapEnabled?`#define USE_SHADOWMAP`:``,n.shadowMapEnabled?`#define `+c:``,n.sizeAttenuation?`#define USE_SIZEATTENUATION`:``,n.numLightProbes>0?`#define USE_LIGHT_PROBES`:``,n.logarithmicDepthBuffer?`#define USE_LOGARITHMIC_DEPTH_BUFFER`:``,n.reversedDepthBuffer?`#define USE_REVERSED_DEPTH_BUFFER`:``,`uniform mat4 modelMatrix;`,`uniform mat4 modelViewMatrix;`,`uniform mat4 projectionMatrix;`,`uniform mat4 viewMatrix;`,`uniform mat3 normalMatrix;`,`uniform vec3 cameraPosition;`,`uniform bool isOrthographic;`,`#ifdef USE_INSTANCING`,`	attribute mat4 instanceMatrix;`,`#endif`,`#ifdef USE_INSTANCING_COLOR`,`	attribute vec3 instanceColor;`,`#endif`,`#ifdef USE_INSTANCING_MORPH`,`	uniform sampler2D morphTexture;`,`#endif`,`attribute vec3 position;`,`attribute vec3 normal;`,`attribute vec2 uv;`,`#ifdef USE_UV1`,`	attribute vec2 uv1;`,`#endif`,`#ifdef USE_UV2`,`	attribute vec2 uv2;`,`#endif`,`#ifdef USE_UV3`,`	attribute vec2 uv3;`,`#endif`,`#ifdef USE_TANGENT`,`	attribute vec4 tangent;`,`#endif`,`#if defined( USE_COLOR_ALPHA )`,`	attribute vec4 color;`,`#elif defined( USE_COLOR )`,`	attribute vec3 color;`,`#endif`,`#ifdef USE_SKINNING`,`	attribute vec4 skinIndex;`,`	attribute vec4 skinWeight;`,`#endif`,`
`].filter(eu).join(`
`),_=[uu(n),`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m,n.useFog&&n.fog?`#define USE_FOG`:``,n.useFog&&n.fogExp2?`#define FOG_EXP2`:``,n.alphaToCoverage?`#define ALPHA_TO_COVERAGE`:``,n.map?`#define USE_MAP`:``,n.matcap?`#define USE_MATCAP`:``,n.envMap?`#define USE_ENVMAP`:``,n.envMap?`#define `+l:``,n.envMap?`#define `+u:``,n.envMap?`#define `+d:``,f?`#define CUBEUV_TEXEL_WIDTH `+f.texelWidth:``,f?`#define CUBEUV_TEXEL_HEIGHT `+f.texelHeight:``,f?`#define CUBEUV_MAX_MIP `+f.maxMip+`.0`:``,n.lightMap?`#define USE_LIGHTMAP`:``,n.aoMap?`#define USE_AOMAP`:``,n.bumpMap?`#define USE_BUMPMAP`:``,n.normalMap?`#define USE_NORMALMAP`:``,n.normalMapObjectSpace?`#define USE_NORMALMAP_OBJECTSPACE`:``,n.normalMapTangentSpace?`#define USE_NORMALMAP_TANGENTSPACE`:``,n.packedNormalMap?`#define USE_PACKED_NORMALMAP`:``,n.emissiveMap?`#define USE_EMISSIVEMAP`:``,n.anisotropy?`#define USE_ANISOTROPY`:``,n.anisotropyMap?`#define USE_ANISOTROPYMAP`:``,n.clearcoat?`#define USE_CLEARCOAT`:``,n.clearcoatMap?`#define USE_CLEARCOATMAP`:``,n.clearcoatRoughnessMap?`#define USE_CLEARCOAT_ROUGHNESSMAP`:``,n.clearcoatNormalMap?`#define USE_CLEARCOAT_NORMALMAP`:``,n.dispersion?`#define USE_DISPERSION`:``,n.iridescence?`#define USE_IRIDESCENCE`:``,n.iridescenceMap?`#define USE_IRIDESCENCEMAP`:``,n.iridescenceThicknessMap?`#define USE_IRIDESCENCE_THICKNESSMAP`:``,n.specularMap?`#define USE_SPECULARMAP`:``,n.specularColorMap?`#define USE_SPECULAR_COLORMAP`:``,n.specularIntensityMap?`#define USE_SPECULAR_INTENSITYMAP`:``,n.roughnessMap?`#define USE_ROUGHNESSMAP`:``,n.metalnessMap?`#define USE_METALNESSMAP`:``,n.alphaMap?`#define USE_ALPHAMAP`:``,n.alphaTest?`#define USE_ALPHATEST`:``,n.alphaHash?`#define USE_ALPHAHASH`:``,n.sheen?`#define USE_SHEEN`:``,n.sheenColorMap?`#define USE_SHEEN_COLORMAP`:``,n.sheenRoughnessMap?`#define USE_SHEEN_ROUGHNESSMAP`:``,n.transmission?`#define USE_TRANSMISSION`:``,n.transmissionMap?`#define USE_TRANSMISSIONMAP`:``,n.thicknessMap?`#define USE_THICKNESSMAP`:``,n.vertexTangents&&n.flatShading===!1?`#define USE_TANGENT`:``,n.vertexColors||n.instancingColor?`#define USE_COLOR`:``,n.vertexAlphas||n.batchingColor?`#define USE_COLOR_ALPHA`:``,n.vertexUv1s?`#define USE_UV1`:``,n.vertexUv2s?`#define USE_UV2`:``,n.vertexUv3s?`#define USE_UV3`:``,n.pointsUvs?`#define USE_POINTS_UV`:``,n.gradientMap?`#define USE_GRADIENTMAP`:``,n.flatShading?`#define FLAT_SHADED`:``,n.doubleSided?`#define DOUBLE_SIDED`:``,n.flipSided?`#define FLIP_SIDED`:``,n.shadowMapEnabled?`#define USE_SHADOWMAP`:``,n.shadowMapEnabled?`#define `+c:``,n.premultipliedAlpha?`#define PREMULTIPLIED_ALPHA`:``,n.numLightProbes>0?`#define USE_LIGHT_PROBES`:``,n.numLightProbeGrids>0?`#define USE_LIGHT_PROBES_GRID`:``,n.decodeVideoTexture?`#define DECODE_VIDEO_TEXTURE`:``,n.decodeVideoTextureEmissive?`#define DECODE_VIDEO_TEXTURE_EMISSIVE`:``,n.logarithmicDepthBuffer?`#define USE_LOGARITHMIC_DEPTH_BUFFER`:``,n.reversedDepthBuffer?`#define USE_REVERSED_DEPTH_BUFFER`:``,`uniform mat4 viewMatrix;`,`uniform vec3 cameraPosition;`,`uniform bool isOrthographic;`,n.toneMapping===0?``:`#define TONE_MAPPING`,n.toneMapping===0?``:q.tonemapping_pars_fragment,n.toneMapping===0?``:Jl(`toneMapping`,n.toneMapping),n.dithering?`#define DITHERING`:``,n.opaque?`#define OPAQUE`:``,q.colorspace_pars_fragment,Kl(`linearToOutputTexel`,n.outputColorSpace),Xl(),n.useDepthPacking?`#define DEPTH_PACKING `+n.depthPacking:``,`
`].filter(eu).join(`
`)),o=iu(o),o=tu(o,n),o=nu(o,n),s=iu(s),s=tu(s,n),s=nu(s,n),o=cu(o),s=cu(s),n.isRawShaderMaterial!==!0&&(v=`#version 300 es
`,g=[p,`#define attribute in`,`#define varying out`,`#define texture2D texture`].join(`
`)+`
`+g,_=[`#define varying in`,n.glslVersion===`300 es`?``:`layout(location = 0) out highp vec4 pc_fragColor;`,n.glslVersion===`300 es`?``:`#define gl_FragColor pc_fragColor`,`#define gl_FragDepthEXT gl_FragDepth`,`#define texture2D texture`,`#define textureCube texture`,`#define texture2DProj textureProj`,`#define texture2DLodEXT textureLod`,`#define texture2DProjLodEXT textureProjLod`,`#define textureCubeLodEXT textureLod`,`#define texture2DGradEXT textureGrad`,`#define texture2DProjGradEXT textureProjGrad`,`#define textureCubeGradEXT textureGrad`].join(`
`)+`
`+_);let y=v+g+o,b=v+_+s,x=zl(i,i.VERTEX_SHADER,y),S=zl(i,i.FRAGMENT_SHADER,b);i.attachShader(h,x),i.attachShader(h,S),n.index0AttributeName===void 0?n.hasPositionAttribute===!0&&i.bindAttribLocation(h,0,`position`):i.bindAttribLocation(h,0,n.index0AttributeName),i.linkProgram(h);function C(t){if(e.debug.checkShaderErrors){let n=i.getProgramInfoLog(h)||``,r=i.getShaderInfoLog(x)||``,a=i.getShaderInfoLog(S)||``,o=n.trim(),s=r.trim(),c=a.trim(),l=!0,u=!0;if(i.getProgramParameter(h,i.LINK_STATUS)===!1)if(l=!1,typeof e.debug.onShaderError==`function`)e.debug.onShaderError(i,h,x,S);else{let e=Gl(i,x,`vertex`),n=Gl(i,S,`fragment`);V(`WebGLProgram: Shader Error `+i.getError()+` - VALIDATE_STATUS `+i.getProgramParameter(h,i.VALIDATE_STATUS)+`

Material Name: `+t.name+`
Material Type: `+t.type+`

Program Info Log: `+o+`
`+e+`
`+n)}else o===``?(s===``||c===``)&&(u=!1):B(`WebGLProgram: Program Info Log:`,o);u&&(t.diagnostics={runnable:l,programLog:o,vertexShader:{log:s,prefix:g},fragmentShader:{log:c,prefix:_}})}i.deleteShader(x),i.deleteShader(S),w=new Rl(i,h),T=$l(i,h)}let w;this.getUniforms=function(){return w===void 0&&C(this),w};let T;this.getAttributes=function(){return T===void 0&&C(this),T};let E=n.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return E===!1&&(E=i.getProgramParameter(h,Bl)),E},this.destroy=function(){r.releaseStatesOfProgram(this),i.deleteProgram(h),this.program=void 0},this.type=n.shaderType,this.name=n.shaderName,this.id=Vl++,this.cacheKey=t,this.usedTimes=1,this.program=h,this.vertexShader=x,this.fragmentShader=S,this}var xu=0,Su=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,n){let r=this._getShaderCacheForMaterial(e);return r.has(t)===!1&&(r.add(t),t.usedTimes++),r.has(n)===!1&&(r.add(n),n.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let e of t)e.usedTimes--,e.usedTimes===0&&this.shaderCache.delete(e.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){let t=this.shaderCache,n=t.get(e);return n===void 0&&(n=new Cu(e),t.set(e,n)),n}},Cu=class{constructor(e){this.id=xu++,this.code=e,this.usedTimes=0}};function wu(e){return e===1030||e===37490||e===36285}function Tu(e,t,n,r,i,a){let o=new bn,s=new Su,c=new Set,l=[],u=new Map,d=r.logarithmicDepthBuffer,f=r.precision,p={MeshDepthMaterial:`depth`,MeshDistanceMaterial:`distance`,MeshNormalMaterial:`normal`,MeshBasicMaterial:`basic`,MeshLambertMaterial:`lambert`,MeshPhongMaterial:`phong`,MeshToonMaterial:`toon`,MeshStandardMaterial:`physical`,MeshPhysicalMaterial:`physical`,MeshMatcapMaterial:`matcap`,LineBasicMaterial:`basic`,LineDashedMaterial:`dashed`,PointsMaterial:`points`,ShadowMaterial:`shadow`,SpriteMaterial:`sprite`};function m(e){return c.add(e),e===0?`uv`:`uv${e}`}function h(i,o,l,u,h,g){let _=u.fog,v=h.geometry,y=i.isMeshStandardMaterial||i.isMeshLambertMaterial||i.isMeshPhongMaterial?u.environment:null,b=i.isMeshStandardMaterial||i.isMeshLambertMaterial&&!i.envMap||i.isMeshPhongMaterial&&!i.envMap,x=t.get(i.envMap||y,b),S=x&&x.mapping===306?x.image.height:null,C=p[i.type];i.precision!==null&&(f=r.getMaxPrecision(i.precision),f!==i.precision&&B(`WebGLProgram.getParameters:`,i.precision,`not supported, using`,f,`instead.`));let w=v.morphAttributes.position||v.morphAttributes.normal||v.morphAttributes.color,T=w===void 0?0:w.length,E=0;v.morphAttributes.position!==void 0&&(E=1),v.morphAttributes.normal!==void 0&&(E=2),v.morphAttributes.color!==void 0&&(E=3);let D,O,k,A;if(C){let e=qs[C];D=e.vertexShader,O=e.fragmentShader}else{D=i.vertexShader,O=i.fragmentShader;let e=s.getVertexShaderStage(i),t=s.getFragmentShaderStage(i);s.update(i,e,t),k=e.id,A=t.id}let j=e.getRenderTarget(),M=e.state.buffers.depth.getReversed(),N=h.isInstancedMesh===!0,ee=h.isBatchedMesh===!0,te=!!i.map,P=!!i.matcap,ne=!!x,re=!!i.aoMap,ie=!!i.lightMap,ae=!!i.bumpMap&&i.wireframe===!1,oe=!!i.normalMap,se=!!i.displacementMap,ce=!!i.emissiveMap,F=!!i.metalnessMap,le=!!i.roughnessMap,ue=i.anisotropy>0,de=i.clearcoat>0,fe=i.dispersion>0,pe=i.iridescence>0,me=i.sheen>0,he=i.transmission>0,ge=ue&&!!i.anisotropyMap,_e=de&&!!i.clearcoatMap,ve=de&&!!i.clearcoatNormalMap,ye=de&&!!i.clearcoatRoughnessMap,be=pe&&!!i.iridescenceMap,xe=pe&&!!i.iridescenceThicknessMap,Se=me&&!!i.sheenColorMap,Ce=me&&!!i.sheenRoughnessMap,we=!!i.specularMap,Te=!!i.specularColorMap,Ee=!!i.specularIntensityMap,De=he&&!!i.transmissionMap,Oe=he&&!!i.thicknessMap,ke=!!i.gradientMap,Ae=!!i.alphaMap,je=i.alphaTest>0,Me=!!i.alphaHash,I=!!i.extensions,Ne=0;i.toneMapped&&(j===null||j.isXRRenderTarget===!0)&&(Ne=e.toneMapping);let Pe={shaderID:C,shaderType:i.type,shaderName:i.name,vertexShader:D,fragmentShader:O,defines:i.defines,customVertexShaderID:k,customFragmentShaderID:A,isRawShaderMaterial:i.isRawShaderMaterial===!0,glslVersion:i.glslVersion,precision:f,batching:ee,batchingColor:ee&&h._colorsTexture!==null,instancing:N,instancingColor:N&&h.instanceColor!==null,instancingMorph:N&&h.morphTexture!==null,outputColorSpace:j===null?e.outputColorSpace:j.isXRRenderTarget===!0?j.texture.colorSpace:Gt.workingColorSpace,alphaToCoverage:!!i.alphaToCoverage,map:te,matcap:P,envMap:ne,envMapMode:ne&&x.mapping,envMapCubeUVHeight:S,aoMap:re,lightMap:ie,bumpMap:ae,normalMap:oe,displacementMap:se,emissiveMap:ce,normalMapObjectSpace:oe&&i.normalMapType===1,normalMapTangentSpace:oe&&i.normalMapType===0,packedNormalMap:oe&&i.normalMapType===0&&wu(i.normalMap.format),metalnessMap:F,roughnessMap:le,anisotropy:ue,anisotropyMap:ge,clearcoat:de,clearcoatMap:_e,clearcoatNormalMap:ve,clearcoatRoughnessMap:ye,dispersion:fe,iridescence:pe,iridescenceMap:be,iridescenceThicknessMap:xe,sheen:me,sheenColorMap:Se,sheenRoughnessMap:Ce,specularMap:we,specularColorMap:Te,specularIntensityMap:Ee,transmission:he,transmissionMap:De,thicknessMap:Oe,gradientMap:ke,opaque:i.transparent===!1&&i.blending===1&&i.alphaToCoverage===!1,alphaMap:Ae,alphaTest:je,alphaHash:Me,combine:i.combine,mapUv:te&&m(i.map.channel),aoMapUv:re&&m(i.aoMap.channel),lightMapUv:ie&&m(i.lightMap.channel),bumpMapUv:ae&&m(i.bumpMap.channel),normalMapUv:oe&&m(i.normalMap.channel),displacementMapUv:se&&m(i.displacementMap.channel),emissiveMapUv:ce&&m(i.emissiveMap.channel),metalnessMapUv:F&&m(i.metalnessMap.channel),roughnessMapUv:le&&m(i.roughnessMap.channel),anisotropyMapUv:ge&&m(i.anisotropyMap.channel),clearcoatMapUv:_e&&m(i.clearcoatMap.channel),clearcoatNormalMapUv:ve&&m(i.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:ye&&m(i.clearcoatRoughnessMap.channel),iridescenceMapUv:be&&m(i.iridescenceMap.channel),iridescenceThicknessMapUv:xe&&m(i.iridescenceThicknessMap.channel),sheenColorMapUv:Se&&m(i.sheenColorMap.channel),sheenRoughnessMapUv:Ce&&m(i.sheenRoughnessMap.channel),specularMapUv:we&&m(i.specularMap.channel),specularColorMapUv:Te&&m(i.specularColorMap.channel),specularIntensityMapUv:Ee&&m(i.specularIntensityMap.channel),transmissionMapUv:De&&m(i.transmissionMap.channel),thicknessMapUv:Oe&&m(i.thicknessMap.channel),alphaMapUv:Ae&&m(i.alphaMap.channel),vertexTangents:!!v.attributes.tangent&&(oe||ue),vertexNormals:!!v.attributes.normal,vertexColors:i.vertexColors,vertexAlphas:i.vertexColors===!0&&!!v.attributes.color&&v.attributes.color.itemSize===4,pointsUvs:h.isPoints===!0&&!!v.attributes.uv&&(te||Ae),fog:!!_,useFog:i.fog===!0,fogExp2:!!_&&_.isFogExp2,flatShading:i.wireframe===!1&&(i.flatShading===!0||v.attributes.normal===void 0&&oe===!1&&(i.isMeshLambertMaterial||i.isMeshPhongMaterial||i.isMeshStandardMaterial||i.isMeshPhysicalMaterial)),sizeAttenuation:i.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:M,skinning:h.isSkinnedMesh===!0,hasPositionAttribute:v.attributes.position!==void 0,morphTargets:v.morphAttributes.position!==void 0,morphNormals:v.morphAttributes.normal!==void 0,morphColors:v.morphAttributes.color!==void 0,morphTargetsCount:T,morphTextureStride:E,numDirLights:o.directional.length,numPointLights:o.point.length,numSpotLights:o.spot.length,numSpotLightMaps:o.spotLightMap.length,numRectAreaLights:o.rectArea.length,numHemiLights:o.hemi.length,numDirLightShadows:o.directionalShadowMap.length,numPointLightShadows:o.pointShadowMap.length,numSpotLightShadows:o.spotShadowMap.length,numSpotLightShadowsWithMaps:o.numSpotLightShadowsWithMaps,numLightProbes:o.numLightProbes,numLightProbeGrids:g.length,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:i.dithering,shadowMapEnabled:e.shadowMap.enabled&&l.length>0,shadowMapType:e.shadowMap.type,toneMapping:Ne,decodeVideoTexture:te&&i.map.isVideoTexture===!0&&Gt.getTransfer(i.map.colorSpace)===`srgb`,decodeVideoTextureEmissive:ce&&i.emissiveMap.isVideoTexture===!0&&Gt.getTransfer(i.emissiveMap.colorSpace)===`srgb`,premultipliedAlpha:i.premultipliedAlpha,doubleSided:i.side===2,flipSided:i.side===1,useDepthPacking:i.depthPacking>=0,depthPacking:i.depthPacking||0,index0AttributeName:i.index0AttributeName,extensionClipCullDistance:I&&i.extensions.clipCullDistance===!0&&n.has(`WEBGL_clip_cull_distance`),extensionMultiDraw:(I&&i.extensions.multiDraw===!0||ee)&&n.has(`WEBGL_multi_draw`),rendererExtensionParallelShaderCompile:n.has(`KHR_parallel_shader_compile`),customProgramCacheKey:i.customProgramCacheKey()};return Pe.vertexUv1s=c.has(1),Pe.vertexUv2s=c.has(2),Pe.vertexUv3s=c.has(3),c.clear(),Pe}function g(t){let n=[];if(t.shaderID?n.push(t.shaderID):(n.push(t.customVertexShaderID),n.push(t.customFragmentShaderID)),t.defines!==void 0)for(let e in t.defines)n.push(e),n.push(t.defines[e]);return t.isRawShaderMaterial===!1&&(_(n,t),v(n,t),n.push(e.outputColorSpace)),n.push(t.customProgramCacheKey),n.join()}function _(e,t){e.push(t.precision),e.push(t.outputColorSpace),e.push(t.envMapMode),e.push(t.envMapCubeUVHeight),e.push(t.mapUv),e.push(t.alphaMapUv),e.push(t.lightMapUv),e.push(t.aoMapUv),e.push(t.bumpMapUv),e.push(t.normalMapUv),e.push(t.displacementMapUv),e.push(t.emissiveMapUv),e.push(t.metalnessMapUv),e.push(t.roughnessMapUv),e.push(t.anisotropyMapUv),e.push(t.clearcoatMapUv),e.push(t.clearcoatNormalMapUv),e.push(t.clearcoatRoughnessMapUv),e.push(t.iridescenceMapUv),e.push(t.iridescenceThicknessMapUv),e.push(t.sheenColorMapUv),e.push(t.sheenRoughnessMapUv),e.push(t.specularMapUv),e.push(t.specularColorMapUv),e.push(t.specularIntensityMapUv),e.push(t.transmissionMapUv),e.push(t.thicknessMapUv),e.push(t.combine),e.push(t.fogExp2),e.push(t.sizeAttenuation),e.push(t.morphTargetsCount),e.push(t.morphAttributeCount),e.push(t.numDirLights),e.push(t.numPointLights),e.push(t.numSpotLights),e.push(t.numSpotLightMaps),e.push(t.numHemiLights),e.push(t.numRectAreaLights),e.push(t.numDirLightShadows),e.push(t.numPointLightShadows),e.push(t.numSpotLightShadows),e.push(t.numSpotLightShadowsWithMaps),e.push(t.numLightProbes),e.push(t.shadowMapType),e.push(t.toneMapping),e.push(t.numClippingPlanes),e.push(t.numClipIntersection),e.push(t.depthPacking)}function v(e,t){o.disableAll(),t.instancing&&o.enable(0),t.instancingColor&&o.enable(1),t.instancingMorph&&o.enable(2),t.matcap&&o.enable(3),t.envMap&&o.enable(4),t.normalMapObjectSpace&&o.enable(5),t.normalMapTangentSpace&&o.enable(6),t.clearcoat&&o.enable(7),t.iridescence&&o.enable(8),t.alphaTest&&o.enable(9),t.vertexColors&&o.enable(10),t.vertexAlphas&&o.enable(11),t.vertexUv1s&&o.enable(12),t.vertexUv2s&&o.enable(13),t.vertexUv3s&&o.enable(14),t.vertexTangents&&o.enable(15),t.anisotropy&&o.enable(16),t.alphaHash&&o.enable(17),t.batching&&o.enable(18),t.dispersion&&o.enable(19),t.batchingColor&&o.enable(20),t.gradientMap&&o.enable(21),t.packedNormalMap&&o.enable(22),t.vertexNormals&&o.enable(23),e.push(o.mask),o.disableAll(),t.fog&&o.enable(0),t.useFog&&o.enable(1),t.flatShading&&o.enable(2),t.logarithmicDepthBuffer&&o.enable(3),t.reversedDepthBuffer&&o.enable(4),t.skinning&&o.enable(5),t.morphTargets&&o.enable(6),t.morphNormals&&o.enable(7),t.morphColors&&o.enable(8),t.premultipliedAlpha&&o.enable(9),t.shadowMapEnabled&&o.enable(10),t.doubleSided&&o.enable(11),t.flipSided&&o.enable(12),t.useDepthPacking&&o.enable(13),t.dithering&&o.enable(14),t.transmission&&o.enable(15),t.sheen&&o.enable(16),t.opaque&&o.enable(17),t.pointsUvs&&o.enable(18),t.decodeVideoTexture&&o.enable(19),t.decodeVideoTextureEmissive&&o.enable(20),t.alphaToCoverage&&o.enable(21),t.numLightProbeGrids>0&&o.enable(22),t.hasPositionAttribute&&o.enable(23),e.push(o.mask)}function y(e){let t=p[e.type],n;if(t){let e=qs[t];n=qa.clone(e.uniforms)}else n=e.uniforms;return n}function b(t,n){let r=u.get(n);return r===void 0?(r=new bu(e,n,t,i),l.push(r),u.set(n,r)):++r.usedTimes,r}function x(e){if(--e.usedTimes===0){let t=l.indexOf(e);l[t]=l[l.length-1],l.pop(),u.delete(e.cacheKey),e.destroy()}}function S(e){s.remove(e)}function C(){s.dispose()}return{getParameters:h,getProgramCacheKey:g,getUniforms:y,acquireProgram:b,releaseProgram:x,releaseShaderCache:S,programs:l,dispose:C}}function Eu(){let e=new WeakMap;function t(t){return e.has(t)}function n(t){let n=e.get(t);return n===void 0&&(n={},e.set(t,n)),n}function r(t){e.delete(t)}function i(t,n,r){e.get(t)[n]=r}function a(){e=new WeakMap}return{has:t,get:n,remove:r,update:i,dispose:a}}function Du(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.material.id===t.material.id?e.materialVariant===t.materialVariant?e.z===t.z?e.id-t.id:e.z-t.z:e.materialVariant-t.materialVariant:e.material.id-t.material.id:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function Ou(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.z===t.z?e.id-t.id:t.z-e.z:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function ku(){let e=[],t=0,n=[],r=[],i=[];function a(){t=0,n.length=0,r.length=0,i.length=0}function o(e){let t=0;return e.isInstancedMesh&&(t+=2),e.isSkinnedMesh&&(t+=1),t}function s(n,r,i,a,s,c){let l=e[t];return l===void 0?(l={id:n.id,object:n,geometry:r,material:i,materialVariant:o(n),groupOrder:a,renderOrder:n.renderOrder,z:s,group:c},e[t]=l):(l.id=n.id,l.object=n,l.geometry=r,l.material=i,l.materialVariant=o(n),l.groupOrder=a,l.renderOrder=n.renderOrder,l.z=s,l.group=c),t++,l}function c(e,t,a,o,c,l){let u=s(e,t,a,o,c,l);a.transmission>0?r.push(u):a.transparent===!0?i.push(u):n.push(u)}function l(e,t,a,o,c,l){let u=s(e,t,a,o,c,l);a.transmission>0?r.unshift(u):a.transparent===!0?i.unshift(u):n.unshift(u)}function u(e,t,a){n.length>1&&n.sort(e||Du),r.length>1&&r.sort(t||Ou),i.length>1&&i.sort(t||Ou),a&&(n.reverse(),r.reverse(),i.reverse())}function d(){for(let n=t,r=e.length;n<r;n++){let t=e[n];if(t.id===null)break;t.id=null,t.object=null,t.geometry=null,t.material=null,t.group=null}}return{opaque:n,transmissive:r,transparent:i,init:a,push:c,unshift:l,finish:d,sort:u}}function Au(){let e=new WeakMap;function t(t,n){let r=e.get(t),i;return r===void 0?(i=new ku,e.set(t,[i])):n>=r.length?(i=new ku,r.push(i)):i=r[n],i}function n(){e=new WeakMap}return{get:t,dispose:n}}function ju(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case`DirectionalLight`:n={direction:new U,color:new G};break;case`SpotLight`:n={position:new U,direction:new U,color:new G,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case`PointLight`:n={position:new U,color:new G,distance:0,decay:0};break;case`HemisphereLight`:n={direction:new U,skyColor:new G,groundColor:new G};break;case`RectAreaLight`:n={color:new G,position:new U,halfWidth:new U,halfHeight:new U}}return e[t.id]=n,n}}}function Mu(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case`DirectionalLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new H};break;case`SpotLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new H};break;case`PointLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new H,shadowCameraNear:1,shadowCameraFar:1e3}}return e[t.id]=n,n}}}var Nu=0;function Pu(e,t){return(t.castShadow?2:0)-(e.castShadow?2:0)+ +!!t.map-!!e.map}function Fu(e){let t=new ju,n=Mu(),r={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let e=0;e<9;e++)r.probe.push(new U);let i=new U,a=new ln,o=new ln;function s(i){let a=0,o=0,s=0;for(let e=0;e<9;e++)r.probe[e].set(0,0,0);let c=0,l=0,u=0,d=0,f=0,p=0,m=0,h=0,g=0,_=0,v=0;i.sort(Pu);for(let e=0,y=i.length;e<y;e++){let y=i[e],b=y.color,x=y.intensity,S=y.distance,C=null;if(y.shadow&&y.shadow.map&&(C=y.shadow.map.texture.format===1030?y.shadow.map.texture:y.shadow.map.depthTexture||y.shadow.map.texture),y.isAmbientLight)a+=b.r*x,o+=b.g*x,s+=b.b*x;else if(y.isLightProbe){for(let e=0;e<9;e++)r.probe[e].addScaledVector(y.sh.coefficients[e],x);v++}else if(y.isDirectionalLight){let e=t.get(y);if(e.color.copy(y.color).multiplyScalar(y.intensity),y.castShadow){let e=y.shadow,t=n.get(y);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize=e.mapSize,r.directionalShadow[c]=t,r.directionalShadowMap[c]=C,r.directionalShadowMatrix[c]=y.shadow.matrix,p++}r.directional[c]=e,c++}else if(y.isSpotLight){let e=t.get(y);e.position.setFromMatrixPosition(y.matrixWorld),e.color.copy(b).multiplyScalar(x),e.distance=S,e.coneCos=Math.cos(y.angle),e.penumbraCos=Math.cos(y.angle*(1-y.penumbra)),e.decay=y.decay,r.spot[u]=e;let i=y.shadow;if(y.map&&(r.spotLightMap[g]=y.map,g++,i.updateMatrices(y),y.castShadow&&_++),r.spotLightMatrix[u]=i.matrix,y.castShadow){let e=n.get(y);e.shadowIntensity=i.intensity,e.shadowBias=i.bias,e.shadowNormalBias=i.normalBias,e.shadowRadius=i.radius,e.shadowMapSize=i.mapSize,r.spotShadow[u]=e,r.spotShadowMap[u]=C,h++}u++}else if(y.isRectAreaLight){let e=t.get(y);e.color.copy(b).multiplyScalar(x),e.halfWidth.set(y.width*.5,0,0),e.halfHeight.set(0,y.height*.5,0),r.rectArea[d]=e,d++}else if(y.isPointLight){let e=t.get(y);if(e.color.copy(y.color).multiplyScalar(y.intensity),e.distance=y.distance,e.decay=y.decay,y.castShadow){let e=y.shadow,t=n.get(y);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize=e.mapSize,t.shadowCameraNear=e.camera.near,t.shadowCameraFar=e.camera.far,r.pointShadow[l]=t,r.pointShadowMap[l]=C,r.pointShadowMatrix[l]=y.shadow.matrix,m++}r.point[l]=e,l++}else if(y.isHemisphereLight){let e=t.get(y);e.skyColor.copy(y.color).multiplyScalar(x),e.groundColor.copy(y.groundColor).multiplyScalar(x),r.hemi[f]=e,f++}}d>0&&(e.has(`OES_texture_float_linear`)===!0?(r.rectAreaLTC1=J.LTC_FLOAT_1,r.rectAreaLTC2=J.LTC_FLOAT_2):(r.rectAreaLTC1=J.LTC_HALF_1,r.rectAreaLTC2=J.LTC_HALF_2)),r.ambient[0]=a,r.ambient[1]=o,r.ambient[2]=s;let y=r.hash;(y.directionalLength!==c||y.pointLength!==l||y.spotLength!==u||y.rectAreaLength!==d||y.hemiLength!==f||y.numDirectionalShadows!==p||y.numPointShadows!==m||y.numSpotShadows!==h||y.numSpotMaps!==g||y.numLightProbes!==v)&&(r.directional.length=c,r.spot.length=u,r.rectArea.length=d,r.point.length=l,r.hemi.length=f,r.directionalShadow.length=p,r.directionalShadowMap.length=p,r.pointShadow.length=m,r.pointShadowMap.length=m,r.spotShadow.length=h,r.spotShadowMap.length=h,r.directionalShadowMatrix.length=p,r.pointShadowMatrix.length=m,r.spotLightMatrix.length=h+g-_,r.spotLightMap.length=g,r.numSpotLightShadowsWithMaps=_,r.numLightProbes=v,y.directionalLength=c,y.pointLength=l,y.spotLength=u,y.rectAreaLength=d,y.hemiLength=f,y.numDirectionalShadows=p,y.numPointShadows=m,y.numSpotShadows=h,y.numSpotMaps=g,y.numLightProbes=v,r.version=Nu++)}function c(e,t){let n=0,s=0,c=0,l=0,u=0,d=t.matrixWorldInverse;for(let t=0,f=e.length;t<f;t++){let f=e[t];if(f.isDirectionalLight){let e=r.directional[n];e.direction.setFromMatrixPosition(f.matrixWorld),i.setFromMatrixPosition(f.target.matrixWorld),e.direction.sub(i),e.direction.transformDirection(d),n++}else if(f.isSpotLight){let e=r.spot[c];e.position.setFromMatrixPosition(f.matrixWorld),e.position.applyMatrix4(d),e.direction.setFromMatrixPosition(f.matrixWorld),i.setFromMatrixPosition(f.target.matrixWorld),e.direction.sub(i),e.direction.transformDirection(d),c++}else if(f.isRectAreaLight){let e=r.rectArea[l];e.position.setFromMatrixPosition(f.matrixWorld),e.position.applyMatrix4(d),o.identity(),a.copy(f.matrixWorld),a.premultiply(d),o.extractRotation(a),e.halfWidth.set(f.width*.5,0,0),e.halfHeight.set(0,f.height*.5,0),e.halfWidth.applyMatrix4(o),e.halfHeight.applyMatrix4(o),l++}else if(f.isPointLight){let e=r.point[s];e.position.setFromMatrixPosition(f.matrixWorld),e.position.applyMatrix4(d),s++}else if(f.isHemisphereLight){let e=r.hemi[u];e.direction.setFromMatrixPosition(f.matrixWorld),e.direction.transformDirection(d),u++}}}return{setup:s,setupView:c,state:r}}function Iu(e){let t=new Fu(e),n=[],r=[],i=[];function a(e){d.camera=e,n.length=0,r.length=0,i.length=0}function o(e){n.push(e)}function s(e){r.push(e)}function c(e){i.push(e)}function l(){t.setup(n)}function u(e){t.setupView(n,e)}let d={lightsArray:n,shadowsArray:r,lightProbeGridArray:i,camera:null,lights:t,transmissionRenderTarget:{},textureUnits:0};return{init:a,state:d,setupLights:l,setupLightsView:u,pushLight:o,pushShadow:s,pushLightProbeGrid:c}}function Lu(e){let t=new WeakMap;function n(n,r=0){let i=t.get(n),a;return i===void 0?(a=new Iu(e),t.set(n,[a])):r>=i.length?(a=new Iu(e),i.push(a)):a=i[r],a}function r(){t=new WeakMap}return{get:n,dispose:r}}var Ru=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,zu=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,Bu=[new U(1,0,0),new U(-1,0,0),new U(0,1,0),new U(0,-1,0),new U(0,0,1),new U(0,0,-1)],Vu=[new U(0,-1,0),new U(0,-1,0),new U(0,0,1),new U(0,0,-1),new U(0,-1,0),new U(0,-1,0)],Hu=new ln,Uu=new U,Wu=new U;function Gu(e,t,n){let r=new sa,i=new H,a=new H,s=new nn,c=new to,u=new no,d={},f=n.maxTextureSize,p={0:1,1:0,2:2},m=new Xa({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new H},radius:{value:4}},vertexShader:Ru,fragmentShader:zu}),h=m.clone();h.defines.HORIZONTAL_PASS=1;let g=new Br;g.setAttribute(`position`,new Tr(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let _=new K(g,m),x=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=1;let S=this.type;this.render=function(t,n,c){if(x.enabled===!1||x.autoUpdate===!1&&x.needsUpdate===!1||t.length===0)return;this.type===2&&(B(`WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead.`),this.type=1);let u=e.getRenderTarget(),d=e.getActiveCubeFace(),p=e.getActiveMipmapLevel(),m=e.state;m.setBlending(0),m.buffers.depth.getReversed()===!0?m.buffers.color.setClear(0,0,0,0):m.buffers.color.setClear(1,1,1,1),m.buffers.depth.setTest(!0),m.setScissorTest(!1);let h=S!==this.type;h&&n.traverse(function(e){e.material&&(Array.isArray(e.material)?e.material.forEach(e=>e.needsUpdate=!0):e.material.needsUpdate=!0)});for(let u=0,d=t.length;u<d;u++){let d=t[u],p=d.shadow;if(p===void 0){B(`WebGLShadowMap:`,d,`has no shadow.`);continue}if(p.autoUpdate===!1&&p.needsUpdate===!1)continue;i.copy(p.mapSize);let g=p.getFrameExtents();i.multiply(g),a.copy(p.mapSize),(i.x>f||i.y>f)&&(i.x>f&&(a.x=Math.floor(f/g.x),i.x=a.x*g.x,p.mapSize.x=a.x),i.y>f&&(a.y=Math.floor(f/g.y),i.y=a.y*g.y,p.mapSize.y=a.y));let _=e.state.buffers.depth.getReversed();if(p.camera._reversedDepth=_,p.map===null||h===!0){if(p.map!==null&&(p.map.depthTexture!==null&&(p.map.depthTexture.dispose(),p.map.depthTexture=null),p.map.dispose()),this.type===3){if(d.isPointLight){B(`WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.`);continue}p.map=new an(i.x,i.y,{format:N,type:b,minFilter:l,magFilter:l,generateMipmaps:!1}),p.map.texture.name=d.name+`.shadowMap`,p.map.depthTexture=new ja(i.x,i.y,y),p.map.depthTexture.name=d.name+`.shadowMapDepth`,p.map.depthTexture.format=k,p.map.depthTexture.compareFunction=null,p.map.depthTexture.minFilter=o,p.map.depthTexture.magFilter=o}else d.isPointLight?(p.map=new Sc(i.x),p.map.depthTexture=new Ma(i.x,v)):(p.map=new an(i.x,i.y),p.map.depthTexture=new ja(i.x,i.y,v)),p.map.depthTexture.name=d.name+`.shadowMap`,p.map.depthTexture.format=k,this.type===1?(p.map.depthTexture.compareFunction=_?518:515,p.map.depthTexture.minFilter=l,p.map.depthTexture.magFilter=l):(p.map.depthTexture.compareFunction=null,p.map.depthTexture.minFilter=o,p.map.depthTexture.magFilter=o);p.camera.updateProjectionMatrix()}let x=p.map.isWebGLCubeRenderTarget?6:1;for(let t=0;t<x;t++){if(p.map.isWebGLCubeRenderTarget)e.setRenderTarget(p.map,t),e.clear();else{t===0&&(e.setRenderTarget(p.map),e.clear());let n=p.getViewport(t);s.set(a.x*n.x,a.y*n.y,a.x*n.z,a.y*n.w),m.viewport(s)}if(d.isPointLight){let e=p.camera,n=p.matrix,r=d.distance||e.far;r!==e.far&&(e.far=r,e.updateProjectionMatrix()),Uu.setFromMatrixPosition(d.matrixWorld),e.position.copy(Uu),Wu.copy(e.position),Wu.add(Bu[t]),e.up.copy(Vu[t]),e.lookAt(Wu),e.updateMatrixWorld(),n.makeTranslation(-Uu.x,-Uu.y,-Uu.z),Hu.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),p._frustum.setFromProjectionMatrix(Hu,e.coordinateSystem,e.reversedDepth)}else p.updateMatrices(d);r=p.getFrustum(),T(n,c,p.camera,d,this.type)}p.isPointLightShadow!==!0&&this.type===3&&C(p,c),p.needsUpdate=!1}S=this.type,x.needsUpdate=!1,e.setRenderTarget(u,d,p)};function C(n,r){let a=t.update(_);m.defines.VSM_SAMPLES!==n.blurSamples&&(m.defines.VSM_SAMPLES=n.blurSamples,h.defines.VSM_SAMPLES=n.blurSamples,m.needsUpdate=!0,h.needsUpdate=!0),n.mapPass===null&&(n.mapPass=new an(i.x,i.y,{format:N,type:b})),m.uniforms.shadow_pass.value=n.map.depthTexture,m.uniforms.resolution.value=n.mapSize,m.uniforms.radius.value=n.radius,e.setRenderTarget(n.mapPass),e.clear(),e.renderBufferDirect(r,null,a,m,_,null),h.uniforms.shadow_pass.value=n.mapPass.texture,h.uniforms.resolution.value=n.mapSize,h.uniforms.radius.value=n.radius,e.setRenderTarget(n.map),e.clear(),e.renderBufferDirect(r,null,a,h,_,null)}function w(t,n,r,i){let a=null,o=r.isPointLight===!0?t.customDistanceMaterial:t.customDepthMaterial;if(o!==void 0)a=o;else if(a=r.isPointLight===!0?u:c,e.localClippingEnabled&&n.clipShadows===!0&&Array.isArray(n.clippingPlanes)&&n.clippingPlanes.length!==0||n.displacementMap&&n.displacementScale!==0||n.alphaMap&&n.alphaTest>0||n.map&&n.alphaTest>0||n.alphaToCoverage===!0){let e=a.uuid,t=n.uuid,r=d[e];r===void 0&&(r={},d[e]=r);let i=r[t];i===void 0&&(i=a.clone(),r[t]=i,n.addEventListener(`dispose`,E)),a=i}if(a.visible=n.visible,a.wireframe=n.wireframe,i===3?a.side=n.shadowSide===null?n.side:n.shadowSide:a.side=n.shadowSide===null?p[n.side]:n.shadowSide,a.alphaMap=n.alphaMap,a.alphaTest=n.alphaToCoverage===!0?.5:n.alphaTest,a.map=n.map,a.clipShadows=n.clipShadows,a.clippingPlanes=n.clippingPlanes,a.clipIntersection=n.clipIntersection,a.displacementMap=n.displacementMap,a.displacementScale=n.displacementScale,a.displacementBias=n.displacementBias,a.wireframeLinewidth=n.wireframeLinewidth,a.linewidth=n.linewidth,r.isPointLight===!0&&a.isMeshDistanceMaterial===!0){let t=e.properties.get(a);t.light=r}return a}function T(n,i,a,o,s){if(n.visible===!1)return;if(n.layers.test(i.layers)&&(n.isMesh||n.isLine||n.isPoints)&&(n.castShadow||n.receiveShadow&&s===3)&&(!n.frustumCulled||r.intersectsObject(n))){n.modelViewMatrix.multiplyMatrices(a.matrixWorldInverse,n.matrixWorld);let r=t.update(n),c=n.material;if(Array.isArray(c)){let t=r.groups;for(let l=0,u=t.length;l<u;l++){let u=t[l],d=c[u.materialIndex];if(d&&d.visible){let t=w(n,d,o,s);n.onBeforeShadow(e,n,i,a,r,t,u),e.renderBufferDirect(a,null,r,t,n,u),n.onAfterShadow(e,n,i,a,r,t,u)}}}else if(c.visible){let t=w(n,c,o,s);n.onBeforeShadow(e,n,i,a,r,t,null),e.renderBufferDirect(a,null,r,t,n,null),n.onAfterShadow(e,n,i,a,r,t,null)}}let c=n.children;for(let e=0,t=c.length;e<t;e++)T(c[e],i,a,o,s)}function E(e){e.target.removeEventListener(`dispose`,E);for(let t in d){let n=d[t],r=e.target.uuid;r in n&&(n[r].dispose(),delete n[r])}}}function Ku(e,t){function n(){let t=!1,n=new nn,r=null,i=new nn(0,0,0,0);return{setMask:function(n){r!==n&&!t&&(e.colorMask(n,n,n,n),r=n)},setLocked:function(e){t=e},setClear:function(t,r,a,o,s){s===!0&&(t*=o,r*=o,a*=o),n.set(t,r,a,o),i.equals(n)===!1&&(e.clearColor(t,r,a,o),i.copy(n))},reset:function(){t=!1,r=null,i.set(-1,0,0,0)}}}function r(){let n=!1,r=!1,i=null,a=null,o=null;return{setReversed:function(e){if(r!==e){let n=t.get(`EXT_clip_control`);e?n.clipControlEXT(n.LOWER_LEFT_EXT,n.ZERO_TO_ONE_EXT):n.clipControlEXT(n.LOWER_LEFT_EXT,n.NEGATIVE_ONE_TO_ONE_EXT),r=e;let i=o;o=null,this.setClear(i)}},getReversed:function(){return r},setTest:function(t){t?F(e.DEPTH_TEST):le(e.DEPTH_TEST)},setMask:function(t){i!==t&&!n&&(e.depthMask(t),i=t)},setFunc:function(t){if(r&&(t=lt[t]),a!==t){switch(t){case 0:e.depthFunc(e.NEVER);break;case 1:e.depthFunc(e.ALWAYS);break;case 2:e.depthFunc(e.LESS);break;case 3:e.depthFunc(e.LEQUAL);break;case 4:e.depthFunc(e.EQUAL);break;case 5:e.depthFunc(e.GEQUAL);break;case 6:e.depthFunc(e.GREATER);break;case 7:e.depthFunc(e.NOTEQUAL);break;default:e.depthFunc(e.LEQUAL)}a=t}},setLocked:function(e){n=e},setClear:function(t){o!==t&&(o=t,r&&(t=1-t),e.clearDepth(t))},reset:function(){n=!1,i=null,a=null,o=null,r=!1}}}function i(){let t=!1,n=null,r=null,i=null,a=null,o=null,s=null,c=null,l=null;return{setTest:function(n){t||(n?F(e.STENCIL_TEST):le(e.STENCIL_TEST))},setMask:function(r){n!==r&&!t&&(e.stencilMask(r),n=r)},setFunc:function(t,n,o){(r!==t||i!==n||a!==o)&&(e.stencilFunc(t,n,o),r=t,i=n,a=o)},setOp:function(t,n,r){(o!==t||s!==n||c!==r)&&(e.stencilOp(t,n,r),o=t,s=n,c=r)},setLocked:function(e){t=e},setClear:function(t){l!==t&&(e.clearStencil(t),l=t)},reset:function(){t=!1,n=null,r=null,i=null,a=null,o=null,s=null,c=null,l=null}}}let a=new n,o=new r,s=new i,c=new WeakMap,l=new WeakMap,u={},d={},f={},p=new WeakMap,m=[],h=null,g=!1,_=null,v=null,y=null,b=null,x=null,S=null,C=null,w=new G(0,0,0),T=0,E=!1,D=null,O=null,k=null,A=null,j=null,M=e.getParameter(e.MAX_COMBINED_TEXTURE_IMAGE_UNITS),N=!1,ee=0,te=e.getParameter(e.VERSION);te.indexOf(`WebGL`)===-1?te.indexOf(`OpenGL ES`)!==-1&&(ee=parseFloat(/^OpenGL ES (\d)/.exec(te)[1]),N=ee>=2):(ee=parseFloat(/^WebGL (\d)/.exec(te)[1]),N=ee>=1);let P=null,ne={},re=e.getParameter(e.SCISSOR_BOX),ie=e.getParameter(e.VIEWPORT),ae=new nn().fromArray(re),oe=new nn().fromArray(ie);function se(t,n,r,i){let a=new Uint8Array(4),o=e.createTexture();e.bindTexture(t,o),e.texParameteri(t,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(t,e.TEXTURE_MAG_FILTER,e.NEAREST);for(let o=0;o<r;o++)t===e.TEXTURE_3D||t===e.TEXTURE_2D_ARRAY?e.texImage3D(n,0,e.RGBA,1,1,i,0,e.RGBA,e.UNSIGNED_BYTE,a):e.texImage2D(n+o,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,a);return o}let ce={};ce[e.TEXTURE_2D]=se(e.TEXTURE_2D,e.TEXTURE_2D,1),ce[e.TEXTURE_CUBE_MAP]=se(e.TEXTURE_CUBE_MAP,e.TEXTURE_CUBE_MAP_POSITIVE_X,6),ce[e.TEXTURE_2D_ARRAY]=se(e.TEXTURE_2D_ARRAY,e.TEXTURE_2D_ARRAY,1,1),ce[e.TEXTURE_3D]=se(e.TEXTURE_3D,e.TEXTURE_3D,1,1),a.setClear(0,0,0,1),o.setClear(1),s.setClear(0),F(e.DEPTH_TEST),o.setFunc(3),_e(!1),ve(1),F(e.CULL_FACE),he(0);function F(t){u[t]!==!0&&(e.enable(t),u[t]=!0)}function le(t){u[t]!==!1&&(e.disable(t),u[t]=!1)}function ue(t,n){return f[t]!==n&&(e.bindFramebuffer(t,n),f[t]=n,t===e.DRAW_FRAMEBUFFER&&(f[e.FRAMEBUFFER]=n),t===e.FRAMEBUFFER&&(f[e.DRAW_FRAMEBUFFER]=n),!0)}function de(t,n){let r=m,i=!1;if(t){r=p.get(n),r===void 0&&(r=[],p.set(n,r));let a=t.textures;if(r.length!==a.length||r[0]!==e.COLOR_ATTACHMENT0){for(let t=0,n=a.length;t<n;t++)r[t]=e.COLOR_ATTACHMENT0+t;r.length=a.length,i=!0}}else r[0]!==e.BACK&&(r[0]=e.BACK,i=!0);i&&e.drawBuffers(r)}function fe(t){return h!==t&&(e.useProgram(t),h=t,!0)}let pe={100:e.FUNC_ADD,101:e.FUNC_SUBTRACT,102:e.FUNC_REVERSE_SUBTRACT};pe[103]=e.MIN,pe[104]=e.MAX;let me={200:e.ZERO,201:e.ONE,202:e.SRC_COLOR,204:e.SRC_ALPHA,210:e.SRC_ALPHA_SATURATE,208:e.DST_COLOR,206:e.DST_ALPHA,203:e.ONE_MINUS_SRC_COLOR,205:e.ONE_MINUS_SRC_ALPHA,209:e.ONE_MINUS_DST_COLOR,207:e.ONE_MINUS_DST_ALPHA,211:e.CONSTANT_COLOR,212:e.ONE_MINUS_CONSTANT_COLOR,213:e.CONSTANT_ALPHA,214:e.ONE_MINUS_CONSTANT_ALPHA};function he(t,n,r,i,a,o,s,c,l,u){if(t===0){g===!0&&(le(e.BLEND),g=!1);return}if(g===!1&&(F(e.BLEND),g=!0),t!==5){if(t!==_||u!==E){if((v!==100||x!==100)&&(e.blendEquation(e.FUNC_ADD),v=100,x=100),u)switch(t){case 1:e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFunc(e.ONE,e.ONE);break;case 3:e.blendFuncSeparate(e.ZERO,e.ONE_MINUS_SRC_COLOR,e.ZERO,e.ONE);break;case 4:e.blendFuncSeparate(e.DST_COLOR,e.ONE_MINUS_SRC_ALPHA,e.ZERO,e.ONE);break;default:V(`WebGLState: Invalid blending: `,t)}else switch(t){case 1:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE,e.ONE,e.ONE);break;case 3:V(`WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true`);break;case 4:V(`WebGLState: MultiplyBlending requires material.premultipliedAlpha = true`);break;default:V(`WebGLState: Invalid blending: `,t)}y=null,b=null,S=null,C=null,w.set(0,0,0),T=0,_=t,E=u}return}a||=n,o||=r,s||=i,(n!==v||a!==x)&&(e.blendEquationSeparate(pe[n],pe[a]),v=n,x=a),(r!==y||i!==b||o!==S||s!==C)&&(e.blendFuncSeparate(me[r],me[i],me[o],me[s]),y=r,b=i,S=o,C=s),(c.equals(w)===!1||l!==T)&&(e.blendColor(c.r,c.g,c.b,l),w.copy(c),T=l),_=t,E=!1}function ge(t,n){t.side===2?le(e.CULL_FACE):F(e.CULL_FACE);let r=t.side===1;n&&(r=!r),_e(r),t.blending===1&&t.transparent===!1?he(0):he(t.blending,t.blendEquation,t.blendSrc,t.blendDst,t.blendEquationAlpha,t.blendSrcAlpha,t.blendDstAlpha,t.blendColor,t.blendAlpha,t.premultipliedAlpha),o.setFunc(t.depthFunc),o.setTest(t.depthTest),o.setMask(t.depthWrite),a.setMask(t.colorWrite);let i=t.stencilWrite;s.setTest(i),i&&(s.setMask(t.stencilWriteMask),s.setFunc(t.stencilFunc,t.stencilRef,t.stencilFuncMask),s.setOp(t.stencilFail,t.stencilZFail,t.stencilZPass)),be(t.polygonOffset,t.polygonOffsetFactor,t.polygonOffsetUnits),t.alphaToCoverage===!0?F(e.SAMPLE_ALPHA_TO_COVERAGE):le(e.SAMPLE_ALPHA_TO_COVERAGE)}function _e(t){D!==t&&(t?e.frontFace(e.CW):e.frontFace(e.CCW),D=t)}function ve(t){t===0?le(e.CULL_FACE):(F(e.CULL_FACE),t!==O&&(t===1?e.cullFace(e.BACK):t===2?e.cullFace(e.FRONT):e.cullFace(e.FRONT_AND_BACK))),O=t}function ye(t){t!==k&&(N&&e.lineWidth(t),k=t)}function be(t,n,r){t?(F(e.POLYGON_OFFSET_FILL),(A!==n||j!==r)&&(A=n,j=r,o.getReversed()&&(n=-n),e.polygonOffset(n,r))):le(e.POLYGON_OFFSET_FILL)}function xe(t){t?F(e.SCISSOR_TEST):le(e.SCISSOR_TEST)}function Se(t){t===void 0&&(t=e.TEXTURE0+M-1),P!==t&&(e.activeTexture(t),P=t)}function Ce(t,n,r){r===void 0&&(r=P===null?e.TEXTURE0+M-1:P);let i=ne[r];i===void 0&&(i={type:void 0,texture:void 0},ne[r]=i),(i.type!==t||i.texture!==n)&&(P!==r&&(e.activeTexture(r),P=r),e.bindTexture(t,n||ce[t]),i.type=t,i.texture=n)}function we(){let t=ne[P];t!==void 0&&t.type!==void 0&&(e.bindTexture(t.type,null),t.type=void 0,t.texture=void 0)}function Te(){try{e.compressedTexImage2D(...arguments)}catch(e){V(`WebGLState:`,e)}}function Ee(){try{e.compressedTexImage3D(...arguments)}catch(e){V(`WebGLState:`,e)}}function De(){try{e.texSubImage2D(...arguments)}catch(e){V(`WebGLState:`,e)}}function Oe(){try{e.texSubImage3D(...arguments)}catch(e){V(`WebGLState:`,e)}}function ke(){try{e.compressedTexSubImage2D(...arguments)}catch(e){V(`WebGLState:`,e)}}function Ae(){try{e.compressedTexSubImage3D(...arguments)}catch(e){V(`WebGLState:`,e)}}function je(){try{e.texStorage2D(...arguments)}catch(e){V(`WebGLState:`,e)}}function Me(){try{e.texStorage3D(...arguments)}catch(e){V(`WebGLState:`,e)}}function I(){try{e.texImage2D(...arguments)}catch(e){V(`WebGLState:`,e)}}function Ne(){try{e.texImage3D(...arguments)}catch(e){V(`WebGLState:`,e)}}function Pe(t){return d[t]===void 0?e.getParameter(t):d[t]}function Fe(t,n){d[t]!==n&&(e.pixelStorei(t,n),d[t]=n)}function L(t){ae.equals(t)===!1&&(e.scissor(t.x,t.y,t.z,t.w),ae.copy(t))}function Ie(t){oe.equals(t)===!1&&(e.viewport(t.x,t.y,t.z,t.w),oe.copy(t))}function R(t,n){let r=l.get(n);r===void 0&&(r=new WeakMap,l.set(n,r));let i=r.get(t);i===void 0&&(i=e.getUniformBlockIndex(n,t.name),r.set(t,i))}function z(t,n){let r=l.get(n).get(t);c.get(n)!==r&&(e.uniformBlockBinding(n,r,t.__bindingPointIndex),c.set(n,r))}function Le(){e.disable(e.BLEND),e.disable(e.CULL_FACE),e.disable(e.DEPTH_TEST),e.disable(e.POLYGON_OFFSET_FILL),e.disable(e.SCISSOR_TEST),e.disable(e.STENCIL_TEST),e.disable(e.SAMPLE_ALPHA_TO_COVERAGE),e.blendEquation(e.FUNC_ADD),e.blendFunc(e.ONE,e.ZERO),e.blendFuncSeparate(e.ONE,e.ZERO,e.ONE,e.ZERO),e.blendColor(0,0,0,0),e.colorMask(!0,!0,!0,!0),e.clearColor(0,0,0,0),e.depthMask(!0),e.depthFunc(e.LESS),o.setReversed(!1),e.clearDepth(1),e.stencilMask(4294967295),e.stencilFunc(e.ALWAYS,0,4294967295),e.stencilOp(e.KEEP,e.KEEP,e.KEEP),e.clearStencil(0),e.cullFace(e.BACK),e.frontFace(e.CCW),e.polygonOffset(0,0),e.activeTexture(e.TEXTURE0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),e.bindFramebuffer(e.READ_FRAMEBUFFER,null),e.useProgram(null),e.lineWidth(1),e.scissor(0,0,e.canvas.width,e.canvas.height),e.viewport(0,0,e.canvas.width,e.canvas.height),e.pixelStorei(e.PACK_ALIGNMENT,4),e.pixelStorei(e.UNPACK_ALIGNMENT,4),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,e.BROWSER_DEFAULT_WEBGL),e.pixelStorei(e.PACK_ROW_LENGTH,0),e.pixelStorei(e.PACK_SKIP_PIXELS,0),e.pixelStorei(e.PACK_SKIP_ROWS,0),e.pixelStorei(e.UNPACK_ROW_LENGTH,0),e.pixelStorei(e.UNPACK_IMAGE_HEIGHT,0),e.pixelStorei(e.UNPACK_SKIP_PIXELS,0),e.pixelStorei(e.UNPACK_SKIP_ROWS,0),e.pixelStorei(e.UNPACK_SKIP_IMAGES,0),u={},d={},P=null,ne={},f={},p=new WeakMap,m=[],h=null,g=!1,_=null,v=null,y=null,b=null,x=null,S=null,C=null,w=new G(0,0,0),T=0,E=!1,D=null,O=null,k=null,A=null,j=null,ae.set(0,0,e.canvas.width,e.canvas.height),oe.set(0,0,e.canvas.width,e.canvas.height),a.reset(),o.reset(),s.reset()}return{buffers:{color:a,depth:o,stencil:s},enable:F,disable:le,bindFramebuffer:ue,drawBuffers:de,useProgram:fe,setBlending:he,setMaterial:ge,setFlipSided:_e,setCullFace:ve,setLineWidth:ye,setPolygonOffset:be,setScissorTest:xe,activeTexture:Se,bindTexture:Ce,unbindTexture:we,compressedTexImage2D:Te,compressedTexImage3D:Ee,texImage2D:I,texImage3D:Ne,pixelStorei:Fe,getParameter:Pe,updateUBOMapping:R,uniformBlockBinding:z,texStorage2D:je,texStorage3D:Me,texSubImage2D:De,texSubImage3D:Oe,compressedTexSubImage2D:ke,compressedTexSubImage3D:Ae,scissor:L,viewport:Ie,reset:Le}}function qu(e,t,n,f,p,m,h){let g=t.has(`WEBGL_multisampled_render_to_texture`)?t.get(`WEBGL_multisampled_render_to_texture`):null,_=typeof navigator>`u`?!1:/OculusBrowser/g.test(navigator.userAgent),v=new H,y=new WeakMap,b=new Set,x,S=new WeakMap,C=!1;try{C=typeof OffscreenCanvas<`u`&&new OffscreenCanvas(1,1).getContext(`2d`)!==null}catch{}function w(e,t){return C?new OffscreenCanvas(e,t):nt(`canvas`)}function T(e,t,n){let r=1,i=Pe(e);if((i.width>n||i.height>n)&&(r=n/Math.max(i.width,i.height)),r<1)if(typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap||typeof VideoFrame<`u`&&e instanceof VideoFrame){let n=Math.floor(r*i.width),a=Math.floor(r*i.height);x===void 0&&(x=w(n,a));let o=t?w(n,a):x;return o.width=n,o.height=a,o.getContext(`2d`).drawImage(e,0,0,n,a),B(`WebGLRenderer: Texture has been resized from (`+i.width+`x`+i.height+`) to (`+n+`x`+a+`).`),o}else return`data`in e&&B(`WebGLRenderer: Image in DataTexture is too big (`+i.width+`x`+i.height+`).`),e;return e}function E(e){return e.generateMipmaps}function D(t){e.generateMipmap(t)}function O(t){return t.isWebGLCubeRenderTarget?e.TEXTURE_CUBE_MAP:t.isWebGL3DRenderTarget?e.TEXTURE_3D:t.isWebGLArrayRenderTarget||t.isCompressedArrayTexture?e.TEXTURE_2D_ARRAY:e.TEXTURE_2D}function k(n,r,i,a,o,s=!1){if(n!==null){if(e[n]!==void 0)return e[n];B(`WebGLRenderer: Attempt to use non-existing WebGL internal format '`+n+`'`)}let c;a&&(c=t.get(`EXT_texture_norm16`),c||B(`WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension`));let l=r;if(r===e.RED&&(i===e.FLOAT&&(l=e.R32F),i===e.HALF_FLOAT&&(l=e.R16F),i===e.UNSIGNED_BYTE&&(l=e.R8),i===e.UNSIGNED_SHORT&&c&&(l=c.R16_EXT),i===e.SHORT&&c&&(l=c.R16_SNORM_EXT)),r===e.RED_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.R8UI),i===e.UNSIGNED_SHORT&&(l=e.R16UI),i===e.UNSIGNED_INT&&(l=e.R32UI),i===e.BYTE&&(l=e.R8I),i===e.SHORT&&(l=e.R16I),i===e.INT&&(l=e.R32I)),r===e.RG&&(i===e.FLOAT&&(l=e.RG32F),i===e.HALF_FLOAT&&(l=e.RG16F),i===e.UNSIGNED_BYTE&&(l=e.RG8),i===e.UNSIGNED_SHORT&&c&&(l=c.RG16_EXT),i===e.SHORT&&c&&(l=c.RG16_SNORM_EXT)),r===e.RG_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.RG8UI),i===e.UNSIGNED_SHORT&&(l=e.RG16UI),i===e.UNSIGNED_INT&&(l=e.RG32UI),i===e.BYTE&&(l=e.RG8I),i===e.SHORT&&(l=e.RG16I),i===e.INT&&(l=e.RG32I)),r===e.RGB_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.RGB8UI),i===e.UNSIGNED_SHORT&&(l=e.RGB16UI),i===e.UNSIGNED_INT&&(l=e.RGB32UI),i===e.BYTE&&(l=e.RGB8I),i===e.SHORT&&(l=e.RGB16I),i===e.INT&&(l=e.RGB32I)),r===e.RGBA_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.RGBA8UI),i===e.UNSIGNED_SHORT&&(l=e.RGBA16UI),i===e.UNSIGNED_INT&&(l=e.RGBA32UI),i===e.BYTE&&(l=e.RGBA8I),i===e.SHORT&&(l=e.RGBA16I),i===e.INT&&(l=e.RGBA32I)),r===e.RGB&&(i===e.UNSIGNED_SHORT&&c&&(l=c.RGB16_EXT),i===e.SHORT&&c&&(l=c.RGB16_SNORM_EXT),i===e.UNSIGNED_INT_5_9_9_9_REV&&(l=e.RGB9_E5),i===e.UNSIGNED_INT_10F_11F_11F_REV&&(l=e.R11F_G11F_B10F)),r===e.RGBA){let t=s?qe:Gt.getTransfer(o);i===e.FLOAT&&(l=e.RGBA32F),i===e.HALF_FLOAT&&(l=e.RGBA16F),i===e.UNSIGNED_BYTE&&(l=t===`srgb`?e.SRGB8_ALPHA8:e.RGBA8),i===e.UNSIGNED_SHORT&&c&&(l=c.RGBA16_EXT),i===e.SHORT&&c&&(l=c.RGBA16_SNORM_EXT),i===e.UNSIGNED_SHORT_4_4_4_4&&(l=e.RGBA4),i===e.UNSIGNED_SHORT_5_5_5_1&&(l=e.RGB5_A1)}return(l===e.R16F||l===e.R32F||l===e.RG16F||l===e.RG32F||l===e.RGBA16F||l===e.RGBA32F)&&t.get(`EXT_color_buffer_float`),l}function j(t,n){let r;return t?n===null||n===1014||n===1020?r=e.DEPTH24_STENCIL8:n===1015?r=e.DEPTH32F_STENCIL8:n===1012&&(r=e.DEPTH24_STENCIL8,B(`DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.`)):n===null||n===1014||n===1020?r=e.DEPTH_COMPONENT24:n===1015?r=e.DEPTH_COMPONENT32F:n===1012&&(r=e.DEPTH_COMPONENT16),r}function M(e,t){return E(e)===!0||e.isFramebufferTexture&&e.minFilter!==1003&&e.minFilter!==1006?Math.log2(Math.max(t.width,t.height))+1:e.mipmaps!==void 0&&e.mipmaps.length>0?e.mipmaps.length:e.isCompressedTexture&&Array.isArray(e.image)?t.mipmaps.length:1}function N(e){let t=e.target;t.removeEventListener(`dispose`,N),te(t),t.isVideoTexture&&y.delete(t),t.isHTMLTexture&&b.delete(t)}function ee(e){let t=e.target;t.removeEventListener(`dispose`,ee),ne(t)}function te(e){let t=f.get(e);if(t.__webglInit===void 0)return;let n=e.source,r=S.get(n);if(r){let i=r[t.__cacheKey];i.usedTimes--,i.usedTimes===0&&P(e),Object.keys(r).length===0&&S.delete(n)}f.remove(e)}function P(t){let n=f.get(t);e.deleteTexture(n.__webglTexture);let r=t.source,i=S.get(r);delete i[n.__cacheKey],h.memory.textures--}function ne(t){let n=f.get(t);if(t.depthTexture&&(t.depthTexture.dispose(),f.remove(t.depthTexture)),t.isWebGLCubeRenderTarget)for(let t=0;t<6;t++){if(Array.isArray(n.__webglFramebuffer[t]))for(let r=0;r<n.__webglFramebuffer[t].length;r++)e.deleteFramebuffer(n.__webglFramebuffer[t][r]);else e.deleteFramebuffer(n.__webglFramebuffer[t]);n.__webglDepthbuffer&&e.deleteRenderbuffer(n.__webglDepthbuffer[t])}else{if(Array.isArray(n.__webglFramebuffer))for(let t=0;t<n.__webglFramebuffer.length;t++)e.deleteFramebuffer(n.__webglFramebuffer[t]);else e.deleteFramebuffer(n.__webglFramebuffer);if(n.__webglDepthbuffer&&e.deleteRenderbuffer(n.__webglDepthbuffer),n.__webglMultisampledFramebuffer&&e.deleteFramebuffer(n.__webglMultisampledFramebuffer),n.__webglColorRenderbuffer)for(let t=0;t<n.__webglColorRenderbuffer.length;t++)n.__webglColorRenderbuffer[t]&&e.deleteRenderbuffer(n.__webglColorRenderbuffer[t]);n.__webglDepthRenderbuffer&&e.deleteRenderbuffer(n.__webglDepthRenderbuffer)}let r=t.textures;for(let t=0,n=r.length;t<n;t++){let n=f.get(r[t]);n.__webglTexture&&(e.deleteTexture(n.__webglTexture),h.memory.textures--),f.remove(r[t])}f.remove(t)}let re=0;function ie(){re=0}function ae(){return re}function oe(e){re=e}function se(){let e=re;return e>=p.maxTextures&&B(`WebGLTextures: Trying to use `+e+` texture units while this GPU supports only `+p.maxTextures),re+=1,e}function ce(e){let t=[];return t.push(e.wrapS),t.push(e.wrapT),t.push(e.wrapR||0),t.push(e.magFilter),t.push(e.minFilter),t.push(e.anisotropy),t.push(e.internalFormat),t.push(e.format),t.push(e.type),t.push(e.generateMipmaps),t.push(e.premultiplyAlpha),t.push(e.flipY),t.push(e.unpackAlignment),t.push(e.colorSpace),t.join()}function F(t,r){let i=f.get(t);if(t.isVideoTexture&&I(t),t.isRenderTargetTexture===!1&&t.isExternalTexture!==!0&&t.version>0&&i.__version!==t.version){let e=t.image;if(e===null)B(`WebGLRenderer: Texture marked for update but no image data found.`);else if(e.complete===!1)B(`WebGLRenderer: Texture marked for update but image is incomplete`);else{ye(i,t,r);return}}else t.isExternalTexture&&(i.__webglTexture=t.sourceTexture?t.sourceTexture:null);n.bindTexture(e.TEXTURE_2D,i.__webglTexture,e.TEXTURE0+r)}function le(t,r){let i=f.get(t);if(t.isRenderTargetTexture===!1&&t.version>0&&i.__version!==t.version){ye(i,t,r);return}t.isExternalTexture&&(i.__webglTexture=t.sourceTexture?t.sourceTexture:null),n.bindTexture(e.TEXTURE_2D_ARRAY,i.__webglTexture,e.TEXTURE0+r)}function ue(t,r){let i=f.get(t);if(t.isRenderTargetTexture===!1&&t.version>0&&i.__version!==t.version){ye(i,t,r);return}n.bindTexture(e.TEXTURE_3D,i.__webglTexture,e.TEXTURE0+r)}function de(t,r){let i=f.get(t);if(t.isCubeDepthTexture!==!0&&t.version>0&&i.__version!==t.version){be(i,t,r);return}n.bindTexture(e.TEXTURE_CUBE_MAP,i.__webglTexture,e.TEXTURE0+r)}let fe={[r]:e.REPEAT,[i]:e.CLAMP_TO_EDGE,[a]:e.MIRRORED_REPEAT},pe={[o]:e.NEAREST,[s]:e.NEAREST_MIPMAP_NEAREST,[c]:e.NEAREST_MIPMAP_LINEAR,[l]:e.LINEAR,[u]:e.LINEAR_MIPMAP_NEAREST,[d]:e.LINEAR_MIPMAP_LINEAR},me={512:e.NEVER,519:e.ALWAYS,513:e.LESS,515:e.LEQUAL,514:e.EQUAL,518:e.GEQUAL,516:e.GREATER,517:e.NOTEQUAL};function he(n,r){if(r.type===1015&&t.has(`OES_texture_float_linear`)===!1&&(r.magFilter===1006||r.magFilter===1007||r.magFilter===1005||r.magFilter===1008||r.minFilter===1006||r.minFilter===1007||r.minFilter===1005||r.minFilter===1008)&&B(`WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device.`),e.texParameteri(n,e.TEXTURE_WRAP_S,fe[r.wrapS]),e.texParameteri(n,e.TEXTURE_WRAP_T,fe[r.wrapT]),(n===e.TEXTURE_3D||n===e.TEXTURE_2D_ARRAY)&&e.texParameteri(n,e.TEXTURE_WRAP_R,fe[r.wrapR]),e.texParameteri(n,e.TEXTURE_MAG_FILTER,pe[r.magFilter]),e.texParameteri(n,e.TEXTURE_MIN_FILTER,pe[r.minFilter]),r.compareFunction&&(e.texParameteri(n,e.TEXTURE_COMPARE_MODE,e.COMPARE_REF_TO_TEXTURE),e.texParameteri(n,e.TEXTURE_COMPARE_FUNC,me[r.compareFunction])),t.has(`EXT_texture_filter_anisotropic`)===!0){if(r.magFilter===1003||r.minFilter!==1005&&r.minFilter!==1008||r.type===1015&&t.has(`OES_texture_float_linear`)===!1)return;if(r.anisotropy>1||f.get(r).__currentAnisotropy){let i=t.get(`EXT_texture_filter_anisotropic`);e.texParameterf(n,i.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(r.anisotropy,p.getMaxAnisotropy())),f.get(r).__currentAnisotropy=r.anisotropy}}}function ge(t,n){let r=!1;t.__webglInit===void 0&&(t.__webglInit=!0,n.addEventListener(`dispose`,N));let i=n.source,a=S.get(i);a===void 0&&(a={},S.set(i,a));let o=ce(n);if(o!==t.__cacheKey){a[o]===void 0&&(a[o]={texture:e.createTexture(),usedTimes:0},h.memory.textures++,r=!0),a[o].usedTimes++;let i=a[t.__cacheKey];i!==void 0&&(a[t.__cacheKey].usedTimes--,i.usedTimes===0&&P(n)),t.__cacheKey=o,t.__webglTexture=a[o].texture}return r}function _e(e,t,n){return Math.floor(Math.floor(e/n)/t)}function ve(t,r,i,a){let o=t.updateRanges;if(o.length===0)n.texSubImage2D(e.TEXTURE_2D,0,0,0,r.width,r.height,i,a,r.data);else{o.sort((e,t)=>e.start-t.start);let s=0;for(let e=1;e<o.length;e++){let t=o[s],n=o[e],i=t.start+t.count,a=_e(n.start,r.width,4),c=_e(t.start,r.width,4);n.start<=i+1&&a===c&&_e(n.start+n.count-1,r.width,4)===a?t.count=Math.max(t.count,n.start+n.count-t.start):(++s,o[s]=n)}o.length=s+1;let c=n.getParameter(e.UNPACK_ROW_LENGTH),l=n.getParameter(e.UNPACK_SKIP_PIXELS),u=n.getParameter(e.UNPACK_SKIP_ROWS);n.pixelStorei(e.UNPACK_ROW_LENGTH,r.width);for(let t=0,s=o.length;t<s;t++){let s=o[t],c=Math.floor(s.start/4),l=Math.ceil(s.count/4),u=c%r.width,d=Math.floor(c/r.width),f=l;n.pixelStorei(e.UNPACK_SKIP_PIXELS,u),n.pixelStorei(e.UNPACK_SKIP_ROWS,d),n.texSubImage2D(e.TEXTURE_2D,0,u,d,f,1,i,a,r.data)}t.clearUpdateRanges(),n.pixelStorei(e.UNPACK_ROW_LENGTH,c),n.pixelStorei(e.UNPACK_SKIP_PIXELS,l),n.pixelStorei(e.UNPACK_SKIP_ROWS,u)}}function ye(t,r,i){let a=e.TEXTURE_2D;(r.isDataArrayTexture||r.isCompressedArrayTexture)&&(a=e.TEXTURE_2D_ARRAY),r.isData3DTexture&&(a=e.TEXTURE_3D);let o=ge(t,r),s=r.source;n.bindTexture(a,t.__webglTexture,e.TEXTURE0+i);let c=f.get(s);if(s.version!==c.__version||o===!0){if(n.activeTexture(e.TEXTURE0+i),!(typeof ImageBitmap<`u`&&r.image instanceof ImageBitmap)){let t=Gt.getPrimaries(Gt.workingColorSpace),i=r.colorSpace===``?null:Gt.getPrimaries(r.colorSpace),a=r.colorSpace===``||t===i?e.NONE:e.BROWSER_DEFAULT_WEBGL;n.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,r.flipY),n.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,r.premultiplyAlpha),n.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,a)}n.pixelStorei(e.UNPACK_ALIGNMENT,r.unpackAlignment);let t=T(r.image,!1,p.maxTextureSize);t=Ne(r,t);let l=m.convert(r.format,r.colorSpace),u=m.convert(r.type),d=k(r.internalFormat,l,u,r.normalized,r.colorSpace,r.isVideoTexture);he(a,r);let f,h=r.mipmaps,g=r.isVideoTexture!==!0,_=c.__version===void 0||o===!0,v=s.dataReady,y=M(r,t);if(r.isDepthTexture)d=j(r.format===A,r.type),_&&(g?n.texStorage2D(e.TEXTURE_2D,1,d,t.width,t.height):n.texImage2D(e.TEXTURE_2D,0,d,t.width,t.height,0,l,u,null));else if(r.isDataTexture)if(h.length>0){g&&_&&n.texStorage2D(e.TEXTURE_2D,y,d,h[0].width,h[0].height);for(let t=0,r=h.length;t<r;t++)f=h[t],g?v&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,f.width,f.height,l,u,f.data):n.texImage2D(e.TEXTURE_2D,t,d,f.width,f.height,0,l,u,f.data);r.generateMipmaps=!1}else g?(_&&n.texStorage2D(e.TEXTURE_2D,y,d,t.width,t.height),v&&ve(r,t,l,u)):n.texImage2D(e.TEXTURE_2D,0,d,t.width,t.height,0,l,u,t.data);else if(r.isCompressedTexture)if(r.isCompressedArrayTexture){g&&_&&n.texStorage3D(e.TEXTURE_2D_ARRAY,y,d,h[0].width,h[0].height,t.depth);for(let i=0,a=h.length;i<a;i++)if(f=h[i],r.format!==1023)if(l!==null)if(g){if(v)if(r.layerUpdates.size>0){let t=Us(f.width,f.height,r.format,r.type);for(let a of r.layerUpdates){let r=f.data.subarray(a*t/f.data.BYTES_PER_ELEMENT,(a+1)*t/f.data.BYTES_PER_ELEMENT);n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,i,0,0,a,f.width,f.height,1,l,r)}r.clearLayerUpdates()}else n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,i,0,0,0,f.width,f.height,t.depth,l,f.data)}else n.compressedTexImage3D(e.TEXTURE_2D_ARRAY,i,d,f.width,f.height,t.depth,0,f.data,0,0);else B(`WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()`);else g?v&&n.texSubImage3D(e.TEXTURE_2D_ARRAY,i,0,0,0,f.width,f.height,t.depth,l,u,f.data):n.texImage3D(e.TEXTURE_2D_ARRAY,i,d,f.width,f.height,t.depth,0,l,u,f.data)}else{g&&_&&n.texStorage2D(e.TEXTURE_2D,y,d,h[0].width,h[0].height);for(let t=0,i=h.length;t<i;t++)f=h[t],r.format===1023?g?v&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,f.width,f.height,l,u,f.data):n.texImage2D(e.TEXTURE_2D,t,d,f.width,f.height,0,l,u,f.data):l===null?B(`WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()`):g?v&&n.compressedTexSubImage2D(e.TEXTURE_2D,t,0,0,f.width,f.height,l,f.data):n.compressedTexImage2D(e.TEXTURE_2D,t,d,f.width,f.height,0,f.data)}else if(r.isDataArrayTexture)if(g){if(_&&n.texStorage3D(e.TEXTURE_2D_ARRAY,y,d,t.width,t.height,t.depth),v)if(r.layerUpdates.size>0){let i=Us(t.width,t.height,r.format,r.type);for(let a of r.layerUpdates){let r=t.data.subarray(a*i/t.data.BYTES_PER_ELEMENT,(a+1)*i/t.data.BYTES_PER_ELEMENT);n.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,a,t.width,t.height,1,l,u,r)}r.clearLayerUpdates()}else n.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,0,t.width,t.height,t.depth,l,u,t.data)}else n.texImage3D(e.TEXTURE_2D_ARRAY,0,d,t.width,t.height,t.depth,0,l,u,t.data);else if(r.isData3DTexture)g?(_&&n.texStorage3D(e.TEXTURE_3D,y,d,t.width,t.height,t.depth),v&&n.texSubImage3D(e.TEXTURE_3D,0,0,0,0,t.width,t.height,t.depth,l,u,t.data)):n.texImage3D(e.TEXTURE_3D,0,d,t.width,t.height,t.depth,0,l,u,t.data);else if(r.isFramebufferTexture){if(_)if(g)n.texStorage2D(e.TEXTURE_2D,y,d,t.width,t.height);else{let r=t.width,i=t.height;for(let t=0;t<y;t++)n.texImage2D(e.TEXTURE_2D,t,d,r,i,0,l,u,null),r>>=1,i>>=1}}else if(r.isHTMLTexture){if(`texElementImage2D`in e){let n=e.canvas;if(n.hasAttribute(`layoutsubtree`)||n.setAttribute(`layoutsubtree`,`true`),t.parentNode!==n){n.appendChild(t),b.add(r),n.onpaint=e=>{let t=e.changedElements;for(let e of b)t.includes(e.image)&&(e.needsUpdate=!0)},n.requestPaint();return}if(e.texElementImage2D.length===3)e.texElementImage2D(e.TEXTURE_2D,e.RGBA8,t);else{let n=e.RGBA,r=e.RGBA,i=e.UNSIGNED_BYTE;e.texElementImage2D(e.TEXTURE_2D,0,n,r,i,t)}e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE)}}else if(h.length>0){if(g&&_){let t=Pe(h[0]);n.texStorage2D(e.TEXTURE_2D,y,d,t.width,t.height)}for(let t=0,r=h.length;t<r;t++)f=h[t],g?v&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,l,u,f):n.texImage2D(e.TEXTURE_2D,t,d,l,u,f);r.generateMipmaps=!1}else if(g){if(_){let r=Pe(t);n.texStorage2D(e.TEXTURE_2D,y,d,r.width,r.height)}v&&n.texSubImage2D(e.TEXTURE_2D,0,0,0,l,u,t)}else n.texImage2D(e.TEXTURE_2D,0,d,l,u,t);E(r)&&D(a),c.__version=s.version,r.onUpdate&&r.onUpdate(r)}t.__version=r.version}function be(t,r,i){if(r.image.length!==6)return;let a=ge(t,r),o=r.source;n.bindTexture(e.TEXTURE_CUBE_MAP,t.__webglTexture,e.TEXTURE0+i);let s=f.get(o);if(o.version!==s.__version||a===!0){n.activeTexture(e.TEXTURE0+i);let t=Gt.getPrimaries(Gt.workingColorSpace),c=r.colorSpace===``?null:Gt.getPrimaries(r.colorSpace),l=r.colorSpace===``||t===c?e.NONE:e.BROWSER_DEFAULT_WEBGL;n.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,r.flipY),n.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,r.premultiplyAlpha),n.pixelStorei(e.UNPACK_ALIGNMENT,r.unpackAlignment),n.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,l);let u=r.isCompressedTexture||r.image[0].isCompressedTexture,d=r.image[0]&&r.image[0].isDataTexture,f=[];for(let e=0;e<6;e++)!u&&!d?f[e]=T(r.image[e],!0,p.maxCubemapSize):f[e]=d?r.image[e].image:r.image[e],f[e]=Ne(r,f[e]);let h=f[0],g=m.convert(r.format,r.colorSpace),_=m.convert(r.type),v=k(r.internalFormat,g,_,r.normalized,r.colorSpace),y=r.isVideoTexture!==!0,b=s.__version===void 0||a===!0,x=o.dataReady,S=M(r,h);he(e.TEXTURE_CUBE_MAP,r);let C;if(u){y&&b&&n.texStorage2D(e.TEXTURE_CUBE_MAP,S,v,h.width,h.height);for(let t=0;t<6;t++){C=f[t].mipmaps;for(let i=0;i<C.length;i++){let a=C[i];r.format===1023?y?x&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,i,0,0,a.width,a.height,g,_,a.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,i,v,a.width,a.height,0,g,_,a.data):g===null?B(`WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()`):y?x&&n.compressedTexSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,i,0,0,a.width,a.height,g,a.data):n.compressedTexImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,i,v,a.width,a.height,0,a.data)}}}else{if(C=r.mipmaps,y&&b){C.length>0&&S++;let t=Pe(f[0]);n.texStorage2D(e.TEXTURE_CUBE_MAP,S,v,t.width,t.height)}for(let t=0;t<6;t++)if(d){y?x&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,0,0,f[t].width,f[t].height,g,_,f[t].data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,v,f[t].width,f[t].height,0,g,_,f[t].data);for(let r=0;r<C.length;r++){let i=C[r].image[t].image;y?x&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,0,0,i.width,i.height,g,_,i.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,v,i.width,i.height,0,g,_,i.data)}}else{y?x&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,0,0,g,_,f[t]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,v,g,_,f[t]);for(let r=0;r<C.length;r++){let i=C[r];y?x&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,0,0,g,_,i.image[t]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,v,g,_,i.image[t])}}}E(r)&&D(e.TEXTURE_CUBE_MAP),s.__version=o.version,r.onUpdate&&r.onUpdate(r)}t.__version=r.version}function xe(t,r,i,a,o,s){let c=m.convert(i.format,i.colorSpace),l=m.convert(i.type),u=k(i.internalFormat,c,l,i.normalized,i.colorSpace),d=f.get(r),p=f.get(i);if(p.__renderTarget=r,!d.__hasExternalTextures){let t=Math.max(1,r.width>>s),i=Math.max(1,r.height>>s);o===e.TEXTURE_3D||o===e.TEXTURE_2D_ARRAY?n.texImage3D(o,s,u,t,i,r.depth,0,c,l,null):n.texImage2D(o,s,u,t,i,0,c,l,null)}n.bindFramebuffer(e.FRAMEBUFFER,t),Me(r)?g.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,a,o,p.__webglTexture,0,je(r)):(o===e.TEXTURE_2D||o>=e.TEXTURE_CUBE_MAP_POSITIVE_X&&o<=e.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&e.framebufferTexture2D(e.FRAMEBUFFER,a,o,p.__webglTexture,s),n.bindFramebuffer(e.FRAMEBUFFER,null)}function Se(t,n,r){if(e.bindRenderbuffer(e.RENDERBUFFER,t),n.depthBuffer){let i=n.depthTexture,a=i&&i.isDepthTexture?i.type:null,o=j(n.stencilBuffer,a),s=n.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;Me(n)?g.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,je(n),o,n.width,n.height):r?e.renderbufferStorageMultisample(e.RENDERBUFFER,je(n),o,n.width,n.height):e.renderbufferStorage(e.RENDERBUFFER,o,n.width,n.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,s,e.RENDERBUFFER,t)}else{let t=n.textures;for(let i=0;i<t.length;i++){let a=t[i],o=m.convert(a.format,a.colorSpace),s=m.convert(a.type),c=k(a.internalFormat,o,s,a.normalized,a.colorSpace);Me(n)?g.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,je(n),c,n.width,n.height):r?e.renderbufferStorageMultisample(e.RENDERBUFFER,je(n),c,n.width,n.height):e.renderbufferStorage(e.RENDERBUFFER,c,n.width,n.height)}}e.bindRenderbuffer(e.RENDERBUFFER,null)}function Ce(t,r,i){let a=r.isWebGLCubeRenderTarget===!0;if(n.bindFramebuffer(e.FRAMEBUFFER,t),!(r.depthTexture&&r.depthTexture.isDepthTexture))throw Error(`THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.`);let o=f.get(r.depthTexture);if(o.__renderTarget=r,(!o.__webglTexture||r.depthTexture.image.width!==r.width||r.depthTexture.image.height!==r.height)&&(r.depthTexture.image.width=r.width,r.depthTexture.image.height=r.height,r.depthTexture.needsUpdate=!0),a){if(o.__webglInit===void 0&&(o.__webglInit=!0,r.depthTexture.addEventListener(`dispose`,N)),o.__webglTexture===void 0){o.__webglTexture=e.createTexture(),n.bindTexture(e.TEXTURE_CUBE_MAP,o.__webglTexture),he(e.TEXTURE_CUBE_MAP,r.depthTexture);let t=m.convert(r.depthTexture.format),i=m.convert(r.depthTexture.type),a;r.depthTexture.format===1026?a=e.DEPTH_COMPONENT24:r.depthTexture.format===1027&&(a=e.DEPTH24_STENCIL8);for(let n=0;n<6;n++)e.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+n,0,a,r.width,r.height,0,t,i,null)}}else F(r.depthTexture,0);let s=o.__webglTexture,c=je(r),l=a?e.TEXTURE_CUBE_MAP_POSITIVE_X+i:e.TEXTURE_2D,u=r.depthTexture.format===1027?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;if(r.depthTexture.format===1026)Me(r)?g.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,u,l,s,0,c):e.framebufferTexture2D(e.FRAMEBUFFER,u,l,s,0);else if(r.depthTexture.format===1027)Me(r)?g.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,u,l,s,0,c):e.framebufferTexture2D(e.FRAMEBUFFER,u,l,s,0);else throw Error(`THREE.WebGLTextures: Unknown depthTexture format.`)}function we(t){let r=f.get(t),i=t.isWebGLCubeRenderTarget===!0;if(r.__boundDepthTexture!==t.depthTexture){let e=t.depthTexture;if(r.__depthDisposeCallback&&r.__depthDisposeCallback(),e){let t=()=>{delete r.__boundDepthTexture,delete r.__depthDisposeCallback,e.removeEventListener(`dispose`,t)};e.addEventListener(`dispose`,t),r.__depthDisposeCallback=t}r.__boundDepthTexture=e}if(t.depthTexture&&!r.__autoAllocateDepthBuffer)if(i)for(let e=0;e<6;e++)Ce(r.__webglFramebuffer[e],t,e);else{let e=t.texture.mipmaps;e&&e.length>0?Ce(r.__webglFramebuffer[0],t,0):Ce(r.__webglFramebuffer,t,0)}else if(i){r.__webglDepthbuffer=[];for(let i=0;i<6;i++)if(n.bindFramebuffer(e.FRAMEBUFFER,r.__webglFramebuffer[i]),r.__webglDepthbuffer[i]===void 0)r.__webglDepthbuffer[i]=e.createRenderbuffer(),Se(r.__webglDepthbuffer[i],t,!1);else{let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,a=r.__webglDepthbuffer[i];e.bindRenderbuffer(e.RENDERBUFFER,a),e.framebufferRenderbuffer(e.FRAMEBUFFER,n,e.RENDERBUFFER,a)}}else{let i=t.texture.mipmaps;if(i&&i.length>0?n.bindFramebuffer(e.FRAMEBUFFER,r.__webglFramebuffer[0]):n.bindFramebuffer(e.FRAMEBUFFER,r.__webglFramebuffer),r.__webglDepthbuffer===void 0)r.__webglDepthbuffer=e.createRenderbuffer(),Se(r.__webglDepthbuffer,t,!1);else{let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,i=r.__webglDepthbuffer;e.bindRenderbuffer(e.RENDERBUFFER,i),e.framebufferRenderbuffer(e.FRAMEBUFFER,n,e.RENDERBUFFER,i)}}n.bindFramebuffer(e.FRAMEBUFFER,null)}function Te(t,n,r){let i=f.get(t);n!==void 0&&xe(i.__webglFramebuffer,t,t.texture,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,0),r!==void 0&&we(t)}function Ee(t){let r=t.texture,i=f.get(t),a=f.get(r);t.addEventListener(`dispose`,ee);let o=t.textures,s=t.isWebGLCubeRenderTarget===!0,c=o.length>1;if(c||(a.__webglTexture===void 0&&(a.__webglTexture=e.createTexture()),a.__version=r.version,h.memory.textures++),s){i.__webglFramebuffer=[];for(let t=0;t<6;t++)if(r.mipmaps&&r.mipmaps.length>0){i.__webglFramebuffer[t]=[];for(let n=0;n<r.mipmaps.length;n++)i.__webglFramebuffer[t][n]=e.createFramebuffer()}else i.__webglFramebuffer[t]=e.createFramebuffer()}else{if(r.mipmaps&&r.mipmaps.length>0){i.__webglFramebuffer=[];for(let t=0;t<r.mipmaps.length;t++)i.__webglFramebuffer[t]=e.createFramebuffer()}else i.__webglFramebuffer=e.createFramebuffer();if(c)for(let t=0,n=o.length;t<n;t++){let n=f.get(o[t]);n.__webglTexture===void 0&&(n.__webglTexture=e.createTexture(),h.memory.textures++)}if(t.samples>0&&Me(t)===!1){i.__webglMultisampledFramebuffer=e.createFramebuffer(),i.__webglColorRenderbuffer=[],n.bindFramebuffer(e.FRAMEBUFFER,i.__webglMultisampledFramebuffer);for(let n=0;n<o.length;n++){let r=o[n];i.__webglColorRenderbuffer[n]=e.createRenderbuffer(),e.bindRenderbuffer(e.RENDERBUFFER,i.__webglColorRenderbuffer[n]);let a=m.convert(r.format,r.colorSpace),s=m.convert(r.type),c=k(r.internalFormat,a,s,r.normalized,r.colorSpace,t.isXRRenderTarget===!0),l=je(t);e.renderbufferStorageMultisample(e.RENDERBUFFER,l,c,t.width,t.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+n,e.RENDERBUFFER,i.__webglColorRenderbuffer[n])}e.bindRenderbuffer(e.RENDERBUFFER,null),t.depthBuffer&&(i.__webglDepthRenderbuffer=e.createRenderbuffer(),Se(i.__webglDepthRenderbuffer,t,!0)),n.bindFramebuffer(e.FRAMEBUFFER,null)}}if(s){n.bindTexture(e.TEXTURE_CUBE_MAP,a.__webglTexture),he(e.TEXTURE_CUBE_MAP,r);for(let n=0;n<6;n++)if(r.mipmaps&&r.mipmaps.length>0)for(let a=0;a<r.mipmaps.length;a++)xe(i.__webglFramebuffer[n][a],t,r,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+n,a);else xe(i.__webglFramebuffer[n],t,r,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+n,0);E(r)&&D(e.TEXTURE_CUBE_MAP),n.unbindTexture()}else if(c){for(let r=0,a=o.length;r<a;r++){let a=o[r],s=f.get(a),c=e.TEXTURE_2D;(t.isWebGL3DRenderTarget||t.isWebGLArrayRenderTarget)&&(c=t.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),n.bindTexture(c,s.__webglTexture),he(c,a),xe(i.__webglFramebuffer,t,a,e.COLOR_ATTACHMENT0+r,c,0),E(a)&&D(c)}n.unbindTexture()}else{let o=e.TEXTURE_2D;if((t.isWebGL3DRenderTarget||t.isWebGLArrayRenderTarget)&&(o=t.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),n.bindTexture(o,a.__webglTexture),he(o,r),r.mipmaps&&r.mipmaps.length>0)for(let n=0;n<r.mipmaps.length;n++)xe(i.__webglFramebuffer[n],t,r,e.COLOR_ATTACHMENT0,o,n);else xe(i.__webglFramebuffer,t,r,e.COLOR_ATTACHMENT0,o,0);E(r)&&D(o),n.unbindTexture()}t.depthBuffer&&we(t)}function De(e){let t=e.textures;for(let r=0,i=t.length;r<i;r++){let i=t[r];if(E(i)){let t=O(e),r=f.get(i).__webglTexture;n.bindTexture(t,r),D(t),n.unbindTexture()}}}let Oe=[],ke=[];function Ae(t){if(t.samples>0){if(Me(t)===!1){let r=t.textures,i=t.width,a=t.height,o=e.COLOR_BUFFER_BIT,s=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,c=f.get(t),l=r.length>1;if(l)for(let t=0;t<r.length;t++)n.bindFramebuffer(e.FRAMEBUFFER,c.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.RENDERBUFFER,null),n.bindFramebuffer(e.FRAMEBUFFER,c.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.TEXTURE_2D,null,0);n.bindFramebuffer(e.READ_FRAMEBUFFER,c.__webglMultisampledFramebuffer);let u=t.texture.mipmaps;u&&u.length>0?n.bindFramebuffer(e.DRAW_FRAMEBUFFER,c.__webglFramebuffer[0]):n.bindFramebuffer(e.DRAW_FRAMEBUFFER,c.__webglFramebuffer);for(let n=0;n<r.length;n++){if(t.resolveDepthBuffer&&(t.depthBuffer&&(o|=e.DEPTH_BUFFER_BIT),t.stencilBuffer&&t.resolveStencilBuffer&&(o|=e.STENCIL_BUFFER_BIT)),l){e.framebufferRenderbuffer(e.READ_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.RENDERBUFFER,c.__webglColorRenderbuffer[n]);let t=f.get(r[n]).__webglTexture;e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,t,0)}e.blitFramebuffer(0,0,i,a,0,0,i,a,o,e.NEAREST),_===!0&&(Oe.length=0,ke.length=0,Oe.push(e.COLOR_ATTACHMENT0+n),t.depthBuffer&&t.resolveDepthBuffer===!1&&(Oe.push(s),ke.push(s),e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,ke)),e.invalidateFramebuffer(e.READ_FRAMEBUFFER,Oe))}if(n.bindFramebuffer(e.READ_FRAMEBUFFER,null),n.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),l)for(let t=0;t<r.length;t++){n.bindFramebuffer(e.FRAMEBUFFER,c.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.RENDERBUFFER,c.__webglColorRenderbuffer[t]);let i=f.get(r[t]).__webglTexture;n.bindFramebuffer(e.FRAMEBUFFER,c.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.TEXTURE_2D,i,0)}n.bindFramebuffer(e.DRAW_FRAMEBUFFER,c.__webglMultisampledFramebuffer)}else if(t.depthBuffer&&t.resolveDepthBuffer===!1&&_){let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,[n])}}}function je(e){return Math.min(p.maxSamples,e.samples)}function Me(e){let n=f.get(e);return e.samples>0&&t.has(`WEBGL_multisampled_render_to_texture`)===!0&&n.__useRenderToTexture!==!1}function I(e){let t=h.render.frame;y.get(e)!==t&&(y.set(e,t),e.update())}function Ne(e,t){let n=e.colorSpace,r=e.format,i=e.type;return e.isCompressedTexture===!0||e.isVideoTexture===!0||n!==`srgb-linear`&&n!==``&&(Gt.getTransfer(n)===`srgb`?(r!==1023||i!==1009)&&B(`WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType.`):V(`WebGLTextures: Unsupported texture color space:`,n)),t}function Pe(e){return typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement?(v.width=e.naturalWidth||e.width,v.height=e.naturalHeight||e.height):typeof VideoFrame<`u`&&e instanceof VideoFrame?(v.width=e.displayWidth,v.height=e.displayHeight):(v.width=e.width,v.height=e.height),v}this.allocateTextureUnit=se,this.resetTextureUnits=ie,this.getTextureUnits=ae,this.setTextureUnits=oe,this.setTexture2D=F,this.setTexture2DArray=le,this.setTexture3D=ue,this.setTextureCube=de,this.rebindTextures=Te,this.setupRenderTarget=Ee,this.updateRenderTargetMipmap=De,this.updateMultisampleRenderTarget=Ae,this.setupDepthRenderbuffer=we,this.setupFrameBufferTexture=xe,this.useMultisampledRTT=Me,this.isReversedDepthBuffer=function(){return n.buffers.depth.getReversed()}}function Ju(e,t){function n(n,r=``){let i,a=Gt.getTransfer(r);if(n===1009)return e.UNSIGNED_BYTE;if(n===1017)return e.UNSIGNED_SHORT_4_4_4_4;if(n===1018)return e.UNSIGNED_SHORT_5_5_5_1;if(n===35902)return e.UNSIGNED_INT_5_9_9_9_REV;if(n===35899)return e.UNSIGNED_INT_10F_11F_11F_REV;if(n===1010)return e.BYTE;if(n===1011)return e.SHORT;if(n===1012)return e.UNSIGNED_SHORT;if(n===1013)return e.INT;if(n===1014)return e.UNSIGNED_INT;if(n===1015)return e.FLOAT;if(n===1016)return e.HALF_FLOAT;if(n===1021)return e.ALPHA;if(n===1022)return e.RGB;if(n===1023)return e.RGBA;if(n===1026)return e.DEPTH_COMPONENT;if(n===1027)return e.DEPTH_STENCIL;if(n===1028)return e.RED;if(n===1029)return e.RED_INTEGER;if(n===1030)return e.RG;if(n===1031)return e.RG_INTEGER;if(n===1033)return e.RGBA_INTEGER;if(n===33776||n===33777||n===33778||n===33779)if(a===`srgb`)if(i=t.get(`WEBGL_compressed_texture_s3tc_srgb`),i!==null){if(n===33776)return i.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===33777)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===33778)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===33779)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(i=t.get(`WEBGL_compressed_texture_s3tc`),i!==null){if(n===33776)return i.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===33777)return i.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===33778)return i.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===33779)return i.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===35840||n===35841||n===35842||n===35843)if(i=t.get(`WEBGL_compressed_texture_pvrtc`),i!==null){if(n===35840)return i.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===35841)return i.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===35842)return i.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===35843)return i.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===36196||n===37492||n===37496||n===37488||n===37489||n===37490||n===37491)if(i=t.get(`WEBGL_compressed_texture_etc`),i!==null){if(n===36196||n===37492)return a===`srgb`?i.COMPRESSED_SRGB8_ETC2:i.COMPRESSED_RGB8_ETC2;if(n===37496)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:i.COMPRESSED_RGBA8_ETC2_EAC;if(n===37488)return i.COMPRESSED_R11_EAC;if(n===37489)return i.COMPRESSED_SIGNED_R11_EAC;if(n===37490)return i.COMPRESSED_RG11_EAC;if(n===37491)return i.COMPRESSED_SIGNED_RG11_EAC}else return null;if(n===37808||n===37809||n===37810||n===37811||n===37812||n===37813||n===37814||n===37815||n===37816||n===37817||n===37818||n===37819||n===37820||n===37821)if(i=t.get(`WEBGL_compressed_texture_astc`),i!==null){if(n===37808)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:i.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===37809)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:i.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===37810)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:i.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===37811)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:i.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===37812)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:i.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===37813)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:i.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===37814)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:i.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===37815)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:i.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===37816)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:i.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===37817)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:i.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===37818)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:i.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===37819)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:i.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===37820)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:i.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===37821)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:i.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===36492||n===36494||n===36495)if(i=t.get(`EXT_texture_compression_bptc`),i!==null){if(n===36492)return a===`srgb`?i.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:i.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===36494)return i.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===36495)return i.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===36283||n===36284||n===36285||n===36286)if(i=t.get(`EXT_texture_compression_rgtc`),i!==null){if(n===36283)return i.COMPRESSED_RED_RGTC1_EXT;if(n===36284)return i.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===36285)return i.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===36286)return i.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===1020?e.UNSIGNED_INT_24_8:e[n]===void 0?null:e[n]}return{convert:n}}var Yu=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Xu=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,Zu=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){let n=new Na(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){let t=e.cameras[0].viewport,n=new Xa({vertexShader:Yu,fragmentShader:Xu,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new K(new Ba(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},Qu=class extends ut{constructor(e,t){super();let n=this,r=null,i=1,a=null,o=`local-floor`,s=1,c=null,l=null,u=null,d=null,f=null,m=null,h=typeof XRWebGLBinding<`u`,g=new Zu,_={},y=t.getContextAttributes(),b=null,x=null,S=[],w=[],T=new H,E=null,D=new qo;D.viewport=new nn;let j=new qo;j.viewport=new nn;let M=[D,j],N=new ds,ee=null,te=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(e){let t=S[e];return t===void 0&&(t=new zn,S[e]=t),t.getTargetRaySpace()},this.getControllerGrip=function(e){let t=S[e];return t===void 0&&(t=new zn,S[e]=t),t.getGripSpace()},this.getHand=function(e){let t=S[e];return t===void 0&&(t=new zn,S[e]=t),t.getHandSpace()};function P(e){let t=w.indexOf(e.inputSource);if(t===-1)return;let n=S[t];n!==void 0&&(n.update(e.inputSource,e.frame,c||a),n.dispatchEvent({type:e.type,data:e.inputSource}))}function ne(){r.removeEventListener(`select`,P),r.removeEventListener(`selectstart`,P),r.removeEventListener(`selectend`,P),r.removeEventListener(`squeeze`,P),r.removeEventListener(`squeezestart`,P),r.removeEventListener(`squeezeend`,P),r.removeEventListener(`end`,ne),r.removeEventListener(`inputsourceschange`,re);for(let e=0;e<S.length;e++){let t=w[e];t!==null&&(w[e]=null,S[e].disconnect(t))}ee=null,te=null,g.reset();for(let e in _)delete _[e];e.setRenderTarget(b),f=null,d=null,u=null,r=null,x=null,ue.stop(),n.isPresenting=!1,e.setPixelRatio(E),e.setSize(T.width,T.height,!1),n.dispatchEvent({type:`sessionend`})}this.setFramebufferScaleFactor=function(e){i=e,n.isPresenting===!0&&B(`WebXRManager: Cannot change framebuffer scale while presenting.`)},this.setReferenceSpaceType=function(e){o=e,n.isPresenting===!0&&B(`WebXRManager: Cannot change reference space type while presenting.`)},this.getReferenceSpace=function(){return c||a},this.setReferenceSpace=function(e){c=e},this.getBaseLayer=function(){return d===null?f:d},this.getBinding=function(){return u===null&&h&&(u=new XRWebGLBinding(r,t)),u},this.getFrame=function(){return m},this.getSession=function(){return r},this.setSession=async function(l){if(r=l,r!==null){if(b=e.getRenderTarget(),r.addEventListener(`select`,P),r.addEventListener(`selectstart`,P),r.addEventListener(`selectend`,P),r.addEventListener(`squeeze`,P),r.addEventListener(`squeezestart`,P),r.addEventListener(`squeezeend`,P),r.addEventListener(`end`,ne),r.addEventListener(`inputsourceschange`,re),y.xrCompatible!==!0&&await t.makeXRCompatible(),E=e.getPixelRatio(),e.getSize(T),h&&`createProjectionLayer`in XRWebGLBinding.prototype){let n=null,a=null,o=null;y.depth&&(o=y.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,n=y.stencil?A:k,a=y.stencil?C:v);let s={colorFormat:t.RGBA8,depthFormat:o,scaleFactor:i};u=this.getBinding(),d=u.createProjectionLayer(s),r.updateRenderState({layers:[d]}),e.setPixelRatio(1),e.setSize(d.textureWidth,d.textureHeight,!1),x=new an(d.textureWidth,d.textureHeight,{format:O,type:p,depthTexture:new ja(d.textureWidth,d.textureHeight,a,void 0,void 0,void 0,void 0,void 0,void 0,n),stencilBuffer:y.stencil,colorSpace:e.outputColorSpace,samples:y.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1})}else{let n={antialias:y.antialias,alpha:!0,depth:y.depth,stencil:y.stencil,framebufferScaleFactor:i};f=new XRWebGLLayer(r,t,n),r.updateRenderState({baseLayer:f}),e.setPixelRatio(1),e.setSize(f.framebufferWidth,f.framebufferHeight,!1),x=new an(f.framebufferWidth,f.framebufferHeight,{format:O,type:p,colorSpace:e.outputColorSpace,stencilBuffer:y.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1})}x.isXRRenderTarget=!0,this.setFoveation(s),c=null,a=await r.requestReferenceSpace(o),ue.setContext(r),ue.start(),n.isPresenting=!0,n.dispatchEvent({type:`sessionstart`})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return g.getDepthTexture()};function re(e){for(let t=0;t<e.removed.length;t++){let n=e.removed[t],r=w.indexOf(n);r>=0&&(w[r]=null,S[r].disconnect(n))}for(let t=0;t<e.added.length;t++){let n=e.added[t],r=w.indexOf(n);if(r===-1){for(let e=0;e<S.length;e++)if(e>=w.length){w.push(n),r=e;break}else if(w[e]===null){w[e]=n,r=e;break}if(r===-1)break}let i=S[r];i&&i.connect(n)}}let ie=new U,ae=new U;function oe(e,t,n){ie.setFromMatrixPosition(t.matrixWorld),ae.setFromMatrixPosition(n.matrixWorld);let r=ie.distanceTo(ae),i=t.projectionMatrix.elements,a=n.projectionMatrix.elements,o=i[14]/(i[10]-1),s=i[14]/(i[10]+1),c=(i[9]+1)/i[5],l=(i[9]-1)/i[5],u=(i[8]-1)/i[0],d=(a[8]+1)/a[0],f=o*u,p=o*d,m=r/(-u+d),h=m*-u;if(t.matrixWorld.decompose(e.position,e.quaternion,e.scale),e.translateX(h),e.translateZ(m),e.matrixWorld.compose(e.position,e.quaternion,e.scale),e.matrixWorldInverse.copy(e.matrixWorld).invert(),i[10]===-1)e.projectionMatrix.copy(t.projectionMatrix),e.projectionMatrixInverse.copy(t.projectionMatrixInverse);else{let t=o+m,n=s+m,i=f-h,a=p+(r-h),u=c*s/n*t,d=l*s/n*t;e.projectionMatrix.makePerspective(i,a,u,d,t,n),e.projectionMatrixInverse.copy(e.projectionMatrix).invert()}}function se(e,t){t===null?e.matrixWorld.copy(e.matrix):e.matrixWorld.multiplyMatrices(t.matrixWorld,e.matrix),e.matrixWorldInverse.copy(e.matrixWorld).invert()}this.updateCamera=function(e){if(r===null)return;let t=e.near,n=e.far;g.texture!==null&&(g.depthNear>0&&(t=g.depthNear),g.depthFar>0&&(n=g.depthFar)),N.near=j.near=D.near=t,N.far=j.far=D.far=n,(ee!==N.near||te!==N.far)&&(r.updateRenderState({depthNear:N.near,depthFar:N.far}),ee=N.near,te=N.far),N.layers.mask=e.layers.mask|6,D.layers.mask=N.layers.mask&-5,j.layers.mask=N.layers.mask&-3;let i=e.parent,a=N.cameras;se(N,i);for(let e=0;e<a.length;e++)se(a[e],i);a.length===2?oe(N,D,j):N.projectionMatrix.copy(D.projectionMatrix),ce(e,N,i)};function ce(e,t,n){n===null?e.matrix.copy(t.matrixWorld):(e.matrix.copy(n.matrixWorld),e.matrix.invert(),e.matrix.multiply(t.matrixWorld)),e.matrix.decompose(e.position,e.quaternion,e.scale),e.updateMatrixWorld(!0),e.projectionMatrix.copy(t.projectionMatrix),e.projectionMatrixInverse.copy(t.projectionMatrixInverse),e.isPerspectiveCamera&&(e.fov=mt*2*Math.atan(1/e.projectionMatrix.elements[5]),e.zoom=1)}this.getCamera=function(){return N},this.getFoveation=function(){if(d!==null||f!==null)return s},this.setFoveation=function(e){s=e,d!==null&&(d.fixedFoveation=e),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=e)},this.hasDepthSensing=function(){return g.texture!==null},this.getDepthSensingMesh=function(){return g.getMesh(N)},this.getCameraTexture=function(e){return _[e]};let F=null;function le(t,i){if(l=i.getViewerPose(c||a),m=i,l!==null){let t=l.views;f!==null&&(e.setRenderTargetFramebuffer(x,f.framebuffer),e.setRenderTarget(x));let i=!1;t.length!==N.cameras.length&&(N.cameras.length=0,i=!0);for(let n=0;n<t.length;n++){let r=t[n],a=null;if(f!==null)a=f.getViewport(r);else{let t=u.getViewSubImage(d,r);a=t.viewport,n===0&&(e.setRenderTargetTextures(x,t.colorTexture,t.depthStencilTexture),e.setRenderTarget(x))}let o=M[n];o===void 0&&(o=new qo,o.layers.enable(n),o.viewport=new nn,M[n]=o),o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.quaternion,o.scale),o.projectionMatrix.fromArray(r.projectionMatrix),o.projectionMatrixInverse.copy(o.projectionMatrix).invert(),o.viewport.set(a.x,a.y,a.width,a.height),n===0&&(N.matrix.copy(o.matrix),N.matrix.decompose(N.position,N.quaternion,N.scale)),i===!0&&N.cameras.push(o)}let a=r.enabledFeatures;if(a&&a.includes(`depth-sensing`)&&r.depthUsage==`gpu-optimized`&&h){u=n.getBinding();let e=u.getDepthInformation(t[0]);e&&e.isValid&&e.texture&&g.init(e,r.renderState)}if(a&&a.includes(`camera-access`)&&h){e.state.unbindTexture(),u=n.getBinding();for(let e=0;e<t.length;e++){let n=t[e].camera;if(n){let e=_[n];e||(e=new Na,_[n]=e);let t=u.getCameraImage(n);e.sourceTexture=t}}}}for(let e=0;e<S.length;e++){let t=w[e],n=S[e];t!==null&&n!==void 0&&n.update(t,i,c||a)}F&&F(t,i),i.detectedPlanes&&n.dispatchEvent({type:`planesdetected`,data:i}),m=null}let ue=new Gs;ue.setAnimationLoop(le),this.setAnimationLoop=function(e){F=e},this.dispose=function(){}}},$u=new ln,ed=new W;ed.set(-1,0,0,0,1,0,0,0,1);function td(e,t){function n(e,t){e.matrixAutoUpdate===!0&&e.updateMatrix(),t.value.copy(e.matrix)}function r(t,n){n.color.getRGB(t.fogColor.value,Ka(e)),n.isFog?(t.fogNear.value=n.near,t.fogFar.value=n.far):n.isFogExp2&&(t.fogDensity.value=n.density)}function i(e,t,n,r,i){t.isNodeMaterial?t.uniformsNeedUpdate=!1:t.isMeshBasicMaterial?a(e,t):t.isMeshLambertMaterial?(a(e,t),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)):t.isMeshToonMaterial?(a(e,t),d(e,t)):t.isMeshPhongMaterial?(a(e,t),u(e,t),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)):t.isMeshStandardMaterial?(a(e,t),f(e,t),t.isMeshPhysicalMaterial&&p(e,t,i)):t.isMeshMatcapMaterial?(a(e,t),m(e,t)):t.isMeshDepthMaterial?a(e,t):t.isMeshDistanceMaterial?(a(e,t),h(e,t)):t.isMeshNormalMaterial?a(e,t):t.isLineBasicMaterial?(o(e,t),t.isLineDashedMaterial&&s(e,t)):t.isPointsMaterial?c(e,t,n,r):t.isSpriteMaterial?l(e,t):t.isShadowMaterial?(e.color.value.copy(t.color),e.opacity.value=t.opacity):t.isShaderMaterial&&(t.uniformsNeedUpdate=!1)}function a(e,r){e.opacity.value=r.opacity,r.color&&e.diffuse.value.copy(r.color),r.emissive&&e.emissive.value.copy(r.emissive).multiplyScalar(r.emissiveIntensity),r.map&&(e.map.value=r.map,n(r.map,e.mapTransform)),r.alphaMap&&(e.alphaMap.value=r.alphaMap,n(r.alphaMap,e.alphaMapTransform)),r.bumpMap&&(e.bumpMap.value=r.bumpMap,n(r.bumpMap,e.bumpMapTransform),e.bumpScale.value=r.bumpScale,r.side===1&&(e.bumpScale.value*=-1)),r.normalMap&&(e.normalMap.value=r.normalMap,n(r.normalMap,e.normalMapTransform),e.normalScale.value.copy(r.normalScale),r.side===1&&e.normalScale.value.negate()),r.displacementMap&&(e.displacementMap.value=r.displacementMap,n(r.displacementMap,e.displacementMapTransform),e.displacementScale.value=r.displacementScale,e.displacementBias.value=r.displacementBias),r.emissiveMap&&(e.emissiveMap.value=r.emissiveMap,n(r.emissiveMap,e.emissiveMapTransform)),r.specularMap&&(e.specularMap.value=r.specularMap,n(r.specularMap,e.specularMapTransform)),r.alphaTest>0&&(e.alphaTest.value=r.alphaTest);let i=t.get(r),a=i.envMap,o=i.envMapRotation;a&&(e.envMap.value=a,e.envMapRotation.value.setFromMatrix4($u.makeRotationFromEuler(o)).transpose(),a.isCubeTexture&&a.isRenderTargetTexture===!1&&e.envMapRotation.value.premultiply(ed),e.reflectivity.value=r.reflectivity,e.ior.value=r.ior,e.refractionRatio.value=r.refractionRatio),r.lightMap&&(e.lightMap.value=r.lightMap,e.lightMapIntensity.value=r.lightMapIntensity,n(r.lightMap,e.lightMapTransform)),r.aoMap&&(e.aoMap.value=r.aoMap,e.aoMapIntensity.value=r.aoMapIntensity,n(r.aoMap,e.aoMapTransform))}function o(e,t){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,t.map&&(e.map.value=t.map,n(t.map,e.mapTransform))}function s(e,t){e.dashSize.value=t.dashSize,e.totalSize.value=t.dashSize+t.gapSize,e.scale.value=t.scale}function c(e,t,r,i){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,e.size.value=t.size*r,e.scale.value=i*.5,t.map&&(e.map.value=t.map,n(t.map,e.uvTransform)),t.alphaMap&&(e.alphaMap.value=t.alphaMap,n(t.alphaMap,e.alphaMapTransform)),t.alphaTest>0&&(e.alphaTest.value=t.alphaTest)}function l(e,t){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,e.rotation.value=t.rotation,t.map&&(e.map.value=t.map,n(t.map,e.mapTransform)),t.alphaMap&&(e.alphaMap.value=t.alphaMap,n(t.alphaMap,e.alphaMapTransform)),t.alphaTest>0&&(e.alphaTest.value=t.alphaTest)}function u(e,t){e.specular.value.copy(t.specular),e.shininess.value=Math.max(t.shininess,1e-4)}function d(e,t){t.gradientMap&&(e.gradientMap.value=t.gradientMap)}function f(e,t){e.metalness.value=t.metalness,t.metalnessMap&&(e.metalnessMap.value=t.metalnessMap,n(t.metalnessMap,e.metalnessMapTransform)),e.roughness.value=t.roughness,t.roughnessMap&&(e.roughnessMap.value=t.roughnessMap,n(t.roughnessMap,e.roughnessMapTransform)),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)}function p(e,t,r){e.ior.value=t.ior,t.sheen>0&&(e.sheenColor.value.copy(t.sheenColor).multiplyScalar(t.sheen),e.sheenRoughness.value=t.sheenRoughness,t.sheenColorMap&&(e.sheenColorMap.value=t.sheenColorMap,n(t.sheenColorMap,e.sheenColorMapTransform)),t.sheenRoughnessMap&&(e.sheenRoughnessMap.value=t.sheenRoughnessMap,n(t.sheenRoughnessMap,e.sheenRoughnessMapTransform))),t.clearcoat>0&&(e.clearcoat.value=t.clearcoat,e.clearcoatRoughness.value=t.clearcoatRoughness,t.clearcoatMap&&(e.clearcoatMap.value=t.clearcoatMap,n(t.clearcoatMap,e.clearcoatMapTransform)),t.clearcoatRoughnessMap&&(e.clearcoatRoughnessMap.value=t.clearcoatRoughnessMap,n(t.clearcoatRoughnessMap,e.clearcoatRoughnessMapTransform)),t.clearcoatNormalMap&&(e.clearcoatNormalMap.value=t.clearcoatNormalMap,n(t.clearcoatNormalMap,e.clearcoatNormalMapTransform),e.clearcoatNormalScale.value.copy(t.clearcoatNormalScale),t.side===1&&e.clearcoatNormalScale.value.negate())),t.dispersion>0&&(e.dispersion.value=t.dispersion),t.iridescence>0&&(e.iridescence.value=t.iridescence,e.iridescenceIOR.value=t.iridescenceIOR,e.iridescenceThicknessMinimum.value=t.iridescenceThicknessRange[0],e.iridescenceThicknessMaximum.value=t.iridescenceThicknessRange[1],t.iridescenceMap&&(e.iridescenceMap.value=t.iridescenceMap,n(t.iridescenceMap,e.iridescenceMapTransform)),t.iridescenceThicknessMap&&(e.iridescenceThicknessMap.value=t.iridescenceThicknessMap,n(t.iridescenceThicknessMap,e.iridescenceThicknessMapTransform))),t.transmission>0&&(e.transmission.value=t.transmission,e.transmissionSamplerMap.value=r.texture,e.transmissionSamplerSize.value.set(r.width,r.height),t.transmissionMap&&(e.transmissionMap.value=t.transmissionMap,n(t.transmissionMap,e.transmissionMapTransform)),e.thickness.value=t.thickness,t.thicknessMap&&(e.thicknessMap.value=t.thicknessMap,n(t.thicknessMap,e.thicknessMapTransform)),e.attenuationDistance.value=t.attenuationDistance,e.attenuationColor.value.copy(t.attenuationColor)),t.anisotropy>0&&(e.anisotropyVector.value.set(t.anisotropy*Math.cos(t.anisotropyRotation),t.anisotropy*Math.sin(t.anisotropyRotation)),t.anisotropyMap&&(e.anisotropyMap.value=t.anisotropyMap,n(t.anisotropyMap,e.anisotropyMapTransform))),e.specularIntensity.value=t.specularIntensity,e.specularColor.value.copy(t.specularColor),t.specularColorMap&&(e.specularColorMap.value=t.specularColorMap,n(t.specularColorMap,e.specularColorMapTransform)),t.specularIntensityMap&&(e.specularIntensityMap.value=t.specularIntensityMap,n(t.specularIntensityMap,e.specularIntensityMapTransform))}function m(e,t){t.matcap&&(e.matcap.value=t.matcap)}function h(e,n){let r=t.get(n).light;e.referencePosition.value.setFromMatrixPosition(r.matrixWorld),e.nearDistance.value=r.shadow.camera.near,e.farDistance.value=r.shadow.camera.far}return{refreshFogUniforms:r,refreshMaterialUniforms:i}}function nd(e,t,n,r){let i={},a={},o=[],s=e.getParameter(e.MAX_UNIFORM_BUFFER_BINDINGS);function c(e,t){let n=t.program;r.uniformBlockBinding(e,n)}function l(e,n){let o=i[e.id];o===void 0&&(g(e),o=u(e),i[e.id]=o,e.addEventListener(`dispose`,v));let s=n.program;r.updateUBOMapping(e,s);let c=t.render.frame;a[e.id]!==c&&(f(e),a[e.id]=c)}function u(t){let n=d();t.__bindingPointIndex=n;let r=e.createBuffer(),i=t.__size,a=t.usage;return e.bindBuffer(e.UNIFORM_BUFFER,r),e.bufferData(e.UNIFORM_BUFFER,i,a),e.bindBuffer(e.UNIFORM_BUFFER,null),e.bindBufferBase(e.UNIFORM_BUFFER,n,r),r}function d(){for(let e=0;e<s;e++)if(o.indexOf(e)===-1)return o.push(e),e;return V(`WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached.`),0}function f(t){let n=i[t.id],r=t.uniforms,a=t.__cache;e.bindBuffer(e.UNIFORM_BUFFER,n);for(let e=0,t=r.length;e<t;e++){let t=r[e];if(Array.isArray(t))for(let n=0,r=t.length;n<r;n++)p(t[n],e,n,a);else p(t,e,0,a)}e.bindBuffer(e.UNIFORM_BUFFER,null)}function p(t,n,r,i){if(h(t,n,r,i)===!0){let n=t.__offset,r=t.value;if(Array.isArray(r)){let e=0;for(let n=0;n<r.length;n++){let i=r[n],a=_(i);m(i,t.__data,e),typeof i!=`number`&&typeof i!=`boolean`&&!i.isMatrix3&&!ArrayBuffer.isView(i)&&(e+=a.storage/Float32Array.BYTES_PER_ELEMENT)}}else m(r,t.__data,0);e.bufferSubData(e.UNIFORM_BUFFER,n,t.__data)}}function m(e,t,n){typeof e==`number`||typeof e==`boolean`?t[0]=e:e.isMatrix3?(t[0]=e.elements[0],t[1]=e.elements[1],t[2]=e.elements[2],t[3]=0,t[4]=e.elements[3],t[5]=e.elements[4],t[6]=e.elements[5],t[7]=0,t[8]=e.elements[6],t[9]=e.elements[7],t[10]=e.elements[8],t[11]=0):ArrayBuffer.isView(e)?t.set(new e.constructor(e.buffer,e.byteOffset,t.length)):e.toArray(t,n)}function h(e,t,n,r){let i=e.value,a=t+`_`+n;if(r[a]===void 0)return r[a]=typeof i==`number`||typeof i==`boolean`?i:ArrayBuffer.isView(i)?i.slice():i.clone(),!0;{let e=r[a];if(typeof i==`number`||typeof i==`boolean`){if(e!==i)return r[a]=i,!0}else if(ArrayBuffer.isView(i))return!0;else if(e.equals(i)===!1)return e.copy(i),!0}return!1}function g(e){let t=e.uniforms,n=0;for(let e=0,r=t.length;e<r;e++){let r=Array.isArray(t[e])?t[e]:[t[e]];for(let e=0,t=r.length;e<t;e++){let t=r[e],i=Array.isArray(t.value)?t.value:[t.value];for(let e=0,r=i.length;e<r;e++){let r=i[e],a=_(r),o=n%16,s=o%a.boundary,c=o+s;n+=s,c!==0&&16-c<a.storage&&(n+=16-c),t.__data=new Float32Array(a.storage/Float32Array.BYTES_PER_ELEMENT),t.__offset=n,n+=a.storage}}}let r=n%16;return r>0&&(n+=16-r),e.__size=n,e.__cache={},this}function _(e){let t={boundary:0,storage:0};return typeof e==`number`||typeof e==`boolean`?(t.boundary=4,t.storage=4):e.isVector2?(t.boundary=8,t.storage=8):e.isVector3||e.isColor?(t.boundary=16,t.storage=12):e.isVector4?(t.boundary=16,t.storage=16):e.isMatrix3?(t.boundary=48,t.storage=48):e.isMatrix4?(t.boundary=64,t.storage=64):e.isTexture?B(`WebGLRenderer: Texture samplers can not be part of an uniforms group.`):ArrayBuffer.isView(e)?(t.boundary=16,t.storage=e.byteLength):B(`WebGLRenderer: Unsupported uniform value type.`,e),t}function v(t){let n=t.target;n.removeEventListener(`dispose`,v);let r=o.indexOf(n.__bindingPointIndex);o.splice(r,1),e.deleteBuffer(i[n.id]),delete i[n.id],delete a[n.id]}function y(){for(let t in i)e.deleteBuffer(i[t]);o=[],i={},a={}}return{bind:c,update:l,dispose:y}}var rd=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),id=null;function ad(){return id===null&&(id=new Vi(rd,16,16,N,b),id.name=`DFG_LUT`,id.minFilter=l,id.magFilter=l,id.wrapS=i,id.wrapT=i,id.generateMipmaps=!1,id.needsUpdate=!0),id}var od=class{constructor(e={}){let{canvas:t=rt(),context:n=null,depth:r=!0,stencil:i=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:s=!0,preserveDrawingBuffer:c=!1,powerPreference:l=`default`,failIfMajorPerformanceCaveat:u=!1,reversedDepthBuffer:f=!1,outputBufferType:m=p}=e;this.isWebGLRenderer=!0;let h;if(n!==null){if(typeof WebGLRenderingContext<`u`&&n instanceof WebGLRenderingContext)throw Error(`THREE.WebGLRenderer: WebGL 1 is not supported since r163.`);h=n.getContextAttributes().alpha}else h=a;let _=m,y=new Set([te,ee,M]),w=new Set([p,v,g,C,x,S]),T=new Uint32Array(4),E=new Int32Array(4),D=new U,O=null,k=null,A=[],j=[],N=null;this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=0,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let P=this,ne=!1,re=null,ie=null,ae=null,oe=null;this._outputColorSpace=Ge;let se=0,ce=0,F=null,le=-1,ue=null,de=new nn,fe=new nn,pe=null,me=new G(0),he=0,ge=t.width,_e=t.height,ve=1,ye=null,be=null,xe=new nn(0,0,ge,_e),Se=new nn(0,0,ge,_e),Ce=!1,we=new sa,Te=!1,Ee=!1,De=new ln,Oe=new U,ke=new nn,Ae={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},je=!1;function Me(){return F===null?ve:1}let I=n;function Ne(e,n){return t.getContext(e,n)}try{let e={alpha:!0,depth:r,stencil:i,antialias:o,premultipliedAlpha:s,preserveDrawingBuffer:c,powerPreference:l,failIfMajorPerformanceCaveat:u};if(`setAttribute`in t&&t.setAttribute(`data-engine`,`three.js r185`),t.addEventListener(`webglcontextlost`,ot,!1),t.addEventListener(`webglcontextrestored`,st,!1),t.addEventListener(`webglcontextcreationerror`,lt,!1),I===null){let t=`webgl2`;if(I=Ne(t,e),I===null)throw Ne(t)?Error(`THREE.WebGLRenderer: Error creating WebGL context with your selected attributes.`):Error(`THREE.WebGLRenderer: Error creating WebGL context.`)}}catch(e){throw V(`WebGLRenderer: `+e.message),e}let Pe,Fe,L,Ie,R,z,Le,Re,ze,Be,Ve,He,Ue,We,Ke,qe,Je,Ye,Xe,Ze,Qe,et,tt;function nt(){Pe=new wc(I),Pe.init(),Qe=new Ju(I,Pe),Fe=new ec(I,Pe,e,Qe),L=new Ku(I,Pe),Fe.reversedDepthBuffer&&f&&L.buffers.depth.setReversed(!0),ie=I.createFramebuffer(),ae=I.createFramebuffer(),oe=I.createFramebuffer(),Ie=new Dc(I),R=new Eu,z=new qu(I,Pe,L,R,Fe,Qe,Ie),Le=new Cc(P),Re=new Ks(I),et=new Qs(I,Re),ze=new Tc(I,Re,Ie,et),Be=new kc(I,ze,Re,et,Ie),Ye=new Oc(I,Fe,z),Ke=new tc(R),Ve=new Tu(P,Le,Pe,Fe,et,Ke),He=new td(P,R),Ue=new Au,We=new Lu(Pe),Je=new Zs(P,Le,L,Be,h,s),qe=new Gu(P,Be,Fe),tt=new nd(I,Ie,Fe,L),Xe=new $s(I,Pe,Ie),Ze=new Ec(I,Pe,Ie),Ie.programs=Ve.programs,P.capabilities=Fe,P.extensions=Pe,P.properties=R,P.renderLists=Ue,P.shadowMap=qe,P.state=L,P.info=Ie}nt(),_!==1009&&(N=new jc(_,t.width,t.height,o,r,i));let it=new Qu(P,I);this.xr=it,this.getContext=function(){return I},this.getContextAttributes=function(){return I.getContextAttributes()},this.forceContextLoss=function(){let e=Pe.get(`WEBGL_lose_context`);e&&e.loseContext()},this.forceContextRestore=function(){let e=Pe.get(`WEBGL_lose_context`);e&&e.restoreContext()},this.getPixelRatio=function(){return ve},this.setPixelRatio=function(e){e!==void 0&&(ve=e,this.setSize(ge,_e,!1))},this.getSize=function(e){return e.set(ge,_e)},this.setSize=function(e,n,r=!0){if(it.isPresenting){B(`WebGLRenderer: Can't change size while VR device is presenting.`);return}ge=e,_e=n,t.width=Math.floor(e*ve),t.height=Math.floor(n*ve),r===!0&&(t.style.width=e+`px`,t.style.height=n+`px`),N!==null&&N.setSize(t.width,t.height),this.setViewport(0,0,e,n)},this.getDrawingBufferSize=function(e){return e.set(ge*ve,_e*ve).floor()},this.setDrawingBufferSize=function(e,n,r){ge=e,_e=n,ve=r,t.width=Math.floor(e*r),t.height=Math.floor(n*r),this.setViewport(0,0,e,n)},this.setEffects=function(e){if(_===1009){V(`WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.`);return}if(e){for(let t=0;t<e.length;t++)if(e[t].isOutputPass===!0){B(`WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.`);break}}N.setEffects(e||[])},this.getCurrentViewport=function(e){return e.copy(de)},this.getViewport=function(e){return e.copy(xe)},this.setViewport=function(e,t,n,r){e.isVector4?xe.set(e.x,e.y,e.z,e.w):xe.set(e,t,n,r),L.viewport(de.copy(xe).multiplyScalar(ve).round())},this.getScissor=function(e){return e.copy(Se)},this.setScissor=function(e,t,n,r){e.isVector4?Se.set(e.x,e.y,e.z,e.w):Se.set(e,t,n,r),L.scissor(fe.copy(Se).multiplyScalar(ve).round())},this.getScissorTest=function(){return Ce},this.setScissorTest=function(e){L.setScissorTest(Ce=e)},this.setOpaqueSort=function(e){ye=e},this.setTransparentSort=function(e){be=e},this.getClearColor=function(e){return e.copy(Je.getClearColor())},this.setClearColor=function(){Je.setClearColor(...arguments)},this.getClearAlpha=function(){return Je.getClearAlpha()},this.setClearAlpha=function(){Je.setClearAlpha(...arguments)},this.clear=function(e=!0,t=!0,n=!0){let r=0;if(e){let e=!1;if(F!==null){let t=F.texture.format;e=y.has(t)}if(e){let e=F.texture.type,t=w.has(e),n=Je.getClearColor(),r=Je.getClearAlpha(),i=n.r,a=n.g,o=n.b;t?(T[0]=i,T[1]=a,T[2]=o,T[3]=r,I.clearBufferuiv(I.COLOR,0,T)):(E[0]=i,E[1]=a,E[2]=o,E[3]=r,I.clearBufferiv(I.COLOR,0,E))}else r|=I.COLOR_BUFFER_BIT}t&&(r|=I.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),n&&(r|=I.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),r!==0&&I.clear(r)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(e){e.setRenderer(this),re=e},this.dispose=function(){t.removeEventListener(`webglcontextlost`,ot,!1),t.removeEventListener(`webglcontextrestored`,st,!1),t.removeEventListener(`webglcontextcreationerror`,lt,!1),Je.dispose(),Ue.dispose(),We.dispose(),R.dispose(),Le.dispose(),Be.dispose(),et.dispose(),tt.dispose(),Ve.dispose(),it.dispose(),it.removeEventListener(`sessionstart`,gt),it.removeEventListener(`sessionend`,_t),vt.stop()};function ot(e){e.preventDefault(),at(`WebGLRenderer: Context Lost.`),ne=!0}function st(){at(`WebGLRenderer: Context Restored.`),ne=!1;let e=Ie.autoReset,t=qe.enabled,n=qe.autoUpdate,r=qe.needsUpdate,i=qe.type;nt(),Ie.autoReset=e,qe.enabled=t,qe.autoUpdate=n,qe.needsUpdate=r,qe.type=i}function lt(e){V(`WebGLRenderer: A WebGL context could not be created. Reason: `,e.statusMessage)}function ut(e){let t=e.target;t.removeEventListener(`dispose`,ut),dt(t)}function dt(e){ft(e),R.remove(e)}function ft(e){let t=R.get(e).programs;t!==void 0&&(t.forEach(function(e){Ve.releaseProgram(e)}),e.isShaderMaterial&&Ve.releaseShaderCache(e))}this.renderBufferDirect=function(e,t,n,r,i,a){t===null&&(t=Ae);let o=i.isMesh&&i.matrixWorld.determinantAffine()<0,s=Ot(e,t,n,r,i);L.setMaterial(r,o);let c=n.index,l=1;if(r.wireframe===!0){if(c=ze.getWireframeAttribute(n),c===void 0)return;l=2}let u=n.drawRange,d=n.attributes.position,f=u.start*l,p=(u.start+u.count)*l;a!==null&&(f=Math.max(f,a.start*l),p=Math.min(p,(a.start+a.count)*l)),c===null?d!=null&&(f=Math.max(f,0),p=Math.min(p,d.count)):(f=Math.max(f,0),p=Math.min(p,c.count));let m=p-f;if(m<0||m===1/0)return;et.setup(i,r,s,n,c);let h,g=Xe;if(c!==null&&(h=Re.get(c),g=Ze,g.setIndex(h)),i.isMesh)r.wireframe===!0?(L.setLineWidth(r.wireframeLinewidth*Me()),g.setMode(I.LINES)):g.setMode(I.TRIANGLES);else if(i.isLine){let e=r.linewidth;e===void 0&&(e=1),L.setLineWidth(e*Me()),i.isLineSegments?g.setMode(I.LINES):i.isLineLoop?g.setMode(I.LINE_LOOP):g.setMode(I.LINE_STRIP)}else i.isPoints?g.setMode(I.POINTS):i.isSprite&&g.setMode(I.TRIANGLES);if(i.isBatchedMesh)if(Pe.get(`WEBGL_multi_draw`))g.renderMultiDraw(i._multiDrawStarts,i._multiDrawCounts,i._multiDrawCount);else{let e=i._multiDrawStarts,t=i._multiDrawCounts,n=i._multiDrawCount,a=c?Re.get(c).bytesPerElement:1,o=R.get(r).currentProgram.getUniforms();for(let r=0;r<n;r++)o.setValue(I,`_gl_DrawID`,r),g.render(e[r]/a,t[r])}else if(i.isInstancedMesh)g.renderInstances(f,m,i.count);else if(n.isInstancedBufferGeometry){let e=n._maxInstanceCount===void 0?1/0:n._maxInstanceCount,t=Math.min(n.instanceCount,e);g.renderInstances(f,m,t)}else g.render(f,m)};function pt(e,t,n){e.transparent===!0&&e.side===2&&e.forceSinglePass===!1?(e.side=1,e.needsUpdate=!0,wt(e,t,n),e.side=0,e.needsUpdate=!0,wt(e,t,n),e.side=2):wt(e,t,n)}this.compile=function(e,t,n=null){n===null&&(n=e),k=We.get(n),k.init(t),j.push(k),n.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&(k.pushLight(e),e.castShadow&&k.pushShadow(e))}),e!==n&&e.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&(k.pushLight(e),e.castShadow&&k.pushShadow(e))}),k.setupLights();let r=new Set;return e.traverse(function(e){if(!(e.isMesh||e.isPoints||e.isLine||e.isSprite))return;let t=e.material;if(t)if(Array.isArray(t))for(let i=0;i<t.length;i++){let a=t[i];pt(a,n,e),r.add(a)}else pt(t,n,e),r.add(t)}),k=j.pop(),r},this.compileAsync=function(e,t,n=null){let r=this.compile(e,t,n);return new Promise(t=>{function n(){if(r.forEach(function(e){R.get(e).currentProgram.isReady()&&r.delete(e)}),r.size===0){t(e);return}setTimeout(n,10)}Pe.get(`KHR_parallel_shader_compile`)===null?setTimeout(n,10):n()})};let mt=null;function ht(e){mt&&mt(e)}function gt(){vt.stop()}function _t(){vt.start()}let vt=new Gs;vt.setAnimationLoop(ht),typeof self<`u`&&vt.setContext(self),this.setAnimationLoop=function(e){mt=e,it.setAnimationLoop(e),e===null?vt.stop():vt.start()},it.addEventListener(`sessionstart`,gt),it.addEventListener(`sessionend`,_t),this.render=function(e,t){if(t!==void 0&&t.isCamera!==!0){V(`WebGLRenderer.render: camera is not an instance of THREE.Camera.`);return}if(ne===!0)return;re!==null&&re.renderStart(e,t);let n=it.enabled===!0&&it.isPresenting===!0,r=N!==null&&(F===null||n)&&N.begin(P,F);if(e.matrixWorldAutoUpdate===!0&&e.updateMatrixWorld(),t.parent===null&&t.matrixWorldAutoUpdate===!0&&t.updateMatrixWorld(),it.enabled===!0&&it.isPresenting===!0&&(N===null||N.isCompositing()===!1)&&(it.cameraAutoUpdate===!0&&it.updateCamera(t),t=it.getCamera()),e.isScene===!0&&e.onBeforeRender(P,e,t,F),k=We.get(e,j.length),k.init(t),k.state.textureUnits=z.getTextureUnits(),j.push(k),De.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),we.setFromProjectionMatrix(De,$e,t.reversedDepth),Ee=this.localClippingEnabled,Te=Ke.init(this.clippingPlanes,Ee),O=Ue.get(e,A.length),O.init(),A.push(O),it.enabled===!0&&it.isPresenting===!0){let e=P.xr.getDepthSensingMesh();e!==null&&yt(e,t,-1/0,P.sortObjects)}yt(e,t,0,P.sortObjects),O.finish(),P.sortObjects===!0&&O.sort(ye,be,t.reversedDepth),je=it.enabled===!1||it.isPresenting===!1||it.hasDepthSensing()===!1,je&&Je.addToRenderList(O,e),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),Te===!0&&Ke.beginShadows();let i=k.state.shadowsArray;if(qe.render(i,e,t),Te===!0&&Ke.endShadows(),(r&&N.hasRenderPass())===!1){let n=O.opaque,r=O.transmissive;if(k.setupLights(),t.isArrayCamera){let i=t.cameras;if(r.length>0)for(let t=0,a=i.length;t<a;t++){let a=i[t];xt(n,r,e,a)}je&&Je.render(e);for(let t=0,n=i.length;t<n;t++){let n=i[t];bt(O,e,n,n.viewport)}}else r.length>0&&xt(n,r,e,t),je&&Je.render(e),bt(O,e,t)}F!==null&&ce===0&&(z.updateMultisampleRenderTarget(F),z.updateRenderTargetMipmap(F)),r&&N.end(P),e.isScene===!0&&e.onAfterRender(P,e,t),et.resetDefaultState(),le=-1,ue=null,j.pop(),j.length>0?(k=j[j.length-1],z.setTextureUnits(k.state.textureUnits),Te===!0&&Ke.setGlobalState(P.clippingPlanes,k.state.camera)):k=null,A.pop(),O=A.length>0?A[A.length-1]:null,re!==null&&re.renderEnd()};function yt(e,t,n,r){if(e.visible===!1)return;if(e.layers.test(t.layers)){if(e.isGroup)n=e.renderOrder;else if(e.isLOD)e.autoUpdate===!0&&e.update(t);else if(e.isLightProbeGrid)k.pushLightProbeGrid(e);else if(e.isLight)k.pushLight(e),e.castShadow&&k.pushShadow(e);else if(e.isSprite){if(!e.frustumCulled||we.intersectsSprite(e)){r&&ke.setFromMatrixPosition(e.matrixWorld).applyMatrix4(De);let t=Be.update(e),i=e.material;i.visible&&O.push(e,t,i,n,ke.z,null)}}else if((e.isMesh||e.isLine||e.isPoints)&&(!e.frustumCulled||we.intersectsObject(e))){let t=Be.update(e),i=e.material;if(r&&(e.boundingSphere===void 0?(t.boundingSphere===null&&t.computeBoundingSphere(),ke.copy(t.boundingSphere.center)):(e.boundingSphere===null&&e.computeBoundingSphere(),ke.copy(e.boundingSphere.center)),ke.applyMatrix4(e.matrixWorld).applyMatrix4(De)),Array.isArray(i)){let r=t.groups;for(let a=0,o=r.length;a<o;a++){let o=r[a],s=i[o.materialIndex];s&&s.visible&&O.push(e,t,s,n,ke.z,o)}}else i.visible&&O.push(e,t,i,n,ke.z,null)}}let i=e.children;for(let e=0,a=i.length;e<a;e++)yt(i[e],t,n,r)}function bt(e,t,n,r){let{opaque:i,transmissive:a,transparent:o}=e;k.setupLightsView(n),Te===!0&&Ke.setGlobalState(P.clippingPlanes,n),r&&L.viewport(de.copy(r)),i.length>0&&St(i,t,n),a.length>0&&St(a,t,n),o.length>0&&St(o,t,n),L.buffers.depth.setTest(!0),L.buffers.depth.setMask(!0),L.buffers.color.setMask(!0),L.setPolygonOffset(!1)}function xt(e,t,n,r){if((n.isScene===!0?n.overrideMaterial:null)!==null)return;if(k.state.transmissionRenderTarget[r.id]===void 0){let e=Pe.has(`EXT_color_buffer_half_float`)||Pe.has(`EXT_color_buffer_float`);k.state.transmissionRenderTarget[r.id]=new an(1,1,{generateMipmaps:!0,type:e?b:p,minFilter:d,samples:Math.max(4,Fe.samples),stencilBuffer:i,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:Gt.workingColorSpace})}let a=k.state.transmissionRenderTarget[r.id],o=r.viewport||de;a.setSize(o.z*P.transmissionResolutionScale,o.w*P.transmissionResolutionScale);let s=P.getRenderTarget(),c=P.getActiveCubeFace(),l=P.getActiveMipmapLevel();P.setRenderTarget(a),P.getClearColor(me),he=P.getClearAlpha(),he<1&&P.setClearColor(16777215,.5),P.clear(),je&&Je.render(n);let u=P.toneMapping;P.toneMapping=0;let f=r.viewport;if(r.viewport!==void 0&&(r.viewport=void 0),k.setupLightsView(r),Te===!0&&Ke.setGlobalState(P.clippingPlanes,r),St(e,n,r),z.updateMultisampleRenderTarget(a),z.updateRenderTargetMipmap(a),Pe.has(`WEBGL_multisampled_render_to_texture`)===!1){let e=!1;for(let i=0,a=t.length;i<a;i++){let{object:a,geometry:o,material:s,group:c}=t[i];if(s.side===2&&a.layers.test(r.layers)){let t=s.side;s.side=1,s.needsUpdate=!0,Ct(a,n,r,o,s,c),s.side=t,s.needsUpdate=!0,e=!0}}e===!0&&(z.updateMultisampleRenderTarget(a),z.updateRenderTargetMipmap(a))}P.setRenderTarget(s,c,l),P.setClearColor(me,he),f!==void 0&&(r.viewport=f),P.toneMapping=u}function St(e,t,n){let r=t.isScene===!0?t.overrideMaterial:null;for(let i=0,a=e.length;i<a;i++){let a=e[i],{object:o,geometry:s,group:c}=a,l=a.material;l.allowOverride===!0&&r!==null&&(l=r),o.layers.test(n.layers)&&Ct(o,t,n,s,l,c)}}function Ct(e,t,n,r,i,a){e.onBeforeRender(P,t,n,r,i,a),e.modelViewMatrix.multiplyMatrices(n.matrixWorldInverse,e.matrixWorld),e.normalMatrix.getNormalMatrix(e.modelViewMatrix),i.onBeforeRender(P,t,n,r,e,a),i.transparent===!0&&i.side===2&&i.forceSinglePass===!1?(i.side=1,i.needsUpdate=!0,P.renderBufferDirect(n,t,r,i,e,a),i.side=0,i.needsUpdate=!0,P.renderBufferDirect(n,t,r,i,e,a),i.side=2):P.renderBufferDirect(n,t,r,i,e,a),e.onAfterRender(P,t,n,r,i,a)}function wt(e,t,n){t.isScene!==!0&&(t=Ae);let r=R.get(e),i=k.state.lights,a=k.state.shadowsArray,o=i.state.version,s=Ve.getParameters(e,i.state,a,t,n,k.state.lightProbeGridArray),c=Ve.getProgramCacheKey(s),l=r.programs;r.environment=e.isMeshStandardMaterial||e.isMeshLambertMaterial||e.isMeshPhongMaterial?t.environment:null,r.fog=t.fog;let u=e.isMeshStandardMaterial||e.isMeshLambertMaterial&&!e.envMap||e.isMeshPhongMaterial&&!e.envMap;r.envMap=Le.get(e.envMap||r.environment,u),r.envMapRotation=r.environment!==null&&e.envMap===null?t.environmentRotation:e.envMapRotation,l===void 0&&(e.addEventListener(`dispose`,ut),l=new Map,r.programs=l);let d=l.get(c);if(d!==void 0){if(r.currentProgram===d&&r.lightsStateVersion===o)return Et(e,s),d}else s.uniforms=Ve.getUniforms(e),re!==null&&e.isNodeMaterial&&re.build(e,n,s),e.onBeforeCompile(s,P),d=Ve.acquireProgram(s,c),l.set(c,d),r.uniforms=s.uniforms;let f=r.uniforms;return(!e.isShaderMaterial&&!e.isRawShaderMaterial||e.clipping===!0)&&(f.clippingPlanes=Ke.uniform),Et(e,s),r.needsLights=At(e),r.lightsStateVersion=o,r.needsLights&&(f.ambientLightColor.value=i.state.ambient,f.lightProbe.value=i.state.probe,f.directionalLights.value=i.state.directional,f.directionalLightShadows.value=i.state.directionalShadow,f.spotLights.value=i.state.spot,f.spotLightShadows.value=i.state.spotShadow,f.rectAreaLights.value=i.state.rectArea,f.ltc_1.value=i.state.rectAreaLTC1,f.ltc_2.value=i.state.rectAreaLTC2,f.pointLights.value=i.state.point,f.pointLightShadows.value=i.state.pointShadow,f.hemisphereLights.value=i.state.hemi,f.directionalShadowMatrix.value=i.state.directionalShadowMatrix,f.spotLightMatrix.value=i.state.spotLightMatrix,f.spotLightMap.value=i.state.spotLightMap,f.pointShadowMatrix.value=i.state.pointShadowMatrix),r.lightProbeGrid=k.state.lightProbeGridArray.length>0,r.currentProgram=d,r.uniformsList=null,d}function Tt(e){if(e.uniformsList===null){let t=e.currentProgram.getUniforms();e.uniformsList=Rl.seqWithValue(t.seq,e.uniforms)}return e.uniformsList}function Et(e,t){let n=R.get(e);n.outputColorSpace=t.outputColorSpace,n.batching=t.batching,n.batchingColor=t.batchingColor,n.instancing=t.instancing,n.instancingColor=t.instancingColor,n.instancingMorph=t.instancingMorph,n.skinning=t.skinning,n.morphTargets=t.morphTargets,n.morphNormals=t.morphNormals,n.morphColors=t.morphColors,n.morphTargetsCount=t.morphTargetsCount,n.numClippingPlanes=t.numClippingPlanes,n.numIntersection=t.numClipIntersection,n.vertexAlphas=t.vertexAlphas,n.vertexTangents=t.vertexTangents,n.toneMapping=t.toneMapping}function Dt(e,t){if(e.length===0)return null;if(e.length===1)return e[0].texture===null?null:e[0];D.setFromMatrixPosition(t.matrixWorld);for(let t=0,n=e.length;t<n;t++){let n=e[t];if(n.texture!==null&&n.boundingBox.containsPoint(D))return n}return null}function Ot(e,t,n,r,i){t.isScene!==!0&&(t=Ae),z.resetTextureUnits();let a=t.fog,o=r.isMeshStandardMaterial||r.isMeshLambertMaterial||r.isMeshPhongMaterial?t.environment:null,s=F===null?P.outputColorSpace:F.isXRRenderTarget===!0?F.texture.colorSpace:Gt.workingColorSpace,c=r.isMeshStandardMaterial||r.isMeshLambertMaterial&&!r.envMap||r.isMeshPhongMaterial&&!r.envMap,l=Le.get(r.envMap||o,c),u=r.vertexColors===!0&&!!n.attributes.color&&n.attributes.color.itemSize===4,d=!!n.attributes.tangent&&(!!r.normalMap||r.anisotropy>0),f=!!n.morphAttributes.position,p=!!n.morphAttributes.normal,m=!!n.morphAttributes.color,h=0;r.toneMapped&&(F===null||F.isXRRenderTarget===!0)&&(h=P.toneMapping);let g=n.morphAttributes.position||n.morphAttributes.normal||n.morphAttributes.color,_=g===void 0?0:g.length,v=R.get(r),y=k.state.lights;if(Te===!0&&(Ee===!0||e!==ue)){let t=e===ue&&r.id===le;Ke.setState(r,e,t)}let b=!1;r.version===v.__version?v.needsLights&&v.lightsStateVersion!==y.state.version?b=!0:v.outputColorSpace===s?i.isBatchedMesh&&v.batching===!1||!i.isBatchedMesh&&v.batching===!0||i.isBatchedMesh&&v.batchingColor===!0&&i.colorTexture===null||i.isBatchedMesh&&v.batchingColor===!1&&i.colorTexture!==null||i.isInstancedMesh&&v.instancing===!1||!i.isInstancedMesh&&v.instancing===!0||i.isSkinnedMesh&&v.skinning===!1||!i.isSkinnedMesh&&v.skinning===!0||i.isInstancedMesh&&v.instancingColor===!0&&i.instanceColor===null||i.isInstancedMesh&&v.instancingColor===!1&&i.instanceColor!==null||i.isInstancedMesh&&v.instancingMorph===!0&&i.morphTexture===null||i.isInstancedMesh&&v.instancingMorph===!1&&i.morphTexture!==null?b=!0:v.envMap===l?r.fog===!0&&v.fog!==a||v.numClippingPlanes!==void 0&&(v.numClippingPlanes!==Ke.numPlanes||v.numIntersection!==Ke.numIntersection)?b=!0:v.vertexAlphas===u&&v.vertexTangents===d&&v.morphTargets===f&&v.morphNormals===p&&v.morphColors===m&&v.toneMapping===h&&v.morphTargetsCount===_?!!v.lightProbeGrid!=k.state.lightProbeGridArray.length>0&&(b=!0):b=!0:b=!0:b=!0:(b=!0,v.__version=r.version);let x=v.currentProgram;b===!0&&(x=wt(r,t,i),re&&r.isNodeMaterial&&re.onUpdateProgram(r,x,v));let S=!1,C=!1,w=!1,T=x.getUniforms(),E=v.uniforms;if(L.useProgram(x.program)&&(S=!0,C=!0,w=!0),r.id!==le&&(le=r.id,C=!0),v.needsLights){let e=Dt(k.state.lightProbeGridArray,i);v.lightProbeGrid!==e&&(v.lightProbeGrid=e,C=!0)}if(S||ue!==e){L.buffers.depth.getReversed()&&e.reversedDepth!==!0&&(e._reversedDepth=!0,e.updateProjectionMatrix()),T.setValue(I,`projectionMatrix`,e.projectionMatrix),T.setValue(I,`viewMatrix`,e.matrixWorldInverse);let t=T.map.cameraPosition;t!==void 0&&t.setValue(I,Oe.setFromMatrixPosition(e.matrixWorld)),Fe.logarithmicDepthBuffer&&T.setValue(I,`logDepthBufFC`,2/(Math.log(e.far+1)/Math.LN2)),(r.isMeshPhongMaterial||r.isMeshToonMaterial||r.isMeshLambertMaterial||r.isMeshBasicMaterial||r.isMeshStandardMaterial||r.isShaderMaterial)&&T.setValue(I,`isOrthographic`,e.isOrthographicCamera===!0),ue!==e&&(ue=e,C=!0,w=!0)}if(v.needsLights&&(y.state.directionalShadowMap.length>0&&T.setValue(I,`directionalShadowMap`,y.state.directionalShadowMap,z),y.state.spotShadowMap.length>0&&T.setValue(I,`spotShadowMap`,y.state.spotShadowMap,z),y.state.pointShadowMap.length>0&&T.setValue(I,`pointShadowMap`,y.state.pointShadowMap,z)),i.isSkinnedMesh){T.setOptional(I,i,`bindMatrix`),T.setOptional(I,i,`bindMatrixInverse`);let e=i.skeleton;e&&(e.boneTexture===null&&e.computeBoneTexture(),T.setValue(I,`boneTexture`,e.boneTexture,z))}i.isBatchedMesh&&(T.setOptional(I,i,`batchingTexture`),T.setValue(I,`batchingTexture`,i._matricesTexture,z),T.setOptional(I,i,`batchingIdTexture`),T.setValue(I,`batchingIdTexture`,i._indirectTexture,z),T.setOptional(I,i,`batchingColorTexture`),i._colorsTexture!==null&&T.setValue(I,`batchingColorTexture`,i._colorsTexture,z));let D=n.morphAttributes;if((D.position!==void 0||D.normal!==void 0||D.color!==void 0)&&Ye.update(i,n,x),(C||v.receiveShadow!==i.receiveShadow)&&(v.receiveShadow=i.receiveShadow,T.setValue(I,`receiveShadow`,i.receiveShadow)),(r.isMeshStandardMaterial||r.isMeshLambertMaterial||r.isMeshPhongMaterial)&&r.envMap===null&&t.environment!==null&&(E.envMapIntensity.value=t.environmentIntensity),E.dfgLUT!==void 0&&(E.dfgLUT.value=ad()),C){if(T.setValue(I,`toneMappingExposure`,P.toneMappingExposure),v.needsLights&&kt(E,w),a&&r.fog===!0&&He.refreshFogUniforms(E,a),He.refreshMaterialUniforms(E,r,ve,_e,k.state.transmissionRenderTarget[e.id]),v.needsLights&&v.lightProbeGrid){let e=v.lightProbeGrid;E.probesSH.value=e.texture,E.probesMin.value.copy(e.boundingBox.min),E.probesMax.value.copy(e.boundingBox.max),E.probesResolution.value.copy(e.resolution)}Rl.upload(I,Tt(v),E,z)}if(r.isShaderMaterial&&r.uniformsNeedUpdate===!0&&(Rl.upload(I,Tt(v),E,z),r.uniformsNeedUpdate=!1),r.isSpriteMaterial&&T.setValue(I,`center`,i.center),T.setValue(I,`modelViewMatrix`,i.modelViewMatrix),T.setValue(I,`normalMatrix`,i.normalMatrix),T.setValue(I,`modelMatrix`,i.matrixWorld),r.uniformsGroups!==void 0){let e=r.uniformsGroups;for(let t=0,n=e.length;t<n;t++){let n=e[t];tt.update(n,x),tt.bind(n,x)}}return x}function kt(e,t){e.ambientLightColor.needsUpdate=t,e.lightProbe.needsUpdate=t,e.directionalLights.needsUpdate=t,e.directionalLightShadows.needsUpdate=t,e.pointLights.needsUpdate=t,e.pointLightShadows.needsUpdate=t,e.spotLights.needsUpdate=t,e.spotLightShadows.needsUpdate=t,e.rectAreaLights.needsUpdate=t,e.hemisphereLights.needsUpdate=t}function At(e){return e.isMeshLambertMaterial||e.isMeshToonMaterial||e.isMeshPhongMaterial||e.isMeshStandardMaterial||e.isShadowMaterial||e.isShaderMaterial&&e.lights===!0}this.getActiveCubeFace=function(){return se},this.getActiveMipmapLevel=function(){return ce},this.getRenderTarget=function(){return F},this.setRenderTargetTextures=function(e,t,n){let r=R.get(e);r.__autoAllocateDepthBuffer=e.resolveDepthBuffer===!1,r.__autoAllocateDepthBuffer===!1&&(r.__useRenderToTexture=!1),R.get(e.texture).__webglTexture=t,R.get(e.depthTexture).__webglTexture=r.__autoAllocateDepthBuffer?void 0:n,r.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(e,t){let n=R.get(e);n.__webglFramebuffer=t,n.__useDefaultFramebuffer=t===void 0},this.setRenderTarget=function(e,t=0,n=0){F=e,se=t,ce=n;let r=null,i=!1,a=!1;if(e){let o=R.get(e);if(o.__useDefaultFramebuffer!==void 0){L.bindFramebuffer(I.FRAMEBUFFER,o.__webglFramebuffer),de.copy(e.viewport),fe.copy(e.scissor),pe=e.scissorTest,L.viewport(de),L.scissor(fe),L.setScissorTest(pe),le=-1;return}if(o.__webglFramebuffer===void 0)z.setupRenderTarget(e);else if(o.__hasExternalTextures)z.rebindTextures(e,R.get(e.texture).__webglTexture,R.get(e.depthTexture).__webglTexture);else if(e.depthBuffer){let t=e.depthTexture;if(o.__boundDepthTexture!==t){if(t!==null&&R.has(t)&&(e.width!==t.image.width||e.height!==t.image.height))throw Error(`THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.`);z.setupDepthRenderbuffer(e)}}let s=e.texture;(s.isData3DTexture||s.isDataArrayTexture||s.isCompressedArrayTexture)&&(a=!0);let c=R.get(e).__webglFramebuffer;e.isWebGLCubeRenderTarget?(r=Array.isArray(c[t])?c[t][n]:c[t],i=!0):r=e.samples>0&&z.useMultisampledRTT(e)===!1?R.get(e).__webglMultisampledFramebuffer:Array.isArray(c)?c[n]:c,de.copy(e.viewport),fe.copy(e.scissor),pe=e.scissorTest}else de.copy(xe).multiplyScalar(ve).floor(),fe.copy(Se).multiplyScalar(ve).floor(),pe=Ce;if(n!==0&&(r=ie),L.bindFramebuffer(I.FRAMEBUFFER,r)&&L.drawBuffers(e,r),L.viewport(de),L.scissor(fe),L.setScissorTest(pe),i){let r=R.get(e.texture);I.framebufferTexture2D(I.FRAMEBUFFER,I.COLOR_ATTACHMENT0,I.TEXTURE_CUBE_MAP_POSITIVE_X+t,r.__webglTexture,n)}else if(a){let r=t;for(let t=0;t<e.textures.length;t++){let i=R.get(e.textures[t]);I.framebufferTextureLayer(I.FRAMEBUFFER,I.COLOR_ATTACHMENT0+t,i.__webglTexture,n,r)}}else if(e!==null&&n!==0){let t=R.get(e.texture);I.framebufferTexture2D(I.FRAMEBUFFER,I.COLOR_ATTACHMENT0,I.TEXTURE_2D,t.__webglTexture,n)}le=-1},this.readRenderTargetPixels=function(e,t,n,r,i,a,o,s=0){if(!(e&&e.isWebGLRenderTarget)){V(`WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.`);return}let c=R.get(e).__webglFramebuffer;if(e.isWebGLCubeRenderTarget&&o!==void 0&&(c=c[o]),c){L.bindFramebuffer(I.FRAMEBUFFER,c);try{let o=e.textures[s],c=o.format,l=o.type;if(e.textures.length>1&&I.readBuffer(I.COLOR_ATTACHMENT0+s),!Fe.textureFormatReadable(c)){V(`WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.`);return}if(!Fe.textureTypeReadable(l)){V(`WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.`);return}t>=0&&t<=e.width-r&&n>=0&&n<=e.height-i&&I.readPixels(t,n,r,i,Qe.convert(c),Qe.convert(l),a)}finally{let e=F===null?null:R.get(F).__webglFramebuffer;L.bindFramebuffer(I.FRAMEBUFFER,e)}}},this.readRenderTargetPixelsAsync=async function(e,t,n,r,i,a,o,s=0){if(!(e&&e.isWebGLRenderTarget))throw Error(`THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.`);let c=R.get(e).__webglFramebuffer;if(e.isWebGLCubeRenderTarget&&o!==void 0&&(c=c[o]),c)if(t>=0&&t<=e.width-r&&n>=0&&n<=e.height-i){L.bindFramebuffer(I.FRAMEBUFFER,c);let o=e.textures[s],l=o.format,u=o.type;if(e.textures.length>1&&I.readBuffer(I.COLOR_ATTACHMENT0+s),!Fe.textureFormatReadable(l))throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.`);if(!Fe.textureTypeReadable(u))throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.`);let d=I.createBuffer();I.bindBuffer(I.PIXEL_PACK_BUFFER,d),I.bufferData(I.PIXEL_PACK_BUFFER,a.byteLength,I.STREAM_READ),I.readPixels(t,n,r,i,Qe.convert(l),Qe.convert(u),0);let f=F===null?null:R.get(F).__webglFramebuffer;L.bindFramebuffer(I.FRAMEBUFFER,f);let p=I.fenceSync(I.SYNC_GPU_COMMANDS_COMPLETE,0);return I.flush(),await ct(I,p,4),I.bindBuffer(I.PIXEL_PACK_BUFFER,d),I.getBufferSubData(I.PIXEL_PACK_BUFFER,0,a),I.deleteBuffer(d),I.deleteSync(p),a}else throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.`)},this.copyFramebufferToTexture=function(e,t=null,n=0){let r=2**-n,i=Math.floor(e.image.width*r),a=Math.floor(e.image.height*r),o=t===null?0:t.x,s=t===null?0:t.y;z.setTexture2D(e,0),I.copyTexSubImage2D(I.TEXTURE_2D,n,0,0,o,s,i,a),L.unbindTexture()},this.copyTextureToTexture=function(e,t,n=null,r=null,i=0,a=0){let o,s,c,l,u,d,f,p,m,h=e.isCompressedTexture?e.mipmaps[a]:e.image;if(n!==null)o=n.max.x-n.min.x,s=n.max.y-n.min.y,c=n.isBox3?n.max.z-n.min.z:1,l=n.min.x,u=n.min.y,d=n.isBox3?n.min.z:0;else{let t=2**-i;o=Math.floor(h.width*t),s=Math.floor(h.height*t),c=e.isDataArrayTexture?h.depth:e.isData3DTexture?Math.floor(h.depth*t):1,l=0,u=0,d=0}r===null?(f=0,p=0,m=0):(f=r.x,p=r.y,m=r.z);let g=Qe.convert(t.format),_=Qe.convert(t.type),v;t.isData3DTexture?(z.setTexture3D(t,0),v=I.TEXTURE_3D):t.isDataArrayTexture||t.isCompressedArrayTexture?(z.setTexture2DArray(t,0),v=I.TEXTURE_2D_ARRAY):(z.setTexture2D(t,0),v=I.TEXTURE_2D),L.activeTexture(I.TEXTURE0),L.pixelStorei(I.UNPACK_FLIP_Y_WEBGL,t.flipY),L.pixelStorei(I.UNPACK_PREMULTIPLY_ALPHA_WEBGL,t.premultiplyAlpha),L.pixelStorei(I.UNPACK_ALIGNMENT,t.unpackAlignment);let y=L.getParameter(I.UNPACK_ROW_LENGTH),b=L.getParameter(I.UNPACK_IMAGE_HEIGHT),x=L.getParameter(I.UNPACK_SKIP_PIXELS),S=L.getParameter(I.UNPACK_SKIP_ROWS),C=L.getParameter(I.UNPACK_SKIP_IMAGES);L.pixelStorei(I.UNPACK_ROW_LENGTH,h.width),L.pixelStorei(I.UNPACK_IMAGE_HEIGHT,h.height),L.pixelStorei(I.UNPACK_SKIP_PIXELS,l),L.pixelStorei(I.UNPACK_SKIP_ROWS,u),L.pixelStorei(I.UNPACK_SKIP_IMAGES,d);let w=e.isDataArrayTexture||e.isData3DTexture,T=t.isDataArrayTexture||t.isData3DTexture;if(e.isDepthTexture){let n=R.get(e),r=R.get(t),h=R.get(n.__renderTarget),g=R.get(r.__renderTarget);L.bindFramebuffer(I.READ_FRAMEBUFFER,h.__webglFramebuffer),L.bindFramebuffer(I.DRAW_FRAMEBUFFER,g.__webglFramebuffer);for(let n=0;n<c;n++)w&&(I.framebufferTextureLayer(I.READ_FRAMEBUFFER,I.COLOR_ATTACHMENT0,R.get(e).__webglTexture,i,d+n),I.framebufferTextureLayer(I.DRAW_FRAMEBUFFER,I.COLOR_ATTACHMENT0,R.get(t).__webglTexture,a,m+n)),I.blitFramebuffer(l,u,o,s,f,p,o,s,I.DEPTH_BUFFER_BIT,I.NEAREST);L.bindFramebuffer(I.READ_FRAMEBUFFER,null),L.bindFramebuffer(I.DRAW_FRAMEBUFFER,null)}else if(i!==0||e.isRenderTargetTexture||R.has(e)){let n=R.get(e),r=R.get(t);L.bindFramebuffer(I.READ_FRAMEBUFFER,ae),L.bindFramebuffer(I.DRAW_FRAMEBUFFER,oe);for(let e=0;e<c;e++)w?I.framebufferTextureLayer(I.READ_FRAMEBUFFER,I.COLOR_ATTACHMENT0,n.__webglTexture,i,d+e):I.framebufferTexture2D(I.READ_FRAMEBUFFER,I.COLOR_ATTACHMENT0,I.TEXTURE_2D,n.__webglTexture,i),T?I.framebufferTextureLayer(I.DRAW_FRAMEBUFFER,I.COLOR_ATTACHMENT0,r.__webglTexture,a,m+e):I.framebufferTexture2D(I.DRAW_FRAMEBUFFER,I.COLOR_ATTACHMENT0,I.TEXTURE_2D,r.__webglTexture,a),i===0?T?I.copyTexSubImage3D(v,a,f,p,m+e,l,u,o,s):I.copyTexSubImage2D(v,a,f,p,l,u,o,s):I.blitFramebuffer(l,u,o,s,f,p,o,s,I.COLOR_BUFFER_BIT,I.NEAREST);L.bindFramebuffer(I.READ_FRAMEBUFFER,null),L.bindFramebuffer(I.DRAW_FRAMEBUFFER,null)}else T?e.isDataTexture||e.isData3DTexture?I.texSubImage3D(v,a,f,p,m,o,s,c,g,_,h.data):t.isCompressedArrayTexture?I.compressedTexSubImage3D(v,a,f,p,m,o,s,c,g,h.data):I.texSubImage3D(v,a,f,p,m,o,s,c,g,_,h):e.isDataTexture?I.texSubImage2D(I.TEXTURE_2D,a,f,p,o,s,g,_,h.data):e.isCompressedTexture?I.compressedTexSubImage2D(I.TEXTURE_2D,a,f,p,h.width,h.height,g,h.data):I.texSubImage2D(I.TEXTURE_2D,a,f,p,o,s,g,_,h);L.pixelStorei(I.UNPACK_ROW_LENGTH,y),L.pixelStorei(I.UNPACK_IMAGE_HEIGHT,b),L.pixelStorei(I.UNPACK_SKIP_PIXELS,x),L.pixelStorei(I.UNPACK_SKIP_ROWS,S),L.pixelStorei(I.UNPACK_SKIP_IMAGES,C),a===0&&t.generateMipmaps&&I.generateMipmap(v),L.unbindTexture()},this.initRenderTarget=function(e){R.get(e).__webglFramebuffer===void 0&&z.setupRenderTarget(e)},this.initTexture=function(e){e.isCubeTexture?z.setTextureCube(e,0):e.isData3DTexture?z.setTexture3D(e,0):e.isDataArrayTexture||e.isCompressedArrayTexture?z.setTexture2DArray(e,0):z.setTexture2D(e,0),L.unbindTexture()},this.resetState=function(){se=0,ce=0,F=null,L.reset(),et.reset()},typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`observe`,{detail:this}))}get coordinateSystem(){return $e}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorSpace=Gt._getDrawingBufferColorSpace(e),t.unpackColorSpace=Gt._getUnpackColorSpace()}},sd=Object.freeze({id:`person-self`,name:`我`,displayName:`小满`,initials:`XM`,portrait:`portraits/photo-derived/voxel/host.png`,relation:`关系世界的中心`,role:`体验设计师`,city:`上海`,palette:{hair:`#302a27`,jacket:`#2f665c`,MAT_Jacket_Light:`#4d8175`,shirt:`#e8dfc2`,pants:`#303f45`,shoes:`#c28a3a`,skin:`#d79a73`},graph:{x:50,y:48}}),cd=Object.freeze([{id:`lin-che`,name:`谢淯琪`,initials:`XYQ`,portrait:`portraits/photo-derived/voxel/person_01.png`,relation:`黑客松队友`,role:`产品策划`,city:`深圳`,lastSeen:`3 天前`,metAt:`2025 年秋 · 科技展咖啡摊`,bio:`擅长把混乱的讨论收束成清晰的问题。你们第一次见面时，因为借同一支记号笔聊了半小时。`,scene:{title:`展馆外的咖啡广场`,moment:`傍晚散场前`,atmosphere:`暖风、展牌和刚亮起的路灯`,summary:`你们在展馆外再次遇见。咖啡车还在，远处的人群正慢慢散去。`},tags:[`创作伙伴`,`产品`,`咖啡`],stats:{photos:24,voiceClips:6,memories:4},memories:[{date:`2026.07`,title:`凌晨的白板`,detail:`一起把 17 个点子压缩成了 3 个真正能做的方向。`},{date:`2026.04`,title:`雨天的语音`,detail:`一段关于“数字关系会不会长大”的四分钟语音。`},{date:`2025.10`,title:`第一次相遇`,detail:`在科技展的咖啡摊边，共用了最后一支蓝色记号笔。`}],conversation:{greeting:`你也回到这里了。上次那张关系世界的草图，我一直留着。`,starters:[`最近在做什么？`,`还记得我们第一次见面吗？`,`看看我们共同的记忆`],replies:[`最近我在整理展会后留下的那些想法，最有意思的还是我们聊过的“关系会继续生长”这件事。`,`当然。咖啡摊、蓝色记号笔，还有你突然画下的那棵关系树。`,`我最常想起的是那晚的白板。不是因为熬夜，而是每个人的想法第一次真的连在了一起。`]},palette:{hair:`#252a31`,jacket:`#315d83`,MAT_Jacket_Light:`#527ea2`,shirt:`#f0e7cf`,pants:`#313d4a`,shoes:`#d07444`,skin:`#d79a73`},graph:{x:29,y:27}},{id:`zhou-ning`,name:`曾英杰`,initials:`ZYJ`,portrait:`portraits/photo-derived/voxel/person_02.png`,relation:`大学同学`,role:`城市研究者`,city:`杭州`,lastSeen:`2 周前`,metAt:`2019 年夏 · 校园旧礼堂`,bio:`对城市里的小路和旧建筑格外敏感。你们一起做过一份无人问津、后来却被反复引用的校园地图。`,scene:{title:`旧礼堂后的银杏路`,moment:`午后四点`,atmosphere:`树影、旧砖墙和自行车铃声`,summary:`地图摊在长椅上，银杏叶落在曾经标记过的小路旁。`},tags:[`老同学`,`城市`,`地图`],stats:{photos:41,voiceClips:3,memories:7},memories:[{date:`2026.05`,title:`沿河散步`,detail:`没有目的地，最后走到了城市最旧的一座桥。`},{date:`2021.06`,title:`毕业地图`,detail:`给校园里 36 个不起眼的角落写下了名字。`},{date:`2019.07`,title:`旧礼堂`,detail:`第一次见面时，你们都在找同一扇侧门。`}],conversation:{greeting:`这里的路比我记忆里短了一点，不过风还是从礼堂后面吹过来。`,starters:[`最近去了哪座城市？`,`那张校园地图还在吗？`,`你最想重访哪里？`],replies:[`上周去了泉州。我很喜欢那些没有被规划成景点的小巷。`,`还在，而且折痕已经快把老食堂分成两半了。`,`礼堂后的那条小路。不是因为它最好看，是因为我们第一次在那里把一座城市画成了自己的版本。`]},palette:{hair:`#56352b`,jacket:`#b85f50`,MAT_Jacket_Light:`#d27a68`,shirt:`#f0dfc5`,pants:`#344957`,shoes:`#d0a95d`,skin:`#d79a73`},graph:{x:72,y:25}},{id:`chen-mo`,name:`黄月胜`,initials:`HYS`,portrait:`portraits/photo-derived/voxel/person_03.png`,relation:`前同事`,role:`交互工程师`,city:`北京`,lastSeen:`1 个月前`,metAt:`2022 年冬 · 第一次项目评审`,bio:`说话不多，但总能做出那个让方案突然成立的原型。你们共同经历过三个上线夜晚。`,scene:{title:`凌晨的工作室天台`,moment:`上线后的凌晨`,atmosphere:`城市灯光、自动售货机和微凉夜风`,summary:`进度条终于走完，天台上的两罐汽水还冒着冷气。`},tags:[`前同事`,`原型`,`深夜`],stats:{photos:16,voiceClips:9,memories:5},memories:[{date:`2025.01`,title:`最后一个版本`,detail:`你们在离职前把没有排期的小功能偷偷做完了。`},{date:`2023.09`,title:`无人会议室`,detail:`一次失败评审后，重新搭起了能被理解的原型。`},{date:`2022.12`,title:`第一次评审`,detail:`他只说了三句话，随后交出一个可以直接操作的版本。`}],conversation:{greeting:`场景加载得比我们当年的测试环境快。看来这次不用等到凌晨三点。`,starters:[`还在写原型吗？`,`你记得那个上线夜吗？`,`看看最近的作品`],replies:[`还在。只是现在会先问一句：这个原型究竟要证明什么。`,`记得。进度条卡在百分之九十九，你去买了两罐完全不冰的汽水。`,`最近在做一个不需要说明书的空间界面。等能跑的时候，我把入口发给你。`]},palette:{hair:`#242829`,jacket:`#667443`,MAT_Jacket_Light:`#89965c`,shirt:`#e4dec8`,pants:`#3d4442`,shoes:`#a45d3c`,skin:`#d79a73`},graph:{x:21,y:63}},{id:`xu-an`,name:`李浩`,initials:`LH`,portrait:`portraits/photo-derived/voxel/person_04.png`,relation:`旅行中认识的朋友`,role:`独立摄影师`,city:`成都`,lastSeen:`6 天前`,metAt:`2024 年春 · 海边公交站`,bio:`总能记住光线变化的时刻。你们因为错过同一班公交，在海边多停留了一个黄昏。`,scene:{title:`海边的末班车站`,moment:`日落后十分钟`,atmosphere:`盐味海风、橙色站牌和远处浪声`,summary:`末班车还没来，你们重新站在那块褪色的橙色站牌旁。`},tags:[`旅行`,`摄影`,`海边`],stats:{photos:58,voiceClips:2,memories:6},memories:[{date:`2026.06`,title:`寄来的照片`,detail:`一张没有人物的海边长椅，背面只写了日期。`},{date:`2025.03`,title:`旧相机店`,detail:`试拍的第一张照片里，店主刚好抬头。`},{date:`2024.04`,title:`错过末班车`,detail:`因为看海错过公交，也因此聊到了天黑。`}],conversation:{greeting:`海的方向好像没变。你看，站牌上的那道划痕也还在。`,starters:[`最近拍到了什么？`,`那班公交后来来了么？`,`为什么寄那张长椅？`],replies:[`拍到一条早晨六点才会出现的光带，它只停在楼梯上三分钟。`,`来了。只是我们都没上车，下一班又等了四十分钟。`,`因为那天坐在那里的人刚刚离开。我觉得空位比背影更像一段记忆。`]},palette:{hair:`#67392e`,jacket:`#c18b39`,MAT_Jacket_Light:`#d4a85d`,shirt:`#f0e5c9`,pants:`#315d59`,shoes:`#715040`,skin:`#d79a73`},graph:{x:79,y:61}},{id:`su-he`,name:`刘璐`,initials:`LL`,portrait:`portraits/photo-derived/voxel/person_05.png`,relation:`邻居`,role:`社区运营者`,city:`上海`,lastSeen:`昨天`,metAt:`2023 年夏 · 楼下修车棚`,bio:`认识附近每一家小店，也记得谁需要被照顾。你们从借一把六角扳手开始熟悉起来。`,scene:{title:`街角的周末花市`,moment:`周日上午`,atmosphere:`花香、遮阳棚和电车经过的声音`,summary:`熟悉的花摊刚刚摆好，她已经替你留了一小束洋桔梗。`},tags:[`邻居`,`社区`,`花市`],stats:{photos:31,voiceClips:11,memories:8},memories:[{date:`2026.08`,title:`停电的晚上`,detail:`大家把折叠椅搬到楼下，第一次聊到很晚。`},{date:`2025.11`,title:`共享工具箱`,detail:`一只旧铁盒成了整栋楼都知道的公共工具箱。`},{date:`2023.07`,title:`六角扳手`,detail:`你为了修车借工具，她顺手把松掉的车灯也修好了。`}],conversation:{greeting:`我猜你会来，所以让花摊老板多留了一束。还是你上次选的颜色。`,starters:[`楼下最近有什么变化？`,`周末花市还开吗？`,`工具箱还在么？`],replies:[`转角的面包店换了招牌，但老板还是会把试烤失败的可颂分给邻居。`,`开，而且比以前多了一个卖旧花盆的摊位。`,`还在。盒盖上又多了三张便签，看来它比我们都更受欢迎。`]},palette:{hair:`#29282b`,jacket:`#8b4a62`,MAT_Jacket_Light:`#af6680`,shirt:`#dce8e5`,pants:`#3d4552`,shoes:`#b98945`,skin:`#d79a73`},graph:{x:41,y:79}},{id:`tang-ke`,name:`洪选婷`,initials:`HXT`,portrait:`portraits/photo-derived/voxel/person_06.png`,relation:`童年好友`,role:`音乐编辑`,city:`南京`,lastSeen:`4 个月前`,metAt:`2008 年夏 · 河堤篮球场`,bio:`共同记忆最长的人。很多故事不需要讲完，对方就知道下一句是什么。`,scene:{title:`河堤边的旧篮球场`,moment:`夏夜七点`,atmosphere:`蝉鸣、球场灯和远处驶过的火车`,summary:`篮筐重新刷过漆，但看台第三排那道刻痕还清晰可见。`},tags:[`童年`,`音乐`,`河堤`],stats:{photos:73,voiceClips:14,memories:12},memories:[{date:`2026.02`,title:`未完成的歌单`,detail:`每个人放十首歌，至今还差你的最后一首。`},{date:`2016.08`,title:`最后一个暑假`,detail:`球场熄灯后，沿河堤走了很久。`},{date:`2008.07`,title:`第一次组队`,detail:`你们都不会投篮，却坚持报了同一支队。`}],conversation:{greeting:`你终于来了。歌单还差最后一首，我可一直没替你填。`,starters:[`最近在听什么？`,`球场现在还在吗？`,`歌单最后一首选什么？`],replies:[`最近在听很多带环境声的录音。火车、雨棚、深夜便利店，都比乐器更像旋律。`,`还在，篮筐换过一次。奇怪的是看台上的刻痕一点都没淡。`,`这题留给你。最后一首不必最好听，但要像我们现在重新见面的声音。`]},palette:{hair:`#4a352d`,jacket:`#2f7d7b`,MAT_Jacket_Light:`#52a09b`,shirt:`#efe5ca`,pants:`#383e48`,shoes:`#cc7548`,skin:`#d79a73`},graph:{x:63,y:82}}]),ld=Object.freeze([[`person-self`,`lin-che`],[`person-self`,`zhou-ning`],[`person-self`,`chen-mo`],[`person-self`,`xu-an`],[`person-self`,`su-he`],[`person-self`,`tang-ke`],[`lin-che`,`chen-mo`],[`lin-che`,`zhou-ning`],[`zhou-ning`,`xu-an`],[`chen-mo`,`su-he`],[`su-he`,`tang-ke`],[`xu-an`,`tang-ke`]]),ud=`2026-08-03`;function dd(e){return Object.freeze(e.heart),Object.freeze(e.metrics),Object.freeze(e.inference),Object.freeze(e.iceBreak),Object.freeze(e.sourceRefs),Object.freeze(e)}var fd=Object.freeze([dd({schemaVersion:`person-signal.v1`,personId:`lin-che`,capturedAt:`${ud}T14:32:18+08:00`,status:`live`,heart:{currentBpm:88,baselineBpm:72,peakBpm:101,heartScore:82,trend:`rising`,explanation:`当前心率高于近 30 分钟基线，心动值较高；这表示唤起程度上升，不等同于喜欢。`},metrics:{breathingRate:17.2,stressIndex:61,skinTemperature:33.4,hrv:39},inference:{label:`积极投入`,summary:`心率与呼吸较基线升高，可能正在集中注意当前交流。`,confidence:.78,caveat:`也可能受走动、咖啡因或环境温度影响；该标签是 AI 推测，不是情感事实。`},iceBreak:{detected:!0,at:`${ud}T14:30:42+08:00`,breakSeconds:104,reliability:`high`},sourceRefs:{encounterId:`demo-encounter-lin-che-0803`,heartStreamId:`demo-ring-hr-lin-che-0803`,historicalBatchId:`demo-ring-history-lin-che-0803`,visionTrackId:`demo-vision-lin-che-0803`,audioSegmentId:`demo-audio-lin-che-0803`}}),dd({schemaVersion:`person-signal.v1`,personId:`zhou-ning`,capturedAt:`${ud}T14:31:54+08:00`,status:`live`,heart:{currentBpm:76,baselineBpm:70,peakBpm:89,heartScore:64,trend:`steady`,explanation:`当前心率略高于个人基线，心动值处于中段，整体变化较平稳。`},metrics:{breathingRate:14.8,stressIndex:35,skinTemperature:34.1,hrv:56},inference:{label:`轻松熟悉`,summary:`心率接近基线，历史 HRV 较高，可能处于相对放松的交流状态。`,confidence:.84,caveat:`HRV 与呼吸率是最近一批历史值，不能代表此刻状态，也不能证明特定情感。`},iceBreak:{detected:!0,at:`${ud}T14:29:16+08:00`,breakSeconds:72,reliability:`high`},sourceRefs:{encounterId:`demo-encounter-zhou-ning-0803`,heartStreamId:`demo-ring-hr-zhou-ning-0803`,historicalBatchId:`demo-ring-history-zhou-ning-0803`,visionTrackId:`demo-vision-zhou-ning-0803`,audioSegmentId:`demo-audio-zhou-ning-0803`}}),dd({schemaVersion:`person-signal.v1`,personId:`chen-mo`,capturedAt:`${ud}T14:32:11+08:00`,status:`live`,heart:{currentBpm:94,baselineBpm:73,peakBpm:106,heartScore:91,trend:`rising`,explanation:`当前心率明显高于个人基线，心动值很高；前端应强化心脏跳动，但不推断其原因。`},metrics:{breathingRate:19.1,stressIndex:74,skinTemperature:32.9,hrv:31},inference:{label:`明显唤起`,summary:`当前心率升幅明显，历史辅助指标也提示紧张或兴奋的可能。`,confidence:.71,caveat:`运动、饮料和传感器接触不稳都可能造成类似变化，需要 ACC 与场景信息排除干扰。`},iceBreak:{detected:!1,at:null,breakSeconds:null,reliability:`low`},sourceRefs:{encounterId:`demo-encounter-chen-mo-0803`,heartStreamId:`demo-ring-hr-chen-mo-0803`,historicalBatchId:`demo-ring-history-chen-mo-0803`,visionTrackId:`demo-vision-chen-mo-0803`,audioSegmentId:`demo-audio-chen-mo-0803`}}),dd({schemaVersion:`person-signal.v1`,personId:`xu-an`,capturedAt:`${ud}T14:31:47+08:00`,status:`live`,heart:{currentBpm:69,baselineBpm:69,peakBpm:84,heartScore:47,trend:`falling`,explanation:`当前心率已经回落到基线附近，心动值偏低，跳动动画应逐渐放缓。`},metrics:{breathingRate:13.6,stressIndex:24,skinTemperature:34.3,hrv:63},inference:{label:`逐渐放松`,summary:`峰值后心率已稳定回落，可能刚刚跨过一次破冰拐点。`,confidence:.89,caveat:`“破冰”是对 HR 回落拐点的产品化表达，不表示关系一定改善。`},iceBreak:{detected:!0,at:`${ud}T14:31:30+08:00`,breakSeconds:138,reliability:`high`},sourceRefs:{encounterId:`demo-encounter-xu-an-0803`,heartStreamId:`demo-ring-hr-xu-an-0803`,historicalBatchId:`demo-ring-history-xu-an-0803`,visionTrackId:`demo-vision-xu-an-0803`,audioSegmentId:`demo-audio-xu-an-0803`}}),dd({schemaVersion:`person-signal.v1`,personId:`su-he`,capturedAt:`${ud}T14:32:03+08:00`,status:`live`,heart:{currentBpm:81,baselineBpm:71,peakBpm:94,heartScore:73,trend:`steady`,explanation:`当前心率温和高于基线，心动值较高但走势稳定，适合使用中速心跳动画。`},metrics:{breathingRate:15.9,stressIndex:46,skinTemperature:33.8,hrv:48},inference:{label:`温和投入`,summary:`生理变化存在但不剧烈，可能是专注、好奇或正常交谈造成。`,confidence:.68,caveat:`当前证据不足以区分好感、好奇与普通社交投入，请只作提示。`},iceBreak:{detected:!0,at:`${ud}T14:30:08+08:00`,breakSeconds:165,reliability:`medium`},sourceRefs:{encounterId:`demo-encounter-su-he-0803`,heartStreamId:`demo-ring-hr-su-he-0803`,historicalBatchId:`demo-ring-history-su-he-0803`,visionTrackId:`demo-vision-su-he-0803`,audioSegmentId:`demo-audio-su-he-0803`}}),dd({schemaVersion:`person-signal.v1`,personId:`tang-ke`,capturedAt:`${ud}T14:31:39+08:00`,status:`live`,heart:{currentBpm:73,baselineBpm:68,peakBpm:87,heartScore:58,trend:`falling`,explanation:`当前心率正在向基线回落，心动值位于中段，跳动速度可以平滑减慢。`},metrics:{breathingRate:14.2,stressIndex:30,skinTemperature:34,hrv:59},inference:{label:`平稳回落`,summary:`心率峰值已经过去，当前变化可能与熟悉感或交流节奏稳定有关。`,confidence:.75,caveat:`因缺少同一时刻的 HRV 佐证，只能描述趋势，不能确认情感原因。`},iceBreak:{detected:!0,at:`${ud}T14:31:02+08:00`,breakSeconds:96,reliability:`medium`},sourceRefs:{encounterId:`demo-encounter-tang-ke-0803`,heartStreamId:`demo-ring-hr-tang-ke-0803`,historicalBatchId:`demo-ring-history-tang-ke-0803`,visionTrackId:`demo-vision-tang-ke-0803`,audioSegmentId:`demo-audio-tang-ke-0803`}})]);Object.freeze(Object.fromEntries(fd.map(e=>[e.personId,e])));var pd=`echo-world.v1`;function md(e){return`/echoworld/${String(e).replace(/^\/+/,``)}`}function hd(e,t){if(typeof e!=`string`||e.trim()===``)throw Error(`WorldSpec field must be a non-empty string: ${t}`)}function gd(e,t){let n=`characters[${t}]`;if(!e||typeof e!=`object`)throw Error(`WorldSpec entry must be an object: ${n}`);if(hd(e.instance_id,`${n}.instance_id`),hd(e.person_id,`${n}.person_id`),hd(e.asset_id,`${n}.asset_id`),hd(e.profile_asset_id,`${n}.profile_asset_id`),!e.spawn||typeof e.spawn!=`object`)throw Error(`WorldSpec entry requires spawn data: ${n}.spawn`);for(let t of[`x`,`z`])if(!Number.isFinite(e.spawn[t]))throw Error(`WorldSpec spawn axis must be numeric: ${n}.spawn.${t}`)}function _d(e){if(!e||typeof e!=`object`)throw Error(`WorldSpec must be an object`);if(e.schema_version!==pd)throw Error(`Unsupported WorldSpec schema: ${e.schema_version}`);if(!Array.isArray(e.characters))throw Error(`WorldSpec characters must be an array`);if(hd(e.asset_catalog_url,`asset_catalog_url`),!e.environment||typeof e.environment!=`object`)throw Error(`WorldSpec environment must be an object`);if(hd(e.environment.asset_id,`environment.asset_id`),!e.player||typeof e.player!=`object`)throw Error(`WorldSpec player must be an object`);return hd(e.player.node_name,`player.node_name`),e.characters.forEach(gd),e}async function vd(e,t){return _d(await e.loadJson(t))}var yd=`echo-assets.v1`,bd=class e{constructor(e){this.records=e}static async load(t,n){let r=await t.loadJson(n);if(r.schema_version!==yd)throw Error(`Unsupported AssetCatalog schema: ${r.schema_version}`);if(!Array.isArray(r.assets))throw Error(`AssetCatalog assets must be an array`);let i=new Map;for(let e of r.assets){if(!e?.asset_id||!e?.kind||!e?.url)throw Error(`AssetCatalog entries require asset_id, kind, and url`);if(i.has(e.asset_id))throw Error(`Duplicate asset_id: ${e.asset_id}`);i.set(e.asset_id,Object.freeze({...e}))}return new e(i)}resolve(e,t){let n=this.records.get(e);if(!n)throw Error(`Unknown asset_id: ${e}`);if(t&&n.kind!==t)throw Error(`Asset kind mismatch for ${e}: ${n.kind} != ${t}`);return{...n,resolvedUrl:md(n.url)}}};function xd(e,t){if(t===0)return console.warn(`THREE.BufferGeometryUtils.toTrianglesDrawMode(): Geometry already defined as triangles.`),e;if(t===2||t===1){let n=e.getIndex();if(n===null){let t=[],r=e.getAttribute(`position`);if(r!==void 0){for(let e=0;e<r.count;e++)t.push(e);e.setIndex(t),n=e.getIndex()}else return console.error(`THREE.BufferGeometryUtils.toTrianglesDrawMode(): Undefined position attribute. Processing not possible.`),e}let r=n.count-2,i=[];if(t===2)for(let e=1;e<=r;e++)i.push(n.getX(0)),i.push(n.getX(e)),i.push(n.getX(e+1));else for(let e=0;e<r;e++)e%2==0?(i.push(n.getX(e)),i.push(n.getX(e+1)),i.push(n.getX(e+2))):(i.push(n.getX(e+2)),i.push(n.getX(e+1)),i.push(n.getX(e)));i.length/3!==r&&console.error(`THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unable to generate correct amount of triangles.`);let a=e.clone();return a.setIndex(i),a.clearGroups(),a}return console.error(`THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unknown draw mode:`,t),e}function Sd(e){let t=new Map,n=new Map,r=e.clone();return Cd(e,r,function(e,r){t.set(r,e),n.set(e,r)}),r.traverse(function(e){if(!e.isSkinnedMesh)return;let r=e,i=t.get(e),a=i.skeleton.bones;r.skeleton=i.skeleton.clone(),r.bindMatrix.copy(i.bindMatrix),r.skeleton.bones=a.map(function(e){return n.get(e)}),r.bind(r.skeleton,r.bindMatrix)}),r}function Cd(e,t,n){n(e,t);for(let r=0;r<e.children.length;r++)Cd(e.children[r],t.children[r],n)}var wd=class extends Do{constructor(e){super(e),this.dracoLoader=null,this.ktx2Loader=null,this.meshoptDecoder=null,this.pluginCallbacks=[],this.register(function(e){return new jd(e)}),this.register(function(e){return new Md(e)}),this.register(function(e){return new Vd(e)}),this.register(function(e){return new Hd(e)}),this.register(function(e){return new Ud(e)}),this.register(function(e){return new Pd(e)}),this.register(function(e){return new Fd(e)}),this.register(function(e){return new Id(e)}),this.register(function(e){return new Ld(e)}),this.register(function(e){return new Ad(e)}),this.register(function(e){return new Rd(e)}),this.register(function(e){return new Nd(e)}),this.register(function(e){return new Bd(e)}),this.register(function(e){return new zd(e)}),this.register(function(e){return new Od(e)}),this.register(function(e){return new Wd(e,Dd.EXT_MESHOPT_COMPRESSION)}),this.register(function(e){return new Wd(e,Dd.KHR_MESHOPT_COMPRESSION)}),this.register(function(e){return new Gd(e)})}load(e,t,n,r){let i=this,a;if(this.resourcePath!==``)a=this.resourcePath;else if(this.path!==``){let t=ts.extractUrlBase(e);a=ts.resolveURL(t,this.path)}else a=ts.extractUrlBase(e);this.manager.itemStart(e);let o=function(t){r?r(t):console.error(t),i.manager.itemError(e),i.manager.itemEnd(e)},s=new Ao(this.manager);s.setPath(this.path),s.setResponseType(`arraybuffer`),s.setRequestHeader(this.requestHeader),s.setWithCredentials(this.withCredentials),s.load(e,function(n){try{i.parse(n,a,function(n){t(n),i.manager.itemEnd(e)},o)}catch(e){o(e)}},n,o)}setDRACOLoader(e){return this.dracoLoader=e,this}setKTX2Loader(e){return this.ktx2Loader=e,this}setMeshoptDecoder(e){return this.meshoptDecoder=e,this}register(e){return this.pluginCallbacks.indexOf(e)===-1&&this.pluginCallbacks.push(e),this}unregister(e){return this.pluginCallbacks.indexOf(e)!==-1&&this.pluginCallbacks.splice(this.pluginCallbacks.indexOf(e),1),this}parse(e,t,n,r){let i,a={},o={},s=new TextDecoder;if(typeof e==`string`)i=JSON.parse(e);else if(e instanceof ArrayBuffer)if(s.decode(new Uint8Array(e,0,4))===Kd){try{a[Dd.KHR_BINARY_GLTF]=new Yd(e)}catch(e){r&&r(e);return}i=JSON.parse(a[Dd.KHR_BINARY_GLTF].content)}else i=JSON.parse(s.decode(e));else i=e;if(i.asset===void 0||i.asset.version[0]<2){r&&r(Error(`THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported.`));return}let c=new Sf(i,{path:t||this.resourcePath||``,crossOrigin:this.crossOrigin,requestHeader:this.requestHeader,manager:this.manager,ktx2Loader:this.ktx2Loader,meshoptDecoder:this.meshoptDecoder});c.fileLoader.setRequestHeader(this.requestHeader);for(let e=0;e<this.pluginCallbacks.length;e++){let t=this.pluginCallbacks[e](c);t.name||console.error(`THREE.GLTFLoader: Invalid plugin found: missing name`),o[t.name]=t,a[t.name]=!0}if(i.extensionsUsed)for(let e=0;e<i.extensionsUsed.length;++e){let t=i.extensionsUsed[e],n=i.extensionsRequired||[];switch(t){case Dd.KHR_MATERIALS_UNLIT:a[t]=new kd;break;case Dd.KHR_DRACO_MESH_COMPRESSION:a[t]=new Xd(i,this.dracoLoader);break;case Dd.KHR_TEXTURE_TRANSFORM:a[t]=new Zd;break;case Dd.KHR_MESH_QUANTIZATION:a[t]=new Qd;break;default:n.indexOf(t)>=0&&o[t]===void 0&&console.warn(`THREE.GLTFLoader: Unknown extension "`+t+`".`)}}c.setExtensions(a),c.setPlugins(o),c.parse(n,r)}parseAsync(e,t){let n=this;return new Promise(function(r,i){n.parse(e,t,r,i)})}};function Td(){let e={};return{get:function(t){return e[t]},add:function(t,n){e[t]=n},remove:function(t){delete e[t]},removeAll:function(){e={}}}}function Ed(e,t,n){let r=e.json.materials[t];return r.extensions&&r.extensions[n]?r.extensions[n]:null}var Dd={KHR_BINARY_GLTF:`KHR_binary_glTF`,KHR_DRACO_MESH_COMPRESSION:`KHR_draco_mesh_compression`,KHR_LIGHTS_PUNCTUAL:`KHR_lights_punctual`,KHR_MATERIALS_CLEARCOAT:`KHR_materials_clearcoat`,KHR_MATERIALS_DISPERSION:`KHR_materials_dispersion`,KHR_MATERIALS_IOR:`KHR_materials_ior`,KHR_MATERIALS_SHEEN:`KHR_materials_sheen`,KHR_MATERIALS_SPECULAR:`KHR_materials_specular`,KHR_MATERIALS_TRANSMISSION:`KHR_materials_transmission`,KHR_MATERIALS_IRIDESCENCE:`KHR_materials_iridescence`,KHR_MATERIALS_ANISOTROPY:`KHR_materials_anisotropy`,KHR_MATERIALS_UNLIT:`KHR_materials_unlit`,KHR_MATERIALS_VOLUME:`KHR_materials_volume`,KHR_TEXTURE_BASISU:`KHR_texture_basisu`,KHR_TEXTURE_TRANSFORM:`KHR_texture_transform`,KHR_MESH_QUANTIZATION:`KHR_mesh_quantization`,KHR_MATERIALS_EMISSIVE_STRENGTH:`KHR_materials_emissive_strength`,EXT_MATERIALS_BUMP:`EXT_materials_bump`,EXT_TEXTURE_WEBP:`EXT_texture_webp`,EXT_TEXTURE_AVIF:`EXT_texture_avif`,EXT_MESHOPT_COMPRESSION:`EXT_meshopt_compression`,KHR_MESHOPT_COMPRESSION:`KHR_meshopt_compression`,EXT_MESH_GPU_INSTANCING:`EXT_mesh_gpu_instancing`},Od=class{constructor(e){this.parser=e,this.name=Dd.KHR_LIGHTS_PUNCTUAL,this.cache={refs:{},uses:{}}}_markDefs(){let e=this.parser,t=this.parser.json.nodes||[];for(let n=0,r=t.length;n<r;n++){let r=t[n];r.extensions&&r.extensions[this.name]&&r.extensions[this.name].light!==void 0&&e._addNodeRef(this.cache,r.extensions[this.name].light)}}_loadLight(e){let t=this.parser,n=`light:`+e,r=t.cache.get(n);if(r)return r;let i=t.json,a=((i.extensions&&i.extensions[this.name]||{}).lights||[])[e],o,s=new G(16777215);a.color!==void 0&&s.setRGB(a.color[0],a.color[1],a.color[2],Ke);let c=a.range===void 0?0:a.range;switch(a.type){case`directional`:o=new es(s),o.target.position.set(0,0,-1),o.add(o.target);break;case`point`:o=new Zo(s),o.distance=c;break;case`spot`:o=new Yo(s),o.distance=c,a.spot=a.spot||{},a.spot.innerConeAngle=a.spot.innerConeAngle===void 0?0:a.spot.innerConeAngle,a.spot.outerConeAngle=a.spot.outerConeAngle===void 0?Math.PI/4:a.spot.outerConeAngle,o.angle=a.spot.outerConeAngle,o.penumbra=1-a.spot.innerConeAngle/a.spot.outerConeAngle,o.target.position.set(0,0,-1),o.add(o.target);break;default:throw Error(`THREE.GLTFLoader: Unexpected light type: `+a.type)}return o.position.set(0,0,0),mf(o,a),a.intensity!==void 0&&(o.intensity=a.intensity),o.name=t.createUniqueName(a.name||`light_`+e),r=Promise.resolve(o),t.cache.add(n,r),r}getDependency(e,t){if(e===`light`)return this._loadLight(t)}createNodeAttachment(e){let t=this,n=this.parser,r=n.json.nodes[e],i=(r.extensions&&r.extensions[this.name]||{}).light;return i===void 0?null:this._loadLight(i).then(function(e){return n._getNodeRef(t.cache,i,e)})}},kd=class{constructor(){this.name=Dd.KHR_MATERIALS_UNLIT}getMaterialType(){return gi}extendParams(e,t,n){let r=[];e.color=new G(1,1,1),e.opacity=1;let i=t.pbrMetallicRoughness;if(i){if(Array.isArray(i.baseColorFactor)){let t=i.baseColorFactor;e.color.setRGB(t[0],t[1],t[2],Ke),e.opacity=t[3]}i.baseColorTexture!==void 0&&r.push(n.assignTexture(e,`map`,i.baseColorTexture,Ge))}return Promise.all(r)}},Ad=class{constructor(e){this.parser=e,this.name=Dd.KHR_MATERIALS_EMISSIVE_STRENGTH}extendMaterialParams(e,t){let n=Ed(this.parser,e,this.name);return n===null||n.emissiveStrength!==void 0&&(t.emissiveIntensity=n.emissiveStrength),Promise.resolve()}},jd=class{constructor(e){this.parser=e,this.name=Dd.KHR_MATERIALS_CLEARCOAT}getMaterialType(e){return Ed(this.parser,e,this.name)===null?null:$a}extendMaterialParams(e,t){let n=Ed(this.parser,e,this.name);if(n===null)return Promise.resolve();let r=[];if(n.clearcoatFactor!==void 0&&(t.clearcoat=n.clearcoatFactor),n.clearcoatTexture!==void 0&&r.push(this.parser.assignTexture(t,`clearcoatMap`,n.clearcoatTexture)),n.clearcoatRoughnessFactor!==void 0&&(t.clearcoatRoughness=n.clearcoatRoughnessFactor),n.clearcoatRoughnessTexture!==void 0&&r.push(this.parser.assignTexture(t,`clearcoatRoughnessMap`,n.clearcoatRoughnessTexture)),n.clearcoatNormalTexture!==void 0&&(r.push(this.parser.assignTexture(t,`clearcoatNormalMap`,n.clearcoatNormalTexture)),n.clearcoatNormalTexture.scale!==void 0)){let e=n.clearcoatNormalTexture.scale;t.clearcoatNormalScale=new H(e,e)}return Promise.all(r)}},Md=class{constructor(e){this.parser=e,this.name=Dd.KHR_MATERIALS_DISPERSION}getMaterialType(e){return Ed(this.parser,e,this.name)===null?null:$a}extendMaterialParams(e,t){let n=Ed(this.parser,e,this.name);return n===null||(t.dispersion=n.dispersion===void 0?0:n.dispersion),Promise.resolve()}},Nd=class{constructor(e){this.parser=e,this.name=Dd.KHR_MATERIALS_IRIDESCENCE}getMaterialType(e){return Ed(this.parser,e,this.name)===null?null:$a}extendMaterialParams(e,t){let n=Ed(this.parser,e,this.name);if(n===null)return Promise.resolve();let r=[];return n.iridescenceFactor!==void 0&&(t.iridescence=n.iridescenceFactor),n.iridescenceTexture!==void 0&&r.push(this.parser.assignTexture(t,`iridescenceMap`,n.iridescenceTexture)),n.iridescenceIor!==void 0&&(t.iridescenceIOR=n.iridescenceIor),t.iridescenceThicknessRange===void 0&&(t.iridescenceThicknessRange=[100,400]),n.iridescenceThicknessMinimum!==void 0&&(t.iridescenceThicknessRange[0]=n.iridescenceThicknessMinimum),n.iridescenceThicknessMaximum!==void 0&&(t.iridescenceThicknessRange[1]=n.iridescenceThicknessMaximum),n.iridescenceThicknessTexture!==void 0&&r.push(this.parser.assignTexture(t,`iridescenceThicknessMap`,n.iridescenceThicknessTexture)),Promise.all(r)}},Pd=class{constructor(e){this.parser=e,this.name=Dd.KHR_MATERIALS_SHEEN}getMaterialType(e){return Ed(this.parser,e,this.name)===null?null:$a}extendMaterialParams(e,t){let n=Ed(this.parser,e,this.name);if(n===null)return Promise.resolve();let r=[];if(t.sheenColor=new G(0,0,0),t.sheenRoughness=0,t.sheen=1,n.sheenColorFactor!==void 0){let e=n.sheenColorFactor;t.sheenColor.setRGB(e[0],e[1],e[2],Ke)}return n.sheenRoughnessFactor!==void 0&&(t.sheenRoughness=n.sheenRoughnessFactor),n.sheenColorTexture!==void 0&&r.push(this.parser.assignTexture(t,`sheenColorMap`,n.sheenColorTexture,Ge)),n.sheenRoughnessTexture!==void 0&&r.push(this.parser.assignTexture(t,`sheenRoughnessMap`,n.sheenRoughnessTexture)),Promise.all(r)}},Fd=class{constructor(e){this.parser=e,this.name=Dd.KHR_MATERIALS_TRANSMISSION}getMaterialType(e){return Ed(this.parser,e,this.name)===null?null:$a}extendMaterialParams(e,t){let n=Ed(this.parser,e,this.name);if(n===null)return Promise.resolve();let r=[];return n.transmissionFactor!==void 0&&(t.transmission=n.transmissionFactor),n.transmissionTexture!==void 0&&r.push(this.parser.assignTexture(t,`transmissionMap`,n.transmissionTexture)),Promise.all(r)}},Id=class{constructor(e){this.parser=e,this.name=Dd.KHR_MATERIALS_VOLUME}getMaterialType(e){return Ed(this.parser,e,this.name)===null?null:$a}extendMaterialParams(e,t){let n=Ed(this.parser,e,this.name);if(n===null)return Promise.resolve();let r=[];t.thickness=n.thicknessFactor===void 0?0:n.thicknessFactor,n.thicknessTexture!==void 0&&r.push(this.parser.assignTexture(t,`thicknessMap`,n.thicknessTexture)),t.attenuationDistance=n.attenuationDistance||1/0;let i=n.attenuationColor||[1,1,1];return t.attenuationColor=new G().setRGB(i[0],i[1],i[2],Ke),Promise.all(r)}},Ld=class{constructor(e){this.parser=e,this.name=Dd.KHR_MATERIALS_IOR}getMaterialType(e){return Ed(this.parser,e,this.name)===null?null:$a}extendMaterialParams(e,t){let n=Ed(this.parser,e,this.name);return n===null?Promise.resolve():(t.ior=n.ior===void 0?1.5:n.ior,t.ior===0&&(t.ior=1e3),Promise.resolve())}},Rd=class{constructor(e){this.parser=e,this.name=Dd.KHR_MATERIALS_SPECULAR}getMaterialType(e){return Ed(this.parser,e,this.name)===null?null:$a}extendMaterialParams(e,t){let n=Ed(this.parser,e,this.name);if(n===null)return Promise.resolve();let r=[];t.specularIntensity=n.specularFactor===void 0?1:n.specularFactor,n.specularTexture!==void 0&&r.push(this.parser.assignTexture(t,`specularIntensityMap`,n.specularTexture));let i=n.specularColorFactor||[1,1,1];return t.specularColor=new G().setRGB(i[0],i[1],i[2],Ke),n.specularColorTexture!==void 0&&r.push(this.parser.assignTexture(t,`specularColorMap`,n.specularColorTexture,Ge)),Promise.all(r)}},zd=class{constructor(e){this.parser=e,this.name=Dd.EXT_MATERIALS_BUMP}getMaterialType(e){return Ed(this.parser,e,this.name)===null?null:$a}extendMaterialParams(e,t){let n=Ed(this.parser,e,this.name);if(n===null)return Promise.resolve();let r=[];return t.bumpScale=n.bumpFactor===void 0?1:n.bumpFactor,n.bumpTexture!==void 0&&r.push(this.parser.assignTexture(t,`bumpMap`,n.bumpTexture)),Promise.all(r)}},Bd=class{constructor(e){this.parser=e,this.name=Dd.KHR_MATERIALS_ANISOTROPY}getMaterialType(e){return Ed(this.parser,e,this.name)===null?null:$a}extendMaterialParams(e,t){let n=Ed(this.parser,e,this.name);if(n===null)return Promise.resolve();let r=[];return n.anisotropyStrength!==void 0&&(t.anisotropy=n.anisotropyStrength),n.anisotropyRotation!==void 0&&(t.anisotropyRotation=n.anisotropyRotation),n.anisotropyTexture!==void 0&&r.push(this.parser.assignTexture(t,`anisotropyMap`,n.anisotropyTexture)),Promise.all(r)}},Vd=class{constructor(e){this.parser=e,this.name=Dd.KHR_TEXTURE_BASISU}loadTexture(e){let t=this.parser,n=t.json,r=n.textures[e];if(!r.extensions||!r.extensions[this.name])return null;let i=r.extensions[this.name],a=t.options.ktx2Loader;if(!a){if(n.extensionsRequired&&n.extensionsRequired.indexOf(this.name)>=0)throw Error(`THREE.GLTFLoader: setKTX2Loader must be called before loading KTX2 textures`);return null}return t.loadTextureImage(e,i.source,a)}},Hd=class{constructor(e){this.parser=e,this.name=Dd.EXT_TEXTURE_WEBP}loadTexture(e){let t=this.name,n=this.parser,r=n.json,i=r.textures[e];if(!i.extensions||!i.extensions[t])return null;let a=i.extensions[t],o=r.images[a.source],s=n.textureLoader;if(o.uri){let e=n.options.manager.getHandler(o.uri);e!==null&&(s=e)}return n.loadTextureImage(e,a.source,s)}},Ud=class{constructor(e){this.parser=e,this.name=Dd.EXT_TEXTURE_AVIF}loadTexture(e){let t=this.name,n=this.parser,r=n.json,i=r.textures[e];if(!i.extensions||!i.extensions[t])return null;let a=i.extensions[t],o=r.images[a.source],s=n.textureLoader;if(o.uri){let e=n.options.manager.getHandler(o.uri);e!==null&&(s=e)}return n.loadTextureImage(e,a.source,s)}},Wd=class{constructor(e,t){this.name=t,this.parser=e}loadBufferView(e){let t=this.parser.json,n=t.bufferViews[e];if(n.extensions&&n.extensions[this.name]){let e=n.extensions[this.name],r=this.parser.getDependency(`buffer`,e.buffer),i=this.parser.options.meshoptDecoder;if(!i||!i.supported){if(t.extensionsRequired&&t.extensionsRequired.indexOf(this.name)>=0)throw Error(`THREE.GLTFLoader: setMeshoptDecoder must be called before loading compressed files`);return null}return r.then(function(t){let n=e.byteOffset||0,r=e.byteLength||0,a=e.count,o=e.byteStride,s=new Uint8Array(t,n,r);return i.decodeGltfBufferAsync?i.decodeGltfBufferAsync(a,o,s,e.mode,e.filter).then(function(e){return e.buffer}):i.ready.then(function(){let t=new ArrayBuffer(a*o);return i.decodeGltfBuffer(new Uint8Array(t),a,o,s,e.mode,e.filter),t})})}return null}},Gd=class{constructor(e){this.name=Dd.EXT_MESH_GPU_INSTANCING,this.parser=e}createNodeMesh(e){let t=this.parser.json,n=t.nodes[e];if(!n.extensions||!n.extensions[this.name]||n.mesh===void 0)return null;let r=t.meshes[n.mesh];for(let e of r.primitives)if(e.mode!==nf.TRIANGLES&&e.mode!==nf.TRIANGLE_STRIP&&e.mode!==nf.TRIANGLE_FAN&&e.mode!==void 0)return null;let i=n.extensions[this.name].attributes,a=[],o={};for(let e in i)a.push(this.parser.getDependency(`accessor`,i[e]).then(t=>(o[e]=t,o[e])));return a.length<1?null:(a.push(this.parser.createNodeMesh(e)),Promise.all(a).then(e=>{let t=e.pop(),n=t.isGroup?t.children:[t],r=e[0].count,i=[];for(let e of n){let t=new ln,n=new U,a=new Rt,s=new U(1,1,1),c=new $i(e.geometry,e.material,r);for(let e=0;e<r;e++)o.TRANSLATION&&n.fromBufferAttribute(o.TRANSLATION,e),o.ROTATION&&a.fromBufferAttribute(o.ROTATION,e),o.SCALE&&s.fromBufferAttribute(o.SCALE,e),c.setMatrixAt(e,t.compose(n,a,s));for(let t in o)if(t===`_COLOR_0`){let e=o[t];c.instanceColor=new Gi(e.array,e.itemSize,e.normalized)}else t!==`TRANSLATION`&&t!==`ROTATION`&&t!==`SCALE`&&e.geometry.setAttribute(t,o[t]);In.prototype.copy.call(c,e),this.parser.assignFinalMaterial(c),i.push(c)}return t.isGroup?(t.clear(),t.add(...i),t):i[0]}))}},Kd=`glTF`,qd=12,Jd={JSON:1313821514,BIN:5130562},Yd=class{constructor(e){this.name=Dd.KHR_BINARY_GLTF,this.content=null,this.body=null;let t=new DataView(e,0,qd),n=new TextDecoder;if(this.header={magic:n.decode(new Uint8Array(e.slice(0,4))),version:t.getUint32(4,!0),length:t.getUint32(8,!0)},this.header.magic!==Kd)throw Error(`THREE.GLTFLoader: Unsupported glTF-Binary header.`);if(this.header.version<2)throw Error(`THREE.GLTFLoader: Legacy binary file detected.`);let r=this.header.length-qd,i=new DataView(e,qd),a=0;for(;a<r;){let t=i.getUint32(a,!0);a+=4;let r=i.getUint32(a,!0);if(a+=4,r===Jd.JSON){let r=new Uint8Array(e,qd+a,t);this.content=n.decode(r)}else if(r===Jd.BIN){let n=qd+a;this.body=e.slice(n,n+t)}a+=t}if(this.content===null)throw Error(`THREE.GLTFLoader: JSON content not found.`)}},Xd=class{constructor(e,t){if(!t)throw Error(`THREE.GLTFLoader: No DRACOLoader instance provided.`);this.name=Dd.KHR_DRACO_MESH_COMPRESSION,this.json=e,this.dracoLoader=t,this.dracoLoader.preload()}decodePrimitive(e,t){let n=this.json,r=this.dracoLoader,i=e.extensions[this.name].bufferView,a=e.extensions[this.name].attributes,o={},s={},c={};for(let e in a){let t=cf[e]||e.toLowerCase();o[t]=a[e]}for(let t in e.attributes){let r=cf[t]||t.toLowerCase();if(a[t]!==void 0){let i=n.accessors[e.attributes[t]];c[r]=rf[i.componentType].name,s[r]=i.normalized===!0}}return t.getDependency(`bufferView`,i).then(function(e){return new Promise(function(t,n){r.decodeDracoFile(e,function(e){for(let t in e.attributes){let n=e.attributes[t],r=s[t];r!==void 0&&(n.normalized=r)}t(e)},o,c,Ke,n)})})}},Zd=class{constructor(){this.name=Dd.KHR_TEXTURE_TRANSFORM}extendTexture(e,t){return(t.texCoord===void 0||t.texCoord===e.channel)&&t.offset===void 0&&t.rotation===void 0&&t.scale===void 0?e:(e=e.clone(),t.texCoord!==void 0&&(e.channel=t.texCoord),t.offset!==void 0&&e.offset.fromArray(t.offset),t.rotation!==void 0&&(e.rotation=t.rotation),t.scale!==void 0&&e.repeat.fromArray(t.scale),e.needsUpdate=!0,e)}},Qd=class{constructor(){this.name=Dd.KHR_MESH_QUANTIZATION}},$d=class extends so{constructor(e,t,n,r){super(e,t,n,r)}copySampleValue_(e){let t=this.resultBuffer,n=this.sampleValues,r=this.valueSize,i=e*r*3+r;for(let e=0;e!==r;e++)t[e]=n[i+e];return t}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=o*2,c=o*3,l=r-t,u=(n-t)/l,d=u*u,f=d*u,p=e*c,m=p-c,h=-2*f+3*d,g=f-d,_=1-h,v=g-d+u;for(let e=0;e!==o;e++){let t=a[m+e+o],n=a[m+e+s]*l,r=a[p+e+o],c=a[p+e]*l;i[e]=_*t+v*n+h*r+g*c}return i}},ef=new Rt,tf=class extends $d{interpolate_(e,t,n,r){let i=super.interpolate_(e,t,n,r);return ef.fromArray(i).normalize().toArray(i),i}},nf={FLOAT:5126,FLOAT_MAT3:35675,FLOAT_MAT4:35676,FLOAT_VEC2:35664,FLOAT_VEC3:35665,FLOAT_VEC4:35666,LINEAR:9729,REPEAT:10497,SAMPLER_2D:35678,POINTS:0,LINES:1,LINE_LOOP:2,LINE_STRIP:3,TRIANGLES:4,TRIANGLE_STRIP:5,TRIANGLE_FAN:6,UNSIGNED_BYTE:5121,UNSIGNED_SHORT:5123},rf={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array},af={9728:o,9729:l,9984:s,9985:u,9986:c,9987:d},of={33071:i,33648:a,10497:r},sf={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16},cf={POSITION:`position`,NORMAL:`normal`,TANGENT:`tangent`,TEXCOORD_0:`uv`,TEXCOORD_1:`uv1`,TEXCOORD_2:`uv2`,TEXCOORD_3:`uv3`,COLOR_0:`color`,WEIGHTS_0:`skinWeight`,JOINTS_0:`skinIndex`},lf={scale:`scale`,translation:`position`,rotation:`quaternion`,weights:`morphTargetInfluences`},uf={CUBICSPLINE:void 0,LINEAR:z,STEP:R},df={OPAQUE:`OPAQUE`,MASK:`MASK`,BLEND:`BLEND`};function ff(e){return e.DefaultMaterial===void 0&&(e.DefaultMaterial=new Qa({color:16777215,emissive:0,metalness:1,roughness:1,transparent:!1,depthTest:!0,side:0})),e.DefaultMaterial}function pf(e,t,n){for(let r in n.extensions)e[r]===void 0&&(t.userData.gltfExtensions=t.userData.gltfExtensions||{},t.userData.gltfExtensions[r]=n.extensions[r])}function mf(e,t){t.extras!==void 0&&(typeof t.extras==`object`?Object.assign(e.userData,t.extras):console.warn(`THREE.GLTFLoader: Ignoring primitive type .extras, `+t.extras))}function hf(e,t,n){let r=!1,i=!1,a=!1;for(let e=0,n=t.length;e<n;e++){let n=t[e];if(n.POSITION!==void 0&&(r=!0),n.NORMAL!==void 0&&(i=!0),n.COLOR_0!==void 0&&(a=!0),r&&i&&a)break}if(!r&&!i&&!a)return Promise.resolve(e);let o=[],s=[],c=[];for(let l=0,u=t.length;l<u;l++){let u=t[l];if(r){let t=u.POSITION===void 0?e.attributes.position:n.getDependency(`accessor`,u.POSITION);o.push(t)}if(i){let t=u.NORMAL===void 0?e.attributes.normal:n.getDependency(`accessor`,u.NORMAL);s.push(t)}if(a){let t=u.COLOR_0===void 0?e.attributes.color:n.getDependency(`accessor`,u.COLOR_0);c.push(t)}}return Promise.all([Promise.all(o),Promise.all(s),Promise.all(c)]).then(function(t){let n=t[0],o=t[1],s=t[2];return r&&(e.morphAttributes.position=n),i&&(e.morphAttributes.normal=o),a&&(e.morphAttributes.color=s),e.morphTargetsRelative=!0,e})}function gf(e,t){if(e.updateMorphTargets(),t.weights!==void 0)for(let n=0,r=t.weights.length;n<r;n++)e.morphTargetInfluences[n]=t.weights[n];if(t.extras&&Array.isArray(t.extras.targetNames)){let n=t.extras.targetNames;if(e.morphTargetInfluences.length===n.length){e.morphTargetDictionary={};for(let t=0,r=n.length;t<r;t++)e.morphTargetDictionary[n[t]]=t}else console.warn(`THREE.GLTFLoader: Invalid extras.targetNames length. Ignoring names.`)}}function _f(e){let t,n=e.extensions&&e.extensions[Dd.KHR_DRACO_MESH_COMPRESSION];if(t=n?`draco:`+n.bufferView+`:`+n.indices+`:`+vf(n.attributes):e.indices+`:`+vf(e.attributes)+`:`+e.mode,e.targets!==void 0)for(let n=0,r=e.targets.length;n<r;n++)t+=`:`+vf(e.targets[n]);return t}function vf(e){let t=``,n=Object.keys(e).sort();for(let r=0,i=n.length;r<i;r++)t+=n[r]+`:`+e[n[r]]+`;`;return t}function yf(e){switch(e){case Int8Array:return 1/127;case Uint8Array:return 1/255;case Int16Array:return 1/32767;case Uint16Array:return 1/65535;default:throw Error(`THREE.GLTFLoader: Unsupported normalized accessor component type.`)}}function bf(e){return e.search(/\.jpe?g($|\?)/i)>0||e.search(/^data\:image\/jpeg/)===0?`image/jpeg`:e.search(/\.webp($|\?)/i)>0||e.search(/^data\:image\/webp/)===0?`image/webp`:e.search(/\.ktx2($|\?)/i)>0||e.search(/^data\:image\/ktx2/)===0?`image/ktx2`:`image/png`}var xf=new ln,Sf=class{constructor(e={},t={}){this.json=e,this.extensions={},this.plugins={},this.options=t,this.cache=new Td,this.associations=new Map,this.primitiveCache={},this.nodeCache={},this.meshCache={refs:{},uses:{}},this.cameraCache={refs:{},uses:{}},this.lightCache={refs:{},uses:{}},this.sourceCache={},this.textureCache={},this.nodeNamesUsed={};let n=!1,r=-1,i=!1,a=-1;if(typeof navigator<`u`&&navigator.userAgent!==void 0){let e=navigator.userAgent;n=/^((?!chrome|android).)*safari/i.test(e)===!0;let t=e.match(/Version\/(\d+)/);r=n&&t?parseInt(t[1],10):-1,i=e.indexOf(`Firefox`)>-1,a=i?e.match(/Firefox\/([0-9]+)\./)[1]:-1}this.textureLoader=typeof createImageBitmap>`u`||n&&r<17||i&&a<98?new No(this.options.manager):new is(this.options.manager),this.textureLoader.setCrossOrigin(this.options.crossOrigin),this.textureLoader.setRequestHeader(this.options.requestHeader),this.fileLoader=new Ao(this.options.manager),this.fileLoader.setResponseType(`arraybuffer`),this.options.crossOrigin===`use-credentials`&&this.fileLoader.setWithCredentials(!0)}setExtensions(e){this.extensions=e}setPlugins(e){this.plugins=e}parse(e,t){let n=this,r=this.json,i=this.extensions;this.cache.removeAll(),this.nodeCache={},this._invokeAll(function(e){return e._markDefs&&e._markDefs()}),Promise.all(this._invokeAll(function(e){return e.beforeRoot&&e.beforeRoot()})).then(function(){return Promise.all([n.getDependencies(`scene`),n.getDependencies(`animation`),n.getDependencies(`camera`)])}).then(function(t){let a={scene:t[0][r.scene||0],scenes:t[0],animations:t[1],cameras:t[2],asset:r.asset,parser:n,userData:{}};return pf(i,a,r),mf(a,r),Promise.all(n._invokeAll(function(e){return e.afterRoot&&e.afterRoot(a)})).then(function(){for(let e of a.scenes)e.updateMatrixWorld();e(a)})}).catch(t)}_markDefs(){let e=this.json.nodes||[],t=this.json.skins||[],n=this.json.meshes||[];for(let n=0,r=t.length;n<r;n++){let r=t[n].joints;for(let t=0,n=r.length;t<n;t++)e[r[t]].isBone=!0}for(let t=0,r=e.length;t<r;t++){let r=e[t];r.mesh!==void 0&&(this._addNodeRef(this.meshCache,r.mesh),r.skin!==void 0&&(n[r.mesh].isSkinnedMesh=!0)),r.camera!==void 0&&this._addNodeRef(this.cameraCache,r.camera)}}_addNodeRef(e,t){t!==void 0&&(e.refs[t]===void 0&&(e.refs[t]=e.uses[t]=0),e.refs[t]++)}_getNodeRef(e,t,n){if(e.refs[t]<=1)return n;let r=n.clone(),i=(e,t)=>{let n=this.associations.get(e);n!=null&&this.associations.set(t,n);for(let[n,r]of e.children.entries())i(r,t.children[n])};return i(n,r),r.name+=`_instance_`+e.uses[t]++,r}_invokeOne(e){let t=Object.values(this.plugins);t.push(this);for(let n=0;n<t.length;n++){let r=e(t[n]);if(r)return r}return null}_invokeAll(e){let t=Object.values(this.plugins);t.unshift(this);let n=[];for(let r=0;r<t.length;r++){let i=e(t[r]);i&&n.push(i)}return n}getDependency(e,t){let n=e+`:`+t,r=this.cache.get(n);if(!r){switch(e){case`scene`:r=this.loadScene(t);break;case`node`:r=this._invokeOne(function(e){return e.loadNode&&e.loadNode(t)});break;case`mesh`:r=this._invokeOne(function(e){return e.loadMesh&&e.loadMesh(t)});break;case`accessor`:r=this.loadAccessor(t);break;case`bufferView`:r=this._invokeOne(function(e){return e.loadBufferView&&e.loadBufferView(t)});break;case`buffer`:r=this.loadBuffer(t);break;case`material`:r=this._invokeOne(function(e){return e.loadMaterial&&e.loadMaterial(t)});break;case`texture`:r=this._invokeOne(function(e){return e.loadTexture&&e.loadTexture(t)});break;case`skin`:r=this.loadSkin(t);break;case`animation`:r=this._invokeOne(function(e){return e.loadAnimation&&e.loadAnimation(t)});break;case`camera`:r=this.loadCamera(t);break;default:if(r=this._invokeOne(function(n){return n!=this&&n.getDependency&&n.getDependency(e,t)}),!r)throw Error(`Unknown type: `+e)}this.cache.add(n,r)}return r}getDependencies(e){let t=this.cache.get(e);if(!t){let n=this,r=this.json[e+(e===`mesh`?`es`:`s`)]||[];t=Promise.all(r.map(function(t,r){return n.getDependency(e,r)})),this.cache.add(e,t)}return t}loadBuffer(e){let t=this.json.buffers[e],n=this.fileLoader;if(t.type&&t.type!==`arraybuffer`)throw Error(`THREE.GLTFLoader: `+t.type+` buffer type is not supported.`);if(t.uri===void 0&&e===0)return Promise.resolve(this.extensions[Dd.KHR_BINARY_GLTF].body);let r=this.options;return new Promise(function(e,i){n.load(ts.resolveURL(t.uri,r.path),e,void 0,function(){i(Error(`THREE.GLTFLoader: Failed to load buffer "`+t.uri+`".`))})})}loadBufferView(e){let t=this.json.bufferViews[e];return this.getDependency(`buffer`,t.buffer).then(function(e){let n=t.byteLength||0,r=t.byteOffset||0;return e.slice(r,r+n)})}loadAccessor(e){let t=this,n=this.json,r=this.json.accessors[e];if(r.bufferView===void 0&&r.sparse===void 0){let e=sf[r.type],t=rf[r.componentType],n=r.normalized===!0,i=new t(r.count*e);return Promise.resolve(new Tr(i,e,n))}let i=[];return r.bufferView===void 0?i.push(null):i.push(this.getDependency(`bufferView`,r.bufferView)),r.sparse!==void 0&&(i.push(this.getDependency(`bufferView`,r.sparse.indices.bufferView)),i.push(this.getDependency(`bufferView`,r.sparse.values.bufferView))),Promise.all(i).then(function(e){let i=e[0],a=sf[r.type],o=rf[r.componentType],s=o.BYTES_PER_ELEMENT,c=s*a,l=r.byteOffset||0,u=r.bufferView===void 0?void 0:n.bufferViews[r.bufferView].byteStride,d=r.normalized===!0,f,p;if(u&&u!==c){let e=Math.floor(l/u),n=`InterleavedBuffer:`+r.bufferView+`:`+r.componentType+`:`+e+`:`+r.count,c=t.cache.get(n);c||(f=new o(i,e*u,r.count*u/s),c=new Vr(f,u/s),t.cache.add(n,c)),p=new Ur(c,a,l%u/s,d)}else f=i===null?new o(r.count*a):new o(i,l,r.count*a),p=new Tr(f,a,d);if(r.sparse!==void 0){let t=sf.SCALAR,n=rf[r.sparse.indices.componentType],s=r.sparse.indices.byteOffset||0,c=r.sparse.values.byteOffset||0,l=new n(e[1],s,r.sparse.count*t),u=new o(e[2],c,r.sparse.count*a);i!==null&&(p=new Tr(p.array.slice(),p.itemSize,p.normalized)),p.normalized=!1;for(let e=0,t=l.length;e<t;e++){let t=l[e];if(p.setX(t,u[e*a]),a>=2&&p.setY(t,u[e*a+1]),a>=3&&p.setZ(t,u[e*a+2]),a>=4&&p.setW(t,u[e*a+3]),a>=5)throw Error(`THREE.GLTFLoader: Unsupported itemSize in sparse BufferAttribute.`)}p.normalized=d}return p})}loadTexture(e){let t=this.json,n=this.options,r=t.textures[e].source,i=t.images[r],a=this.textureLoader;if(i.uri){let e=n.manager.getHandler(i.uri);e!==null&&(a=e)}return this.loadTextureImage(e,r,a)}loadTextureImage(e,t,n){let r=this,i=this.json,a=i.textures[e],o=i.images[t],s=(o.uri||o.bufferView)+`:`+a.sampler;if(this.textureCache[s])return this.textureCache[s];let c=this.loadImageSource(t,n).then(function(t){t.flipY=!1,t.name=a.name||o.name||``,t.name===``&&typeof o.uri==`string`&&o.uri.startsWith(`data:image/`)===!1&&(t.name=o.uri);let n=(i.samplers||{})[a.sampler]||{};return t.magFilter=af[n.magFilter]||1006,t.minFilter=af[n.minFilter]||1008,t.wrapS=of[n.wrapS]||1e3,t.wrapT=of[n.wrapT]||1e3,t.generateMipmaps=!t.isCompressedTexture&&t.minFilter!==1003&&t.minFilter!==1006,r.associations.set(t,{textures:e}),t}).catch(function(){return null});return this.textureCache[s]=c,c}loadImageSource(e,t){let n=this,r=this.json,i=this.options;if(this.sourceCache[e]!==void 0)return this.sourceCache[e].then(e=>e.clone());let a=r.images[e],o=self.URL||self.webkitURL,s=a.uri||``,c=!1;if(a.bufferView!==void 0)s=n.getDependency(`bufferView`,a.bufferView).then(function(e){c=!0;let t=new Blob([e],{type:a.mimeType});return s=o.createObjectURL(t),s});else if(a.uri===void 0)throw Error(`THREE.GLTFLoader: Image `+e+` is missing URI and bufferView`);let l=Promise.resolve(s).then(function(e){return new Promise(function(n,r){let a=n;t.isImageBitmapLoader===!0&&(a=function(e){let t=new tn(e);t.needsUpdate=!0,n(t)}),t.load(ts.resolveURL(e,i.path),a,void 0,r)})}).then(function(e){return c===!0&&o.revokeObjectURL(s),mf(e,a),e.userData.mimeType=a.mimeType||bf(a.uri),e}).catch(function(e){throw console.error(`THREE.GLTFLoader: Couldn't load texture`,s),e});return this.sourceCache[e]=l,l}assignTexture(e,t,n,r){let i=this;return this.getDependency(`texture`,n.index).then(function(a){if(!a)return null;if(n.texCoord!==void 0&&n.texCoord>0&&(a=a.clone(),a.channel=n.texCoord),i.extensions[Dd.KHR_TEXTURE_TRANSFORM]){let e=n.extensions===void 0?void 0:n.extensions[Dd.KHR_TEXTURE_TRANSFORM];if(e){let t=i.associations.get(a);a=i.extensions[Dd.KHR_TEXTURE_TRANSFORM].extendTexture(a,e),i.associations.set(a,t)}}return r!==void 0&&(a.colorSpace=r),e[t]=a,a})}assignFinalMaterial(e){let t=e.geometry,n=e.material,r=t.attributes.tangent===void 0,i=t.attributes.color!==void 0,a=t.attributes.normal===void 0;if(e.isPoints){let e=`PointsMaterial:`+n.uuid,t=this.cache.get(e);t||(t=new Sa,Gr.prototype.copy.call(t,n),t.color.copy(n.color),t.map=n.map,t.sizeAttenuation=!1,this.cache.add(e,t)),n=t}else if(e.isLine){let e=`LineBasicMaterial:`+n.uuid,t=this.cache.get(e);t||(t=new ca,Gr.prototype.copy.call(t,n),t.color.copy(n.color),t.map=n.map,this.cache.add(e,t)),n=t}if(r||i||a){let e=`ClonedMaterial:`+n.uuid+`:`;r&&(e+=`derivative-tangents:`),i&&(e+=`vertex-colors:`),a&&(e+=`flat-shading:`);let t=this.cache.get(e);t||(t=n.clone(),i&&(t.vertexColors=!0),a&&(t.flatShading=!0),r&&(t.normalScale&&(t.normalScale.y*=-1),t.clearcoatNormalScale&&(t.clearcoatNormalScale.y*=-1)),this.cache.add(e,t),this.associations.set(t,this.associations.get(n))),n=t}e.material=n}getMaterialType(){return Qa}loadMaterial(e){let t=this,n=this.json,r=this.extensions,i=n.materials[e],a,o={},s=i.extensions||{},c=[];if(s[Dd.KHR_MATERIALS_UNLIT]){let e=r[Dd.KHR_MATERIALS_UNLIT];a=e.getMaterialType(),c.push(e.extendParams(o,i,t))}else{let n=i.pbrMetallicRoughness||{};if(o.color=new G(1,1,1),o.opacity=1,Array.isArray(n.baseColorFactor)){let e=n.baseColorFactor;o.color.setRGB(e[0],e[1],e[2],Ke),o.opacity=e[3]}n.baseColorTexture!==void 0&&c.push(t.assignTexture(o,`map`,n.baseColorTexture,Ge)),o.metalness=n.metallicFactor===void 0?1:n.metallicFactor,o.roughness=n.roughnessFactor===void 0?1:n.roughnessFactor,n.metallicRoughnessTexture!==void 0&&(c.push(t.assignTexture(o,`metalnessMap`,n.metallicRoughnessTexture)),c.push(t.assignTexture(o,`roughnessMap`,n.metallicRoughnessTexture))),a=this._invokeOne(function(t){return t.getMaterialType&&t.getMaterialType(e)}),c.push(Promise.all(this._invokeAll(function(t){return t.extendMaterialParams&&t.extendMaterialParams(e,o)})))}i.doubleSided===!0&&(o.side=2);let l=i.alphaMode||df.OPAQUE;if(l===df.BLEND?(o.transparent=!0,o.depthWrite=!1):(o.transparent=!1,l===df.MASK&&(o.alphaTest=i.alphaCutoff===void 0?.5:i.alphaCutoff)),i.normalTexture!==void 0&&a!==gi&&(c.push(t.assignTexture(o,`normalMap`,i.normalTexture)),o.normalScale=new H(1,1),i.normalTexture.scale!==void 0)){let e=i.normalTexture.scale;o.normalScale.set(e,e)}if(i.occlusionTexture!==void 0&&a!==gi&&(c.push(t.assignTexture(o,`aoMap`,i.occlusionTexture)),i.occlusionTexture.strength!==void 0&&(o.aoMapIntensity=i.occlusionTexture.strength)),i.emissiveFactor!==void 0&&a!==gi){let e=i.emissiveFactor;o.emissive=new G().setRGB(e[0],e[1],e[2],Ke)}return i.emissiveTexture!==void 0&&a!==gi&&c.push(t.assignTexture(o,`emissiveMap`,i.emissiveTexture,Ge)),Promise.all(c).then(function(){let n=new a(o);return i.name&&(n.name=i.name),mf(n,i),t.associations.set(n,{materials:e}),i.extensions&&pf(r,n,i),n})}createUniqueName(e){let t=Ns.sanitizeNodeName(e||``);return t in this.nodeNamesUsed?t+`_`+ ++this.nodeNamesUsed[t]:(this.nodeNamesUsed[t]=0,t)}loadGeometries(e){let t=this,n=this.extensions,r=this.primitiveCache;function i(e){return n[Dd.KHR_DRACO_MESH_COMPRESSION].decodePrimitive(e,t).then(function(n){return wf(n,e,t)})}let a=[];for(let n=0,o=e.length;n<o;n++){let o=e[n],s=_f(o),c=r[s];if(c)a.push(c.promise);else{let e;e=o.extensions&&o.extensions[Dd.KHR_DRACO_MESH_COMPRESSION]?i(o):wf(new Br,o,t),r[s]={primitive:o,promise:e},a.push(e)}}return Promise.all(a)}loadMesh(e){let t=this,n=this.json,r=this.extensions,i=n.meshes[e],a=i.primitives,o=[];for(let e=0,t=a.length;e<t;e++){let t=a[e].material===void 0?ff(this.cache):this.getDependency(`material`,a[e].material);o.push(t)}return o.push(t.loadGeometries(a)),Promise.all(o).then(function(n){let o=n.slice(0,n.length-1),s=n[n.length-1],c=[];for(let n=0,l=s.length;n<l;n++){let l=s[n],u=a[n],d,f=o[n];if(u.mode===nf.TRIANGLES||u.mode===nf.TRIANGLE_STRIP||u.mode===nf.TRIANGLE_FAN||u.mode===void 0)d=i.isSkinnedMesh===!0?new zi(l,f):new K(l,f),d.isSkinnedMesh===!0&&d.normalizeSkinWeights(),u.mode===nf.TRIANGLE_STRIP?d.geometry=xd(d.geometry,1):u.mode===nf.TRIANGLE_FAN&&(d.geometry=xd(d.geometry,2));else if(u.mode===nf.LINES)d=new ba(l,f);else if(u.mode===nf.LINE_STRIP)d=new ga(l,f);else if(u.mode===nf.LINE_LOOP)d=new xa(l,f);else if(u.mode===nf.POINTS)d=new Da(l,f);else throw Error(`THREE.GLTFLoader: Primitive mode unsupported: `+u.mode);Object.keys(d.geometry.morphAttributes).length>0&&gf(d,i),d.name=t.createUniqueName(i.name||`mesh_`+e),mf(d,i),u.extensions&&pf(r,d,u),t.assignFinalMaterial(d),c.push(d)}for(let n=0,r=c.length;n<r;n++)t.associations.set(c[n],{meshes:e,primitives:n});if(c.length===1)return i.extensions&&pf(r,c[0],i),c[0];let l=new Ln;i.extensions&&pf(r,l,i),t.associations.set(l,{meshes:e});for(let e=0,t=c.length;e<t;e++)l.add(c[e]);return l})}loadCamera(e){let t,n=this.json.cameras[e],r=n[n.type];if(!r){console.warn(`THREE.GLTFLoader: Missing camera parameters.`);return}return n.type===`perspective`?t=new qo(Lt.radToDeg(r.yfov),r.aspectRatio||1,r.znear||1,r.zfar||2e6):n.type===`orthographic`&&(t=new Qo(-r.xmag,r.xmag,r.ymag,-r.ymag,r.znear,r.zfar)),n.name&&(t.name=this.createUniqueName(n.name)),mf(t,n),Promise.resolve(t)}loadSkin(e){let t=this.json.skins[e],n=[];for(let e=0,r=t.joints.length;e<r;e++)n.push(this._loadNodeShallow(t.joints[e]));return t.inverseBindMatrices===void 0?n.push(null):n.push(this.getDependency(`accessor`,t.inverseBindMatrices)),Promise.all(n).then(function(e){let n=e.pop(),r=e,i=[],a=[];for(let e=0,o=r.length;e<o;e++){let o=r[e];if(o){i.push(o);let t=new ln;n!==null&&t.fromArray(n.array,e*16),a.push(t)}else console.warn(`THREE.GLTFLoader: Joint "%s" could not be found.`,t.joints[e])}return new Wi(i,a)})}loadAnimation(e){let t=this.json,n=this,r=t.animations[e],i=r.name?r.name:`animation_`+e,a=[],o=[],s=[],c=[],l=[];for(let e=0,t=r.channels.length;e<t;e++){let t=r.channels[e],n=r.samplers[t.sampler],i=t.target,u=i.node,d=r.parameters===void 0?n.input:r.parameters[n.input],f=r.parameters===void 0?n.output:r.parameters[n.output];i.node!==void 0&&(a.push(this.getDependency(`node`,u)),o.push(this.getDependency(`accessor`,d)),s.push(this.getDependency(`accessor`,f)),c.push(n),l.push(i))}return Promise.all([Promise.all(a),Promise.all(o),Promise.all(s),Promise.all(c),Promise.all(l)]).then(function(e){let t=e[0],a=e[1],o=e[2],s=e[3],c=e[4],l=[];for(let e=0,r=t.length;e<r;e++){let r=t[e],i=a[e],u=o[e],d=s[e],f=c[e];if(r===void 0)continue;r.updateMatrix&&r.updateMatrix();let p=n._createAnimationTracks(r,i,u,d,f);if(p)for(let e=0;e<p.length;e++)l.push(p[e])}let u=new xo(i,void 0,l);return mf(u,r),u})}createNodeMesh(e){let t=this.json,n=this,r=t.nodes[e];return r.mesh===void 0?null:n.getDependency(`mesh`,r.mesh).then(function(e){let t=n._getNodeRef(n.meshCache,r.mesh,e);return r.weights!==void 0&&t.traverse(function(e){if(e.isMesh)for(let t=0,n=r.weights.length;t<n;t++)e.morphTargetInfluences[t]=r.weights[t]}),t})}loadNode(e){let t=this.json,n=this,r=t.nodes[e],i=n._loadNodeShallow(e),a=[],o=r.children||[];for(let e=0,t=o.length;e<t;e++)a.push(n.getDependency(`node`,o[e]));let s=r.skin===void 0?Promise.resolve(null):n.getDependency(`skin`,r.skin);return Promise.all([i,Promise.all(a),s]).then(function(e){let t=e[0],n=e[1],r=e[2];r!==null&&t.traverse(function(e){e.isSkinnedMesh&&e.bind(r,xf)});for(let e=0,r=n.length;e<r;e++)t.add(n[e]);if(t.userData.pivot!==void 0&&n.length>0){let e=t.userData.pivot,r=n[0];t.pivot=new U().fromArray(e),t.position.x-=e[0],t.position.y-=e[1],t.position.z-=e[2],r.position.set(0,0,0),delete t.userData.pivot}return t})}_loadNodeShallow(e){let t=this.json,n=this.extensions,r=this;if(this.nodeCache[e]!==void 0)return this.nodeCache[e];let i=t.nodes[e],a=i.name?r.createUniqueName(i.name):``,o=[],s=r._invokeOne(function(t){return t.createNodeMesh&&t.createNodeMesh(e)});return s&&o.push(s),i.camera!==void 0&&o.push(r.getDependency(`camera`,i.camera).then(function(e){return r._getNodeRef(r.cameraCache,i.camera,e)})),r._invokeAll(function(t){return t.createNodeAttachment&&t.createNodeAttachment(e)}).forEach(function(e){o.push(e)}),this.nodeCache[e]=Promise.all(o).then(function(t){let o;if(o=i.isBone===!0?new Bi:t.length>1?new Ln:t.length===1?t[0]:new In,o!==t[0])for(let e=0,n=t.length;e<n;e++)o.add(t[e]);if(i.name&&(o.userData.name=i.name,o.name=a),mf(o,i),i.extensions&&pf(n,o,i),i.matrix!==void 0){let e=new ln;e.fromArray(i.matrix),o.applyMatrix4(e)}else i.translation!==void 0&&o.position.fromArray(i.translation),i.rotation!==void 0&&o.quaternion.fromArray(i.rotation),i.scale!==void 0&&o.scale.fromArray(i.scale);if(!r.associations.has(o))r.associations.set(o,{});else if(i.mesh!==void 0&&r.meshCache.refs[i.mesh]>1){let e=r.associations.get(o);r.associations.set(o,{...e})}return r.associations.get(o).nodes=e,o}),this.nodeCache[e]}loadScene(e){let t=this.extensions,n=this.json.scenes[e],r=this,i=new Ln;n.name&&(i.name=r.createUniqueName(n.name)),mf(i,n),n.extensions&&pf(t,i,n);let a=n.nodes||[],o=[];for(let e=0,t=a.length;e<t;e++)o.push(r.getDependency(`node`,a[e]));return Promise.all(o).then(function(e){for(let t=0,n=e.length;t<n;t++){let n=e[t];n.parent===null?i.add(n):i.add(Sd(n))}return r.associations=(e=>{let t=new Map;for(let[e,n]of r.associations)(e instanceof Gr||e instanceof tn)&&t.set(e,n);return e.traverse(e=>{let n=r.associations.get(e);n!=null&&t.set(e,n)}),t})(i),i})}_createAnimationTracks(e,t,n,r,i){let a=[],o=e.name?e.name:e.uuid,s=[];function c(e){e.morphTargetInfluences&&s.push(e.name?e.name:e.uuid)}lf[i.path]===lf.weights?(c(e),e.isGroup&&e.children.forEach(c)):s.push(o);let l;switch(lf[i.path]){case lf.weights:l=go;break;case lf.rotation:l=vo;break;case lf.translation:case lf.scale:l=bo;break;default:switch(n.itemSize){case 1:l=go;break;default:l=bo}}let u=r.interpolation===void 0?z:uf[r.interpolation],d=this._getArrayFromAccessor(n);for(let e=0,n=s.length;e<n;e++){let n=new l(s[e]+`.`+lf[i.path],t.array,d,u);r.interpolation===`CUBICSPLINE`&&this._createCubicSplineTrackInterpolant(n),a.push(n)}return a}_getArrayFromAccessor(e){let t=e.array;if(e.normalized){let e=yf(t.constructor),n=new Float32Array(t.length);for(let r=0,i=t.length;r<i;r++)n[r]=t[r]*e;t=n}return t}_createCubicSplineTrackInterpolant(e){e.createInterpolant=function(e){return new(this instanceof vo?tf:$d)(this.times,this.values,this.getValueSize()/3,e)},e.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline=!0}};function Cf(e,t,n){let r=t.attributes,i=new sr;if(r.POSITION!==void 0){let e=n.json.accessors[r.POSITION],t=e.min,a=e.max;if(t!==void 0&&a!==void 0){if(i.set(new U(t[0],t[1],t[2]),new U(a[0],a[1],a[2])),e.normalized){let t=yf(rf[e.componentType]);i.min.multiplyScalar(t),i.max.multiplyScalar(t)}}else{console.warn(`THREE.GLTFLoader: Missing min/max properties for accessor POSITION.`);return}}else return;let a=t.targets;if(a!==void 0){let e=new U,t=new U;for(let r=0,i=a.length;r<i;r++){let i=a[r];if(i.POSITION!==void 0){let r=n.json.accessors[i.POSITION],a=r.min,o=r.max;if(a!==void 0&&o!==void 0){if(t.setX(Math.max(Math.abs(a[0]),Math.abs(o[0]))),t.setY(Math.max(Math.abs(a[1]),Math.abs(o[1]))),t.setZ(Math.max(Math.abs(a[2]),Math.abs(o[2]))),r.normalized){let e=yf(rf[r.componentType]);t.multiplyScalar(e)}e.max(t)}else console.warn(`THREE.GLTFLoader: Missing min/max properties for accessor POSITION.`)}}i.expandByVector(e)}e.boundingBox=i;let o=new Mr;i.getCenter(o.center),o.radius=i.min.distanceTo(i.max)/2,e.boundingSphere=o}function wf(e,t,n){let r=t.attributes,i=[];function a(t,r){return n.getDependency(`accessor`,t).then(function(t){e.setAttribute(r,t)})}for(let t in r){let n=cf[t]||t.toLowerCase();n in e.attributes||i.push(a(r[t],n))}if(t.indices!==void 0&&!e.index){let r=n.getDependency(`accessor`,t.indices).then(function(t){e.setIndex(t)});i.push(r)}return Gt.workingColorSpace!==`srgb-linear`&&`COLOR_0`in r&&console.warn(`THREE.GLTFLoader: Converting vertex colors from "srgb-linear" to "${Gt.workingColorSpace}" not supported.`),mf(e,t),Cf(e,t,n),Promise.all(i).then(function(){return t.targets===void 0?e:hf(e,t.targets,n)})}var Tf=class{constructor(){this.gltfLoader=new wd,this.gltfCache=new Map,this.jsonCache=new Map}loadGltf(e){if(!this.gltfCache.has(e)){let t=this.gltfLoader.loadAsync(e).then(({scene:e,animations:t=[]})=>({scene:e,animations:t})).catch(n=>{throw this.gltfCache.get(e)===t&&this.gltfCache.delete(e),n});this.gltfCache.set(e,t)}return this.gltfCache.get(e)}loadScene(e){return this.loadGltf(e).then(e=>e.scene)}loadJson(e){if(!this.jsonCache.has(e)){let t=fetch(e).then(async t=>{if(!t.ok)throw Error(`JSON request failed (${t.status}): ${e}`);return t.json()}).catch(n=>{throw this.jsonCache.get(e)===t&&this.jsonCache.delete(e),n});this.jsonCache.set(e,t)}return this.jsonCache.get(e)}},Ef=.9,Df=`module.market-stall.v2`,Of=2.15,kf=.12,Af=.3,jf=`portraits/photo-derived/voxel/host.png`,Mf=Object.freeze({"person-self":`portraits/photo-derived/voxel/host.png`,"lin-che":`portraits/photo-derived/voxel/person_01.png`,"zhou-ning":`portraits/photo-derived/voxel/person_02.png`,"chen-mo":`portraits/photo-derived/voxel/person_03.png`,"xu-an":`portraits/photo-derived/voxel/person_04.png`,"su-he":`portraits/photo-derived/voxel/person_05.png`,"tang-ke":`portraits/photo-derived/voxel/person_06.png`}),Nf=`environment.village-market.v1`,Pf=Object.freeze(new Set([`MESH_NamePlate`,`MESH_Portrait`,`MESH_PhotoFrame_01`,`MESH_PhotoFrame_02`,`MESH_Backdrop`])),Ff=Object.freeze(new Set([`MESH_BackdropBoard`,...Pf])),If=`"PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif`,Lf=Object.freeze([Object.freeze({x:-4,z:-12.6,yaw:Math.PI/2}),Object.freeze({x:4,z:-12.6,yaw:-Math.PI/2}),Object.freeze({x:-4,z:-9.7,yaw:Math.PI/2}),Object.freeze({x:4,z:-9.7,yaw:-Math.PI/2}),Object.freeze({x:-4,z:-6.8,yaw:Math.PI/2}),Object.freeze({x:4,z:-6.8,yaw:-Math.PI/2})]),Rf=Object.freeze([Object.freeze({sourceNode:`samor_1112_119`,x:3.236,z:-10.894,yaw:Math.PI,personOffset:1.7,personLateral:-.6,blockerRadius:1.4}),Object.freeze({sourceNode:`samor_1112_116`,x:.136,z:-9.634,yaw:Math.PI,personOffset:1.7,blockerRadius:1.4}),Object.freeze({sourceNode:`samor_1112_113`,x:4.886,z:-7.864,yaw:Math.PI,personOffset:1.7,blockerRadius:1.4}),Object.freeze({sourceNode:`samor_1112_184`,x:-10.914,z:-4.454,yaw:Math.PI/2,personOffset:1.25,blockerRadius:1.9}),Object.freeze({sourceNode:`samor_1112_121`,x:-9.864,z:1.206,yaw:Math.PI,personOffset:1.25,blockerRadius:1.9}),Object.freeze({sourceNode:`samor_1112_192`,x:-6.394,z:8.676,yaw:Math.PI,personOffset:1.6,blockerRadius:2.05})]),zf=Object.freeze([Object.freeze({awning:`#c65f45`,cloth:`#5b7ba6`}),Object.freeze({awning:`#3e7a8a`,cloth:`#8a9ab0`}),Object.freeze({awning:`#d8913e`,cloth:`#6e8a9a`}),Object.freeze({awning:`#8a5a7a`,cloth:`#7fa3c4`}),Object.freeze({awning:`#4f7a5a`,cloth:`#a68ab0`}),Object.freeze({awning:`#a6534a`,cloth:`#5e7b9c`}),Object.freeze({awning:`#5b7ba6`,cloth:`#c49a6a`}),Object.freeze({awning:`#7a8a4e`,cloth:`#b06a4a`})]),Bf=Object.freeze({MAT_Stall_AwningRed:`awning`,MAT_Stall_ClothBlue:`cloth`});function Vf(e){let t=0;for(let n of String(e??``))t=t*31+n.codePointAt(0)>>>0;return t%zf.length}var Hf=.85;function Uf(e){return e===Nf?Rf:Lf}function Wf(e,t=0){let n=Math.max(0,qf(e,Ef)),r=Math.max(0,qf(t,0));return Math.max(Of,n+r+kf)}function Gf(e,t=0){let n=Math.max(qf(e?.personOffset,Hf),qf(e?.blockerRadius,Ef)+Math.max(0,qf(t,0))+kf),r=qf(e?.x,0),i=qf(e?.z,0),a=qf(e?.yaw,0),o=qf(e?.personLateral,0);return{x:r+Math.sin(a)*n+Math.cos(a)*o,z:i+Math.cos(a)*n-Math.sin(a)*o,yaw:a}}function Kf(e,t=null){let n=Uf(t);return(Array.isArray(e)?e:[]).map((e,t)=>{let r=n[t%n.length];return{id:`booth_${e.id}`,type:`booth`,person_id:e.id,position:{x:r.x,z:r.z,yaw:r.yaw,person_offset:r.personOffset??Hf,person_lateral:r.personLateral??0,blocker_radius:r.blockerRadius??.9},display:{name:e.name,headline:e.headline??[e.role,e.city].filter(Boolean).join(` · `),face_ref:e.portrait??null,photos:e.portrait?[e.portrait]:[],tags:Array.isArray(e.tags)?e.tags:[]}}})}function qf(e,t){let n=Number(e);return Number.isFinite(n)?n:t}function Jf(e){if(!e||typeof e!=`object`||e.type!==`booth`)return null;let t=typeof e.person_id==`string`?e.person_id:null;if(!t)return null;let n=qf(e.position?.x,null),r=qf(e.position?.z,null);if(n===null||r===null)return null;let i=Math.max(.7,qf(e.position?.person_offset??e.position?.personOffset,Hf)),a=qf(e.position?.person_lateral??e.position?.personLateral,0),o=Math.max(.35,qf(e.position?.blocker_radius??e.position?.blockerRadius,Ef));return{id:typeof e.id==`string`?e.id:`booth_${t}`,personId:t,position:{x:n,z:r,yaw:qf(e.position?.yaw,0),personOffset:i,personLateral:a,blockerRadius:o},display:e.display&&typeof e.display==`object`?e.display:{}}}function Yf(e,t){let n=Mf[t]??jf;return{name:typeof e.name==`string`&&e.name.trim()?e.name:t,headline:typeof e.headline==`string`?e.headline:``,faceRef:n,photos:[n,n],tags:(Array.isArray(e.tags)?e.tags:[]).filter(e=>typeof e==`string`&&e.trim()).slice(0,6)}}function Xf(e,t,n,r,i,a){let o=Math.min(a,r/2,i/2);e.beginPath(),e.moveTo(t+o,n),e.arcTo(t+r,n,t+r,n+i,o),e.arcTo(t+r,n+i,t,n+i,o),e.arcTo(t,n+i,t,n,o),e.arcTo(t,n,t+r,n,o),e.closePath(),e.fill()}function Zf(e,t,n,{name:r,headline:i}){e.fillStyle=`#1e3a32`,Xf(e,0,0,t,n,n*.18),e.textAlign=`center`,e.textBaseline=`middle`,e.fillStyle=`#f7f1da`,e.font=`800 ${Math.round(n*(i?.38:.5))}px ${If}`,e.fillText(r,t/2,i?n*.33:n*.5,t*.9),i&&(e.fillStyle=`#d8c98f`,e.font=`500 ${Math.round(n*.19)}px ${If}`,e.fillText(i,t/2,n*.74,t*.88))}function Qf(e,t,n,{tags:r}){e.fillStyle=`#f2ecdc`,e.fillRect(0,0,t,n);let i=Math.round(t*.07);e.textAlign=`left`,e.textBaseline=`middle`,e.fillStyle=`#7a6f55`,e.font=`600 ${Math.round(n*.055)}px ${If}`,e.fillText(`AI 推断的兴趣标签`,i,i*.9);let a=`700 ${Math.round(n*.075)}px ${If}`,o=Math.round(n*.14),s=Math.round(o*.45),c=Math.round(n*.035),l=i,u=i*1.6;e.font=a;for(let a of r){let r=`AI·${a}`,d=Math.ceil(e.measureText(r).width)+s*2;if(l+d>t-i&&(l=i,u+=o+c),u+o>n-i*.5)break;e.fillStyle=`#dde7da`,Xf(e,l,u,d,o,o/2),e.fillStyle=`#1f5047`,e.fillText(r,l+s,u+o/2+1),l+=d+c}r.length===0&&(e.fillStyle=`#a89f83`,e.font=`500 ${Math.round(n*.06)}px ${If}`,e.fillText(`标签整理中`,i,i*1.6+o/2))}function $f(e){e.geometry.computeBoundingBox();let t=e.geometry.boundingBox,n=t?t.max.x-t.min.x:1,r=t?t.max.y-t.min.y:1,i=r>0?n/r:2,a=Math.round(Lt.clamp(512/i,128,1024)),o=document.createElement(`canvas`);return o.width=512,o.height=a,{canvas:o,ctx:o.getContext(`2d`),width:512,height:a}}function ep(e){e.material.side=0,e.material.needsUpdate=!0,e.rotateY(Math.PI)}function tp({includeCounter:e=!0}={}){let t=new Ln;t.name=`BOOTH_TemplateFallback`;let n=new Qa({color:`#8a6a4a`,roughness:.9}),r=new Qa({color:`#2a4a40`,roughness:.85}),i=()=>new Qa({color:`#ffffff`,roughness:.92}),a=e?-.46:-1.45,o=a+.045,s=new K(new Pa(2,2.3,.08),r);s.name=`MESH_BackdropBoard`,s.position.set(0,1.32,a);let c=new K(new Ba(1.9,1.6),i());c.name=`MESH_Backdrop`,c.position.set(0,1.1,o);let l=new K(new Ba(1.35,.44),i());l.name=`MESH_NamePlate`,l.position.set(0,2.2,o);let u=new K(new Ba(.55,.72),i());u.name=`MESH_Portrait`,u.position.set(-.55,1.15,o+.005);let d=new K(new Ba(.5,.38),i());d.name=`MESH_PhotoFrame_01`,d.position.set(.48,1.45,o+.005);let f=new K(new Ba(.5,.38),i());if(f.name=`MESH_PhotoFrame_02`,f.position.set(.48,.95,o+.005),e){let e=new K(new Pa(1.7,.95,.6),n);e.name=`MESH_FallbackCounter`,e.position.set(0,.475,.38),t.add(e)}else n.dispose();return t.add(s,c,l,u,d,f),t}function np(e){let t=[];e.traverse(e=>{e.isMesh&&Ff.has(e.name)&&t.push(e)});for(let e of t)e.removeFromParent()}function rp(e){let t=new K(new Ia(e,e,1.2,24),new gi({transparent:!0,opacity:0,depthWrite:!1,colorWrite:!1}));return t.name=`BOOTH_PickProxy`,t.position.y=.6,t}var ip=class{constructor({scene:e,assetStore:t,assetCatalog:n,resolveMediaUrl:r,placeholderRef:i=jf,templateAssetId:a=Df,showDisplayBoard:o=!0}){this.scene=e,this.assetStore=t,this.assetCatalog=n,this.resolveMediaUrl=typeof r==`function`?r:e=>String(e??``),this.placeholderRef=i,this.templateAssetId=a,this.showDisplayBoard=o,this.template=null,this.booths=new Map,this.textureLoader=new No,this.textureCache=new Map}async prepare(){if(!this.templateAssetId)return this.template=tp({includeCounter:!1}),this;try{let e=this.assetCatalog.resolve(this.templateAssetId,`environment-module`);this.template=await this.assetStore.loadScene(e.resolvedUrl)}catch(e){console.warn(`[BoothSystem] 展位模板 ${this.templateAssetId} 未就绪，使用简易占位展位`,e),this.template=tp()}return this}sync(e){if(!this.template)return 0;let t=new Set;for(let n of Array.isArray(e)?e:[]){let e=Jf(n);if(!e||t.has(e.id))continue;t.add(e.id);let r=this.booths.get(e.id);r?this.#t(r,e):this.#e(e)}for(let[e,n]of[...this.booths])t.has(e)||this.#n(n);return t.size}update(e){for(let t of this.booths.values()){if(t.entrance>=1)continue;t.entrance=Math.min(1,t.entrance+e/Af);let n=1-(1-t.entrance)**3;t.root.scale.setScalar(.01+.99*n)}}get blockers(){return[...this.booths.values()].map(e=>({id:e.id,personId:e.personId,x:e.position.x,z:e.position.z,radius:e.position.blockerRadius}))}get pickRoots(){return[...this.booths.values()].map(e=>e.root)}get readablePanelCount(){let e=0;for(let t of this.booths.values())e+=t.displayMaterials.length;return e}boothForPerson(e){for(let t of this.booths.values())if(t.personId===e)return t;return null}personAnchorFor(e,t=0){let n=this.boothForPerson(e);return n?Gf(n.position,t):null}#e(e){let t=this.template.clone(!0);this.showDisplayBoard||np(t),t.name=`BOOTH_${e.id}`,t.position.set(e.position.x,0,e.position.z),t.rotation.set(0,e.position.yaw,0),t.scale.setScalar(.01),t.userData.personId=e.personId,t.userData.boothId=e.id;let n=zf[Vf(e.personId)],r=[],i=[];t.traverse(e=>{if(!e.isMesh)return;e.castShadow=!0,e.receiveShadow=!0;let t=Bf[e.material?.name];t&&(e.material=e.material.clone(),e.material.color.set(n[t])),Pf.has(e.name)&&(e.material=e.material.clone(),r.push(e.material),i.push(e))});for(let e of i)ep(e);let a=this.showDisplayBoard?null:rp(e.position.blockerRadius);a&&t.add(a);let o=new K(new Va(e.position.blockerRadius+.06,e.position.blockerRadius+.2,40),new gi({color:`#f2c55f`,transparent:!0,opacity:.55,depthWrite:!1,side:2}));o.name=`BOOTH_HoverRing`,o.rotation.x=-Math.PI*.5,o.position.y=.02,o.renderOrder=4,o.visible=!1,t.add(o);let s={id:e.id,personId:e.personId,position:e.position,root:t,displayMaterials:r,ownedTextures:new Map,displaySignature:null,displayName:null,displayHeadline:null,pickProxy:a,hoverRing:o,namePlate:t.getObjectByName(`MESH_NamePlate`)??null,entrance:0};return this.#r(s,e.display),this.scene.add(t),this.booths.set(e.id,s),s}#t(e,t){e.personId=t.personId,e.position=t.position,e.root.position.set(t.position.x,0,t.position.z),e.root.rotation.set(0,t.position.yaw,0),e.root.userData.personId=t.personId,this.#r(e,t.display)}#n(e){e.root.removeFromParent(),e.hoverRing?.geometry.dispose(),e.hoverRing?.material.dispose(),e.pickProxy?.geometry.dispose(),e.pickProxy?.material.dispose();for(let t of e.ownedTextures.values())t.dispose();for(let t of e.displayMaterials)t.dispose();this.booths.delete(e.id)}setHighlighted(e,t){if(e){for(let n of e.displayMaterials)n.emissive?.set(t?`#4a3d20`:`#000000`);if(e.hoverRing&&(e.hoverRing.visible=t),e.namePlate){let n=t?1.15:1;e.namePlate.scale.setScalar(n)}}}#r(e,t){let n=Yf(t,e.personId);e.displayName=n.name,e.displayHeadline=n.headline;let r=JSON.stringify(n);r!==e.displaySignature&&(e.displaySignature=r,this.#i(e,`MESH_Portrait`,n.faceRef),this.#i(e,`MESH_PhotoFrame_01`,n.photos[0]),this.#i(e,`MESH_PhotoFrame_02`,n.photos[1]),this.#o(e,`MESH_NamePlate`,(e,t,r)=>Zf(e,t,r,n)),this.#o(e,`MESH_Backdrop`,(e,t,r)=>Qf(e,t,r,n)))}#i(e,t,n){let r=e.root.getObjectByName(t);if(!r)return;let i=n||this.placeholderRef;this.#a(i,e=>{this.#s(r,e)})}#a(e,t,n=!1){let r=this.resolveMediaUrl(e);if(!r)return;let i=this.textureCache.get(r);if(i){t(i);return}this.textureLoader.load(r,e=>{e.colorSpace=Ge,this.textureCache.set(r,e),t(e)},void 0,()=>{!n&&e!==this.placeholderRef&&(console.warn(`[BoothSystem] 贴图加载失败，回退占位肖像：${e}`),this.#a(this.placeholderRef,t,!0))})}#o(e,t,n){let r=e.root.getObjectByName(t);if(!r)return;let{canvas:i,ctx:a,width:o,height:s}=$f(r);n(a,o,s);let c=new Aa(i);c.colorSpace=Ge,c.anisotropy=4;let l=e.ownedTextures.get(t);l&&l.dispose(),e.ownedTextures.set(t,c),this.#s(r,c)}#s(e,t){e.material.map=t,e.material.needsUpdate=!0}},ap=(e,t,n,r)=>Object.freeze({nodeName:e,x:t,z:n,yaw:r,anchorHeight:.46}),Y=Object.freeze({bounds:Object.freeze({minX:-5.35,maxX:5.35,minZ:-4.45,maxZ:4.45}),playerSpawn:Object.freeze({x:0,z:4.15,yaw:Math.PI}),roundtable:Object.freeze({id:`roundtable-six`,nodeName:`TABLE_Central6`,label:`中央六人圆桌`,center:Object.freeze({x:0,z:0}),interactionRadius:2.72,seats:Object.freeze([ap(`SEAT_Central6_04`,0,1.57,Math.PI),ap(`SEAT_Central6_03`,1.36,.785,-Math.PI*2/3),ap(`SEAT_Central6_02`,1.36,-.785,-Math.PI/3),ap(`SEAT_Central6_01`,0,-1.57,0),ap(`SEAT_Central6_06`,-1.36,-.785,Math.PI/3),ap(`SEAT_Central6_05`,-1.36,.785,Math.PI*2/3)])}),npcTables:Object.freeze([Object.freeze({id:`table-window-two`,nodeName:`TABLE_2_01`,label:`窗边双人桌`,capacity:2,center:Object.freeze({x:-3.65,z:-1.55}),seats:Object.freeze([ap(`SEAT_2_01_01`,-4.53,-1.55,Math.PI/2),ap(`SEAT_2_01_02`,-2.77,-1.55,-Math.PI/2)])}),Object.freeze({id:`table-poster-two`,nodeName:`TABLE_2_02`,label:`海报双人桌`,capacity:2,center:Object.freeze({x:-3.65,z:1.55}),seats:Object.freeze([ap(`SEAT_2_02_01`,-4.53,1.55,Math.PI/2),ap(`SEAT_2_02_02`,-2.77,1.55,-Math.PI/2)])}),Object.freeze({id:`table-library-four`,nodeName:`TABLE_4_01`,label:`书架四人桌`,capacity:4,center:Object.freeze({x:3.28,z:-1.35}),seats:Object.freeze([ap(`SEAT_4_01_01`,2.89,-.53,Math.PI*.86),ap(`SEAT_4_01_02`,3.67,-.53,-Math.PI*.86),ap(`SEAT_4_01_03`,2.89,-2.17,Math.PI*.14),ap(`SEAT_4_01_04`,3.67,-2.17,-Math.PI*.14)])}),Object.freeze({id:`table-counter-four`,nodeName:`TABLE_4_02`,label:`吧台侧四人桌`,capacity:4,center:Object.freeze({x:3.28,z:1.65}),seats:Object.freeze([ap(`SEAT_4_02_01`,2.89,2.47,Math.PI*.86),ap(`SEAT_4_02_02`,3.67,2.47,-Math.PI*.86),ap(`SEAT_4_02_03`,2.89,.83,Math.PI*.14),ap(`SEAT_4_02_04`,3.67,.83,-Math.PI*.14)])})])});function op(e){return e===Y.roundtable.id?Y.roundtable:Y.npcTables.find(t=>t.id===e)??null}var sp=Object.freeze({environmentAssetId:`environment.village-market.v1`,assetId:`module.campfire.c3525.v1`,position:Object.freeze({x:0,y:0,z:2.5}),dimensions:Object.freeze({width:1.848,height:1.006,depth:1.808}),blockerRadius:.94,interactionRadius:2.55}),cp=.03;function lp(e,t){let n=[[`width`,e.x,t.width],[`height`,e.y,t.height],[`depth`,e.z,t.depth]];for(let[e,t,r]of n)if(Math.abs(t-r)>cp)throw Error(`Campfire ${e} mismatch: expected ${r.toFixed(3)}m, got ${t.toFixed(3)}m`)}var up=class{constructor({assetStore:e,assetCatalog:t,layout:n=sp}){this.assetStore=e,this.assetCatalog=t,this.layout=n,this.root=null,this.light=null,this.size=null}async load(){let e=this.assetCatalog.resolve(this.layout.assetId,`environment-module`),t=(await this.assetStore.loadScene(e.resolvedUrl)).clone(!0);t.name=`PROP_VillageCampfire`,t.userData.assetId=this.layout.assetId,t.userData.interaction=`group-play`,t.updateMatrixWorld(!0);let n=new sr().setFromObject(t),r=n.getCenter(new U),i=n.getSize(new U);lp(i,this.layout.dimensions),t.position.set(this.layout.position.x-r.x,this.layout.position.y-n.min.y,this.layout.position.z-r.z);let a=new Zo(`#ff9a4e`,10,6,2);return a.name=`LIGHT_VillageCampfire`,a.position.set(r.x,n.min.y+i.y*.68,r.z),t.add(a),this.root=t,this.light=a,this.size=i,t}update(e){if(!this.light)return;let t=Math.sin(e*6.7)+Math.sin(e*11.3)*.38;this.light.intensity=10+t*1.15}dispose(){this.root?.removeFromParent(),this.root=null,this.light=null}},dp=Object.freeze([Object.freeze({id:`original`,label:`原版`,title:`原版咖啡厅`,environmentAssetId:`environment.cafe.v1`,visualProfile:`current`}),Object.freeze({id:`reference`,label:`几何`,title:`几何 Low-poly 咖啡厅`,environmentAssetId:`environment.cafe.reference.v1`,visualProfile:`referenceLowpoly`}),Object.freeze({id:`storybook`,label:`绘本`,title:`绘本咖啡厅`,environmentAssetId:`environment.cafe.painterly.v1`,visualProfile:`painterlyAdventure`})]);function fp(e=window.location){let t=new URLSearchParams(e.search).get(`scene`);return dp.find(e=>e.id===t)??dp.find(e=>e.id===`storybook`)}function pp(e,t=window.location){let n=dp.find(t=>t.id===e);if(!n)return!1;let r=new URL(t.href);return r.searchParams.set(`world`,`cafe`),r.searchParams.set(`scene`,n.id),r.searchParams.delete(`person`),t.assign(r.href),!0}var mp=Object.freeze([`neutral`,`happy`,`surprised`,`thinking`]),hp=new Set(mp),gp=/^[a-z0-9][a-z0-9_-]*$/i,_p=Object.freeze({voxel:Object.freeze({directory:`textures/characters/voxel/expressions`,filter:`nearest`})});function vp(e){return String(e??``).toLowerCase().replace(/[_-]/g,``)===`voxel`?`voxel`:null}function yp(e){return String(e??``).match(/(?:^|\.)((?:person_\d+)|host)(?:\.|$)/i)?.[1]?.toLowerCase()??null}function bp(e,t){return[e?.expressionSlot,e?.spec?.expression_slot,e?.spec?.expression?.slot,e?.root?.userData?.expressionSlot,yp(e?.resolvedAssetId),t].map(e=>String(e??``).trim()).find(e=>gp.test(e))??null}function xp(e){return!e?.isMesh||!e.material?[]:Array.isArray(e.material)?e.material:[e.material]}function Sp(e,t){let n=new Set;return e?.model?.traverse?.(e=>{for(let t of xp(e)){if(!t?.map)continue;let r=String(t.name??``);(/voxelatlas/i.test(r)||e.name===`GEO_Head`)&&n.add(t)}}),[...n].map(e=>({material:e,originalMap:e.map}))}function Cp(e,t){return e.colorSpace=Ge,e.generateMipmaps=!0,e.wrapS=i,e.wrapT=i,e.flipY=!1,t===`nearest`?(e.magFilter=o,e.minFilter=s):(e.magFilter=l,e.minFilter=d),e.needsUpdate=!0,e}function wp(e){for(let t of e.targets)t.material.map=t.originalMap,t.material.needsUpdate=!0}var Tp=class{constructor({textureLoader:e=new No,resolveUrl:t=md,logger:n=console}={}){this.textureLoader=e,this.resolveUrl=t,this.logger=n,this.records=new Map,this.textureCache=new Map,this.warnedUrls=new Set,this.disposed=!1}register(e,t,n){if(this.disposed)return!1;let r=String(t??``).trim(),i=vp(n),a=bp(e,r);if(!r||!i||!a)return!1;let o=Sp(e,i);if(o.length===0)return this.logger.warn?.(`No ${i} expression material found for ${r}; expressions are disabled`),!1;this.unregister(r);let s={entity:e,personId:r,variant:i,slot:a,targets:o,expressionRefs:e?.spec?.expression_refs??null,state:`neutral`,requestedState:`neutral`,requestVersion:0};return e.root.userData.expression=`neutral`,e.root.userData.expressionVariant=i,e.root.userData.expressionSlot=a,this.records.set(r,s),!0}unregister(e){let t=String(e??``).trim(),n=this.records.get(t);return n?(n.requestVersion+=1,wp(n),n.entity?.root?.userData&&(delete n.entity.root.userData.expression,delete n.entity.root.userData.expressionVariant),this.records.delete(t),!0):!1}async setExpression(e,t){if(this.disposed||!hp.has(t))return!1;let n=this.records.get(String(e??``).trim());if(!n)return!1;let r=++n.requestVersion;n.requestedState=t;let i=await this.#t(n,t),a=t;if(!i&&t!==`neutral`&&(i=await this.#t(n,`neutral`),a=`neutral`),this.disposed||r!==n.requestVersion)return!1;if(i)for(let e of n.targets)e.material.map=i,e.material.needsUpdate=!0;else wp(n),a=`neutral`;return n.state=a,n.entity.root.userData.expression=a,a===t}getExpression(e){return this.records.get(String(e??``).trim())?.state??null}getRequestedExpression(e){return this.records.get(String(e??``).trim())?.requestedState??null}has(e){return this.records.has(String(e??``).trim())}dispose(){if(!this.disposed){for(let e of this.records.values())e.requestVersion+=1,wp(e),e.entity?.root?.userData&&(delete e.entity.root.userData.expression,delete e.entity.root.userData.expressionVariant);this.records.clear(),this.disposed=!0;for(let e of this.textureCache.values())Promise.resolve(e).then(e=>e?.dispose());this.textureCache.clear(),this.warnedUrls.clear()}}#e(e,t){let n=e.expressionRefs?.[t];if(typeof n==`string`&&n.trim())return n;let r=_p[e.variant];return this.resolveUrl(`${r.directory}/${e.slot}_${t}.png`)}#t(e,t){let n=_p[e.variant],r=this.#e(e,t);if(!this.textureCache.has(r)){let i=this.textureLoader.loadAsync(r).then(r=>this.disposed?(r.dispose(),null):(r.name=`Expression_${e.variant}_${e.slot}_${t}`,Cp(r,n.filter))).catch(e=>(this.warnedUrls.has(r)||(this.warnedUrls.add(r),this.logger.warn?.(`Expression texture unavailable: ${r}`,e)),null));this.textureCache.set(r,i)}return this.textureCache.get(r)}},Ep=class{constructor(e=new U(0,0,0),t=new U(0,1,0),n=1){this.start=e,this.end=t,this.radius=n}clone(){return new this.constructor().copy(this)}set(e,t,n){return this.start.copy(e),this.end.copy(t),this.radius=n,this}copy(e){return this.start.copy(e.start),this.end.copy(e.end),this.radius=e.radius,this}getCenter(e){return e.copy(this.end).add(this.start).multiplyScalar(.5)}translate(e){return this.start.add(e),this.end.add(e),this}intersectsBox(e){return Dp(this.start.x,this.start.y,this.end.x,this.end.y,e.min.x,e.max.x,e.min.y,e.max.y,this.radius)&&Dp(this.start.x,this.start.z,this.end.x,this.end.z,e.min.x,e.max.x,e.min.z,e.max.z,this.radius)&&Dp(this.start.y,this.start.z,this.end.y,this.end.z,e.min.y,e.max.y,e.min.z,e.max.z,this.radius)}};function Dp(e,t,n,r,i,a,o,s,c){return(i-e<c||i-n<c)&&(e-a<c||n-a<c)&&(o-t<c||o-r<c)&&(t-s<c||r-s<c)}var Op=Object.freeze({radius:.28,standingHeight:1.72,seatedHeight:1.08}),kp=1e-5;function Ap(e,t){return e==null||e===``?t:Number.isFinite(Number(e))?Number(e):t}function jp(e){return e?e instanceof Ep?e:e.capsule instanceof Ep?e.capsule:e.start?.isVector3&&e.end?.isVector3&&Number.isFinite(e.radius)?e:null:null}function Mp(e){let t=jp(e);return t?{x:(t.start.x+t.end.x)*.5,z:(t.start.z+t.end.z)*.5,radius:Math.max(0,t.radius),segmentMinY:Math.min(t.start.y,t.end.y),segmentMaxY:Math.max(t.start.y,t.end.y),minY:Math.min(t.start.y,t.end.y)-t.radius,maxY:Math.max(t.start.y,t.end.y)+t.radius,capsule:t}:null}function Np(e){let t=jp(e);return t?{...Mp(t),capsule:t}:!e||!Number.isFinite(e.x)||!Number.isFinite(e.z)?null:{x:e.x,z:e.z,radius:Math.max(0,Ap(e.r??e.radius,0)),minY:Number.isFinite(e.minY)?e.minY:-1/0,maxY:Number.isFinite(e.maxY)?e.maxY:1/0,segmentMinY:Number.isFinite(e.minY)?e.minY:-1/0,segmentMaxY:Number.isFinite(e.maxY)?e.maxY:1/0,capsule:null}}function Pp(e,t){return!e.capsule||!t.capsule?0:Math.max(0,e.segmentMinY-t.segmentMaxY,t.segmentMinY-e.segmentMaxY)}function Fp(e,t,n=0){let r=e.radius+t.radius+n,i=Pp(e,t);return i>=r?0:Math.sqrt(Math.max(0,r**2-i**2))}function Ip(e,t,n,r=[],{bounds:i=null,margin:a=0,ignore:o=null}={}){return Lp(e,t,n,r,{bounds:i,margin:a,ignore:o})<=kp}function Lp(e,t,n,r=[],{bounds:i=null,margin:a=0,ignore:o=null}={}){let s=Mp(e);if(!s)return 1/0;let c=0;i&&(c+=Math.max(0,i.minX+s.radius+a-t),c+=Math.max(0,t-(i.maxX-s.radius-a)),c+=Math.max(0,i.minZ+s.radius+a-n),c+=Math.max(0,n-(i.maxZ-s.radius-a)));for(let e of r??[]){if(o&&(o.has?.(e)||o===e))continue;let r=Np(e);if(!r||r.radius<=0)continue;let i=Fp({...s,x:t,z:n},r,a);i<=0||(c+=Math.max(0,i-Math.hypot(t-r.x,n-r.z)))}return c}var Rp=class e{constructor({radius:e=Op.radius,standingHeight:t=Op.standingHeight,seatedHeight:n=Op.seatedHeight}={}){this.localRadius=Math.max(kp,Ap(e,Op.radius)),this.localStandingHeight=Math.max(this.localRadius*2,Ap(t,Op.standingHeight)),this.localSeatedHeight=Math.max(this.localRadius*2,Ap(n,Op.seatedHeight)),this.radius=this.localRadius,this.height=this.localStandingHeight,this.posture=`standing`,this.groundY=0,this.capsule=new Ep(new U(0,this.radius,0),new U(0,this.height-this.radius,0),this.radius)}sync(e,t=null){let n=e?.root??e;if(!n?.position)return this;let r=t??e?.animation?.posture??n.userData.characterPosture??`standing`;this.posture=r===`seated`?`seated`:`standing`;let i=Math.max(kp,Math.abs(n.scale?.x??1)),a=Math.max(kp,Math.abs(n.scale?.y??1));this.radius=this.localRadius*i;let o=this.posture===`seated`?this.localSeatedHeight:this.localStandingHeight;this.height=Math.max(this.radius*2,o*a),this.groundY=Ap(e?.baseY,n.position.y);let s=n.position.x,c=n.position.z,l=Math.max(0,this.height-this.radius*2);return this.capsule.radius=this.radius,this.capsule.start.set(s,this.groundY+this.radius,c),this.capsule.end.set(s,this.groundY+this.radius+l,c),n.userData.characterCollider=`capsule`,n.userData.characterColliderRadius=this.radius,n.userData.characterColliderHeight=this.height,this}clone(){let t=new e({radius:this.localRadius,standingHeight:this.localStandingHeight,seatedHeight:this.localSeatedHeight});return t.radius=this.radius,t.height=this.height,t.posture=this.posture,t.groundY=this.groundY,t.capsule.copy(this.capsule),t}},X=Object.freeze({IDLE:`idle`,WALK:`walk`,TALK:`talk`,SIT_DOWN:`sit-down`,SIT:`sit`,SIT_TALK:`sit-talk`,RAISE_RIGHT_HAND:`raise-right-hand`,RAISE_BOTH_HANDS:`raise-both-hands`}),zp=Object.freeze({idle:X.IDLE,idling:X.IDLE,stand:X.IDLE,standing:X.IDLE,walk:X.WALK,walking:X.WALK,talk:X.TALK,talking:X.TALK,nod:X.TALK,sitdown:X.SIT_DOWN,sittingdown:X.SIT_DOWN,sit:X.SIT,seated:X.SIT,sitting:X.SIT,sittalk:X.SIT_TALK,seatedtalk:X.SIT_TALK,raiserighthand:X.RAISE_RIGHT_HAND,righthand:X.RAISE_RIGHT_HAND,wave:X.RAISE_RIGHT_HAND,raisebothhands:X.RAISE_BOTH_HANDS,bothhands:X.RAISE_BOTH_HANDS,celebrate:X.RAISE_BOTH_HANDS}),Bp=new Set([`arriving`,`joining-meeting`,`walking`]),Vp=new Set([`in-meeting`,`seated`,`sitting`]),Hp=new Set([X.IDLE,X.WALK,X.TALK,X.SIT,X.SIT_TALK]),Up=new Set([X.SIT_DOWN,X.SIT_TALK]),Wp=Object.freeze({jacket:[`jacket`,`coat`,`outerwear`],hair:[`hair`],skin:[`skin`],pants:[`pants`,`trouser`,`trousers`],shoes:[`shoe`,`shoes`,`boot`,`boots`],shirt:[`shirt`,`innerwear`]});function Gp(e){return String(e).toLowerCase().replace(/[^a-z0-9]/g,``)}function Kp(e){return zp[Gp(e)]??null}function qp(e){if(typeof e==`string`||typeof e==`number`||e?.isColor)return e;if(e&&typeof e==`object`)return e.color??e.value}function Jp(e,t){if(!e||typeof e!=`object`||Array.isArray(e))return;let n=Gp(t),r=n.replace(/^mat/,``),i=Object.entries(e).map(([e,t])=>({key:Gp(e),value:qp(t)})).filter(({key:e,value:t})=>e&&t!==void 0).sort((e,t)=>t.key.length-e.key.length),a=i.find(({key:e})=>e===n||e===r);if(a)return a.value;let o=i.find(({key:e})=>n.includes(e)||r.includes(e));if(o)return o.value;for(let{key:e,value:t}of i)if(Wp[e]?.some(e=>r.includes(e)))return t}function Yp(e,t,n){if(e.lock_texture_colors)return;let r=[e.material_overrides,e.palette?.material_overrides,e.palette,t?.material_overrides,t?.palette?.material_overrides,t?.palette];for(let e of r){let t=Jp(e,n);if(t!==void 0)return t}}var Xp=class{constructor({scene:e,assetStore:t,assetCatalog:n,resolveSurfaceY:r,materialAdapter:i=null,textureLoader:a=new No}){this.scene=e,this.assetStore=t,this.assetCatalog=n,this.resolveSurfaceY=r,this.materialAdapter=i,this.textureLoader=a,this.entities=[]}async spawn(e){let t=await this.#c(e),n=e.asset_id,r;try{if(e.asset_url)r=await this.#e(e.asset_url),n=e.asset_url;else{let e=this.assetCatalog.resolve(n,`character`);r=await this.#e(e.resolvedUrl)}}catch(t){if(!e.fallback_asset_id)throw t;console.warn(`Character asset ${n} failed; using ${e.fallback_asset_id}`,t),n=e.fallback_asset_id;let i=this.assetCatalog.resolve(n,`character`);r=await this.#e(i.resolvedUrl)}let a=null;if(e.texture_url)try{a=await this.textureLoader.loadAsync(e.texture_url),this.#s(a,e.texture_filter),a.flipY=!1,a.wrapS=i,a.wrapT=i,a.needsUpdate=!0}catch(t){console.warn(`Character texture ${e.texture_url} failed; using embedded texture`,t)}if(t?.person_id&&e.person_id&&t.person_id!==e.person_id)throw Error(`Person profile mismatch: ${e.person_id} != ${t.person_id}`);let o=Sd(r.scene),s=new Ln,c=e.spawn.scale??1,l=e.spawn.x,u=e.spawn.z,d=this.resolveSurfaceY(l,u);if(d===null)throw Error(`Character spawn is outside terrain: ${e.instance_id}`);let f=new Set,p=new Map,m=n=>{if(!n)return n;if(p.has(n))return p.get(n);let r=n.clone();a&&(n.map||/voxelatlas/i.test(String(n.name??``)))&&(r.map=a),this.#s(r.map,e.texture_filter);let i=Yp(e,t,n.name);i!==void 0&&r.color?.isColor&&(r.color.set(i),r.needsUpdate=!0);let o=this.materialAdapter?this.materialAdapter(r):r;return o!==r&&r.dispose(),p.set(n,o),f.add(o),o};s.name=`PERSON_${e.instance_id}`,s.position.set(l,d+(e.spawn.ground_offset??0),u),s.rotation.y=e.spawn.yaw??0,s.scale.setScalar(c),s.userData.personId=e.person_id??t?.person_id??e.instance_id,s.userData.profile=t,s.userData.interaction=e.interaction??null,o.name=`${s.name}_Model`,o.traverse(e=>{e.isMesh&&(e.castShadow=!0,e.receiveShadow=!0,e.material=Array.isArray(e.material)?e.material.map(m):m(e.material))}),s.add(o),this.scene.add(s);let h={root:s,model:o,profile:t,spec:e,resolvedAssetId:n,instanceId:e.instance_id,materials:f,textures:a?new Set([a]):new Set,baseY:s.position.y,phase:this.entities.length*1.71,animation:null,collider:new Rp({radius:e.collider?.radius??e.collision?.radius,standingHeight:e.collider?.standingHeight??e.collider?.standing_height??e.collision?.standingHeight??e.collision?.standing_height??e.collider?.height??e.collision?.height,seatedHeight:e.collider?.seatedHeight??e.collider?.seated_height??e.collision?.seatedHeight??e.collision?.seated_height})};return this.#t(h,r.animations??[]),h.animation&&this.setBaseAction(h,X.IDLE),h.collider.sync(h),this.entities.push(h),h}async#e(e){return typeof this.assetStore.loadGltf==`function`?this.assetStore.loadGltf(e):{scene:await this.assetStore.loadScene(e),animations:[]}}#t(e,t){let n=new Map;for(let e of t){let t=Kp(e.name);t&&!n.has(t)&&n.set(t,e)}if(n.size===0)return;let r=new Is(e.model);e.animation={mixer:r,clipsByRole:n,actionsByRole:new Map,baseRole:null,currentRole:null,currentAction:null,overrideRole:null,overrideRemaining:null,pendingOverride:null,finishedOverrideAction:null,posture:`standing`},e.root.userData.characterPosture=`standing`,r.addEventListener(`finished`,t=>{let n=e.animation;!n||t.action!==n.currentAction||n.overrideRole&&(n.finishedOverrideAction=t.action)})}#n(e){return e?.root&&e?.model?e:this.entities.find(t=>t.instanceId===e||t.root.userData.personId===e)??null}#r(e,t){let n=e.animation;if(!n)return null;if(n.actionsByRole.has(t))return n.actionsByRole.get(t);let r=n.clipsByRole.get(t);if(!r)return null;let i=n.mixer.clipAction(r);return n.actionsByRole.set(t,i),i}#i(e,t,{loop:n=Hp.has(t),fadeSeconds:r=.16,restart:i=!1}={}){let a=e.animation,o=this.#r(e,t);if(!a||!o)return!1;let s=a.currentRole===t&&a.currentAction===o&&o.isRunning();if(s&&!i)return!0;let c=a.currentAction;return o.reset(),o.enabled=!0,o.clampWhenFinished=t===X.SIT_DOWN,o.setEffectiveTimeScale(1),o.setEffectiveWeight(1),o.setLoop(n?L:Fe,n?1/0:1),o.play(),c&&c!==o?c.crossFadeTo(o,r,!0):!s&&r>0&&o.fadeIn(r),a.currentRole=t,a.currentAction=o,a.finishedOverrideAction=null,e.root.userData.characterAction=t,!0}#a(e,t=.16){let n=e.animation;n?.currentAction&&(t>0?n.currentAction.fadeOut(t):n.currentAction.stop(),n.currentRole=null,n.currentAction=null,e.root.userData.characterAction=null)}#o(e){let t=e.animation;if(!t)return;let n=t.overrideRole,r=t.pendingOverride;t.overrideRole=null,t.overrideRemaining=null,t.pendingOverride=null,t.baseRole?this.#i(e,t.baseRole,{fadeSeconds:n===X.SIT_DOWN?0:.16}):this.#a(e),r&&t.posture===`seated`&&(t.overrideRole=r.role,t.overrideRemaining=r.shouldLoop?r.durationSeconds:null,this.#i(e,r.role,{loop:r.shouldLoop,restart:!0}))}setState(e,t,{seated:n=null}={}){let r=this.#n(e);if(!r?.animation)return!1;let i=String(t??``).trim().toLowerCase();return Bp.has(i)?this.setActivity(r,{moving:!0}):Vp.has(i)?this.setActivity(r,{seated:!0}):i===`talking`?this.setActivity(r,{seated:n??r.animation.posture===`seated`,talking:!0}):this.setActivity(r)}setActivity(e,{moving:t=!1,seated:n=!1,talking:r=!1,transition:i=!0}={}){let a=this.#n(e),o=a?.animation;if(!a||!o)return!1;let s=!o.overrideRole&&o.pendingOverride?.role===X.TALK?o.pendingOverride:null;if(n&&!t){let e=o.posture!==`seated`;o.posture=`seated`,a.root.userData.characterPosture=`seated`,a.collider?.sync(a);let t=r?X.SIT_TALK:X.SIT;if(e&&i&&o.clipsByRole.has(X.SIT_DOWN)){let e=this.playAction(a,X.SIT_DOWN),n=this.setBaseAction(a,t);return s&&(o.pendingOverride={...s,role:X.SIT_TALK}),e||n}let n=this.setBaseAction(a,t);return s&&(o.pendingOverride=null,this.playAction(a,X.SIT_TALK,{durationMs:s.durationSeconds===null?null:s.durationSeconds*1e3})),n}let c=o.posture===`seated`;o.posture=`standing`,a.root.userData.characterPosture=`standing`,a.collider?.sync(a);let l=t?X.WALK:r?X.TALK:X.IDLE,u=this.setBaseAction(a,l);return o.overrideRole&&(t||c&&Up.has(o.overrideRole))&&(o.pendingOverride=null,this.stopAction(a)),!t&&s&&(o.pendingOverride=null,this.playAction(a,X.TALK,{durationMs:s.durationSeconds===null?null:s.durationSeconds*1e3})),u}setBaseAction(e,t){let n=this.#n(e);if(!n?.animation)return!1;let r=t==null?X.IDLE:Kp(t);return t!=null&&!r||r&&!n.animation.clipsByRole.has(r)||r&&!Hp.has(r)?!1:(n.animation.baseRole=r,n.animation.overrideRole?!0:r?this.#i(n,r,{loop:!0}):(this.#a(n),!0))}playAction(e,t,{durationMs:n=null}={}){let r=this.#n(e),i=Kp(t);if(i===X.TALK&&r?.animation?.posture===`seated`&&r.animation.clipsByRole.has(X.SIT_TALK)&&(i=X.SIT_TALK),!r?.animation||!i||!r.animation.clipsByRole.has(i))return!1;let a=Number.isFinite(n)&&n>0?n/1e3:null;if(i===X.TALK&&r.animation.posture===`standing`&&r.animation.baseRole===X.WALK||r.animation.overrideRole===X.SIT_DOWN&&i===X.SIT_TALK)return r.animation.pendingOverride={role:i,durationSeconds:a,shouldLoop:Hp.has(i)&&a!==null},!0;let o=Hp.has(i)&&a!==null;return r.animation.overrideRole=i,r.animation.pendingOverride=null,r.animation.overrideRemaining=o?a:i===X.SIT_DOWN?(r.animation.clipsByRole.get(i)?.duration??1)+.25:null,this.#i(r,i,{loop:o,restart:!0})}stopAction(e){let t=this.#n(e);return t?.animation?.overrideRole?(t.animation.pendingOverride=null,t.animation.finishedOverrideAction=null,t.animation.overrideRole=null,t.animation.overrideRemaining=null,t.animation.baseRole?this.#i(t,t.animation.baseRole,{loop:!0,restart:!0}):this.#a(t,0),!0):!1}getAnimationDiagnostics(){return this.entities.map(e=>({personId:e.root.userData.personId,clips:e.animation?[...e.animation.clipsByRole.keys()]:[],active:e.animation?.currentRole??null,base:e.animation?.baseRole??null,override:e.animation?.overrideRole??null,posture:e.animation?.posture??null,collider:e.collider?{shape:`capsule`,radius:e.collider.radius,height:e.collider.height}:null}))}#s(e,t){e&&(e.colorSpace=Ge,t===`nearest`&&(e.magFilter=o,e.minFilter=s,e.generateMipmaps=!0,e.needsUpdate=!0))}async spawnAll(e){let t=[];for(let n of e)t.push(await this.spawn(n));return t}despawn(e){let t=typeof e==`string`?this.entities.find(t=>t.spec.instance_id===e):e,n=this.entities.indexOf(t);if(n===-1)return!1;this.entities.splice(n,1),t.animation&&(t.animation.mixer.stopAllAction(),t.animation.mixer.uncacheRoot(t.model)),t.root.removeFromParent();for(let e of t.materials??[])e.dispose();for(let e of t.textures??[])e.dispose();return!0}remove(e){return this.despawn(e)}clear({preserveIds:e=[]}={}){let t=new Set(typeof e==`string`?[e]:e),n=0;for(let e of[...this.entities])t.has(e.spec.instance_id)||this.despawn(e)&&(n+=1);return n}update(e,t){for(let n of this.entities){let r=n.animation;if(r){let t=r.overrideRole;r.mixer.update(e),r.finishedOverrideAction&&r.finishedOverrideAction===r.currentAction&&(r.finishedOverrideAction=null,this.#o(n)),r.overrideRole===t&&r.overrideRemaining!==null&&(r.overrideRemaining-=e,r.overrideRemaining<=0&&this.#o(n))}let i=r?.currentRole?0:n.spec.behavior?.idle_bob??.006;n.root.position.y=n.baseY+Math.sin(t*1.7+n.phase)*i,n.collider?.sync(n)}}async#c(e){if(e.profile!==void 0&&e.profile!==null){if(typeof e.profile!=`object`||Array.isArray(e.profile))throw Error(`Character inline profile must be an object`);return e.profile}if(!e.profile_asset_id)throw Error(`Character requires profile or profile_asset_id: ${e.instance_id}`);let t=this.assetCatalog.resolve(e.profile_asset_id,`person-profile`);return this.assetStore.loadJson(t.resolvedUrl)}},Zp=Object.freeze([Object.freeze({id:`roundtable-six`,x:0,z:0,r:1.27}),Object.freeze({id:`table-window-two`,x:-3.65,z:-1.55,r:.72}),Object.freeze({id:`table-poster-two`,x:-3.65,z:1.55,r:.72}),Object.freeze({id:`table-library-four`,x:3.28,z:-1.35,r:.94}),Object.freeze({id:`table-counter-four`,x:3.28,z:1.65,r:.94})]),Qp=Object.freeze({id:`cafe`,bounds:Y.bounds,staticCircles:Zp}),$p=Object.freeze({id:`market-street`,bounds:Object.freeze({minX:-5.5,maxX:5.5,minZ:-10,maxZ:10}),staticCircles:Object.freeze([])}),em=Object.freeze({id:`expo-hall`,bounds:Object.freeze({minX:-7.5,maxX:7.5,minZ:-5.5,maxZ:5.5}),staticCircles:Object.freeze([])}),tm=Object.freeze({id:`relationship-field`,bounds:Object.freeze({minX:-7.6,maxX:7.6,minZ:-7.6,maxZ:7.6}),staticCircles:Object.freeze([Object.freeze({x:-2.5,z:.4,r:.72}),Object.freeze({x:2.4,z:-1.6,r:.76}),Object.freeze({x:-1.1,z:-3.6,r:.82})])}),nm=[[-5.6,-1.8,.8],[8.6,7.2,.75],[-8.8,12.8,.8],[12.2,13.4,.7],[-12.6,6.8,.65],[12.6,-12.6,.75],[10.8,-6.2,.6],[-12.8,-6.8,.65],[-13,-11.8,.6],[2.8,14,.65],[-5.2,13.8,.7],[8.2,13.2,.6],[-4.6,-14.2,.7],[4.8,-14,.7]],rm=(()=>{let e=[];for(let t=-13.4;t<=13.4;t+=2.2)Math.abs(t+3.2)<2.4||Math.abs(t-3.2)<2.4||e.push([t,10.2+1.4*Math.sin(t*.3),2]);return e})(),im=Object.freeze({id:`hub-town`,bounds:Object.freeze({minX:-14.2,maxX:14.2,minZ:-15.4,maxZ:15.4}),staticCircles:Object.freeze([Object.freeze({x:-9.2,z:2.5,r:4.35}),Object.freeze({x:0,z:2.5,r:1.05}),Object.freeze({x:-2.3,z:-14.5,r:.32}),Object.freeze({x:2.3,z:-14.5,r:.32}),Object.freeze({x:6.2,z:6.9,r:.7}),Object.freeze({x:-6.4,z:7.6,r:.7}),Object.freeze({x:5.6,z:-2.6,r:.7}),...[...nm,...rm].map(([e,t,n])=>Object.freeze({x:e,z:t,r:n}))])}),am=Object.freeze({id:`hub-blockout`,bounds:Object.freeze({minX:-6.5,maxX:6.5,minZ:-13.7,maxZ:8.8}),staticCircles:Object.freeze([Object.freeze({x:-4.1,z:.6,r:.78}),Object.freeze({x:0,z:2.5,r:1.05}),Object.freeze({x:5.7,z:2.8,r:.78})])}),om=Object.freeze({id:`village-market`,bounds:Object.freeze({minX:-30,maxX:30,minZ:-30,maxZ:30}),staticCircles:Object.freeze([Object.freeze({id:`campfire-c3525`,x:sp.position.x,z:sp.position.z,r:sp.blockerRadius})])}),sm=Object.freeze({"environment.cafe.v1":Qp,"environment.cafe.reference.v1":Qp,"environment.cafe.painterly.v1":Qp,"environment.market-street.v1":$p,"environment.hub-town.v1":im,"environment.hub-blockout.v1":am,"environment.village-market.v1":om,"environment.cafe.interior.v2":Qp,"environment.expo-hall.v1":em,"environment.relationship-field.v1":tm});function cm(e){return sm[e]||(console.warn(`[ColliderRegistry] 未知环境资产 ${e}，回退咖啡厅碰撞壳`),Qp)}var lm=Math.PI*2,um=Math.PI*(3-Math.sqrt(5));function dm(e,t=null){let n=Number(e);return Number.isFinite(n)?n:t}function fm(e){return Math.min(1-2**-52,Math.max(0,dm(e(),.5)))}function pm(e){return Math.max(0,dm(e?.r??e?.radius,0))}function mm(e,{bounds:t,blockers:n,occupied:r,surfaceHeightAt:i,characterRadius:a,clearance:o,minSeparation:s}){let c=a+o;if(e.x<t.minX+c||e.x>t.maxX-c||e.z<t.minZ+c||e.z>t.maxZ-c||!Number.isFinite(i(e.x,e.z)))return!1;for(let t of n){if(!Number.isFinite(t?.x)||!Number.isFinite(t?.z))continue;let n=pm(t);if(!(n<=0)&&Math.hypot(e.x-t.x,e.z-t.z)<n+a+o)return!1}for(let t of r){if(!Number.isFinite(t?.x)||!Number.isFinite(t?.z))continue;let n=Math.max(0,dm(t.radius??t.r,a)),r=Math.max(s,a+n+o);if(Math.hypot(e.x-t.x,e.z-t.z)<r)return!1}return!0}function hm({count:e,bounds:t,blockers:n=[],occupied:r=[],surfaceHeightAt:i=()=>0,center:a=null,characterRadius:o=.28,clearance:s=.1,minSeparation:c=.72,maxRadius:l=2.5,random:u=Math.random,attemptsPerSpawn:d=120}={}){if(!Number.isInteger(e)||e<0)throw TypeError(`Entry spawn count must be a non-negative integer`);if(!t||![t.minX,t.maxX,t.minZ,t.maxZ].every(Number.isFinite))throw TypeError(`Entry spawn bounds are required`);if(e===0)return[];let f={x:dm(a?.x,(t.minX+t.maxX)*.5),z:dm(a?.z,(t.minZ+t.maxZ)*.5)},p=Math.max(c,dm(l,2.5)),m=r.map(e=>({x:dm(e?.x),z:dm(e?.z),radius:Math.max(0,dm(e?.radius??e?.r,o))})).filter(e=>e.x!==null&&e.z!==null),h=[],g=fm(u)*lm,_={bounds:t,blockers:n,occupied:m,surfaceHeightAt:i,characterRadius:o,clearance:s,minSeparation:c},v=e=>{if(!mm(e,_))return!1;let t=Math.atan2(f.x-e.x,f.z-e.z),n={x:e.x,z:e.z,yaw:t};return h.push(n),m.push({x:e.x,z:e.z,radius:o}),!0};for(let t=0;t<e;t+=1){let n=!1;for(let e=0;e<d&&!n;e+=1){let e=fm(u)*lm,t=p*Math.sqrt(.08+fm(u)*.92);n=v({x:f.x+Math.cos(e)*t,z:f.z+Math.sin(e)*t})}for(let e=0;e<480&&!n;e+=1){let r=e+t*37,i=g+r*um,a=p*Math.sqrt(.08+r*.61803398875%1*.92);n=v({x:f.x+Math.cos(i)*a,z:f.z+Math.sin(i)*a})}if(!n)throw Error(`Unable to place ${e} characters safely near entry center (${f.x.toFixed(2)}, ${f.z.toFixed(2)})`)}return h}var gm=.58,_m=.27,vm=1.82,ym=1e-4;function bm(e,t=0){if(e==null||e===``)return t;let n=Number(e);return Number.isFinite(n)?n:t}function xm(e,t){return String(e??``).trim()||t}function Sm(e,t,n,r){if(e===void 0)return t??null;let i=bm(e,null);return i===null?null:Lt.clamp(i,n,r)}function Cm(e,t={},n=null){let r=n?.heart??{},i=t?.heart??{};return{personId:e,heart:{heartScore:Sm(i.heartScore,r.heartScore,0,100),currentBpm:Sm(i.currentBpm,r.currentBpm,0,260),baselineBpm:Sm(i.baselineBpm,r.baselineBpm,0,260),trend:xm(i.trend,r.trend??`stable`)},capturedAt:t?.capturedAt===void 0?n?.capturedAt??null:t.capturedAt,status:xm(t?.status,n?.status??`pending`)}}function wm(e){return[e.heart.heartScore===null?`missing`:Math.round(e.heart.heartScore),e.heart.trend,e.status].join(`|`)}function Tm(e,t,n){return Lt.lerp(t,n,bm(e,0)/100)}function Em(e){let t=2166136261,n=String(e);for(let e=0;e<n.length;e+=1)t^=n.charCodeAt(e),t=Math.imul(t,16777619);return(t>>>0)%1e3/1e3}function Dm(e,t,n){let r=(e-t)/n;return Math.exp(-r*r)}function Om(e,t,n){let r=t/60*e+n,i=r-Math.floor(r);return Math.min(1,Dm(i,.08,.055)+Dm(i,.25,.07)*.58)}function km(e,t,n,r,i,a){let o=Math.min(a,r*.5,i*.5);e.beginPath(),e.moveTo(t+o,n),e.lineTo(t+r-o,n),e.quadraticCurveTo(t+r,n,t+r,n+o),e.lineTo(t+r,n+i-o),e.quadraticCurveTo(t+r,n+i,t+r-o,n+i),e.lineTo(t+o,n+i),e.quadraticCurveTo(t,n+i,t,n+i-o),e.lineTo(t,n+o),e.quadraticCurveTo(t,n,t+o,n),e.closePath()}function Am(e,t,n,r){let i=r*.5;e.beginPath(),e.moveTo(t,n+i*.9),e.bezierCurveTo(t-i*1.2,n+i*.15,t-i*1.02,n-i*.82,t-i*.44,n-i*.82),e.bezierCurveTo(t-i*.12,n-i*.82,t,n-i*.54,t,n-i*.34),e.bezierCurveTo(t,n-i*.54,t+i*.12,n-i*.82,t+i*.44,n-i*.82),e.bezierCurveTo(t+i*1.02,n-i*.82,t+i*1.2,n+i*.15,t,n+i*.9),e.closePath(),e.fill()}function jm(e){return/^(offline|missing|pending|stale|unavailable|error)$/i.test(e)}function Mm(e){let{canvas:t,context:n,snapshot:r}=e,i=r.heart.heartScore,a=i===null?null:Math.round(i),o=i===null||jm(r.status),s=o?`#9ca3af`:`hsl(${Math.round(5-a*.05)} 84% ${Math.round(61-a*.09)}%)`;n.clearRect(0,0,t.width,t.height),n.save(),n.shadowColor=`rgba(29, 35, 42, 0.20)`,n.shadowBlur=14,n.shadowOffsetY=5,km(n,10,10,t.width-20,t.height-26,38),n.fillStyle=o?`rgba(245, 246, 248, 0.94)`:`rgba(255, 255, 255, 0.96)`,n.fill(),n.shadowColor=`transparent`,n.lineWidth=3,n.strokeStyle=o?`rgba(156, 163, 175, 0.42)`:`rgba(255, 92, 112, 0.32)`,n.stroke(),n.fillStyle=s,Am(n,82,70,65),n.fillStyle=o?`#6b7280`:`#22252a`,n.font=`700 61px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`,n.textAlign=`center`,n.textBaseline=`middle`,n.fillText(a===null?`--`:String(a),214,69),n.restore(),e.texture.needsUpdate=!0,e.redrawCount+=1}function Nm(e,t){let n=null;return typeof document<`u`&&document.createElement?n=document.createElement(`canvas`):typeof OffscreenCanvas<`u`&&(n=new OffscreenCanvas(e,t)),n?(n.width=e,n.height=t,n):null}function Pm(e,t){let n=e?.root,r=e?.model??n;if(!n?.isObject3D||!r?.isObject3D)return t;n.updateWorldMatrix(!0,!0);let i=new sr().setFromObject(r);if(i.isEmpty()||!Number.isFinite(i.max.y))return t;let a=n.getWorldPosition(new U),o=new U(a.x,i.max.y,a.z);return n.worldToLocal(o),Number.isFinite(o.y)?o.y:t}function Fm(e){return{personId:e.personId,heart:{...e.snapshot.heart},capturedAt:e.snapshot.capturedAt,status:e.snapshot.status,animation:{beatBpm:e.beatBpm,pulse:e.pulse},render:{redrawCount:e.redrawCount,markerWidth:e.baseWidth,markerHeight:e.baseHeight}}}var Im=class{constructor({canvasFactory:e=Nm,canvasWidth:t=320,canvasHeight:n=152,markerWidth:r=gm,markerHeight:i=_m,anchorGap:a=.12,fallbackAnchorHeight:o=vm,minBeatBpm:s=48,maxBeatBpm:c=150,logger:l=console}={}){this.canvasFactory=e,this.canvasWidth=Math.max(64,Math.round(t)),this.canvasHeight=Math.max(32,Math.round(n)),this.markerWidth=Math.max(.01,bm(r,gm)),this.markerHeight=Math.max(.01,bm(i,_m)),this.anchorGap=Math.max(0,bm(a,.12)),this.fallbackAnchorHeight=Math.max(0,bm(o,vm)),this.minBeatBpm=Math.max(1,bm(s,48)),this.maxBeatBpm=Math.max(this.minBeatBpm,bm(c,150)),this.logger=l,this.records=new Map,this.disposed=!1,this.visible=!0,this.worldScale=new U}register(e,t,n={}){if(this.disposed||!e?.root?.isObject3D)return!1;let r=String(t??``).trim();if(!r)return!1;let i=this.canvasFactory(this.canvasWidth,this.canvasHeight);if(!i)return this.logger.warn?.(`Unable to create a heartbeat marker canvas for ${r}`),!1;i.width=this.canvasWidth,i.height=this.canvasHeight;let a=i.getContext?.(`2d`);if(!a)return this.logger.warn?.(`Unable to acquire a 2D marker context for ${r}`),!1;this.unregister(r);let o=new Aa(i);o.name=`HeartSignal_${r}`,o.colorSpace=Ge,o.minFilter=l,o.magFilter=l,o.generateMipmaps=!1;let s=new Kr({map:o,transparent:!0,depthTest:!1,depthWrite:!1,toneMapped:!1}),c=new oi(s);c.name=`UI_HeartSignal_${r}`,c.center.set(.5,0),c.renderOrder=90,c.visible=this.visible,c.userData.personId=r,c.userData.kind=`heart-signal`;let u=Cm(r,n),d={entity:e,personId:r,canvas:i,context:a,texture:o,material:s,sprite:c,snapshot:u,renderKey:null,redrawCount:0,anchorHeight:Pm(e,this.fallbackAnchorHeight),baseWidth:this.markerWidth,baseHeight:this.markerHeight,beatBpm:Tm(u.heart.heartScore,this.minBeatBpm,this.maxBeatBpm),phaseOffset:Em(r),pulse:0};return e.root.add(c),this.records.set(r,d),this.#e(d),this.#n(d),this.#t(d,0),!0}setSignal(e,t={}){if(this.disposed)return!1;let n=String(e??``).trim(),r=this.records.get(n);return r?(r.snapshot=Cm(n,t,r.snapshot),r.beatBpm=Tm(r.snapshot.heart.heartScore,this.minBeatBpm,this.maxBeatBpm),this.#e(r),this.#n(r),!0):!1}update(e){if(this.disposed)return;let t=Math.max(0,bm(e,0));for(let e of this.records.values()){this.#t(e,t);let n=e.entity.root.userData.heartSignal;n&&(n.animation.beatBpm=e.beatBpm,n.animation.pulse=e.pulse)}}getState(e){let t=this.records.get(String(e??``).trim());return t?Fm(t):null}getDiagnostics(){return[...this.records.values()].map(Fm)}has(e){return this.records.has(String(e??``).trim())}setVisible(e){this.visible=!!e;for(let e of this.records.values())e.sprite.visible=this.visible}unregister(e){let t=String(e??``).trim(),n=this.records.get(t);return n?(n.sprite.removeFromParent(),n.material.dispose(),n.texture.dispose(),n.entity?.root?.userData?.heartSignal?.personId===t&&delete n.entity.root.userData.heartSignal,this.records.delete(t),!0):!1}dispose(){if(!this.disposed){for(let e of[...this.records.keys()])this.unregister(e);this.disposed=!0}}#e(e){let t=wm(e.snapshot);t!==e.renderKey&&(e.renderKey=t,Mm(e))}#t(e,t){e.entity.root.updateWorldMatrix(!0,!1),e.entity.root.getWorldScale(this.worldScale);let n=Math.max(Math.abs(this.worldScale.x),ym),r=Math.max(Math.abs(this.worldScale.y),ym),i=e.snapshot.heart.heartScore===null||jm(e.snapshot.status),a=i?0:Om(t,e.beatBpm,e.phaseOffset),o=1+a*Lt.lerp(.07,.16,bm(e.snapshot.heart.heartScore,0)/100);e.pulse=a,e.sprite.position.set(0,e.anchorHeight+this.anchorGap/r,0),e.sprite.scale.set(e.baseWidth*o/n,e.baseHeight*o/r,1),e.material.opacity=i?.72:.92+a*.08}#n(e){e.entity.root.userData.heartSignal=Fm(e)}},Lm=Object.freeze({bounds:Object.freeze({minX:-6.5,maxX:6.5,minZ:-13.7,maxZ:8.8}),market:Object.freeze({width:10.6,length:10.8,centerZ:-8.2}),plaza:Object.freeze({x:0,z:2.5,radius:6.2}),cafePortal:Object.freeze({x:-4.1,z:.6}),campfire:Object.freeze({x:0,z:2.5}),broadcast:Object.freeze({x:5.7,z:2.8})}),Rm=Object.freeze([Object.freeze({x:-4,z:-12.6}),Object.freeze({x:4,z:-12.6}),Object.freeze({x:-4,z:-9.7}),Object.freeze({x:4,z:-9.7}),Object.freeze({x:-4,z:-6.8}),Object.freeze({x:4,z:-6.8}),Object.freeze({x:-4,z:-3.9}),Object.freeze({x:4,z:-3.9})]);function zm(e,t){return new Qa({name:e,color:t,roughness:.96,metalness:0,flatShading:!0})}function Bm(e,t,n,r,i){let a=new K(new Pa(...n),i);return a.name=t,a.position.set(...r),e.add(a),a}function Vm(e,t,n,r,i){let a=new Ln;return a.name=t,a.position.set(n,0,r),a.userData.kind=i,e.add(a),a}function Hm(e,{name:t,x:n,z:r,color:i,shape:a=`box`}){let o=zm(`MAT_${t}`,i),s=a===`cylinder`?new K(new Ia(.78,.78,.28,24),o):new K(new Pa(1.25,1.25,1.25),o);s.name=t,s.position.set(n,a===`cylinder`?.14:.625,r),s.userData.interactionPlaceholder=!0,e.add(s);let c=new K(new Ia(.08,.08,1.25,8),new gi({color:i,transparent:!0,opacity:.72}));return c.name=`${t}_Beacon`,c.position.set(n,1.9,r),e.add(c),s}function Um(){let e=new Ln;e.name=`ROOT_HubBlockoutV1`,e.userData.schema=`echo-hub-blockout.v1`;let t=zm(`MAT_BlockoutMarket`,`#a8b790`),n=zm(`MAT_BlockoutPlaza`,`#c7b99a`),r=zm(`MAT_BlockoutBoothSlot`,`#73856b`),i=zm(`MAT_BlockoutBoundary`,`#57645b`),a=Bm(e,`GROUND_MarketStrip`,[Lm.market.width,.16,Lm.market.length],[0,-.08,Lm.market.centerZ],t);a.userData.zone=`market`;let o=new K(new Ia(Lm.plaza.radius,Lm.plaza.radius,.16,48),n);o.name=`GROUND_PlazaCircle`,o.position.set(Lm.plaza.x,-.08,Lm.plaza.z),o.userData.zone=`plaza`,e.add(o);for(let[t,n]of Rm.entries()){let i=Bm(e,`PAD_Booth_${String(t+1).padStart(2,`0`)}`,[1.9,.08,1.35],[n.x,.04,n.z],r);i.userData.placeholder=`booth`}return Bm(e,`BLOCKOUT_MarketBoundary_L`,[.12,.28,10.8],[-5.35,.14,-8.2],i),Bm(e,`BLOCKOUT_MarketBoundary_R`,[.12,.28,10.8],[5.35,.14,-8.2],i),Hm(e,{name:`INTERACT_CafePortal`,...Lm.cafePortal,color:`#d96f5d`}),Hm(e,{name:`INTERACT_Campfire`,...Lm.campfire,color:`#e9b949`,shape:`cylinder`}),Hm(e,{name:`INTERACT_Broadcast`,...Lm.broadcast,color:`#4f88a8`}),Vm(e,`ANCHOR_PlayerSpawn`,0,-12.8,`spawn`),Vm(e,`ANCHOR_CafeDoor`,Lm.cafePortal.x,Lm.cafePortal.z,`venue`),Vm(e,`ANCHOR_Campfire`,Lm.campfire.x,Lm.campfire.z,`group-session`),Vm(e,`ANCHOR_Broadcast`,Lm.broadcast.x,Lm.broadcast.z,`broadcast`),e}var Wm=`echo-snapshot.v1`,Gm=`/echoworld/api/v0/world/snapshot`,Km=`data/mock/snapshot.demo.json`,qm=1.35,Jm=Object.freeze([3,4,5,2]),Ym=Object.freeze([`最近在整理展会后留下的那些想法，越想越有意思。`,`这家店的燕麦拿铁还是老味道。`,`你说，关系这种东西会不会真的继续长大？`,`上周路过旧礼堂，银杏叶落了一地。`,`我新做的原型终于不需要说明书了。`,`海边那班末班车，我后来还是没赶上。`,`楼下花市多了一个卖旧花盆的摊子。`,`歌单的最后一首，我一直给你留着。`]),Xm=Object.freeze({schema:Wm,tick:0,agents:Object.freeze([Object.freeze({id:`lin-che`,position:Object.freeze({x:-4.53,z:-1.55,yaw:Math.PI/2}),state:`seated`}),Object.freeze({id:`zhou-ning`,position:Object.freeze({x:-2.77,z:-1.55,yaw:-Math.PI/2}),state:`talking`}),Object.freeze({id:`chen-mo`,position:Object.freeze({x:-4.53,z:1.55,yaw:Math.PI/2}),state:`seated`}),Object.freeze({id:`xu-an`,position:Object.freeze({x:-2.77,z:1.55,yaw:-Math.PI/2}),state:`talking`}),Object.freeze({id:`su-he`,position:Object.freeze({x:2.89,z:-.53,yaw:Math.PI*.86}),state:`seated`}),Object.freeze({id:`tang-ke`,position:Object.freeze({x:3.67,z:-.53,yaw:-Math.PI*.86}),state:`seated`})]),modules:Object.freeze([]),events:Object.freeze([])}),Zm=Object.freeze(Y.npcTables.flatMap(e=>e.seats.map((t,n)=>Object.freeze({tableId:e.id,seatIndex:n,x:t.x,z:t.z,yaw:t.yaw}))));function Qm(e,t){let n=Number(e);return Number.isFinite(n)?n:t}function $m(e){let t=e?.event_id??e?.eventId??e?.id;if(t!=null&&t!==``)return JSON.stringify([`event-id`,t]);let n=e?.sequence??e?.seq;if(n!=null&&n!==``)return JSON.stringify([`sequence`,e?.type,n]);let r=e?.payload&&typeof e.payload==`object`?e.payload:{};return JSON.stringify([e?.type,e?.agent_id??e?.agentId??e?.actor_id??e?.actorId??e?.subject_id??e?.subjectId,e?.to_agent_id??e?.toAgentId??e?.target_id??e?.targetId,e?.action??r.action??r.animation??r.name,e?.duration_ms??e?.durationMs??r.duration_ms??r.durationMs,e?.text??r.text,e?.participants,e?.tick??r.tick])}function eh(e){return Math.round(e*1e3)/1e3}function th(e,t){return`${e}:${t}`}var nh=class{constructor({snapshotUrl:e=Gm,mockUrl:t=Km,intervalMs:n=2e3,fetchImpl:r=null}={}){this.snapshotUrl=e,this.mockUrl=t,this.intervalMs=n,this.fetchImpl=r??((...e)=>fetch(...e)),this.snapshotCallbacks=new Set,this.eventCallbacks=new Set,this.source=null,this.running=!1,this.timer=null,this.baseSnapshot=null,this.baseSource=null,this.sim=null,this.previousEventKeys=new Set,this.onVisibilityChange=null}onSnapshot(e){return this.snapshotCallbacks.add(e),()=>this.snapshotCallbacks.delete(e)}onEvent(e){return this.eventCallbacks.add(e),()=>this.eventCallbacks.delete(e)}start(){this.running||(this.running=!0,console.info(`[LiveWorld] 启动世界快照轮询（间隔 ${this.intervalMs}ms），优先数据源：${this.snapshotUrl}`),typeof document<`u`&&(this.onVisibilityChange=()=>{document.hidden?this.#e():this.running&&this.#n()},document.addEventListener(`visibilitychange`,this.onVisibilityChange)),this.#n())}stop(){this.running=!1,this.#e(),this.onVisibilityChange&&typeof document<`u`&&document.removeEventListener(`visibilitychange`,this.onVisibilityChange),this.onVisibilityChange=null}#e(){this.timer!==null&&(clearTimeout(this.timer),this.timer=null)}#t(){this.#e(),this.running&&(typeof document<`u`&&document.hidden||(this.timer=setTimeout(()=>void this.#n(),this.intervalMs)))}async#n(){if(this.running){this.#e();try{let e=await this.#i(this.snapshotUrl);if(!e||!Array.isArray(e.agents))throw Error(`snapshot 缺少 agents 数组`);this.sim=null,this.#a(`live`),this.#o(e)}catch(e){await this.#r(e)}finally{this.#t()}}}async#r(e){if(!this.sim){if(!this.baseSnapshot)try{let e=await this.#i(this.mockUrl);if(!e||!Array.isArray(e.agents))throw Error(`mock 快照缺少 agents 数组`);this.baseSnapshot=e,this.baseSource=`mock`}catch(t){this.baseSnapshot=Xm,this.baseSource=`fallback`,console.warn(`[LiveWorld] 实时快照与 mock 快照均不可用，使用内置兜底快照`,{liveError:String(e),mockError:String(t)})}this.sim=this.#s(this.baseSnapshot)}this.#a(this.baseSource),this.#o(this.#p(this.sim))}async#i(e){let t=await this.fetchImpl(e,{headers:{accept:`application/json`}});if(!t||!t.ok)throw Error(`HTTP ${t?.status??`error`}`);return t.json()}#a(e){if(this.source===e)return;this.source=e;let t=e===`live`?`实时后端（GET ${this.snapshotUrl}）`:e===`mock`?`本地 mock 文件（${this.mockUrl}，前端本地演化）`:`内置兜底快照（前端本地演化）`;console.info(`[LiveWorld] 世界数据源：${e} — ${t}`)}#o(e){let t=new Set,n=Array.isArray(e?.events)?e.events:[];for(let e of n){if(!e||typeof e!=`object`)continue;let n=$m(e);if(t.add(n),!this.previousEventKeys.has(n))for(let t of this.eventCallbacks)t(e)}this.previousEventKeys=t;for(let t of this.snapshotCallbacks)t(e)}#s(e){let t={tick:Qm(e?.tick,0),agents:new Map,occupied:new Map,meeting:null,lastMeetingTick:-8},n=Array.isArray(e?.agents)?e.agents:[];for(let e of n){if(!e||typeof e.id!=`string`||e.id===``)continue;let n=e.position??{},r={id:e.id,x:Qm(n.x,0),z:Qm(n.z,0),yaw:Qm(n.yaw,0),state:`seated`,avatar:e.avatar??null,target:null,tableId:null,seatIndex:null},i=String(e.state??`seated`).toLowerCase();if(i===`walking`)r.state=`walking`,this.#f(t,r,null);else if(i===`in-meeting`){let e=this.#d(t,r);r.state=`in-meeting`,e&&(r.x=e.x,r.z=e.z,r.yaw=e.yaw)}else{r.state=i===`talking`?`talking`:`seated`;let e=this.#u(t,r.x,r.z,1.5);e&&this.#c(t,r,e)}t.agents.set(r.id,r)}return t}#c(e,t,n){t.tableId&&e.occupied.delete(th(t.tableId,t.seatIndex)),e.occupied.set(th(n.tableId,n.seatIndex),t.id),t.tableId=n.tableId,t.seatIndex=n.seatIndex}#l(e,t){t.tableId&&e.occupied.delete(th(t.tableId,t.seatIndex)),t.tableId=null,t.seatIndex=null}#u(e,t,n,r){let i=null,a=r;for(let r of Zm){if(e.occupied.has(th(r.tableId,r.seatIndex)))continue;let o=Math.hypot(r.x-t,r.z-n);o<=a&&(i=r,a=o)}return i}#d(e,t){let n=Y.roundtable.seats,r=[...Jm,...n.map((e,t)=>t)];for(let i of r){let r=n[i];if(!r||e.occupied.has(th(Y.roundtable.id,i)))continue;let a={tableId:Y.roundtable.id,seatIndex:i,x:r.x,z:r.z,yaw:r.yaw};return this.#c(e,t,a),a}return null}#f(e,t,n){this.#l(e,t);let r=Zm.filter(t=>!e.occupied.has(th(t.tableId,t.seatIndex))&&t.tableId!==n);if(r.length===0&&(r=Zm.filter(t=>!e.occupied.has(th(t.tableId,t.seatIndex)))),r.length===0)return!1;let i=r[Math.floor(Math.random()*r.length)];return e.occupied.set(th(i.tableId,i.seatIndex),t.id),t.target={...i,meeting:!1},t.state=`walking`,!0}#p(e){e.tick+=1;let t=[],n=this.intervalMs/1e3*qm;for(let t of e.agents.values()){if(!t.target)continue;let r=t.target.x-t.x,i=t.target.z-t.z,a=Math.hypot(r,i);a>.001&&(t.yaw=Math.atan2(r,i)),a<=n?(t.x=t.target.x,t.z=t.target.z,t.yaw=t.target.yaw,this.#c(e,t,t.target),t.state=t.target.meeting?`in-meeting`:`seated`,t.target=null):(t.x+=r/a*n,t.z+=i/a*n,t.state=`walking`)}if(e.meeting&&e.tick>=e.meeting.endsAtTick){let n=e.meeting.participantIds;for(let t of n){let n=e.agents.get(t);n&&this.#f(e,n,Y.roundtable.id)}t.push({type:`meeting-ended`,participants:n}),e.meeting=null,e.lastMeetingTick=e.tick}if(!e.meeting&&e.tick-e.lastMeetingTick>=8&&Math.random()<.16){let n=Y.roundtable.seats.filter((t,n)=>!e.occupied.has(th(Y.roundtable.id,n))).length,r=[...e.agents.values()].filter(e=>!e.target&&e.state!==`in-meeting`&&e.tableId!==Y.roundtable.id),i=Math.min(3,r.length,n);if(i>=2){let n=[];for(;n.length<i;){let e=r.splice(Math.floor(Math.random()*r.length),1)[0];n.push(e)}for(let t of n)this.#l(e,t),t.target={...this.#d(e,t),meeting:!0},t.state=`walking`;let a=n.map(e=>e.id);t.push({type:`meeting-started`,participants:a}),e.meeting={endsAtTick:e.tick+9,participantIds:a}}}if(e.tick%2==0){let n=new Map;for(let t of e.agents.values())t.target||!t.tableId||(n.has(t.tableId)||n.set(t.tableId,[]),n.get(t.tableId).push(t));let r=[...n.values()].filter(e=>e.length>=2);if(r.length>0){let e=r[Math.floor(Math.random()*r.length)],n=e[Math.floor(Math.random()*e.length)],i=e.filter(e=>e!==n),a=i[Math.floor(Math.random()*i.length)];n.state!==`in-meeting`&&(n.state=`talking`),a.state!==`in-meeting`&&(a.state=`talking`),t.push({type:`agent-talk`,agent_id:n.id,to_agent_id:a.id,text:Ym[Math.floor(Math.random()*Ym.length)]})}}for(let t of e.agents.values())t.target||t.state===`in-meeting`||!t.tableId||Math.random()<.05&&this.#f(e,t,t.tableId);return{schema:Wm,tick:e.tick,agents:[...e.agents.values()].map(e=>({id:e.id,position:{x:eh(e.x),z:eh(e.z),yaw:eh(e.yaw)},state:e.state,...e.avatar?{avatar:e.avatar}:{}})),modules:[],events:t}}},rh=1.65,ih=.04;function ah(e){let t=[...e];for(let e=t.length-1;e>0;--e){let n=Math.floor(Math.random()*(e+1));[t[e],t[n]]=[t[n],t[e]]}return t}function oh(e,t){return Math.hypot(t.x-e.x,t.z-e.z)}var sh=class{constructor({people:e,onConversation:t=()=>{},onStateChange:n=()=>{},resolveMovement:r=({stepX:e,stepZ:t})=>[e,t]}){this.peopleById=new Map(e.map(e=>[e.id,e])),this.agents=new Map,this.onConversation=t,this.onStateChange=n,this.resolveMovement=r,this.mode=`cafe`,this.nextConversationAt=4.5,this.lastElapsed=0,this.conversationCursor=0,this.meetingPersonIds=[],this._from=new U,this._to=new U,this._targetQuaternion=new Rt}register(e,t){let n={person:e,entity:t,personId:e.id,status:`arriving`,tableId:null,seatIndex:null,seatedAt:null,transition:null,lineCursor:Math.floor(Math.random()*e.conversation.replies.length)};return t.root.userData.agentState=n.status,this.agents.set(e.id,n),n}initializeCafe(){this.mode=`cafe`,this.meetingPersonIds=[],this.nextConversationAt=this.lastElapsed+4.5;let e=ah([...this.agents.keys()]),t=ah(Y.npcTables);e.forEach((e,n)=>{let r=t[Math.floor(n/2)%t.length],i=n%Math.min(2,r.seats.length);this.moveToSeat(e,r.id,i,`walking`)})}moveToSeat(e,t,n,r=`walking`){let i=this.agents.get(e),a=op(t),o=a?.seats?.[n];if(!i||!a||!o)return!1;let s=i.entity.root,c=s.position.clone(),l=new U(o.x,0,o.z),u=oh(c,l);return s.scale.set(1,1,1),i.entity.baseY=0,i.tableId=t,i.seatIndex=n,i.seatedAt=null,u<=.001?(i.status=t===Y.roundtable.id?`in-meeting`:`seated`,i.transition=null,s.position.copy(l),s.rotation.set(0,o.yaw,0),i.entity.collider?.sync(i.entity),i.seatedAt=this.lastElapsed,this.#t(i),!0):(i.status=r,i.transition={start:c,end:l,yaw:o.yaw,progress:0,duration:Math.max(.7,u/rh),distance:u,distanceTraveled:0,stalledFor:0,recoverySide:[...e].reduce((e,t)=>e+t.charCodeAt(0),0)%2?1:-1},this.#t(i),!0)}startMeeting(e){let t=[...new Set(e)].filter(e=>this.agents.has(e)).slice(0,5);return this.mode=`meeting`,this.meetingPersonIds=t,t.forEach((e,t)=>{this.moveToSeat(e,Y.roundtable.id,t+1,`joining-meeting`)}),this.nextConversationAt=this.lastElapsed+2.4,t}endMeeting(){this.initializeCafe()}update(e,t){this.lastElapsed=t;for(let n of this.agents.values()){if(!n.transition)continue;let r=n.transition,i=n.entity.root,a=oh(i.position,r.end),o=Math.min(a,rh*Math.max(0,e)),s=a>1e-8?(r.end.x-i.position.x)/a*o:0,c=a>1e-8?(r.end.z-i.position.z)/a*o:0,l=this.resolveMovement({agent:n,entity:n.entity,stepX:s,stepZ:c,targetX:r.end.x,targetZ:r.end.z}),u=Number.isFinite(l?.[0])?l[0]:0,d=Number.isFinite(l?.[1])?l[1]:0;if(Math.hypot(u,d)<=1e-6&&o>1e-6&&(r.stalledFor+=Math.max(0,e),r.stalledFor>=.35)){let e=-(c/o)*o*r.recoverySide,t=s/o*o*r.recoverySide;l=this.resolveMovement({agent:n,entity:n.entity,stepX:e,stepZ:t,targetX:r.end.x,targetZ:r.end.z}),u=Number.isFinite(l?.[0])?l[0]:0,d=Number.isFinite(l?.[1])?l[1]:0}i.position.x+=u,i.position.z+=d;let f=Math.hypot(u,d);f>1e-6&&(r.stalledFor=0),r.distanceTraveled+=f;let p=oh(i.position,r.end);r.progress=r.distance>1e-8?Math.max(0,Math.min(1,1-p/r.distance)):1,n.entity.collider?.sync(n.entity),this._to.set(u,0,d),this._to.lengthSq()>1e-6&&(this._to.normalize(),this._targetQuaternion.setFromUnitVectors(this._from.set(0,0,1),this._to),n.entity.root.quaternion.slerp(this._targetQuaternion,.12)),p<=ih&&(n.transition=null,n.status=n.tableId===Y.roundtable.id?`in-meeting`:`seated`,i.position.y=0,i.rotation.set(0,r.yaw,0),i.scale.set(1,1,1),n.entity.baseY=0,n.entity.collider?.sync(n.entity),n.seatedAt=t,this.#t(n))}t>=this.nextConversationAt&&this.#e(t)}getState(e){let t=this.agents.get(e);if(!t)return null;let n=op(t.tableId);return{personId:e,status:t.status,tableId:t.tableId,tableLabel:n?.label??`咖啡厅`,seatIndex:t.seatIndex,meeting:t.tableId===Y.roundtable.id}}getEntity(e){return this.agents.get(e)?.entity??null}get tableGroups(){let e=new Map;for(let t of this.agents.values())!t.tableId||t.transition||(e.has(t.tableId)||e.set(t.tableId,[]),e.get(t.tableId).push(t));return e}#e(e){let t=[...this.tableGroups.entries()].filter(([,t])=>t.length>=2&&t.every(t=>t.seatedAt!==null&&e-t.seatedAt>=1));if(t.length===0){this.nextConversationAt=e+2.5;return}let[n,r]=t[this.conversationCursor%t.length];this.conversationCursor+=1;let i=r[this.conversationCursor%r.length],a=i.person.conversation.replies,o=a[i.lineCursor%a.length];i.lineCursor+=1,this.onConversation({tableId:n,speakerId:i.personId,listenerIds:r.filter(e=>e!==i).map(e=>e.personId),text:o,meeting:n===Y.roundtable.id,duration:4.6}),this.nextConversationAt=e+5.2+Math.random()*2.8}#t(e){e.entity.root.userData.agentState=e.status,this.onStateChange(this.getState(e.personId))}},ch=`person-signal.v1`,lh=Object.freeze({snapshot:new Set([`person.signal.snapshot`,`person.signal.updated`]),patch:new Set([`person.signal.patch`]),inference:new Set([`person.inference.updated`]),iceBreak:new Set([`person.iceBreak.detected`]),revoke:new Set([`person.consent.revoked`])}),uh=new Set([`rising`,`steady`,`falling`,`stable`,`settling`,`unknown`]);function dh(e,t=-1/0,n=1/0){if(e==null||e===``)return null;let r=Number(e);return Number.isFinite(r)?Math.min(n,Math.max(t,r)):null}function fh(e,t=null){let n=Date.parse(e);return Number.isFinite(n)?new Date(n).toISOString():t}function ph(e){if(!e||typeof e!=`object`||Object.isFrozen(e))return e;for(let t of Object.values(e))ph(t);return Object.freeze(e)}function mh(e={},t={}){return{...e,...t,heart:{...e.heart??{},...t.heart??{}},metrics:{...e.metrics??{},...t.metrics??{}},inference:{...e.inference??{},...t.inference??{}},iceBreak:{...e.iceBreak??{},...t.iceBreak??{}},sourceRefs:{...e.sourceRefs??{},...t.sourceRefs??{}}}}function hh(e,t=null){if(!e||typeof e!=`object`||Array.isArray(e))throw TypeError(`Person signal must be an object`);let n=mh(t??{},e),r=String(n.personId??n.person_id??``).trim();if(!r)throw TypeError(`Person signal requires personId`);let i=fh(n.capturedAt??n.captured_at,t?.capturedAt??null);if(!i)throw TypeError(`Person signal requires a valid capturedAt`);let a=n.heart??{},o=n.metrics??{},s=n.inference??{},c=n.iceBreak??{},l=n.sourceRefs??{},u=String(a.trend??`unknown`);return ph({schemaVersion:ch,personId:r,capturedAt:i,status:String(n.status??`recent`),heart:{currentBpm:dh(a.currentBpm??a.current_bpm,30,240),baselineBpm:dh(a.baselineBpm??a.baseline_bpm,30,240),peakBpm:dh(a.peakBpm??a.peak_bpm,30,240),heartScore:dh(a.heartScore??a.heart_score??a.score,0,100),trend:uh.has(u)?u:`unknown`,explanation:String(a.explanation??`等待心动值解释`)},metrics:{breathingRate:dh(o.breathingRate??o.breathing_rate,0,80),stressIndex:dh(o.stressIndex??o.stress_index,0,100),skinTemperature:dh(o.skinTemperature??o.skin_temperature,0,60),hrv:dh(o.hrv,0,500),observedAt:fh(o.observedAt??o.observed_at,null)},inference:{label:String(s.label??`等待 AI 分析`),summary:String(s.summary??`数据接入后生成解释`),confidence:dh(s.confidence,0,1),caveat:String(s.caveat??`生理唤起不是喜欢或厌恶的直接证据，需要结合活动状态与上下文理解。`)},iceBreak:{detected:!!c.detected,at:fh(c.at,null),breakSeconds:dh(c.breakSeconds??c.break_secs,0,86400),reliability:String(c.reliability??`pending`)},sourceRefs:{encounterId:String(l.encounterId??l.encounter_id??``),heartStreamId:String(l.heartStreamId??l.heart_stream_id??``),historicalBatchId:String(l.historicalBatchId??l.historical_batch_id??``),visionTrackId:String(l.visionTrackId??l.vision_track_id??``),audioSegmentId:String(l.audioSegmentId??l.audio_segment_id??``)}})}var gh=class{constructor(e=[]){this.snapshots=new Map,this.sequences=new Map,this.listeners=new Set;for(let t of e)this.upsert(t,{source:`initial`,allowStale:!0,notify:!1})}getSnapshot(e){return this.snapshots.get(String(e??``).trim())??null}get(e){return this.getSnapshot(e)}list(){return[...this.snapshots.values()]}subscribe(e){return typeof e==`function`?(this.listeners.add(e),()=>this.listeners.delete(e)):()=>{}}upsert(e,{source:t=`programmatic`,allowStale:n=!1,notify:r=!0}={}){let i=String(e?.personId??e?.person_id??``).trim(),a=this.getSnapshot(i),o=hh(e,a);return a&&!n&&Date.parse(o.capturedAt)<Date.parse(a.capturedAt)?{accepted:!1,reason:`stale`,snapshot:a}:(this.snapshots.set(o.personId,o),r&&this.#e(o,{source:t,previous:a,personId:o.personId}),{accepted:!0,reason:`updated`,snapshot:o})}remove(e,{source:t=`programmatic`,notify:n=!0}={}){let r=String(e??``).trim(),i=this.getSnapshot(r);return i?(this.snapshots.delete(r),this.sequences.delete(r),n&&this.#e(null,{source:t,previous:i,personId:r,removed:!0}),!0):!1}ingestEvent(e){if(!e||typeof e!=`object`)return{accepted:!1,reason:`invalid-event`,snapshot:null};let t=String(e.type??``),n=e.payload??{},r=n.personSignal??e.snapshot??n,i=String(e.personId??e.person_id??r.personId??r.person_id??``).trim();if(!i)return{accepted:!1,reason:`missing-person`,snapshot:null};let a=dh(e.sequence,0,2**53-1),o=this.sequences.get(i);if(a!==null&&o!==void 0&&a<=o)return{accepted:!1,reason:`stale-sequence`,snapshot:this.getSnapshot(i)};if(lh.revoke.has(t)){let e=this.remove(i,{source:t});return a!==null&&this.sequences.set(i,a),{accepted:e,reason:e?`removed`:`missing`,snapshot:null}}let s=r.capturedAt??r.captured_at??e.occurredAt??e.capturedAt,c=null;if(lh.snapshot.has(t))c={...r,personId:i,capturedAt:s};else if(lh.patch.has(t))c=mh(this.getSnapshot(i)??{personId:i},{...r,personId:i,capturedAt:s});else if(lh.inference.has(t))c=mh(this.getSnapshot(i)??{personId:i},{personId:i,capturedAt:s,inference:n.inference??n});else if(lh.iceBreak.has(t))c=mh(this.getSnapshot(i)??{personId:i},{personId:i,capturedAt:s,iceBreak:n.iceBreak??n});else return{accepted:!1,reason:`unsupported-event`,snapshot:null};let l=this.upsert(c,{source:t});return l.accepted&&a!==null&&this.sequences.set(i,a),l}#e(e,t){let n=Object.freeze(t);for(let t of this.listeners)t(e,n)}};function _h(e,t){try{return new G(e||t)}catch{return new G(t)}}function vh(e){let t=2166136261;for(let n of String(e))t^=n.charCodeAt(0),t=Math.imul(t,16777619);return()=>{t+=1831565813;let e=t;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}}function yh(e,t={}){return new Qa({color:e,roughness:t.roughness??.86,metalness:t.metalness??.02,flatShading:!0,emissive:t.emissive??`#000000`,emissiveIntensity:t.emissiveIntensity??0,transparent:!!t.transparent,opacity:t.opacity??1})}function bh(e,t,n,r,i,a=null){let o=new K(new Pa(...n),i);return o.name=t,o.position.set(...r),a&&o.rotation.set(...a),o.castShadow=!0,o.receiveShadow=!0,e.add(o),o}function xh(e,t,n){let r=new Ln;r.name=`FIELD_Threshold`,r.position.set(t.position.x,0,t.position.z),bh(r,`FIELD_ThresholdPostL`,[.24,2.5,.24],[-1.25,1.25,0],n.wood),bh(r,`FIELD_ThresholdPostR`,[.24,2.5,.24],[1.25,1.25,0],n.wood),bh(r,`FIELD_ThresholdLintel`,[2.82,.28,.28],[0,2.43,0],n.accent);for(let e=0;e<5;e+=1)bh(r,`FIELD_ThresholdToken_${e+1}`,[.28,.36,.06],[-.72+e*.36,2.1-Math.abs(2-e)*.08,.17],e%2?n.paper:n.accent,[0,0,(e-2)*.05]);return e.add(r),r}function Sh(e,t,n){let r=new Ln;r.name=`FIELD_MemoryFrame`,r.position.set(t.position.x,0,t.position.z),bh(r,`FIELD_MemoryPlinth`,[1.8,.3,1.25],[0,.15,0],n.stone),bh(r,`FIELD_MemoryLeft`,[.16,1.55,.16],[-.72,1.02,0],n.wood),bh(r,`FIELD_MemoryRight`,[.16,1.55,.16],[.72,1.02,0],n.wood),bh(r,`FIELD_MemoryTop`,[1.6,.16,.16],[0,1.76,0],n.wood);let i=bh(r,`FIELD_MemorySurface`,[1.22,1.04,.05],[0,1.14,.03],n.memory);return i.userData.fieldEntityId=t.id,e.add(r),r}function Ch(e,t,n){let r=new Ln;r.name=`FIELD_SharedThread`,r.position.set(t.position.x,0,t.position.z),bh(r,`FIELD_ThreadBase`,[1.7,.24,1.3],[0,.12,0],n.stone);for(let e of[-1,1])bh(r,`FIELD_ThreadPost_${e}`,[.16,1.75,.16],[e*.68,1.04,0],n.wood);for(let e=0;e<6;e+=1){let t=bh(r,`FIELD_ThreadStrand_${e+1}`,[1.28,.035,.035],[0,.55+e*.22,.04+e%2*.07],e%2?n.accent:n.thread);t.userData.phase=e*.7}return e.add(r),r}function wh(e,t,n){let r=new Ln;r.name=`FIELD_EchoWell`,r.position.set(t.position.x,0,t.position.z);let i=new K(new Ia(.88,1.02,.62,10,1,!1),n.stone);i.position.y=.31,i.castShadow=!0,i.receiveShadow=!0,r.add(i);let a=new K(new Va(.48,.82,12),n.accent);a.name=`FIELD_EchoOpening`,a.rotation.x=-Math.PI*.5,a.position.y=.64,r.add(a);for(let e of[-1,1])bh(r,`FIELD_EchoPost_${e}`,[.12,1.45,.12],[e*.64,1.22,0],n.wood);return bh(r,`FIELD_EchoBeam`,[1.5,.14,.14],[0,1.9,0],n.wood),e.add(r),r}function Th(e,t,n,r){let i=new K(new Fa(9.4,48),n.ground);i.name=`GROUND_RelationshipField`,i.rotation.x=-Math.PI*.5,i.receiveShadow=!0,e.add(i);let a=n.path;for(let t=0;t<19;t+=1){let n=6.1-t*.58,i=Math.sin(t*.62)*.38,o=new K(new Ia(.42+r()*.14,.46,.07,7),a);o.name=`FIELD_PathStone_${t+1}`,o.position.set(i,.035,n),o.rotation.y=r()*Math.PI,o.scale.z=.68+r()*.3,o.receiveShadow=!0,e.add(o)}for(let t=0;t<9;t+=1){let i=t/9*Math.PI*2+r()*.25,a=6.8+r()*1.7,o=Math.cos(i)*a,s=Math.sin(i)*a;if(s>5.2&&Math.abs(o)<4.5)continue;let c=new K(new za(1.5,1),n.hill);c.name=`FIELD_Hill_${t+1}`,c.position.set(o,.2,s),c.scale.set(1.4+r(),.55+r()*.35,1.2+r()),c.rotation.y=r()*Math.PI,c.castShadow=!0,c.receiveShadow=!0,e.add(c)}let o=new Ln;o.name=`FIELD_Plants`;for(let e=0;e<42;e+=1){let t=r()*Math.PI*2,i=2.4+r()*5.5,a=Math.cos(t)*i,s=Math.sin(t)*i;if(Math.abs(a)<1.05&&s>-5.4)continue;let c=new Ln;c.name=`FIELD_Plant_${e+1}`,c.position.set(a,0,s),c.rotation.y=r()*Math.PI,c.userData.phase=r()*Math.PI*2;let l=new K(new Ia(.025,.04,.52,5),n.stem);l.position.y=.26,c.add(l);let u=new K(new La(.18,.42,5),n.leaf);u.position.y=.62,u.rotation.z=(r()-.5)*.18,c.add(u),o.add(c)}e.add(o);let s=t.scene?.companion??{x:0,z:-1.1},c=new K(new Ia(.68,.82,.18,10),n.accent);c.name=`FIELD_CompanionPlinth`,c.position.set(s.x,.09,s.z),c.receiveShadow=!0,e.add(c)}var Eh=class{constructor({scene:e,field:t,decorations:n=!0}){this.scene=e,this.field=t,this.decorations=n,this.root=new Ln,this.root.name=`ROOT_RelationshipField`,this.animations=[],this.hotspots=[],this.#e(),e.add(this.root)}#e(){let e=this.field.scene?.parameters??{},t=_h(e.accent,`#dfaa60`),n=_h(e.ground,`#839a6c`),r=vh(this.field.person_id??this.field.scene?.title??`field`),i={ground:yh(n,{roughness:1}),hill:yh(n.clone().multiplyScalar(.82),{roughness:1}),path:yh(_h(e.horizon,`#d8cfb5`),{roughness:1}),stone:yh(`#67746d`,{roughness:.98}),wood:yh(`#4d5145`,{roughness:.96}),accent:yh(t,{roughness:.75,emissive:t,emissiveIntensity:.08}),paper:yh(`#e9e0c8`,{roughness:.92}),memory:yh(`#8eb0ae`,{roughness:.6,emissive:`#5b8985`,emissiveIntensity:.18}),thread:yh(`#c5d6c5`,{roughness:.68}),stem:yh(`#526c55`,{roughness:1}),leaf:yh(`#76905f`,{roughness:1})};this.decorations&&Th(this.root,this.field,i,r);for(let e of this.field.scene?.entities??[]){let t=null;e.type===`threshold`?t=xh(this.root,e,i):e.type===`memory`?t=Sh(this.root,e,i):e.type===`thread`?t=Ch(this.root,e,i):e.type===`echo`&&(t=wh(this.root,e,i)),t&&(t.userData.fieldEntityId=e.id,this.animations.push(t),this.hotspots.push({id:`field-${e.id}`,kind:e.type,x:e.position.x,z:e.position.z,radius:1.75,eyebrow:this.field.scene.title,title:e.label,detail:e.detail,prompt:e.interaction?.label??`触碰这段关系线索`,eventType:e.interaction?.event_type??`field-entered`,personId:this.field.person_id}))}this.root.traverse(e=>{e.isMesh&&(e.castShadow=e.name!==`GROUND_RelationshipField`,e.receiveShadow=!0)})}applyAtmosphere(e,{fog:t=!0}={}){let n=this.field.scene?.parameters??{};e.background=_h(n.sky,`#91bbb4`),e.fog=t?new Gn(_h(n.fog,`#d6dfd2`),8.5,26):null}update(e){let t=this.root.getObjectByName(`FIELD_Plants`);if(t)for(let n of t.children)n.rotation.z=Math.sin(e*1.35+n.userData.phase)*.035;let n=this.root.getObjectByName(`FIELD_SharedThread`);n&&n.children.forEach(t=>{t.name.startsWith(`FIELD_ThreadStrand`)&&(t.position.z=.04+Math.sin(e*1.6+t.userData.phase)*.035)});let r=this.root.getObjectByName(`FIELD_EchoOpening`);r&&(r.rotation.z=e*.08)}dispose(){this.scene.remove(this.root);let e=new Set;this.root.traverse(t=>{t.isMesh&&(t.geometry?.dispose?.(),(Array.isArray(t.material)?t.material:[t.material]).filter(Boolean).forEach(t=>e.add(t)))}),e.forEach(e=>e.dispose())}};function Dh(e){let t=new DataView(e.buffer??e,e.byteOffset??0);if(t.byteLength<16||t.getUint32(0,!0)!==1347635022)throw Error(`不是 SPZ v2 资产`);let n=t.getUint32(8,!0),r=1/(1<<t.getUint8(13)),i=new Float32Array(n*3),a=16,o=e=>{let n=t.getUint16(e,!0)|t.getUint8(e+2)<<16;return(n&8388608?n-16777216:n)*r};for(let e=0;e<n;e+=1){if(a+8>=t.byteLength)throw Error(`SPZ 位置数据不完整`);i[e*3]=o(a),i[e*3+1]=o(a+3),i[e*3+2]=o(a+6),a+=9}return{count:n,positions:i}}function Oh(e,t,n){let r=new Float32Array(e.length);for(let i=0;i<e.length;i+=3)r[i]=e[i]*t,r[i+1]=-(e[i+1]*t-n),r[i+2]=-(e[i+2]*t);return r}function kh(e,t){return e[Math.min(e.length-1,Math.floor(e.length*t))]}function Ah(e,{cellSize:t=2,layerBand:n=1.2}={}){let r=e.length/3,i=[];for(let t=0;t<r;t+=1)i.push(e[t*3+1]);i.sort((e,t)=>e-t);let a=new Map;for(let e of i){let t=Math.round(e*2)/2;a.set(t,(a.get(t)??0)+1)}let o=0,s=0;for(let[e,t]of a)t>s&&(o=e,s=t);let c=s,l=o;for(let e=o;;e+=.5){let t=a.get(e)??0;if(e>o&&t<c*.02)break;l=e}let u=e=>e>=o-n&&e<=l+.5,d=new Map,f=[],p=[];for(let n=0;n<r;n+=1){let r=e[n*3+1];if(!u(r))continue;let i=e[n*3],a=e[n*3+2],o=`${Math.floor(i/t)},${Math.floor(a/t)}`,s=d.get(o);s||(s=[],d.set(o,s)),s.push(r),f.push(i),p.push(a)}if(!f.length)return null;f.sort((e,t)=>e-t),p.sort((e,t)=>e-t);let m=Math.max(kh(f,.95)-kh(f,.05),kh(p,.95)-kh(p,.05),.001),h={x:kh(f,.5),z:kh(p,.5)},g=new Map,_=(e,t)=>e>=kh(f,.02)&&e<=kh(f,.98)&&t>=kh(p,.02)&&t<=kh(p,.98),v=null,y=0,b=null,x=0;for(let[e,n]of d){n.sort((e,t)=>e-t);let r=n[n.length>>1];g.set(e,r);let[i,a]=e.split(`,`).map(Number),o=(i+.5)*t,s=(a+.5)*t;n.length>x&&(x=n.length,b={x:o,z:s,y:r}),_(o,s)&&n.length>y&&(y=n.length,v={x:o,z:s,y:r})}v||=b;let S=kh([...g.values()].sort((e,t)=>e-t),.5);function C(e,n){let r=Math.floor(e/t),i=Math.floor(n/t);for(let e=0;e<=6;e+=1){let t=null,n=1/0;for(let a=-e;a<=e;a+=1)for(let o=-e;o<=e;o+=1){if(Math.max(Math.abs(a),Math.abs(o))!==e)continue;let s=g.get(`${r+a},${i+o}`);if(s===void 0)continue;let c=Math.hypot(a,o);c<n&&(t=s,n=c)}if(t!==null)return t}return S}return{query:C,layerY:o,extent:m,centroid:h,densest:v,cellSize:t,cellMedian:g,globalMedian:S}}function jh(e,{name:t=`GROUND_FieldHeightmap`,margin:n=6}={}){let{cellMedian:r,cellSize:i}=e,a=[...r.keys()];if(!a.length)return null;let o=[],s=[],c=0;for(let e of a){let[t,n]=e.split(`,`).map(Number),a=r.get(e),l=t*i,u=n*i,d=l+i,f=u+i;o.push(l,a,u,d,a,u,d,a,f,l,a,f),s.push(c,c+2,c+1,c,c+3,c+2),c+=4}let l=new Br;l.setAttribute(`position`,new Or(o,3)),l.setIndex(s),l.computeVertexNormals();let u=new K(l,new gi({visible:!1}));return u.name=t,u.userData.margin=n,u}var Mh=`modulepreload`,Nh=function(e){return`/echoworld/`+e},Ph={},Fh=function(e,t,n){let r=Promise.resolve();if(t&&t.length>0){let e=document.getElementsByTagName(`link`),i=document.querySelector(`meta[property=csp-nonce]`),a=i?.nonce||i?.getAttribute(`nonce`);function o(e){return Promise.all(e.map(e=>Promise.resolve(e).then(e=>({status:`fulfilled`,value:e}),e=>({status:`rejected`,reason:e}))))}function s(e){return import.meta.resolve?import.meta.resolve(e):new URL(e,import.meta.url).href}r=o(t.map(t=>{if(t=Nh(t,n),t=s(t),t in Ph)return;Ph[t]=!0;let r=t.endsWith(`.css`);for(let n=e.length-1;n>=0;n--){let i=e[n];if(i.href===t&&(!r||i.rel===`stylesheet`))return}let i=document.createElement(`link`);if(i.rel=r?`stylesheet`:Mh,r||(i.as=`script`),i.crossOrigin=``,i.href=t,a&&i.setAttribute(`nonce`,a),document.head.appendChild(i),r)return new Promise((e,n)=>{i.addEventListener(`load`,e),i.addEventListener(`error`,()=>n(Error(`Unable to preload CSS for ${t}`)))})}))}function i(e){let t=new Event(`vite:preloadError`,{cancelable:!0});if(t.payload=e,window.dispatchEvent(t),!t.defaultPrevented)throw e}return r.then(t=>{for(let e of t||[])e.status===`rejected`&&i(e.reason);return e().catch(i)})},Ih=new Rt(1,0,0,0),Lh=45,Rh={min:.05,max:40},zh=9e4;function Bh(e,t){return Promise.race([e,new Promise((e,n)=>{setTimeout(()=>n(Error(`${t} 加载超时`)),zh)})])}function Vh(e){let t=e.spz??{},n=window.matchMedia?.(`(pointer: coarse)`)?.matches??!1,r=(navigator.hardwareConcurrency??8)<=4;return(n||r)&&t[`100k`]?`100k`:t[`500k`]?`500k`:t[`100k`]?`100k`:null}async function Hh(e){let t=await Bh(fetch(e),`场域 splat 数据`);if(!t.ok)throw Error(`场域 splat 请求失败：${t.status}`);let n=await t.arrayBuffer(),r=new Uint8Array(n);if(r[0]===31&&r[1]===139&&typeof DecompressionStream==`function`){let e=new Blob([r]).stream().pipeThrough(new DecompressionStream(`gzip`));r=new Uint8Array(await new Response(e).arrayBuffer())}return Dh(r).positions}async function Uh({scene:e,renderer:t,field:n,assetStore:r,resolveMediaUrl:i,onProgress:a=null}){let o=n?.world;if(!o||o.status!==`ready`||!o.spz)return null;let s=Vh(o);if(!s)return null;let c=typeof i==`function`?i:e=>e,l=c(o.spz[s]);if(!l)return null;let{SparkRenderer:u,SplatMesh:d}=await Fh(async()=>{let{SparkRenderer:e,SplatMesh:t}=await import(`./spark.module-BZrxRnGN.js`);return{SparkRenderer:e,SplatMesh:t}},[]),f=new u({renderer:t});f.name=`SPARK_FieldRenderer`,e.add(f);let p=null,m=null;try{p=new d({url:l,onProgress:e=>{!a||!e?.lengthComputable||!e.total||a(.15+.45*Math.min(1,e.loaded/e.total),`正在载入关系场域世界`)}}),p.name=`SPLAT_FieldWorld`,await Bh(p.initialized,`splat 世界`),a?.(.62,`正在解析场域地面`);let t=Ah(Oh(await Hh(l),o.metric_scale_factor,o.ground_plane_offset),{cellSize:2});if(!t)throw Error(`场域 splat 中找不到可行走地面`);let n=Lt.clamp(Lh/t.extent,Rh.min,Rh.max),i=Number(o.metric_scale_factor)>0?Number(o.metric_scale_factor):1,u=Number(o.ground_plane_offset)||0,h=new Ln;h.name=`WORLD_MarbleSplat`;let g=new Ln;g.name=`SPLAT_Flipped`,g.quaternion.copy(Ih),g.scale.setScalar(i*n),g.position.set(-t.centroid.x*n,u*n,-t.centroid.z*n),g.add(p),h.add(g);let _=jh(t),v=new Ln;if(v.name=`GROUND_FieldHeightmap`,v.scale.setScalar(n),v.position.set(-t.centroid.x*n,0,-t.centroid.z*n),_&&v.add(_),h.add(v),o.collider_ref)try{m=await Bh(r.loadScene(c(o.collider_ref)),`场域碰撞网格`),m.name=`COLLIDER_FieldSource`,m.visible=!1,m.traverse(e=>{e.isMesh&&(e.visible=!1)}),g.add(m)}catch(e){console.warn(`[FieldSplatWorld] collider.glb 不可用，继续使用 SPZ 地面`,e)}let y=new K(new Ba(90,90),new gi);y.name=`GROUND_FieldSafetyNet`,y.rotation.x=-Math.PI*.5,y.position.y=(t.globalMedian-.3)*n,y.visible=!1;let b=new Ln;b.name=`ROOT_FieldSplatWorld`,b.add(h),b.add(y);let x=t.densest?{x:(t.densest.x-t.centroid.x)*n,z:(t.densest.z-t.centroid.z)*n,yaw:Math.atan2(t.centroid.x-t.densest.x,t.centroid.z-t.densest.z)}:null,S=[],C=[];for(let e of t.cellMedian.keys()){let[n,r]=e.split(`,`).map(Number);S.push((n+.5)*t.cellSize),C.push((r+.5)*t.cellSize)}S.sort((e,t)=>e-t),C.sort((e,t)=>e-t);let w=(e,t)=>e[Math.min(e.length-1,Math.max(0,Math.floor(e.length*t)))],T=1.5,E=Object.freeze({minX:(w(S,.02)-t.centroid.x)*n-T,maxX:(w(S,.98)-t.centroid.x)*n+T,minZ:(w(C,.02)-t.centroid.z)*n-T,maxZ:(w(C,.98)-t.centroid.z)*n+T});return a?.(.72,`场域世界已就绪`),{root:b,groundGroup:v,quality:s,spawnHint:x,bounds:E,groundQuery:(e,r)=>t.query(e/n+t.centroid.x,r/n+t.centroid.z)*n,worldId:o.world_id??null,colliderLoaded:!!m,dispose(){e.remove(f),p?.dispose?.(),f.dispose?.()}}}catch(t){throw p?.dispose?.(),e.remove(f),f.dispose?.(),t}}function Wh(e,t,{lift:n=0}={}){if(!e||!t)return!1;t.updateMatrixWorld(!0);let r=new Rs(new U(e.position.x,60,e.position.z),new U(0,-1,0)).intersectObject(t,!0);return r.length?(e.position.y=r[0].point.y+n,!0):!1}var Gh=`meetmind.rooms.v1`;function Kh(e){return`${e}-${Date.now()}-${Math.random().toString(36).slice(2,9)}`}var qh=class{constructor({roomId:e=`echoworld-cafe`,actor:t,members:n=[],baseUrl:r=`/echoworld/api/v1`}={}){this.roomId=e,this.actor=t,this.members=n,this.baseUrl=r.replace(/\/$/,``),this.sequence=0,this.snapshot=null,this.socket=null,this.running=!1,this.reconnectTimer=null,this.eventCallbacks=new Set,this.snapshotCallbacks=new Set,this.seenEventIds=new Set}onEvent(e){return this.eventCallbacks.add(e),()=>this.eventCallbacks.delete(e)}onSnapshot(e){return this.snapshotCallbacks.add(e),()=>this.snapshotCallbacks.delete(e)}async start(){this.running||(this.running=!0,await this.#e(),await this.#t(),await this.#n(),this.#r())}stop(){this.running=!1,window.clearTimeout(this.reconnectTimer),this.socket?.close(),this.socket=null}async send(e,t={}){let n=await this.#a(`rooms/${this.roomId}/commands`,{method:`POST`,body:JSON.stringify({command_id:Kh(e.replaceAll(`.`,`-`)),actor_id:this.actor.id,type:e,payload:t})});for(let e of n.events??[])this.#i(e);return this.sequence=Math.max(this.sequence,Number(n.sequence)||0),await this.#t(),n}move(e,t){return this.send(`member.move`,{x:e,z:t})}message(e,t){return this.send(`person.message`,{target_id:e,text:t})}async#e(){try{await this.#a(`rooms`,{method:`POST`,body:JSON.stringify({room_id:this.roomId,name:`Echo Cafe`})})}catch(e){if(e.status!==409)throw e}for(let e of[this.actor,...this.members])try{await this.#a(`rooms/${this.roomId}/join`,{method:`POST`,body:JSON.stringify({member_id:e.id,display_name:e.displayName??e.name??e.id,position:e.position??{x:0,z:0}})})}catch(e){if(e.status!==409)throw e}}async#t(){this.snapshot=await this.#a(`rooms/${this.roomId}/snapshot`),this.sequence=Math.max(this.sequence,Number(this.snapshot.sequence)||0);for(let e of this.snapshotCallbacks)e(this.snapshot)}async#n(){let e=await this.#a(`rooms/${this.roomId}/events?after_sequence=${this.sequence}`);for(let t of e.events??[])this.#i(t)}#r(){if(!this.running||typeof WebSocket>`u`)return;let e=new URL(`${this.baseUrl}/rooms/${this.roomId}/stream`,window.location.href);e.protocol=e.protocol===`https:`?`wss:`:`ws:`,e.searchParams.set(`after_sequence`,String(this.sequence)),this.socket=new WebSocket(e.href),this.socket.addEventListener(`message`,e=>{let t;try{t=JSON.parse(e.data)}catch{return}t.protocol===Gh&&t.type===`event`&&this.#i(t.event)}),this.socket.addEventListener(`close`,()=>{this.socket=null,this.running&&(this.reconnectTimer=window.setTimeout(async()=>{try{await this.#n(),await this.#t()}finally{this.#r()}},1200))})}#i(e){if(!(!e?.event_id||this.seenEventIds.has(e.event_id))){this.seenEventIds.add(e.event_id),this.seenEventIds.size>1e3&&(this.seenEventIds=new Set([...this.seenEventIds].slice(-500))),this.sequence=Math.max(this.sequence,Number(e.sequence)||0);for(let t of this.eventCallbacks)t(e)}}async#a(e,t={}){let n=await fetch(`${this.baseUrl}/${e}`,{headers:{accept:`application/json`,"content-type":`application/json`},...t});if(!n.ok){let e=Error(`Room API HTTP ${n.status}`);throw e.status=n.status,e.body=await n.json().catch(()=>null),e}return n.json()}},Jh=Object.freeze({bounds:Object.freeze({minX:-30,maxX:30,minZ:-30,maxZ:30}),floorY:0,visualOffset:Object.freeze({x:3,y:.66,z:-3}),cafeDoor:Object.freeze({x:-7.75,z:5.06})});function Yh(e){let t=new Ln;t.name=`ROOT_VillageMarket`,t.userData.schema=`echo-village-market.v1`,e.name=`VISUAL_VillageMarket`,e.position.set(Jh.visualOffset.x,Jh.visualOffset.y,Jh.visualOffset.z),t.add(e);let n=new K(new Ba(62,62),new gi({name:`MAT_VillageWalkPlane`,color:`#ffffff`,transparent:!0,opacity:0,depthWrite:!1,colorWrite:!1,side:2}));n.name=`GROUND_VillageWalkPlane`,n.rotation.x=-Math.PI*.5,n.position.y=Jh.floorY,n.userData.walkable=!0,n.userData.visualOnlyEnvironment=!0,t.add(n);let r=new Ln;return r.name=`ANCHOR_CafeDoor`,r.position.set(Jh.cafeDoor.x,Jh.floorY,Jh.cafeDoor.z),r.userData.kind=`venue`,t.add(r),t}function Xh(e,t,n,r){let i=[...String(t??``)],a=[],o=``;for(let t of i){let i=o+t;if(o&&e.measureText(i).width>n){if(a.push(o),o=t,a.length===r-1)break}else o=i}return o&&a.length<r&&a.push(o),a.join(``).length<i.length&&a.length&&(a[a.length-1]=`${a[a.length-1].slice(0,-1)}…`),a}function Zh(e,t){let n=e.getContext(`2d`);n.clearRect(0,0,e.width,e.height),n.fillStyle=`#153e38`,n.fillRect(0,0,e.width,e.height),n.strokeStyle=`#e6c169`,n.lineWidth=10,n.strokeRect(18,18,e.width-36,e.height-36),n.fillStyle=`#e6c169`,n.font=`700 28px "PingFang SC", "Microsoft YaHei", sans-serif`,n.textAlign=`left`,n.textBaseline=`top`,n.fillText(`ECHOWORLD  /  今日播报`,58,52),n.fillStyle=`#fffaf0`,n.font=`800 52px "PingFang SC", "Microsoft YaHei", sans-serif`,Xh(n,t?.headline??`集市今天安静开门`,900,2).forEach((e,t)=>n.fillText(e,58,122+t*64)),n.fillStyle=`#cde0d5`,n.font=`500 29px "PingFang SC", "Microsoft YaHei", sans-serif`,Xh(n,t?.summary??`走近一段关系，看看今天会发生什么。`,900,3).forEach((e,t)=>n.fillText(e,58,278+t*42)),n.fillStyle=`#d47a61`,n.fillRect(58,460,94,8),n.fillStyle=`#fffaf0`,n.font=`600 23px "PingFang SC", "Microsoft YaHei", sans-serif`,n.fillText(`${t?.event_count??0} 条近期世界事件`,174,446)}var Qh=Object.freeze({cafe:Object.freeze({frame:Object.freeze({x:1.2,y:2.44,z:-4.7}),screen:Object.freeze({x:1.2,y:2.44,z:-4.65}),yaw:0,posts:!1}),hall:Object.freeze({frame:Object.freeze({x:5.7,y:1.9,z:2.8}),screen:Object.freeze({x:5.65,y:1.9,z:2.8}),yaw:-1.62,posts:!0})}),$h=class{constructor({scene:e,api:t,world:n,showBoard:r=!0}){this.scene=e,this.api=t,this.world=n,this.showBoard=r,this.canvas=document.createElement(`canvas`),this.canvas.width=1024,this.canvas.height=576,this.texture=new Aa(this.canvas),this.texture.colorSpace=Ge,this.texture.anisotropy=4,this.mesh=null,this.brief=null,this.element=null,Zh(this.canvas,null),this.texture.needsUpdate=!0}mount(){let e=Qh[this.world];if(e){if(this.showBoard){let t=new K(new Pa(2.64,1.54,.08),new Qa({color:`#4d3f34`,roughness:.92,flatShading:!0}));if(t.name=`WORLD_BroadcastFrame`,t.position.set(e.frame.x,e.frame.y,e.frame.z),t.rotation.y=e.yaw,t.castShadow=!0,this.scene.add(t),this.frame=t,e.posts){let t=new Qa({color:`#4d3f34`,roughness:.92,flatShading:!0}),n=Math.cos(e.yaw),r=-Math.sin(e.yaw);for(let i of[-1,1]){let a=new K(new Ia(.07,.09,2.6,8),t);a.name=`WORLD_BroadcastPost_${i}`,a.position.set(e.frame.x+n*i*1.15,1.3,e.frame.z+r*i*1.15),a.castShadow=!0,this.scene.add(a)}}this.mesh=new K(new Ba(2.42,1.34),new gi({map:this.texture,toneMapped:!1,side:0})),this.mesh.name=`WORLD_BroadcastScreen`,this.mesh.position.set(e.screen.x,e.screen.y,e.screen.z),this.mesh.rotation.y=e.yaw,this.scene.add(this.mesh)}this.element=document.createElement(`section`),this.element.className=`world-brief-strip`,this.element.setAttribute(`aria-live`,`polite`),this.#e(`今日播报`,`正在读取世界事件`),document.body.append(this.element),this.refresh()}}#e(e,t){if(!this.element)return;this.element.replaceChildren();let n=document.createElement(`small`);n.textContent=e;let r=document.createElement(`strong`);r.textContent=t,this.element.append(n,r)}async refresh(){if(!Qh[this.world])return null;try{return this.brief=await this.api.getWorldBrief(),Zh(this.canvas,this.brief),this.texture.needsUpdate=!0,this.element&&this.#e(`今日播报 · ${this.brief.event_count} 条事件`,this.brief.headline),this.brief}catch(e){return console.warn(`[WorldBroadcast] 晨报读取失败`,e),this.element&&this.element.remove(),this.element=null,null}}dispose(){this.element?.remove(),this.mesh&&(this.scene.remove(this.mesh),this.mesh.geometry.dispose(),this.mesh.material.dispose());let e=this.scene.getObjectByName(`WORLD_BroadcastFrame`);e&&(this.scene.remove(e),e.geometry.dispose(),e.material.dispose());for(let e of[-1,1]){let t=this.scene.getObjectByName(`WORLD_BroadcastPost_${e}`);t&&(this.scene.remove(t),t.geometry.dispose(),t.material.dispose())}this.texture.dispose()}},eg=`echo-world-modules.v1`,tg=new Set([`venue`,`dynamic-field`]),ng=new Set([`available`,`reserved`]),rg=class e{constructor(e){this.modules=Object.freeze(e.map(e=>Object.freeze(e)))}static async load(t=md(`data/world-modules.json`)){let n=await fetch(t);if(!n.ok)throw Error(`世界模块清单加载失败：HTTP ${n.status}`);let r=await n.json();if(r?.schema!==eg||!Array.isArray(r.modules))throw Error(`世界模块清单必须符合 ${eg}`);let i=new Set;for(let e of r.modules){if(!e?.id||i.has(e.id))throw Error(`世界模块 id 无效或重复：${e?.id}`);if(!tg.has(e.kind))throw Error(`未知世界模块 kind：${e.kind}`);if(!ng.has(e.status))throw Error(`未知世界模块 status：${e.status}`);if(!e.mount?.world||!e.entry?.world||!e.interaction?.verb)throw Error(`世界模块 ${e.id} 缺少 mount/entry/interaction 契约`);i.add(e.id)}return new e(r.modules)}availableIn(e){return this.modules.filter(t=>t.mount.world===e&&t.status===`available`)}byId(e){return this.modules.find(t=>t.id===e)??null}},ig=Object.freeze({OUTDOOR:`outdoor`,CAFE:`cafe`}),ag=Object.freeze({outdoor:Object.freeze({id:`evening-forest`,path:`audio/evening-forest-ambience.mp3`,volume:.22}),cafe:Object.freeze({id:`cafe-ambience`,path:`audio/cafe-ambience.mp3`,volume:.17}),click:Object.freeze({id:`soft-button-click`,path:`audio/soft-button-click.mp3`,volume:.22,poolSize:3}),notification:Object.freeze({id:`notification-chime`,path:`audio/notification-chime.mp3`,volume:.28,poolSize:2,minIntervalMs:2200})});function og(e){return e===`cafe`?ig.CAFE:ig.OUTDOOR}function sg(e,t,n){return Array.from({length:t},()=>n(e))}function cg(e){let t=e?.closest?.(`button, [role='button'], a[href]`);return!(!t||t.dataset?.audio===`none`||t.getAttribute?.(`aria-disabled`)===`true`||t.disabled||t.matches?.(`:disabled`))}var lg=class{constructor({camera:e,worldId:t=`hall`,resolveUrl:n=e=>`/${String(e).replace(/^\/+/,``)}`,listener:r=new ys,loader:i=new ss,createAudio:a=e=>new bs(e),eventRoot:o=globalThis.document??null,fadeDuration:s=.65,onStateChange:c=()=>{}}={}){if(!e?.add)throw Error(`WorldAudioSystem requires a Three.js camera`);this.camera=e,this.listener=r,this.loader=i,this.resolveUrl=n,this.eventRoot=o,this.document=o?.nodeType===9?o:o?.ownerDocument??null,this.fadeDuration=Math.max(0,Number(s)||0),this.onStateChange=c,this.zone=og(t),this.freeRoamActive=!1,this.unlocked=!1,this.disposed=!1,this.activeAmbient=null,this.lastEffect=null,this.effectPlayCounts={click:0,notification:0},this.loadedTrackIds=new Set,this.failedTrackIds=new Set,this.fadeTimers=new Map,this.effectCursors=new Map,this.effectPlayedAt=new Map,this.preloadPromise=null,this.unlockPromise=null,this.ambience=new Map([[ig.OUTDOOR,a(r)],[ig.CAFE,a(r)]]),this.effects=new Map([[`click`,sg(r,ag.click.poolSize,a)],[`notification`,sg(r,ag.notification.poolSize,a)]]),e.add(r),this.handleUiClick=e=>{cg(e.target)&&this.playUiClick()},this.handleVisibilityChange=()=>this.syncAmbient(),this.eventRoot?.addEventListener?.(`click`,this.handleUiClick,!0),this.document?.addEventListener?.(`visibilitychange`,this.handleVisibilityChange),this.emitState()}get diagnostics(){return Object.freeze({zone:this.zone,freeRoam:this.freeRoamActive,unlocked:this.unlocked,contextState:this.listener.context?.state??`unknown`,activeAmbient:this.activeAmbient,lastEffect:this.lastEffect,effectPlayCounts:{...this.effectPlayCounts},loadedTracks:[...this.loadedTrackIds],failedTracks:[...this.failedTrackIds]})}preload(){if(this.preloadPromise)return this.preloadPromise;let e=[this.loadTrack(ag.outdoor,[this.ambience.get(ig.OUTDOOR)],!0),this.loadTrack(ag.cafe,[this.ambience.get(ig.CAFE)],!0),this.loadTrack(ag.click,this.effects.get(`click`),!1),this.loadTrack(ag.notification,this.effects.get(`notification`),!1)];return this.preloadPromise=Promise.all(e).then(()=>(this.syncAmbient(),this.emitState(),this.diagnostics)),this.preloadPromise}loadTrack(e,t,n){return new Promise(r=>{this.loader.load(this.resolveUrl(e.path),i=>{for(let r of t)r.setBuffer(i),r.setLoop(n),r.setVolume(n?0:e.volume);this.loadedTrackIds.add(e.id),r(!0)},void 0,t=>{this.failedTrackIds.add(e.id),console.warn(`[EchoWorld] Audio failed to load: ${e.path}`,t),r(!1)})})}async unlock(){if(this.disposed)return!1;if(this.unlocked&&this.listener.context?.state===`running`)return!0;if(this.unlockPromise)return this.unlockPromise;let e=this.listener.context;return this.unlockPromise=Promise.resolve(e?.resume?.()).then(()=>(this.unlocked=!e||e.state===`running`,this.syncAmbient(),this.emitState(),this.unlocked)).catch(e=>(console.warn(`[EchoWorld] Audio context could not be resumed`,e),!1)).finally(()=>{this.unlockPromise=null}),this.unlockPromise}setFreeRoamActive(e){let t=!!e;return this.freeRoamActive!==t&&(this.freeRoamActive=t,this.freeRoamActive&&this.unlock(),this.syncAmbient(),this.emitState(),!0)}setZone(e){return!Object.values(ig).includes(e)||this.zone===e?!1:(this.zone=e,this.syncAmbient(),this.emitState(),!0)}syncAmbient(){if(this.disposed)return;let e=this.document?.visibilityState!==`hidden`,t=ag[this.zone],n=!!(e&&this.freeRoamActive&&this.unlocked&&t&&this.loadedTrackIds.has(t.id));this.activeAmbient=n?this.zone:null;for(let[e,t]of this.ambience){let r=ag[e],i=n&&e===this.zone;this.fadeAudio(t,i?r.volume:0,!i)}this.emitState()}fadeAudio(e,t,n){if(!e)return;if(globalThis.clearTimeout(this.fadeTimers.get(e)),this.fadeTimers.delete(e),t>0&&!e.isPlaying&&e.buffer)try{e.play()}catch(e){console.warn(`[EchoWorld] Ambient playback could not start`,e)}let r=e.gain?.gain,i=this.listener.context?.currentTime??0;if(r?.cancelScheduledValues&&r?.linearRampToValueAtTime?(r.cancelScheduledValues(i),r.setValueAtTime(r.value,i),r.linearRampToValueAtTime(t,i+this.fadeDuration)):e.setVolume(t),!n||!e.isPlaying)return;if(this.fadeDuration===0){e.pause();return}let a=globalThis.setTimeout(()=>{this.fadeTimers.delete(e),e.isPlaying&&e.pause()},this.fadeDuration*1e3+40);this.fadeTimers.set(e,a)}async playUiClick(){return await this.unlock()?(await this.preload(),this.playEffect(`click`)):!1}async playNotification(){return!this.unlocked||this.document?.visibilityState===`hidden`?!1:(await this.preload(),this.playEffect(`notification`))}playEffect(e){let t=ag[e],n=this.effects.get(e);if(!t||!n?.length||!this.loadedTrackIds.has(t.id))return!1;let r=globalThis.performance?.now?.()??Date.now();if(r-(this.effectPlayedAt.get(e)??-1/0)<(t.minIntervalMs??0))return!1;let i=n.findIndex(e=>!e.isPlaying);i<0&&(i=this.effectCursors.get(e)??0);let a=n[i];this.effectCursors.set(e,(i+1)%n.length),a.isPlaying&&a.stop(),a.setVolume(t.volume);try{return a.play(),this.effectPlayedAt.set(e,r),this.lastEffect=e,this.effectPlayCounts[e]+=1,this.emitState(),!0}catch(t){return console.warn(`[EchoWorld] ${e} sound could not start`,t),!1}}emitState(){this.onStateChange(this.diagnostics)}dispose(){if(!this.disposed){this.disposed=!0,this.eventRoot?.removeEventListener?.(`click`,this.handleUiClick,!0),this.document?.removeEventListener?.(`visibilitychange`,this.handleVisibilityChange);for(let e of this.fadeTimers.values())globalThis.clearTimeout(e);this.fadeTimers.clear();for(let e of[...this.ambience.values(),...this.effects.values()].flat())e?.isPlaying&&e.stop(),e?.disconnect?.();this.camera.remove?.(this.listener),this.activeAmbient=null}}},ug=Object.freeze({storybook:Object.freeze({"person-self":`character.photo.host.storybook.v1`,"lin-che":`character.photo.person_01.storybook.v1`,"zhou-ning":`character.photo.person_02.storybook.v1`,"chen-mo":`character.photo.person_03.storybook.v1`,"xu-an":`character.photo.person_04.storybook.v1`,"su-he":`character.photo.person_05.storybook.v1`,"tang-ke":`character.photo.person_06.storybook.v1`}),voxel:Object.freeze({"person-self":`character.photo.host.voxel.v1`,"lin-che":`character.photo.person_01.voxel.v1`,"zhou-ning":`character.photo.person_02.voxel.v1`,"chen-mo":`character.photo.person_03.voxel.v1`,"xu-an":`character.photo.person_04.voxel.v1`,"su-he":`character.photo.person_05.voxel.v1`,"tang-ke":`character.photo.person_06.voxel.v1`})}),dg=Object.freeze([Object.freeze({id:`storybook`,label:`绘本角色`,title:`照片特征驱动的绘本 Low-poly 角色`,assetByPersonId:ug.storybook,fallbackAssetId:`character.photo.host.voxel.v1`,textureFilter:`linear`}),Object.freeze({id:`voxel`,label:`像素角色`,title:`刚性骨骼方块身体与五面像素头像`,assetByPersonId:ug.voxel,fallbackAssetId:`character.photo.host.voxel.v1`,textureFilter:`nearest`})]),fg=Object.freeze(dg.filter(e=>e.id!==`storybook`));function pg(e=window.location){let t=new URLSearchParams(e.search).get(`character`);return fg.find(e=>e.id===t)??fg.find(e=>e.id===`voxel`)}function mg(e,t){return e.assetByPersonId[t]??e.fallbackAssetId}function hg(e,t=window.location){let n=fg.find(t=>t.id===e);if(!n)return!1;let r=new URL(t.href);return r.searchParams.set(`character`,n.id),t.assign(r.href),!0}var gg=Object.freeze([Object.freeze({id:`original`,label:`原始版本`,title:`木屋夜集（保留）`,environmentAssetId:`environment.hub-town.v1`,visualProfile:`hubDusk`,boothTemplateAssetId:`module.market-stall.v2`,cinematic:Object.freeze({position:Object.freeze([6.45,4.55,8]),target:Object.freeze([0,.72,-.35]),orbit:Object.freeze([.45,.12,.34])})}),Object.freeze({id:`v1`,label:`1.0`,title:`市集与广场 1.0`,environmentAssetId:`environment.village-market.v1`,visualProfile:`villageMarket`,boothTemplateAssetId:null,cinematic:Object.freeze({position:Object.freeze([43,32,47]),target:Object.freeze([0,-.4,0]),orbit:Object.freeze([1.1,.3,.9]),far:140})})]);function _g(e=window.location){let t=new URLSearchParams(e.search).get(`scene`);return gg.find(e=>e.id===t)??gg.find(e=>e.id===`original`)}function vg(e,t=window.location){let n=gg.find(t=>t.id===e);if(!n)return!1;let r=new URL(t.href);return r.searchParams.set(`scene`,n.id),r.searchParams.set(`world`,`hall`),t.assign(r.href),!0}var yg=Object.freeze([`walking`,`seated`,`talking`,`in-meeting`,`at-booth`]),bg=1.4,xg=Object.freeze(Y.npcTables.flatMap(e=>e.seats.map((t,n)=>Object.freeze({tableId:e.id,tableLabel:e.label,seatIndex:n,x:t.x,z:t.z,yaw:t.yaw})))),Sg=Object.freeze(Y.roundtable.seats.map((e,t)=>Object.freeze({tableId:Y.roundtable.id,tableLabel:Y.roundtable.label,seatIndex:t,x:e.x,z:e.z,yaw:e.yaw}))),Cg=Object.freeze({"meeting-start":`meeting-started`,"meeting-end":`meeting-ended`,"animation.cue":`animation-cue`,animation_cue:`animation-cue`});function wg(e){let t=Number(e);return Number.isFinite(t)?t:null}function Tg(e){let t=String(e??``).trim().toLowerCase();return yg.includes(t)?t:`walking`}function Eg(e){if(!e||typeof e!=`object`)return null;let t=String(e.type??``).trim();if(!t)return null;let n=e.payload&&typeof e.payload==`object`&&!Array.isArray(e.payload)?e.payload:{},r=typeof e.meeting_id==`string`?e.meeting_id:typeof e.meetingId==`string`?e.meetingId:null,i=typeof e.topic==`string`?e.topic:null,a={type:Cg[t]??t,agentId:typeof e.agent_id==`string`?e.agent_id:typeof e.agentId==`string`?e.agentId:typeof e.actor_id==`string`?e.actor_id:null,toAgentId:typeof e.to_agent_id==`string`?e.to_agent_id:typeof e.toAgentId==`string`?e.toAgentId:typeof e.target_id==`string`?e.target_id:null,text:typeof e.text==`string`?e.text:``,action:typeof e.action==`string`?e.action:typeof n.action==`string`?n.action:typeof n.animation==`string`?n.animation:typeof n.name==`string`?n.name:null,durationMs:wg(e.duration_ms)??wg(e.durationMs)??wg(n.duration_ms)??wg(n.durationMs),participants:Array.isArray(e.participants)?e.participants.filter(e=>typeof e==`string`):[],tick:wg(e.tick)};return r!==null&&(a.meetingId=r),i!==null&&(a.topic=i),a}function Dg(e,t,n,r,i=1/0){let a=null,o=i;for(let i of e){if(t.has(`${i.tableId}:${i.seatIndex}`))continue;let e=Math.hypot(i.x-n,i.z-r);e<=o&&(a=i,o=e)}return a}function Og(e,{knownPeople:t,takenSeats:n}){if(!e||typeof e!=`object`||Array.isArray(e))return null;let r=typeof e.id==`string`&&e.id.trim()!==``?e.id:typeof e.person_id==`string`&&e.person_id.trim()!==``?e.person_id:null;if(!r)return null;let i=Tg(e.state),a=e.position??{},o=wg(a.x),s=wg(a.z),c=o===null||s===null?null:{x:o,z:s,yaw:wg(a.yaw)??0},l=e.avatar?.palette,u=l&&typeof l==`object`&&!Array.isArray(l)?l:t.get(r)?.palette??null,d=null;return c&&(i===`in-meeting`?d=Dg(Sg,n,c.x,c.z):(i===`seated`||i===`talking`)&&(d=Dg(xg,n,c.x,c.z,bg))),d&&n.add(`${d.tableId}:${d.seatIndex}`),{id:r,state:i,position:c,palette:u,seat:d}}function kg(e,{people:t=[],reservedRoundtableSeats:n=[]}={}){let r=new Map((Array.isArray(t)?t:[]).filter(e=>e&&typeof e.id==`string`).map(e=>[e.id,e])),i=new Set;for(let e of n)i.add(`${Y.roundtable.id}:${e}`);let a=[...Array.isArray(e?.agents)?e.agents:[]].sort((e,t)=>{let n=Tg(e?.state)===`in-meeting`?0:1,r=Tg(t?.state)===`in-meeting`?0:1;return n===r?String(e?.id??``).localeCompare(String(t?.id??``)):n-r}).map(e=>Og(e,{knownPeople:r,takenSeats:i})).filter(Boolean),o=(Array.isArray(e?.events)?e.events:[]).map(Eg).filter(Boolean),s=(Array.isArray(e?.modules)?e.modules:[]).filter(e=>e&&typeof e==`object`&&typeof e.id==`string`);return{schema:typeof e?.schema==`string`?e.schema:null,tick:wg(e?.tick)??0,agents:a,events:o,modules:s}}var Ag=t({API_MODE:()=>Lg,SNAPSHOT_FALLBACK:()=>e_,chatWithAgent:()=>g_,confirm:()=>r_,endMeeting:()=>x_,fetchSnapshot:()=>E_,getField:()=>l_,getPackage:()=>a_,getPackages:()=>i_,getPersonSignal:()=>s_,getWorldBrief:()=>m_,getWorldEvents:()=>p_,groupOnboardingConfirm:()=>T_,groupOnboardingDetect:()=>w_,ingest:()=>t_,isLiveMode:()=>Vg,pipelineStream:()=>n_,postMeetingMessage:()=>b_,recordWorldInteraction:()=>h_,regenerateField:()=>u_,saveChatNote:()=>v_,search:()=>C_,setEncounterPrivacy:()=>o_,startMeeting:()=>y_,useLiveMode:()=>Bg}),jg=`/echoworld/api/v0`,Mg=`/echoworld/api/v1`,Ng=`data/mock`,Pg=`echo-snapshot.v1`,Fg=600,Ig=Object.freeze({new:`pipeline.stream.jsonl`,reunion:`pipeline-reunion.stream.jsonl`}),Lg=(()=>{if(typeof window>`u`||!window.location)return`live`;let e=new URLSearchParams(window.location.search).get(`api`);return e===`live`||e===`mock`?e:`auto`})(),Rg=Lg===`live`,zg=null;function Bg(){return Lg===`auto`?(zg||=Ug(`${jg}/world/brief`).then(()=>(Rg=!0,!0)).catch(()=>(Rg=!1,!1)),zg):Promise.resolve(Lg===`live`)}function Vg(){return Lg===`live`||Lg===`auto`&&Rg}function Hg(e){return md(`${Ng}/${e}`)}async function Ug(e){let t=await fetch(e);if(!t.ok)throw Error(`GET ${e} failed: HTTP ${t.status}`);if(!(t.headers.get(`content-type`)??``).toLowerCase().includes(`application/json`))throw Error(`GET ${e} 未返回 JSON，请检查本地 /api 代理是否连接后端`);return t.json()}function Wg(e){let t=Array.isArray(e)?e:e?.packages;if(!Array.isArray(t))throw Error(`IF-5 packages: 响应必须是数组或 { packages: [] }`);return t}async function Gg(e){let t=await fetch(e);if(!t.ok)throw Error(`GET ${e} failed: HTTP ${t.status}`);return(await t.text()).split(/\r?\n/).map(e=>e.trim()).filter(e=>e.length>0).map((t,n)=>{try{return JSON.parse(t)}catch(t){throw Error(`${e} 第 ${n+1} 行不是合法 JSON：${t.message}`)}})}async function Kg(e,t){let n=await fetch(`${jg}${e}`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify(t)});if(!n.ok)throw Error(`POST ${e} failed: HTTP ${n.status}`);return n.json()}async function qg(e,t){let n=await fetch(`${jg}${e}`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify(t)});if(!n.ok){let t=``;try{t=(await n.json())?.detail??``}catch{t=``}let r=Error(t||`POST ${e} failed: HTTP ${n.status}`);throw r.status=n.status,r}return n.json()}async function Jg(e,t){let n=await fetch(`${jg}${e}`,{method:`PATCH`,headers:{"Content-Type":`application/json`},body:JSON.stringify(t)});if(!n.ok)throw Error(`PATCH ${e} failed: HTTP ${n.status}`);return n.json()}async function Yg(e,t){let n=await fetch(`${Mg}${e}`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify(t)});if(!n.ok){let t=``;try{let e=await n.text(),r=JSON.parse(e);t=typeof r?.detail==`string`?r.detail:e}catch{}throw Error(`POST v1 ${e} failed: HTTP ${n.status}${t?`（${t.slice(0,200)}）`:``}`)}return n.json()}function Xg(e){return new Promise(t=>setTimeout(t,e))}function Zg(){return Fg+Math.random()*600}async function Qg(e,t){if(!e.body)throw Error(`当前环境不支持 ReadableStream，无法消费 SSE`);let n=e.body.pipeThrough(new TextDecoderStream).getReader(),r=``;for(;;){let{done:e,value:i}=await n.read();if(e)break;r+=i;let a=r.indexOf(`

`);for(;a!==-1;){let e=r.slice(0,a);r=r.slice(a+2);let n=`message`,i=``;for(let t of e.split(`
`))t.startsWith(`event:`)?n=t.slice(6).trim():t.startsWith(`data:`)&&(i+=t.slice(5).trim());i&&t(n,JSON.parse(i)),a=r.indexOf(`

`)}}}function $g(e){if(!e||typeof e!=`object`)throw Error(`snapshot 必须是对象`);if(e.schema!==Pg)throw Error(`不支持的 snapshot schema：${e.schema}（期望 ${Pg}）`);if(!Array.isArray(e.agents))throw Error(`snapshot.agents 必须是数组`);return Array.isArray(e.modules)||(e.modules=[]),Array.isArray(e.events)||(e.events=[]),e}var e_=Object.freeze({schema:Pg,tick:0,agents:Object.freeze([{id:`lin-che`,position:{x:-4.53,z:-1.55,yaw:1.5708},state:`seated`,avatar:{palette:{hair:`#252a31`,jacket:`#315d83`,MAT_Jacket_Light:`#527ea2`,shirt:`#f0e7cf`,pants:`#313d4a`,shoes:`#d07444`,skin:`#d79a73`}}},{id:`chen-mo`,position:{x:-2.77,z:-1.55,yaw:-1.5708},state:`seated`,avatar:{palette:{hair:`#242829`,jacket:`#667443`,MAT_Jacket_Light:`#89965c`,shirt:`#e4dec8`,pants:`#3d4442`,shoes:`#a45d3c`,skin:`#d79a73`}}},{id:`zhou-ning`,position:{x:-4.53,z:1.55,yaw:1.5708},state:`seated`,avatar:{palette:{hair:`#56352b`,jacket:`#b85f50`,MAT_Jacket_Light:`#d27a68`,shirt:`#f0dfc5`,pants:`#344957`,shoes:`#d0a95d`,skin:`#d79a73`}}},{id:`xu-an`,position:{x:-2.77,z:1.55,yaw:-1.5708},state:`seated`,avatar:{palette:{hair:`#67392e`,jacket:`#c18b39`,MAT_Jacket_Light:`#d4a85d`,shirt:`#f0e5c9`,pants:`#315d59`,shoes:`#715040`,skin:`#d79a73`}}},{id:`su-he`,position:{x:2.89,z:.83,yaw:.4398},state:`seated`,avatar:{palette:{hair:`#29282b`,jacket:`#8b4a62`,MAT_Jacket_Light:`#af6680`,shirt:`#dce8e5`,pants:`#3d4552`,shoes:`#b98945`,skin:`#d79a73`}}},{id:`tang-ke`,position:{x:3.67,z:.83,yaw:-.4398},state:`seated`,avatar:{palette:{hair:`#4a352d`,jacket:`#2f7d7b`,MAT_Jacket_Light:`#52a09b`,shirt:`#efe5ca`,pants:`#383e48`,shoes:`#cc7548`,skin:`#d79a73`}}}]),modules:Object.freeze([{id:`roundtable-six`,type:`roundtable`,position:{x:0,z:0}},{id:`table-window-two`,type:`table`,position:{x:-3.65,z:-1.55}},{id:`table-poster-two`,type:`table`,position:{x:-3.65,z:1.55}},{id:`table-library-four`,type:`table`,position:{x:3.28,z:-1.35}},{id:`table-counter-four`,type:`table`,position:{x:3.28,z:1.65}}]),events:Object.freeze([])});async function t_(e,t={}){if(!Array.isArray(e)||e.length===0)throw Error(`IF-1 ingest: 至少需要一个媒体文件（media 必填）`);if(!t.captured_at||!t.device)throw Error(`IF-1 ingest: meta.captured_at 与 meta.device 必填`);if(await Bg()){let n=new FormData;for(let t of e)n.append(`media`,t);n.append(`captured_at`,t.captured_at),n.append(`device`,t.device),t.note&&n.append(`note`,t.note),t.place_hint&&n.append(`place_hint`,t.place_hint);let r=await fetch(`${jg}/ingest`,{method:`POST`,body:n});if(!r.ok)throw Error(`IF-1 ingest failed: HTTP ${r.status}`);return r.json()}return Ug(Hg(`ingest.response.json`))}async function n_(e,t,n={}){if(await Bg()){let n=await fetch(`${jg}/pipeline`,{method:`POST`,headers:{"Content-Type":`application/json`,Accept:`text/event-stream`},body:JSON.stringify({input_id:e,mode:`stream`})});if(!n.ok)throw Error(`IF-2 pipeline failed: HTTP ${n.status}`);let r=null;if(await Qg(n,(e,n)=>{e===`result`?r=n.encounter_draft??null:e===`progress`&&t?.(n)}),!r)throw Error(`IF-2 pipeline: SSE 流结束但未收到 result 事件`);return r}let r=Ig[n.scenario]??Ig.new,i=await Gg(Hg(r)),a=null;for(let e of i)await Xg(Zg()),e.encounter_draft?a=e.encounter_draft:t?.(e);if(!a)throw Error(`${r} 缺少 encounter_draft 结果行`);return a}async function r_(e,t,n=`self-only`){if(!e||typeof e!=`object`)throw Error(`IF-3 confirm: encounter_draft 必填`);if(!t||typeof t!=`object`)throw Error(`IF-3 confirm: identity 必填`);if(await Bg())return Kg(`/confirm`,{encounter_draft:e,identity:{name:t.name??null,match_person_id:t.match_person_id??null},privacy:n});let r=t.match_person_id??`person_${Date.now().toString(36)}`;return{person_id:r,encounter_id:e.encounters?.[0]?.encounter_id??`enc_01`,package_ref:`people/${r}/profile.json`,avatar_status:`placeholder`}}async function i_(){return await Bg()?Wg(await Ug(`${jg}/packages`)):Wg(await Ug(Hg(`packages.demo.json`)))}async function a_(e){if(await Bg())return Ug(`${jg}/packages/${encodeURIComponent(e)}`);let t=(await i_()).find(t=>t.person_id===e);if(!t)throw Error(`IF-5 getPackage: 资料包不存在（404）：${e}`);return t}async function o_(e,t,n){if(!Vg())throw Error(`mock 资料包不支持修改授权`);return Jg(`/packages/${encodeURIComponent(e)}/encounters/${encodeURIComponent(t)}/privacy`,{privacy:n})}async function s_(e){if(!Vg())return null;let t=`${jg}/people/${encodeURIComponent(e)}/signal`,n=await fetch(t);if(n.status===404)return null;if(!n.ok)throw Error(`GET ${t} failed: HTTP ${n.status}`);return n.json()}function c_(e){let t=e.encounters?.[0]??{},n=(e.encounters??[]).flatMap(e=>e.inferences??[]).map(e=>String(e.value??``).trim()).filter(Boolean),r=e.identity?.name??e.person_id,i=(e.encounters??[]).flatMap(e=>[e.facts?.transcript,...e.facts?.media??[],...e.facts?.photos??[]]).filter(Boolean);return{schema:`echo-field.v1`,status:`ready`,person_id:e.person_id,generated:!0,regenerable:!0,generated_from:i.length?i:[`people/${e.person_id}/relations.md`],model:`relationship-field-mock.v1`,created_at:new Date().toISOString(),relation:{with:r,summary:n[0]??`一段仍在生长的关系`,shared_threads:n.slice(0,3),first_impressions:[]},scene:{title:`你与${r} · 回声场域`,summary:`这里呈现的不是 ${r} 的肖像，而是你们共同经历留下的空间感。`,metaphor:`一座把零散记忆编成路径的风丘`,parameters:{sky:`#8fc9c3`,horizon:`#d5e5d4`,ground:`#8fa66d`,accent:e.avatar?.palette?.jacket??`#d9a85f`,fog:`#dce8dc`,openness:.64,warmth:.68,motion:.45,weather:`微风穿过草坡`},spawn:{x:0,z:6.2,yaw:Math.PI},companion:{person_id:e.person_id,x:0,z:-1.1,yaw:0},entities:[{id:`threshold`,type:`threshold`,label:`关系入口`,detail:`一座把零散记忆编成路径的风丘`,position:{x:0,z:3.8},interaction:{label:`听听这个场域为何出现`,event_type:`field-entered`}},{id:`first-encounter`,type:`memory`,label:`第一次相遇`,detail:t.place??t.time??`第一次留下记录的地方`,position:{x:-2.5,z:.4},interaction:{label:`调取这段共同记忆`,event_type:`memory-recalled`}},{id:`shared-thread`,type:`thread`,label:`共同课题`,detail:n[1]??n[0]??`仍在形成的共同课题`,position:{x:2.4,z:-1.6},interaction:{label:`继续这条共同线索`,event_type:`thread-opened`}},{id:`echo-well`,type:`echo`,label:`回声井`,detail:n[0]??`一段仍在生长的关系`,position:{x:-1.1,z:-3.6},interaction:{label:`留下此刻的回声`,event_type:`echo-left`}}]}}}async function l_(e){return await Bg()?Ug(`${jg}/fields/${encodeURIComponent(e)}`):c_(await a_(e))}async function u_(e){return await Bg()?Kg(`/fields/${encodeURIComponent(e)}/regenerate`,{}):l_(e)}var d_=`echoworld.world-events.v1`;function f_(){try{let e=JSON.parse(localStorage.getItem(d_)??`[]`);return Array.isArray(e)?e:[]}catch{return[]}}async function p_(e=20){return await Bg()?Ug(`${jg}/world/events?limit=${Math.max(1,Math.min(100,e))}`):{events:f_().slice(0,e)}}async function m_(){if(await Bg())return Ug(`${jg}/world/brief`);let e=f_().slice(0,6);return{schema:`echo-world-brief.v1`,date:new Date().toISOString().slice(0,10),headline:e[0]?.summary??`集市今天安静开门`,summary:e.length?e.slice(0,3).map(e=>e.summary).join(`；`):`还没有新事件。走近一个摊位，或邀请一位朋友到圆桌坐下。`,event_count:e.length,events:e}}async function h_(e){if(await Bg())return Kg(`/world/interactions`,e);let t=f_(),n={schema:`echo-world-event.v1`,event_id:`mock_${Date.now().toString(36)}`,type:e.type,summary:e.summary,person_ids:e.person_ids??[],source:e.source??`scene-interaction`,created_at:new Date().toISOString(),payload:e.payload??{}};return t.unshift(n),localStorage.setItem(d_,JSON.stringify(t.slice(0,100))),n}async function g_(e,t,n=[]){return await Bg()?Kg(`/agents/${encodeURIComponent(e)}/chat`,{message:t,history:n}):(await Xg(Zg()),__(await a_(e),t,n))}function __(e,t,n){let r=e.identity?.name??`TA`,i=e.encounters??[],a=i.flatMap(e=>(e.inferences??[]).filter(e=>e?.value).map(t=>({...t,encounter_id:e.encounter_id}))),o=a.flatMap(e=>String(e.value).split(/[、，,\s/；;]+/)).map(e=>e.trim()).filter(e=>e&&e.length<=12),s=i.map(e=>e.place).filter(Boolean),c=String(t??``),l=o.find(e=>c.includes(e)),u,d=[];if(l){let e=a.find(e=>String(e.value).includes(l));d=[].concat(e?.source_facts??e?.source??[]).filter(Boolean).slice(0,1),u=`${l}这个我记得一些——档案里留着的片段是：「${String(e?.value??l).slice(0,60)}」。更多的你得问 ${r} 本人，我只是守着授权资料的分身（演示模式）。`}else u=o.length?`我是 ${r} 的数字分身（演示模式，未接真实模型）。我能聊的只有授权资料里这些线索：${o.slice(0,3).join(`、`)}。想从哪一条开始？`:`我是 ${r} 的数字分身（演示模式）。资料还很少，你可以多告诉我一些，等正式接入后我会记住的。`;let f=[];for(let e of o.slice(0,2))f.push(`最近还在忙${e}的事吗？`);return s[0]&&f.push(`还记得${String(s[0]).split(`·`).pop().trim()}那次吗？`),f.length||f.push(`我们是怎么认识的来着？`,`跟我讲讲你最近在忙什么。`),{person_id:e.person_id,reply:u,cited_facts:d,suggestions:f.slice(0,3),generated_by:`mock`}}async function v_(e,t){if(await Bg())return Kg(`/agents/${encodeURIComponent(e)}/chat/save-note`,{text:t,source:`player-chat`});await Xg(240);let n={id:`mock${Date.now().toString(36)}`,type:`player-note`,author:`来自玩家转述`,value:String(t??``).trim(),confidence:1,source:{type:`player-chat`},created_at:new Date().toISOString()};return{inference_ref:`inferences/${e}/player-note-${n.id}.json`,note:n}}async function y_(e,t=null){return await Bg()?qg(`/agents/meeting`,{participant_ids:e,topic:t??null}):(await Xg(Zg()),{meeting_id:`mock_meeting_${Date.now().toString(36)}`,participants:e,topic:t??null,duration_ticks:0,state:`running`})}async function b_(e){return await Bg()?qg(`/agents/meeting/current/message`,{text:e}):(await Xg(120),{meeting_id:`mock_meeting`,accepted:!0})}async function x_(){return await Bg()?qg(`/agents/meeting/current/end`,{}):(await Xg(120),{meeting_id:`mock_meeting`,ended:!0})}function S_(e){let t=[e.identity?.name,e.identity?.role,e.identity?.city];for(let n of e.relations??[])t.push(n.note);for(let n of e.encounters??[]){t.push(n.place);for(let e of n.inferences??[])t.push(e.value)}return t.filter(Boolean).join(`
`)}async function C_(e){if(!e||typeof e!=`object`)throw Error(`IF-5 search: request 必填`);if(await Bg())return Kg(`/search`,e);let{results:t}=await Ug(Hg(`search.demo.json`));if(e.by===`name`){let n=String(e.query??``).trim();return n?{results:t.filter(e=>e.name.includes(n))}:{results:[]}}if(e.by===`keyword`){let n=String(e.query??``).trim().split(/\s+/).filter(Boolean);if(n.length===0)return{results:[]};let r=await Ug(Hg(`packages.demo.json`)),i=new Set(r.filter(e=>{let t=S_(e);return n.every(e=>t.includes(e))}).map(e=>e.person_id));return{results:t.filter(e=>i.has(e.person_id))}}if(e.by===`face`)return{results:t};throw Error(`IF-5 search: 不支持的检索方式 by="${e.by}"（face/name/keyword 互斥）`)}async function w_(e,{expectedCount:t=0}={}){if(!e)throw Error(`合照入场 detect: photo 必填`);if(await Bg()){let n=new FormData;n.append(`photo`,e),n.append(`expected_count`,String(t));let r=await fetch(`${Mg}/group-onboarding/detect`,{method:`POST`,body:n});if(!r.ok){let e=``;try{let t=JSON.parse(await r.text());typeof t?.detail==`string`&&(e=t.detail)}catch{}throw Error(`合照认脸失败: HTTP ${r.status}${e?`（${e.slice(0,200)}）`:``}`)}return r.json()}return Ug(Hg(`group-onboarding.detect.demo.json`))}async function T_(e,t){if(!e)throw Error(`合照入场 confirm: group_id 必填`);if(!Array.isArray(t)||t.length===0)throw Error(`合照入场 confirm: assignments 至少包含一位人物`);if(await Bg())return Yg(`/group-onboarding/confirm`,{group_id:e,assignments:t});let n=await Ug(Hg(`group-onboarding.register.demo.json`)),r=t.map((e,t)=>{let r=n.participants[t]??n.participants[0];return{...r,person_id:`group-demo-${e.face_id??`person-${t+1}`}`,name:e.name,face_ref:e.face_ref??r.face_ref,booth_id:`booth_group-demo-${e.face_id??`person-${t+1}`}`}});return{...n,group_id:e,participants:r}}async function E_(){if(await Bg())return $g(await Ug(`${jg}/world/snapshot`));try{return $g(await Ug(Hg(`snapshot.demo.json`)))}catch(e){return console.warn(`[MockApi] snapshot.demo.json 加载失败，使用内置 fallback 快照：`,e),e_}}var D_=.05;function O_(e,t,n,r,i,{margin:a=D_,moverRadius:o=0,moverMinY:s=-1/0,moverMaxY:c=1/0,ignore:l=null}={}){let u=n,d=r,f={minY:s,maxY:c};for(let p of i??[]){if(l&&(l.has?.(p)||l===p))continue;let i=Np(p);if(!i||i.radius<=0)continue;let m=Fp({...f,radius:o,segmentMinY:s+o,segmentMaxY:c-o,capsule:Number.isFinite(s)&&Number.isFinite(c)},i,a);if(m<=0||Math.hypot(e+u-i.x,t+d-i.z)>=m)continue;let h=e-i.x,g=t-i.z,_=Math.hypot(h,g);if(_<1e-4){let e=Math.hypot(u,d);h=e>1e-8?-u/e:1,g=e>1e-8?-d/e:0}else h/=_,g/=_;let v=Math.hypot(u,d);if(v<1e-8)break;if(_<m-a){u=h*v,d=g*v;continue}let y=-g,b=h,x=u*y+d*b;if(Math.abs(x)<1e-4){let a=(i.x-e)*r-(i.z-t)*n,o=Math.abs(a)<1e-5?1:Math.sign(a);u=y*v*o,d=b*v*o}else u=y*x,d=b*x}return[u,d]}function k_(e,t,n,r,i={}){let a=Mp(e);return a?O_(a.x,a.z,t,n,r,{...i,moverRadius:a.radius,moverMinY:a.minY,moverMaxY:a.maxY}):[0,0]}var A_=new U(0,1,0);function j_(e,t){return Math.atan2(e.z*t.x-e.x*t.z,e.x*t.x+e.z*t.z)}function M_(e,t,n=new U){let r=Number(e?.x)||0,i=Number(e?.y)||0,a=Math.hypot(r,i),o=a>1?r/a:r,s=a>1?i/a:i,c=-Math.sin(t),l=-Math.cos(t);return n.set(c*s+l*o,0,l*s-c*o)}var N_=class{constructor({speed:e=2.7,runSpeed:t=e*1.45,turnStiffness:n=34,turnDamping:r=11}={}){this.speed=e,this.runSpeed=t,this.turnStiffness=n,this.turnDamping=r,this.orientation=new U(0,0,-1),this.targetOrientation=this.orientation.clone(),this.angularVelocity=0}reset(e=new U(0,0,-1)){this.orientation.copy(e).setY(0),this.orientation.lengthSq()<1e-6&&this.orientation.set(0,0,-1),this.orientation.normalize(),this.targetOrientation.copy(this.orientation),this.angularVelocity=0}update(e,t,n,{run:r=!1}={}){let i=new H(Number(t?.x)||0,Number(t?.y)||0);i.lengthSq()>1&&i.normalize();let a=i.lengthSq()>.0025;a&&M_(i,n,this.targetOrientation).normalize();let o=Math.min(Math.max(Number(e)||0,0),.05),s=j_(this.orientation,this.targetOrientation);return this.angularVelocity+=s*this.turnStiffness*o,this.angularVelocity*=Math.exp(-this.turnDamping*o),this.orientation.applyAxisAngle(A_,this.angularVelocity*o),this.orientation.normalize(),{moving:a,direction:this.orientation.clone(),targetDirection:this.targetOrientation.clone(),speed:r?this.runSpeed:this.speed,input:i}}},P_=class{constructor(e=null){this.canvas=e,this.keys=new Set,this.justDown=new Set,this.mouseDX=0,this.mouseDY=0,this.pointerLocked=!1,this.pointerLockEnabled=!0,this._isTypingTarget=e=>{if(!e)return!1;let t=e.tagName;return t===`INPUT`||t===`TEXTAREA`||t===`SELECT`||e.isContentEditable},this._onKeyDown=e=>{this._isTypingTarget(e.target)||(this.keys.has(e.code)||this.justDown.add(e.code),this.keys.add(e.code))},this._onKeyUp=e=>{this.keys.delete(e.code)},this._onPointerLockChange=()=>{this.pointerLocked=globalThis.document?.pointerLockElement===this.canvas,this.pointerLocked||(this.mouseDX=this.mouseDY=0)},this._onMouseMove=e=>{!this.pointerLocked||!this.pointerLockEnabled||(this.mouseDX+=Number(e.movementX)||0,this.mouseDY+=Number(e.movementY)||0)},this._onCanvasClick=()=>{if(!(!this.pointerLockEnabled||this.pointerLocked||!this.canvas))try{(this.canvas.requestPointerLock?.())?.catch?.(()=>{})}catch{}},this._onBlur=()=>this.reset(),globalThis.window?.addEventListener(`keydown`,this._onKeyDown),globalThis.window?.addEventListener(`keyup`,this._onKeyUp),globalThis.window?.addEventListener(`blur`,this._onBlur),globalThis.document?.addEventListener(`pointerlockchange`,this._onPointerLockChange),globalThis.document?.addEventListener(`mousemove`,this._onMouseMove),this.canvas?.addEventListener(`click`,this._onCanvasClick)}setPointerLockEnabled(e){this.pointerLockEnabled=!!e,this.pointerLockEnabled||(this.mouseDX=this.mouseDY=0,this.pointerLocked&&globalThis.document?.exitPointerLock?.())}isDown(e){return this.keys.has(e)}justPressed(e){return this.justDown.has(e)}consumeMouseDelta(){let e={dx:this.mouseDX,dy:this.mouseDY};return this.mouseDX=this.mouseDY=0,e}endFrame(){this.justDown.clear()}reset(){this.keys.clear(),this.justDown.clear(),this.mouseDX=this.mouseDY=0}destroy(){globalThis.window?.removeEventListener(`keydown`,this._onKeyDown),globalThis.window?.removeEventListener(`keyup`,this._onKeyUp),globalThis.window?.removeEventListener(`blur`,this._onBlur),globalThis.document?.removeEventListener(`pointerlockchange`,this._onPointerLockChange),globalThis.document?.removeEventListener(`mousemove`,this._onMouseMove),this.canvas?.removeEventListener(`click`,this._onCanvasClick),this.setPointerLockEnabled(!1),this.reset()}};new U(0,1,0);var F_=(e,t,n)=>Math.max(t,Math.min(n,e));function I_(e,t){let n=F_(Number(t)||0,0,.1);return 1-Math.exp(-Math.max(0,e)*60*n)}function L_(e){return e?.isVector3?e.clone():Array.isArray(e)?new U(...e):e&&Number.isFinite(e.x)&&Number.isFinite(e.y)&&Number.isFinite(e.z)?new U(e.x,e.y,e.z):null}function R_(e,t,n,r){let i=t.x-e.x,a=t.z-e.z,o=i*i+a*a;if(o<1e-8)return null;let s=Math.max(0,Number(n.r??n.radius)||0)+r;if(s<=0)return null;let c=e.x-n.x,l=e.z-n.z;if(c*c+l*l<=s*s)return c*i+l*a<=0?0:null;let u=2*(c*i+l*a),d=c*c+l*l-s*s,f=u*u-4*o*d;if(f<0)return null;let p=Math.sqrt(f),m=(-u-p)/(2*o),h=(-u+p)/(2*o);return m>=0&&m<=1?m:h>=0&&h<=1?h:null}function z_(e,t,n){if(!n)return null;let r=t.x-e.x,i=t.z-e.z,a=[];if(r>0&&t.x>n.maxX?a.push({side:`maxX`,t:(n.maxX-e.x)/r}):r<0&&t.x<n.minX&&a.push({side:`minX`,t:(n.minX-e.x)/r}),i>0&&t.z>n.maxZ?a.push({side:`maxZ`,t:(n.maxZ-e.z)/i}):i<0&&t.z<n.minZ&&a.push({side:`minZ`,t:(n.minZ-e.z)/i}),a.length===0)return null;a.sort((e,t)=>e.t-t.t);let o=a[0].t;return a.filter(e=>Math.abs(e.t-o)<1e-6).some(t=>{let a=e.x+r*t.t,o=e.z+i*t.t,s=t.side.endsWith(`X`)?o:a;return!(n.openings??[]).some(e=>e?.side===t.side&&s>=e.min&&s<=e.max)})?F_(o,0,1):null}var B_=class{constructor({canvas:e=null,fov:t=48,aspect:n=(globalThis.innerWidth||1)/(globalThis.innerHeight||1),near:r=.06,far:i=80,distance:a=4.8,minDistance:o=2.5,maxDistance:s=12,yaw:c=0,pitch:l=.42,mouseSensitivity:u=.0025,lookOffset:d=new U(0,1.28,0),positionLerp:f=.12,lookLerp:p=.16}={}){this.camera=new qo(t,n,r,i),this.distance=a,this.minDistance=o,this.maxDistance=s,this.yaw=c,this.pitch=l,this.mouseSensitivity=u,this.positionLerp=f,this.lookLerp=p,this.fovLerp=f,this.enabled=!0,this.lookOffset=d.clone?d.clone():new U(...d),this._target=new U,this._smoothedLook=new U,this._hasTarget=!1,this._collisionResolver=null,this._collisionPadding=.32,this._boundaryPadding=.08,this._defaultFov=t,this._targetFov=t,this._lockedState=null,this._inputCanvas=e,this._onWheel=e=>{this.enabled&&(this.distance=F_(this.distance+(Number(e.deltaY)||0)*.01,this.minDistance,this.maxDistance))},this._inputCanvas?.addEventListener(`wheel`,this._onWheel,{passive:!0})}applyMouseDelta(e,t,n=this.mouseSensitivity){this.enabled&&(this.yaw-=(Number(e)||0)*n,this.pitch=F_(this.pitch+(Number(t)||0)*n,-Math.PI/3,Math.PI/3))}setEnabled(e){this.enabled=!!e}getHorizontalAngle(){return this.yaw}getForward(e=new U){return e.set(-Math.sin(this.yaw),0,-Math.cos(this.yaw))}setYawFromHeading(e){!e||Math.hypot(e.x,e.z)<1e-6||(this.yaw=Math.atan2(-e.x,-e.z))}setCollisionResolver(e){this._collisionResolver=typeof e==`function`?e:null}update(e,t=1/60,n={}){let r=typeof t==`number`?n??{}:t??{},i=typeof t==`number`?t:r.delta??1/60,{groundHeightAt:a=null,blockers:o=[],bounds:s=null}=r,c=I_(this.positionLerp,i),l=I_(this.lookLerp,i),u=I_(this.fovLerp,i);if(this._lockedState){let e=this._resolveDesiredPosition(this._lockedState.lookAt,this._lockedState.position,{blockers:o,bounds:s});this._clampToGround(e,a),this.camera.position.lerp(e,c),this.camera.position.y<.5&&(this.camera.position.y=.5),this._hasTarget?this._smoothedLook.lerp(this._lockedState.lookAt,l):(this._smoothedLook.copy(this._lockedState.lookAt),this._hasTarget=!0),this._updateFov(u),this.camera.lookAt(this._smoothedLook);return}if(this._updateFov(u),!e)return;this._target.copy(e).add(this.lookOffset),this._hasTarget?this._smoothedLook.lerp(this._target,l):(this._smoothedLook.copy(this._target),this._hasTarget=!0);let d=this._target.clone().add(this._computeOffset()),f=this._resolveDesiredPosition(this._target,d,{blockers:o,bounds:s});this._clampToGround(f,a),this.camera.position.lerp(f,c),this.camera.position.y<.5&&(this.camera.position.y=.5),this.camera.lookAt(this._smoothedLook)}snapTo(e,{yaw:t=this.yaw,pitch:n=this.pitch,distance:r=this.distance,groundHeightAt:i=null,blockers:a=[],bounds:o=null}={}){if(!e)return;Number.isFinite(t)&&(this.yaw=t),Number.isFinite(n)&&(this.pitch=F_(n,-Math.PI/3,Math.PI/3)),Number.isFinite(r)&&(this.distance=F_(r,this.minDistance,this.maxDistance)),this._target.copy(e).add(this.lookOffset),this._smoothedLook.copy(this._target);let s=this._target.clone().add(this._computeOffset()),c=this._resolveDesiredPosition(this._target,s,{blockers:a,bounds:o});this._clampToGround(c,i),this.camera.position.copy(c),this.camera.position.y<.5&&(this.camera.position.y=.5),this.camera.lookAt(this._smoothedLook),this._hasTarget=!0}lockTo(e,t,n=40){let r=L_(e),i=L_(t);return!r||!i?!1:(this._lockedState={position:r,lookAt:i},this._targetFov=Number.isFinite(n)?n:40,!0)}unlock(e=this._defaultFov){this._lockedState=null,this._targetFov=Number.isFinite(e)?e:this._defaultFov}resize(e){!Number.isFinite(e)||e<=0||(this.camera.aspect=e,this.camera.updateProjectionMatrix())}dispose(){this._inputCanvas?.removeEventListener(`wheel`,this._onWheel),this._inputCanvas=null,this._lockedState=null,this._collisionResolver=null}_computeOffset(){return new U(Math.sin(this.yaw)*this.distance,Math.tan(this.pitch)*this.distance,Math.cos(this.yaw)*this.distance)}_resolveDesiredPosition(e,t,n){return this._collisionResolver?L_(this._collisionResolver(e.clone(),t.clone(),this))??t.clone():this._resolveCollision(e,t,n)}_clampToGround(e,t){if(t){let n=t(e.x,e.z);Number.isFinite(n)&&(e.y=Math.max(e.y,n+.5))}(!Number.isFinite(e.y)||e.y<.5)&&(e.y=.5)}_updateFov(e){let t=this._targetFov-this.camera.fov;Math.abs(t)<=.001||(this.camera.fov+=t*e,Math.abs(this._targetFov-this.camera.fov)<=.01&&(this.camera.fov=this._targetFov),this.camera.updateProjectionMatrix())}_resolveCollision(e,t,{blockers:n=[],bounds:r=null}={}){let i=t.clone(),a=t.x-e.x,o=t.z-e.z,s=Math.hypot(a,o);if(s>1e-6){let c=s;for(let r of n??[]){let n=R_(e,t,r,this._collisionPadding);n!==null&&(c=Math.min(c,Math.max(0,s*n-this._collisionPadding)))}let l=z_(e,t,r);l!==null&&(c=Math.min(c,Math.max(0,s*l-this._boundaryPadding))),c<s&&(i.x=e.x+a/s*c,i.z=e.z+o/s*c)}return i}},V_=Object.freeze([Object.freeze({id:`hall`,label:`集市`,title:`Echo 集市大厅`}),Object.freeze({id:`cafe`,label:`咖啡厅`,title:`Echo Cafe`}),Object.freeze({id:`field`,label:`关系场域`,title:`关系回声场域`})]),H_=Object.freeze({bounds:Object.freeze({minX:-14.2,maxX:14.2,minZ:-15.4,maxZ:15.4}),playerSpawn:Object.freeze({x:0,z:-12.8,yaw:0}),snapshotPollMs:1e4,snapshotUrl:`/echoworld/api/v0/world/snapshot?world=hall`}),U_=Object.freeze({snapshotPollMs:2e3,snapshotUrl:`/echoworld/api/v0/world/snapshot`}),W_=Object.freeze({environmentAssetId:`environment.relationship-field.v1`,bounds:Object.freeze({minX:-7.6,maxX:7.6,minZ:-7.6,maxZ:7.6}),playerSpawn:Object.freeze({x:0,z:6.2,yaw:Math.PI})});function G_(e=window.location){let t=new URLSearchParams(e.search).get(`world`);return V_.find(e=>e.id===t)??V_.find(e=>e.id===`hall`)}function K_(e,t=window.location){let n=V_.find(t=>t.id===e);if(!n)return!1;let r=new URL(t.href);return r.searchParams.set(`world`,n.id),r.searchParams.delete(`scene`),n.id!==`field`&&r.searchParams.delete(`person`),n.id!==`cafe`&&r.searchParams.delete(`invite`),t.assign(r.href),!0}function q_(e=window.location){let t=new URLSearchParams(e.search).get(`person`);return typeof t==`string`&&t.trim()?t.trim():null}function J_(e,t=window.location){if(typeof e!=`string`||!e.trim())return!1;let n=new URL(t.href);return n.searchParams.set(`world`,`field`),n.searchParams.set(`person`,e.trim()),n.searchParams.delete(`invite`),t.assign(n.href),!0}var Y_=Object.freeze({current:Object.freeze({background:`#92b6bc`,fog:Object.freeze({color:`#92b6bc`,near:18,far:36}),toneMapping:4,exposure:1.02,shadowType:1,materialMode:`gltf`,hemisphere:Object.freeze({sky:`#d9eef0`,ground:`#725a45`,intensity:1.65}),sun:Object.freeze({color:`#ffe5b0`,intensity:3.1,position:[-5.5,9.5,6.5]}),points:Object.freeze([Object.freeze({position:[0,2.75,0],intensity:8.5}),Object.freeze({position:[-3.4,2.75,0],intensity:5.2}),Object.freeze({position:[3.3,2.75,0],intensity:5.2})])}),referenceLowpoly:Object.freeze({background:`#a9c7c0`,fog:Object.freeze({color:`#a9c7c0`,near:20,far:40}),toneMapping:7,exposure:1.08,shadowType:1,materialMode:`flat`,hemisphere:Object.freeze({sky:`#d8ece5`,ground:`#59623e`,intensity:1.1}),sun:Object.freeze({color:`#ffd58a`,intensity:3.65,position:[-7.5,10.5,6.8]}),points:Object.freeze([])}),painterlyAdventure:Object.freeze({background:`#8fbfc0`,fog:Object.freeze({color:`#8fbfc0`,near:19,far:38}),toneMapping:7,exposure:1.08,shadowType:1,materialMode:`toon`,environmentMaterialMode:`gltf`,hemisphere:Object.freeze({sky:`#d8edf0`,ground:`#596147`,intensity:1.22}),sun:Object.freeze({color:`#ffd095`,intensity:3.55,position:[-6.2,10.8,7.8]}),points:Object.freeze([Object.freeze({position:[3.8,2.4,-2.4],color:`#8fc7d5`,intensity:1.2,distance:9})])}),hubDusk:Object.freeze({background:`#2e3a5c`,fog:Object.freeze({color:`#3a4666`,near:16,far:46}),toneMapping:4,exposure:1.05,shadowType:1,materialMode:`gltf`,hemisphere:Object.freeze({sky:`#5a6c9e`,ground:`#3e3226`,intensity:1.05}),sun:Object.freeze({color:`#ffb98a`,intensity:1.5,position:[-9,11,7]}),shadowBounds:Object.freeze({left:-17,right:17,top:18,bottom:-18,far:46}),points:Object.freeze([Object.freeze({position:[0,1.5,2.5],color:`#ff9a4e`,intensity:22,distance:10}),Object.freeze({position:[0,3,-8.6],color:`#ffc46a`,intensity:12,distance:13}),Object.freeze({position:[-4.4,2.2,.6],color:`#ffc46a`,intensity:9,distance:9}),Object.freeze({position:[0,2.8,-14.2],color:`#ffc46a`,intensity:9,distance:10}),Object.freeze({position:[3,1.6,10.2],color:`#9ec2e8`,intensity:6,distance:12})])}),blockout:Object.freeze({background:`#d9e2d7`,fog:Object.freeze({color:`#d9e2d7`,near:24,far:48}),toneMapping:7,exposure:1.02,shadowType:2,materialMode:`flat`,hemisphere:Object.freeze({sky:`#eef5ef`,ground:`#66705d`,intensity:1.25}),sun:Object.freeze({color:`#ffe0a3`,intensity:3.2,position:[-8,13,7]}),shadowBounds:Object.freeze({left:-8,right:8,top:12,bottom:-14,far:40}),points:Object.freeze([])}),villageMarket:Object.freeze({background:`#b8c8bc`,fog:Object.freeze({color:`#b8c8bc`,near:42,far:92}),toneMapping:4,exposure:1.08,shadowType:2,materialMode:`gltf`,environmentMaterialMode:`gltf`,hemisphere:Object.freeze({sky:`#e6efe4`,ground:`#66704d`,intensity:1.28}),sun:Object.freeze({color:`#ffd28f`,intensity:3.5,position:[-28,42,24]}),shadowBounds:Object.freeze({left:-34,right:34,top:34,bottom:-34,far:110}),points:Object.freeze([])})}),X_=null;function Z_(){return X_||(X_=new Vi(new Uint8Array([72,134,196,255]),4,1,j),X_.minFilter=o,X_.magFilter=o,X_.generateMipmaps=!1,X_.needsUpdate=!0,X_)}function Q_(e){return Y_[e]??Y_.current}function $_(e,t,n){let r=Q_(n);e.background=new G(r.background),e.fog=new Gn(r.fog.color,r.fog.near,r.fog.far),t.toneMapping=r.toneMapping,t.toneMappingExposure=r.exposure,t.shadowMap.type=r.shadowType;let i=new Fo(r.hemisphere.sky,r.hemisphere.ground,r.hemisphere.intensity);i.name=`LIGHT_Hemisphere`,e.add(i);let a=new es(r.sun.color,r.sun.intensity);a.name=`LIGHT_Sun`,a.position.fromArray(r.sun.position),a.castShadow=!0,a.shadow.mapSize.set(1024,1024),a.shadow.camera.near=.5;let o=r.shadowBounds??{left:-8,right:8,top:7,bottom:-7,far:28};a.shadow.camera.far=o.far,a.shadow.camera.left=o.left,a.shadow.camera.right=o.right,a.shadow.camera.top=o.top,a.shadow.camera.bottom=o.bottom,a.shadow.bias=-16e-5,a.shadow.normalBias=.025,a.target.position.set(0,0,-.6),e.add(a,a.target);for(let[t,n]of r.points.entries()){let r=new Zo(n.color??`#ffd391`,n.intensity,n.distance??7.2,2);r.name=`LIGHT_Accent_${t+1}`,r.position.fromArray(n.position),e.add(r)}return r}function ev(e,t,n=`character`){let r=Q_(t),i=n===`environment`?r.environmentMaterialMode??r.materialMode:r.materialMode;if(i===`gltf`||/outline|glass|window|water|emission/i.test(e.name))return e;if(i===`toon`){let t=new eo({name:e.name,color:e.color?.clone()??new G(`#ffffff`),map:e.map??null,alphaMap:e.alphaMap??null,transparent:e.transparent,opacity:e.opacity,side:e.side,vertexColors:e.vertexColors,gradientMap:Z_()});return t.userData.sourceMaterial=e.name,t}return e.roughness=.94,e.metalness=0,e.envMapIntensity=.12,e.flatShading=!0,e.needsUpdate=!0,e}function tv(e,t){let n=new Map,r=e=>e&&(n.has(e)||n.set(e,ev(e,t,`environment`)),n.get(e));e.traverse(e=>{e.isMesh&&(e.material=Array.isArray(e.material)?e.material.map(r):r(e.material))})}var nv={xmlns:`http://www.w3.org/2000/svg`,width:24,height:24,viewBox:`0 0 24 24`,fill:`none`,stroke:`currentColor`,"stroke-width":2,"stroke-linecap":`round`,"stroke-linejoin":`round`},rv=([e,t,n])=>{let r=document.createElementNS(`http://www.w3.org/2000/svg`,e);return Object.keys(t).forEach(e=>{r.setAttribute(e,String(t[e]))}),n?.length&&n.forEach(e=>{let t=rv(e);r.appendChild(t)}),r},iv=(e,t={})=>rv([`svg`,{...nv,...t},e]),av=e=>{for(let t in e)if(t.startsWith(`aria-`)||t===`role`||t===`title`)return!0;return!1},ov=(...e)=>e.filter((e,t,n)=>!!e&&e.trim()!==``&&n.indexOf(e)===t).join(` `).trim(),sv=e=>e.replace(/^([A-Z])|[\s-_]+(\w)/g,(e,t,n)=>n?n.toUpperCase():t.toLowerCase()),cv=e=>{let t=sv(e);return t.charAt(0).toUpperCase()+t.slice(1)},lv=e=>Array.from(e.attributes).reduce((e,t)=>(e[t.name]=t.value,e),{}),uv=e=>typeof e==`string`?e:!e||!e.class?``:e.class&&typeof e.class==`string`?e.class.split(` `):e.class&&Array.isArray(e.class)?e.class:``,dv=(e,{nameAttr:t,icons:n,attrs:r})=>{let i=e.getAttribute(t);if(i==null)return;let a=n[cv(i)];if(!a)return console.warn(`${e.outerHTML} icon name was not found in the provided icons object.`);let o=lv(e),s=av(o)?{}:{"aria-hidden":`true`},c={...nv,"data-lucide":i,...s,...r,...o},l=uv(o),u=uv(r),d=ov(`lucide`,`lucide-${i}`,...l,...u);d&&Object.assign(c,{class:d});let f=iv(a,c);return e.parentNode?.replaceChild(f,e)},fv=[[`path`,{d:`M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2`}]],pv=[[`path`,{d:`M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3`}],[`path`,{d:`M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v1.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V11a2 2 0 0 0-4 0z`}],[`path`,{d:`M5 18v2`}],[`path`,{d:`M19 18v2`}]],mv=[[`path`,{d:`m12 19-7-7 7-7`}],[`path`,{d:`M19 12H5`}]],hv=[[`path`,{d:`M5 12h14`}],[`path`,{d:`m12 5 7 7-7 7`}]],gv=[[`path`,{d:`M2 10v3`}],[`path`,{d:`M6 6v11`}],[`path`,{d:`M10 3v18`}],[`path`,{d:`M14 8v7`}],[`path`,{d:`M18 5v13`}],[`path`,{d:`M22 10v3`}]],_v=[[`path`,{d:`M12 5v16`}],[`path`,{d:`M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z`}]],vv=[[`path`,{d:`M12 7v6`}],[`path`,{d:`M15 10H9`}],[`path`,{d:`M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z`}]],yv=[[`path`,{d:`M10 12h4`}],[`path`,{d:`M10 8h4`}],[`path`,{d:`M14 21v-3a2 2 0 0 0-4 0v3`}],[`path`,{d:`M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2`}],[`path`,{d:`M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16`}]],bv=[[`path`,{d:`M20 6 9 17l-5-5`}]],xv=[[`path`,{d:`m6 9 6 6 6-6`}]],Sv=[[`circle`,{cx:`12`,cy:`12`,r:`10`}],[`line`,{x1:`12`,x2:`12`,y1:`8`,y2:`12`}],[`line`,{x1:`12`,x2:`12.01`,y1:`16`,y2:`16`}]],Cv=[[`circle`,{cx:`12`,cy:`12`,r:`10`}],[`path`,{d:`m9 12 2 2 4-4`}]],wv=[[`circle`,{cx:`12`,cy:`12`,r:`10`}]],Tv=[[`rect`,{width:`8`,height:`4`,x:`8`,y:`2`,rx:`1`,ry:`1`}],[`path`,{d:`M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2`}]],Ev=[[`circle`,{cx:`12`,cy:`12`,r:`10`}],[`path`,{d:`M12 6v6h4`}]],Dv=[[`path`,{d:`M12 13v8`}],[`path`,{d:`M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242`}],[`path`,{d:`m8 17 4-4 4 4`}]],Ov=[[`path`,{d:`M10 2v2`}],[`path`,{d:`M14 2v2`}],[`path`,{d:`M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1`}],[`path`,{d:`M6 2v2`}]],kv=[[`rect`,{width:`14`,height:`14`,x:`8`,y:`8`,rx:`2`,ry:`2`}],[`path`,{d:`M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2`}]],Av=[[`path`,{d:`M11 20H2`}],[`path`,{d:`M11 4.562v16.157a1 1 0 0 0 1.242.97L19 20V5.562a2 2 0 0 0-1.515-1.94l-4-1A2 2 0 0 0 11 4.561z`}],[`path`,{d:`M11 4H8a2 2 0 0 0-2 2v14`}],[`path`,{d:`M14 12h.01`}],[`path`,{d:`M22 20h-3`}]],jv=[[`path`,{d:`M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0`}],[`circle`,{cx:`12`,cy:`12`,r:`3`}]],Mv=[[`path`,{d:`M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z`}],[`path`,{d:`M14 2v5a1 1 0 0 0 1 1h5`}],[`circle`,{cx:`10`,cy:`12`,r:`2`}],[`path`,{d:`m20 17-1.296-1.296a2.41 2.41 0 0 0-3.408 0L9 22`}]],Nv=[[`path`,{d:`M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z`}],[`path`,{d:`M14 2v5a1 1 0 0 0 1 1h5`}],[`path`,{d:`M10 9H8`}],[`path`,{d:`M16 13H8`}],[`path`,{d:`M16 17H8`}]],Pv=[[`rect`,{width:`18`,height:`18`,x:`3`,y:`3`,rx:`2`}],[`path`,{d:`M7 3v18`}],[`path`,{d:`M3 7.5h4`}],[`path`,{d:`M3 12h18`}],[`path`,{d:`M3 16.5h4`}],[`path`,{d:`M17 3v18`}],[`path`,{d:`M17 7.5h4`}],[`path`,{d:`M17 16.5h4`}]],Fv=[[`circle`,{cx:`12`,cy:`12`,r:`10`}],[`path`,{d:`M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20`}],[`path`,{d:`M2 12h20`}]],Iv=[[`path`,{d:`M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5`}]],Lv=[[`path`,{d:`M16 5h6`}],[`path`,{d:`M19 2v6`}],[`path`,{d:`M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5`}],[`path`,{d:`m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21`}],[`circle`,{cx:`9`,cy:`9`,r:`2`}]],Rv=[[`circle`,{cx:`12`,cy:`12`,r:`10`}],[`path`,{d:`M12 16v-4`}],[`path`,{d:`M12 8h.01`}]],zv=[[`path`,{d:`M10 18v-7`}],[`path`,{d:`M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z`}],[`path`,{d:`M14 18v-7`}],[`path`,{d:`M18 18v-7`}],[`path`,{d:`M3 22h18`}],[`path`,{d:`M6 18v-7`}]],Bv=[[`path`,{d:`M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5`}],[`path`,{d:`M9 18h6`}],[`path`,{d:`M10 22h4`}]],Vv=[[`path`,{d:`M21 12a9 9 0 1 1-6.219-8.56`}]],Hv=[[`path`,{d:`M12 2v4`}],[`path`,{d:`m16.2 7.8 2.9-2.9`}],[`path`,{d:`M18 12h4`}],[`path`,{d:`m16.2 16.2 2.9 2.9`}],[`path`,{d:`M12 18v4`}],[`path`,{d:`m4.9 19.1 2.9-2.9`}],[`path`,{d:`M2 12h4`}],[`path`,{d:`m4.9 4.9 2.9 2.9`}]],Uv=[[`line`,{x1:`2`,x2:`5`,y1:`12`,y2:`12`}],[`line`,{x1:`19`,x2:`22`,y1:`12`,y2:`12`}],[`line`,{x1:`12`,x2:`12`,y1:`2`,y2:`5`}],[`line`,{x1:`12`,x2:`12`,y1:`19`,y2:`22`}],[`circle`,{cx:`12`,cy:`12`,r:`7`}],[`circle`,{cx:`12`,cy:`12`,r:`3`}]],Wv=[[`rect`,{width:`18`,height:`11`,x:`3`,y:`11`,rx:`2`,ry:`2`}],[`path`,{d:`M7 11V7a5 5 0 0 1 10 0v4`}]],Gv=[[`path`,{d:`m10 17 5-5-5-5`}],[`path`,{d:`M15 12H3`}],[`path`,{d:`M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4`}]],Kv=[[`path`,{d:`M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0`}],[`circle`,{cx:`12`,cy:`10`,r:`3`}]],qv=[[`path`,{d:`M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719`}]],Jv=[[`path`,{d:`M12 19v3`}],[`path`,{d:`M19 10v2a7 7 0 0 1-14 0v-2`}],[`rect`,{x:`9`,y:`2`,width:`6`,height:`13`,rx:`3`}]],Yv=[[`path`,{d:`M15.033 9.44a.647.647 0 0 1 0 1.12l-4.065 2.352a.645.645 0 0 1-.968-.56V7.648a.645.645 0 0 1 .967-.56z`}],[`path`,{d:`M12 17v4`}],[`path`,{d:`M8 21h8`}],[`rect`,{x:`2`,y:`3`,width:`20`,height:`14`,rx:`2`}]],Xv=[[`path`,{d:`M9 18V5l12-2v13`}],[`circle`,{cx:`6`,cy:`18`,r:`3`}],[`circle`,{cx:`18`,cy:`16`,r:`3`}]],Zv=[[`rect`,{x:`16`,y:`16`,width:`6`,height:`6`,rx:`1`}],[`rect`,{x:`2`,y:`16`,width:`6`,height:`6`,rx:`1`}],[`rect`,{x:`9`,y:`2`,width:`6`,height:`6`,rx:`1`}],[`path`,{d:`M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3`}],[`path`,{d:`M12 12V8`}]],Qv=[[`path`,{d:`M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4`}],[`path`,{d:`M2 6h4`}],[`path`,{d:`M2 10h4`}],[`path`,{d:`M2 14h4`}],[`path`,{d:`M2 18h4`}],[`path`,{d:`M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z`}]],$v=[[`path`,{d:`M5.8 11.3 2 22l10.7-3.79`}],[`path`,{d:`M4 3h.01`}],[`path`,{d:`M22 8h.01`}],[`path`,{d:`M15 2h.01`}],[`path`,{d:`M22 20h.01`}],[`path`,{d:`m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10`}],[`path`,{d:`m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.7-.72 1.22-1.43 1.22H17`}],[`path`,{d:`m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7`}],[`path`,{d:`M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z`}]],ey=[[`path`,{d:`M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z`}],[`path`,{d:`m15 5 4 4`}]],ty=[[`path`,{d:`M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z`}]],ny=[[`path`,{d:`M5 12h14`}],[`path`,{d:`M12 5v14`}]],ry=[[`path`,{d:`M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z`}],[`path`,{d:`M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z`}]],iy=[[`path`,{d:`M16.247 7.761a6 6 0 0 1 0 8.478`}],[`path`,{d:`M19.075 4.933a10 10 0 0 1 0 14.134`}],[`path`,{d:`M4.925 19.067a10 10 0 0 1 0-14.134`}],[`path`,{d:`M7.753 16.239a6 6 0 0 1 0-8.478`}],[`circle`,{cx:`12`,cy:`12`,r:`2`}]],ay=[[`path`,{d:`M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8`}],[`path`,{d:`M21 3v5h-5`}],[`path`,{d:`M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16`}],[`path`,{d:`M8 16H3v5`}]],oy=[[`path`,{d:`M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8`}],[`path`,{d:`M3 3v5h5`}]],sy=[[`path`,{d:`M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z`}],[`path`,{d:`M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7`}],[`path`,{d:`M7 3v4a1 1 0 0 0 1 1h7`}]],cy=[[`path`,{d:`M3 7V5a2 2 0 0 1 2-2h2`}],[`path`,{d:`M17 3h2a2 2 0 0 1 2 2v2`}],[`path`,{d:`M21 17v2a2 2 0 0 1-2 2h-2`}],[`path`,{d:`M7 21H5a2 2 0 0 1-2-2v-2`}],[`path`,{d:`M8 14s1.5 2 4 2 4-2 4-2`}],[`path`,{d:`M9 9h.01`}],[`path`,{d:`M15 9h.01`}]],ly=[[`path`,{d:`M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z`}],[`path`,{d:`m21.854 2.147-10.94 10.939`}]],uy=[[`path`,{d:`M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z`}],[`path`,{d:`m9 12 2 2 4-4`}]],dy=[[`circle`,{cx:`12`,cy:`12`,r:`10`}],[`path`,{d:`M8 14s1.5 2 4 2 4-2 4-2`}],[`line`,{x1:`9`,x2:`9.01`,y1:`9`,y2:`9`}],[`line`,{x1:`15`,x2:`15.01`,y1:`9`,y2:`9`}]],fy=[[`path`,{d:`M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z`}],[`path`,{d:`M20 2v4`}],[`path`,{d:`M22 4h-4`}],[`circle`,{cx:`4`,cy:`20`,r:`2`}]],py=[[`rect`,{width:`18`,height:`18`,x:`3`,y:`3`,rx:`2`}]],my=[[`path`,{d:`M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5`}],[`path`,{d:`M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244`}],[`path`,{d:`M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05`}]],hy=[[`path`,{d:`M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z`}],[`circle`,{cx:`7.5`,cy:`7.5`,r:`.5`,fill:`currentColor`}]],gy=[[`path`,{d:`M13.172 2a2 2 0 0 1 1.414.586l6.71 6.71a2.4 2.4 0 0 1 0 3.408l-4.592 4.592a2.4 2.4 0 0 1-3.408 0l-6.71-6.71A2 2 0 0 1 6 9.172V3a1 1 0 0 1 1-1z`}],[`path`,{d:`M2 7v6.172a2 2 0 0 0 .586 1.414l6.71 6.71a2.4 2.4 0 0 0 3.191.193`}],[`circle`,{cx:`10.5`,cy:`6.5`,r:`.5`,fill:`currentColor`}]],_y=[[`path`,{d:`M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z`}]],vy=[[`path`,{d:`M10 11v6`}],[`path`,{d:`M14 11v6`}],[`path`,{d:`M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6`}],[`path`,{d:`M3 6h18`}],[`path`,{d:`M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2`}]],yy=[[`path`,{d:`m16 11 2 2 4-4`}],[`path`,{d:`M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2`}],[`circle`,{cx:`9`,cy:`7`,r:`4`}]],by=[[`path`,{d:`M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2`}],[`circle`,{cx:`9`,cy:`7`,r:`4`}],[`line`,{x1:`19`,x2:`19`,y1:`8`,y2:`14`}],[`line`,{x1:`22`,x2:`16`,y1:`11`,y2:`11`}]],xy=[[`path`,{d:`M2 21a8 8 0 0 1 13.292-6`}],[`circle`,{cx:`10`,cy:`8`,r:`5`}],[`path`,{d:`m16 19 2 2 4-4`}]],Sy=[[`circle`,{cx:`12`,cy:`8`,r:`5`}],[`path`,{d:`M20 21a8 8 0 0 0-16 0`}]],Cy=[[`path`,{d:`M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2`}],[`path`,{d:`M16 3.128a4 4 0 0 1 0 7.744`}],[`path`,{d:`M22 21v-2a4 4 0 0 0-3-3.87`}],[`circle`,{cx:`9`,cy:`7`,r:`4`}]],wy=[[`path`,{d:`m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5`}],[`rect`,{x:`2`,y:`6`,width:`14`,height:`12`,rx:`2`}]],Ty=[[`path`,{d:`M12.8 19.6A2 2 0 1 0 14 16H2`}],[`path`,{d:`M17.5 8a2.5 2.5 0 1 1 2 4H2`}],[`path`,{d:`M9.8 4.4A2 2 0 1 1 11 8H2`}]],Ey=[[`path`,{d:`M18 6 6 18`}],[`path`,{d:`m6 6 12 12`}]],Dy=({icons:e={},nameAttr:t=`data-lucide`,attrs:n={},root:r=document,inTemplates:i}={})=>{if(!Object.values(e).length)throw Error(`Please provide an icons object.
If you want to use all the icons you can import it like:
 \`import { createIcons, icons } from 'lucide';
lucide.createIcons({icons});\``);if(r===void 0)throw Error("`createIcons()` only works in a browser environment.");if(Array.from(r.querySelectorAll(`[${t}]`)).forEach(r=>dv(r,{nameAttr:t,icons:e,attrs:n})),i&&Array.from(r.querySelectorAll(`template`)).forEach(r=>Dy({icons:e,nameAttr:t,attrs:n,root:r.content,inTemplates:i})),t===`data-lucide`){let t=r.querySelectorAll(`[icon-name]`);t.length>0&&(console.warn(`[Lucide] Some icons were found with the now deprecated icon-name attribute. These will still be replaced for backwards compatibility, but will no longer be supported in v1.0 and you should switch to data-lucide`),Array.from(t).forEach(t=>dv(t,{nameAttr:`icon-name`,icons:e,attrs:n})))}};function Oy(e,t,n){let[r,i]=e,a=t.get(r),o=t.get(i);return!a||!o?``:`
    <line
      class="relationship-line${r===n||i===n?` is-primary`:``}"
      x1="${a.graph.x}"
      y1="${a.graph.y}"
      x2="${o.graph.x}"
      y2="${o.graph.y}"
    />`}function ky(e,{currentUserId:t,selectedId:n}){let r=e.id===t,i=e.id===n,a=r?`我的坐标`:e.relation;return`
    <button
      class="relationship-node${r?` is-self`:``}${i?` is-selected`:``}"
      style="--node-x: ${e.graph.x}%; --node-y: ${e.graph.y}%"
      type="button"
      data-person-id="${e.id}"
      aria-label="${r?e.displayName:e.name}，${a}"
      ${r?`aria-current="true"`:``}
    >
      <span class="node-orbit" aria-hidden="true"></span>
      <span class="node-avatar">
        <img src="${e.portrait}" alt="" draggable="false" />
      </span>
      <span class="node-caption">
        <strong>${r?e.displayName:e.name}</strong>
        <small>${a}</small>
      </span>
    </button>`}function Ay(e,{currentUser:t,people:n,relationships:r,selectedId:i=null}){let a=[t,...n],o=new Map(a.map(e=>[e.id,e]));e.innerHTML=`
    <div class="relationship-map" aria-label="人物关系网络">
      <svg class="relationship-edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        ${r.map(e=>Oy(e,o,t.id)).join(``)}
      </svg>
      <div class="map-pulse" aria-hidden="true"></div>
      ${a.map(e=>ky(e,{currentUserId:t.id,selectedId:i})).join(``)}
    </div>`}var jy=`echoworld:profile-overrides:v1`,My=1,Ny=[`name`,`relation`,`role`,`city`,`bio`,`tags`];function Py(e={}){let t={};for(let n of Ny)if(n in e){if(n===`tags`){t.tags=Array.isArray(e.tags)?e.tags.map(e=>String(e).trim()).filter(Boolean).slice(0,12):[];continue}t[n]=String(e[n]??``).trim()}return t}function Fy(e=globalThis.localStorage){function t(){try{let t=JSON.parse(e?.getItem(jy)??`null`);return t?.version!==My||!t.profiles?{}:t.profiles}catch{return{}}}function n(t){try{return e?.setItem(jy,JSON.stringify({version:My,profiles:t})),!0}catch{return!1}}return{getAll(){let e=t();return Object.fromEntries(Object.entries(e).map(([e,t])=>[e,Py(t)]))},save(e,r){let i=t();return i[e]=Py(r),n(i)},key:jy}}var Iy={ArrowLeft:mv,ArrowRight:hv,Activity:fv,Armchair:pv,Check:bv,Clock3:Ev,Circle:wv,Coffee:Ov,Info:Rv,Heart:Iv,LocateFixed:Uv,MapPin:Kv,MessageCircle:qv,Network:Zv,Plus:ny,Pencil:ey,Save:sy,Send:ly,Smile:dy,Lightbulb:Bv,Sparkles:fy,UserRound:Sy,Users:Cy,Wind:Ty,Thermometer:_y,X:Ey},Ly=[{id:`neutral`,label:`平静`,icon:`circle`},{id:`happy`,label:`开心`,icon:`smile`},{id:`surprised`,label:`惊讶`,icon:`sparkles`},{id:`thinking`,label:`思考`,icon:`lightbulb`}],Ry=new Set(Ly.map(({id:e})=>e)),zy={arriving:`刚刚抵达`,walking:`正在寻找座位`,seated:`正在咖啡厅交谈`,"joining-meeting":`正在前往圆桌`,"in-meeting":`已加入圆桌会议`};function By(e){return String(e).replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&#039;`)}function Vy(e,t=``){return`<i data-lucide="${e}"${t?` class="${t}"`:``}></i>`}function Hy(e){Dy({icons:Iy,root:e,attrs:{"stroke-width":1.8}})}function Uy(e){if(e==null||e===``)return null;let t=Number(e);return Number.isFinite(t)?t:null}function Wy(e,t=0){let n=Uy(e);return n===null?`--`:n.toFixed(t)}function Gy(e,t=!1){if(!e)return`等待时间戳`;let n=new Date(e);return Number.isNaN(n.getTime())?String(e):new Intl.DateTimeFormat(`zh-CN`,{...t?{month:`numeric`,day:`numeric`}:{},hour:`2-digit`,minute:`2-digit`,hour12:!1}).format(n)}function Ky(e){let t=Uy(e);if(t===null)return`--`;let n=t<=1?t*100:t;return`${Math.round(Math.max(0,Math.min(100,n)))}%`}function qy({iconName:e,label:t,metric:n,fallbackUnit:r,fallbackExplanation:i,digits:a=0}){let o=n?.value??n,s=n?.unit??r,c=n?.status??(o==null?`待接入`:`最近记录`),l=n?.explanation??i??`AI 会结合个人基线解释这个指标。`;return`
    <div class="signal-metric">
      <div class="signal-metric-heading">
        ${Vy(e)}
        <span>${By(t)}</span>
        <small>${By(c)}</small>
      </div>
      <strong>${Wy(o,a)}<small>${By(s??``)}</small></strong>
      <p>${By(l)}</p>
    </div>`}function Jy(e){return{rising:`上升`,steady:`平稳`,stable:`稳定`,falling:`回落`,settling:`趋稳`,unknown:`待建立基线`}[e]??e??`待建立基线`}function Yy(e){return{high:`高`,medium:`中`,low:`低`,pending:`待评估`}[e]??Ky(e)}function Xy(e,t,n){let r=t?.heart??{},i=t?.metrics??{},a=t?.interpretation??t?.inference??{},o=t?.iceBreak??{},s=Uy(r.score??r.heartScore),c=Uy(r.bpm??r.currentBpm),l=Uy(r.baselineBpm),u=Uy(r.peakBpm),d=s===null?.9:Math.max(.42,Math.min(1.35,1.35-s/100*.93)),f=s===null?1.08:1.06+Math.max(0,Math.min(100,s))*.0014,p=String(t?.status??`waiting`).toLowerCase(),m=[`live`,`active`,`streaming`,`realtime`].includes(p),h=Object.values(t?.sourceRefs??{}).some(e=>String(e).startsWith(`demo-`))?`演示数据`:m?`实时`:t?`历史记录`:`等待数据`,g=[`stale`,`unavailable`,`offline`,`error`].includes(p),_=a.caveat||`推测，不是情感事实`,v=r.explanation??`心动值会结合个人静息基线与当前心率变化计算，不等同于喜欢程度。`,y=t?.capturedAt??t?.timestamp,b=`${e.name} 的心动值 ${s??`暂无`}，当前心率 ${c??`暂无`} BPM`;return`
    <section class="person-signal" data-signal-person="${By(e.id)}" data-signal-context="${By(n)}" aria-label="${By(e.name)} 的生理信号" aria-live="polite">
      <header class="signal-section-heading">
        <span>生理信号</span>
        <span class="signal-capture-status${m?` is-live`:``}">
          <i aria-hidden="true"></i>${h} · ${By(Gy(y,!m))}
        </span>
      </header>

      <div class="heart-signal${s===null||g?` is-waiting`:``}" style="--heart-beat-duration: ${d.toFixed(2)}s; --heart-beat-scale: ${f.toFixed(2)}">
        <span class="heart-signal-icon" aria-hidden="true">${Vy(`heart`)}</span>
        <div class="heart-score">
          <small>心动值</small>
          <strong>${s===null?`--`:Math.round(s)}<span>/100</span></strong>
        </div>
        <div class="heart-bpm">
          <small>当前心率</small>
          <strong>${c===null?`--`:Math.round(c)}<span>BPM</span></strong>
          <p>基线 ${l===null?`--`:Math.round(l)} · 峰值 ${u===null?`--`:Math.round(u)}</p>
        </div>
        <span class="sr-only">${By(b)}</span>
      </div>
      <p class="heart-signal-explanation">${By(v)}</p>
      <div class="heart-signal-meta">
        <span>${Vy(`activity`)}趋势 ${By(Jy(r.trend))}</span>
        <span>置信度 ${Ky(r.confidence??a.confidence)}</span>
      </div>

      <div class="signal-metrics" aria-label="其他生理指标">
        ${qy({iconName:`wind`,label:`呼吸`,metric:i.breathingRate,fallbackUnit:`次/分`,fallbackExplanation:`反映当时的生理唤起与交流节奏。`,digits:0})}
        ${qy({iconName:`activity`,label:`压力`,metric:i.stressIndex??i.stress,fallbackUnit:`%`,fallbackExplanation:`多信号融合估计，不代表负面情绪。`,digits:0})}
        ${qy({iconName:`thermometer`,label:`体表温度`,metric:i.skinTemperature,fallbackUnit:`°C`,fallbackExplanation:`容易受到环境与佩戴状态影响。`,digits:1})}
        ${qy({iconName:`sparkles`,label:`HRV`,metric:i.hrv,fallbackUnit:`ms`,fallbackExplanation:`反映心搏间变化，需对照个人历史基线。`,digits:0})}
      </div>

      <div class="signal-interpretation">
        <div class="signal-interpretation-heading">
          ${Vy(`sparkles`)}
          <span><small>AI 综合解释</small><strong>${By(a.label??`等待形成判断`)}</strong></span>
          <em>${Ky(a.confidence)}</em>
        </div>
        <p>${By(a.summary??`照片、对话和可穿戴数据接入后，这里会说明当前数值相对个人基线意味着什么。`)}</p>
        <small class="signal-caveat">${Vy(`info`)}${By(_.includes(`推测，不是情感事实`)?_:`推测，不是情感事实 · ${_}`)}</small>
      </div>

      <div class="ice-break-signal" data-detected="${!!o.detected}">
        <span>${Vy(`sparkles`)}</span>
        <div>
          <small>破冰瞬间</small>
          <strong>${o.detected?`在 ${Gy(o.at)} 捕捉到互动转折`:`尚未识别到明确转折`}</strong>
          <p>${o.detected?`用时 ${Wy(o.breakSeconds)} 秒 · 可靠度 ${Yy(o.reliability)}`:`持续记录后，将在这里标记关系开始自然升温的时刻。`}</p>
        </div>
      </div>
    </section>`}function Zy({variants:e,activeVariant:t,context:n,kind:r,label:i}){return`
    <div
      class="variant-switcher variant-switcher--${r}"
      data-option-count="${e.length}"
      role="group"
      aria-label="${By(i)}"
    >
      ${e.map(e=>`
        <button
          type="button"
          data-${r}-variant="${By(e.id)}"
          aria-pressed="${e.id===t.id}"
          title="${By(e.title)}"
        >${By(e.label)}</button>
      `).join(``)}
    </div>`}function Qy({sceneVariants:e,activeSceneVariant:t,characterVariants:n,activeCharacterVariant:r,context:i}){let a=e.length>1&&t?Zy({variants:e,activeVariant:t,context:i,kind:`scene`,label:`场景版本`}):``,o=n.length>1&&r?Zy({variants:n,activeVariant:r,context:i,kind:`character`,label:`人物生成方案`}):``;return!a&&!o?``:`
    <div class="variant-controls variant-controls--${i}">
      ${a}
      ${o}
    </div>`}function $y(e){let t=new Map;function n(e){let n=e.id??e.name;if(!t.has(n)){let r=document.createElement(`canvas`);r.width=64,r.height=64;let i=r.getContext(`2d`);i.fillStyle=e.palette?.jacket??`#2f665c`,i.beginPath(),i.arc(32,32,32,0,Math.PI*2),i.fill(),i.fillStyle=`#fffdf4`,i.font=`700 30px "PingFang SC", "Microsoft YaHei", sans-serif`,i.textAlign=`center`,i.textBaseline=`middle`,i.fillText(String(e.displayName??e.name??`?`).slice(0,1),32,34),t.set(n,r.toDataURL(`image/png`))}return t.get(n)}return function(t,{alt:r=``,title:i=``}={}){let a=n(t),o=i?` title="${By(i)}"`:``;return`<img src="${By(e(t.portrait))}" alt="${By(r)}"${o} onerror="this.onerror=null;this.src='${a}'" />`}}var eb=null;function tb(e,t,n=`world`,r=null){let i=eb?eb(e,{alt:`${e.name} 的 Low-poly 头像`}):`<img src="${e.portrait}" alt="${e.name} 的 Low-poly 头像" />`,a=zy[t?.status]??`在 Echo Cafe`,o=t?.tableLabel??`咖啡厅大厅`;return`
    <header class="inspector-identity">
      ${i}
      <div>
        <span>${e.relation}</span>
        <h2>${e.name}</h2>
        <p>${e.role} · ${e.city}</p>
      </div>
      <button class="glass-icon-button" type="button" data-action="close-${n}-person" title="关闭" aria-label="关闭人物资料">${Vy(`x`)}</button>
    </header>
    <div class="agent-live-state">
      <span class="live-state-dot"></span>
      <div><small>Agent 状态</small><strong>${a}</strong></div>
      <span>${o}</span>
    </div>
    ${Xy(e,r,n)}
    <p class="inspector-bio">${e.bio}</p>
    <div class="inspector-facts">
      <div>${Vy(`map-pin`)}<span><small>所在城市</small><strong>${e.city}</strong></span></div>
      <div>${Vy(`clock-3`)}<span><small>最近相见</small><strong>${e.lastSeen}</strong></span></div>
    </div>
    <div class="inspector-tags">${e.tags.map(e=>`<span>${e}</span>`).join(``)}</div>
    <div class="inspector-stats">
      <div><strong>${e.stats.photos}</strong><small>照片</small></div>
      <div><strong>${e.stats.voiceClips}</strong><small>语音</small></div>
      <div><strong>${e.stats.memories}</strong><small>记忆</small></div>
    </div>`}function nb(e,t,n,r){return`
    <div class="inspector-controls">
      <div class="inspector-mode-switch" role="group" aria-label="个人资料显示模式">
        <button type="button" data-inspector-mode="profile" data-inspector-context="${t}" aria-pressed="${n===`profile`}">
          ${Vy(`user-round`)}<span>资料</span>
        </button>
        <button type="button" data-inspector-mode="edit" data-inspector-context="${t}" aria-pressed="${n===`edit`}">
          ${Vy(`pencil`)}<span>编辑</span>
        </button>
      </div>
      <div class="expression-control" role="group" aria-label="切换 ${By(e.name)} 的表情">
        <small>表情</small>
        <div>
          ${Ly.map(t=>`
            <button
              type="button"
              data-person-expression="${t.id}"
              data-expression-person="${By(e.id)}"
              aria-label="${By(t.label)}表情"
              aria-pressed="${r===t.id}"
              title="${By(t.label)}"
            >${Vy(t.icon)}<span>${By(t.label)}</span></button>
          `).join(``)}
        </div>
      </div>
    </div>`}function rb(e,t){return`
    <form class="profile-edit-form" id="${By(`profile-form-${t}-${e.id}`)}" data-profile-form data-profile-person="${By(e.id)}" data-profile-context="${t}">
      <div class="profile-edit-grid">
        <label><span>姓名</span><input name="name" value="${By(e.name)}" maxlength="30" required /></label>
        <label><span>关系</span><input name="relation" value="${By(e.relation)}" maxlength="40" /></label>
        <label><span>角色</span><input name="role" value="${By(e.role)}" maxlength="40" /></label>
        <label><span>城市</span><input name="city" value="${By(e.city)}" maxlength="30" /></label>
      </div>
      <label class="profile-edit-wide"><span>个人简介</span><textarea name="bio" rows="4" maxlength="320">${By(e.bio)}</textarea></label>
      <label class="profile-edit-wide"><span>标签 <small>用逗号分隔</small></span><input name="tags" value="${By((e.tags??[]).join(`, `))}" maxlength="160" /></label>
      <div class="profile-edit-actions">
        <button type="button" data-action="cancel-profile-edit" data-inspector-context="${t}">取消</button>
        <button type="submit">${Vy(`save`)}<span>保存资料</span></button>
      </div>
    </form>`}function ib(e,t,n,r,i,a){let o=tb(e,t,n,a),s=o.indexOf(`</header>`)+9,c=o.slice(0,s),l=nb(e,n,r,i);return r===`edit`?`${c}${l}<div class="inspector-panel-content is-editing">${rb(e,n)}</div>`:`${c}${l}<div class="inspector-panel-content">${o.slice(s)}</div>`}function ab({root:e,currentUser:t,people:n,relationships:r,sceneVariants:i=[],activeSceneVariant:a=null,characterVariants:o=[],activeCharacterVariant:s=null,onViewChange:c=()=>{},onSceneVariantChange:l=()=>{},onCharacterVariantChange:u=()=>{},onLocatePerson:d=()=>{},onMeetingStart:f=async()=>{},onMeetingEnd:p=async()=>{},onNotification:m=()=>{},resolveMediaUrl:h=e=>e,world:g=`cafe`,fieldPerson:_=null,onExpressionChange:v=()=>{},onProfileChange:y=()=>{},signalStore:b=null,signalByPersonId:x=null}){let S=`intro`,C=!1,w=null,T=null,E=!1,D=!1,O=!1,k=!1,A=null,j=0,M=new Set,N=new Map,ee=[],te=new Map,P=new Set,ne=$y(h);eb=ne;let re=g===`hall`?`Echo 集市`:g===`field`?`${_?.name??`TA`} · 关系场域`:`Echo Cafe`,ie=g===`hall`?`展位陈列中 · 欢迎串门`:g===`field`?`共同记忆正在构成环境`:`熟人交流空间 · 今日播报已开启`,ae=g===`field`?`关系场域`:g===`cafe`?`Echo Cafe`:`Echo 集市`,oe=g===`field`?`这里表达的是你与${_?.name??`TA`}相处时留下的感觉，而不是对现实的复刻。`:g===`cafe`?`坐到桌边，邀请熟人喝杯咖啡，或在圆桌展开一次有上下文的交流。`:`这是你的关系集市：你认识的人，都在这里有了自己的展位。`,se=g===`field`?`进入这段关系`:g===`cafe`?`推门进咖啡厅`:`走进集市`,ce=new Map,F=new Map,le=new Map,ue={world:`profile`,map:`profile`},de=Fy(),fe=de.getAll();if(n=n.map(e=>({...e,...fe[e.id]??{}})),x instanceof Map)for(let[e,t]of x)le.set(e,t);else if(x&&typeof x==`object`)for(let[e,t]of Object.entries(x))le.set(e,t);e.innerHTML=`
    <div class="cafe-shell" data-view="intro">
      <section id="intro-view" class="cafe-view intro-view" aria-label="EchoWorld 首页">
        <div class="intro-tone" aria-hidden="true"></div>
        <header class="intro-bar">
          <div class="cafe-brand light">
            <span class="cafe-brand-mark">EW</span>
            <span><strong>EchoWorld</strong><small>AGENT RELATIONSHIP CAFE</small></span>
          </div>
          <div class="intro-actions">
            ${a&&s&&g!==`field`?Qy({sceneVariants:i,activeSceneVariant:a,characterVariants:o,activeCharacterVariant:s,context:`intro`}):``}
            <div class="intro-live"><span></span>${g===`field`?`关系场域已生成`:g===`cafe`?`熟人空间已开门`:`6 个 Agent 已在展位就位`}</div>
          </div>
        </header>
        <div class="intro-copy">
          <p>YOUR RELATIONSHIPS, IN ONE PLACE</p>
          <h1>${ae}</h1>
          <h2>${oe}</h2>
        </div>
        <button class="intro-enter" type="button" data-action="enter-cafe" disabled>
          <span><small>${g===`field`?`YOU × THEM`:`进入我的关系空间`}</small>${se}</span>
          ${Vy(`arrow-right`)}
        </button>
        <footer class="intro-footnote">
          <span>ECHOWORLD / PRIVATE AGENT SPACE</span>
          <span>${g===`field`?`01 RELATION · 04 MEMORIES · REGENERABLE`:`06 PEOPLE · 06 BOOTHS · 01 CAFE`}</span>
        </footer>
      </section>

      <section id="cafe-view" class="cafe-view cafe-world-view" aria-label="${re}" aria-hidden="true">
        <header class="cafe-hud-top">
          <button class="glass-control venue-control" type="button" data-action="intro" aria-label="返回首页">
            <span class="cafe-brand-mark solid">EW</span>
            <span><small>当前位置</small><strong>${re}</strong></span>
          </button>
          <div class="cafe-presence">
            <div class="presence-faces">
              ${(g===`field`&&_?[_]:n).map(e=>ne(e,{title:e.name})).join(``)}
            </div>
            <span><strong>${g===`field`?1:n.length}</strong> Agent 在线</span>
          </div>
          <button class="glass-control map-control" type="button" data-action="open-map">
            ${Vy(`network`)}
            <span><small>人物关系</small><strong>关系 Map</strong></span>
          </button>
        </header>

        ${a&&s&&g!==`field`?Qy({sceneVariants:i,activeSceneVariant:a,characterVariants:o,activeCharacterVariant:s,context:`cafe`}):``}

        <div id="world-speech-layer" class="world-speech-layer" aria-live="polite"></div>

        <aside id="world-inspector" class="world-inspector glass-panel" aria-label="人物资料" aria-hidden="true"></aside>
        <aside id="meeting-sheet" class="meeting-sheet glass-panel" aria-label="圆桌会议" aria-hidden="true"></aside>

        <div class="cafe-bottom-status glass-control" aria-label="${re}状态">
          ${Vy(`coffee`)}
          <span><strong>${re}</strong><small>${ie}</small></span>
        </div>
      </section>

      <section id="map-view" class="cafe-view relationship-view" aria-label="人物关系 Map" aria-hidden="true">
        <header class="map-header">
          <button class="glass-icon-button" type="button" data-action="back-cafe" title="返回咖啡厅" aria-label="返回咖啡厅">${Vy(`arrow-left`)}</button>
          <div><small>EchoWorld</small><strong>人物关系 Map</strong></div>
          <span>6 PEOPLE / 12 CONNECTIONS</span>
        </header>
        <div id="cafe-relationship-graph" class="cafe-relationship-graph"></div>
        <aside id="map-inspector" class="map-inspector" aria-label="人物资料" aria-hidden="true"></aside>
      </section>

      <div id="cafe-toast" class="cafe-toast" role="status" aria-live="polite"></div>
    </div>`;let pe=e.querySelector(`.cafe-shell`),me=e.querySelector(`#cafe-relationship-graph`),he=e.querySelector(`#world-inspector`),ge=e.querySelector(`#map-inspector`),_e=e.querySelector(`#meeting-sheet`),ve=e.querySelector(`#world-speech-layer`),ye=e.querySelector(`#cafe-toast`),be=null;function xe(t){S=t,pe.dataset.view=t,document.body.dataset.view=t;for(let n of e.querySelectorAll(`.cafe-view`))n.setAttribute(`aria-hidden`,String(n.id!==`${t}-view`));t!==`cafe`&&(w=null,Me()),c(t),document.title=t===`intro`?`EchoWorld · ${re}`:t===`map`?`EchoWorld · 关系 Map`:`EchoWorld · ${re} 在线`}function Se(e){window.clearTimeout(be),ye.textContent=e,ye.classList.add(`is-visible`),m(e),be=window.setTimeout(()=>ye.classList.remove(`is-visible`),2200)}function Ce(e){if(le.has(e))return le.get(e);if(typeof b?.getSnapshot!=`function`)return null;try{let t=b.getSnapshot(e);return t&&le.set(e,t),t??null}catch(t){return console.warn(`Unable to read physiological signal for ${e}`,t),null}}function we(e,t=null){let n=e?.personId??t;return!n||!e?!1:(le.set(n,{...e,personId:n}),w?.id===n&&Me(),T?.id===n&&I(),!0)}function Te(e){return!e||!le.delete(e)?!1:(w?.id===e&&Me(),T?.id===e&&I(),!0)}function Ee(e,t=null){let n=typeof e==`string`?{...t,personId:e}:e;if(!n?.personId)return!1;if(typeof b?.upsert==`function`)try{return we(b.upsert(n)?.snapshot??n)}catch(e){console.warn(`Unable to persist physiological signal for ${n.personId}`,e)}return we(n)}function De(e){return/[!！]/.test(e)?`surprised`:/[?？]/.test(e)?`thinking`:`happy`}function Oe(t){let n=F.get(t)??`neutral`;for(let r of e.querySelectorAll(`[data-expression-person="${CSS.escape(t)}"]`))r.setAttribute(`aria-pressed`,String(r.dataset.personExpression===n))}function ke(e,t=`neutral`,r={}){if(!n.find(t=>t.id===e)||!Ry.has(t))return!1;window.clearTimeout(ce.get(e)),ce.delete(e);let i=F.get(e)??`neutral`;F.set(e,t),Oe(e),v(e,t,{...r,previous:i});let a=Number(r.duration??0);return t!==`neutral`&&a>0&&ce.set(e,window.setTimeout(()=>{ke(e,`neutral`,{source:`auto-reset`,previousSource:r.source??`programmatic`})},a*1e3)),!0}function Ae(e,t,r){let i=n.findIndex(t=>t.id===e);if(i<0)return;let a={name:String(t.name??``).trim(),relation:String(t.relation??``).trim(),role:String(t.role??``).trim(),city:String(t.city??``).trim(),bio:String(t.bio??``).trim(),tags:String(t.tags??``).split(/[,，]/).map(e=>e.trim()).filter(Boolean).slice(0,12)},o={...n[i],...a};n=n.map(t=>t.id===e?o:t),de.save(e,a),w?.id===e&&(w=o),T?.id===e&&(T=o),ue[r]=`profile`,je(),Me(),I(),y(e,o,{source:`manual`,changes:a}),Se(`已保存 ${o.name} 的个人资料`)}function je(){Ay(me,{currentUser:t,people:n,relationships:r,selectedId:T?.id??null})}function Me(){he.innerHTML=``,he.setAttribute(`aria-hidden`,`true`),pe.classList.remove(`has-world-inspector`)}function I(){if(!T){ge.innerHTML=``,ge.setAttribute(`aria-hidden`,`true`),pe.classList.remove(`has-map-inspector`);return}ge.innerHTML=`
      ${ib(T,N.get(T.id),`map`,ue.map,F.get(T.id)??`neutral`,Ce(T.id))}
      <button class="locate-person-button" type="button" data-action="locate-person">
        ${Vy(`locate-fixed`)}<span>在咖啡厅中定位</span>
      </button>`,ge.setAttribute(`aria-hidden`,`false`),pe.classList.add(`has-map-inspector`),Hy(ge)}function Ne(){let e=[t.id,...M];return`
      <div class="meeting-seat-map" aria-label="六人圆桌座位">
        ${Array.from({length:6},(r,i)=>{let a=e[i],o=a===t.id?t:n.find(e=>e.id===a);return`<span class="meeting-seat seat-${i+1}${o?` is-filled`:``}">
            ${o?ne(o,{alt:o.displayName??o.name}):`<i>${i+1}</i>`}
          </span>`}).join(``)}
        <span class="meeting-table-core">${Vy(`coffee`)}<small>${e.length}/6</small></span>
      </div>`}function Pe(){_e.innerHTML=`
      <header class="meeting-header">
        <span class="meeting-header-icon">${Vy(`users`)}</span>
        <div><small>中央六人圆桌</small><h2>邀请谁一起坐下？</h2></div>
        <button class="glass-icon-button" type="button" data-action="close-meeting" title="关闭" aria-label="关闭圆桌会议">${Vy(`x`)}</button>
      </header>
      ${Ne()}
      <label class="meeting-topic-field">
        <span>议题 <small>可选，会成为大家讨论的中心</small></span>
        <input name="meeting-topic" data-meeting-topic-input maxlength="80"
          placeholder="例如：帮 TA 的摄影展想想宣传点子" value="${By(A??``)}" />
      </label>
      <div class="meeting-invite-list">
        ${n.map(e=>{let t=M.has(e.id),n=N.get(e.id);return`
            <button class="meeting-person-row${t?` is-selected`:``}" type="button" data-meeting-person="${e.id}" aria-pressed="${t}">
              ${ne(e)}
              <span><strong>${e.name}</strong><small>${n?.tableLabel??e.relation}</small></span>
              <i>${Vy(t?`check`:`plus`)}</i>
            </button>`}).join(``)}
      </div>
      <footer class="meeting-footer">
        <span>还可邀请 ${5-M.size} 人</span>
        <button type="button" data-action="start-meeting" ${M.size===0?`disabled`:``}>邀请 ${M.size} 人入座</button>
      </footer>`,_e.setAttribute(`aria-hidden`,`false`),Re(),Hy(_e)}function Fe(e){if(e.system)return`<div class="meeting-message is-system"><p>${By(e.text)}</p></div>`;let r=e.personId===t.id?t:n.find(t=>t.id===e.personId);return r?`<div class="meeting-message${e.personId===t.id?` is-me`:``}">
      ${ne(r)}
      <span><small>${r.displayName??r.name}</small><p>${By(e.text)}</p></span>
    </div>`:``}function L(){requestAnimationFrame(()=>{let e=_e.querySelector(`[data-meeting-thread]`);e&&(e.scrollTop=e.scrollHeight)})}function Ie(){let e=n.filter(e=>M.has(e.id));_e.innerHTML=`
      <header class="meeting-header active">
        <div class="meeting-party-faces">
          ${ne(t)}
          ${e.map(e=>ne(e)).join(``)}
        </div>
        <div><small>${e.length+1} 人已入座${A?` · 议题：${By(A)}`:``}</small><h2>圆桌会议进行中</h2></div>
        <button class="glass-icon-button" type="button" data-action="end-meeting" title="结束会议" aria-label="结束圆桌会议">${Vy(`x`)}</button>
      </header>
      <div class="meeting-thread" data-meeting-thread>
        ${ee.map(Fe).join(``)}
      </div>
      <div class="meeting-topics">
        <button type="button" data-meeting-topic="最近有什么新变化？">最近的变化</button>
        <button type="button" data-meeting-topic="我们下一步一起做什么？">下一步</button>
        <button type="button" data-meeting-topic="说说大家共同记得的一件事。">共同记忆</button>
      </div>
      <form class="meeting-composer" data-meeting-form>
        <input name="message" autocomplete="off" placeholder="对圆桌上的人说点什么" aria-label="圆桌消息" />
        <button type="submit" class="glass-icon-button" title="发送" aria-label="发送消息">${Vy(`send`)}</button>
      </form>`,_e.setAttribute(`aria-hidden`,`false`),Re(),Hy(_e),L()}function R(){let e=n.filter(e=>M.has(e.id));_e.innerHTML=`
      <header class="meeting-header">
        <div class="meeting-party-faces">
          ${ne(t)}
          ${e.map(e=>ne(e)).join(``)}
        </div>
        <div><small>${A?`议题：${By(A)}`:`圆桌会议`}</small><h2>会议结束</h2></div>
        <button class="glass-icon-button" type="button" data-action="close-meeting" title="关闭" aria-label="关闭圆桌会议">${Vy(`x`)}</button>
      </header>
      <div class="meeting-thread" data-meeting-thread>
        ${ee.map(Fe).join(``)}
        <div class="meeting-message is-system"><p>会议结束，大家回到了各自的位置。这次讨论已写入今日播报。</p></div>
      </div>
      <footer class="meeting-footer">
        <span>感谢发起这场讨论</span>
        <button type="button" data-action="close-meeting">收起会议记录</button>
      </footer>`,_e.setAttribute(`aria-hidden`,`false`),Re(),Hy(_e),L()}function z(){E=!1,k=!1,_e.innerHTML=``,_e.setAttribute(`aria-hidden`,`true`),pe.classList.remove(`has-meeting-sheet`)}let Le=`echoworld:panel-focus`;function Re(){window.dispatchEvent(new CustomEvent(Le,{detail:{id:`meeting`}}))}window.addEventListener(Le,e=>{e.detail?.id!==`meeting`&&E&&z()});async function ze(){return E?k?(z(),M.clear(),!0):O?(await p(),O=!1,M.clear(),z(),Se(`圆桌会议已结束`),!0):(z(),!0):!1}function Be(e){ee.push(e),ee.length>80&&ee.splice(0,ee.length-80)}async function Ve(e){let r=String(e).trim();if(!r||!O)return;if(Be({personId:t.id,text:r}),Ie(),D){Promise.resolve(onMeetingMessage(r)).catch(e=>{console.warn(`[EchoWorld] 会议发言未送达`,e),Se(`这句话没有传到圆桌上，请再试一次`)});return}let i=n.filter(e=>M.has(e.id));if(i.length===0)return;let a=i[j%i.length],o=a.conversation.replies[j%a.conversation.replies.length];j+=1,ke(a.id,`thinking`,{source:`roundtable-listening`,duration:1}),window.setTimeout(()=>{O&&(Be({personId:a.id,text:o}),ke(a.id,De(o),{source:`roundtable-reply`,text:o,duration:4.5}),Ie())},620)}e.addEventListener(`click`,async e=>{let r=e.target.closest(`button, a`);if(r){if(r.dataset.sceneVariant){l(r.dataset.sceneVariant);return}if(r.dataset.characterVariant){u(r.dataset.characterVariant);return}if(r.dataset.inspectorMode){let e=r.dataset.inspectorContext;(e===`world`||e===`map`)&&(ue[e]=r.dataset.inspectorMode===`edit`?`edit`:`profile`,e===`world`?Me():I());return}if(r.dataset.personExpression){ke(r.dataset.expressionPerson,r.dataset.personExpression,{source:`manual`,persistent:!0});return}if(r.dataset.action===`cancel-profile-edit`){let e=r.dataset.inspectorContext;ue[e]=`profile`,e===`world`?Me():I();return}if(r.dataset.action===`enter-cafe`){xe(`cafe`);return}if(r.dataset.action===`intro`){xe(`intro`);return}if(r.dataset.action===`open-map`){T=null,je(),I(),xe(`map`);return}if(r.dataset.action===`back-cafe`){xe(`cafe`);return}if(r.dataset.personId){if(r.dataset.personId===t.id)return;T=n.find(e=>e.id===r.dataset.personId)??null,je(),I();return}if(r.dataset.action===`close-map-person`){T=null,je(),I();return}if(r.dataset.action===`close-world-person`){w=null,Me();return}if(r.dataset.action===`locate-person`&&T){let e=T;w=e,d(e),xe(`cafe`),Me(),Se(`已在咖啡厅中定位 ${e.name}`);return}if(r.dataset.action===`close-meeting`){await ze();return}if(r.dataset.meetingPerson){let e=r.dataset.meetingPerson;M.has(e)?M.delete(e):M.size<5?M.add(e):Se(`圆桌最多再邀请 5 人`),Pe();return}if(r.dataset.action===`start-meeting`&&M.size>0){r.disabled=!0;try{let e=String(A??``).trim().slice(0,80)||null,t=await f([...M],e);M.clear(),t.forEach(e=>M.add(e)),O=!0,k=!1,A=e,j=0,ee.length=0,D?Be({system:!0,text:e?`议题「${e}」已定下，大家正在入座，讨论马上开始。`:`大家正在入座，讨论马上开始。`}):(Be({personId:[...M][0],text:`大家都到了。既然坐在同一张桌边，我们从最近发生的一件事开始吧。`}),ke([...M][0],`happy`,{source:`roundtable-opening`,duration:4.5})),Ie()}catch(e){console.error(e),r.disabled=!1,Se(e?.message||`圆桌暂时没有准备好`)}return}if(r.dataset.action===`end-meeting`){await ze();return}r.dataset.meetingTopic&&Ve(r.dataset.meetingTopic)}}),e.addEventListener(`input`,e=>{e.target.closest(`[data-meeting-topic-input]`)&&(A=e.target.value)}),e.addEventListener(`submit`,e=>{let t=e.target.closest(`[data-profile-form]`);if(t){e.preventDefault();let n=Object.fromEntries(new FormData(t).entries());Ae(t.dataset.profilePerson,n,t.dataset.profileContext);return}let n=e.target.closest(`[data-meeting-form]`);if(!n)return;e.preventDefault();let r=n.elements.message;Ve(r.value),r.value=``}),je(),Hy(e);let He=()=>{};if(typeof b?.subscribe==`function`){let e=b.subscribe((e,t={})=>{if(!e&&t.removed){Te(t.personId);return}we(e?.snapshot??e?.signal??e)});typeof e==`function`&&(He=e)}return{setWorldReady(t){C=!!t;let n=e.querySelector(`[data-action="enter-cafe"]`);n.disabled=!C,n.classList.toggle(`is-ready`,C)},setView:xe,selectWorldPerson(e){w=n.find(t=>t.id===e)??null,ue.world=`profile`,Me()},updateAgentState(e){e&&(N.set(e.personId,e),w?.id===e.personId&&Me(),T?.id===e.personId&&I())},setRoundtableNearby(){},setMeetingLive(e){D=!!e},openMeeting(e=[]){if(O||E||g!==`cafe`)return!1;E=!0,k=!1,A=null,M.clear();for(let t of e)n.some(e=>e.id===t)&&M.size<5&&M.add(t);return pe.classList.add(`has-meeting-sheet`),Pe(),!0},closeMeeting(){return!O&&(z(),!0)},requestCloseMeeting:ze,ingestMeetingMessage({personId:e,text:t}={}){return!O||!E||!n.find(t=>t.id===e)||!t?!1:(Be({personId:e,text:String(t)}),ke(e,De(String(t)),{source:`roundtable-live`,text:String(t),duration:4.5}),Ie(),!0)},meetingEnded(){return O?(O=!1,k=!0,E&&R(),!0):!1},showNpcConversation({speakerId:e,text:t,duration:r=4.5}){let i=n.find(t=>t.id===e);if(!i)return;ke(e,De(t),{source:`npc-conversation`,text:t,duration:r});let a=ve.querySelector(`[data-speech-person="${e}"]`);a||(a=document.createElement(`div`),a.className=`world-speech-bubble`,a.dataset.speechPerson=e,ve.append(a)),a.innerHTML=`<span>${i.name}</span><p>${By(t)}</p>`,a.classList.add(`is-visible`),P.add(e),window.clearTimeout(te.get(e)),te.set(e,window.setTimeout(()=>{a.classList.remove(`is-visible`),P.delete(e)},r*1e3))},positionSpeech(e,t,n,r){let i=ve.querySelector(`[data-speech-person="${e}"]`);if(!i)return;let a=window.innerWidth<=700,o=(a?Math.min(190,window.innerWidth*.52):Math.min(230,window.innerWidth*.42))*.5+12,s=Math.min(Math.max(t,o),window.innerWidth-o),c=Math.max(n,a?252:244);i.style.left=`${s}px`,i.style.top=`${c}px`,i.style.visibility=r?`visible`:`hidden`},showToast:Se,setPersonExpression:ke,setPersonSignal:Ee,getPersonSignal:Ce,getPersonExpression(e){return F.get(e)??`neutral`},get speechPersonIds(){return[...P]},get view(){return S},get isMeetingActive(){return O},get isMeetingSheetOpen(){return E},get isWorldReady(){return C},destroy(){He()}}}var ob={BookOpen:_v,Coffee:Ov,DoorOpen:Av,Eye:jv,Landmark:zv,MapPin:Kv,MessageCircle:qv,Sparkles:fy,Store:my,Users:Cy,X:Ey};function sb(e){return String(e??``).replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&#039;`)}function cb(e){return`<i data-lucide="${e||`sparkles`}"></i>`}function lb(e){Dy({icons:ob,root:e,attrs:{"stroke-width":1.8}})}function ub({root:e=document.body,onAction:t=async()=>null}={}){let n=typeof window.matchMedia==`function`&&window.matchMedia(`(pointer: coarse)`).matches,r=document.createElement(`div`);r.className=`scene-interaction`,r.innerHTML=`
    <button class="scene-interaction-prompt" type="button" aria-hidden="true">
      ${n?`<span class="scene-interaction-touch-badge">点按</span>`:`<kbd>E / F</kbd>`}
      <span><small>附近可互动</small><strong></strong></span>
    </button>
    <aside class="scene-interaction-sheet" aria-hidden="true" aria-label="场景互动"></aside>`,e.append(r);let i=r.querySelector(`.scene-interaction-prompt`),a=r.querySelector(`.scene-interaction-sheet`),o=null,s=!1,c=!1;function l(e=o,t=null){if(!e)return;let n=t?.actions??e.actions??[];a.innerHTML=`
      <header>
        <span class="scene-interaction-symbol">${cb(t?.icon??e.icon??`sparkles`)}</span>
        <div>
          <small>${sb(t?.eyebrow??e.eyebrow??`场景互动`)}</small>
          <h2>${sb(t?.title??e.title)}</h2>
        </div>
        <button type="button" class="scene-interaction-close" data-scene-close title="关闭" aria-label="关闭场景互动">${cb(`x`)}</button>
      </header>
      <p>${sb(t?.detail??e.detail??e.prompt)}</p>
      ${n.length?`<div class="scene-interaction-actions">
        ${n.map(e=>`
          <button type="button" data-scene-action="${sb(e.id)}" ${c?`disabled`:``}>
            ${cb(e.icon??`sparkles`)}
            <span><strong>${sb(e.label)}</strong>${e.description?`<small>${sb(e.description)}</small>`:``}</span>
          </button>`).join(``)}
      </div>`:``}`,lb(a)}function u(e){if(o=e??null,s)return;let t=!!o;i.setAttribute(`aria-hidden`,String(!t)),o&&(i.querySelector(`strong`).textContent=o.prompt??o.title,i.querySelector(`small`).textContent=o.eyebrow??`附近可互动`)}function d(){return!o||c?!1:(s=!0,l(),a.setAttribute(`aria-hidden`,`false`),i.setAttribute(`aria-hidden`,`true`),!0)}function f(){s=!1,a.setAttribute(`aria-hidden`,`true`),a.innerHTML=``,i.setAttribute(`aria-hidden`,String(!o))}async function p(){let e=o?.directActionId;if(!e||c||!o)return!1;c=!0;try{let n=await t(o,e);n?.close?f():n&&h(n)}catch(e){console.error(e),h({eyebrow:`互动没有完成`,title:`这里暂时没有回应`,detail:`世界状态没有成功保存，请稍后再试。`,icon:`message-circle`,actions:[]})}finally{c=!1}return!0}function m(){return o?.directActionId?(p(),!0):d()}function h(e){o&&(s=!0,l(o,e),a.setAttribute(`aria-hidden`,`false`),i.setAttribute(`aria-hidden`,`true`))}return i.addEventListener(`click`,m),a.addEventListener(`click`,async e=>{if(e.target.closest(`[data-scene-close]`)){f();return}let n=e.target.closest(`[data-scene-action]`);if(!(!n||c||!o)){c=!0,n.disabled=!0;try{let e=await t(o,n.dataset.sceneAction);c=!1,e?.close?f():e&&h(e)}catch(e){console.error(e),c=!1,h({eyebrow:`互动没有完成`,title:`这里暂时没有回应`,detail:`世界状态没有成功保存，请稍后再试。`,icon:`message-circle`,actions:[]})}finally{c=!1}}}),{setNearby:u,open:d,close:f,showNarrative:h,handleKey(e){return![`KeyE`,`KeyF`].includes(e.code)||e.repeat||e.target.closest?.(`input, textarea, select`)?!1:(s?f():m(),!!o)},get nearby(){return o},get isOpen(){return s},destroy(){r.remove()}}}var db=Object.freeze({IDLE:`idle`,CONNECTING:`connecting`,LIVE:`live`,REPLAYING:`replaying`,DEGRADED:`degraded`,CLOSED:`closed`}),fb=Object.freeze({idle:`未连接`,connecting:`连接中`,live:`实时在线`,replaying:`补拉事件`,degraded:`轮询模式`,closed:`已离开`}),pb=Object.freeze({baseMs:600,factor:2,maxMs:1e4,jitterRatio:.25});function mb(e,t={}){let{baseMs:n,factor:r,maxMs:i,jitterRatio:a}={...pb,...t},o=typeof t.random==`function`?t.random:Math.random,s=Math.min(i,n*r**Math.max(0,e)),c=s*a*o();return Math.round(s+c)}function hb(e){return!e||typeof e!=`object`?null:e.schema===`meetmind.event.v1`?typeof e.event_id!=`string`||e.event_id.length===0||typeof e.type!=`string`||e.type.length===0||typeof e.room_id!=`string`||e.room_id.length===0||!Number.isInteger(e.sequence)||e.sequence<1?(console.warn(`[RoomClient] 丢弃缺字段的事件`,e),null):e:(console.warn(`[RoomClient] 丢弃未知 schema 的事件：${e.schema??`unknown`}`),null)}function gb(e){let t=null;try{t=JSON.parse(e)}catch{return console.warn(`[RoomClient] 丢弃无法解析的 WS 帧`),{kind:`unknown`}}if(!t||typeof t!=`object`)return{kind:`unknown`};if(t.protocol!==`meetmind.rooms.v1`)return console.warn(`[RoomClient] 丢弃未知协议的 WS 帧：${t.protocol??`unknown`}`),{kind:`unknown`};if(t.type===`event`){let e=hb(t.event);return e?{kind:`event`,event:e}:{kind:`unknown`}}return t.type===`error`?{kind:`error`,code:String(t.error?.code??`unknown`),message:String(t.error?.message??``)}:{kind:`unknown`}}var _b=class{constructor(e=0){this.current=Number.isInteger(e)&&e>0?e:0}isDuplicate(e){return e<=this.current}hasGap(e){return e>this.current+1}advance(e){return e>this.current&&(this.current=e,!0)}};function vb(){let e=globalThis.crypto;return typeof e?.randomUUID==`function`?`cmd_${e.randomUUID()}`:`cmd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,12)}`}function yb(e,t,n){let r=globalThis.location?.href??`http://127.0.0.1/`,i=new URL(e,r);return i.protocol=i.protocol===`https:`?`wss:`:`ws:`,i.pathname=`${i.pathname.replace(/\/+$/,``)}/${encodeURIComponent(t)}/stream`,i.search=`?after_sequence=${Math.max(0,n)}`,i.toString()}var bb=class{constructor({baseUrl:e=`/api/v1/rooms`,streamUrlFactory:t=null,fetchImpl:n=null,WebSocketImpl:r=void 0,wsOpenTimeoutMs:i=4e3,pollMs:a=1e3,presenceMs:o=220,upgradeRetryMs:s=15e3,backoff:c={},onEvent:l=null,onStateChange:u=null,onMembersChange:d=null,onError:f=null}={}){this.baseUrl=e.replace(/\/+$/,``),this.streamUrlFactory=t??((e,t)=>yb(this.baseUrl,e,t)),this.fetchImpl=n??globalThis.fetch?.bind(globalThis),this.WebSocketImpl=r===void 0?globalThis.WebSocket??null:r,this.wsOpenTimeoutMs=i,this.pollMs=Math.max(400,a),this.presenceMs=Math.max(120,o),this.upgradeRetryMs=Math.max(5e3,s),this.backoff={...pb,...c},this.onEvent=l,this.onStateChange=u,this.onMembersChange=d,this.onError=f,this.state=db.IDLE,this.roomId=null,this.memberId=null,this.displayName=null,this.readOnly=!1,this.cursor=new _b(0),this.members=new Map,this.roomState={name:``,meeting:null,icebreaker:null,invitations:[],bulletins:[]},this.lastEventAt=0,this._stopped=!0,this._ws=null,this._wsOpenTimer=null,this._reconnectTimer=null,this._pollTimer=null,this._presenceTimer=null,this._upgradeTimer=null,this._reconnectAttempt=0,this._catchUpPromise=null,this._pendingEvents=[],this._lastSentPresence=null,this._presenceBeat=0}async _request(e,t={}){if(!this.fetchImpl)throw Error(`当前环境没有 fetch，无法连接现场房间`);let n=await this.fetchImpl(`${this.baseUrl}${e}`,{...t,headers:{"Content-Type":`application/json`,...t.headers??{}}}),r=null;try{r=await n.json()}catch{r=null}if(!n.ok){let e=r?.detail,t=Error(e?.message??`房间请求失败（HTTP ${n.status}）`);throw t.status=n.status,t.code=e?.code??null,t}return r}createRoom({roomId:e=null,name:t,hotspots:n=null}){let r={name:t};return e&&(r.room_id=e),Array.isArray(n)&&(r.hotspots=n),this._request(``,{method:`POST`,body:JSON.stringify(r)})}async fetchSnapshot(e=this.roomId){let t=await this._request(`/${encodeURIComponent(e)}/snapshot`);if(t?.schema!==`meetmind.room-snapshot.v1`)throw Error(`房间快照版本不兼容：${t?.schema??`unknown`}`);return t}async fetchEvents(e=this.cursor.current,t=200,n=this.roomId){let r=await this._request(`/${encodeURIComponent(n)}/events?after_sequence=${Math.max(0,e)}&limit=${t}`);return(Array.isArray(r?.events)?r.events:[]).map(hb).filter(Boolean)}fetchBrief(e=0,t=this.roomId){return this._request(`/${encodeURIComponent(t)}/brief?after_sequence=${Math.max(0,e)}`)}async sendCommand(e,t={},{commandId:n=null}={}){if(!this.roomId||!this.memberId)throw Error(`尚未加入房间，无法发送命令`);let r=await this._request(`/${encodeURIComponent(this.roomId)}/commands`,{method:`POST`,body:JSON.stringify({command_id:n??vb(),actor_id:this.memberId,type:e,payload:t})});return Array.isArray(r?.events)&&r.events.length&&this._ingestEvents(r.events.map(hb).filter(Boolean)),r}moveTo(e,t){return this.sendCommand(`member.move`,{x:e,z:t})}interactHotspot(e,t){return this.sendCommand(`hotspot.interact`,{hotspot_id:e,action:t})}inviteMeeting({hotspotId:e=`roundtable`,participantIds:t,topic:n=``,invitationId:r=null}={}){return this.sendCommand(`meeting.invite`,{hotspot_id:e,participant_ids:t,topic:n,...r?{invitation_id:r}:{}})}respondMeeting(e,t){return this.sendCommand(`meeting.respond`,{invitation_id:e,response:t})}startMeeting(e,t=null){return this.sendCommand(`meeting.start`,{invitation_id:e,...t?{meeting_id:t}:{}})}endMeeting(e=null){return this.sendCommand(`meeting.end`,e?{meeting_id:e}:{})}async connect({roomId:e,memberId:t=null,displayName:n=``,position:r=null,readOnly:i=!1}={}){this.close(),this._stopped=!1,this.roomId=e,this.memberId=t,this.displayName=n||t||`大屏`,this.readOnly=i||!t,this.cursor=new _b(0),this.members.clear(),this._setState(db.CONNECTING);try{this.readOnly||await this._request(`/${encodeURIComponent(e)}/join`,{method:`POST`,body:JSON.stringify({member_id:t,display_name:this.displayName,position:r??{x:0,z:0}})}),await this._syncFromSnapshot()}catch(e){throw this.close(),e}return this._openStream(),this.snapshotInfo()}snapshotInfo(){return{roomId:this.roomId,name:this.roomState.name,memberId:this.memberId,readOnly:this.readOnly,sequence:this.cursor.current,state:this.state}}close(){if(this._stopped=!0,this._clearTimers(),this._ws){try{this._ws.onopen=null,this._ws.onmessage=null,this._ws.onerror=null,this._ws.onclose=null,this._ws.close()}catch{}this._ws=null}this.state!==db.IDLE&&this._setState(db.CLOSED),this.roomId=null,this.memberId=null,this.members.clear(),this._lastSentPresence=null}_clearTimers(){for(let e of[`_wsOpenTimer`,`_reconnectTimer`,`_pollTimer`,`_presenceTimer`,`_upgradeTimer`])clearTimeout(this[e]),clearInterval(this[e]),this[e]=null}_setState(e){this.state!==e&&(this.state=e,this.onStateChange?.(e))}_reportError(e){this.onError?this.onError(e):console.warn(`[RoomClient]`,e)}async _syncFromSnapshot(){let e=await this.fetchSnapshot();this.roomState.name=e.name??this.roomId,this.roomState.meeting=e.meeting??null,this.roomState.icebreaker=e.icebreaker??null,this.roomState.invitations=Array.isArray(e.invitations)?e.invitations:[],this.roomState.bulletins=Array.isArray(e.bulletins)?e.bulletins:[];for(let t of Array.isArray(e.members)?e.members:[])t?.member_id&&this.members.set(t.member_id,{memberId:t.member_id,displayName:t.display_name??t.member_id,x:Number(t.position?.x??0),z:Number(t.position?.z??0)});this.cursor.advance(e.sequence??0),this._emitMembers()}_openStream(){if(this._stopped)return;if(typeof this.WebSocketImpl!=`function`){this._enterDegraded();return}this._setState(db.CONNECTING);let e=!1,t=null;try{t=new this.WebSocketImpl(this.streamUrlFactory(this.roomId,this.cursor.current))}catch(e){console.warn(`[RoomClient] WebSocket 建立失败，降级为轮询`,e),this._enterDegraded();return}this._ws=t,this._wsOpenTimer=setTimeout(()=>{if(!e){e=!0;try{t.close()}catch{}console.warn(`[RoomClient] WebSocket 握手超时，降级为轮询`),this._ws=null,this._enterDegraded()}},this.wsOpenTimeoutMs),t.onopen=()=>{this._stopped||this._ws!==t||(e=!0,clearTimeout(this._wsOpenTimer),this._wsOpenTimer=null,this._reconnectAttempt=0,this._setState(db.LIVE))},t.onmessage=e=>{if(this._stopped||this._ws!==t)return;let n=gb(e.data);n.kind===`event`?this._ingestEvents([n.event]):n.kind===`error`&&this._reportError(Error(`房间事件流错误：${n.code} ${n.message}`))},t.onerror=()=>{e||(e=!0,clearTimeout(this._wsOpenTimer),this._wsOpenTimer=null)},t.onclose=()=>{if(!(this._stopped||this._ws!==t)){if(this._ws=null,clearTimeout(this._wsOpenTimer),this._wsOpenTimer=null,!e){this._enterDegraded();return}this._scheduleReconnect()}}}_scheduleReconnect(){if(this._stopped)return;this._setState(db.CONNECTING);let e=mb(this._reconnectAttempt,this.backoff);this._reconnectAttempt+=1,this._reconnectTimer=setTimeout(()=>{this._reconnectTimer=null,!this._stopped&&this._catchUp().finally(()=>{this._stopped||this._openStream()})},e)}_enterDegraded(){if(this._stopped)return;this._setState(db.DEGRADED),clearTimeout(this._pollTimer);let e=async()=>{if(!(this._stopped||this.state!==db.DEGRADED)){try{await this._catchUp(),this._reconnectAttempt=0}catch(e){this._reportError(e)}!this._stopped&&this.state===db.DEGRADED&&(this._pollTimer=setTimeout(e,this.pollMs))}};e(),clearInterval(this._upgradeTimer),this._upgradeTimer=setInterval(()=>{this._stopped||this.state!==db.DEGRADED||(clearTimeout(this._pollTimer),this._openStream())},this.upgradeRetryMs)}_catchUp(){if(this._catchUpPromise)return this._catchUpPromise;let e=this.state;return this._setState(db.REPLAYING),this._catchUpPromise=(async()=>{for(let e=0;e<10;e+=1){let e=await this.fetchEvents(this.cursor.current);if(e.length===0||(this._ingestEvents(e),e.length<200))break}await this._syncFromSnapshot()})().finally(()=>{this._catchUpPromise=null,!this._stopped&&this.state===db.REPLAYING&&this._setState(e===db.DEGRADED?db.DEGRADED:db.LIVE),this._drainPending()}),this._catchUpPromise}_drainPending(){if(this._pendingEvents.length===0)return;let e=this._pendingEvents;this._pendingEvents=[],this._ingestEvents(e)}_ingestEvents(e){let t=[];for(let n of Array.isArray(e)?e:[])!n||!Number.isInteger(n.sequence)||n.room_id===this.roomId&&(this.cursor.isDuplicate(n.sequence)||t.push(n));if(t.length===0)return;let n=[...this._pendingEvents,...t].sort((e,t)=>e.sequence-t.sequence);this._pendingEvents=[];for(let e=0;e<n.length;e+=1){let t=n[e];if(!this.cursor.isDuplicate(t.sequence)){if(this.cursor.hasGap(t.sequence)){this._pendingEvents=n.slice(e),this._catchUpPromise||this._catchUp().catch(e=>this._reportError(e));break}this.cursor.advance(t.sequence),this._applyEvent(t)}}}_applyEvent(e){if(this.lastEventAt=Date.now(),e.type===`member.joined`){let t=e.payload?.member;t?.member_id&&(this.members.set(t.member_id,{memberId:t.member_id,displayName:t.display_name??t.member_id,x:Number(t.position?.x??0),z:Number(t.position?.z??0)}),this._emitMembers())}else if(e.type===`member.moved`){let t=e.payload?.member_id,n=this.members.get(t);n&&(n.x=Number(e.payload?.position?.x??n.x),n.z=Number(e.payload?.position?.z??n.z),this._emitMembers())}else e.type===`meeting.invited`?this.roomState.invitations=[...this.roomState.invitations.filter(t=>t.invitation_id!==e.payload?.invitation_id),e.payload]:e.type===`meeting.invitation-responded`?this.roomState.invitations=this.roomState.invitations.map(t=>t.invitation_id===e.payload?.invitation_id?{...t,status:e.payload?.status??t.status,responses:{...t.responses??{},[e.payload?.member_id]:e.payload?.response}}:t):e.type===`meeting.started`?this.roomState.meeting=e.payload??null:e.type===`meeting.ended`?this.roomState.meeting=null:e.type===`bulletin.published`?this.roomState.bulletins=[...this.roomState.bulletins,e.payload]:e.type===`icebreaker.started`?this.roomState.icebreaker=e.payload??null:e.type===`icebreaker.finished`&&(this.roomState.icebreaker=e.payload??this.roomState.icebreaker);this.onEvent?.(e)}presenceParticipants(){return[...this.members.values()].map(e=>({person_id:e.memberId,display_name:e.displayName,online:!0,presence:{x:e.x,z:e.z,yaw:0}}))}_emitMembers(){this.onMembersChange?.(this.presenceParticipants())}startPresence(e){this.stopPresence(),!(this.readOnly||typeof e!=`function`)&&(this._presenceTimer=setInterval(()=>{if(this._stopped||!this.roomId||!this.memberId)return;let t=e();if(!t||!Number.isFinite(t.x)||!Number.isFinite(t.z))return;let n=this._lastSentPresence;this._presenceBeat+=1;let r=!n||Math.hypot(t.x-n.x,t.z-n.z)>.02,i=this._presenceBeat%14==0;!r&&!i||(this._lastSentPresence={x:t.x,z:t.z},this.moveTo(t.x,t.z).catch(e=>this._reportError(e)))},this.presenceMs))}stopPresence(){clearInterval(this._presenceTimer),this._presenceTimer=null,this._lastSentPresence=null}},xb={Copy:kv,DoorOpen:Av,Loader:Hv,LogIn:Gv,MonitorPlay:Yv,Play:ty,Radio:iy,Square:py,Users:Cy,X:Ey},Sb=`echoworld.v1RoomMemberId`;function Cb(e){return String(e??``).replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&#039;`)}function wb(e){return[...String(e??`?`)].slice(-2).join(``).toUpperCase()}function Tb(){try{let e=window.localStorage.getItem(Sb);if(e)return e;let t=`member-${crypto.randomUUID().slice(0,8)}`;return window.localStorage.setItem(Sb,t),t}catch{return`member-${Math.random().toString(36).slice(2,10)}`}}function Eb(e,t){let n=t(e.actor_id);switch(e.type){case`room.created`:return`房间已建立`;case`member.joined`:return`${t(e.payload?.member?.member_id)} 进入了现场`;case`member.moved`:return null;case`hotspot.interacted`:return`${n} 触发了热点「${e.payload?.hotspot_id}」`;case`meeting.invited`:return`${n} 发起了圆桌邀请`;case`meeting.invitation-responded`:return`${t(e.payload?.member_id)} ${e.payload?.response===`accepted`?`接受`:`谢绝`}了圆桌邀请`;case`meeting.started`:return`圆桌会议开始：${e.payload?.topic??``}`;case`meeting.ended`:return`圆桌会议结束`;case`bulletin.published`:return`世界播报：${e.payload?.text??``}`;case`icebreaker.requested`:return`${n} 想玩一轮破冰`;case`icebreaker.started`:return`破冰开始`;case`icebreaker.finished`:return`破冰完成，互动已回流`;case`memory.updated`:return`互动数据已回流到推断层`;default:return e.type}}function Db(e,{baseUrl:t=`/api/v1`,currentUser:n=null,screenMode:r=!1,screenRoomId:i=null,getLocalPresence:a=null,onRemotePresence:o=null,onToast:s=null}={}){let c=new bb({baseUrl:`${t}/rooms`,onEvent:g,onStateChange:()=>E(),onMembersChange:e=>{o?.(e,c.memberId),E()},onError:e=>m(e.message)}),l=new Map,u=[],d=!1,f=!1,p=!1;function m(e){e&&typeof s==`function`&&s(e)}function h(e){return e?e===c.memberId?`你`:l.get(e)??e:`系统`}function g(e){for(let e of c.members.values())l.set(e.memberId,e.displayName);let t=Eb(e,h);t&&(u.push({sequence:e.sequence,text:t}),u.length>30&&u.shift(),E())}let _=document.createElement(`div`);_.className=`room-screen-chip`,_.hidden=!0,e.append(_);function v(){if(!r)return;_.hidden=!1;let e=fb[c.state]??c.state;_.innerHTML=`
      <i data-lucide="monitor-play"></i>
      <span><strong>${Cb(c.roomState.name||i||`等待房间`)}</strong>
      <small>${Cb(e)} · ${c.members.size} 人在场 · seq ${c.cursor.current}</small></span>`,Dy({icons:xb,root:_,attrs:{"stroke-width":1.8}})}let y=document.createElement(`button`);y.className=`room-fab`,y.type=`button`,y.hidden=!0,y.setAttribute(`aria-label`,`进入 v1 联机房间`),y.title=`进入 v1 联机房间`,y.innerHTML=`<i data-lucide="radio"></i><span><small>跨设备实时</small><strong>联机房间</strong></span>`,e.append(y);let b=document.createElement(`section`);b.className=`room-overlay`,b.setAttribute(`aria-hidden`,`true`),b.innerHTML=`
    <header class="room-header">
      <div class="room-brand"><i data-lucide="radio"></i><strong>联机房间</strong><span class="room-version">v1 · 有序事件流</span></div>
      <div class="room-meta" aria-live="polite"></div>
      <button class="room-icon-button room-close" type="button" aria-label="收起联机房间" title="收起联机房间">
        <i data-lucide="x"></i>
      </button>
    </header>
    <main class="room-main" aria-live="polite"></main>`,document.body.append(b);let x=b.querySelector(`.room-main`),S=b.querySelector(`.room-meta`);function C(){b.classList.add(`is-open`),b.setAttribute(`aria-hidden`,`false`),P()}function w(){b.classList.remove(`is-open`),b.setAttribute(`aria-hidden`,`true`)}function T(){let e=fb[c.state]??c.state;return`<span class="room-state ${c.state===db.LIVE?`is-live`:``}"><i></i>${Cb(e)}</span>`}function E(){v(),f&&(S.innerHTML=`
      ${T()}
      <span>${Cb(c.roomState.name)} · ${c.members.size} 人</span>`,b.classList.contains(`is-open`)&&P())}function D(){x.innerHTML=`
      <div class="room-lobby">
        <div class="room-kicker">LIVE ROOM · V1</div>
        <h1>同一个现场，同一个世界</h1>
        <p class="room-hint">v1 房间由后端确定性服务承载：WebSocket 有序事件流，断线自动按序号补拉；代理不支持 WebSocket 时自动降级轮询。</p>
        <form class="room-form" data-form="create">
          <label class="room-field"><span>房间名称</span>
            <input name="name" maxlength="60" value="今晚的回声现场" autocomplete="off" />
          </label>
          <label class="room-field"><span>房间码（可选，留空自动生成）</span>
            <input name="roomId" maxlength="40" autocomplete="off" placeholder="例如 demo-night" />
          </label>
          <label class="room-field"><span>你的名字</span>
            <input name="displayName" maxlength="40" value="${Cb(n?.name??``)}" autocomplete="off" />
          </label>
          <button class="room-primary" type="submit"><i data-lucide="door-open"></i><span>建立联机房间</span></button>
        </form>
        <div class="room-join-band">
          <form class="room-form" data-form="join">
            <label class="room-field"><span>加入已有房间</span>
              <input name="roomId" maxlength="40" autocomplete="off" placeholder="房间码 / 房间 ID" value="${Cb(i??``)}" />
            </label>
            <label class="room-field"><span>你的名字</span>
              <input name="displayName" maxlength="40" value="${Cb(n?.name??``)}" autocomplete="off" />
            </label>
            <button class="room-secondary" type="submit"><i data-lucide="log-in"></i><span>加入</span></button>
          </form>
        </div>
      </div>`}function O(){let e=c.roomState.meeting,t=c.roomState.invitations.filter(e=>e.status===`invited`||e.status===`accepted`);if(e){let t=e.organizer_id===c.memberId;return`
        <section class="room-meeting">
          <div class="room-section-label">圆桌进行中</div>
          <p><strong>${Cb(e.topic)}</strong> · ${e.participant_ids?.length??0} 人</p>
          ${t?`<button class="room-secondary" type="button" data-action="end-meeting"><i data-lucide="square"></i><span>结束会议</span></button>`:``}
        </section>`}return`
      <section class="room-meeting">
        <div class="room-section-label">圆桌会议</div>
        ${t.map(e=>{let t=e.organizer_id===c.memberId,n=e.participant_ids?.includes(c.memberId),r=e.responses?.[c.memberId],i=t&&e.status===`accepted`;return`
        <div class="room-invitation">
          <span><strong>${Cb(h(e.organizer_id))}</strong> 邀请 ${e.participant_ids?.length??0} 人圆桌「${Cb(e.topic)}」<small>${Cb(e.status)}</small></span>
          <span class="room-invitation-actions">
            ${n&&!r?`
              <button class="room-mini" type="button" data-action="accept" data-invitation-id="${Cb(e.invitation_id)}">接受</button>
              <button class="room-mini is-quiet" type="button" data-action="decline" data-invitation-id="${Cb(e.invitation_id)}">谢绝</button>`:``}
            ${i?`<button class="room-mini" type="button" data-action="start-meeting" data-invitation-id="${Cb(e.invitation_id)}"><i data-lucide="play"></i>开始</button>`:``}
          </span>
        </div>`}).join(``)||`<p class="room-quiet">还没有会议邀请。</p>`}
        <button class="room-secondary" type="button" data-action="invite-all"><i data-lucide="users"></i><span>邀请在场所有人圆桌</span></button>
      </section>`}function k(){let e=[...c.members.values()];x.innerHTML=`
      <div class="room-roster-block">
        <div class="room-section-label">${e.length} 人在场</div>
        <div class="room-roster">
          ${e.map(e=>`
            <div class="room-person ${e.memberId===c.memberId?`is-viewer`:``}">
              <span class="room-avatar">${Cb(wb(e.displayName))}</span>
              <span class="room-person-copy"><strong>${Cb(e.displayName)}</strong>
              <small>(${e.x.toFixed(1)}, ${e.z.toFixed(1)})${e.memberId===c.memberId?` · 本机`:``}</small></span>
              <span class="room-online-dot"></span>
            </div>`).join(``)}
        </div>
        <div class="room-code-row">
          <span><small>房间码</small><strong>${Cb(c.roomId)}</strong></span>
          <button class="room-icon-button" type="button" data-action="copy" aria-label="复制房间链接" title="复制房间链接"><i data-lucide="copy"></i></button>
        </div>
      </div>
      ${O()}
      <div class="room-events">
        <div class="room-section-label">有序事件</div>
        ${u.length?u.slice(-6).reverse().map(e=>`
            <div class="room-event"><em>#${e.sequence}</em><span>${Cb(e.text)}</span></div>`).join(``):`<p class="room-quiet">事件会按服务端顺序出现在这里。</p>`}
      </div>
      <button class="room-secondary room-leave" type="button" data-action="leave"><i data-lucide="x"></i><span>离开房间</span></button>`}function A(){b.querySelector(`[data-form="create"]`)?.addEventListener(`submit`,ee),b.querySelector(`[data-form="join"]`)?.addEventListener(`submit`,te),b.querySelector(`[data-action="copy"]`)?.addEventListener(`click`,async()=>{let e=new URL(window.location.href);e.searchParams.set(`room`,c.roomId),e.searchParams.delete(`role`);try{await navigator.clipboard.writeText(e.toString()),m(`房间链接已复制`)}catch{m(`房间码：${c.roomId}`)}}),b.querySelector(`[data-action="leave"]`)?.addEventListener(`click`,()=>{c.close(),f=!1,o?.([],null),P()}),b.querySelector(`[data-action="invite-all"]`)?.addEventListener(`click`,()=>M(async()=>{let e=[...c.members.keys()].filter(e=>e!==c.memberId);if(e.length<1)throw Error(`房间里还没有其他成员`);await c.inviteMeeting({participantIds:e,topic:`现场圆桌`}),m(`圆桌邀请已发出`)}));for(let e of b.querySelectorAll(`[data-action="accept"], [data-action="decline"]`))e.addEventListener(`click`,()=>M(()=>c.respondMeeting(e.dataset.invitationId,e.dataset.action===`accept`?`accepted`:`declined`)));b.querySelector(`[data-action="start-meeting"]`)?.addEventListener(`click`,e=>M(()=>c.startMeeting(e.currentTarget.dataset.invitationId))),b.querySelector(`[data-action="end-meeting"]`)?.addEventListener(`click`,()=>M(()=>c.endMeeting()))}function j(e){p=e,b.classList.toggle(`is-busy`,e)}async function M(e){if(!p){j(!0);try{await e()}catch(e){m(e.message)}finally{j(!1)}}}async function N(e,t,{create:r=!1,name:i=``}={}){if(!p){if(!e){m(`请填写房间码`);return}j(!0);try{r&&await c.createRoom({roomId:e||null,name:i||e}),await c.connect({roomId:e,memberId:Tb(),displayName:t||n?.name||`现场伙伴`,position:typeof a==`function`?a():null}),f=!0,c.startPresence(()=>a?.()),o?.(c.presenceParticipants(),c.memberId),m(r?`房间 ${c.roomId} 已建立`:`已加入房间 ${c.roomId}`),E(),P()}catch(e){m(e.message)}finally{j(!1)}}}function ee(e){e.preventDefault();let t=new FormData(e.currentTarget);N(String(t.get(`roomId`)??``).trim()||`room-${crypto.randomUUID().slice(0,8)}`,String(t.get(`displayName`)??``).trim(),{create:!0,name:String(t.get(`name`)??``).trim()})}function te(e){e.preventDefault();let t=new FormData(e.currentTarget);N(String(t.get(`roomId`)??``).trim(),String(t.get(`displayName`)??``).trim())}function P(){f?k():D(),Dy({icons:xb,root:b,attrs:{"stroke-width":1.8}}),A()}y.addEventListener(`click`,C),b.querySelector(`.room-close`).addEventListener(`click`,w),Dy({icons:xb,root:y,attrs:{"stroke-width":1.8}}),Dy({icons:xb,root:b.querySelector(`.room-header`),attrs:{"stroke-width":1.8}});async function ne(){try{d=(await fetch(`${t}/scenes/modules`)).ok}catch{d=!1}if(r){d&&i&&c.connect({roomId:i,readOnly:!0}).then(()=>o?.(c.presenceParticipants(),null)).catch(e=>m(e.message)),v();return}y.hidden=!d,d||console.info(`[RoomPanel] 后端未提供 v1 房间（/api/v1/scenes/modules 不可达），面板保持隐藏，v0 现场房间不受影响`)}return ne(),{open:C,close:w,client:c,isAvailable:()=>d,isJoined:()=>f}}var Ob={BookmarkPlus:vv,Clock3:Ev,Info:Rv,Lightbulb:Bv,MapPin:Kv,MessageCircle:qv,Mic:Jv,Quote:ry,Send:ly,ShieldCheck:uy,Sparkles:fy,Tag:hy,UserRoundCheck:xy,Users:Cy,X:Ey},kb={"self-only":{level:`L1`,label:`仅自己可见`},"agent-usable":{level:`L2`,label:`Agent 可用`},"org-shared":{level:`L3`,label:`组织内共享`},"public-approved":{level:`L4`,label:`已授权公开`}},Ab=[{key:`interest`,title:`兴趣标签`,icon:`tag`},{key:`need`,title:`需求判断`,icon:`lightbulb`},{key:`relation`,title:`关系推测`,icon:`users`},{key:`other`,title:`其他认知`,icon:`sparkles`}],jb=[`周日`,`周一`,`周二`,`周三`,`周四`,`周五`,`周六`];function Mb(e){return String(e??``).replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&#039;`)}function Nb(e,t=``){return`<i data-lucide="${e}"${t?` class="${t}"`:``}></i>`}function Pb(e){return String(e).padStart(2,`0`)}function Fb(e){let t=new Date(e);return Number.isNaN(t.getTime())?String(e??`时间未知`):`${t.getFullYear()} 年 ${t.getMonth()+1} 月 ${t.getDate()} 日 · ${jb[t.getDay()]} ${Pb(t.getHours())}:${Pb(t.getMinutes())}`}function Ib(e){let t=new Date(e);return Number.isNaN(t.getTime())?`时间未知`:`${t.getFullYear()}.${Pb(t.getMonth()+1)}.${Pb(t.getDate())}`}function Lb(e){let t=String(e??``).toLowerCase();return t.includes(`interest`)?`interest`:t.includes(`need`)?`need`:t.includes(`relation`)?`relation`:`other`}function Rb(e,t){let n=document.createElement(`div`);n.className=`package-panel-layer`,n.setAttribute(`aria-hidden`,`true`),n.innerHTML=`
    <div class="pp-backdrop" data-pp-close aria-hidden="true"></div>
    <aside class="package-panel" role="dialog" aria-modal="true" aria-label="人物资料包" tabindex="-1">
      <button class="pp-close" type="button" data-pp-close title="关闭" aria-label="关闭资料包">${Nb(`x`)}</button>
      <div class="pp-body"></div>
    </aside>
    <div class="pp-toast" role="status" aria-live="polite"></div>`,e.append(n);let r=n.querySelector(`.package-panel`),i=n.querySelector(`.pp-body`),a=n.querySelector(`.pp-toast`),o=!1,s=null,c=0,l=null,u=new Map,d=new Map,f=!1,p=!1,m={"at-booth":`在自己的展位`,walking:`走动中`,seated:`已入座`,talking:`与人交谈中`,"in-meeting":`圆桌会议中`},h=null,g=null;function _(){let e=i.querySelector(`[data-pp-presence]`);if(!e)return;let t=o&&s&&typeof h==`function`?h(s):null,n=t?m[t.status??t.state]:null;if(!n){e.hidden=!0;return}e.hidden=!1,e.querySelector(`[data-pp-presence-text]`).textContent=n}function v(){y(),typeof h==`function`&&(g=window.setInterval(_,2e3))}function y(){window.clearInterval(g),g=null}function b(e){return e?typeof t?.resolveMediaUrl==`function`?t.resolveMediaUrl(e):String(e):``}let x=`onerror="this.onerror=null;this.src='${Mb(b(`portraits/person-self.png`))}'"`;function S(){Dy({icons:Ob,root:n,attrs:{"stroke-width":1.8}})}function C(e){window.clearTimeout(l),a.textContent=e,a.classList.add(`is-visible`),l=window.setTimeout(()=>a.classList.remove(`is-visible`),2400)}function w(){return`
      <div class="pp-skeleton" aria-label="资料包加载中">
        <div class="pp-sk-hero"><i></i><span><b></b><b></b><b></b></span></div>
        <div class="pp-sk-card"></div>
        <div class="pp-sk-card short"></div>
        <div class="pp-sk-card"></div>
      </div>`}function T(){return`
      <div class="pp-error">
        <strong>资料包暂时无法打开</strong>
        <p>网络或数据源出了点问题，请稍后重试。</p>
        <button type="button" data-pp-retry>重新加载</button>
      </div>`}function E(e,t,n){let r=e.facts??{},i=Array.isArray(r.photos)?r.photos:[],a=Array.isArray(r.media)?r.media:[],o=Array.isArray(r.speaker_audio)?r.speaker_audio:[],s=Array.isArray(r.conversation_recordings)?r.conversation_recordings:[],c=[...new Set([...o,...s,...a.filter(e=>/\.(m4a|wav|mp3|aac|ogg|flac)(\?|#|$)/i.test(String(e)))])],l=[...new Set(a.filter(e=>/\.(mp4|mov|webm)(\?|#|$)/i.test(String(e))))],u=r.face_summary??{},d=r.voice_summary??{},f=[].concat(e.highlights??e.key_points??e.talking_points??[]).filter(Boolean),p=kb[e.privacy],m=e.privacy===`agent-usable`,h=String(e.encounter_id??``).startsWith(`enc_k3_`);return`
      <article class="pp-encounter">
        <header class="pp-encounter-head">
          <span class="pp-encounter-no">${Pb(n-t)}</span>
          <div class="pp-encounter-title">
            <strong>${Mb(e.place??`未知地点`)}</strong>
            <small>${Nb(`clock-3`)}${Mb(Fb(e.time))}</small>
          </div>
          ${p?`<span class="pp-encounter-privacy" title="${p.level} · ${p.label}">${p.level}</span>`:``}
        </header>
        ${h?`<label class="pp-agent-toggle">
                <span>${Nb(`user-round-check`)}Agent 记忆</span>
                <input type="checkbox" data-pp-agent-memory="${Mb(e.encounter_id)}"${m?` checked`:``} />
                <i aria-hidden="true"></i>
              </label>`:``}
        ${i.length?`<div class="pp-photos">${i.map(e=>`<img src="${Mb(b(e))}" alt="相遇现场照片" loading="lazy" ${x} />`).join(``)}</div>`:``}
        ${f.length?`<ul class="pp-points">${f.map(e=>`<li>${Mb(e)}</li>`).join(``)}</ul>`:``}
        ${u.observation_count||d.turn_count?`<dl class="pp-evidence-summary">
                ${u.observation_count?`<div><dt>人脸观测</dt><dd>${Mb(u.observation_count)} 条${Number.isFinite(u.confidence)?` · ${Math.round(u.confidence*100)}%`:``}</dd></div>`:``}
                ${d.turn_count?`<div><dt>声纹归属</dt><dd>${Mb(d.identity_state??`已归属`)} · ${Number.isFinite(d.confidence)?`${Math.round(d.confidence*100)}%`:`待评估`}</dd></div>`:``}
              </dl>`:``}
        ${c.length||l.length||r.transcript?`<div class="pp-media">
                ${c.map(e=>{let t=s.includes(e);return`<figure class="pp-audio"><figcaption>${Nb(`mic`)}${t?`整段会话录音`:`说话人分段音频`}</figcaption><audio controls preload="metadata" src="${Mb(b(e))}"></audio></figure>`}).join(``)}
                ${l.map(e=>`<video class="pp-video" controls preload="metadata" src="${Mb(b(e))}"></video>`).join(``)}
                ${r.transcript?`<button type="button" class="pp-media-button" data-pp-open-media="${Mb(b(r.transcript))}">${Nb(`info`)}<span>转写全文</span></button>`:``}
              </div>`:``}
      </article>`}function D(e,t){let n=[];for(let t of Array.isArray(e.inferences)?e.inferences:[])n.push({inf:t,context:`来自人物综合视图`});for(let e of t)for(let t of Array.isArray(e.inferences)?e.inferences:[])n.push({inf:t,context:`来自相遇「${e.place??e.encounter_id??`未知地点`}」`});return n}function O({inf:e,context:t}){let n=Math.max(0,Math.min(100,Math.round((Number(e.confidence)||0)*100))),r=[`来源：${[].concat(e.source_facts??e.source??[]).filter(Boolean).join(`、`)||`相遇记录`}`,`模型：${e.model??`未知模型`} · 置信度 ${n}%`,`生成于：${Fb(e.created_at)}`,t].join(`
`);return`
      <li class="pp-inf-item" tabindex="0">
        <span class="pp-inf-main">
          <span class="pp-inf-value">${Mb(e.value??`未命名推断`)}</span>
          <i class="pp-inf-bar" style="--conf:${n}%"></i>
        </span>
        <span class="pp-inf-conf">${n}%</span>
        <span class="pp-inf-tip" role="tooltip">${Mb(r)}</span>
      </li>`}function k(e,t){let n=D(e,t),r=Ab.map(e=>({...e,items:n.filter(t=>Lb(t.inf.type)===e.key)})).filter(e=>e.items.length>0);return`
      <section class="pp-section pp-inference-section" aria-label="系统认知（AI 推断）">
        <div class="pp-section-head">
          <h3>${Nb(`sparkles`)}系统认知</h3>
          <span class="pp-section-tag pp-section-tag-ai">AI 推断 · 可随时重算</span>
        </div>
        <p class="pp-inference-note">${Nb(`info`)}<span>以下为模型推断，不属于事实记录，不会回写污染原始相遇；每条都标注置信度，悬停可查看来源与依据。</span></p>
        ${r.length?r.map(e=>`
              <div class="pp-inf-group">
                <h4>${Nb(e.icon)}${e.title}</h4>
                <ul class="pp-inf-list">${e.items.map(O).join(``)}</ul>
              </div>`).join(``):`<p class="pp-empty">推断层还没有内容。系统会在积累更多相遇后生成认知。</p>`}
      </section>`}function A(){return typeof t?.chatWithAgent==`function`}function j(e){return d.has(e)||d.set(e,[]),d.get(e)}function M(e,t){try{window.__echoWorld?.setExpression?.(e,t)}catch{}}function N(e,t){if(e.role===`user`)return`<div class="pp-chat-msg is-user"><p>${Mb(e.content)}</p></div>`;let n=(Array.isArray(e.cited_facts)?e.cited_facts:[]).filter(Boolean);return`
      <div class="pp-chat-msg is-assistant">
        <p>${Mb(e.content)}</p>
        <div class="pp-chat-msg-foot">
          ${n.length?`<span class="pp-chat-source" tabindex="0" title="来源：${Mb(n.join(`
`))}">${Nb(`quote`)}来源 ${n.length}</span>`:``}
          <button type="button" class="pp-chat-save" data-pp-chat-save="${t}" title="把这条记进 TA 的资料包（标注：来自玩家转述）">${Nb(`bookmark-plus`)}<span>记进资料包</span></button>
        </div>
      </div>`}function ee(){if(!f)return`<button type="button" class="pp-chat-open" data-pp-chat-open>${Nb(`message-circle`)}<span>和 TA 聊聊</span></button>`;let e=j(s),t=[...e].reverse().find(e=>e.role===`assistant`),n=p?[]:t?.suggestions??[];return`
      <div class="pp-chat-thread" data-pp-chat-thread aria-live="polite">
        ${e.length?e.map(N).join(``):`<p class="pp-chat-hint">挑一条下面的开场，或直接输入。</p>`}
        ${p?`<div class="pp-chat-msg is-assistant is-pending"><span class="pp-chat-dots" aria-hidden="true"><i></i><i></i><i></i></span><small>TA 正在想…</small></div>`:``}
      </div>
      ${n.length?`<div class="pp-chat-suggestions">${n.map(e=>`<button type="button" data-pp-chat-suggestion>${Mb(e)}</button>`).join(``)}</div>`:``}
      <form class="pp-chat-form" data-pp-chat-form>
        <input type="text" name="message" maxlength="500" placeholder="和 TA 说点什么…"
          autocomplete="off" ${p?`disabled`:``} />
        <button type="submit" aria-label="发送" title="发送" ${p?`disabled`:``}>${Nb(`send`)}</button>
      </form>`}function te(){let e=i.querySelector(`[data-pp-chat]`);if(!e)return;e.innerHTML=ee(),S();let t=e.querySelector(`[data-pp-chat-thread]`);t&&(t.scrollTop=t.scrollHeight)}async function P(e){let n=s,r=String(e??``).trim();if(!n||!r||p)return;let i=j(n),a=i.slice(-10).map(e=>({role:e.role,content:e.content}));i.push({role:`user`,content:r}),p=!0,M(n,`thinking`),te();try{let e=await t.chatWithAgent(n,r,a);i.push({role:`assistant`,content:String(e?.reply??``).trim()||`……`,cited_facts:Array.isArray(e?.cited_facts)?e.cited_facts:[],suggestions:Array.isArray(e?.suggestions)?e.suggestions:[]}),M(n,`happy`)}catch(e){console.error(`[package-panel] 单聊失败`,e),s===n&&C(`对话暂时连不上，稍后再试`)}finally{p=!1,s===n&&o&&te()}}async function ne(e){let n=s,r=j(n)[e];if(!(!r||r.role!==`assistant`)){if(typeof t?.saveChatNote!=`function`){C(`当前数据源不支持沉淀`);return}try{await t.saveChatNote(n,r.content),u.delete(n),C(`已记进资料包 · 标注：来自玩家转述`)}catch(e){console.error(`[package-panel] 沉淀失败`,e),C(`没存进去，稍后再试`)}}}function re(){return A()?`
      <section class="pp-section pp-chat-section" aria-label="和 TA 聊聊">
        <div class="pp-section-head">
          <h3>${Nb(`message-circle`)}和 TA 聊聊</h3>
          <span class="pp-section-tag pp-section-tag-ai">模拟分身 · 非真人</span>
        </div>
        <p class="pp-chat-note">${Nb(`info`)}<span>基于 TA 授权信息的模拟，不是真人；对话不会自动写入资料包，值得留的可以手动「记进资料包」。</span></p>
        <div class="pp-chat" data-pp-chat></div>
      </section>`:``}function ie(e){let t=e.identity??{},n=(Array.isArray(e.encounters)?[...e.encounters]:[]).sort((e,t)=>new Date(t.time)-new Date(e.time)),r=t.name??e.name??`未命名的人`,i=b(t.face_ref??e.avatar?.real_face_ref??e.portrait),a=t.confirmed!==!1,o=kb[e.privacy]??kb[n[0]?.privacy]??kb[`self-only`],s=t.headline??e.headline??e.bio??(n.length?`相识于 ${n[n.length-1].place??`一次现场相遇`}`:`一段等待被想起的关系`),c=n.reduce((e,t)=>e+(t.facts?.photos?.length??0),0),l=n.length?Ib(n[n.length-1].time):null,u=[`相遇 ${n.length} 次`,c?`现场照片 ${c} 张`:null,l?`首次相见 ${l}`:null].filter(Boolean).join(` · `);return`
      <header class="pp-hero">
        <div class="pp-hero-face">
          ${i?`<img src="${Mb(i)}" alt="${Mb(r)}的真实人脸照片" ${x} />`:`<span class="pp-hero-face-fallback">${Mb(r.slice(0,1))}</span>`}
          <span class="pp-hero-face-tag">真实人脸</span>
        </div>
        <div class="pp-hero-info">
          <span class="pp-eyebrow">人物资料包 · PERSON PACKAGE</span>
          <h2>${Mb(r)}</h2>
          <p class="pp-headline">${Mb(s)}</p>
          <p class="pp-presence" data-pp-presence hidden>
            <span class="pp-presence-dot" aria-hidden="true"></span>
            <span data-pp-presence-text></span>
          </p>
          <div class="pp-badges">
            <span class="pp-badge pp-badge-privacy">${Nb(`shield-check`)}${o.level} · ${o.label}</span>
            <span class="pp-badge ${a?`pp-badge-ok`:`pp-badge-warn`}">${a?`身份已确认`:`身份待确认`}</span>
          </div>
          <p class="pp-meta">${Mb(u)}</p>
        </div>
      </header>
      <section class="pp-section" aria-label="相遇时间线">
        <div class="pp-section-head">
          <h3>${Nb(`map-pin`)}相遇</h3>
          <span class="pp-section-tag">事实层 · 只增不改</span>
        </div>
        ${n.length?n.map((e,t)=>E(e,t,n.length)).join(``):`<p class="pp-empty">还没有相遇记录。</p>`}
      </section>
      ${k(e,n)}
      ${re()}`}function ae(e){i.innerHTML=ie(e),i.scrollTop=0,S(),_(),te()}function oe(){o=!0,n.setAttribute(`aria-hidden`,`false`),r.focus({preventScroll:!0}),v(),window.dispatchEvent(new CustomEvent(ce,{detail:{id:`package`}}))}function se(){o&&(o=!1,s=null,c+=1,p=!1,y(),n.setAttribute(`aria-hidden`,`true`))}let ce=`echoworld:panel-focus`;window.addEventListener(ce,e=>{e.detail?.id!==`package`&&se()});function F(){te(),i.querySelector(`[data-pp-chat]`)?.scrollIntoView({block:`nearest`}),i.querySelector(`.pp-chat-form input`)?.focus({preventScroll:!0})}async function le(e,{focusChat:n=!1}={}){s=e,f=n&&A(),oe();let r=f?F:null;if(u.has(e)){ae(u.get(e)),r?.();return}let a=++c;i.innerHTML=w(),i.scrollTop=0;try{let n=await t.getPackage(e);if(!n||typeof n!=`object`)throw Error(`empty package`);if(u.set(e,n),a!==c||s!==e)return;ae(n),r?.()}catch(e){if(console.error(`[package-panel] 加载资料包失败`,e),a!==c)return;i.innerHTML=T()}}return n.addEventListener(`click`,e=>{if(e.target.closest(`[data-pp-close]`)){se();return}let t=e.target.closest(`[data-pp-open-media]`);if(t){window.open(t.dataset.ppOpenMedia,`_blank`,`noopener,noreferrer`);return}if(e.target.closest(`[data-pp-chat-open]`)){f=!0,F();return}let n=e.target.closest(`[data-pp-chat-suggestion]`);if(n){P(n.textContent);return}let r=e.target.closest(`[data-pp-chat-save]`);if(r){ne(Number(r.dataset.ppChatSave));return}e.target.closest(`[data-pp-retry]`)&&s&&(u.delete(s),le(s,{focusChat:f}))}),n.addEventListener(`submit`,e=>{let t=e.target.closest(`[data-pp-chat-form]`);if(!t)return;e.preventDefault();let n=t.elements.message,r=n.value;n.value=``,P(r)}),n.addEventListener(`change`,async e=>{let n=e.target.closest(`[data-pp-agent-memory]`);if(!n||!s)return;let r=n.dataset.ppAgentMemory;n.disabled=!0;try{let e=await t.setEncounterPrivacy(s,r,n.checked?`agent-usable`:`self-only`);u.set(s,e),ae(e),C(n.checked?`这次相遇已加入 Agent 记忆`:`这次相遇已退出 Agent 记忆`)}catch(e){console.error(`[package-panel] 更新 Agent 记忆授权失败`,e),n.checked=!n.checked,n.disabled=!1,C(`授权更新失败，请稍后重试`)}}),document.addEventListener(`keydown`,e=>{o&&e.key===`Escape`&&(e.stopPropagation(),se())}),S(),{openPerson:le,close:se,setPresenceProvider(e){h=typeof e==`function`?e:null,o&&(v(),_())},get isOpen(){return o}}}var zb={AudioLines:gv,Building2:yv,Check:bv,ChevronDown:xv,CircleAlert:Sv,CircleCheck:Cv,CloudUpload:Dv,FileImage:Mv,FileText:Nv,Film:Pv,Globe:Fv,LoaderCircle:Vv,Lock:Wv,MapPin:Kv,Music:Xv,NotebookPen:Qv,PartyPopper:$v,RefreshCw:ay,ScanFace:cy,ShieldCheck:uy,Sparkles:fy,Tags:gy,Trash2:vy,UserCheck:yy,UserPlus:by,Users:Cy,Video:wy,X:Ey},Bb=Object.freeze([{id:`preprocess`,label:`预处理`,icon:`film`},{id:`faces`,label:`人脸`,icon:`scan-face`},{id:`transcript`,label:`转写`,icon:`audio-lines`},{id:`scene`,label:`场景`,icon:`tags`},{id:`draft`,label:`草稿`,icon:`file-text`}]),Vb=Object.freeze([{value:`self-only`,label:`仅自己可见`,desc:`只有你能看到这段相遇，Agent 互动不携带`,icon:`lock`},{value:`agent-usable`,label:`Agent 可用`,desc:`你的 Agent 可用于互动与匹配，不展示给其他用户`,icon:`user-check`},{value:`org-shared`,label:`组织内共享`,desc:`在你所在的组织空间内可见`,icon:`building-2`},{value:`public-approved`,label:`本人同意公开`,desc:`经 TA 本人同意后对外公开`,icon:`globe`}]),Hb=Object.freeze({ingest:{title:`记录一次相遇`,crumb:0},uploading:{title:`正在上传素材`,crumb:0},processing:{title:`正在整理这次相遇`,crumb:1},confirm:{title:`确认 TA 的身份`,crumb:2},success:{title:`欢迎入住`,crumb:2}}),Ub=Object.freeze([`录入`,`处理`,`确认`]),Wb=`.mp4,.mov,.m4a,.wav,.mp3,video/mp4,video/quicktime,audio/*,image/*`,Gb=/^(video\/(mp4|quicktime)|audio\/(mpeg|mp4|x-m4a|m4a|wav|x-wav|mp3|aac)|image\/[\w.+-]+)$/,Kb=/\.(mp4|mov|m4a|wav|mp3|png|jpe?g|webp|gif|heic|heif)$/i,qb=524288e3,Jb=Object.freeze({placeholder:`占位形象已生成，稍后可升级为 TA 的专属形象`,queued:`TA 的专属形象正在排队生成`,ready:`TA 的专属形象已就绪`}),Yb=30,Xb=3400;function Zb(e){return String(e??``).replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&#039;`)}function Qb(e,t=``){return`<i data-lucide="${e}"${t?` class="${t}"`:``}></i>`}function $b(e){return Number.isFinite(e)?e>=1048576?`${(e/1024/1024).toFixed(1)} MB`:e>=1024?`${Math.round(e/1024)} KB`:`${e} B`:``}function ex(e){let t=e.type||``,n=e.name||``;return t.startsWith(`video/`)||/\.(mp4|mov)$/i.test(n)?`video`:t.startsWith(`image/`)||/\.(png|jpe?g|webp|gif|heic|heif)$/i.test(n)?`image`:`audio`}function tx(e){return Gb.test(e.type||``)||Kb.test(e.name||``)}function nx(e,t){let n=e?.status??e?.code;if(n===400)return`文件格式不支持，请换成 mp4 / mov / m4a / wav / mp3 或照片`;if(n===413)return`文件超出大小限制（单个 ≤ 500MB）`;let r=String(e?.message??``).trim();return r&&r.length<=60?r:t}function rx(e){return new Promise(t=>window.setTimeout(t,e))}function ix(e,t,n={}){if(!e)throw Error(`mountPipelineFlow 需要一个容器元素`);if(!t||typeof t.ingest!=`function`||typeof t.pipelineStream!=`function`||typeof t.confirm!=`function`)throw Error(`mountPipelineFlow 需要 api 实现 ingest / pipelineStream / confirm 三个方法`);let r=window.matchMedia(`(prefers-reduced-motion: reduce)`).matches,i=typeof n.onConfirmed==`function`?n.onConfirmed:()=>{},a=typeof n.onClose==`function`?n.onClose:()=>{},o=!0,s=!1,c=0,l=!1,u=null,d=null,f={phase:`ingest`,files:[],note:``,place:``,capturedAt:``,uploadPercent:null,inputId:null,stepStatus:new Map(Bb.map(e=>[e.id,`waiting`])),keyframes:[],faces:[],sceneTags:[],transcriptTarget:``,transcriptTyped:``,pendingDraft:null,streamError:null,draft:null,name:``,mergeId:null,privacy:`self-only`,avatarStatus:`placeholder`,personId:null,submitting:!1,error:null,fileError:``},p=document.createElement(`div`);p.className=`pf-overlay`,p.setAttribute(`role`,`dialog`),p.setAttribute(`aria-modal`,`true`),p.setAttribute(`aria-label`,`相遇录入流程`),p.tabIndex=-1,e.append(p);function m(e){Dy({icons:zb,root:e,attrs:{"stroke-width":1.8}})}function h(e){return e?typeof t.assetUrl==`function`?t.assetUrl(e):typeof n.assetUrl==`function`?n.assetUrl(e):String(e):``}function g(){return(Array.isArray(n.people)?n.people:[]).map(e=>({id:e.person_id??e.id,name:e.name??e.person_id??e.id})).filter(e=>e.id)}function _(e){return g().find(t=>t.id===e)?.name??``}function v(){return f.faces.filter(e=>e.match_person_id).sort((e,t)=>(t.confidence??0)-(e.confidence??0))[0]??null}function y(){for(let e of f.files)e.previewUrl&&URL.revokeObjectURL(e.previewUrl);window.clearInterval(u),window.clearTimeout(d),u=null,d=null,f.phase=`ingest`,f.files=[],f.note=``,f.place=``,f.capturedAt=``,f.uploadPercent=null,f.inputId=null,f.stepStatus=new Map(Bb.map(e=>[e.id,`waiting`])),f.keyframes=[],f.faces=[],f.sceneTags=[],f.transcriptTarget=``,f.transcriptTyped=``,f.pendingDraft=null,f.streamError=null,f.draft=null,f.name=``,f.mergeId=null,f.privacy=`self-only`,f.avatarStatus=`placeholder`,f.personId=null,f.submitting=!1,f.error=null,f.fileError=``,l=!1}function b(){let e=Hb[f.phase];p.innerHTML=`
      <div class="pf-panel" data-pf-panel>
        <header class="pf-header">
          <span class="pf-brand">EW</span>
          <div class="pf-header-copy">
            <small>ECHOWORLD · 相遇仪式</small>
            <strong>${e.title}</strong>
          </div>
          <ol class="pf-crumb" aria-label="流程进度">
            ${Ub.map((t,n)=>`
              <li class="${n<e.crumb?`is-done`:``}${n===e.crumb?`is-current`:``}">
                <i></i><span>${t}</span>
              </li>`).join(``)}
          </ol>
          <button class="pf-icon-button" type="button" data-action="close" title="关闭" aria-label="关闭相遇流程">${Qb(`x`)}</button>
        </header>
        <div class="pf-body" data-pf-body></div>
      </div>`;let t=p.querySelector(`[data-pf-body]`);f.phase===`ingest`?C(t):f.phase===`uploading`?w(t):f.phase===`processing`?D(t):f.phase===`confirm`?O(t):f.phase===`success`&&k(t),m(p)}function x(e){return!f.error||f.error.phase!==e?``:`
      <div class="pf-error" role="alert">
        ${Qb(`circle-alert`)}
        <span>${Zb(f.error.message)}</span>
      </div>`}function S(e){let t=ex(e),n=t===`video`?`video`:t===`image`?`image`:`music`;return`
      <li class="pf-file-row">
        ${e.previewUrl?`<img src="${e.previewUrl}" alt="" />`:`<span class="pf-file-kind is-${t}">${Qb(n)}</span>`}
        <span class="pf-file-meta"><strong>${Zb(e.name)}</strong><small>${$b(e.size)}</small></span>
        <button class="pf-file-remove" type="button" data-remove-file="${Zb(e.key)}" title="移除" aria-label="移除 ${Zb(e.name)}">${Qb(`trash-2`)}</button>
      </li>`}function C(e){e.innerHTML=`
      <div class="pf-dropzone" data-pf-dropzone role="button" tabindex="0" aria-label="拖拽或点击选择媒体文件">
        <input type="file" data-pf-file-input multiple accept="${Wb}" hidden />
        <span class="pf-dropzone-icon">${Qb(`cloud-upload`)}</span>
        <strong>拖拽视频 / 录音 / 现场照片到这里</strong>
        <small>或点击选择文件 · 支持 mp4 / mov / m4a / wav / mp3 / 照片（可多选）· 单个 ≤ 500MB</small>
      </div>
      ${f.fileError?`<p class="pf-file-error" role="alert">${Qb(`circle-alert`)}${Zb(f.fileError)}</p>`:``}
      ${f.files.length>0?`
        <ul class="pf-file-list" aria-label="已选文件">
          ${f.files.map(S).join(``)}
        </ul>`:``}
      <div class="pf-field-grid">
        <label class="pf-field">
          <span>${Qb(`notebook-pen`)}备注</span>
          <input type="text" data-pf-note maxlength="60" placeholder="如：黑客松 3 号展位的介绍者" value="${Zb(f.note)}" />
        </label>
        <label class="pf-field">
          <span>${Qb(`map-pin`)}地点提示</span>
          <input type="text" data-pf-place maxlength="40" placeholder="如：上海 · 西岸艺术中心" value="${Zb(f.place)}" />
        </label>
      </div>
      ${x(`ingest`)}
      <footer class="pf-footer">
        <span class="pf-footer-hint">采集时间自动记录为当前时间 · 原始素材落盘后只增不改</span>
        <button class="pf-button-primary" type="button" data-action="submit-ingest" ${f.files.length===0?`disabled`:``}>
          上传并开始整理${Qb(`sparkles`)}
        </button>
      </footer>`}function w(e){let t=f.error?.phase===`uploading`,n=f.files.reduce((e,t)=>e+(t.size||0),0);e.innerHTML=`
      <div class="pf-upload-stage">
        <span class="pf-upload-orb${t?` is-failed`:``}">
          ${Qb(t?`circle-alert`:`cloud-upload`)}
        </span>
        <h2>${t?`上传没有完成`:`正在把现场封存进事实层`}</h2>
        <p>${f.files.length} 个文件 · ${$b(n)} · 落盘后只读</p>
        ${t?`
          ${x(`uploading`)}
          <div class="pf-error-actions">
            <button class="pf-button-primary" type="button" data-action="retry-upload">${Qb(`refresh-cw`)}重试上传</button>
            <button class="pf-button-ghost" type="button" data-action="back-ingest">返回修改</button>
          </div>`:`
          <div class="pf-upload-track" role="progressbar" aria-label="上传进度"${f.uploadPercent==null?``:` aria-valuenow="${Math.round(f.uploadPercent)}" aria-valuemin="0" aria-valuemax="100"`}>
            <div class="${f.uploadPercent==null?`is-indeterminate`:``}" data-pf-upload-bar style="width:${f.uploadPercent??0}%"></div>
          </div>
          <span class="pf-upload-pct" data-pf-upload-pct>${f.uploadPercent==null?`正在建立连接…`:`${Math.round(f.uploadPercent)}%`}</span>`}
      </div>`}function T(e){let t=f.stepStatus.get(e.id);return`
      <li class="pf-step is-${t}" data-step="${e.id}">
        <span class="pf-step-dot" data-icon="${t===`done`?`check`:e.icon}">${Qb(t===`done`?`check`:e.icon)}</span>
        <span class="pf-step-label">${e.label}</span>
      </li>`}function E(e){let t=Math.round((e.confidence??0)*100),n=2*Math.PI*40,r=e.match_person_id?e.match_name||_(e.match_person_id)||e.match_person_id:``;return`
      <article class="pf-face-card">
        <span class="pf-face-photo">
          <svg class="pf-ring" viewBox="0 0 88 88" aria-hidden="true">
            <circle class="pf-ring-track" cx="44" cy="44" r="40"></circle>
            <circle class="pf-ring-value" cx="44" cy="44" r="40" stroke-dasharray="${t/100*n} ${n}"></circle>
          </svg>
          <img src="${Zb(h(e.face_ref??e.photo??e.url))}" alt="人脸候选照片" loading="lazy" />
          <em>${t}%</em>
        </span>
        ${e.match_person_id?`<span class="pf-face-badge is-match">${Qb(`sparkles`)}可能是 ${Zb(r)}</span>`:`<span class="pf-face-badge is-new">${Qb(`user-plus`)}新面孔</span>`}
      </article>`}function D(e){if(f.error?.phase===`processing`){e.innerHTML=`
        <div class="pf-upload-stage">
          <span class="pf-upload-orb is-failed">${Qb(`circle-alert`)}</span>
          <h2>整理中途出了点问题</h2>
          <p>已落盘的素材不受影响，可以直接重试处理</p>
          ${x(`processing`)}
          <div class="pf-error-actions">
            <button class="pf-button-primary" type="button" data-action="retry-pipeline">${Qb(`refresh-cw`)}重新处理</button>
            <button class="pf-button-ghost" type="button" data-action="back-ingest">重新录入</button>
          </div>
        </div>`;return}if(e.innerHTML=`
      <ol class="pf-steps" data-pf-steps aria-label="处理步骤">
        ${Bb.map(T).join(``)}
      </ol>
      <div class="pf-processing-grid">
        <section class="pf-section is-wide">
          <h3>${Qb(`film`)}关键帧</h3>
          <div class="pf-filmstrip" data-pf-filmstrip>
            ${f.keyframes.length===0?`<span class="pf-empty">正在抽取现场画面…</span>`:``}
          </div>
        </section>
        <section class="pf-section">
          <h3>${Qb(`scan-face`)}人脸候选</h3>
          <div class="pf-face-row" data-pf-faces>
            ${f.faces.length===0?`<span class="pf-empty">正在寻找面孔…</span>`:``}
          </div>
        </section>
        <section class="pf-section">
          <h3>${Qb(`audio-lines`)}转写</h3>
          <div class="pf-transcript is-typing" data-pf-transcript aria-live="polite">
            <span data-pf-transcript-text>${Zb(f.transcriptTyped)}</span>
            ${f.transcriptTarget?``:`<span class="pf-empty" data-pf-transcript-empty>正在聆听对话…</span>`}
          </div>
        </section>
        <section class="pf-section is-wide">
          <h3>${Qb(`tags`)}场景</h3>
          <div class="pf-chip-row" data-pf-scenes>
            ${f.sceneTags.length===0?`<span class="pf-empty">正在识别场景…</span>`:``}
          </div>
        </section>
      </div>
      <footer class="pf-footer">
        <span class="pf-footer-hint">${Qb(`loader-circle`,`pf-spin`)}中间特征实时流入，节奏跟随处理流</span>
      </footer>`,f.keyframes.length>0){e.querySelector(`[data-pf-filmstrip]`);for(let e of f.keyframes)M(e,!1)}if(f.faces.length>0)for(let e of f.faces)N(e,!1);if(f.sceneTags.length>0)for(let e of f.sceneTags)ee(e,!1);f.transcriptTarget&&te()}function O(e){let t=[...f.faces].sort((e,t)=>(t.confidence??0)-(e.confidence??0))[0]??null,n=f.transcriptTarget||f.draft?.summary_draft||f.draft?.encounter?.summary||``,r=f.place||f.draft?.encounter?.place||f.draft?.place_hint||``,i=f.capturedAt?new Date(f.capturedAt).toLocaleString(`zh-CN`,{month:`long`,day:`numeric`,hour:`2-digit`,minute:`2-digit`}):``,a=g();f.mergeId&&!a.some(e=>e.id===f.mergeId)&&a.unshift({id:f.mergeId,name:`可能是 ${v()?.match_name||_(f.mergeId)||f.mergeId}`}),e.innerHTML=`
      <div class="pf-confirm-grid">
        <aside class="pf-recap">
          <span class="pf-recap-photo${t?``:` is-empty`}">
            ${t?`<img src="${Zb(h(t.face_ref??t.photo??t.url))}" alt="相遇照片" />`:Qb(`scan-face`)}
          </span>
          <div class="pf-recap-lines">
            <small>相遇草稿 · 待确认</small>
            ${i||r?`<p>${Qb(`map-pin`)}${Zb([i,r].filter(Boolean).join(` · `))}</p>`:``}
            ${n?`<blockquote>${Zb(n)}</blockquote>`:``}
            ${f.sceneTags.length>0?`
              <div class="pf-chip-row is-static">${f.sceneTags.map(e=>`<span class="pf-chip">${Qb(`tags`)}${Zb(e)}</span>`).join(``)}</div>`:``}
          </div>
        </aside>
        <form class="pf-confirm-form" data-pf-confirm-form novalidate>
          <label class="pf-field">
            <span>${Qb(`notebook-pen`)}TA 怎么称呼？</span>
            <input type="text" data-pf-name name="name" maxlength="24" placeholder="输入姓名或称呼" value="${Zb(f.name)}" autocomplete="off" required />
          </label>
          <label class="pf-field">
            <span>${Qb(`users`)}可能是谁</span>
            <span class="pf-select-wrap">
              <select data-pf-merge aria-label="并入已有人物或新建">
                <option value="">新建此人</option>
                ${a.map(e=>`<option value="${Zb(e.id)}"${e.id===f.mergeId?` selected`:``}>并入：${Zb(e.name)}</option>`).join(``)}
              </select>
              ${Qb(`chevron-down`)}
            </span>
            <small class="pf-field-hint">并入已有 Package，或为这次相遇新建一个人物</small>
          </label>
          <fieldset class="pf-privacy">
            <legend>${Qb(`shield-check`)}隐私级别</legend>
            ${Vb.map(e=>`
              <label class="pf-privacy-card${f.privacy===e.value?` is-selected`:``}">
                <input type="radio" name="pf-privacy" value="${e.value}"${f.privacy===e.value?` checked`:``} />
                ${Qb(e.icon)}
                <span><strong>${e.label}</strong><small>${e.desc}</small></span>
                <i class="pf-privacy-check">${Qb(`check`)}</i>
              </label>`).join(``)}
          </fieldset>
          ${x(`confirm`)}
          <footer class="pf-footer">
            <span class="pf-footer-hint">确认后才写入你的关系世界（事实层只增不改）</span>
            <button class="pf-button-primary" type="submit" data-pf-confirm-submit ${f.name.trim()&&!f.submitting?``:`disabled`}>
              ${f.submitting?Qb(`loader-circle`,`pf-spin`):Qb(`circle-check`)}${f.submitting?`正在写入…`:`确认并写入世界`}
            </button>
          </footer>
        </form>
      </div>`}function k(e){let t=f.name.trim()||`TA`;e.innerHTML=`
      <div class="pf-success">
        <span class="pf-success-halo"></span>
        <span class="pf-success-halo is-late"></span>
        <span class="pf-success-badge">${Qb(`party-popper`)}</span>
        <h2>TA 已住进你的世界</h2>
        <p><strong>${Zb(t)}</strong> · ${Zb(Jb[f.avatarStatus]??Jb.placeholder)}</p>
        <button class="pf-button-primary" type="button" data-action="finish">回到咖啡厅</button>
      </div>`}function A(){let e=p.querySelector(`[data-pf-steps]`);if(e)for(let t of Bb){let n=e.querySelector(`[data-step="${t.id}"]`);if(!n)continue;let r=f.stepStatus.get(t.id);n.classList.toggle(`is-waiting`,r===`waiting`),n.classList.toggle(`is-active`,r===`active`),n.classList.toggle(`is-done`,r===`done`);let i=n.querySelector(`.pf-step-dot`),a=r===`done`?`check`:t.icon;i?.dataset.icon!==a&&(i.dataset.icon=a,i.innerHTML=Qb(a),m(i))}}function j(e,t){let n=Bb.findIndex(t=>t.id===e);if(n!==-1){if(t===`done`||t===`active`)for(let e of Bb.slice(0,n))f.stepStatus.get(e.id)!==`done`&&f.stepStatus.set(e.id,`done`);f.stepStatus.set(e,t),A()}}function M(e,t=!0){let n=p.querySelector(`[data-pf-filmstrip]`);if(!n)return;n.querySelector(`.pf-empty`)?.remove();let i=document.createElement(`figure`);i.className=`pf-frame${t?``:` is-settled`}`,i.innerHTML=`<img src="${Zb(h(e))}" alt="现场关键帧" loading="lazy" />`,n.append(i),i.scrollIntoView({behavior:r?`auto`:`smooth`,block:`nearest`,inline:`end`})}function N(e,t=!0){let n=p.querySelector(`[data-pf-faces]`);if(!n)return;n.querySelector(`.pf-empty`)?.remove();let r=document.createElement(`div`);r.className=t?``:`is-settled`,r.innerHTML=E(e);let i=r.firstElementChild;t||i.classList.add(`is-settled`),n.append(i),m(i)}function ee(e,t=!0){let n=p.querySelector(`[data-pf-scenes]`);if(!n)return;n.querySelector(`.pf-empty`)?.remove();let r=document.createElement(`span`);r.className=`pf-chip${t?``:` is-settled`}`,r.innerHTML=`${Qb(`tags`)}${Zb(e)}`,n.append(r),m(r)}function te(){window.clearInterval(u),u=null;let e=p.querySelector(`[data-pf-transcript-text]`);if(p.querySelector(`[data-pf-transcript-empty]`)?.remove(),e){if(r){f.transcriptTyped=f.transcriptTarget,e.textContent=f.transcriptTyped;return}u=window.setInterval(()=>{if(f.transcriptTyped.length>=f.transcriptTarget.length){window.clearInterval(u),u=null;return}let e=f.transcriptTarget.length-f.transcriptTyped.length,t=e>90?4:e>40?2:1;f.transcriptTyped=f.transcriptTarget.slice(0,f.transcriptTyped.length+t);let n=p.querySelector(`[data-pf-transcript-text]`);n&&(n.textContent=f.transcriptTyped)},Yb)}}function P(e){let t=String(e??``).trim();!t||t===f.transcriptTarget||(f.transcriptTarget=f.transcriptTarget&&!f.transcriptTarget.endsWith(t)?`${f.transcriptTarget} ${t}`:t,te())}function ne(){let e=p.querySelector(`[data-pf-upload-bar]`),t=p.querySelector(`[data-pf-upload-pct]`);!e||f.uploadPercent==null||(e.classList.remove(`is-indeterminate`),e.style.width=`${f.uploadPercent}%`,t&&(t.textContent=`${Math.round(f.uploadPercent)}%`))}function re(e){let t=[...e],n=[],r=0;for(let e of t){if(!tx(e)){n.push(`${e.name}（格式不支持）`);continue}if(e.size>qb){n.push(`${e.name}（超过 500MB）`);continue}f.files.some(t=>t.name===e.name&&t.size===e.size)||(e.key=`${e.name}-${e.size}-${e.lastModified}-${Math.random().toString(36).slice(2,8)}`,ex(e)===`image`&&(e.previewUrl=URL.createObjectURL(e)),f.files.push(e),r+=1)}f.fileError=n.length>0?`已跳过：${n.join(`、`)}`:``,(r>0||n.length>0)&&b()}async function ie(){let e=++c;f.phase=`uploading`,f.error=null,f.uploadPercent=null,f.capturedAt=new Date().toISOString(),b();try{let r=await t.ingest({files:f.files,captured_at:f.capturedAt,device:n.device??`phone`,note:f.note.trim(),place_hint:f.place.trim()},t=>{e!==c||!o||typeof t!=`number`||(f.uploadPercent=Math.max(0,Math.min(100,t)),ne())});if(e!==c||!o)return;let i=r?.input_id??r?.inputId??null;if(!i)throw Error(`服务未返回 input_id，请重试`);f.inputId=i,await oe(e)}catch(t){if(e!==c||!o)return;console.error(`[PipelineFlow] ingest failed:`,t),f.error={phase:`uploading`,message:nx(t,`上传失败，请检查网络后重试`)},b()}}function ae(e){if(!e||typeof e!=`object`)return;if(e.type===`result`||e.encounter_draft){e.encounter_draft&&(f.pendingDraft=e.encounter_draft);return}let t=e.step;if(Bb.some(e=>e.id===t)){if(e.status===`error`)throw f.streamError=Error(e.message||`处理失败，请重试`),f.streamError;if(j(t,e.status===`done`?`done`:`active`),Array.isArray(e.keyframes))for(let t of e.keyframes)f.keyframes.includes(t)||(f.keyframes.push(t),M(t));if(Array.isArray(e.photos))for(let t of e.photos)f.keyframes.includes(t)||(f.keyframes.push(t),M(t));if(Array.isArray(e.face_candidates))for(let t of e.face_candidates){let e=t?.face_ref??t?.photo??JSON.stringify(t);f.faces.some(t=>(t.face_ref??t.photo??JSON.stringify(t))===e)||(f.faces.push(t),N(t))}if(Array.isArray(e.segments))for(let t of e.segments)P(typeof t==`string`?t:t?.text??``);if(typeof e.summary_draft==`string`&&P(e.summary_draft),typeof e.text==`string`&&t===`transcript`&&P(e.text),Array.isArray(e.scene_tags))for(let t of e.scene_tags)f.sceneTags.includes(t)||(f.sceneTags.push(t),ee(t))}}async function oe(e){let n=e??++c;f.phase=`processing`,f.error=null,f.stepStatus=new Map(Bb.map(e=>[e.id,`waiting`])),f.keyframes=[],f.faces=[],f.sceneTags=[],f.transcriptTarget=``,f.transcriptTyped=``,f.pendingDraft=null,f.streamError=null,b();try{let e=await t.pipelineStream(f.inputId,e=>{n!==c||!o||ae(e)});if(n!==c||!o)return;if(f.streamError)throw f.streamError;let i=e?.encounter_draft??e??f.pendingDraft;if(!i||typeof i!=`object`)throw Error(`未生成相遇草稿，请重试`);if(f.draft=i,j(`draft`,`done`),await rx(r?120:700),n!==c||!o)return;se()}catch(e){if(n!==c||!o)return;console.error(`[PipelineFlow] pipeline failed:`,e),f.error={phase:`processing`,message:nx(e,`处理失败，请重试`)},b()}}function se(){let e=v();f.mergeId=e?.match_person_id??null,f.name=(f.mergeId?_(f.mergeId):``)||f.draft?.identity?.name||f.draft?.name||``,f.phase=`confirm`,b()}async function ce(){let e=f.name.trim();if(!e||f.submitting)return;let n=++c;f.submitting=!0,f.error=null,b();try{let r=await t.confirm({encounter_draft:f.draft,identity:{name:e,match_person_id:f.mergeId||null},privacy:f.privacy});if(n!==c||!o)return;let i=r?.person_id??r?.personId??null;if(!i)throw Error(`服务未返回 person_id，请重试`);f.personId=i,f.avatarStatus=r?.avatar_status??`placeholder`,f.submitting=!1,f.phase=`success`,b(),d=window.setTimeout(()=>F(),Xb)}catch(e){if(n!==c||!o)return;console.error(`[PipelineFlow] confirm failed:`,e),f.submitting=!1,f.error={phase:`confirm`,message:nx(e,`确认失败，请重试`)},b()}}function F(){if(window.clearTimeout(d),d=null,!l&&f.personId){l=!0;try{i({person_id:f.personId})}catch(e){console.error(`[PipelineFlow] onConfirmed callback failed:`,e)}}ue()}function le(){c+=1,y(),s=!0,b(),p.classList.add(`is-open`),p.removeAttribute(`aria-hidden`),p.focus({preventScroll:!0})}function ue(){s&&(c+=1,s=!1,window.clearInterval(u),window.clearTimeout(d),u=null,d=null,p.classList.remove(`is-open`),p.setAttribute(`aria-hidden`,`true`),a())}function de(){if(o){o=!1,c+=1,window.clearInterval(u),window.clearTimeout(d);for(let e of f.files)e.previewUrl&&URL.revokeObjectURL(e.previewUrl);document.removeEventListener(`keydown`,pe,!0),p.remove()}}p.addEventListener(`click`,e=>{let t=e.target.closest(`button, [data-pf-dropzone], select, label`);if(!(!t||!p.contains(t))){if(t.dataset.action===`close`){ue();return}if(t.dataset.action===`submit-ingest`){ie();return}if(t.dataset.action===`retry-upload`){ie();return}if(t.dataset.action===`back-ingest`){c+=1,f.phase=`ingest`,f.error=null,b();return}if(t.dataset.action===`retry-pipeline`){oe();return}if(t.dataset.action===`finish`){F();return}if(t.dataset.removeFile){e.stopPropagation();let n=f.files.findIndex(e=>e.key===t.dataset.removeFile);if(n!==-1){let[e]=f.files.splice(n,1);e?.previewUrl&&URL.revokeObjectURL(e.previewUrl),b()}return}t.hasAttribute(`data-pf-dropzone`)&&p.querySelector(`[data-pf-file-input]`)?.click()}}),p.addEventListener(`keydown`,e=>{(e.key===`Enter`||e.key===` `)&&e.target.hasAttribute?.(`data-pf-dropzone`)&&(e.preventDefault(),p.querySelector(`[data-pf-file-input]`)?.click())}),p.addEventListener(`change`,e=>{let t=e.target;if(t.matches(`[data-pf-file-input]`)){re(t.files),t.value=``;return}if(t.matches(`[data-pf-merge]`)){if(f.mergeId=t.value||null,f.mergeId){f.name=_(f.mergeId)||f.name;let e=p.querySelector(`[data-pf-name]`);e&&(e.value=f.name)}fe();return}if(t.matches(`input[name="pf-privacy"]`)){f.privacy=t.value;for(let e of p.querySelectorAll(`.pf-privacy-card`))e.classList.toggle(`is-selected`,e.querySelector(`input`)?.value===f.privacy)}}),p.addEventListener(`input`,e=>{let t=e.target;if(t.matches(`[data-pf-note]`)){f.note=t.value;return}if(t.matches(`[data-pf-place]`)){f.place=t.value;return}t.matches(`[data-pf-name]`)&&(f.name=t.value,fe())}),p.addEventListener(`submit`,e=>{e.target.closest(`[data-pf-confirm-form]`)&&(e.preventDefault(),ce())});function fe(){let e=p.querySelector(`[data-pf-confirm-submit]`);e&&(e.disabled=!f.name.trim()||f.submitting)}p.addEventListener(`dragover`,e=>{let t=e.target.closest?.(`[data-pf-dropzone]`);t&&(e.preventDefault(),t.classList.add(`is-dragover`))}),p.addEventListener(`dragleave`,e=>{let t=e.target.closest?.(`[data-pf-dropzone]`);!t||t.contains(e.relatedTarget)||t.classList.remove(`is-dragover`)}),p.addEventListener(`drop`,e=>{let t=e.target.closest?.(`[data-pf-dropzone]`);t&&(e.preventDefault(),t.classList.remove(`is-dragover`),e.dataTransfer?.files?.length&&re(e.dataTransfer.files))}),p.addEventListener(`error`,e=>{let t=e.target;if(!(t instanceof HTMLImageElement))return;let n=t.closest(`.pf-frame, .pf-face-photo, .pf-recap-photo, .pf-file-row`);n&&(n.classList.add(`is-broken`),t.remove())},!0);function pe(e){e.key===`Escape`&&s&&(e.stopPropagation(),ue())}return document.addEventListener(`keydown`,pe,!0),le(),{open:le,close:ue,unmount:de,get isOpen(){return s},get phase(){return f.phase}}}var ax=`echo-group-room.v1`;function ox(){return`/echoworld/api/v0/group`}async function sx(e,t={}){let n=await fetch(`${ox()}${e}`,{...t,headers:{"Content-Type":`application/json`,...t.headers??{}}}),r=null;try{r=await n.json()}catch{r=null}if(!n.ok){let e=Error(r?.detail??`现场房间请求失败（HTTP ${n.status}）`);throw e.status=n.status,e}if(!r||r.schema!==ax)throw Error(`现场房间返回了不兼容的数据版本：${r?.schema??`unknown`}`);return r}var cx=class{constructor({pollMs:e=700}={}){this.pollMs=Math.max(400,e),this.presenceSeq=0,this.pollTimer=null,this.polling=!1,this.stopped=!0}createSession(e){return sx(`/sessions`,{method:`POST`,body:JSON.stringify(e)})}joinSession(e,t){return sx(`/sessions/join`,{method:`POST`,body:JSON.stringify({code:e,participant:t})})}getSession(e,t){let n=new URLSearchParams;return t&&n.set(`viewer_id`,t),sx(`/sessions/${encodeURIComponent(e)}?${n}`)}getSessionByCode(e){return sx(`/sessions/by-code/${encodeURIComponent(e)}`)}updatePresence(e,t,n){return this.presenceSeq=Math.max(this.presenceSeq+1,Date.now()),sx(`/sessions/${encodeURIComponent(e)}/presence`,{method:`PUT`,body:JSON.stringify({person_id:t,seq:this.presenceSeq,position:n})})}writeImpression(e,t,n,r){return sx(`/sessions/${encodeURIComponent(e)}/impressions`,{method:`PUT`,body:JSON.stringify({author_id:t,subject_id:n,value:r})})}writeImpressions(e,t,n){return sx(`/sessions/${encodeURIComponent(e)}/impressions/batch`,{method:`PUT`,body:JSON.stringify({author_id:t,impressions:n})})}startGame(e,t){return sx(`/sessions/${encodeURIComponent(e)}/game/start`,{method:`POST`,body:JSON.stringify({actor_id:t})})}submitGuess(e,t,n){return sx(`/sessions/${encodeURIComponent(e)}/game/guess`,{method:`POST`,body:JSON.stringify({player_id:t,author_id:n})})}nextRound(e,t){return sx(`/sessions/${encodeURIComponent(e)}/game/next`,{method:`POST`,body:JSON.stringify({actor_id:t})})}startPolling(e,t,n,r){this.stopPolling(),this.stopped=!1;let i=async()=>{if(!(this.stopped||this.polling)){this.polling=!0;try{n(await this.getSession(e,t()))}catch(e){r?.(e)}finally{this.polling=!1,this.stopped||(this.pollTimer=window.setTimeout(i,this.pollMs))}}};i()}stopPolling(){this.stopped=!0,this.polling=!1,window.clearTimeout(this.pollTimer),this.pollTimer=null}},lx={ArrowRight:hv,Check:bv,Clipboard:Tv,Copy:kv,DoorOpen:Av,LogIn:Gv,Play:ty,Radio:iy,RotateCcw:oy,Users:Cy,X:Ey};function ux(e){return String(e??``).replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&#039;`)}function dx(e){return[...String(e??`?`)].slice(-2).join(``).toUpperCase()}function fx(e,t){let n=e?.game,r=n?.current_round;return[e?.phase,t,e?.participants?.length,e?.participants?.map(e=>Number(e.online)).join(``),e?.impression_progress?.submitted,n?.status,n?.round_index,r?.guess?.selected_id,e?.events?.length].join(`:`)}function px(e){return{person_id:e.id,display_name:e.displayName??e.name??e.id,avatar_ref:e.portrait??null}}function mx(e,{participants:t=[],getLocalPresence:n=null,onPresence:r=null,onToast:i=null}={}){let a=t.filter(e=>e?.id),o=new Map(a.map(e=>[e.id,e])),s=new cx,c=new URL(window.location.href),l=c.searchParams.get(`groupCode`)??``,u=null,d=null,f=c.searchParams.get(`groupPlayer`)??a[0]?.id??null,p=c.searchParams.get(`groupFacilitator`)===`1`,m=``,h=null,g=!1,_=!1,v=new Map,y=document.createElement(`section`);y.className=`gp-overlay`,y.setAttribute(`aria-hidden`,`true`),y.innerHTML=`
    <header class="gp-header">
      <div class="gp-brand"><span class="gp-brand-mark">EW</span><strong>现场房间</strong></div>
      <div class="gp-room-meta" aria-live="polite"></div>
      <button class="gp-icon-button gp-close" type="button" aria-label="收起现场房间" title="收起现场房间">
        <i data-lucide="x"></i>
      </button>
    </header>
    <div class="gp-layout">
      <aside class="gp-rail"></aside>
      <main class="gp-main" aria-live="polite"></main>
    </div>`,document.body.append(y);let b=document.createElement(`button`);b.className=`gp-room-hud`,b.type=`button`,b.hidden=!0,b.innerHTML=`<i data-lucide="radio"></i><span><small>现场房间</small><strong>--</strong></span>`,e.append(b);let x=y.querySelector(`.gp-main`),S=y.querySelector(`.gp-rail`),C=y.querySelector(`.gp-room-meta`);function w(e){typeof i==`function`&&i(e)}function T(e){_=e,y.classList.toggle(`is-busy`,e);for(let t of y.querySelectorAll(`button`))t.disabled=e}function E(){y.classList.add(`is-open`),y.setAttribute(`aria-hidden`,`false`),document.body.classList.add(`gp-open`),fe(!0)}function D(){y.classList.remove(`is-open`),y.setAttribute(`aria-hidden`,`true`),document.body.classList.remove(`gp-open`)}function O(){let e=new URL(window.location.href);u?(e.searchParams.set(`groupRoom`,u.session_id),e.searchParams.set(`groupPlayer`,f),p?e.searchParams.set(`groupFacilitator`,`1`):e.searchParams.delete(`groupFacilitator`)):(e.searchParams.delete(`groupRoom`),e.searchParams.delete(`groupPlayer`),e.searchParams.delete(`groupFacilitator`)),e.searchParams.delete(`groupCode`),window.history.replaceState(window.history.state,``,e)}function k(t,n=!1){u=t,d=null,e.classList.add(`has-group-room`),g=!1,b.hidden=!1,b.querySelector(`strong`).textContent=`${u.code} · ${u.participants.length} 人`,r?.(u.participants,f);let i=fx(u,f);n||i!==m?(m=i,fe(!0)):M()}function A(){s.stopPolling(),window.clearInterval(h),h=null,u=null,m=``,e.classList.remove(`has-group-room`),b.hidden=!0,r?.([],f),O(),fe(!0)}function j(){u&&(s.startPolling(u.session_id,()=>f,e=>k(e),e=>{if(e.status===404){A(),w(`现场房间已结束，已回到普通世界`);return}g||w(e.message),g=!0}),window.clearInterval(h),h=window.setInterval(()=>{if(!u||!f||typeof n!=`function`)return;let e=n();e&&s.updatePresence(u.session_id,f,e).catch(e=>{if(e.status===404){A();return}g||w(e.message),g=!0})},550))}function M(){if(!u){C.innerHTML=`<span class="gp-status"><i></i>等待创建</span>`;return}let e=u.participants.find(e=>e.person_id===f);C.innerHTML=`
      <span class="gp-status is-live"><i></i>${ux(u.code)}</span>
      <span>${ux(e?.display_name??`未选择身份`)}</span>`}function N(){if(!u){S.innerHTML=`
        <div class="gp-rail-title"><i data-lucide="users"></i><span>现场同行</span></div>
        <div class="gp-empty-roster">房间建立后，同伴会出现在这里。</div>`;return}S.innerHTML=`
      <div class="gp-rail-title"><i data-lucide="users"></i><span>${u.participants.length} 人在场</span></div>
      ${p?`
        <label class="gp-device-select">
          <span>主持设备身份</span>
          <select data-action="viewer">
            ${u.participants.map(e=>`
              <option value="${ux(e.person_id)}" ${e.person_id===f?`selected`:``}>
                ${ux(e.display_name)}
              </option>`).join(``)}
          </select>
        </label>`:`
        <div class="gp-device-select gp-device-fixed">
          <span>本机身份</span>
          <strong>${ux(u.participants.find(e=>e.person_id===f)?.display_name??f)}</strong>
        </div>`}
      <div class="gp-roster">
        ${u.participants.map(e=>{let t=u.impression_progress.by_author[e.person_id],n=t?.submitted===t?.required;return`
            <div class="gp-person ${e.person_id===f?`is-viewer`:``}">
              <span class="gp-avatar">${ux(dx(e.display_name))}</span>
              <span class="gp-person-copy"><strong>${ux(e.display_name)}</strong><small>${n?`印象已写完`:`${t?.submitted??0}/${t?.required??0} 条${e.online?``:` · 未连接`}`}</small></span>
              ${n?`<i class="gp-person-check" data-lucide="check"></i>`:`<span class="gp-online-dot ${e.online?``:`is-offline`}"></span>`}
            </div>`}).join(``)}
      </div>
      <div class="gp-room-code">
        <span><small>房间码</small><strong>${ux(u.code)}</strong></span>
        <button class="gp-icon-button" type="button" data-action="copy" aria-label="复制房间链接" title="复制房间链接"><i data-lucide="copy"></i></button>
      </div>`}function ee(){let e=a.slice(1,6);x.innerHTML=`
      <div class="gp-lobby">
        <div class="gp-kicker">GROUP SESSION</div>
        <h1>今晚，和谁一起进入世界？</h1>
        <form class="gp-create-form" data-form="create">
          <label class="gp-field">
            <span>房间名称</span>
            <input name="title" maxlength="60" value="今晚的第一印象" autocomplete="off" />
          </label>
          <fieldset class="gp-companion-fieldset">
            <legend>现场同伴</legend>
            <div class="gp-companion-grid">
              ${e.map((e,t)=>`
                <label class="gp-companion">
                  <input type="checkbox" name="companion" value="${ux(e.id)}" ${t<4?`checked`:``} />
                  <span class="gp-avatar">${ux(dx(e.displayName??e.name))}</span>
                  <span><strong>${ux(e.displayName??e.name)}</strong><small>${ux(e.role??`现场同伴`)}</small></span>
                  <i data-lucide="check"></i>
                </label>`).join(``)}
            </div>
          </fieldset>
          <button class="gp-primary" type="submit"><i data-lucide="door-open"></i><span>建立现场房间</span></button>
        </form>
        <div class="gp-join-band">
          <form data-form="join">
            <label class="gp-field"><span>房间码</span><input name="code" maxlength="6" inputmode="text" autocomplete="off" placeholder="6 位房间码" value="${ux(l.toUpperCase())}" /></label>
            <button class="gp-secondary" type="submit"><i data-lucide="log-in"></i><span>加入</span></button>
          </form>
          <span class="gp-identity-note">输入房间码后，从名册里选择一个未被占用的身份</span>
        </div>
      </div>`}function te(){let e=d,t=e.participants.filter(e=>!e.online),n=(a[0]&&t.find(e=>e.person_id===a[0].id)?.person_id)??t[0]?.person_id??null;x.innerHTML=`
      <div class="gp-lobby">
        <div class="gp-kicker">JOIN ROOM · ${ux(e.code)}</div>
        <h1>选择这台设备要扮演的身份</h1>
        <p class="gp-join-hint">「${ux(e.title)}」已有 ${e.participants.length} 人在名册里。在线身份正被其他设备使用；离线身份可以由这台设备接管。</p>
        ${t.length?`
          <div class="gp-identity-grid" role="group" aria-label="选择本机身份">
            ${e.participants.map(e=>`
              <button class="gp-identity" type="button" data-action="join-identity" data-person-id="${ux(e.person_id)}" ${e.online?`disabled`:``}>
                <span class="gp-avatar">${ux(dx(e.display_name))}</span>
                <span><strong>${ux(e.display_name)}</strong><small>${e.online?`在线 · 已被占用`:e.person_id===n?`离线 · 本机推荐`:`离线 · 可以接管`}</small></span>
                <span class="gp-identity-status">${e.online?`已占用`:`可选择`}</span>
              </button>`).join(``)}
          </div>`:`
          <div class="gp-waiting">
            <h2>所有身份都在线</h2>
            <p>名册里的身份都被其他设备占用了。等有人离线后再刷新，或让房主开一个新房间。</p>
          </div>`}
        <div class="gp-join-actions">
          <button class="gp-secondary" type="button" data-action="join-refresh"><i data-lucide="rotate-ccw"></i><span>刷新名册</span></button>
          <button class="gp-secondary" type="button" data-action="join-back"><i data-lucide="x"></i><span>返回</span></button>
        </div>
      </div>`}function P(){let e=u.participants.find(e=>e.person_id===f),t=u.impression_progress.by_author[f],n=u.impression_progress.complete,r=t?.submitted===t?.required;x.innerHTML=`
      <div class="gp-stage-heading">
        <div><div class="gp-kicker">FIRST IMPRESSION</div><h1>${n?`第一印象已收齐`:`轮到 ${ux(e?.display_name??`你`)} 写了`}</h1></div>
        <div class="gp-progress"><strong>${u.impression_progress.submitted}</strong><span>/ ${u.impression_progress.required}</span></div>
      </div>
      <div class="gp-progress-track"><i style="width:${Math.round(u.impression_progress.submitted/u.impression_progress.required*100)}%"></i></div>
      ${r?`
        <div class="gp-waiting">
          <span class="gp-waiting-mark"><i data-lucide="check"></i></span>
          <h2>${n?`大家都写完了`:`你的第一印象已提交`}</h2>
          <p>${n?`“谁写的？”已经可以开场。`:`等待其他现场同伴写完。`}</p>
          ${f===u.host_id&&n?`<button class="gp-primary" type="button" data-action="start-game"><i data-lucide="play"></i><span>开始“谁写的？”</span></button>`:``}
        </div>`:`
        <form class="gp-impression-form" data-form="impressions">
          <div class="gp-impression-list">
            ${u.participants.map(e=>{let t=e.person_id===f;return`
                <label class="gp-impression-row">
                  <span class="gp-avatar">${ux(dx(e.display_name))}</span>
                  <span class="gp-impression-who"><strong>${t?`我自己`:ux(e.display_name)}</strong><small>${t?`我的一个特征`:`我对 TA 的第一印象`}</small></span>
                  <input name="impression:${ux(e.person_id)}" data-subject-id="${ux(e.person_id)}" maxlength="80" required autocomplete="off" placeholder="写下一句话" value="${ux(v.get(`${f}:${e.person_id}`)??``)}" />
                </label>`}).join(``)}
          </div>
          <button class="gp-primary" type="submit"><i data-lucide="clipboard"></i><span>提交 ${u.participants.length} 条印象</span></button>
        </form>`}
      ${ae()}`}function ne(){let e=u.game,t=e.current_round,n=u.participants.find(e=>e.person_id===t.guesser_id),r=!!t.guess,i=t.guesser_id===f,a=u.host_id===f,o=u.participants.find(e=>e.person_id===t.author_id);x.innerHTML=`
      <div class="gp-game-topline">
        <span>谁写的？</span><strong>${e.round_index+1} / ${e.round_count}</strong>
      </div>
      <div class="gp-game-stage">
        <div class="gp-turn-avatar">${ux(dx(n?.display_name))}</div>
        <div class="gp-turn-label">${ux(n?.display_name)} 的回合</div>
        <blockquote>“${ux(t.text)}”</blockquote>
        ${r?`
          <div class="gp-reveal ${t.guess.correct?`is-correct`:`is-wrong`}">
            <span>${t.guess.correct?`猜对了`:`答案揭晓`}</span>
            <strong>${ux(o?.display_name)}</strong>
          </div>
          ${a?`<button class="gp-primary" type="button" data-action="next-round"><i data-lucide="arrow-right"></i><span>${e.round_index+1===e.round_count?`查看结果`:`下一轮`}</span></button>`:`<div class="gp-await">等待房主开启下一轮</div>`}`:`
          <div class="gp-options" role="group" aria-label="猜测作者">
            ${t.options.map(e=>`
              <button type="button" data-action="guess" data-author-id="${ux(e.person_id)}" ${i?``:`disabled`}>
                <span class="gp-avatar">${ux(dx(e.display_name))}</span>
                <strong>${ux(e.display_name)}</strong>
              </button>`).join(``)}
          </div>
          ${i?``:`<div class="gp-await">等待 ${ux(n?.display_name)} 作答</div>`}`}
      </div>
      ${ie(e.scores)}
      ${ae()}`}function re(){x.innerHTML=`
      <div class="gp-results">
        <div class="gp-kicker">SESSION MEMORY</div>
        <h1>这一晚已经写进世界</h1>
        ${ie(u.game.scores,!0)}
        <div class="gp-result-event"><i data-lucide="radio"></i><span>第一印象与游戏结果已回到每个人的推断层</span></div>
        <button class="gp-primary" type="button" data-action="close"><i data-lucide="door-open"></i><span>回到共享空间</span></button>
      </div>
      ${ae()}`}function ie(e,t=!1){let n=u.participants.map(t=>({...t,score:e[t.person_id]??0})).sort((e,t)=>t.score-e.score||e.display_name.localeCompare(t.display_name));return`
      <section class="gp-scoreboard ${t?`is-expanded`:``}">
        <div class="gp-section-label">现场积分</div>
        ${n.map((e,t)=>`
          <div class="gp-score-row">
            <span>${t+1}</span><strong>${ux(e.display_name)}</strong><em>${e.score}</em>
          </div>`).join(``)}
      </section>`}function ae(){let e=u.events.at(-1);return e?`<div class="gp-event-strip"><i data-lucide="radio"></i><span>${ux(e.text)}</span></div>`:``}function oe(){y.querySelector(`[data-action="close"]`)?.addEventListener(`click`,D),y.querySelector(`[data-action="viewer"]`)?.addEventListener(`change`,e=>{f=e.target.value,O(),m=``,fe(!0),r?.(u.participants,f)}),y.querySelector(`[data-action="copy"]`)?.addEventListener(`click`,async()=>{let e=new URL(window.location.href);e.searchParams.set(`groupCode`,u.code),e.searchParams.delete(`groupRoom`),e.searchParams.delete(`groupPlayer`),e.searchParams.delete(`groupFacilitator`);try{await navigator.clipboard.writeText(e.toString()),w(`房间链接已复制`)}catch{w(`房间码：${u.code}`)}}),y.querySelector(`[data-form="create"]`)?.addEventListener(`submit`,se),y.querySelector(`[data-form="join"]`)?.addEventListener(`submit`,ce);for(let e of y.querySelectorAll(`[data-action="join-identity"]`))e.addEventListener(`click`,()=>F(e.dataset.personId));y.querySelector(`[data-action="join-refresh"]`)?.addEventListener(`click`,le),y.querySelector(`[data-action="join-back"]`)?.addEventListener(`click`,()=>{d=null,fe(!0)}),y.querySelector(`[data-form="impressions"]`)?.addEventListener(`submit`,ue);for(let e of y.querySelectorAll(`.gp-impression-row input[data-subject-id]`))e.addEventListener(`input`,()=>{v.set(`${f}:${e.dataset.subjectId}`,e.value)});y.querySelector(`[data-action="start-game"]`)?.addEventListener(`click`,()=>de(()=>s.startGame(u.session_id,f)));for(let e of y.querySelectorAll(`[data-action="guess"]`))e.addEventListener(`click`,()=>de(()=>s.submitGuess(u.session_id,f,e.dataset.authorId)));y.querySelector(`[data-action="next-round"]`)?.addEventListener(`click`,()=>de(()=>s.nextRound(u.session_id,f)))}async function se(e){if(e.preventDefault(),_||a.length<2)return;let t=new FormData(e.currentTarget),n=t.getAll(`companion`).map(e=>o.get(e)).filter(Boolean);if(n.length<1){w(`至少选择一位现场同伴`);return}T(!0);try{let e=await s.createSession({title:t.get(`title`),host:px(a[0]),participants:n.map(px)});f=a[0].id,p=!0,k(e,!0),O(),j(),w(`房间 ${e.code} 已建立`)}catch(e){w(e.message)}finally{T(!1)}}async function ce(e){if(e.preventDefault(),_)return;let t=new FormData(e.currentTarget),n=String(t.get(`code`)??``).trim().toUpperCase();if(n.length!==6){w(`请输入 6 位房间码`);return}T(!0);try{d=await s.getSessionByCode(n),fe(!0)}catch(e){w(e.message)}finally{T(!1)}}async function F(e){if(_||!d)return;let t=d.participants.find(t=>t.person_id===e);if(!t)return;let n=o.get(e),r=n?px(n):{person_id:t.person_id,display_name:t.display_name,avatar_ref:t.avatar_ref??null};T(!0);try{let t=await s.joinSession(d.code,r);f=e,p=!1,k(t,!0),O(),j()}catch(e){w(e.message),(e.status===409||e.status===404)&&(d=await s.getSessionByCode(d.code).catch(()=>null),fe(!0))}finally{T(!1)}}async function le(){if(!(_||!d)){T(!0);try{d=await s.getSessionByCode(d.code),fe(!0)}catch(e){d=null,w(e.message),fe(!0)}finally{T(!1)}}}async function ue(e){if(e.preventDefault(),_)return;let t=new FormData(e.currentTarget),n=u.participants.map(e=>({subjectId:e.person_id,value:String(t.get(`impression:${e.person_id}`)??``).trim()}));if(n.some(e=>!e.value)){w(`请写完这一组第一印象`);return}T(!0);try{let e=await s.writeImpressions(u.session_id,f,n.map(e=>({subject_id:e.subjectId,value:e.value})));for(let e of n)v.delete(`${f}:${e.subjectId}`);k(e,!0),w(`这一组第一印象已收下`)}catch(e){w(e.message);let t=await s.getSession(u.session_id,f).catch(()=>null);t&&k(t,!0)}finally{T(!1)}}async function de(e){if(!_){T(!0);try{k(await e(),!0)}catch(e){w(e.message)}finally{T(!1)}}}function fe(e=!1){!e&&!y.classList.contains(`is-open`)||(M(),N(),u?u.phase===`impressions`?P():u.phase===`game`?ne():re():d?te():ee(),Dy({icons:lx,root:S,attrs:{"stroke-width":1.8}}),Dy({icons:lx,root:x,attrs:{"stroke-width":1.8}}),oe())}y.querySelector(`.gp-close`).addEventListener(`click`,D),b.addEventListener(`click`,E),Dy({icons:lx,root:y.querySelector(`.gp-header`),attrs:{"stroke-width":1.8}}),Dy({icons:lx,root:b,attrs:{"stroke-width":1.8}}),fe(!0);let pe=c.searchParams.get(`groupRoom`),me=c.searchParams.get(`groupPlayer`);return pe&&me?s.getSession(pe,f).then(e=>{if(!e.participants.some(e=>e.person_id===f))throw Error(`这个恢复链接不属于当前设备身份`);k(e,!0),O(),j(),E()}).catch(e=>{e.status===404?(A(),w(`现场房间已结束，已回到普通世界`)):w(e.message)}):l&&E(),{open:E,close:D,get isOpen(){return y.classList.contains(`is-open`)},getRoom:()=>u,getViewerId:()=>f}}var hx={Check:bv,CircleAlert:Sv,ImagePlus:Lv,LoaderCircle:Vv,PartyPopper:$v,RefreshCw:ay,ScanFace:cy,Sparkles:fy,UserPlus:by,Users:Cy,X:Ey},gx=Object.freeze({upload:{title:`一张合照，朋友们一起入场`,crumb:0},detecting:{title:`正在寻找照片里的面孔`,crumb:1},assign:{title:`TA 们都叫什么？`,crumb:1},success:{title:`朋友们已进场`,crumb:2}}),_x=Object.freeze([`上传合照`,`认脸`,`入场`]),vx=`.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp`,yx=/^image\/(jpeg|png|webp)$/,bx=26214400;function xx(e){return String(e??``).replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&#039;`)}function Sx(e,t=``){return`<i data-lucide="${e}"${t?` class="${t}"`:``}></i>`}function Cx(e){return Number.isFinite(e)?e>=1048576?`${(e/1024/1024).toFixed(1)} MB`:`${Math.round(e/1024)} KB`:``}function wx(e,t){let n=String(e?.message??``).trim();return n&&n.length<=60?n:t}function Tx(e,t,n={}){if(!e)throw Error(`mountOnboardingFlow 需要一个容器元素`);if(!t||typeof t.detectGroupPhoto!=`function`||typeof t.confirmGroupPhoto!=`function`)throw Error(`mountOnboardingFlow 需要 api 实现 detectGroupPhoto / confirmGroupPhoto`);let r=typeof n.onComplete==`function`?n.onComplete:()=>{},i=typeof n.onClose==`function`?n.onClose:()=>{},a=typeof n.onNavigateHall==`function`?n.onNavigateHall:null,o=!0,s=!1,c=0,l=!1,u={phase:`upload`,file:null,previewUrl:``,groupId:null,sourceRef:null,detector:null,faces:[],issues:[],result:null,submitting:!1,error:null,fileError:``},d=document.createElement(`div`);d.className=`ob-overlay`,d.setAttribute(`role`,`dialog`),d.setAttribute(`aria-modal`,`true`),d.setAttribute(`aria-label`,`合照入场流程`),d.tabIndex=-1,e.append(d);function f(e){Dy({icons:hx,root:e,attrs:{"stroke-width":1.8}})}function p(){u.previewUrl&&URL.revokeObjectURL(u.previewUrl),u.previewUrl=``}function m(){p(),u.phase=`upload`,u.file=null,u.groupId=null,u.sourceRef=null,u.detector=null,u.faces=[],u.issues=[],u.result=null,u.submitting=!1,u.error=null,u.fileError=``,l=!1}function h(){return u.faces.filter(e=>!e.skipped&&e.name.trim())}function g(){let e=gx[u.phase];d.innerHTML=`
      <div class="ob-panel" data-ob-panel>
        <header class="ob-header">
          <span class="ob-brand">EW</span>
          <div class="ob-header-copy">
            <small>ECHOWORLD · 合照入场</small>
            <strong>${e.title}</strong>
          </div>
          <ol class="ob-crumb" aria-label="流程进度">
            ${_x.map((t,n)=>`
              <li class="${n<e.crumb?`is-done`:``}${n===e.crumb?`is-current`:``}">
                <i></i><span>${t}</span>
              </li>`).join(``)}
          </ol>
          <button class="ob-icon-button" type="button" data-action="close" title="关闭" aria-label="关闭合照入场">${Sx(`x`)}</button>
        </header>
        <div class="ob-body" data-ob-body></div>
      </div>`;let t=d.querySelector(`[data-ob-body]`);u.phase===`upload`?v(t):u.phase===`detecting`?y(t):u.phase===`assign`?x(t):u.phase===`success`&&S(t),f(d)}function _(e){return!u.error||u.error.phase!==e?``:`
      <div class="ob-error" role="alert">
        ${Sx(`circle-alert`)}
        <span>${xx(u.error.message)}</span>
      </div>`}function v(e){e.innerHTML=`
      <div class="ob-dropzone" data-ob-dropzone role="button" tabindex="0" aria-label="拖拽或点击选择合照">
        <input type="file" data-ob-file-input accept="${vx}" hidden />
        ${u.previewUrl?`<img class="ob-preview" src="${u.previewUrl}" alt="合照预览" />`:`<span class="ob-dropzone-icon">${Sx(`image-plus`)}</span>
             <strong>拖拽一张合照到这里</strong>
             <small>或点击选择 · 支持 JPG / PNG / WebP · ≤ 25MB</small>`}
      </div>
      ${u.file?`
        <p class="ob-file-line">${Sx(`users`)}${xx(u.file.name)} · ${Cx(u.file.size)}
          <button class="ob-link" type="button" data-action="clear-file">换一张</button>
        </p>`:``}
      ${u.fileError?`<p class="ob-file-error" role="alert">${Sx(`circle-alert`)}${xx(u.fileError)}</p>`:``}
      ${_(`upload`)}
      <footer class="ob-footer">
        <span class="ob-footer-hint">照片只用于识别人脸与生成形象，原件落盘后只增不改</span>
        <button class="ob-button-primary" type="button" data-action="submit-detect" ${u.file?``:`disabled`}>
          开始认脸${Sx(`sparkles`)}
        </button>
      </footer>`}function y(e){let t=u.error?.phase===`detecting`;e.innerHTML=`
      <div class="ob-detect-stage">
        ${u.previewUrl?`<img class="ob-detect-photo${t?` is-dim`:``}" src="${u.previewUrl}" alt="合照" />`:``}
        <span class="ob-detect-orb${t?` is-failed`:``}">
          ${Sx(t?`circle-alert`:`scan-face`,t?``:`ob-pulse`)}
        </span>
        <h2>${t?`认脸没有成功`:`正在照片里寻找朋友们的脸…`}</h2>
        <p>${t?`照片已安全落盘，可以直接重试`:`AI 正在框出前景的每一位朋友，背景路人会被忽略`}</p>
        ${t?`
          ${_(`detecting`)}
          <div class="ob-error-actions">
            <button class="ob-button-primary" type="button" data-action="retry-detect">${Sx(`refresh-cw`)}重试认脸</button>
            <button class="ob-button-ghost" type="button" data-action="back-upload">换一张照片</button>
          </div>`:``}
      </div>`}function b(e){let t=e.width>=1?0:(100*e.x/(1-e.width)).toFixed(2),n=e.height>=1?0:(100*e.y/(1-e.height)).toFixed(2);return`background-image:url(${u.previewUrl});background-size:${(100/e.width).toFixed(2)}% ${(100/e.height).toFixed(2)}%;background-position:${t}% ${n}%;`}function x(e){if(u.faces.length===0){e.innerHTML=`
        <div class="ob-detect-stage">
          ${u.previewUrl?`<img class="ob-detect-photo is-dim" src="${u.previewUrl}" alt="合照" />`:``}
          <span class="ob-detect-orb is-failed">${Sx(`scan-face`)}</span>
          <h2>没有认出清晰的人脸</h2>
          <p>换一张大家正对镜头、光线更好的合照试试</p>
          <div class="ob-error-actions">
            <button class="ob-button-primary" type="button" data-action="retry-detect">${Sx(`refresh-cw`)}重新认脸</button>
            <button class="ob-button-ghost" type="button" data-action="back-upload">换一张照片</button>
          </div>
        </div>`;return}let t=h().length;e.innerHTML=`
      <div class="ob-photo-wrap" data-ob-photo-wrap>
        <img class="ob-photo" src="${u.previewUrl}" alt="合照 · 人脸框选" />
        ${u.faces.map((e,t)=>`
          <span class="ob-bbox${e.skipped?` is-skipped`:``}" style="
            left:${(e.bbox.x*100).toFixed(2)}%;top:${(e.bbox.y*100).toFixed(2)}%;
            width:${(e.bbox.width*100).toFixed(2)}%;height:${(e.bbox.height*100).toFixed(2)}%;">
            <em>${t+1}</em>
          </span>`).join(``)}
      </div>
      ${u.issues.length>0?`
        <p class="ob-issues">${Sx(`circle-alert`)}${xx(u.issues.join(`；`))}</p>`:``}
      <ul class="ob-face-list" aria-label="逐脸确认姓名">
        ${u.faces.map((e,t)=>`
          <li class="ob-face-row${e.skipped?` is-skipped`:``}" data-face="${e.face_id}">
            <span class="ob-face-chip" style="${b(e.bbox)}" aria-hidden="true"></span>
            <span class="ob-face-index">${t+1}</span>
            <input type="text" data-face-name="${e.face_id}" maxlength="24"
              placeholder="TA 的称呼" value="${xx(e.name)}"
              ${e.skipped?`disabled`:``} autocomplete="off" />
            <button class="ob-link" type="button" data-action="toggle-skip" data-face-id="${e.face_id}">
              ${e.skipped?`恢复`:`跳过`}
            </button>
          </li>`).join(``)}
      </ul>
      ${_(`assign`)}
      <footer class="ob-footer">
        <span class="ob-footer-hint">从左到右编号 · 跳过的人不会入场 · 确认后才写入你的世界</span>
        <div class="ob-footer-actions">
          <button class="ob-button-ghost" type="button" data-action="retry-detect">${Sx(`refresh-cw`)}重新认脸</button>
          <button class="ob-button-primary" type="button" data-action="submit-confirm" data-ob-submit ${t===0||u.submitting?`disabled`:``}>
            ${u.submitting?Sx(`loader-circle`,`ob-spin`):Sx(`user-plus`)}${u.submitting?`正在入场…`:`确认 ${t} 位朋友入场`}
          </button>
        </div>
      </footer>`}function S(e){let t=u.result?.participants??[],n=t.map(e=>e.name).filter(Boolean),r=t.filter(e=>e.booth_status===`queued`||!e.booth_id).length;e.innerHTML=`
      <div class="ob-success">
        <span class="ob-success-halo"></span>
        <span class="ob-success-halo is-late"></span>
        <span class="ob-success-badge">${Sx(`party-popper`)}</span>
        <h2>${t.length} 位朋友已进入集市</h2>
        <div class="ob-chip-row">
          ${n.map(e=>`<span class="ob-chip">${Sx(`check`)}${xx(e)}</span>`).join(``)}
        </div>
        <p>${r>0?r===t.length?`集市展位暂时满了，TA 们的展位排队中，扩容后自动上墙`:`大部分展位已经搭好；${r} 位朋友的展位排队中，扩容后自动上墙`:`TA 们的展位已经搭好，走进大厅就能看到`}</p>
        <button class="ob-button-primary" type="button" data-action="finish">
          ${a?`去集市看看${Sx(`sparkles`)}`:`太好了`}
        </button>
      </div>`}function C(e){if(u.fileError=``,e){if(!yx.test(e.type||``)){u.fileError=`合照只支持 JPG / PNG / WebP`,g();return}if(e.size>bx){u.fileError=`合照超过 25MB，请压缩后再试`,g();return}p(),u.file=e,u.previewUrl=URL.createObjectURL(e),u.error=null,g()}}async function w(){if(!u.file)return;let e=++c;u.phase=`detecting`,u.error=null,g();try{let n=await t.detectGroupPhoto(u.file);if(e!==c||!o)return;if(!n?.group_id||!Array.isArray(n.faces))throw Error(`识别服务返回格式不正确，请重试`);u.groupId=n.group_id,u.sourceRef=n.source_ref??null,u.detector=n.detector??null,u.issues=Array.isArray(n.issues)?n.issues:[],u.faces=n.faces.filter(e=>e?.bbox).map((e,t)=>({face_id:e.face_id??`face_${t+1}`,bbox:e.bbox,face_ref:e.face_ref??null,name:``,skipped:!1})),u.phase=`assign`,g()}catch(t){if(e!==c||!o)return;console.error(`[OnboardingFlow] detect failed:`,t),u.error={phase:`detecting`,message:wx(t,`认脸失败，请检查网络后重试`)},g()}}async function T(){let e=h();if(e.length===0||u.submitting)return;let n=++c;u.submitting=!0,u.error=null,g();try{let i=e.map(e=>({face_id:e.face_id,face_ref:e.face_ref,name:e.name.trim()})),a=await t.confirmGroupPhoto(u.groupId,i);if(n!==c||!o)return;if(!Array.isArray(a?.participants))throw Error(`入场服务返回格式不正确，请重试`);if(u.result=a,u.submitting=!1,u.phase=`success`,g(),!l){l=!0;try{r({count:a.participants.length,names:a.participants.map(e=>e.name).filter(Boolean),participants:a.participants})}catch(e){console.error(`[OnboardingFlow] onComplete callback failed:`,e)}}}catch(e){if(n!==c||!o)return;console.error(`[OnboardingFlow] confirm failed:`,e),u.submitting=!1,u.error={phase:`assign`,message:wx(e,`入场失败，请重试`)},g()}}function E(){O(),a&&a()}function D(){c+=1,m(),s=!0,g(),d.classList.add(`is-open`),d.removeAttribute(`aria-hidden`),d.focus({preventScroll:!0})}function O(){s&&(c+=1,s=!1,d.classList.remove(`is-open`),d.setAttribute(`aria-hidden`,`true`),i())}function k(){o&&(o=!1,c+=1,p(),d.remove())}return d.addEventListener(`click`,e=>{let t=e.target.closest(`button, [data-ob-dropzone]`);if(!t||!d.contains(t))return;let n=t.dataset.action;if(n===`close`)O();else if(n===`submit-detect`)w();else if(n===`retry-detect`)w();else if(n===`back-upload`)c+=1,u.phase=`upload`,u.error=null,g();else if(n===`clear-file`)p(),u.file=null,u.fileError=``,g();else if(n===`toggle-skip`){let e=u.faces.find(e=>e.face_id===t.dataset.faceId);e&&(e.skipped=!e.skipped,g())}else n===`submit-confirm`?T():n===`finish`?E():t.hasAttribute(`data-ob-dropzone`)&&d.querySelector(`[data-ob-file-input]`)?.click()}),d.addEventListener(`keydown`,e=>{(e.key===`Enter`||e.key===` `)&&e.target.hasAttribute?.(`data-ob-dropzone`)&&(e.preventDefault(),d.querySelector(`[data-ob-file-input]`)?.click())}),d.addEventListener(`change`,e=>{let t=e.target;t.matches(`[data-ob-file-input]`)&&(C(t.files?.[0]??null),t.value=``)}),d.addEventListener(`input`,e=>{let t=e.target;if(t.matches(`[data-face-name]`)){let e=u.faces.find(e=>e.face_id===t.dataset.faceName);if(!e)return;e.name=t.value;let n=d.querySelector(`[data-ob-submit]`);if(n){let e=h().length;n.disabled=e===0||u.submitting,n.innerHTML=`${Sx(`user-plus`)}确认 ${e} 位朋友入场`,f(n)}}}),d.addEventListener(`dragover`,e=>{e.target.closest(`[data-ob-dropzone]`)&&e.preventDefault()}),d.addEventListener(`drop`,e=>{e.target.closest(`[data-ob-dropzone]`)&&(e.preventDefault(),C(e.dataTransfer?.files?.[0]??null))}),{open:D,close:O,unmount:k,isOpen:()=>s,phase:()=>u.phase}}var Ex={CloudUpload:Dv,Coffee:Ov,ScanFace:cy,Store:my,Users:Cy},Dx=`
.echo-integrations .record-fab {
  position: fixed;
  z-index: 30;
  bottom: max(92px, calc(env(safe-area-inset-bottom) + 72px));
  left: max(20px, env(safe-area-inset-left));
  display: none;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border: 1px solid rgb(255 255 255 / 56%);
  border-radius: 19px;
  color: var(--ink, #193d36);
  background: var(--glass, rgb(250 250 246 / 78%));
  box-shadow: 0 12px 30px rgb(18 45 39 / 18%);
  backdrop-filter: blur(16px) saturate(1.05);
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition: transform 180ms ease, box-shadow 180ms ease;
}
.echo-integrations .record-fab:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 34px rgb(18 45 39 / 24%);
}
.echo-integrations .record-fab:active { transform: translateY(0); }
.echo-integrations .record-fab svg { width: 20px; height: 20px; color: var(--coral, #d36f59); }
.echo-integrations .record-fab span { display: flex; flex-direction: column; line-height: 1.3; }
.echo-integrations .record-fab small {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.12em;
  opacity: 0.62;
  text-transform: uppercase;
}
.echo-integrations .record-fab strong { font-size: 12px; font-weight: 800; }
.echo-integrations .record-fab[hidden] { display: none !important; }
body[data-view="cafe"] .echo-integrations .record-fab { display: flex; }

/* 世界切换导航：叠放在「记录相遇」之上，两个世界各显示对应的出口 */
.echo-integrations .nav-world-fab {
  bottom: max(160px, calc(env(safe-area-inset-bottom) + 140px));
}

/* 「合照入场」：再上一层；空集市时 pulse 吸引注意 */
.echo-integrations .onboard-fab {
  bottom: max(228px, calc(env(safe-area-inset-bottom) + 208px));
}
.echo-integrations .onboard-fab.is-suggested {
  animation: echo-onboard-pulse 1.8s ease-in-out infinite;
  border-color: rgb(229 180 81 / 80%);
}
@keyframes echo-onboard-pulse {
  0%, 100% { box-shadow: 0 12px 30px rgb(18 45 39 / 18%); }
  50% { box-shadow: 0 12px 34px rgb(229 180 81 / 45%); }
}

.echo-integrations .group-fab {
  right: max(20px, env(safe-area-inset-right));
  left: auto;
  display: flex;
  border-radius: 6px;
  color: #fff;
  background: rgb(28 75 65 / 90%);
}
.echo-integrations .group-fab svg { color: #efc76f; }
.echo-integrations .group-fab small { color: rgb(255 255 255 / 68%); }
.echo-integrations.has-group-room .group-fab { display: none; }

@media (max-width: 640px) {
  .echo-integrations .group-fab {
    width: 46px;
    height: 46px;
    padding: 0;
    justify-content: center;
  }
  .echo-integrations .group-fab span { display: none; }
}

.echo-integrations-toast {
  position: fixed;
  z-index: 60;
  bottom: 24px;
  left: 50%;
  padding: 10px 16px;
  border: 1px solid rgb(255 255 255 / 42%);
  border-radius: 16px;
  color: #fffdf4;
  background: rgb(21 58 50 / 88%);
  box-shadow: 0 12px 32px rgb(18 45 39 / 19%);
  font-size: 10px;
  font-weight: 700;
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, 10px);
  transition: opacity 200ms ease, transform 200ms ease;
}
.echo-integrations-toast.is-visible { opacity: 1; transform: translate(-50%, 0); }
`;function Ox(e){if(e==null)return``;let t=String(e).trim();return t?/^(?:https?:)?\/\//.test(t)||t.startsWith(`data:`)||t.startsWith(`blob:`)?t:Vg()&&(t.startsWith(`facts/`)||t.startsWith(`derived/`))?`/echoworld/api/v0/media/${t}`:md(t):``}function kx(e=Ag){let t=null;return{ingest(t,n){let{files:r,...i}=t??{};return e.ingest(Array.isArray(r)?r:[],i)},pipelineStream(t,n,r){return e.pipelineStream(t,n,r)},confirm(t){return e.confirm(t?.encounter_draft,t?.identity??{},t?.privacy??`self-only`)},detectGroupPhoto(t,n){return e.groupOnboardingDetect(t,n)},confirmGroupPhoto(t,n){return e.groupOnboardingConfirm(t,n)},fetchSnapshot(){return e.fetchSnapshot()},getPackage(t){return e.getPackage(t)},chatWithAgent(t,n,r){return e.chatWithAgent(t,n,r)},saveChatNote(t,n){return e.saveChatNote(t,n)},startMeeting(t,n){return e.startMeeting(t,n)},postMeetingMessage(t){return e.postMeetingMessage(t)},endMeeting(){return typeof e.endMeeting==`function`?e.endMeeting():Promise.resolve({meeting_id:null,ended:!0})},setEncounterPrivacy(t,n,r){return e.setEncounterPrivacy(t,n,r)},getPersonSignal(t){return e.getPersonSignal(t)},getField(t){return e.getField(t)},regenerateField(t){return e.regenerateField(t)},getWorldEvents(t){return e.getWorldEvents(t)},getWorldBrief(){return e.getWorldBrief()},recordWorldInteraction(t){return e.recordWorldInteraction(t)},search(t){return e.search(t)},getPackages(){return t||=e.getPackages().catch(e=>{throw t=null,e}),t},invalidatePackages(){t=null},resolveMediaUrl:Ox,assetUrl:Ox}}var Ax=null;function jx(e){let t=document.querySelector(`.echo-integrations-toast`);t||(t=document.createElement(`div`),t.className=`echo-integrations-toast`,document.body.append(t)),t.textContent=e,t.classList.add(`is-visible`),window.clearTimeout(Ax),Ax=window.setTimeout(()=>t.classList.remove(`is-visible`),2600)}function Mx({api:e=null,onPersonSelectedHook:t=null,onPackagesChangedHook:n=null,onToastHook:r=null,presenceProvider:i=null,groupParticipants:a=[],groupPresenceProvider:o=null,onGroupPresenceHook:s=null}={}){let c=e??kx(),l=typeof r==`function`?r:jx,u=typeof t==`function`?t:()=>!1,d=document.createElement(`div`);d.className=`echo-integrations`,document.body.append(d);let f=document.createElement(`style`);f.textContent=Dx,document.head.append(f);let p=Rb(d,c);typeof i==`function`&&p.setPresenceProvider(i);let m=[],h=ix(d,c,{people:m,onConfirmed({person_id:e}={}){c.invalidatePackages(),y().catch(e=>{console.warn(`[integrations] confirm 后刷新资料包列表失败`,e)}),l(`TA 已住进你的世界`);try{u(e)}catch(e){console.warn(`[integrations] 新确认的人尚不在世界中，跳过选中`,e)}}});h.close();let g=mx(d,{participants:a,getLocalPresence:o,onPresence:s,onToast:l}),_=[`hall`,`cafe`,`field`].includes(document.body.dataset.world)?document.body.dataset.world:`hall`,v=Tx(d,c,{onComplete({count:e,names:t}){c.invalidatePackages(),y().catch(e=>{console.warn(`[integrations] 合照入场后刷新资料包列表失败`,e)}),l(`${e} 位朋友已进入集市${t?.length?`：${t.join(`、`)}`:``}`)},onNavigateHall:_===`hall`?null:()=>K_(`hall`)});function y(){return c.getPackages().then(e=>{m.length=0;for(let t of Array.isArray(e)?e:[]){let e=t?.person_id??t?.id,n=t?.identity?.name??t?.name??e;e&&m.push({person_id:e,name:n})}return n?.(e),e})}y().catch(e=>{console.warn(`[integrations] getPackages 首次拉取失败`,e)});let b=document.createElement(`button`);b.className=`record-fab`,b.type=`button`,b.setAttribute(`aria-label`,`记录一次相遇`),b.innerHTML=`<i data-lucide="cloud-upload"></i><span><small>Echo 录入</small><strong>记录相遇</strong></span>`,b.addEventListener(`click`,()=>h.open()),d.append(b);let x=_===`hall`?`cafe`:`hall`,S=x===`cafe`,C=document.createElement(`button`);C.className=`record-fab nav-world-fab`,C.type=`button`,C.setAttribute(`aria-label`,S?`去咖啡厅坐坐`:`回到我的集市`),C.innerHTML=`<i data-lucide="${S?`coffee`:`store`}"></i><span><small>${S?`Echo Cafe`:`Echo 集市`}</small><strong>${S?`去咖啡厅坐坐`:`回到我的集市`}</strong></span>`,C.addEventListener(`click`,()=>K_(x)),d.append(C);let w=document.createElement(`button`);w.className=`record-fab onboard-fab`,w.type=`button`,w.setAttribute(`aria-label`,`用一张合照让朋友们入场`),w.innerHTML=`<i data-lucide="scan-face"></i><span><small>Group Onboarding</small><strong>合照入场</strong></span>`,w.addEventListener(`click`,()=>v.open()),d.append(w),_===`hall`&&window.setTimeout(()=>{document.querySelector(`#world`)?.dataset.boothCount===`0`&&(w.classList.add(`is-suggested`),l(`集市还空着——用一张合照让大家一起入场`))},5e3);let T=document.createElement(`button`);T.className=`record-fab group-fab`,T.type=`button`,T.setAttribute(`aria-label`,`进入现场房间`),T.title=`进入现场房间`,T.innerHTML=`<i data-lucide="users"></i><span><small>第一印象 · 猜作者</small><strong>现场一起玩</strong></span>`,T.addEventListener(`click`,()=>g.open()),d.append(T),_===`hall`&&(T.hidden=!0),_===`field`&&(b.hidden=!0,T.hidden=!0,w.hidden=!0);for(let e of[b,C,w,T])Dy({icons:Ex,root:e,attrs:{"stroke-width":1.8}});return{api:c,flow:h,panel:p,searchBar:null,groupPlay:g,onboardingFlow:v,openPipeline:()=>h.open(),openOnboarding:()=>v.open(),refreshPackages:y}}var Nx=md(`data/world-spec.json`),Px=G_(),Fx=Px.id===`hall`,Ix=Px.id===`cafe`,Lx=Px.id===`field`,Rx=Fx?_g():Ix?fp():null,zx=pg(),Bx=new URL(window.location.href),Vx=!1;(Fx||Ix)&&Bx.searchParams.has(`scene`)&&Bx.searchParams.get(`scene`)!==Rx.id?(Bx.searchParams.set(`scene`,Rx.id),Vx=!0):Lx&&Bx.searchParams.has(`scene`)&&(Bx.searchParams.delete(`scene`),Vx=!0),Bx.searchParams.has(`character`)&&Bx.searchParams.get(`character`)!==zx.id&&(Bx.searchParams.set(`character`,zx.id),Vx=!0),Vx&&window.history.replaceState(window.history.state,``,Bx);var Hx=q_()??cd[0].id,Ux=cd.find(e=>e.id===Hx)??cd[0],Wx=new URLSearchParams(window.location.search).get(`invite`),Gx=new URLSearchParams(window.location.search),Kx=Gx.get(`role`)===`screen`||Gx.get(`groupScreen`)===`1`,qx=Gx.get(`room`),Jx=Fx?Rx.visualProfile:Lx?`current`:Rx.visualProfile,Yx=Fx?Rx.environmentAssetId:Lx?W_.environmentAssetId:Rx.environmentAssetId,Xx=Yx===sp.environmentAssetId,Zx=Yx===`environment.village-market.v1`?Jh.cafeDoor:Object.freeze({x:-4.1,z:.6}),Qx=cm(Yx),Z=Qx.bounds,$x=Fx||Ix?Rx.title:Px.title,eS=Fx?Rx.cinematic:null;document.body.dataset.world=Px.id;var tS=3.24,nS=Yx!==`environment.village-market.v1`,rS=!1,iS=.018,aS=.06,oS=.72,sS=.08,cS=.24,lS=new U(0,0,1),uS=1.5,dS=4,fS=.9,pS=Math.PI/12,mS=Object.freeze(cd.map(e=>e.palette));function hS(e){let t=0;for(let n of String(e))t=(t*31+n.charCodeAt(0))%9973;return t}var gS=globalThis.__ECHOWORLD_OPTIONS__??{},_S=null,vS=gS.api??null,yS=vS&&[`ingest`,`pipelineStream`,`confirm`].every(e=>typeof vS[e]==`function`)?vS:null;vS&&!yS&&console.warn(`[EchoWorld] 注入的 api 缺少 ingest/pipelineStream/confirm，回退为内置 MockApi 适配层`);var bS=Mx({api:yS,onPersonSelectedHook:e=>gT(e),onPackagesChangedHook:e=>eT(e),onToastHook:e=>_T(e),presenceProvider:e=>jT(e),groupParticipants:[sd,...cd],groupPresenceProvider:()=>MT(),onGroupPresenceHook:(e,t)=>NT(e,t)}),xS=bS.api;Db(document.body,{baseUrl:`/echoworld/api/v1`,currentUser:sd,screenMode:Kx,screenRoomId:qx,getLocalPresence:()=>MT(),onRemotePresence:(e,t)=>PT(e,t),onToast:e=>_T(e)});var SS=typeof gS.onPersonSelected==`function`?gS.onPersonSelected:e=>{e&&bS.panel.openPerson(e)},CS=gS.live!==!1&&!Lx,wS=!1,TS=Ix&&new URLSearchParams(window.location.search).get(`api`)!==`mock`,ES=Number.isFinite(gS.snapshotPollMs)&&gS.snapshotPollMs>=250?gS.snapshotPollMs:Fx?H_.snapshotPollMs:U_.snapshotPollMs,Q=document.querySelector(`#world`),DS=document.querySelector(`#loading`),OS=document.querySelector(`#loading-bar`),kS=document.querySelector(`#loading-progress`),AS=document.querySelector(`#loading-copy`),jS=document.querySelector(`#player-label`),MS=document.querySelector(`#touch-stick`),NS=document.querySelector(`#touch-knob`),PS=document.querySelector(`#fatal-error`),FS=new Kn,IS=new P_(Q),LS=new B_({canvas:Q,fov:48,aspect:1,near:.06,far:eS?.far??80,distance:4.8,pitch:.42}),RS=LS.camera;RS.position.set(6.7,4.6,8.2),_S=new lg({camera:RS,worldId:Px.id,resolveUrl:md,onStateChange:e=>{Q.dataset.audioZone=e.zone,Q.dataset.audioState=e.activeAmbient??(e.freeRoam?`waiting`:`silent`),Q.dataset.audioUnlocked=String(e.unlocked),Q.dataset.audioEffect=e.lastEffect??``,Q.dataset.audioClickCount=String(e.effectPlayCounts.click),Q.dataset.audioNotificationCount=String(e.effectPlayCounts.notification)}}),_S.preload();var zS=Object.freeze(Ix?{...Z,openings:Object.freeze([Object.freeze({side:`maxZ`,min:-1.65,max:1.65})])}:{minX:Z.minX-LS.maxDistance,maxX:Z.maxX+LS.maxDistance,minZ:Z.minZ-LS.maxDistance,maxZ:Z.maxZ+LS.maxDistance}),BS=new od({canvas:Q,antialias:!0,alpha:!1,powerPreference:`high-performance`});BS.outputColorSpace=Ge,BS.shadowMap.enabled=!0,$_(FS,BS,Jx);var VS=new fs;VS.connect(document);var HS=new Rs,US=new Rs,WS=new U,GS=new U(0,-1,0),KS=new H,qS=new H,JS=!1,YS=new H,XS=new H,ZS=new U,QS=new U(0,0,-1),$S=new N_({speed:tS}),eC=new U,tC=new U,nC=new U(0,.85,0),rC=new U,iC=new U,aC=new Rt,oC=new U(0,1,0),sC=1.8,cC=1.35,lC=.35,uC=.45,dC=1.65,fC=new U,pC=new U,mC=new U,hC=new U(...eS?.position??[6.45,4.55,8]),gC=new U(...eS?.target??[0,.72,-.35]),_C=eS?.orbit??[.45,.12,.34],vC=[],yC=!1,bC=null,xC=null,SC=null,CC=null,$=null,wC=0,TC=null,EC=null,DC=null,OC=`intro`,kC=!1,AC=!1,jC=0,MC=0,NC=new Tp,PC=new Im,FC=new gh(fd);PC.setVisible(!1);var IC=new Map,LC=new Map,RC=new Map,zC=new Map,BC=new Map,VC=new U,HC=[],UC=null,WC=null,GC=null,KC=0,qC=null,JC=null,YC=null,XC=null,ZC=null,QC=null,$C=null,ew=null,tw=null,nw=null,rw=null,iw=cd.some(e=>e.id===Wx)?Wx:null,aw=null,ow=null,sw=[],cw=new Map,lw=new Map,uw=new Set,dw=new Map,fw=new H,pw=0,mw=0,hw=!1,gw=null,_w=ab({root:document.querySelector(`#ui-root`),currentUser:sd,people:cd,relationships:ld,sceneVariants:Fx?gg:Ix?dp:[],activeSceneVariant:Rx,characterVariants:fg,activeCharacterVariant:zx,signalStore:FC,onViewChange:Rw,onSceneVariantChange:e=>{e!==Rx?.id&&(Fx?vg(e):Ix&&pp(e))},onCharacterVariantChange:e=>{e!==zx.id&&hg(e)},onLocatePerson:e=>Uw(e.id),onMeetingStart:Jw,onMeetingEnd:Zw,onNotification:()=>_S?.playNotification(),resolveMediaUrl:Ox,world:Px.id,fieldPerson:Lx?Ux:null,onExpressionChange:(e,t,n)=>{hE(e,t,n)},onProfileChange:gE}),vw=ub({onAction:hT}),yw=FC.subscribe((e,t)=>{e?PC.setSignal(e.personId,e):t.removed&&PC.unregister(t.personId),Q.dataset.lastSignalUpdate=t.personId,Q.dataset.signalUpdateSource=t.source});async function bw(e){try{let t=await xS.getPersonSignal(e);t&&FC.upsert(t,{source:`k3-rest`})}catch(t){console.warn(`[EchoWorld] ${e} 的生理聚合暂不可用`,t)}}async function xw(e){await Bg()&&bw(e)}for(let e of cd)xw(e.id);Q.dataset.ready=`false`,Q.dataset.appView=OC,Q.dataset.roundtableReserved=`true`,Q.dataset.characterVariant=zx.id,Q.dataset.world=Px.id,Q.dataset.expressionVariant=zx.id;var Sw=document.querySelector(`#world-speech-layer`),Cw=document.createElement(`div`);Cw.style.cssText=`position:fixed;top:88px;right:18px;z-index:60;display:flex;flex-direction:column;gap:8px;align-items:flex-end;pointer-events:none;`,document.body.append(Cw);var ww=document.createElement(`div`);ww.style.cssText=`position:fixed;right:18px;bottom:18px;z-index:60;display:none;align-items:center;gap:7px;padding:7px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.4);background:rgba(20,54,47,.72);backdrop-filter:blur(14px);color:#fffdf4;font-size:10px;font-weight:700;letter-spacing:.08em;`,document.body.append(ww);var Tw=document.createElement(`div`);Tw.style.cssText=`position:fixed;z-index:35;display:none;pointer-events:none;padding:6px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.5);background:rgba(20,54,47,.82);color:#fffdf4;font-size:10px;font-weight:700;letter-spacing:.05em;backdrop-filter:blur(10px);transform:translate(14px,-130%);white-space:nowrap;`,document.body.append(Tw);function Ew(){let e=window.innerWidth,t=window.innerHeight;BS.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75)),BS.setSize(e,t,!1),RS.aspect=e/Math.max(t,1),RS.updateProjectionMatrix()}function Dw(e,t=null){let n=Math.round(Lt.clamp(e,0,1)*100);OS.style.width=`${n}%`,kS.textContent=`${n}%`,t&&(AS.textContent=t)}function Ow(e,t){WS.set(e,12,t),US.set(WS,GS);let n=US.intersectObjects(vC,!1);return n.length>0?n[0].point.y:null}function kw(e,t,n,r){let i=new K(new Va(t,n,30),new gi({color:e,transparent:!0,opacity:r,depthWrite:!1,side:2}));return i.rotation.x=-Math.PI*.5,i.renderOrder=4,FS.add(i),i}function Aw(){let e={x:(Z.minX+Z.maxX)*.5,z:(Z.minZ+Z.maxZ)*.5};return Ix&&(e.z=2.35),e}function jw(){let e=(xC?.entities??[]).map(e=>({x:e.root.position.x,z:e.root.position.z,radius:e.collider?.radius??Op.radius}));for(let t of dw.values())e.push({x:t.x,z:t.z,radius:Op.radius});return e}function Mw(e,t=[]){return hm({count:e,bounds:Z,blockers:VT(),occupied:t,surfaceHeightAt:Ow,center:Aw(),characterRadius:Op.radius,clearance:.12,minSeparation:.76,maxRadius:Ix?2.35:Lx?1.8:3})}function Nw(e,t,n,r=.005){let i=e.avatar&&typeof e.avatar==`object`?e.avatar:{};return{instance_id:t,person_id:e.id,asset_id:mg(zx,e.id),fallback_asset_id:zx.fallbackAssetId,asset_url:i.model_ref?Ox(i.model_ref):null,texture_url:i.texture_ref?Ox(i.texture_ref):null,expression_refs:Object.fromEntries(Object.entries(i.expression_refs??{}).map(([e,t])=>[e,Ox(t)])),texture_filter:zx.textureFilter,lock_texture_colors:!0,profile:{person_id:e.id,display_name:e.displayName??e.name,relation:e.relation,palette:e.palette},palette:e.palette,spawn:{...n,scale:1,ground_offset:0},behavior:{idle_bob:r},interaction:{kind:`person-agent`,radius:1.7,voice_enabled:!0}}}function Pw(e,t,n,r){let i=Ow(t,n);if(i===null)throw Error(`人物坐标超出咖啡厅地面：${t}, ${n}`);e.root.position.set(t,i,n),e.root.rotation.set(0,r,0),e.baseY=i}function Fw(e){let t=[...Y.roundtable.seats,...Y.npcTables.flatMap(e=>e.seats)],n=0,r=0;for(let i of t){let t=e.getObjectByName(i.nodeName);if(!t){r+=1;continue}t.getWorldPosition(rC),n=Math.max(n,Math.hypot(rC.x-i.x,rC.z-i.z))}Q.dataset.seatAnchors=`${t.length-r}/${t.length}`,Q.dataset.seatAnchorError=n.toFixed(4),(r>0||n>.08)&&console.warn(`Cafe seat anchor contract mismatch`,{missing:r,maxError:n})}async function Iw(){Dw(.73,`正在唤醒你的关系 Agent`);let e=Lx?[Ux]:cd,t=Lx?[QC?.spawnHint??W_.playerSpawn,ZC?.scene?.companion??{x:0,z:-1.1,yaw:0}]:Mw(e.length+1);if(CC=await xC.spawn(Nw(sd,`self-player`,t[0],0)),$=CC.root,wC=$.position.y,QS.copy(lS).applyQuaternion($.quaternion).setY(0).normalize(),Bw(QS),NC.register(CC,sd.id,zx.id),Lx&&t.length>1){let e=t[0],n=Q.clientWidth<=720,r=n?uC:cC,i=n?dC:lC;fC.crossVectors(QS,oC).normalize();let a=Lt.clamp(e.x+QS.x*i+fC.x*r,Z.minX+.8,Z.maxX-.8),o=Lt.clamp(e.z+QS.z*i+fC.z*r,Z.minZ+.8,Z.maxZ-.8);t[1]={x:a,z:o,yaw:Math.atan2(e.x-a,e.z-o)}}SC=new sh({people:e,resolveMovement:({agent:e,entity:t,stepX:n,stepZ:r,targetX:i,targetZ:a})=>GT(t,n,r,{targetX:i,targetZ:a,approachRadius:oS,targetApproach:!0,targetBlockerId:e.tableId}),onConversation:e=>{_w.showNpcConversation(e),xC.playAction(e.speakerId,X.TALK,{durationMs:e.duration*1e3})},onStateChange:e=>{_w.updateAgentState(e),xC.setState(SC?.getEntity(e.personId),e.status,{seated:e.status===`seated`||e.status===`in-meeting`})}});for(let n=0;n<e.length;n+=1){Dw(.76+n*.03,`正在载入 ${e[n].name} 的人物模型`);let r=await xC.spawn(Nw(e[n],`agent-${e[n].id}`,t[n+1]));NC.register(r,e[n].id,zx.id),PC.register(r,e[n].id,FC.getSnapshot(e[n].id)),SC.register(e[n],r)}!CS&&!Lx&&SC.initializeCafe(),TC=kw(`#f2c55f`,.32,.42,.42),TC.name=`PLAYER_GroundMarker`,EC=kw(`#d36f59`,.36,.48,.72),EC.name=`SELECTION_GroundMarker`,EC.visible=!1,Q.dataset.entrySpawnPositions=t.map(e=>`${e.x.toFixed(3)},${e.z.toFixed(3)}`).join(`|`),YT()}async function Lw(e){Lx||tv(e,Jx),FS.add(e),e.updateMatrixWorld(!0),e.traverse(e=>{e.isMesh&&(e.name.startsWith(`SPLAT_`)||(e.castShadow=!e.name.startsWith(`GROUND`),e.receiveShadow=!0,(Array.isArray(e.material)?e.material:[e.material]).filter(Boolean).forEach(e=>{e.envMapIntensity=.38})))});let t=[],n=e.getObjectByName(`GROUND_CafeFloor`);n&&t.push(n),e.traverse(e=>{e.name.startsWith(`GROUND`)&&!t.includes(e)&&t.push(e)}),t.length===0&&(console.warn(`[EchoWorld] ${$x}资产缺少 GROUND 地面节点，以整个环境作为地面射线目标`),t.push(e));for(let e of t)e.traverse(e=>{e.isMesh&&(e.castShadow=!1,e.receiveShadow=!0,vC.push(e))}),e.isMesh&&vC.push(e);let r=[...new Set(vC)];vC.length=0,vC.push(...r),Ix&&Fw(e),await Iw(),tT(),$C=new $h({scene:FS,api:xS,world:Px.id,showBoard:rS}),$C.mount(),Q.dataset.broadcastBoardVisible=String(!!$C.mesh),yC=!0,Hw(),Q.dataset.ready=`true`,Q.dataset.characterCount=String(xC.entities.length),Q.dataset.npcCount=String(SC.agents.size),Q.dataset.environment=Yx,Q.dataset.sceneVariant=Rx?.id??`field`,Q.dataset.campfireMounted=String(!!tw?.root),Q.dataset.campfirePosition=`${sp.position.x.toFixed(2)},${sp.position.z.toFixed(2)}`,Q.dataset.campfireSize=tw?.size?[tw.size.x,tw.size.y,tw.size.z].map(e=>e.toFixed(3)).join(`,`):``,Dw(1,`${$x} 已准备好`),_w.setWorldReady(!0),FT(),IT(),Kx&&(_w.setView(`cafe`),$&&($.visible=!1),TC&&(TC.visible=!1),document.body.classList.add(`screen-mode`),Q.dataset.screenMode=`true`),requestAnimationFrame(()=>DS.classList.add(`is-hidden`))}function Rw(e){OC=e,Q.dataset.appView=e,zw(),e!==`cafe`&&xC?.setActivity(CC),TC&&(TC.visible=e===`cafe`&&!kC),e!==`cafe`&&(jS.style.opacity=`0`),ww.style.display=e===`cafe`&&!Lx?`flex`:`none`,PC.setVisible(e===`cafe`&&!Lx),e===`cafe`&&(Q.focus({preventScroll:!0}),$&&LS.snapTo($.position,{groundHeightAt:Ow,blockers:VT(),bounds:zS})),Hw()}function zw(){IS.reset(),XS.set(0,0),NS.style.transform=`translate(0, 0)`}function Bw(e){QS.copy(e).setY(0),QS.lengthSq()<1e-6&&QS.set(0,0,-1),QS.normalize(),$S.reset(QS),LS.setYawFromHeading(QS)}function Vw(){let e=e=>{let t=e?.isOpen;return typeof t==`function`?!!t.call(e):!!t};return!!(vw?.isOpen||_w?.isMeetingSheetOpen||e(bS.panel)||e(bS.flow)||e(bS.onboardingFlow)||e(bS.groupPlay))}function Hw(){let e=Vw();_S?.setFreeRoamActive(OC===`cafe`&&!e);let t=yC&&OC===`cafe`&&!kC&&!nw&&!rw&&!e;IS.setPointerLockEnabled(t),LS.setEnabled(t)}function Uw(e){let t=OT(e);return DC=t?.id??null,_w.selectWorldPerson(DC),Q.dataset.selectedPerson=DC??``,SS(DC),Hw(),EC?(EC.visible=!!t,Ww(),t):t}function Ww(){if(!EC||!DC||!SC)return;let e=SC.getEntity(DC);if(!e){EC.visible=!1;return}EC.position.set(e.root.position.x,Math.max(.015,e.root.position.y+.012),e.root.position.z),EC.material.opacity=.58+Math.sin(jC*4.2)*.12}function Gw(e){let t=e?.animation;return!t||t.posture===`seated`&&t.currentRole!==X.SIT_DOWN}function Kw(e){return rw||nw!==Y.roundtable.id||!Gw(CC)?!1:e.every(e=>{let t=SC.getEntity(e);if(!t||!Gw(t))return!1;if(CS){let n=RC.get(e);return!!(n&&t.root.userData.characterSeatKey===ET(n))}let n=SC.getState(e);return n?.status===`in-meeting`&&n.tableId===Y.roundtable.id})}function qw(e,t=15e3){let n=performance.now();return new Promise((r,i)=>{let a=()=>{if(!kC){i(Error(`Meeting was cancelled before everyone was seated`));return}if(Kw(e)){r();return}if(performance.now()-n>=t){i(Error(`Timed out while waiting for meeting participants to sit`));return}requestAnimationFrame(a)};a()})}async function Jw(e,t=null){if(!yC||kC)return[];fT();let n=[];if(GC){if(n=[...new Set(e)].filter(e=>GC.snapshot?.members?.some(t=>t.member_id===e)).slice(0,5),!n.length)return[];let r=`invite-${Date.now()}`,i=Y.roundtable.seats;await GC.move(i[0].x,i[0].z),await GC.send(`meeting.invite`,{hotspot_id:`roundtable`,invitation_id:r,participant_ids:n,topic:t??`最近有什么新变化？`}),aw=`meeting-${Date.now()}`,await GC.send(`meeting.start`,{invitation_id:r,meeting_id:aw})}else if(wS){let r=[...new Set(e)].filter(e=>SC.getEntity(e)).slice(0,5),i=await xS.startMeeting(r,t);n=Array.isArray(i.participants)&&i.participants.length?i.participants:r,UC=i.meeting_id??null;for(let e of n)_w.updateAgentState({personId:e,status:`joining-meeting`,tableId:Y.roundtable.id,tableLabel:Y.roundtable.label,meeting:!0})}else CS?(n=[...new Set(e)].filter(e=>SC.getEntity(e)).slice(0,5),n.forEach((e,t)=>{let n=Y.roundtable.seats[t+1];RC.set(e,{x:n.x,z:n.z,yaw:n.yaw,state:`in-meeting`,seat:{tableId:Y.roundtable.id,tableLabel:Y.roundtable.label,seatIndex:t+1}}),_w.updateAgentState({personId:e,status:`joining-meeting`,tableId:Y.roundtable.id,tableLabel:Y.roundtable.label,seatIndex:t+1,meeting:!0})})):n=SC.startMeeting(e);if(n.length===0)return[];HC=wS?[0]:[0,...n.map((e,t)=>t+1)],kC=!0;let r=Y.roundtable.seats[0];sT(Y.roundtable.id,r),Q.dataset.meetingActive=`true`,Q.dataset.meetingReady=`false`,Q.dataset.meetingInvited=n.join(`,`),await iT(`meeting-started`,`你邀请${n.map($w).join(`、`)}在中央圆桌坐下`,n,{table_id:Y.roundtable.id});try{await qw(n)}catch(e){throw kC&&await Zw(),e}return Q.dataset.meetingReady=`true`,n}function Yw(){kC=!1,GC&&aw&&(GC.send(`meeting.end`,{meeting_id:aw}).catch(e=>{console.warn(`[EchoWorld] v1 meeting end failed`,e)}),aw=null),rw=null,nw=null,Q.dataset.playerSeatTarget=``,Q.dataset.playerSeatedAt=``,$.scale.set(1,1,1),TC.visible=OC===`cafe`,CC.spec.behavior.idle_bob=0,Pw(CC,0,3.12,Math.PI),xC.setActivity(CC),wC=CC.baseY,YT(),Bw(new U(0,0,-1)),LS.snapTo($.position,{groundHeightAt:Ow,blockers:VT(),bounds:zS}),Hw(),CS?RC.clear():SC.endMeeting(),HC=[],UC=null,Q.dataset.meetingActive=`false`,Q.dataset.meetingReady=`false`,Q.dataset.meetingInvited=``}function Xw(){kC&&(Yw(),_w.meetingEnded())}async function Zw(){if(!yC)return;let e=Q.dataset.meetingInvited?Q.dataset.meetingInvited.split(`,`).filter(Boolean):[];if(Yw(),wS){if(typeof xS.endMeeting==`function`)try{await xS.endMeeting()}catch(e){console.warn(`[EchoWorld] 结束会议未送达（会议可能已散场）`,e)}return}CS||SC.endMeeting(),await iT(`meeting-ended`,e.length?`你与${e.map($w).join(`、`)}结束了圆桌交流`:`中央圆桌交流结束`,e,{table_id:Y.roundtable.id})}function Qw(e){return String(e).replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&#039;`)}function $w(e){return typeof e!=`string`||e===``?`神秘访客`:IC.get(e)??cd.find(t=>t.id===e)?.name??e}function eT(e){IC.clear();for(let t of Array.isArray(e)?e:[]){let e=t?.person_id??t?.id,n=t?.name??t?.identity?.name??t?.display_name??t?.displayName;typeof e==`string`&&typeof n==`string`&&IC.set(e,n)}}function tT(){if(Lx){sw=(XC?.hotspots??[]).map(e=>({...e,icon:e.kind===`memory`?`book-open`:e.kind===`thread`?`message-circle`:e.kind===`echo`?`landmark`:`sparkles`,actions:[{id:`touch-field`,label:e.prompt,description:`这次触发会成为一条新的世界事件`,icon:e.kind===`memory`?`book-open`:`sparkles`}]}));return}if(Fx){let e=ew?.byId(`venue.cafe.v1`);sw=[{id:`hall-cafe-door`,kind:`venue`,x:Zx.x,z:Zx.z,radius:e?.interaction?.radius??1.9,eyebrow:`广场西侧的室内空间`,title:e?.label??`Echo Cafe`,detail:`咖啡厅适合熟人之间的一对一交流。进去坐下、邀请某个人，或在圆桌开启一次讨论。`,prompt:e?.interaction?.verb??`进入咖啡厅`,icon:`door-open`,actions:[{id:`enter-cafe`,label:`推门进入`,description:`前往熟人交流空间`,icon:`door-open`}]},{id:`hall-campfire`,kind:`campfire`,x:sp.position.x,z:sp.position.z,radius:Xx?sp.interactionRadius:2.55,eyebrow:Xx?`篝火 · 现场联机入口`:`篝火广场 · 多人社交`,title:Xx?`现场一起玩`:`篝火边的位置还空着`,detail:Xx?`靠近篝火按 E，创建或加入现场房间，和同行的人一起开始游戏。`:nw===`campfire`?`联机入口已经打开：创建或加入现场房间，和同行的人坐到一起。`:`篝火是现场联机的入口。坐下来，创建或加入一个现场房间，和同行的人围炉相聚。`,prompt:Xx?`进入现场一起玩`:nw===`campfire`?`篝火边（联机中）`:`在篝火边坐下（联机入口）`,icon:`users`,directActionId:Xx?`enter-group-play`:null,actions:Xx?[{id:`enter-group-play`,label:`进入现场一起玩`,description:`创建或加入现场房间`,icon:`users`}]:nw===`campfire`?[{id:`leave-fire`,label:`起身离开`,description:`退出联机入口，回到自己的世界`,icon:`door-open`}]:[{id:`sit-by-fire`,label:`围炉坐下`,description:`打开现场联机入口`,icon:`users`}]}];for(let e of YC?.booths.values()??[])sw.push({id:`booth-${e.personId}`,kind:`booth`,x:e.position.x,z:e.position.z,radius:Wf(e.position.blockerRadius,Op.radius),personId:e.personId,eyebrow:`人 ↔ 共同课题 ↔ 人`,title:`${e.displayName??$w(e.personId)}的摊位`,detail:e.displayHeadline||`从这个摊位的照片、作品和共同经历出发，看看你们之间还有什么值得继续。`,prompt:`看看${e.displayName??$w(e.personId)}的摊位`,icon:`store`,actions:[{id:`chat-person`,label:`和 TA 聊聊`,description:`与 TA 的数字分身对话（基于授权信息）`,icon:`message-circle`},{id:`open-package`,label:`翻开资料包`,description:`回到相遇事实与现场记录`,icon:`eye`},{id:`enter-field`,label:`进入关系场域`,description:`看看这段关系被转译成怎样的空间`,icon:`sparkles`},{id:`invite-cafe`,label:`约到咖啡厅继续聊`,description:`把邀请带到熟人交流空间`,icon:`coffee`}]});return}let e=Y.npcTables.map(e=>({id:`cafe-table-${e.id}`,kind:`table`,tableId:e.id,x:e.center.x,z:e.center.z,radius:e.capacity===2?1.9:2.05,eyebrow:`两个人之间的直接交流`,title:e.label,detail:`坐下来后，可以邀请一位熟人、点一杯饮品，或从桌边调取一段共同记忆。`,prompt:nw===e.id?`看看桌边还能做什么`:`在${e.label}坐下`,icon:`coffee`,actions:nw===e.id?[{id:`invite-table`,label:`邀请一位熟人`,description:`选择这次想一起坐下的人`,icon:`users`},{id:`recall-memory`,label:`调取共同记忆`,description:`从资料包中找回第一次相遇`,icon:`book-open`},{id:`leave-seat`,label:`起身离开`,icon:`door-open`}]:[{id:`sit-at-table`,label:`坐到桌边`,description:`进入这张桌子的情境菜单`,icon:`coffee`}]}));sw=[{id:`cafe-exit-door`,kind:`exit`,x:0,z:4.3,radius:1.6,eyebrow:`回到室外`,title:`推开木门回到集市`,detail:`回到篝火广场与市集街道，去看看摊位和现场房间。`,prompt:`回到集市`,icon:`door-open`,actions:[{id:`exit-cafe`,label:`回到集市`,description:`返回小镇广场`,icon:`door-open`}]},{id:`cafe-roundtable`,kind:`roundtable`,x:Y.roundtable.center.x,z:Y.roundtable.center.z,radius:Y.roundtable.interactionRadius,eyebrow:`中央六人圆桌`,title:iw?`邀请${$w(iw)}入座`:`发起一次圆桌会议`,detail:iw?`你从集市带来了给${$w(iw)}的邀请。还可以继续邀请其他人。`:`围绕最近的变化、下一步或共同记忆，邀请最多五个人一起坐下。`,prompt:iw?`带${$w(iw)}加入圆桌`:`发起圆桌会议`,icon:`users`,actions:[{id:`open-meeting`,label:`选择入座的人`,description:`邀请后会议会写入今日播报`,icon:`users`}]},{id:`cafe-bar`,kind:`bar`,x:1.65,z:3.15,radius:1.8,eyebrow:`Echo Cafe 吧台`,title:`今天想和谁喝一杯？`,detail:`吧台不是装饰：点饮品、发出邀请，都会成为世界里可恢复的事件。`,prompt:`在吧台点单或邀请熟人`,icon:`coffee`,actions:[{id:`order-coffee`,label:`点一杯今日手冲`,description:`给今天的世界留一个安静节点`,icon:`coffee`},{id:`invite-coffee`,label:`邀请一位熟人`,description:`选择想一起喝咖啡的人`,icon:`users`},{id:`recall-memory`,label:`翻开一段共同记忆`,icon:`book-open`}]},{id:`cafe-broadcast`,kind:`broadcast`,x:1.2,z:-3.65,radius:1.65,eyebrow:`世界事件不是背景动画`,title:`今日播报屏`,detail:`这里滚动显示最近发生的邀请、圆桌、场域访问和共同记忆触发。`,prompt:`查看今日世界事件`,icon:`message-circle`,actions:[{id:`read-brief`,label:`展开今日播报`,icon:`message-circle`}]},...e],sw=sw.filter(e=>e.kind!==`broadcast`)}function nT(){if(!yC||OC!==`cafe`||kC||!$)return null;let e=null,t=1/0;for(let n of sw){if(n.kind===`person`&&n.personId){let e=SC?.getEntity(n.personId);e&&(n.x=e.root.position.x,n.z=e.root.position.z)}let r=Math.hypot($.position.x-n.x,$.position.z-n.z);r<=n.radius&&r<t&&(e=n,t=r)}return e}function rT(){let e=_w.isMeetingSheetOpen||kC?null:nT();(e?.id??null)!==ow&&(ow=e?.id??null,Q.dataset.nearbyHotspot=ow??``),vw.setNearby(e)}async function iT(e,t,n=[],r={}){try{let i=await xS.recordWorldInteraction({type:e,summary:t,person_ids:n,source:`scene-interaction`,payload:r});return Q.dataset.lastWorldEvent=i.event_id??e,await $C?.refresh(),i}catch(e){return console.warn(`[EchoWorld] 世界事件写入失败`,e),null}}function aT(){return cd.map(e=>({id:`invite-person:${e.id}`,label:e.name,description:`${e.relation} · ${e.tags.slice(0,2).join(` · `)}`,icon:`users`}))}function oT(){let e=rw;return e?(rw=null,Pw(CC,e.x,e.z,e.yaw),wC=CC.baseY,CC.spec.behavior.idle_bob=0,TC.visible=!1,Bw(new U(Math.sin(e.yaw),0,Math.cos(e.yaw))),nw=e.id,Q.dataset.playerSeatTarget=``,Q.dataset.playerSeatedAt=e.id,xC.setActivity(CC,{seated:!0}),tT(),Hw(),!0):!1}function sT(e,t){return!CC||!t?!1:(rw={id:e,x:t.x,z:t.z,yaw:t.yaw},nw=null,Q.dataset.playerSeatedAt=``,Q.dataset.playerSeatTarget=e,CC.spec.behavior.idle_bob=0,TC.visible=OC===`cafe`,zw(),Hw(),xC.setActivity(CC),Math.hypot(t.x-$.position.x,t.z-$.position.z)<=aS&&oT(),!0)}function cT(e){let t=op(e);if(!t||kC)return!1;let n=new Set(cd.map(e=>jT(e.id)).filter(t=>t?.tableId===e).map(e=>e.seatIndex)),r=t.seats.findIndex((e,t)=>!n.has(t));if(r<0)return!1;let i=t.seats[r];return sT(e,i)}var lT=Object.freeze({x:sp.position.x,z:sp.position.z}),uT=Object.freeze(Array.from({length:5},(e,t)=>{let n=t/5*Math.PI*2+.35;return Object.freeze({x:lT.x+Math.cos(n)*1.75,z:lT.z+Math.sin(n)*1.75})}));function dT(){if(kC||!$)return!1;let e=uT[0],t=1/0;for(let n of uT){let r=Math.hypot($.position.x-n.x,$.position.z-n.z);r<t&&(t=r,e=n)}let n=Math.atan2(lT.x-e.x,lT.z-e.z);return sT(`campfire`,{...e,yaw:n})}function fT(){if(!nw&&!rw)return!1;let e=$.position.x,t=$.position.z,n=Math.atan2(QS.x,QS.z);return rw=null,Pw(CC,e,t,n),Bw(QS),wC=CC.baseY,CC.spec.behavior.idle_bob=0,TC.visible=OC===`cafe`,nw=null,Q.dataset.playerSeatTarget=``,Q.dataset.playerSeatedAt=``,xC.setActivity(CC),tT(),Hw(),!0}function pT(e){let t=new URL(window.location.href);t.searchParams.set(`world`,`cafe`),t.searchParams.set(`invite`,e),window.location.assign(t.href)}async function mT(e=null){if(!e)return{eyebrow:`共同记忆`,title:`想调取与谁的共同记忆？`,detail:`选择一位熟人，从资料包里找回你们的第一次相遇。`,icon:`book-open`,actions:cd.map(e=>({id:`recall-person:${e.id}`,label:e.name,description:`${e.relation} · ${e.tags.slice(0,2).join(` · `)}`,icon:`book-open`}))};let t=e,n=await xS.getPackage(t),r=n.encounters?.[0]??{},i=(r.inferences??[]).find(e=>e.type.includes(`memory`))??r.inferences?.[0];return{eyebrow:`你与${n.identity?.name??$w(t)}的共同记忆`,title:r.place??`第一次相遇`,detail:i?.value??`这段记录发生在 ${r.time??`一个被留下的时刻`}。`,icon:`book-open`,actions:[{id:`open-package:${t}`,label:`查看完整资料包`,icon:`eye`}]}}async function hT(e,t){if(t===`enter-cafe`)return K_(`cafe`),{close:!0};if(t.startsWith(`message-person:`)){let[,e,n]=t.split(`:`),r=OT(e),i=r?.conversation.starters[Number(n)];return!GC||!r||!i?{eyebrow:`暂时无法连接`,title:`实时房间尚未就绪`,detail:`请稍后再试。`,icon:`message-circle`,actions:[]}:(await GC.message(e,i),bT(sd.id,i,4),{close:!0})}if(t===`chat-person`)return bS.panel.openPerson(e.personId,{focusChat:!0}),{close:!0};if(t===`open-package`||t.startsWith(`open-package:`)){let n=t.split(`:`)[1]??e.personId;return bS.panel.openPerson(n),iT(`booth-viewed`,`你翻开了${$w(n)}的资料包`,[n]),{close:!0}}if(t===`invite-cafe`)return iw=e.personId,await iT(`invitation-sent`,`你邀请${$w(e.personId)}去咖啡厅继续聊`,[e.personId]),pT(e.personId),{close:!0};if(t===`exit-cafe`)return K_(`hall`),{close:!0};if(t===`enter-group-play`)return bS.groupPlay?.open(),iT(`campfire-joined`,`你靠近草地中央的篝火，打开了现场一起玩`,[]),{close:!0};if(t===`sit-by-fire`)return dT(),bS.groupPlay?.open(),iT(`campfire-joined`,`你在篝火边坐下，打开了现场联机入口`,[]),{eyebrow:`篝火广场 · 多人社交`,title:`你在篝火边坐下了`,detail:`联机入口已打开：创建或加入现场房间，和同行的人围炉相聚。E 起身离开。`,icon:`users`,actions:[]};if(t===`leave-fire`)return fT(),bS.groupPlay?.close(),iT(`campfire-left`,`你从篝火边起身，回到了自己的世界`,[]),{close:!0};if(t===`enter-field`)return iT(`field-entered`,`你从${$w(e.personId)}的摊位走进关系场域`,[e.personId]),J_(e.personId),{close:!0};if(t===`order-coffee`)return hE(sd.id,`happy`,{source:`scene-interaction`}),await iT(`coffee-shared`,`你在吧台点了一杯今日手冲`,[]),{eyebrow:`吧台`,title:`一杯今日手冲`,detail:`这个安静的停顿已留在今日播报里。`,icon:`coffee`,actions:[]};if(t===`invite-coffee`||t===`invite-table`)return{eyebrow:e.title,title:`邀请谁过来？`,detail:`选定后 TA 会在中央圆桌等你；走到圆桌按 E 就能开成一场会议。`,icon:`users`,actions:aT()};if(t===`recall-memory`){let t=e.personId??DC??iw,n=await mT(t);return t&&iT(`memory-recalled`,`你在咖啡厅调取了与${$w(t)}的共同记忆`,[t]),n}if(t.startsWith(`recall-person:`)){let e=t.slice(14),n=await mT(e);return iT(`memory-recalled`,`你在咖啡厅调取了与${$w(e)}的共同记忆`,[e]),n}if(t.startsWith(`invite-person:`)){let e=t.slice(14);return iw=e,xC?.playAction(e,X.RAISE_RIGHT_HAND),hE(e,`happy`,{source:`scene-interaction`}),await iT(`invitation-sent`,`你邀请${$w(e)}在咖啡厅坐下`,[e]),tT(),{eyebrow:`邀请已送达`,title:`${$w(e)}会在圆桌等你`,detail:`走到中央圆桌，按 E 就能把这次邀请变成一场会议。`,icon:`users`,actions:[]}}if(t===`sit-at-table`)return cT(e.tableId)?(hE(sd.id,`happy`,{source:`scene-interaction`}),iT(`coffee-shared`,`你在${e.title}坐下，点了一杯饮品`,[]),{eyebrow:e.title,title:`你在桌边坐下了`,detail:`E 起身 · F 邀请熟人过来坐。`,icon:`coffee`,actions:[]}):{eyebrow:e.title,title:`这张桌子已经坐满了`,detail:`换一张还有空位的桌子，或去中央圆桌发起会议。`,icon:`coffee`,actions:[]};if(t===`leave-seat`)return fT(),{close:!0};if(t===`open-meeting`)return fT(),vw.close(),_w.openMeeting(iw?[iw]:[]),{close:!0};if(t===`read-brief`){let e=await xS.getWorldBrief();return{eyebrow:`${e.event_count} 条近期世界事件`,title:e.headline,detail:e.summary,icon:`message-circle`,actions:[]}}if(t===`touch-field`){let t=e.personId;return await iT(e.eventType,`你在与${$w(t)}的场域触发了「${e.title}」`,[t],{field_entity:e.id}),{eyebrow:ZC?.scene?.title??`关系场域`,title:e.title,detail:e.detail,icon:e.icon,actions:[]}}return null}function gT(e){return typeof e!=`string`||e===``||!OT(e)?!1:(Uw(e),!0)}function _T(e,{level:t=`info`}={}){if(Fx&&t!==`meeting`||window.innerWidth<=760&&t!==`meeting`)return;let n=document.createElement(`div`);for(n.style.cssText=`max-width:min(320px,calc(100vw - 36px));padding:9px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.38);background:rgba(21,58,50,.86);color:#fffdf4;box-shadow:0 10px 26px rgba(18,45,39,.2);backdrop-filter:blur(14px);font-size:10px;font-weight:600;letter-spacing:.04em;line-height:1.5;opacity:0;transform:translateY(-6px);transition:opacity .24s ease,transform .24s ease;`,n.textContent=e,Cw.append(n),_S?.playNotification();Cw.children.length>4;)Cw.firstElementChild.remove();requestAnimationFrame(()=>{n.style.opacity=`1`,n.style.transform=`translateY(0)`}),window.setTimeout(()=>{n.style.opacity=`0`,window.setTimeout(()=>n.remove(),280)},3600)}var vT={room:{color:`#7fe0a8`,label:`v1 房间事件`},live:{color:`#7fe0a8`,label:`实时快照`},mock:{color:`#f2c55f`,label:`本地 mock`},fallback:{color:`#d36f59`,label:`内置兜底`}};function yT(e,t){let n=vT[t]??{color:`#9fb4ad`,label:`离线`},r=Fx?`集市时刻`:`世界时刻`;ww.innerHTML=`<span style="width:7px;height:7px;border-radius:50%;background:${n.color}"></span><span>${r} #${e??`—`} · ${n.label}</span>`}function bT(e,t,n=dS){if(!Sw)return;let r=BC.get(e);if(!r){let t=document.createElement(`div`);t.className=`world-speech-bubble`,t.dataset.liveSpeech=e,Sw.append(t),r={element:t,timer:0,active:!1},BC.set(e,r)}r.element.innerHTML=`<span>${Qw($w(e))}</span><p>${Qw(t)}</p>`,r.element.classList.add(`is-visible`),r.active=!0,window.clearTimeout(r.timer),r.timer=window.setTimeout(()=>{r.element.classList.remove(`is-visible`),r.active=!1},n*1e3)}function xT(){for(let[e,t]of BC){if(!t.active)continue;let n=SC?.getEntity(e);if(!n){t.element.style.visibility=`hidden`;continue}rC.copy(n.root.position),rC.y+=1.55*n.root.scale.y,rC.project(RS);let r=OC===`cafe`&&rC.z>-1&&rC.z<1&&Math.abs(rC.x)<1.15&&Math.abs(rC.y)<1.15;t.element.style.left=`${(rC.x*.5+.5)*window.innerWidth}px`,t.element.style.top=`${(-rC.y*.5+.5)*window.innerHeight}px`,t.element.style.visibility=r?`visible`:`hidden`}}function ST(){if(!YC)return;let e=null;if(hw&&OC===`cafe`&&!kC){HS.setFromCamera(fw,RS);let t=[...YC.pickRoots,...xC.entities.map(e=>e.root)],n=HS.intersectObjects(t,!0),r=(n.length>0?uE(n[0].object):null)?.userData.personId;r&&r!==sd.id&&(e=YC.boothForPerson(r))}e!==gw&&(gw&&YC.setHighlighted(gw,!1),gw=e,gw&&YC.setHighlighted(gw,!0),Q.style.cursor=gw?`pointer`:``),gw?(Tw.textContent=`${gw.displayName??`展位`} · 查看资料包`,Tw.style.left=`${pw}px`,Tw.style.top=`${mw}px`,Tw.style.display=`block`):Tw.style.display=`none`}function CT(e){let t=kg(e,{people:cd,reservedRoundtableSeats:kC?HC:[]});if(JC=t.tick,yT(t.tick,WC?.source),Q.dataset.liveSource=WC?.source??`unknown`,Q.dataset.worldTick=String(t.tick),Fx&&YC){let e=t.modules.filter(e=>e.type===`booth`),n=e.length>0?e:WC?.source===`live`?[]:Kf(cd,Yx);Q.dataset.boothCount=String(YC.sync(n)),Q.dataset.boothReadablePanelCount=String(YC.readablePanelCount),tT()}if(Ix&&GC?.snapshot){LT(GC.snapshot);return}for(let e of t.agents){if(Lx)break;if(e.id===sd.id||RC.has(e.id))continue;let t=SC?.getEntity(e.id);if(!t){!Fx&&e.position&&LC.set(e.id,{x:e.seat?.x??e.position.x,z:e.seat?.z??e.position.z,yaw:e.seat?.yaw??e.position.yaw,state:e.state,seat:e.seat}),kT(e);continue}if(Fx)if(e.state===`walking`&&e.position)LC.set(e.id,{x:e.position.x,z:e.position.z,yaw:e.position.yaw,state:`walking`,seat:null});else{let t=YC?.personAnchorFor(e.id,Op.radius)??e.position;t&&LC.set(e.id,{x:t.x,z:t.z,yaw:t.yaw??0,state:`at-booth`,animationState:e.state,seat:null})}else e.position&&LC.set(e.id,{x:e.seat?.x??e.position.x,z:e.seat?.z??e.position.z,yaw:e.seat?.yaw??e.position.yaw,state:e.state,seat:e.seat});t.root.userData.agentState=e.state,_w.updateAgentState({personId:e.id,status:e.state===`talking`?`seated`:e.state,tableId:e.seat?.tableId??null,tableLabel:e.seat?.tableLabel??(Fx?`集市大厅展位`:`咖啡厅大厅`),seatIndex:e.seat?.seatIndex??null,meeting:e.state===`in-meeting`})}AT(t.agents)}function wT(e){let t=Eg(e);if(t){if(t.type===`agent-talk`){if(!t.agentId||!t.text)return;kC&&UC&&t.meetingId===UC&&_w.ingestMeetingMessage({personId:t.agentId,text:t.text}),bT(t.agentId,t.text),xC.playAction(t.agentId,X.TALK,{durationMs:dS*1e3}),_T(`${$w(t.agentId)} 和 ${$w(t.toAgentId)} 聊了起来`);return}if(t.type===`animation-cue`){if(!t.agentId||!t.action)return;let e=xC.playAction(t.agentId,t.action,{durationMs:t.durationMs});Q.dataset.lastCharacterAction=`${t.agentId}:${t.action}:${e}`;return}if(t.type===`meeting-started`){let e=t.participants.map($w).join(`、`);_T(e?`圆桌会议开始：${e}`:`圆桌会议开始了`,{level:`meeting`});return}t.type===`meeting-ended`&&(UC&&t.meetingId===UC&&Xw(),_T(`圆桌会议结束，大家回到各自的座位`,{level:`meeting`}))}}function TT(e){let t=cw.get(e);if(!t){let n=0;for(let t of e)n=(n*31+t.charCodeAt(0))%997;t={nextAt:jC+2+n/997*8,until:0,side:1},cw.set(e,t)}return t}function ET(e){let t=e.seat?.tableId,n=e.seat?.seatIndex;return t&&Number.isInteger(n)?`${t}:${n}`:[`seated`,`talking`,`in-meeting`].includes(e.state)?`position:${e.x.toFixed(1)}:${e.z.toFixed(1)}`:null}function DT(e){if(!(!SC||Lx))for(let t of new Set([...LC.keys(),...zC.keys(),...RC.keys()])){let n=RC.get(t)??zC.get(t)??LC.get(t),r=SC.getEntity(t);if(!n||!r)continue;let i=r.root;if(n.state===`at-booth`){let a=n.x-i.position.x,o=n.z-i.position.z,s=Math.hypot(a,o),c=Math.min(s,uS*e),[l,u]=s>1e-5?GT(r,a/s*c,o/s*c,{targetX:n.x,targetZ:n.z,approachRadius:oS,targetApproach:!0,targetBlockerId:YC?.boothForPerson(t)?.id??null}):[0,0];i.position.x+=l,i.position.z+=u,r.collider?.sync(r),r.spec.behavior.idle_bob=.01;let d=Math.hypot(l,u),f=n.yaw;if(d>1e-5)VC.set(l/d,0,u/d);else if(s>.05)VC.set(a/s,0,o/s);else{if(($?Math.hypot($.position.x-i.position.x,$.position.z-i.position.z):1/0)<2.5)f=Math.atan2($.position.x-i.position.x,$.position.z-i.position.z);else{let e=TT(t);if(jC>=e.nextAt&&(e.until=jC+fS,e.side=Math.random()<.5?-1:1,e.nextAt=jC+6+Math.random()*4),jC<e.until){let t=1-(e.until-jC)/fS;f+=e.side*pS*Math.sin(t*Math.PI)}}VC.set(Math.sin(f),0,Math.cos(f))}aC.setFromUnitVectors(lS,VC),i.quaternion.slerp(aC,1-Math.exp(-10*e)),i.scale.y+=(1-i.scale.y)*(1-Math.exp(-7*e)),r.baseY=Ow(i.position.x,i.position.z)??r.baseY,xC.setActivity(r,{moving:d>1e-5,talking:d<=1e-5&&n.animationState===`talking`}),i.userData.characterSeatKey=null;continue}r.spec.behavior.idle_bob=0;let a=n.x-i.position.x,o=n.z-i.position.z,s=Math.hypot(a,o),c=!!(n.seat?.tableId&&Number.isInteger(n.seat?.seatIndex))&&[`seated`,`talking`,`in-meeting`].includes(n.state),l=ET(n),u=r.animation?.posture===`seated`,d=c?sS:.05,f=!(u&&c&&l!==null&&i.userData.characterSeatKey===l&&s<=cS)&&s>d,p=c&&!f,m=!1;if(f){let t=Math.min(s,uS*e),[l,u]=GT(r,a/s*t,o/s*t,{targetX:n.x,targetZ:n.z,approachRadius:c?oS:0,targetApproach:c,targetBlockerId:n.seat?.tableId??null});i.position.x+=l,i.position.z+=u,r.collider?.sync(r);let d=Math.hypot(l,u);d>1e-5?(m=!0,VC.set(l/d,0,u/d)):VC.set(Math.sin(n.yaw),0,Math.cos(n.yaw))}else{let[e,t]=GT(r,n.x-i.position.x,n.z-i.position.z,{targetX:n.x,targetZ:n.z,approachRadius:c?oS:0,targetApproach:c,targetBlockerId:n.seat?.tableId??null});i.position.x+=e,i.position.z+=t,r.collider?.sync(r),VC.set(Math.sin(n.yaw),0,Math.cos(n.yaw))}aC.setFromUnitVectors(lS,VC),i.quaternion.slerp(aC,1-Math.exp(-10*e)),i.scale.y+=(1-i.scale.y)*(1-Math.exp(-7*e)),r.baseY=Ow(i.position.x,i.position.z)??0,xC.setActivity(r,{moving:m,seated:p,talking:n.state===`talking`}),i.userData.characterSeatKey=p?l:null}}function OT(e){return cd.find(t=>t.id===e)??lw.get(e)??null}async function kT(e){if(!(!xC||!SC)&&!(uw.has(e.id)||SC.getEntity(e.id))){uw.add(e.id);try{let t=null;try{t=await xS.getPackage(e.id);let n=t?.identity?.name??t?.name;typeof n==`string`&&n.trim()&&IC.set(e.id,n.trim())}catch(t){console.warn(`[EchoWorld] 新人 ${e.id} 的资料包尚不可用`,t)}let n=e.palette??mS[hS(e.id)%mS.length],r=$w(e.id),i={id:e.id,name:r,displayName:r,relation:`刚搬进世界的新朋友`,palette:n,avatar:t?.avatar??e.avatar??null,bio:`刚从一次真实相遇进入 EchoWorld。`,conversation:{starters:[`最近在做什么？`,`我们上次聊到了什么？`,`想去圆桌坐坐吗？`],replies:[`（TA 还在整理自己的故事。）`]}};lw.set(e.id,i);let[a]=Mw(1,jw());dw.set(e.id,a);let o=await xC.spawn(Nw(i,`agent-${e.id}`,a,.005));NC.register(o,e.id,zx.id),PC.register(o,e.id,FC.getSnapshot(e.id)),xw(e.id),SC.register(i,o),GC&&tT(),Q.dataset.npcCount=String(SC.agents.size),Q.dataset.characterCount=String(xC.entities.length)}catch(t){lw.delete(e.id),console.warn(`[EchoWorld] 新人 ${e.id} 的实体生成失败`,t)}finally{dw.delete(e.id),uw.delete(e.id)}}}function AT(e){if(lw.size===0)return;let t=new Set(e.map(e=>e.id));for(let e of[...lw.keys()]){if(t.has(e)||uw.has(e))continue;let n=SC?.getEntity(e);n&&xC?.despawn(n),SC?.agents.delete(e),LC.delete(e),cw.delete(e),lw.delete(e),Q.dataset.npcCount=String(SC?.agents.size??0)}}function jT(e){if(CS){let t=RC.get(e),n=t??zC.get(e)??LC.get(e);if(n){let r=n.seat?op(n.seat.tableId):null;return{personId:e,status:t?`in-meeting`:n.state,tableId:n.seat?.tableId??null,tableLabel:r?.label??`咖啡厅`,seatIndex:n.seat?.seatIndex??null,meeting:n.state===`in-meeting`||!!t}}}return SC.getState(e)}function MT(){if(!$)return null;let e=new U(0,0,1).applyQuaternion($.quaternion);return{x:$.position.x,z:$.position.z,yaw:Math.atan2(e.x,e.z)}}function NT(e,t){zC.clear();for(let n of Array.isArray(e)?e:[]){if(n.person_id===t||n.person_id===sd.id)continue;let e=n.presence;!e||!SC?.getEntity(n.person_id)||zC.set(n.person_id,{x:e.x,z:e.z,yaw:e.yaw??0,state:`walking`,seat:null})}Q.dataset.groupParticipantCount=String(e?.length??0),Q.dataset.groupRemoteCount=String(zC.size)}function PT(e,t){for(let n of Array.isArray(e)?e:[])!n?.person_id||n.person_id===t||(n.display_name&&!OT(n.person_id)&&IC.set(n.person_id,n.display_name),SC&&!SC.getEntity(n.person_id)&&kT({id:n.person_id,position:n.presence?{x:n.presence.x,z:n.presence.z,yaw:n.presence.yaw??0}:null}));NT(e,t)}function FT({force:e=!1}={}){!CS||WC||TS&&Ix&&!e||(WC=new nh({snapshotUrl:Fx?H_.snapshotUrl:U_.snapshotUrl,intervalMs:ES,mockUrl:md(`data/mock/snapshot.demo.json`)}),WC.onSnapshot(CT),WC.onEvent(wT),WC.start())}async function IT(){if(!TS||GC)return;let e=Xm.agents.map(e=>e.position),t=new Map(Xm.agents.map(e=>[e.id,e.position])),n=[];try{n=(await xS.getPackages()).filter(e=>e.confirmed&&e.person_id!==sd.id).filter(e=>!cd.some(t=>t.id===e.person_id)).map((t,n)=>({id:t.person_id,name:t.name??t.person_id,displayName:t.name??t.person_id,position:e[n%e.length]}))}catch(e){console.warn(`[EchoWorld] 无法读取新增 Package，咖啡厅先载入已有成员`,e)}GC=new qh({actor:{...sd,position:{x:$.position.x,z:$.position.z}},members:[...cd.map(e=>({...e,position:t.get(e.id)??{x:0,z:0}})),...n]}),GC.onSnapshot(LT),GC.onEvent(RT);try{await GC.start(),Q.dataset.roomSource=`v1`,_T(`已进入实时 Echo Cafe 房间`)}catch(e){console.warn(`[EchoWorld] v1 房间连接失败，保留 v0 世界`,e),GC.stop(),GC=null,Q.dataset.roomSource=`unavailable`,FT({force:!0})}}function LT(e){if(!e||!Array.isArray(e.members))return;JC=Number(e.sequence)||0,yT(JC,`room`),Q.dataset.liveSource=`room-v1`,Q.dataset.worldTick=String(JC);let t=new Map((e.agent_runtime??[]).map(e=>[e.agent_id,e]));for(let n of e.members){if(n.member_id===sd.id)continue;let r=SC?.getEntity(n.member_id);if(!r){kT({id:n.member_id,position:n.position,state:`walking`});continue}let i=n.position??{},a=!!e.meeting?.participant_ids?.includes(n.member_id),o=t.get(n.member_id)?.status??`idle`,s=a?`in-meeting`:o===`talking`?`talking`:`walking`;LC.set(n.member_id,{x:Number(i.x)||0,z:Number(i.z)||0,yaw:r.root.rotation.y,state:s,seat:null}),_w.updateAgentState({personId:n.member_id,status:a?`in-meeting`:o,tableId:a?Y.roundtable.id:null,tableLabel:a?Y.roundtable.label:`Echo Cafe`,seatIndex:null,meeting:a})}Q.dataset.roomSequence=String(e.sequence??0),tT()}function RT(e){if(e?.type===`person.message-created`){let t=e.payload??{};t.speaker_id&&t.text&&(bT(t.speaker_id,t.text,7),_T(t.listener_id===sd.id?`${$w(t.speaker_id)}回复了你`:`${$w(t.speaker_id)}与${$w(t.listener_id)}正在交谈`));return}e?.type===`meeting.topic-proposed`&&_T(e.payload?.text??`圆桌提出了新话题`,{level:`meeting`})}function zT(){if(!GC||!$||performance.now()-KC<800)return;let e={x:Number($.position.x.toFixed(3)),z:Number($.position.z.toFixed(3))};qC&&Math.hypot(e.x-qC.x,e.z-qC.z)<.08||(KC=performance.now(),qC=e,GC.move(e.x,e.z).catch(e=>{console.warn(`[EchoWorld] 房间位置同步失败`,e)}))}function BT(){return YS.set(0,0),IS.isDown(`KeyA`)&&(YS.x+=1),IS.isDown(`KeyD`)&&--YS.x,IS.isDown(`KeyW`)&&(YS.y+=1),IS.isDown(`KeyS`)&&--YS.y,YS.x-=XS.x,YS.y+=XS.y,YS.lengthSq()>1&&YS.normalize(),YS}function VT(){return Fx?[...Qx.staticCircles,...YC?.blockers??[]]:Qx.staticCircles}function HT(e=null){if(!SC)return[];let t=[];for(let n of SC.agents.values())n.entity===e||!n.entity.collider||(n.entity.collider.sync(n.entity),t.push(n.entity.collider));return t}function UT(e=null){let t=[...VT()];return CC?.collider&&CC!==e&&(CC.collider.sync(CC),t.push(CC.collider)),t.push(...HT(e)),t}function WT(e,t,n,r,i){if(r===null||i===null)return null;let a=n?t.find(e=>!e?.capsule&&e?.id===n):null;if(a){let t=a.r??a.radius??0;if(Math.hypot(r-a.x,i-a.z)<t+(e.collider?.radius??0)+.08)return a}return t.find(t=>{if(t?.capsule||!Number.isFinite(t?.x)||!Number.isFinite(t?.z))return!1;let n=t.r??t.radius??0;return Math.hypot(r-t.x,i-t.z)<n+(e.collider?.radius??0)+.08})??null}function GT(e,t,n,{targetX:r=null,targetZ:i=null,approachRadius:a=0,targetApproach:o=!1,targetBlockerId:s=null}={}){if(!e?.collider)return[t,n];e.collider.sync(e);let c=UT(e),l=r===null||i===null?1/0:Math.hypot(r-e.root.position.x,i-e.root.position.z),u={ignore:o&&l<a?WT(e,c,s,r,i):null},d={...u,bounds:Z},f=Lp(e.collider,e.root.position.x,e.root.position.z,c,d),[p,m]=k_(e.collider,t,n,c,u),h={x:e.root.position.x+p,z:e.root.position.z+m},g=Lp(e.collider,h.x,h.z,c,d);if(g<=1e-5||g<f-1e-5)return[p,m];let _={x:e.root.position.x+p,z:e.root.position.z},v=Lp(e.collider,_.x,_.z,c,d);if(v<=1e-5||v<f-1e-5)return[p,0];let y={x:e.root.position.x,z:e.root.position.z+m},b=Lp(e.collider,y.x,y.z,c,d);return b<=1e-5||b<f-1e-5?[0,m]:[0,0]}function KT(e,t=CC,n=UT(t)){return t?.collider?(t.collider.sync(t),Ip(t.collider,e.x,e.z,n,{bounds:Z})):e.x>=Z.minX&&e.x<=Z.maxX&&e.z>=Z.minZ&&e.z<=Z.maxZ}function qT(e){let t=Ow(e.x,e.z);return t!==null&&($.position.x=e.x,$.position.z=e.z,wC=t,CC.baseY=wC,!0)}function JT(e){if(rw){let t=rw.x-$.position.x,n=rw.z-$.position.z,r=Math.hypot(t,n);if(r<=aS){oT();return}let i=Math.min(r,tS*e),[a,o]=GT(CC,t/r*i,n/r*i,{targetX:rw.x,targetZ:rw.z,approachRadius:oS,targetApproach:!0,targetBlockerId:rw.id}),s=Math.hypot(a,o)>1e-5;if($.position.x+=a,$.position.z+=o,wC=Ow($.position.x,$.position.z)??wC,CC.baseY=wC,CC.collider?.sync(CC),s&&(ZS.set(a,0,o).normalize(),aC.setFromUnitVectors(lS,ZS),$.quaternion.slerp(aC,1-Math.exp(-14*e)),QS.lerp(ZS,1-Math.exp(-9*e)).normalize()),Math.hypot(rw.x-$.position.x,rw.z-$.position.z)<=aS){oT();return}xC.setActivity(CC,{moving:s});let c=CC?.animation?.clipsByRole.has(X.WALK),l=s&&!c?Math.abs(Math.sin(jC*9.2))*.028:0;$.position.y=wC+iS+l,YT();return}if(kC||nw){xC.setActivity(CC,{seated:!0});return}if(Vw()){xC.setActivity(CC);return}let t=BT(),n=$S.update(e,t,LS.getHorizontalAngle(),{run:IS.isDown(`ShiftLeft`)||IS.isDown(`ShiftRight`)}),r=n.moving,i=!1;if(ZS.copy(n.direction),r){let t=$.position.x,r=$.position.z;iC.copy($.position).addScaledVector(ZS,n.speed*e);let[a,o]=GT(CC,iC.x-$.position.x,iC.z-$.position.z);iC.set($.position.x+a,0,$.position.z+o),qT(iC),CC.collider?.sync(CC),i=Math.hypot($.position.x-t,$.position.z-r)>1e-5}aC.setFromUnitVectors(lS,ZS),$.quaternion.slerp(aC,1-Math.exp(-14*e)),QS.copy(ZS),xC.setActivity(CC,{moving:i});let a=CC?.animation?.clipsByRole.has(X.WALK),o=i&&!a?Math.abs(Math.sin(jC*9.2))*.028:Math.sin(jC*2.1)*.004;$.position.y=wC+iS+o,YT()}function YT(){!TC||!$||(TC.position.set($.position.x,wC+.013,$.position.z),TC.material.opacity=.36+Math.sin(jC*4)*.05)}function XT(e){if(!Lx||!$||!SC)return;let t=SC.getEntity(Ux.id);if(!t)return;let n=t.root,r=Q.clientWidth<=720,i=r?uC:cC,a=r?dC:lC;fC.crossVectors(QS,oC).normalize(),pC.copy($.position).addScaledVector(QS,a).addScaledVector(fC,i),pC.x=Lt.clamp(pC.x,Z.minX+.45,Z.maxX-.45),pC.z=Lt.clamp(pC.z,Z.minZ+.45,Z.maxZ-.45),mC.subVectors(pC,n.position).setY(0);let o=mC.length(),s=!1;if(o>.35){mC.normalize();let r=Math.min(o-.25,sC*e),[i,a]=O_(n.position.x,n.position.z,mC.x*r,mC.z*r,VT(),{moverRadius:.3}),c=n.position.x+i,l=n.position.z+a,u=Math.hypot(c-$.position.x,l-$.position.z)>=.82?Ow(c,l):null;u!==null&&c>=Z.minX&&c<=Z.maxX&&l>=Z.minZ&&l<=Z.maxZ&&Math.abs(u-t.baseY)<=.8&&(n.position.x=c,n.position.z=l,t.baseY=u,s=Math.hypot(i,a)>1e-5)}let c=Ow(n.position.x,n.position.z);c!==null&&(t.baseY=c),n.position.y=t.baseY+(s?Math.abs(Math.sin(jC*8.4))*.022:0),n.scale.y+=(1-n.scale.y)*(1-Math.exp(-7*e));let l=s?mC:mC.subVectors($.position,n.position).setY(0).normalize();l.lengthSq()>1e-5&&(aC.setFromUnitVectors(lS,l),n.quaternion.slerp(aC,1-Math.exp(-10*e))),n.userData.agentState=s?`walking`:`together`,t.spec.behavior.idle_bob=0}function ZT(e){LS.update($.position,{delta:e,groundHeightAt:Ow,blockers:VT(),bounds:zS})}function QT(e){eC.set(4.75,4.05,5.25),tC.set(0,.66,0),RS.position.lerp(eC,1-Math.exp(-4.6*e)),nC.lerp(tC,1-Math.exp(-6*e)),RS.lookAt(nC)}function $T(e){let t=jC*.065;eC.set(hC.x+Math.sin(t)*_C[0],hC.y+Math.sin(t*.8)*_C[1],hC.z+Math.cos(t)*_C[2]),RS.position.lerp(eC,1-Math.exp(-2.7*e)),nC.lerp(gC,1-Math.exp(-4*e)),RS.lookAt(nC)}var eE=Fx?Math.max(11.5,(Z.maxX-Z.minX)*.38):7.5,tE=Fx?Math.max(7.4,(Z.maxX-Z.minX)*.24):5.6;function nE(e){let t=jC*.08;eC.set(Math.sin(t)*eE,tE,Math.cos(t)*eE),tC.set(0,.7,0),RS.position.lerp(eC,1-Math.exp(-2.2*e)),nC.lerp(tC,1-Math.exp(-3*e)),RS.lookAt(nC)}function rE(){if(OC!==`cafe`||kC){jS.style.opacity=`0`;return}rC.copy($.position),rC.y+=1.78,rC.project(RS);let e=rC.z>-1&&rC.z<1;jS.style.opacity=e?`1`:`0`,jS.style.left=`${(rC.x*.5+.5)*window.innerWidth}px`,jS.style.top=`${(-rC.y*.5+.5)*window.innerHeight}px`}function iE(){for(let e of _w.speechPersonIds){let t=SC?.getEntity(e);if(!t)continue;rC.copy(t.root.position),rC.y+=1.55*t.root.scale.y,rC.project(RS);let n=OC===`cafe`&&rC.z>-1&&rC.z<1&&Math.abs(rC.x)<1.15&&Math.abs(rC.y)<1.15;_w.positionSpeech(e,(rC.x*.5+.5)*window.innerWidth,(-rC.y*.5+.5)*window.innerHeight,n)}}function aE(){if(!Ix){AC&&(AC=!1,Q.dataset.roundtableNearby=`false`);return}let e=Math.hypot($.position.x-Y.roundtable.center.x,$.position.z-Y.roundtable.center.z);AC=OC===`cafe`&&!kC&&!_w.isMeetingSheetOpen&&e<=Y.roundtable.interactionRadius,Q.dataset.roundtableNearby=String(AC)}function oE(){let e=cd.map(e=>jT(e.id)).filter(Boolean),t=e.filter(e=>e?.meeting).length;Q.dataset.playerPosition=[$.position.x,$.position.y,$.position.z].map(e=>e.toFixed(4)).join(`,`),Q.dataset.cameraPosition=[RS.position.x,RS.position.y,RS.position.z].map(e=>e.toFixed(4)).join(`,`),Q.dataset.cameraOrbit=[LS.yaw,LS.pitch,LS.distance].map(e=>e.toFixed(4)).join(`,`),Q.dataset.pointerLocked=String(IS.pointerLocked),Q.dataset.npcAssignments=e.map(e=>`${e.personId}:${e.tableId}:${e.status}`).join(`|`),Q.dataset.centralNpcCount=String(t),Q.dataset.meetingCount=String(kC?t+1:0),Q.dataset.speechCount=String(_w.speechPersonIds.length),Q.dataset.expressions=[sd,...cd].map(e=>`${e.id}:${NC.getExpression(e.id)??`unregistered`}`).join(`|`);let n=PC.getDiagnostics();Q.dataset.heartSignalCount=String(n.length),Q.dataset.heartSignals=n.map(e=>{let t=Number.isFinite(e.heart.heartScore)?Math.round(e.heart.heartScore):`na`;return`${e.personId}:${t}:${e.animation.beatBpm.toFixed(1)}`}).join(`|`),Q.dataset.renderCalls=String(BS.info.render.calls),Q.dataset.triangles=String(BS.info.render.triangles),Q.dataset.centerPixel=cE().join(`,`),Q.dataset.sceneHotspotCount=String(sw.length),Q.dataset.cafeDoorPosition=`${Zx.x.toFixed(2)},${Zx.z.toFixed(2)}`,Q.dataset.fieldEntityCount=String(XC?.hotspots.length??0),Q.dataset.worldModuleCount=String(ew?.modules.length??0);let r=xC.getAnimationDiagnostics();Q.dataset.characterActions=r.map(e=>`${e.personId}:${e.active??`idle`}`).join(`|`),Q.dataset.characterColliders=r.map(e=>{let t=e.collider;return`${e.personId}:${t?.shape??`none`}:${t?.radius.toFixed(3)??`0`}`}).join(`|`)}function sE(e){VS.update(e);let t=Math.min(VS.getDelta(),.05);if(jC+=t,yC){Hw();let{dx:e,dy:n}=IS.consumeMouseDelta();LS.applyMouseDelta(e,n),YC?.update(t),XC?.update(jC),CS?DT(t):SC.update(t,jC),PC.update(jC),tw?.update(jC),OC===`cafe`?(JT(t),XT(t),zT(),kC?QT(t):ZT(t),rE(),aE(),rT()):Kx?nE(t):$T(t),xC.update(t,jC),Ww(),iE(),xT(),Fx&&ST()}BS.render(FS,RS),yC&&MC++%15==0&&oE(),IS.endFrame(),requestAnimationFrame(sE)}function cE(){let e=BS.getContext(),t=new Uint8Array(4);return e.readPixels(Math.floor(BS.domElement.width*.5),Math.floor(BS.domElement.height*.5),1,1,e.RGBA,e.UNSIGNED_BYTE,t),Array.from(t)}function lE(e){console.error(e),Q.dataset.ready=`false`,Q.dataset.fatal=String(e.message||e),DS.classList.add(`is-hidden`),PS.textContent=`场景载入失败：${e.message||e}`,PS.classList.add(`is-visible`)}function uE(e){let t=e;for(;t&&t!==FS;){if(t.userData?.personId)return t;t=t.parent}return null}Q.addEventListener(`pointerdown`,e=>{qS.set(e.clientX,e.clientY),JS=IS.pointerLocked}),Q.addEventListener(`pointermove`,e=>{if(!Fx)return;let t=Q.getBoundingClientRect();fw.set((e.clientX-t.left)/t.width*2-1,-((e.clientY-t.top)/t.height)*2+1),pw=e.clientX,mw=e.clientY,hw=!0}),Q.addEventListener(`pointerleave`,()=>{hw=!1}),Q.addEventListener(`pointerup`,e=>{if(!yC||OC!==`cafe`||kC||Kx||JS||IS.pointerLocked||qS.distanceTo(new H(e.clientX,e.clientY))>8)return;let t=Q.getBoundingClientRect();KS.set((e.clientX-t.left)/t.width*2-1,-((e.clientY-t.top)/t.height)*2+1),HS.setFromCamera(KS,RS);let n=xC.entities.map(e=>e.root);YC&&n.push(...YC.pickRoots);let r=HS.intersectObjects(n,!0),i=(r.length>0?uE(r[0].object):null)?.userData.personId;if(Fx){i&&i!==sd.id&&(gT(i)||bS.panel.openPerson(i));return}Uw(i&&i!==sd.id?i:null)}),window.addEventListener(`keydown`,e=>{if(OC===`cafe`&&!Kx&&vw.handleKey(e)){e.preventDefault();return}if(e.code===`Escape`&&!e.repeat&&!e.target.closest?.(`input, textarea`)){if(bS.panel?.isOpen)return;if(vw.isOpen){vw.close(),e.preventDefault();return}if(_w.isMeetingSheetOpen){_w.requestCloseMeeting(),e.preventDefault();return}}if(e.code===`Escape`&&(nw||rw)&&!e.target.closest?.(`input, textarea`)){kC?Zw():((nw??rw?.id)===`campfire`&&bS.groupPlay?.close(),fT()),e.preventDefault();return}OC===`cafe`&&!kC&&[`KeyW`,`KeyA`,`KeyS`,`KeyD`].includes(e.code)&&!e.target.closest?.(`input, textarea`)&&e.preventDefault()}),window.addEventListener(`blur`,()=>{zw()});function dE(e){if(OC!==`cafe`||kC||nw||rw||Vw())return;let t=MS.getBoundingClientRect(),n=t.left+t.width*.5,r=t.top+t.height*.5,i=new H(e.clientX-n,e.clientY-r);i.length()>30&&i.setLength(30),NS.style.transform=`translate(${i.x}px, ${i.y}px)`,XS.set(i.x/30,-i.y/30)}MS.addEventListener(`pointerdown`,e=>{MS.setPointerCapture(e.pointerId),dE(e)}),MS.addEventListener(`pointermove`,e=>{MS.hasPointerCapture(e.pointerId)&&dE(e)});for(let e of[`pointerup`,`pointercancel`])MS.addEventListener(e,t=>{e===`pointerup`&&MS.hasPointerCapture(t.pointerId)&&MS.releasePointerCapture(t.pointerId),XS.set(0,0),NS.style.transform=`translate(0, 0)`});window.addEventListener(`resize`,Ew),window.addEventListener(`beforeunload`,()=>{IS.destroy(),_S?.dispose(),LS.dispose(),_w.destroy(),vw.destroy(),XC?.dispose(),QC?.dispose(),$C?.dispose(),tw?.dispose(),yw(),PC.dispose(),NC.dispose()},{once:!0}),Ew();var fE=new Tf;function pE(){let e=new Ln;e.name=`ENV_Fallback`;let t=new K(new Ba(Z.maxX-Z.minX+2,Z.maxZ-Z.minZ+2),new Qa({color:`#b9a98a`,roughness:.95}));return t.name=`GROUND_FallbackFloor`,t.rotation.x=-Math.PI*.5,t.position.set((Z.minX+Z.maxX)/2,0,(Z.minZ+Z.maxZ)/2),e.add(t),e}async function mE(){Dw(.04,`正在读取${$x}`),wS=CS&&await Bg()&&typeof xS.startMeeting==`function`&&typeof xS.postMeetingMessage==`function`,_w.setMeetingLive?.(wS),xS.getPackages().then(eT).catch(e=>{console.warn(`[EchoWorld] api.getPackages() 失败，气泡人名回退为本地数据`,e)}),bC=await vd(fE,Nx),ew=await rg.load();let e=await bd.load(fE,md(bC.asset_catalog_url));xC=new Xp({scene:FS,assetStore:fE,assetCatalog:e,resolveSurfaceY:Ow,materialAdapter:e=>ev(e,Jx)}),Fx&&(Dw(.1,`正在准备展位模板`),YC=new ip({scene:FS,assetStore:fE,assetCatalog:e,resolveMediaUrl:Ox,templateAssetId:Rx.boothTemplateAssetId,showDisplayBoard:nS}),await YC.prepare());let t=null;if(Lx){if(Dw(.12,`正在生成你与${Ux.name}的关系场域`),ZC=await xS.getField(Ux.id),QC=await Uh({scene:FS,renderer:BS,field:ZC,assetStore:fE,resolveMediaUrl:Ox,onProgress:Dw}).catch(e=>(console.warn(`[EchoWorld] 场域 splat 世界加载失败，回退程序化场域`,e),null)),XC=new Eh({scene:FS,field:ZC,decorations:!QC}),XC.applyAtmosphere(FS,{fog:!QC}),QC){QC.bounds&&(Z=QC.bounds,zS=Object.freeze({minX:Z.minX-LS.maxDistance,maxX:Z.maxX+LS.maxDistance,minZ:Z.minZ-LS.maxDistance,maxZ:Z.maxZ+LS.maxDistance}));let e=[];for(let t of XC.root.children){let n=t.isGroup&&t.userData?.fieldEntityId,r=t.isMesh&&t.name?.startsWith(`FIELD_`);if(!(!n&&!r))if(Wh(t,QC.groundGroup)){if(n){let n=XC.hotspots.find(e=>e.id===`field-${t.userData.fieldEntityId}`);n&&e.push(n)}}else t.visible=!1}e.length&&(XC.hotspots=e),t=new Ln,t.name=`ROOT_FieldWorld`,t.add(QC.root),t.add(XC.root)}else t=XC.root;Q.dataset.fieldPerson=Ux.id,Q.dataset.fieldSchema=ZC.schema,Q.dataset.fieldGenerated=String(ZC.generated),Q.dataset.fieldWorld=QC?`splat:${QC.quality}`:`procedural`}else if(Fx&&Yx===`environment.hub-blockout.v1`)Dw(.12,`正在搭建${$x}`),t=Um();else try{let n=e.resolve(Yx,`environment`);Dw(.12,`正在搭建${$x}`),t=await fE.loadScene(n.resolvedUrl),Yx===`environment.village-market.v1`&&(t=Yh(t))}catch(e){console.warn(`[EchoWorld] 环境资产 ${Yx} 未就绪，使用简易占位场地`,e),t=pE()}if(Xx&&t)try{Dw(.58,`正在点亮草地中央的篝火`),tw=new up({assetStore:fE,assetCatalog:e}),t.add(await tw.load())}catch(e){tw=null,console.warn(`[EchoWorld] 篝火模块未就绪，保留现场入口提示`,e)}Dw(.68),await Lw(t)}async function hE(e,t,n={}){let r=await NC.setExpression(e,t);return[`npc-conversation`,`roundtable-opening`,`roundtable-reply`].includes(n.source)&&xC.playAction(e,X.TALK,{durationMs:Math.max(350,Number(n.duration??1)*1e3)}),Q.dataset.lastExpression=`${e}:${t}:${r?`applied`:`fallback`}`,Q.dataset.expressionSource=n.source??`programmatic`,r}function gE(e,t){let n=cd.find(t=>t.id===e);if(!n)return!1;Object.assign(n,t);let r=SC?.getEntity(e);return r&&(r.profile={...r.profile,display_name:n.name,relation:n.relation,role:n.role,city:n.city,bio:n.bio,tags:[...n.tags]},r.root.userData.profile=r.profile),Q.dataset.lastProfileUpdate=e,!0}mE().catch(lE),window.__echoWorld={get ready(){return yC},get player(){return $},get renderer(){return BS},get camera(){return RS},get worldSpec(){return bC},get sceneVariant(){return Rx},get characterVariant(){return zx},get characters(){return xC?.entities??[]},get expressions(){return Object.fromEntries([sd,...cd].map(e=>[e.id,NC.getExpression(e.id)]))},get characterActions(){return{...X}},get characterAnimationState(){return xC?.getAnimationDiagnostics()??[]},get personSignals(){return Object.fromEntries(FC.list().map(e=>[e.personId,e]))},get heartSignals(){return PC.getDiagnostics()},get agentStates(){return cd.map(e=>SC?.getState(e.id)).filter(Boolean)},get appView(){return OC},get meetingActive(){return kC},get liveSource(){return WC?.source??null},get worldTick(){return JC},get world(){return Px.id},get audio(){return _S?.diagnostics??null},get boothSystem(){return YC},get relationshipField(){return ZC},get sceneHotspots(){return[...sw]},get nearbyHotspot(){return nearbySceneHotspot},get worldBrief(){return $C?.brief??null},get campfire(){return tw?.root??null},get integrations(){return bS},getAgentState:e=>jT(e),selectPerson:Uw,setExpression:hE,playCharacterAction(e,t,n={}){let r=xC?.playAction(e,t,n)??!1;return Q.dataset.lastCharacterAction=`${e}:${t}:${r}`,r},raiseRightHand:e=>xC?.playAction(e,X.RAISE_RIGHT_HAND)??!1,raiseBothHands:e=>xC?.playAction(e,X.RAISE_BOTH_HANDS)??!1,stopCharacterAction:e=>xC?.stopAction(e)??!1,ingestPersonSignal:e=>FC.ingestEvent(e),setPersonSignal:e=>FC.upsert(e),startMeeting:Jw,endMeeting:Zw,sampleCenterPixel:cE,teleportPlayer(e,t){if(!yC||(iC.set(e,0,t),!KT(iC)))return!1;let n=qT(iC);return n&&YT(),n}},requestAnimationFrame(sE);export{Qa as A,Ge as B,f as C,W as D,Hs as E,Rt as F,g as G,tn as H,O as I,nn as J,H as K,te as L,In as M,Qo as N,ln as O,qo as P,ee as R,l as S,Do as T,p as U,Xa as V,v as W,an as X,sn as Y,Or as _,Tr as a,Gi as b,Vs as c,cn as d,on as f,Ao as g,yn as h,sr as i,o as j,K as k,G as l,Ze as m,q as n,Br as o,Vi as p,U as q,Sc as r,Uo as s,pc as t,us as u,y as v,Ke as w,ns as x,Qe as y,Za as z};